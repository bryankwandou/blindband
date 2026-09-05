//! Run the agent's judgement on your own data, on your own machine.
//!
//! ```text
//! cargo run --example replay -- --replay          # rerun the published round
//! cargo run --example replay -- payroll.csv       # run it on your own rows
//! ```
//!
//! This is not a description of what the enclave does and not a second
//! implementation of it. It is *the same code*: `policy::aggregate` and
//! `policy::round_digest` out of this crate, the functions compiled into the
//! wasm component that ran inside the TEE. The only thing missing is the
//! enclave, and the enclave is what keeps the inputs sealed — it does not
//! change a single number that comes out.
//!
//! So two different people can do two different things with this:
//!
//! * `--replay` rebuilds the published round from `agent/data/records.json`
//!   and `agent/data/receipts.json` and prints its digest. If that digest is
//!   `e4f528ad…beef`, the round anchored on Solana devnet is one this machine
//!   just derived from the inputs, with nothing of ours in the loop.
//!
//! * Pointed at a CSV or JSON file of your own, it runs the four gates on your
//!   rows and tells you which cells it would publish, which it would withhold,
//!   and why. That is the actual product decision, made on your data, offline,
//!   with no account and no credits.
//!
//! Columns, as CSV with a header row:
//!
//! ```text
//! contributor,role,level,region,currency,base_minor,effective_at
//! member-01,Backend Engineer,L4,SEA,USD,900000,1762460800
//! ```
//!
//! `base_minor` is minor units (cents), so the maths stays integral.
//! `effective_at` is Unix seconds — the date the pay was effective, which is
//! what gate 1 tests.

use std::fs;
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

use z_blindband::model::{Record, SubmitReq, MIN_DATA_AGE_SECS};
use z_blindband::policy::{aggregate, commit, round_digest};

/// The round this repository published, and the digest sitting on devnet.
const PUBLISHED_ROUND: &str = "2026-q1";
const PUBLISHED_GENERATED_AT: u64 = 1_788_492_021;
const PUBLISHED_DIGEST: &str = "e4f528ad321626b2daf9b667188937609cd160a21a739d542eabd44a2f40beef";

#[derive(serde::Deserialize)]
struct Receipt {
    commitment: String,
    submitted_at: u64,
}

struct Args {
    input: Option<String>,
    receipts: Option<String>,
    round_id: String,
    now: Option<u64>,
    expect: Option<String>,
}

