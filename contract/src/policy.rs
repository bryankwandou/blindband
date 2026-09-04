//! The safe-harbour ruleset, and the aggregation that runs behind it.
//!
//! This is the part of Blindband worth reviewing closely. A benchmarking
//! consortium is only lawful to operate if the aggregate cannot be reversed
//! into any single member's data, and antitrust guidance is specific about
//! what that means: a neutral third party runs the aggregation, the inputs are
//! historical rather than current, enough independent members contribute, and
//! no one member dominates a statistic.
//!
//! Those four conditions are usually a promise in a contract. Here they are a
//! precondition in code that runs inside an enclave, and every cell that fails
//! one is reported with the reason instead of silently dropped.

use crate::model::*;
use crate::stats::{mean, percentile};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

/// Reasons a cell can be withheld. Stable strings — the web console and the
/// docs both key off them.
pub const REASON_CONTRIBUTORS: &str = "below_contributor_floor";
pub const REASON_RECORDS: &str = "below_record_floor";
pub const REASON_CONCENTRATION: &str = "contributor_concentration_exceeded";
pub const REASON_CURRENCY: &str = "mixed_currency";

/// Fold a batch of records into a publishable round.
///
/// `now` is the cluster timestamp in Unix seconds, supplied by the caller so
/// this function stays pure and testable.
pub fn aggregate(round_id: &str, records: Vec<Record>, now: u64) -> Round {
    let mut totals = Totals {
        records_ingested: records.len(),
        ..Default::default()
    };

    // Gate 1 — data age. Current pay is the sensitive signal; historical pay
    // is the one safe-harbour guidance allows. Anything too recent is dropped
    // here, before it can influence a percentile.
    let age_floor = now.saturating_sub(MIN_DATA_AGE_SECS);
    let mut fresh_enough: Vec<Record> = Vec::with_capacity(records.len());
    for r in records {
        if r.base_minor == 0 || r.currency.trim().is_empty() {
            totals.records_excluded_malformed += 1;
            continue;
        }
        if r.effective_at > age_floor {
            totals.records_excluded_recent += 1;
            continue;
        }
        fresh_enough.push(r);
    }

    // Bind the aggregate to its exact inputs.
    let inputs_digest = digest_commitments(&fresh_enough);

    let mut all_contributors: BTreeMap<String, ()> = BTreeMap::new();
    let mut cells: BTreeMap<String, Vec<Record>> = BTreeMap::new();
    for r in fresh_enough {
        all_contributors.insert(r.contributor.clone(), ());
        cells.entry(r.cell_key()).or_default().push(r);
    }
    totals.contributors = all_contributors.len();

    let mut bands = Vec::new();
    let mut suppressed = Vec::new();
    for (_key, rows) in cells {
        match evaluate_cell(&rows) {
            Ok(band) => bands.push(band),
            Err(s) => suppressed.push(s),
        }
    }
    totals.cells_published = bands.len();
    totals.cells_suppressed = suppressed.len();

    // Deterministic ordering. The round digest is taken over this struct's
    // JSON, so a stable order is what makes the digest reproducible.
    bands.sort_by(|a, b| (&a.role, &a.level, &a.region).cmp(&(&b.role, &b.level, &b.region)));
    suppressed.sort_by(|a, b| (&a.role, &a.level, &a.region).cmp(&(&b.role, &b.level, &b.region)));

    Round {
        round_id: round_id.to_string(),
        ruleset: RULESET_VERSION.to_string(),
        min_contributors_per_cell: MIN_CONTRIBUTORS_PER_CELL,
        min_records_per_cell: MIN_RECORDS_PER_CELL,
        max_contributor_share_bps: MAX_CONTRIBUTOR_SHARE_BPS,
        min_data_age_secs: MIN_DATA_AGE_SECS,
        generated_at: now,
        totals,
        bands,
        suppressed,
        inputs_digest,
    }
}

