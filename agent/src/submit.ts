/**
 * Upload a consortium batch into the sealed ledger.
 *
 * ```text
 * npm run submit -- data/records.json
 * ```
 *
 * One invocation carries the whole file. That is not a micro-optimisation: at
 * one execution per row a 117-row demo would need 117 executions, and a
 * sandbox allocation covers two.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

import { callContract, callerKey, loadState } from "./lib/invoke.js";
import { connect, creditsAvailable, formatCredits, tenantFor } from "./lib/session.js";

interface SubmitRow {
  round_id: string;
  contributor: string;
  role: string;
  level: string;
  region: string;
  currency: string;
  base_minor: number;
  effective_at: number;
}

interface BatchResult {
  accepted: number;
  rejected_count: number;
  receipts: Array<{ commitment: string; round_id: string; cell: string }>;
  rejected: Array<{ index: number; reason: string }>;
}

async function main() {
  const path = process.argv[2] ?? "data/records.json";
  const rows = JSON.parse(readFileSync(resolve(path), "utf8")) as SubmitRow[];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${path} does not hold a non-empty array of submissions.`);
  }

  const state = loadState();
  const { apiKey, who } = callerKey();

  const contributors = new Set(rows.map((r) => r.contributor));
  console.log(`contract    : ${state.contractName}`);
  console.log(`calling as  : ${who}`);
  console.log(`file        : ${path}`);
  console.log(`rows        : ${rows.length} from ${contributors.size} contributors`);
  console.log(`round       : ${rows[0]!.round_id}\n`);

  const session = await connect(apiKey, who);
  const before = await creditsAvailable(session);
  console.log(`credits     : ${formatCredits(before)} before\n`);

  const { parsed } = await callContract<BatchResult>(
    tenantFor(session),
    state,
    "submit-batch",
    rows,
  );

  console.log(`accepted    : ${parsed.accepted}`);
  console.log(`rejected    : ${parsed.rejected_count}`);
  for (const r of parsed.rejected.slice(0, 10)) {
    console.log(`              row ${r.index}: ${r.reason}`);
  }

  const receiptPath = resolve("data/receipts.json");
  writeFileSync(receiptPath, JSON.stringify(parsed.receipts, null, 2));
  console.log(`receipts    : ${receiptPath}`);
  if (parsed.receipts[0]) {
    console.log(`sample      : ${parsed.receipts[0].commitment}`);
  }

  const after = await creditsAvailable(session);
  console.log(`\ncredits     : ${formatCredits(after)} after`);
  if (before !== null && after !== null) {
    console.log(`spent       : ${(before - after).toLocaleString("en-US")} base units`);
  }
}

main().catch((err) => {
  console.error(`\nsubmit failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
