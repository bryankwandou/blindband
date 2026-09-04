/**
 * Check a published round the way an outside member would.
 *
 * ```text
 * npm run verify
 * ```
 *
 * Three checks, in order of how much they ask you to trust:
 *
 *   1. offline — recompute the round digest from the bytes on disk. Costs
 *      nothing and needs no network. If this fails, nothing else matters.
 *   2. chain   — read the memo back off devnet and compare it with what was
 *      recomputed. This is what stops the operator quietly republishing a
 *      different round under the same id.
 *   3. enclave — ask the contract whether a given receipt is in the ledger,
 *      and whether its cell reached a published band.
 *
 * Only the third spends credits, and only that one requires trusting the node.
 * A member who has the round file and the signature can run 1 and 2 alone and
 * still catch a substituted round, which is the property worth having.
 *
 * The third check includes a forged commitment on purpose. A verifier that only
 * ever says yes has not been shown to distinguish anything.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

import { checkRoundDigest } from "./lib/digest.js";
import { callContract, callerKey, loadState } from "./lib/invoke.js";
import { connect, creditsAvailable, formatCredits, tenantFor } from "./lib/session.js";
import { devnetConnection, readAnchor } from "./lib/solana.js";

interface Receipt {
  commitment: string;
  round_id: string;
  cell: string;
}

interface ReceiptProof {
  commitment: string;
  round_id: string;
  included: boolean;
  cell: string | null;
  counted_in_published_band: boolean;
  note: string;
}

interface RoundFile {
  round: {
    round_id: string;
    ruleset: string;
    totals: { cells_published: number; cells_suppressed: number };
    bands: Array<{ role: string; level: string; region: string }>;
    suppressed: Array<{ role: string; level: string; region: string; reason: string }>;
  };
}

interface AnchorFile {
  signature: string;
  explorerUrl: string;
}

/** What each probe is meant to demonstrate, and what the contract said. */
interface Probe {
  label: string;
  commitment: string;
  expectIncluded: boolean;
  expectCounted: boolean;
  proof?: ReceiptProof;
  ok?: boolean;
  error?: string;
}

const PASS = "  ok  ";
const FAIL = " FAIL ";