fn main() -> ExitCode {
    let args = match parse_args() {
        Ok(a) => a,
        Err(msg) => {
            eprintln!("{msg}\n");
            usage();
            return ExitCode::FAILURE;
        }
    };

    let path = args.input.unwrap_or_else(|| "../agent/data/records.json".into());
    let raw = match fs::read_to_string(&path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Could not read {path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    let submissions = match if path.ends_with(".csv") { parse_csv(&raw) } else { parse_json(&raw) } {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    if submissions.is_empty() {
        eprintln!("{path} holds no rows.");
        return ExitCode::FAILURE;
    }

    // Commitments. With the receipts from the real run, the reconstruction is
    // exact and the digest is comparable to the one on chain. Without them we
    // mint fresh ones, which is fine for judging your own data but means the
    // digest is yours rather than ours.
    let (records, exact) = match &args.receipts {
        Some(p) => {
            let text = match fs::read_to_string(p) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Could not read {p}: {e}");
                    return ExitCode::FAILURE;
                }
            };
            let receipts: Vec<Receipt> = match serde_json::from_str(&text) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("{p}: {e}");
                    return ExitCode::FAILURE;
                }
            };
            if receipts.len() != submissions.len() {
                eprintln!(
                    "{p} holds {} receipts for {} rows — they must line up one to one.",
                    receipts.len(),
                    submissions.len()
                );
                return ExitCode::FAILURE;
            }
            let records = submissions
                .iter()
                .zip(receipts.iter())
                .map(|(s, r)| to_record(s, r.submitted_at, r.commitment.clone()))
                .collect::<Vec<_>>();
            (records, true)
        }
        None => {
            let at = now();
            let records = submissions
                .iter()
                .map(|s| to_record(s, at, commit(s, at)))
                .collect::<Vec<_>>();
            (records, false)
        }
    };

    let round_id = args.round_id;
    let now = args.now.unwrap_or_else(now);

    println!("input        : {path} — {} rows", records.len());
    println!("round        : {round_id}");
    println!(
        "evaluated at : {now}  (rows effective after {} are too recent to use)",
        now.saturating_sub(MIN_DATA_AGE_SECS)
    );
    println!(
        "commitments  : {}",
        if exact { "from the real submission receipts" } else { "minted locally — this run is yours, not a replay" }
    );
    println!();

    // ---- the agent's judgement, from the crate the enclave ran ------------
    let round = aggregate(&round_id, records, now);

    let t = &round.totals;
    println!(
        "ingested {} rows from {} contributors — {} too recent, {} malformed",
        t.records_ingested, t.contributors, t.records_excluded_recent, t.records_excluded_malformed
    );
    println!("{} cells published, {} withheld\n", t.cells_published, t.cells_suppressed);

    if round.bands.is_empty() {
        println!("PUBLISHED — nothing. No cell cleared all four gates.\n");
    } else {
        println!("PUBLISHED");
        println!(
            "  {:<24} {:<6} {:>9} {:>9} {:>9} {:>6} {:>9}",
            "cell", "cur", "p10", "median", "p90", "firms", "top firm"
        );
        for b in &round.bands {
            println!(
                "  {:<24} {:<6} {:>9} {:>9} {:>9} {:>6} {:>8}%",
                format!("{} {}", b.role, b.level),
                b.currency,
                money(b.p10),
                money(b.p50),
                money(b.p90),
                b.contributors,
                format!("{:.2}", b.top_contributor_share_bps as f64 / 100.0),
            );
        }
        println!();
    }

    if !round.suppressed.is_empty() {
        println!("WITHHELD");
        for s in &round.suppressed {
            println!(
                "  {:<24} {:<38} {} firms / {} rows",
                format!("{} {}", s.role, s.level),
                s.reason,
                s.contributors,
                s.records
            );
        }
        println!();
    }

    let digest = match round_digest(&round) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Could not hash the round: {e}");
            return ExitCode::FAILURE;
        }
    };
    println!("digest       : {digest}");

    // ---- and the one claim worth checking --------------------------------
    if let Some(expected) = args.expect {
        if digest == expected {
            println!("expected     : {expected}");
            println!(
                "\n[  ok  ] this machine derived the digest that is anchored on Solana devnet.\n\
                 \x20        Same inputs, same code, same answer — no enclave, no key, no network."
            );
            return ExitCode::SUCCESS;
        }
        println!("expected     : {expected}");
        println!("\n[ FAIL ] the round this machine derived is not the one that was anchored.");
        return ExitCode::FAILURE;
    }

    println!(
        "\nNothing above needed an account, a key or a network. Change a salary in\n\
         the input and run it again: the gates are what decides, not us."
    );
    ExitCode::SUCCESS
}

fn to_record(s: &SubmitReq, submitted_at: u64, commitment: String) -> Record {
    Record {
        round_id: s.round_id.clone(),
        contributor: s.contributor.clone(),
        role: s.role.clone(),
        level: s.level.clone(),
        region: s.region.clone(),
        currency: s.currency.clone(),
        base_minor: s.base_minor,
        effective_at: s.effective_at,
        submitted_at,
        commitment,
    }
}

