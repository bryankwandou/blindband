//! The gates are the product. These tests are the reason anyone should
//! believe a published band is safe to share.
//!
//! Run on the host toolchain, no node and no credits required:
//!
//! ```text
//! cargo test
//! ```

use z_blindband::model::*;
use z_blindband::policy::{self, *};

/// Unix seconds for a fixed "now", so no test depends on the wall clock.
const NOW: u64 = 1_780_000_000;

/// Old enough to clear the data-age gate with room to spare.
const AGED: u64 = NOW - (200 * 24 * 60 * 60);

fn record(contributor: &str, base_minor: u64, effective_at: u64) -> Record {
    let req = SubmitReq {
        round_id: "2026-q1".into(),
        contributor: contributor.into(),
        role: "Backend Engineer".into(),
        level: "L5".into(),
        region: "SEA".into(),
        currency: "usd".into(),
        base_minor,
        effective_at,
    };
    let commitment = policy::commit(&req, NOW);
    Record {
        round_id: req.round_id,
        contributor: req.contributor,
        role: req.role,
        level: req.level,
        region: req.region,
        currency: req.currency,
        base_minor: req.base_minor,
        effective_at: req.effective_at,
        submitted_at: NOW,
        commitment,
    }
}

/// Twelve rows spread over six contributors: clears every gate.
fn healthy_cell() -> Vec<Record> {
    let mut rows = Vec::new();
    for (i, org) in ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"]
        .iter()
        .enumerate()
    {
        rows.push(record(org, 10_000_00 + (i as u64 * 1_000_00), AGED));
        rows.push(record(org, 11_000_00 + (i as u64 * 1_000_00), AGED));
    }
    rows
}

#[test]
fn a_healthy_cell_publishes() {
    let round = aggregate("2026-q1", healthy_cell(), NOW);
    assert_eq!(round.totals.cells_published, 1);
    assert_eq!(round.totals.cells_suppressed, 0);
    assert_eq!(round.totals.contributors, 6);

    let band = &round.bands[0];
    assert_eq!(band.contributors, 6);
    assert_eq!(band.records, 12);
    assert_eq!(band.currency, "USD");
    assert!(band.p25 <= band.p50 && band.p50 <= band.p75);
}

#[test]
fn four_contributors_are_not_enough() {
    let mut rows = Vec::new();
    for org in ["alpha", "bravo", "charlie", "delta"] {
        for _ in 0..4 {
            rows.push(record(org, 10_000_00, AGED));
        }
    }
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.totals.cells_published, 0, "cell must not publish");
    assert_eq!(round.suppressed[0].reason, REASON_CONTRIBUTORS);
    assert_eq!(round.suppressed[0].contributors, 4);
    assert!(round.bands.is_empty());
}

#[test]
fn enough_contributors_but_too_few_rows_is_withheld() {
    // Five contributors, one row each: clears the contributor floor and fails
    // the k-anonymity floor. Both gates matter independently.
    let rows: Vec<Record> = ["alpha", "bravo", "charlie", "delta", "echo"]
        .iter()
        .map(|org| record(org, 10_000_00, AGED))
        .collect();
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.totals.cells_published, 0);
    assert_eq!(round.suppressed[0].reason, REASON_RECORDS);
}

#[test]
fn one_dominant_contributor_is_withheld() {
    // Six contributors and twenty rows, but one org supplies eleven of them.
    // The median would effectively be that org's own median.
    let mut rows = Vec::new();
    for _ in 0..11 {
        rows.push(record("alpha", 30_000_00, AGED));
    }
    for org in ["bravo", "charlie", "delta", "echo", "foxtrot"] {
        for _ in 0..2 {
            rows.push(record(org, 10_000_00, AGED));
        }
    }
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.totals.cells_published, 0);
    assert_eq!(round.suppressed[0].reason, REASON_CONCENTRATION);
}

#[test]
fn the_concentration_gate_sits_exactly_at_25_percent() {
    // Twenty rows, top contributor at five: 2500 bps, precisely on the line
    // and therefore allowed. A sixth row for that org would tip it over.
    let mut rows = Vec::new();
    for _ in 0..5 {
        rows.push(record("alpha", 10_000_00, AGED));
    }
    for org in ["bravo", "charlie", "delta", "echo", "foxtrot"] {
        for _ in 0..3 {
            rows.push(record(org, 10_000_00, AGED));
        }
    }
    let round = aggregate("2026-q1", rows, NOW);
    assert_eq!(round.totals.cells_published, 1, "2500 bps is inside the gate");
    assert_eq!(round.bands[0].top_contributor_share_bps, 2500);

    rows = round_trip_extra_row();
    let tipped = aggregate("2026-q1", rows, NOW);
    assert_eq!(tipped.totals.cells_published, 0, "2619 bps is outside it");
    assert_eq!(tipped.suppressed[0].reason, REASON_CONCENTRATION);
}

fn round_trip_extra_row() -> Vec<Record> {
    let mut rows = Vec::new();
    for _ in 0..6 {
        rows.push(record("alpha", 10_000_00, AGED));
    }
    for org in ["bravo", "charlie", "delta", "echo", "foxtrot"] {
        for _ in 0..3 {
            rows.push(record(org, 10_000_00, AGED));
        }
    }
    rows
}

