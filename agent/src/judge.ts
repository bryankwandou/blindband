/**
 * Everything a stranger can check, in one command, with nothing of ours.
 *
 * ```text
 * npm run judge
 * ```
 *
 * No API key, no test credits, no account, no cooperation from us. It needs
 * Node and — for the third check only — an ordinary internet connection to a
 * public Solana RPC endpoint that we do not run.
 *
 * The four checks are deliberately different in kind, because passing all four
 * is much harder to fake than passing any one of them:
 *
 *   1. The published bands are recomputed from the raw submissions by a second
 *      implementation of the ruleset, written against `policy.rs` rather than
 *      sharing code with it. This is the one that catches numbers typed in by
 *      hand rather than produced by the gates.
 *   2. The round is rehashed from its own bytes and compared with the digest
 *      the enclave attested.
 *   3. That digest is read back off Solana devnet through a public endpoint we
 *      do not run, so the round cannot have been swapped for a friendlier one
 *      after the anchor was written.
 *   4. Two negative controls: a tampered round and a tampered submission set,
 *      which must both be rejected. A verifier that only ever says yes is not
 *      a verifier, and this is how you tell the difference from the outside.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { checkRoundDigest, extractRoundJson, sha256Hex } from "./lib/digest.js";
import { aggregate, type RawRecord } from "./lib/recompute.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUND_PATH = resolve(HERE, "../../web/src/data/round.json");
const ANCHOR_PATH = resolve(HERE, "../../web/src/data/anchor.json");
const RECORDS_PATH = resolve(HERE, "../data/records.json");
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

const results: { name: string; ok: boolean }[] = [];
function record(name: string, ok: boolean, note: string) {
  results.push({ name, ok });
  console.log(`${ok ? "[  ok  ]" : "[ FAIL ]"} ${name}`);
  console.log(`         ${note}`);
  console.log();
}

const rawRound = readFileSync(ROUND_PATH, "utf8");
const round = JSON.parse(rawRound).round;
const anchor = JSON.parse(readFileSync(ANCHOR_PATH, "utf8"));
const records: RawRecord[] = JSON.parse(readFileSync(RECORDS_PATH, "utf8"));

console.log(`round        : ${round.round_id}  (${round.ruleset})`);
console.log(`submissions  : ${records.length} rows, read from agent/data/records.json`);
console.log(`rpc          : ${RPC}`);
console.log();

// ---------------------------------------------------------------- check 1 ---
// Recompute the round from the raw submissions and diff it field by field.

const rules = {
  min_contributors_per_cell: round.min_contributors_per_cell,
  min_records_per_cell: round.min_records_per_cell,
  max_contributor_share_bps: round.max_contributor_share_bps,
  min_data_age_secs: round.min_data_age_secs,
};

function diffRound(mine: ReturnType<typeof aggregate>, theirs: any): string[] {
  const problems: string[] = [];

  for (const [k, v] of Object.entries(mine.totals)) {
    if (theirs.totals[k] !== v) problems.push(`totals.${k}: published ${theirs.totals[k]}, recomputed ${v}`);
  }
  if (mine.bands.length !== theirs.bands.length) {
    problems.push(`band count: published ${theirs.bands.length}, recomputed ${mine.bands.length}`);
  }

  for (const band of mine.bands) {
    const cell = `${band.role} ${band.level}`;
    const pub = theirs.bands.find(
      (b: any) => b.role === band.role && b.level === band.level && b.region === band.region,
    );
    if (!pub) {
      problems.push(`${cell}: recomputed as published, but absent from the round`);
      continue;
    }
    for (const [k, v] of Object.entries(band)) {
      if (pub[k] !== v) problems.push(`${cell} ${k}: published ${pub[k]}, recomputed ${v}`);
    }
  }

  for (const s of mine.suppressed) {
    const cell = `${s.role} ${s.level}`;
    const pub = theirs.suppressed.find(
      (x: any) => x.role === s.role && x.level === s.level && x.region === s.region,
    );
    if (!pub) {
      problems.push(`${cell}: recomputed as withheld, but not listed as withheld`);
      continue;
    }
    if (pub.reason !== s.reason) problems.push(`${cell}: withheld as "${pub.reason}", recomputed as "${s.reason}"`);
    if (pub.contributors !== s.contributors) problems.push(`${cell} contributors: published ${pub.contributors}, recomputed ${s.contributors}`);
    if (pub.records !== s.records) problems.push(`${cell} records: published ${pub.records}, recomputed ${s.records}`);
  }

  return problems;
}

const mine = aggregate(records, round.generated_at, rules);
const drift = diffRound(mine, round);
const fields = mine.bands.length * 13 + mine.suppressed.length * 6 + 6;

record(
  "the gates and the maths, recomputed from the raw submissions",
  drift.length === 0,
  drift.length === 0
    ? `${fields} fields agree — ${mine.bands.length} cells published, ${mine.suppressed.length} withheld ` +
      `(${mine.suppressed.map((s) => s.reason).join(", ")})`
    : drift.slice(0, 8).join("\n         "),
);

// ---------------------------------------------------------------- check 2 ---
// Rehash the round from its own bytes.

const digest = checkRoundDigest(rawRound);

record(
  "the digest, recomputed from the published bytes",
  digest.ok,
  `${digest.bytesHashed} bytes hashed → ${digest.recomputed.slice(0, 16)}…${digest.recomputed.slice(-8)}` +
    (digest.ok ? " — the digest the enclave attested" : `\n         attested: ${digest.claimed}`),
);

// ---------------------------------------------------------------- check 3 ---
// Read the digest back off devnet through an endpoint we do not run.

async function readMemo(signature: string): Promise<string | null> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 }],
    }),
  });
  const body = (await res.json()) as any;
  const instructions = body?.result?.transaction?.message?.instructions ?? [];
  for (const ix of instructions) {
    if (ix.programId === MEMO_PROGRAM && typeof ix.parsed === "string") return ix.parsed;
  }
  return null;
}

try {
  const memo = await readMemo(anchor.signature);
  if (memo === null) {
    record("the digest, read back off Solana devnet", false, `no memo instruction in ${anchor.signature.slice(0, 12)}…`);
  } else {
    const onChain = JSON.parse(memo);
    const ok = onChain.d === digest.recomputed && onChain.r === round.round_id && onChain.p === "blindband";
    record(
      "the digest, read back off Solana devnet",
      ok,
      ok
        ? `tx ${anchor.signature.slice(0, 12)}… carries d=${onChain.d.slice(0, 16)}… for round ${onChain.r},\n` +
          `         written at slot ${anchor.slot} — before you asked, and not by anything of ours`
        : `on-chain memo says ${JSON.stringify(onChain)}`,
    );
  }
} catch (err) {
  record(
    "the digest, read back off Solana devnet",
    false,
    `could not reach ${RPC} (${err instanceof Error ? err.message : String(err)}).\n` +
      `         This check needs the internet; the others do not.`,
  );
}

// ---------------------------------------------------------------- check 4 ---
// Negative controls. Both of these must be rejected.

const tamperedRound = rawRound.replace(/"p50":(\d+)/, (_m, n) => `"p50":${Number(n) + 1}`);
const tamperedDigest = sha256Hex(extractRoundJson(tamperedRound));
const roundRejected = tamperedDigest !== digest.claimed;

const tamperedRecords = records.map((r, i) => (i === 0 ? { ...r, base_minor: r.base_minor + 100 } : r));
const recordsRejected = diffRound(aggregate(tamperedRecords, round.generated_at, rules), round).length > 0;

record(
  "the negative controls — a verifier that can say no",
  roundRejected && recordsRejected,
  `one median raised by $0.01 → ${tamperedDigest.slice(0, 16)}…, ${roundRejected ? "rejected" : "ACCEPTED"}\n` +
    `         one salary raised by $1.00 → recomputation ${recordsRejected ? "diverges, rejected" : "still agrees, ACCEPTED"}`,
);

// -----------------------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
console.log("─".repeat(70));
if (failed.length === 0) {
  console.log(`${results.length}/${results.length} checks passed. The published round is the one the enclave`);
  console.log("produced from these submissions, and the chain agrees.");
} else {
  console.log(`${results.length - failed.length}/${results.length} passed. Failed: ${failed.map((f) => f.name).join("; ")}`);
}

// Set the code rather than calling process.exit: the fetch above leaves a
// socket in teardown, and exiting through it trips a libuv assertion on Windows.
process.exitCode = failed.length === 0 ? 0 : 1;
