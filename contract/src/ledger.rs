//! Host-facing layer: the only code in the crate that talks to the node.
//!
//! Everything here is gated on `wasm32`. The aggregation itself lives in
//! `policy.rs` and knows nothing about the host, which is what lets the whole
//! ruleset be tested with `cargo test` on a laptop.
//!
//! Two maps back the contract, both created by the tenant SDK before first
//! use and both restricted to this contract id:
//!
//!   `z:<tid>:bb-records`  key `<round-id>|<commitment>`  the sealed ledger
//!   `z:<tid>:bb-rounds`   key `<round-id>`               published aggregates
//!
//! Records are written but never read back across the WIT boundary. The only
//! path out of `bb-records` is `compute-round`, which reduces it to
//! percentiles before returning anything.

use crate::host::interfaces::{kv_store, logging};
use crate::host::tenant::tenant_context;
use crate::model::*;
use crate::policy;
use sha2::{Digest, Sha256};

/// Upper bound on rows pulled in one `compute-round`. The host caps scans by
/// its own bookkeeping budget; this keeps the contract inside it and turns an
/// oversized round into a clear error instead of a truncated aggregate.
const SCAN_LIMIT: u32 = 10_000;

/// Rows accepted in one `submit-batch`. Bounded so a single upload cannot push
/// the transaction past what the host will carry; the caller chunks past it.
const MAX_BATCH_ROWS: usize = 1_000;

fn records_map() -> String {
    format!("z:{}:bb-records", hex::encode(tenant_context::tenant_did()))
}

fn rounds_map() -> String {
    format!("z:{}:bb-rounds", hex::encode(tenant_context::tenant_did()))
}

fn now_secs() -> u64 {
    tenant_context::cluster_timestamp_secs()
}

/// 32-byte SHA-256, the shape `set-claims-digest` requires.
fn sha256(bytes: &[u8]) -> Vec<u8> {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().to_vec()
}

fn record_key(round_id: &str, commitment: &str) -> Vec<u8> {
    format!("{round_id}|{commitment}").into_bytes()
}

/// Half-open bounds covering every record in one round. `0xFF` sorts above
/// every byte a hex commitment can start with, so the range is exact.
fn round_bounds(round_id: &str) -> (Vec<u8>, Vec<u8>) {
    let start = format!("{round_id}|").into_bytes();
    let mut end = start.clone();
    end.push(0xFF);
    (start, end)
}

/// Accept one contributor row into the sealed ledger.
pub fn submit_record(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: SubmitReq =
        serde_json::from_slice(input).map_err(|e| format!("submit-record: bad input: {e}"))?;

    validate(&req).map_err(|e| format!("submit-record: {e}"))?;

    let submitted_at = now_secs();
    let commitment = policy::commit(&req, submitted_at);

    let record = Record {
        round_id: req.round_id.clone(),
        contributor: req.contributor.clone(),
        role: req.role.clone(),
        level: req.level.clone(),
        region: req.region.clone(),
        currency: req.currency.clone(),
        base_minor: req.base_minor,
        effective_at: req.effective_at,
        submitted_at,
        commitment: commitment.clone(),
    };

    let value = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
    kv_store::put(
        &records_map(),
        &record_key(&req.round_id, &commitment),
        &value,
    )
    .map_err(|e| format!("submit-record: ledger write failed: {e}"))?;

    // Fold the commitment into the transaction receipt so the contributor can
    // verify their write landed without trusting this contract's own reply.
    kv_store::set_claims_digest(&sha256(commitment.as_bytes()))
        .map_err(|e| format!("submit-record: claims digest rejected: {e}"))?;

    // Deliberately coarse: the round and the cell, never the value.
    let _ = logging::info(&format!(
        "blindband: accepted a row for round {} into cell {}",
        req.round_id,
        record.cell_key()
    ));

    let receipt = Receipt {
        commitment,
        round_id: req.round_id,
        cell: record.cell_key(),
        submitted_at,
        ruleset: RULESET_VERSION.to_string(),
    };
    serde_json::to_vec(&receipt).map_err(|e| e.to_string())
}

