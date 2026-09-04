//! `blindband-local` — run the contract's aggregation on a laptop.
//!
//! This binary links the exact `policy` module the enclave runs. It is not a
//! reimplementation and not a mock: the percentiles, the four gates and the
//! round digest all come from the same source file the WASM component is built
//! from, so a round produced here and a round produced inside the TEE hash to
//! the same value for the same inputs.
//!
//! What it cannot do is sign. The cluster key lives in the enclave, so a local
//! round carries `signature: null` and says so.
//!
//! Two subcommands:
//!
//! ```text
//! blindband-local generate --contributors 9 --seed 42 > records.json
//! blindband-local aggregate --round 2026-q1 < records.json > round.json
//! ```

use std::io::{self, Read, Write};

use z_blindband::model::*;
use z_blindband::policy;

/// Fixed clock so a generated dataset and its round are reproducible.
const NOW: u64 = 1_780_000_000;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let cmd = args.get(1).map(String::as_str).unwrap_or("");

    let result = match cmd {
        "generate" => generate(&args),
        "aggregate" => aggregate(&args),
        _ => {
            eprintln!(
                "usage:\n  blindband-local generate [--contributors N] [--seed N]\n  \
                 blindband-local aggregate [--round ID]"
            );
            std::process::exit(2);
        }
    };

    if let Err(e) = result {
        eprintln!("blindband-local: {e}");
        std::process::exit(1);
    }
}

fn flag(args: &[String], name: &str) -> Option<String> {
    let idx = args.iter().position(|a| a == name)?;
    args.get(idx + 1).cloned()
}

fn flag_u64(args: &[String], name: &str, default: u64) -> u64 {
    flag(args, name)
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

/// Deterministic 64-bit LCG. A seeded generator keeps demo output stable
/// across machines, which matters when screenshots have to match the docs.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        self.0 >> 11
    }

    fn range(&mut self, lo: u64, hi: u64) -> u64 {
        if hi <= lo {
            return lo;
        }
        lo + (self.next() % (hi - lo))
    }
}

/// A synthetic consortium: enough members and rows that some cells publish and
/// some are withheld, because a demo where every cell passes teaches nothing.
fn generate(args: &[String]) -> Result<(), String> {
    let contributors = flag_u64(args, "--contributors", 9).clamp(1, 64) as usize;
    let mut rng = Rng(flag_u64(args, "--seed", 42));

    let orgs: Vec<String> = (0..contributors)
        .map(|i| format!("member-{:02}", i + 1))
        .collect();

    // (role, level, base midpoint in cents, how many members take part)
    let cells: [(&str, &str, u64, usize); 6] = [
        ("Backend Engineer", "L4", 9_500_00, 9),
        ("Backend Engineer", "L5", 13_800_00, 9),
        ("Backend Engineer", "L6", 18_400_00, 7),
        ("Product Designer", "L4", 8_200_00, 6),
        ("Data Scientist", "L5", 14_600_00, 5),
        // Deliberately thin: three members, so this one is withheld and the
        // suppression path is visible in the demo.
        ("Engineering Manager", "M2", 21_000_00, 3),
    ];

    let mut rows: Vec<SubmitReq> = Vec::new();
    for (role, level, midpoint, participating) in cells {
        for org in orgs.iter().take(participating) {
            let headcount = rng.range(2, 5);
            for _ in 0..headcount {
                // Spread roughly +/- 22% around the midpoint.
                let spread = midpoint / 5;
                let base = rng.range(midpoint - spread, midpoint + spread);
                // Effective between 4 and 18 months ago: comfortably historical.
                let age_days = rng.range(120, 540);
                rows.push(SubmitReq {
                    round_id: "2026-q1".into(),
                    contributor: org.clone(),
                    role: role.into(),
                    level: level.into(),
                    region: "SEA".into(),
                    currency: "USD".into(),
                    base_minor: base,
                    effective_at: NOW - (age_days * 24 * 60 * 60),
                });
            }
        }
    }

    // A handful of rows that are too recent, so the data-age gate has something
    // to reject and the totals show it.
    for org in orgs.iter().take(4) {
        rows.push(SubmitReq {
            round_id: "2026-q1".into(),
            contributor: org.clone(),
            role: "Backend Engineer".into(),
            level: "L5".into(),
            region: "SEA".into(),
            currency: "USD".into(),
            base_minor: rng.range(15_000_00, 17_000_00),
            effective_at: NOW - (20 * 24 * 60 * 60),
        });
    }

    let json = serde_json::to_string_pretty(&rows).map_err(|e| e.to_string())?;
    io::stdout()
        .write_all(json.as_bytes())
        .map_err(|e| e.to_string())
}

/// Read submissions, run the real aggregation, print a `PublishedRound`.
fn aggregate(args: &[String]) -> Result<(), String> {
    let round_id = flag(args, "--round").unwrap_or_else(|| "2026-q1".to_string());

    let mut raw = String::new();
    io::stdin()
        .read_to_string(&mut raw)
        .map_err(|e| format!("could not read stdin: {e}"))?;

    let submissions: Vec<SubmitReq> =
        serde_json::from_str(&raw).map_err(|e| format!("input is not a submission array: {e}"))?;

    let records: Vec<Record> = submissions
        .into_iter()
        .map(|req| {
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
        })
        .collect();

    let round = policy::aggregate(&round_id, records, NOW);
    let digest = policy::round_digest(&round)?;

    let published = PublishedRound {
        round,
        attestation: Attestation {
            digest,
            ruleset: RULESET_VERSION.to_string(),
            claims_digest_set: false,
            note: "Produced by blindband-local. The aggregation is the contract's own code, \
                   so the digest matches what the enclave would compute for these inputs, \
                   but nothing was written to a ledger and no receipt binds it."
                .to_string(),
        },
    };

    // Compact, not pretty: the digest is taken over the compact encoding of the
    // `round` field, and emitting it verbatim lets a verifier re-hash the exact
    // bytes rather than trusting a reformat.
    let json = serde_json::to_string(&published).map_err(|e| e.to_string())?;
    io::stdout()
        .write_all(json.as_bytes())
        .map_err(|e| e.to_string())
}