#[test]
fn recent_rows_never_reach_the_maths() {
    let mut rows = healthy_cell();
    // Effective last week: current pay, which the ruleset refuses.
    for _ in 0..4 {
        rows.push(record("golf", 99_999_00, NOW - (7 * 24 * 60 * 60)));
    }
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.totals.records_ingested, 16);
    assert_eq!(round.totals.records_excluded_recent, 4);
    assert_eq!(round.bands[0].records, 12, "recent rows are not counted");
    assert!(
        round.bands[0].p90 < 99_999_00,
        "the outlier must not reach a percentile"
    );
}

#[test]
fn the_age_boundary_is_ninety_one_days() {
    let boundary = NOW - MIN_DATA_AGE_SECS;
    let mut rows = healthy_cell();
    rows.push(record("golf", 12_000_00, boundary));
    rows.push(record("golf", 12_000_00, boundary + 1));

    let round = aggregate("2026-q1", rows, NOW);
    assert_eq!(round.totals.records_excluded_recent, 1, "one second too new");
}

#[test]
fn a_mixed_currency_cell_is_refused_rather_than_converted() {
    let mut rows = healthy_cell();
    let mut odd = record("golf", 150_000_00, AGED);
    odd.currency = "IDR".into();
    rows.push(odd);
    rows.push(record("golf", 12_000_00, AGED));

    let round = aggregate("2026-q1", rows, NOW);
    assert_eq!(round.totals.cells_published, 0);
    assert_eq!(round.suppressed[0].reason, REASON_CURRENCY);
}

#[test]
fn zero_and_blank_rows_are_dropped_as_malformed() {
    let mut rows = healthy_cell();
    rows.push(record("golf", 0, AGED));
    let mut blank = record("golf", 5_000_00, AGED);
    blank.currency = "   ".into();
    rows.push(blank);

    let round = aggregate("2026-q1", rows, NOW);
    assert_eq!(round.totals.records_excluded_malformed, 2);
    assert_eq!(round.bands[0].records, 12);
}

#[test]
fn casing_and_spacing_do_not_split_a_cell() {
    let mut rows = healthy_cell();
    for org in ["golf", "hotel"] {
        let mut r = record(org, 10_500_00, AGED);
        r.role = "  backend   ENGINEER ".into();
        r.level = "l5".into();
        r.region = "sea".into();
        rows.push(r);
    }
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.bands.len(), 1, "variants must land in one cell");
    assert_eq!(round.bands[0].records, 14);
    assert_eq!(round.bands[0].contributors, 8);
}

#[test]
fn no_individual_value_survives_into_the_round() {
    let round = aggregate("2026-q1", healthy_cell(), NOW);
    let json = serde_json::to_string(&round).unwrap();

    assert!(!json.contains("alpha"), "contributor ids must not be published");
    assert!(!json.contains("commitment"), "commitments must not be published");
    assert!(!json.contains("effective_at"), "row timestamps must not leak");
}

#[test]
fn the_round_digest_is_reproducible() {
    let a = aggregate("2026-q1", healthy_cell(), NOW);
    let b = aggregate("2026-q1", healthy_cell(), NOW);
    assert_eq!(
        policy::round_digest(&a).unwrap(),
        policy::round_digest(&b).unwrap(),
        "the same inputs must hash to the same round"
    );
}

#[test]
fn a_changed_input_set_changes_the_digest() {
    let base = aggregate("2026-q1", healthy_cell(), NOW);

    let mut more = healthy_cell();
    more.push(record("golf", 13_000_00, AGED));
    let changed = aggregate("2026-q1", more, NOW);

    assert_ne!(
        policy::round_digest(&base).unwrap(),
        policy::round_digest(&changed).unwrap()
    );
    assert_ne!(base.inputs_digest, changed.inputs_digest);
}

#[test]
fn independent_cells_are_gated_independently() {
    let mut rows = healthy_cell();
    // A second cell with only three contributors.
    for org in ["alpha", "bravo", "charlie"] {
        for _ in 0..5 {
            let mut r = record(org, 20_000_00, AGED);
            r.role = "Designer".into();
            rows.push(r);
        }
    }
    let round = aggregate("2026-q1", rows, NOW);

    assert_eq!(round.totals.cells_published, 1);
    assert_eq!(round.totals.cells_suppressed, 1);
    assert_eq!(round.bands[0].role, "backend engineer");
    assert_eq!(round.suppressed[0].role, "designer");
    assert_eq!(round.suppressed[0].reason, REASON_CONTRIBUTORS);
}

#[test]
fn an_empty_round_is_a_valid_empty_result() {
    let round = aggregate("2026-q1", Vec::new(), NOW);
    assert_eq!(round.totals.records_ingested, 0);
    assert!(round.bands.is_empty());
    assert!(policy::round_digest(&round).is_ok());
}

#[test]
fn commitments_are_unique_per_row_and_stable_per_input() {
    let req = SubmitReq {
        round_id: "2026-q1".into(),
        contributor: "alpha".into(),
        role: "Backend Engineer".into(),
        level: "L5".into(),
        region: "SEA".into(),
        currency: "USD".into(),
        base_minor: 10_000_00,
        effective_at: AGED,
    };
    assert_eq!(policy::commit(&req, NOW), policy::commit(&req, NOW));

    let mut other = req.clone();
    other.base_minor += 1;
    assert_ne!(policy::commit(&req, NOW), policy::commit(&other, NOW));
    assert_ne!(policy::commit(&req, NOW), policy::commit(&req, NOW + 1));
}