/// Accept many rows in one invocation.
///
/// This exists for a blunt operational reason. Every contract invocation locks
/// credits on the node, so onboarding a member's payroll extract one row at a
/// time turns a 300-employee upload into 300 executions and exhausts a test
/// allocation before the first round ever runs. Batching makes the cost track
/// the number of uploads rather than the number of employees.
///
/// Partial failure is reported, not thrown: one malformed row should not
/// discard the other 299. The response names how many landed and why the rest
/// did not, and the caller decides whether to retry.
pub fn submit_batch(input: &[u8]) -> Result<Vec<u8>, String> {
    let rows: Vec<SubmitReq> =
        serde_json::from_slice(input).map_err(|e| format!("submit-batch: bad input: {e}"))?;

    if rows.is_empty() {
        return Err("submit-batch: the batch is empty".to_string());
    }
    if rows.len() > MAX_BATCH_ROWS {
        return Err(format!(
            "submit-batch: {} rows exceeds the {MAX_BATCH_ROWS}-row ceiling. Split the upload.",
            rows.len()
        ));
    }

    let submitted_at = now_secs();
    let map = records_map();

    let mut receipts: Vec<Receipt> = Vec::with_capacity(rows.len());
    let mut rejected: Vec<BatchRejection> = Vec::new();

    for (index, req) in rows.into_iter().enumerate() {
        if let Err(reason) = validate(&req) {
            rejected.push(BatchRejection { index, reason });
            continue;
        }

        let commitment = policy::commit(&req, submitted_at);
        let record = Record {
            round_id: req.round_id.clone(),
            contributor: req.contributor.clone(),
            role: req.role.clone(),
            level: req.level.clone(),
            region: req.region.clone(),
            currency: req.currency.clone(),
            base_minor: req.base_minor,
            effective_at: req.effective_at,
            submitted_at,
            commitment: commitment.clone(),
        };

        let value = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
        match kv_store::put(&map, &record_key(&req.round_id, &commitment), &value) {
            Ok(()) => receipts.push(Receipt {
                commitment,
                round_id: req.round_id,
                cell: record.cell_key(),
                submitted_at,
                ruleset: RULESET_VERSION.to_string(),
            }),
            Err(e) => rejected.push(BatchRejection {
                index,
                reason: format!("ledger write failed: {e}"),
            }),
        }
    }

    // One digest over every commitment that landed, so the whole batch is
    // covered by the transaction receipt rather than only its last row.
    let mut h = Sha256::new();
    for r in &receipts {
        h.update(r.commitment.as_bytes());
        h.update(b"\n");
    }
    kv_store::set_claims_digest(&h.finalize())
        .map_err(|e| format!("submit-batch: claims digest rejected: {e}"))?;

    let _ = logging::info(&format!(
        "blindband: batch accepted {} rows, rejected {}",
        receipts.len(),
        rejected.len()
    ));

    let result = BatchResult {
        accepted: receipts.len(),
        rejected_count: rejected.len(),
        receipts,
        rejected,
    };
    serde_json::to_vec(&result).map_err(|e| e.to_string())
}

/// Shared field checks for both the single and the batch path.
fn validate(req: &SubmitReq) -> Result<(), String> {
    if req.round_id.trim().is_empty() {
        return Err("round_id is required".to_string());
    }
    if req.contributor.trim().is_empty() {
        return Err("contributor is required".to_string());
    }
    if req.base_minor == 0 {
        return Err("base_minor must be greater than zero".to_string());
    }
    if req.currency.trim().is_empty() {
        return Err("currency is required".to_string());
    }
    Ok(())
}

/// Reduce a round to percentile bands, sign it, and publish it.
pub fn compute_round(input: &[u8]) -> Result<Vec<u8>, String> {
    let q: RoundQuery =
        serde_json::from_slice(input).map_err(|e| format!("compute-round: bad input: {e}"))?;

    let rows = load_round_records(&q.round_id)?;
    if rows.is_empty() {
        return Err(format!(
            "compute-round: no records found for round {}",
            q.round_id
        ));
    }

    let round = policy::aggregate(&q.round_id, rows, now_secs());
    let digest = policy::round_digest(&round)?;

    let published = PublishedRound {
        round,
        attestation: Attestation {
            digest: digest.clone(),
            ruleset: RULESET_VERSION.to_string(),
            claims_digest_set: true,
            note: "The digest below is written into this transaction's Merkle leaf via \
                   set-claims-digest, so a holder of the receipt can verify the round \
                   off-network without re-executing it."
                .to_string(),
        },
    };

    let encoded = serde_json::to_vec(&published).map_err(|e| e.to_string())?;
    kv_store::put(&rounds_map(), q.round_id.as_bytes(), &encoded)
        .map_err(|e| format!("compute-round: publish failed: {e}"))?;

    let digest_bytes =
        hex::decode(&digest).map_err(|e| format!("compute-round: digest not hex: {e}"))?;
    kv_store::set_claims_digest(&digest_bytes)
        .map_err(|e| format!("compute-round: claims digest rejected: {e}"))?;

    let _ = logging::info(&format!(
        "blindband: round {} published {} bands, withheld {}",
        published.round.round_id,
        published.round.totals.cells_published,
        published.round.totals.cells_suppressed
    ));

    Ok(encoded)
}

