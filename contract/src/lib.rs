//! Blindband — a confidential benchmarking contract for T3N.
//!
//! A group of organisations wants to know what the market pays for a role.
//! None of them will hand their payroll to a competitor, and none of them may
//! lawfully swap current pay figures directly. The usual answer is to mail the
//! data to a survey vendor and trust a promise.
//!
//! Blindband replaces the promise with an enclave. Members submit rows that
//! stay sealed, the aggregation runs inside the TEE, and a cell is only
//! published once it clears four gates drawn from antitrust safe-harbour
//! guidance — a neutral aggregator, historical data, enough independent
//! contributors, and no single contributor dominating the statistic. The
//! round is then hashed, and the digest is bound into the transaction's Merkle
//! leaf via `set-claims-digest`, so the aggregate can be checked by anyone
//! holding the published result and the receipt.
//!
//! # Layout
//!
//! - `model.rs`  — wire types and the ruleset constants
//! - `stats.rs`  — percentile maths, pure and unit-tested
//! - `policy.rs` — the gates and the aggregation, pure and unit-tested
//! - `ledger.rs` — the only module that touches the host (wasm32 only)
//!
//! The split is deliberate. The interesting logic runs under `cargo test`
//! without a node, an enclave, or test credits, which is what keeps this
//! maintainable by whoever inherits it.
//!
//! # Host capabilities
//!
//! ```json
//! { "host_capabilities": ["kv_store", "logging", "tenant_context"] }
//! ```
//!
//! No `http` capability is requested. The contract makes no outbound call, so
//! there is no egress surface to review and nothing to allowlist.
//!
//! # Setup
//!
//! Two KV maps must exist before first invocation, both scoped to this
//! contract id (see `agent/src/deploy.ts`):
//!
//! ```text
//! z:<tid>:bb-records   sealed submissions
//! z:<tid>:bb-rounds    published aggregates
//! ```

#![warn(clippy::style, missing_debug_implementations)]
#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

pub const CONTRACT_VERSION: &str = "0.2.0";

pub mod model;
pub mod policy;
pub mod stats;

#[cfg(target_arch = "wasm32")]
wit_bindgen::generate!({
    world: "blindband",
    path: "wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

#[cfg(target_arch = "wasm32")]
mod ledger;

#[cfg(target_arch = "wasm32")]
struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::z::blindband::contracts::Guest for Component {
    fn submit_record(
        req: exports::z::blindband::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("submit-record: missing input")?;
        ledger::submit_record(&input)
    }

    fn submit_batch(
        req: exports::z::blindband::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("submit-batch: missing input")?;
        ledger::submit_batch(&input)
    }

    fn compute_round(
        req: exports::z::blindband::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("compute-round: missing input")?;
        ledger::compute_round(&input)
    }

    fn get_round(req: exports::z::blindband::contracts::GenericInput) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("get-round: missing input")?;
        ledger::get_round(&input)
    }

    fn verify_receipt(
        req: exports::z::blindband::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("verify-receipt: missing input")?;
        ledger::verify_receipt(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
