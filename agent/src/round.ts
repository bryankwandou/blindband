/**
 * Run the aggregation inside the enclave and publish the round.
 *
 * ```text
 * npm run round -- 2026-q1
 * ```
 *
 * `compute-round` returns the published round in its response body, so this is
 * also the read path — there is no need to spend a second execution on
 * `get-round` just to see what was produced.
 *
 * The response is written to `data/round.json` byte for byte. That is the whole
 * reason this script exists rather than a `npm run call` one-liner: the
 * attestation digest is a SHA-256 over the contract's own encoding of the
 * `round` field, and a body that has been through `JSON.parse` and back is not
 * those bytes any more. Re-serialising here would produce a file that fails
 * `npm run verify` against a round that is perfectly valid.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

import { checkRoundDigest } from "./lib/digest.js";
import { callContract, callerKey, loadState } from "./lib/invoke.js";
import { connect, creditsAvailable, formatCredits, tenantFor } from "./lib/session.js";

interface Band {
  role: string;
  level: string;
  region: string;
  currency: string;
  contributors: number;
  records: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
  top_contributor_share_bps: number;
}

interface Suppressed {
  role: string;
  level: string;
  region: string;
  contributors: number;
  records: number;
  reason: string;
}

interface PublishedRound {
  round: {
    round_id: string;
    ruleset: string;
    generated_at: number;
    totals: {
      records_ingested: number;
      records_excluded_recent: number;
      records_excluded_malformed: number;
      contributors: number;
      cells_published: number;
      cells_suppressed: number;
    };
    bands: Band[];
    suppressed: Suppressed[];
    inputs_digest: string;
  };
  attestation: {
    digest: string;
    ruleset: string;
    claims_digest_set: boolean;
    note: string;
  };
}

/** Minor units are cents; show them the way a compensation report would. */
function money(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

async function main() {
  const roundId = process.argv[2] ?? "2026-q1";

  const state = loadState();
  const { apiKey, who } = callerKey();

  console.log(`contract    : ${state.contractName}`);
  console.log(`calling as  : ${who}`);
  console.log(`round       : ${roundId}\n`);

  const session = await connect(apiKey, who);
  const before = await creditsAvailable(session);
  console.log(`credits     : ${formatCredits(before)} before\n`);

  const { parsed, raw } = await callContract<PublishedRound>(
    tenantFor(session),
    state,
    "compute-round",
    { round_id: roundId },
  );

  const { round, attestation } = parsed;
  const t = round.totals;

  console.log(`ruleset     : ${round.ruleset}`);
  console.log(`ingested    : ${t.records_ingested} rows from ${t.contributors} contributors`);
  console.log(`excluded    : ${t.records_excluded_recent} too recent, ${t.records_excluded_malformed} malformed`);
  console.log(`published   : ${t.cells_published} bands`);
  console.log(`withheld    : ${t.cells_suppressed} cells\n`);

  for (const b of round.bands) {
    console.log(`  ${b.role} ${b.level} / ${b.region}`);
    console.log(
      `    p10 ${money(b.p10, b.currency)}   p50 ${money(b.p50, b.currency)}   p90 ${money(b.p90, b.currency)}`,
    );
    console.log(
      `    ${b.contributors} contributors, ${b.records} records, top share ${(b.top_contributor_share_bps / 100).toFixed(2)}%`,
    );
  }

  if (round.suppressed.length) {
    console.log(`\n  withheld:`);
    for (const s of round.suppressed) {
      console.log(
        `    ${s.role} ${s.level} / ${s.region} — ${s.reason} (${s.contributors} contributors, ${s.records} records)`,
      );
    }
  }

  // Verbatim, for the reason in the module comment above.
  const roundPath = resolve("data/round.json");
  writeFileSync(roundPath, raw);
  console.log(`\nround       : ${roundPath}`);
  console.log(`digest      : ${attestation.digest}`);
  console.log(`inputs      : ${round.inputs_digest}`);
  console.log(`claims bound: ${attestation.claims_digest_set}`);

  // Recompute immediately rather than trusting the field we were just handed.
  // A digest that only ever gets checked by the party that produced it is
  // decoration; catching a mismatch here is the point of writing it down.
  const check = checkRoundDigest(raw);
  console.log(
    `recomputed  : ${check.ok ? "matches" : `MISMATCH — claimed ${check.claimed}, got ${check.recomputed}`}`,
  );
  if (!check.ok) {
    throw new Error(
      "The round's own digest does not cover the round it was returned with. Do not anchor this.",
    );
  }

  const after = await creditsAvailable(session);
  console.log(`\ncredits     : ${formatCredits(after)} after`);
  if (before !== null && after !== null) {
    console.log(`spent       : ${(before - after).toLocaleString("en-US")} base units`);
  }

  console.log(`\nNext: npm run anchor    (writes the digest to Solana devnet)`);
}

main().catch((err) => {
  console.error(`\nround failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
