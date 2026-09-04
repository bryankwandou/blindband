//! Wire types shared by every entry point.
//!
//! Everything here is target-independent on purpose: the aggregation logic is
//! plain Rust so it can be exercised with `cargo test` on the host toolchain,
//! without a node, an enclave, or a network round trip. Only the thin host
//! bindings in `submit.rs` / `round.rs` are gated on `wasm32`.

use serde::{Deserialize, Serialize};

/// Identifier for the published policy. Bump this whenever a gate below
/// changes: it is folded into the round digest, so a round produced under a
/// different ruleset can never be mistaken for one produced under this one.
pub const RULESET_VERSION: &str = "blindband-safe-harbour/v1";

/// Distinct organisations that must appear in a cell before it is published.
pub const MIN_CONTRIBUTORS_PER_CELL: usize = 5;

/// Individual records required in a cell, on top of the contributor floor.
pub const MIN_RECORDS_PER_CELL: usize = 10;

/// Ceiling on how much of one cell a single contributor may account for,
/// in basis points. 2500 bps = 25%.
pub const MAX_CONTRIBUTOR_SHARE_BPS: u64 = 2500;

/// Records must describe compensation at least this old. Three months.
pub const MIN_DATA_AGE_SECS: u64 = 91 * 24 * 60 * 60;

/// One organisation's submission for one employee.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitReq {
    pub round_id: String,
    /// Pseudonymous consortium member id. Never a legal entity name.
    pub contributor: String,
    pub role: String,
    pub level: String,
    pub region: String,
    pub currency: String,
    /// Base pay in minor units (cents) to keep the maths integral.
    pub base_minor: u64,
    /// Unix seconds at which this compensation was effective.
    pub effective_at: u64,
}

/// A submission as it rests in the sealed ledger.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Record {
    pub round_id: String,
    pub contributor: String,
    pub role: String,
    pub level: String,
    pub region: String,
    pub currency: String,
    pub base_minor: u64,
    pub effective_at: u64,
    pub submitted_at: u64,
    /// SHA-256 over the canonical record, returned to the contributor so they
    /// can later ask whether their row was counted.
    pub commitment: String,
}

impl Record {
    /// `role|level|region`, normalised, used as the aggregation key.
    pub fn cell_key(&self) -> String {
        format!(
            "{}|{}|{}",
            norm(&self.role),
            norm(&self.level),
            norm(&self.region)
        )
    }
}

/// Lowercase and collapse whitespace so "Staff Engineer" and "staff  engineer"
/// land in the same cell instead of quietly splitting it below the threshold.
pub fn norm(s: &str) -> String {
    s.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Handed back on a successful submission.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receipt {
    pub commitment: String,
    pub round_id: String,
    pub cell: String,
    pub submitted_at: u64,
    pub ruleset: String,
}

/// One row a batch refused, and why. Carries the index so the caller can line
/// the rejection up against the file they uploaded.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRejection {
    pub index: usize,
    pub reason: String,
}

/// Outcome of a `submit-batch`: what landed, what did not.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub accepted: usize,
    pub rejected_count: usize,
    pub receipts: Vec<Receipt>,
    pub rejected: Vec<BatchRejection>,
}

/// A cell that cleared every gate.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Band {
    pub role: String,
    pub level: String,
    pub region: String,
    pub currency: String,
    pub contributors: usize,
    pub records: usize,
    pub p10: u64,
    pub p25: u64,
    pub p50: u64,
    pub p75: u64,
    pub p90: u64,
    pub mean: u64,
    /// Largest single-contributor share, in basis points. Published so a
    /// member can audit the concentration gate rather than trust it.
    pub top_contributor_share_bps: u64,
}

/// A cell that was withheld, and why. Reporting the reason is the point:
/// silence would look identical to "no data".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suppressed {
    pub role: String,
    pub level: String,
    pub region: String,
    pub contributors: usize,
    pub records: usize,
    pub reason: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Totals {
    pub records_ingested: usize,
    pub records_excluded_recent: usize,
    pub records_excluded_malformed: usize,
    pub contributors: usize,
    pub cells_published: usize,
    pub cells_suppressed: usize,
}

/// The publishable result. Contains no individual record, by construction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Round {
    pub round_id: String,
    pub ruleset: String,
    pub min_contributors_per_cell: usize,
    pub min_records_per_cell: usize,
    pub max_contributor_share_bps: u64,
    pub min_data_age_secs: u64,
    pub generated_at: u64,
    pub totals: Totals,
    pub bands: Vec<Band>,
    pub suppressed: Vec<Suppressed>,
    /// SHA-256 over every input commitment, sorted. Binds this aggregate to
    /// the exact input set: recomputing over a different set of rows yields a
    /// different digest even when the published percentiles happen to match.
    pub inputs_digest: String,
}

/// What the enclave asserts about a round.
///
/// There is no cluster signature here, and that is a platform limit rather
/// than a choice: `host:interfaces/signing` is reachable from system (`tee:`)
/// contracts, not tenant (`z:`) ones, and a tenant component that imports it
/// fails to instantiate before any of its code runs.
///
/// The binding that remains is stronger than it first looks. `set-claims-digest`
/// writes this digest into the transaction's Merkle leaf, so a member holding
/// the receipt can confirm the round they were shown is the round the node
/// committed — without re-running it and without trusting the operator.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attestation {
    /// SHA-256 over the canonical JSON of `Round`.
    pub digest: String,
    pub ruleset: String,
    /// Whether the digest reached the transaction receipt.
    pub claims_digest_set: bool,
    /// Plain-language statement of what the digest does and does not prove.
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishedRound {
    pub round: Round,
    pub attestation: Attestation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundQuery {
    pub round_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptQuery {
    pub round_id: String,
    pub commitment: String,
}

/// Answer to `verify-receipt`. Deliberately narrow: it confirms inclusion and
/// names the cell, and never echoes the submitted value back.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptProof {
    pub commitment: String,
    pub round_id: String,
    pub included: bool,
    pub cell: Option<String>,
    pub counted_in_published_band: bool,
    pub note: String,
}