/// Minor units to a readable major amount, without pretending to know the
/// currency's subunit count beyond the usual two.
fn money(minor: u64) -> String {
    format!("{}.{:02}", minor / 100, minor % 100)
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn parse_json(raw: &str) -> Result<Vec<SubmitReq>, String> {
    serde_json::from_str(raw).map_err(|e| format!("not a JSON array of submissions: {e}"))
}

/// A deliberately small CSV reader: header row, comma separated, no quoting.
/// Anyone exporting a payroll extract for this can avoid commas in a role name,
/// and a dependency-free example is worth more here than a general parser.
fn parse_csv(raw: &str) -> Result<Vec<SubmitReq>, String> {
    let mut lines = raw.lines().filter(|l| !l.trim().is_empty());
    let header = lines.next().ok_or("the file is empty")?;
    let columns: Vec<&str> = header.split(',').map(|c| c.trim()).collect();

    let index = |name: &str| -> Result<usize, String> {
        columns
            .iter()
            .position(|c| c.eq_ignore_ascii_case(name))
            .ok_or_else(|| format!("the header row has no `{name}` column"))
    };

    let (i_contrib, i_role, i_level, i_region, i_cur, i_base, i_eff) = (
        index("contributor")?,
        index("role")?,
        index("level")?,
        index("region")?,
        index("currency")?,
        index("base_minor")?,
        index("effective_at")?,
    );
    let i_round = columns.iter().position(|c| c.eq_ignore_ascii_case("round_id"));

    let mut out = Vec::new();
    for (n, line) in lines.enumerate() {
        let f: Vec<&str> = line.split(',').map(|c| c.trim()).collect();
        let get = |i: usize| -> Result<String, String> {
            f.get(i).map(|s| s.to_string()).ok_or_else(|| format!("row {} is short of columns", n + 2))
        };
        let num = |i: usize, what: &str| -> Result<u64, String> {
            get(i)?.parse().map_err(|_| format!("row {}: `{what}` is not a whole number", n + 2))
        };
        out.push(SubmitReq {
            round_id: match i_round {
                Some(i) => get(i)?,
                None => String::new(),
            },
            contributor: get(i_contrib)?,
            role: get(i_role)?,
            level: get(i_level)?,
            region: get(i_region)?,
            currency: get(i_cur)?,
            base_minor: num(i_base, "base_minor")?,
            effective_at: num(i_eff, "effective_at")?,
        });
    }
    Ok(out)
}

fn parse_args() -> Result<Args, String> {
    let mut input = None;
    let mut receipts = None;
    let mut round_id = None;
    let mut now = None;
    let mut expect = None;

    let mut it = std::env::args().skip(1);
    while let Some(a) = it.next() {
        match a.as_str() {
            // The published round, rebuilt exactly: the inputs, the receipts,
            // the timestamp it was generated at, and the digest to beat.
            "--replay" => {
                input.get_or_insert_with(|| "../agent/data/records.json".to_string());
                receipts.get_or_insert_with(|| "../agent/data/receipts.json".to_string());
                round_id.get_or_insert_with(|| PUBLISHED_ROUND.to_string());
                now.get_or_insert(PUBLISHED_GENERATED_AT);
                expect.get_or_insert_with(|| PUBLISHED_DIGEST.to_string());
            }
            "--receipts" => receipts = Some(it.next().ok_or("--receipts needs a path")?),
            "--round-id" => round_id = Some(it.next().ok_or("--round-id needs a value")?),
            "--now" => {
                now = Some(it.next().ok_or("--now needs a Unix timestamp")?.parse().map_err(|_| "--now must be Unix seconds")?)
            }
            "--expect" => expect = Some(it.next().ok_or("--expect needs a digest")?),
            "-h" | "--help" => {
                usage();
                std::process::exit(0);
            }
            other if other.starts_with('-') => return Err(format!("unknown option `{other}`")),
            other => input = Some(other.to_string()),
        }
    }

    Ok(Args {
        input,
        receipts,
        round_id: round_id.unwrap_or_else(|| "local".to_string()),
        now,
        expect,
    })
}

fn usage() {
    println!(
        "Run the Blindband gates on a set of submissions, offline.\n\
         \n\
         cargo run --example replay -- --replay\n\
         \x20   Rebuild the published round from its own inputs and check that this\n\
         \x20   machine derives the digest anchored on Solana devnet.\n\
         \n\
         cargo run --example replay -- payroll.csv\n\
         \x20   Run the four gates on your own rows and see what would be published.\n\
         \n\
         Options:\n\
         \x20 --receipts <path>   commitments from a real submission, for an exact replay\n\
         \x20 --round-id <id>     label for the round (default: local)\n\
         \x20 --now <unix secs>   the moment to judge data age against (default: now)\n\
         \x20 --expect <digest>   fail unless the round hashes to this\n\
         \n\
         CSV columns: contributor,role,level,region,currency,base_minor,effective_at"
    );
}
