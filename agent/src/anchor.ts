/**
 * Anchor a published round on Solana devnet.
 *
 * ```text
 * npm run anchor -- data/round.json
 * ```
 *
 * Refuses to write anything if the round's own digest does not check out
 * locally. Anchoring a digest nobody verified would put a number on a public
 * ledger and call it proof.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

import { checkRoundDigest } from "./lib/digest.js";
import {
  anchorRound,
  devnetConnection,
  keypairFromHexSeed,
  type AnchorPayload,
} from "./lib/solana.js";

async function main() {
  const roundPath = process.argv[2] ?? "data/round.json";
  const raw = readFileSync(resolve(roundPath), "utf8");

  const seed = process.env.SOLANA_SEED_HEX;
  if (!seed) {
    throw new Error(
      "SOLANA_SEED_HEX is not set. Copy .env.example to .env and put a devnet ed25519 seed in it.",
    );
  }

  // Step 1 — verify before publishing.
  const check = checkRoundDigest(raw);
  console.log(`round file    : ${roundPath}`);
  console.log(`bytes hashed  : ${check.bytesHashed}`);
  console.log(`claimed digest: ${check.claimed}`);
  console.log(`recomputed    : ${check.recomputed}`);
  if (!check.ok) {
    throw new Error(
      "The round's digest does not match its own contents. Nothing was anchored.",
    );
  }
  console.log("digest        : matches\n");

  const round = JSON.parse(raw) as {
    round: {
      round_id: string;
      ruleset: string;
      totals: { cells_published: number; cells_suppressed: number };
    };
  };

  const payload: AnchorPayload = {
    p: "blindband",
    v: 1,
    r: round.round.round_id,
    d: check.claimed,
    rs: round.round.ruleset,
    pub: round.round.totals.cells_published,
    sup: round.round.totals.cells_suppressed,
  };

  // Step 2 — write it.
  const connection = devnetConnection(process.env.SOLANA_RPC_URL);
  const signer = keypairFromHexSeed(seed);
  console.log(`signer        : ${signer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(signer.publicKey);
  if (balance === 0) {
    throw new Error(
      `${signer.publicKey.toBase58()} holds no devnet SOL. Fund it at https://faucet.solana.com first.`,
    );
  }
  console.log(`balance       : ${(balance / 1e9).toFixed(4)} SOL`);

  const result = await anchorRound(connection, signer, payload);

  console.log(`\nanchored`);
  console.log(`signature     : ${result.signature}`);
  console.log(`slot          : ${result.slot}`);
  console.log(`memo bytes    : ${result.memoBytes}`);
  console.log(`explorer      : ${result.explorerUrl}`);

  const outPath = resolve("data/anchor.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        signature: result.signature,
        slot: result.slot,
        explorerUrl: result.explorerUrl,
        cluster: "devnet",
        signer: signer.publicKey.toBase58(),
        payload: result.payload,
        anchoredAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`written       : ${outPath}`);
}

main().catch((err) => {
  console.error(`\nanchor failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