/// Apply gates 2-4 to a single cell, then compute its bands.
fn evaluate_cell(rows: &[Record]) -> Result<Band, Suppressed> {
    let first = &rows[0];
    let mut per_contributor: BTreeMap<&str, usize> = BTreeMap::new();
    for r in rows {
        *per_contributor.entry(r.contributor.as_str()).or_insert(0) += 1;
    }
    let contributors = per_contributor.len();
    let records = rows.len();

    let withhold = |reason: &str| Suppressed {
        role: norm(&first.role),
        level: norm(&first.level),
        region: norm(&first.region),
        contributors,
        records,
        reason: reason.to_string(),
    };

    // Gate 2 — a cell must mix enough independent organisations that no member
    // can subtract its own rows and read off a competitor's.
    if contributors < MIN_CONTRIBUTORS_PER_CELL {
        return Err(withhold(REASON_CONTRIBUTORS));
    }

    // Gate 3 — k-anonymity on the row count, independent of member count.
    if records < MIN_RECORDS_PER_CELL {
        return Err(withhold(REASON_RECORDS));
    }

    // Gate 4 — concentration. Clearing the contributor floor is not enough if
    // one member supplies most of the rows: the median would effectively be
    // their own median.
    let top = per_contributor.values().copied().max().unwrap_or(0);
    let share_bps = (top as u64 * 10_000) / records as u64;
    if share_bps > MAX_CONTRIBUTOR_SHARE_BPS {
        return Err(withhold(REASON_CONCENTRATION));
    }

    // Mixing currencies would produce a meaningless percentile. Cheaper to
    // refuse than to invent an exchange rate inside an enclave.
    let currency = norm(&first.currency);
    if rows.iter().any(|r| norm(&r.currency) != currency) {
        return Err(withhold(REASON_CURRENCY));
    }

    let mut values: Vec<u64> = rows.iter().map(|r| r.base_minor).collect();
    values.sort_unstable();

    Ok(Band {
        role: norm(&first.role),
        level: norm(&first.level),
        region: norm(&first.region),
        currency: currency.to_uppercase(),
        contributors,
        records,
        p10: percentile(&values, 10).unwrap_or(0),
        p25: percentile(&values, 25).unwrap_or(0),
        p50: percentile(&values, 50).unwrap_or(0),
        p75: percentile(&values, 75).unwrap_or(0),
        p90: percentile(&values, 90).unwrap_or(0),
        mean: mean(&values).unwrap_or(0),
        top_contributor_share_bps: share_bps,
    })
}

/// SHA-256 over the sorted commitments of everything that reached the maths.
fn digest_commitments(rows: &[Record]) -> String {
    let mut commitments: Vec<&str> = rows.iter().map(|r| r.commitment.as_str()).collect();
    commitments.sort_unstable();
    let mut h = Sha256::new();
    for c in commitments {
        h.update(c.as_bytes());
        h.update(b"\n");
    }
    hex::encode(h.finalize())
}

/// SHA-256 over the canonical JSON of a round. Field order is the declaration
/// order of `Round`, and every collection inside it is sorted, so this is
/// reproducible by any verifier holding the published round.
pub fn round_digest(round: &Round) -> Result<String, String> {
    let bytes = serde_json::to_vec(round).map_err(|e| e.to_string())?;
    let mut h = Sha256::new();
    h.update(&bytes);
    Ok(hex::encode(h.finalize()))
}

/// SHA-256 commitment over one submission, returned to the contributor.
pub fn commit(req: &SubmitReq, submitted_at: u64) -> String {
    let mut h = Sha256::new();
    h.update(req.round_id.as_bytes());
    h.update(b"\x1f");
    h.update(req.contributor.as_bytes());
    h.update(b"\x1f");
    h.update(norm(&req.role).as_bytes());
    h.update(b"\x1f");
    h.update(norm(&req.level).as_bytes());
    h.update(b"\x1f");
    h.update(norm(&req.region).as_bytes());
    h.update(b"\x1f");
    h.update(norm(&req.currency).as_bytes());
    h.update(b"\x1f");
    h.update(req.base_minor.to_be_bytes());
    h.update(b"\x1f");
    h.update(req.effective_at.to_be_bytes());
    h.update(b"\x1f");
    h.update(submitted_at.to_be_bytes());
    hex::encode(h.finalize())
}