function readJson<T>(path: string, hint: string): T {
  const full = resolve(path);
  if (!existsSync(full)) throw new Error(`No ${path}. ${hint}`);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

async function main() {
  const roundPath = process.argv[2] ?? "data/round.json";
  const raw = readFileSync(resolve(roundPath), "utf8");
  const { round } = JSON.parse(raw) as RoundFile;

  let failures = 0;
  const note = (ok: boolean, line: string) => {
    if (!ok) failures++;
    console.log(`[${ok ? PASS : FAIL}] ${line}`);
  };

  // ── 1. offline ─────────────────────────────────────────────────────────
  console.log(`round       : ${roundPath}  (${round.round_id}, ${round.ruleset})\n`);
  console.log("1. offline — digest over the bytes on disk");

  const digest = checkRoundDigest(raw);
  note(
    digest.ok,
    digest.ok
      ? `digest ${digest.recomputed.slice(0, 16)}… over ${digest.bytesHashed} bytes matches the attestation`
      : `claimed ${digest.claimed}, recomputed ${digest.recomputed}`,
  );

  // ── 2. chain ───────────────────────────────────────────────────────────
  console.log("\n2. chain — the anchor on Solana devnet");

  const anchor = readJson<AnchorFile>("data/anchor.json", "Run `npm run anchor` first.");
  const chain = await readAnchor(devnetConnection(process.env.SOLANA_RPC_URL), anchor.signature);
  const when = chain.blockTime ? new Date(chain.blockTime * 1000).toISOString() : "unknown";

  console.log(`     slot ${chain.slot}, block time ${when}`);
  note(chain.payload.d === digest.recomputed, `on-chain digest ${chain.payload.d === digest.recomputed ? "matches the round on disk" : `is ${chain.payload.d}, not ${digest.recomputed}`}`);
  note(chain.payload.r === round.round_id, `anchor names round ${chain.payload.r}`);
  note(chain.payload.rs === round.ruleset, `anchor names ruleset ${chain.payload.rs}`);
  note(
    chain.payload.pub === round.totals.cells_published &&
      chain.payload.sup === round.totals.cells_suppressed,
    `anchor carries ${chain.payload.pub} published / ${chain.payload.sup} withheld`,
  );
  console.log(`     ${anchor.explorerUrl}`);

  // ── 3. enclave ─────────────────────────────────────────────────────────
  //
  // Three probes: a receipt whose cell was published, a receipt whose cell was
  // withheld, and a commitment nobody ever submitted. The middle one is the
  // interesting case — the member is told their row is held and counted toward
  // a cell that did not clear the gates, without being told anything about the
  // other contributors to it.
  console.log("\n3. enclave — receipt inclusion, asked of the contract");

  const receipts = readJson<Receipt[]>("data/receipts.json", "Run `npm run submit` first.");
  const publishedCells = new Set(
    round.bands.map((b) => `${b.role}|${b.level}|${b.region}`),
  );

  const inBand = receipts.find((r) => publishedCells.has(r.cell));
  const withheld = receipts.find((r) => !publishedCells.has(r.cell));

  const probes: Probe[] = [];
  if (inBand) {
    probes.push({
      label: `receipt in a published band (${inBand.cell})`,
      commitment: inBand.commitment,
      expectIncluded: true,
      expectCounted: true,
    });
  }
  if (withheld) {
    probes.push({
      label: `receipt in a withheld cell (${withheld.cell})`,
      commitment: withheld.commitment,
      expectIncluded: true,
      expectCounted: false,
    });
  }
  probes.push({
    label: "forged commitment — the negative control",
    commitment: "0".repeat(64),
    expectIncluded: false,
    expectCounted: false,
  });

  const state = loadState();
  const { apiKey, who } = callerKey();
  const session = await connect(apiKey, who);
  const tenant = tenantFor(session);
  const before = await creditsAvailable(session);
  console.log(`     calling as ${who}, ${formatCredits(before)} available\n`);

  for (const probe of probes) {
    try {
      const { parsed } = await callContract<ReceiptProof>(tenant, state, "verify-receipt", {
        round_id: round.round_id,
        commitment: probe.commitment,
      });
      probe.proof = parsed;
      probe.ok =
        parsed.included === probe.expectIncluded &&
        parsed.counted_in_published_band === probe.expectCounted;
      note(probe.ok, `${probe.label}\n            → included ${parsed.included}, counted ${parsed.counted_in_published_band} — ${parsed.note}`);
    } catch (err) {
      // A credit exhaustion here is a sandbox limit, not a failed proof, but it
      // is still an unverified claim — count it and say which.
      probe.ok = false;
      probe.error = err instanceof Error ? err.message : String(err);
      note(false, `${probe.label}\n            → could not be checked: ${probe.error}`);
    }
  }

  const after = await creditsAvailable(session);
  if (before !== null && after !== null) {
    console.log(`\n     spent ${(before - after).toLocaleString("en-US")} base units`);
  }

  // ── report ─────────────────────────────────────────────────────────────
  const outPath = resolve("data/verification.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        roundId: round.round_id,
        ruleset: round.ruleset,
        verifiedAt: new Date().toISOString(),
        offline: digest,
        chain: {
          signature: anchor.signature,
          slot: chain.slot,
          blockTime: chain.blockTime,
          payload: chain.payload,
          explorerUrl: anchor.explorerUrl,
        },
        enclave: probes,
        failures,
      },
      null,
      2,
    ),
  );

  console.log(`\nreport      : ${outPath}`);
  if (failures) {
    throw new Error(`${failures} check(s) did not pass. Do not treat this round as verified.`);
  }
  console.log("verdict     : every check passed.");
}

main().catch((err) => {
  console.error(`\nverify failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