/// Read a published round back out.
pub fn get_round(input: &[u8]) -> Result<Vec<u8>, String> {
    let q: RoundQuery =
        serde_json::from_slice(input).map_err(|e| format!("get-round: bad input: {e}"))?;
    kv_store::get(&rounds_map(), q.round_id.as_bytes())
        .map_err(|e| format!("get-round: read failed: {e}"))?
        .ok_or_else(|| format!("get-round: round {} has not been published", q.round_id))
}

/// Confirm a receipt was counted, without echoing the value back.
pub fn verify_receipt(input: &[u8]) -> Result<Vec<u8>, String> {
    let q: ReceiptQuery =
        serde_json::from_slice(input).map_err(|e| format!("verify-receipt: bad input: {e}"))?;

    let stored = kv_store::get(&records_map(), &record_key(&q.round_id, &q.commitment))
        .map_err(|e| format!("verify-receipt: read failed: {e}"))?;

    let proof = match stored {
        None => ReceiptProof {
            commitment: q.commitment,
            round_id: q.round_id,
            included: false,
            cell: None,
            counted_in_published_band: false,
            note: "No row in this round carries that commitment.".to_string(),
        },
        Some(bytes) => {
            let record: Record = serde_json::from_slice(&bytes)
                .map_err(|e| format!("verify-receipt: corrupt ledger row: {e}"))?;
            let cell = record.cell_key();
            let counted = round_publishes_cell(&q.round_id, &record)?;
            ReceiptProof {
                commitment: q.commitment,
                round_id: q.round_id,
                included: true,
                cell: Some(cell),
                counted_in_published_band: counted,
                note: if counted {
                    "Counted in a published band.".to_string()
                } else {
                    "Held in the ledger. Its cell was withheld, or the round has not run yet."
                        .to_string()
                },
            }
        }
    };

    serde_json::to_vec(&proof).map_err(|e| e.to_string())
}

/// Did the round publish a band for this record's cell?
fn round_publishes_cell(round_id: &str, record: &Record) -> Result<bool, String> {
    let Some(bytes) = kv_store::get(&rounds_map(), round_id.as_bytes())
        .map_err(|e| format!("verify-receipt: round read failed: {e}"))?
    else {
        return Ok(false);
    };
    let published: PublishedRound =
        serde_json::from_slice(&bytes).map_err(|e| format!("verify-receipt: corrupt round: {e}"))?;

    let (role, level, region) = (
        norm(&record.role),
        norm(&record.level),
        norm(&record.region),
    );
    Ok(published
        .round
        .bands
        .iter()
        .any(|b| b.role == role && b.level == level && b.region == region))
}

/// Pull every row for a round out of the sealed ledger.
fn load_round_records(round_id: &str) -> Result<Vec<Record>, String> {
    let (start, end) = round_bounds(round_id);
    let pairs = kv_store::scan(&records_map(), &start, &end, SCAN_LIMIT)
        .map_err(|e| format!("compute-round: ledger scan failed: {e}"))?;

    if pairs.len() as u32 == SCAN_LIMIT {
        return Err(format!(
            "compute-round: round {round_id} holds at least {SCAN_LIMIT} rows, which is the \
             per-call scan budget. Split it into narrower rounds rather than publishing a \
             silently truncated aggregate."
        ));
    }

    let mut out = Vec::with_capacity(pairs.len());
    for (_k, v) in pairs {
        let record: Record = serde_json::from_slice(&v)
            .map_err(|e| format!("compute-round: corrupt ledger row: {e}"))?;
        out.push(record);
    }
    Ok(out)
}
