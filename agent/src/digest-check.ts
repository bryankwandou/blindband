/**
 * Recompute a round's digest from the published bytes. No key, no credits, no
 * network.
 *
 * ```text
 * npm run digest                       # the round this repository publishes
 * npm run digest -- path/to/round.json # or one you fetched yourself
 * ```
 *
 * This is the first of the three verification tiers, and the only one that
 * needs nothing from us at all. It exists as its own command because telling
 * someone to "just hash the round" is not good enough: the digest covers the
 * contract's own encoding of the `round` field, so the bytes have to be sliced
 * out of the response verbatim. Hashing the whole file, or anything that has
 * been through `JSON.parse` and back, gives a different and meaningless answer.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { checkRoundDigest } from "./lib/digest.js";

const DEFAULT_ROUND = "../web/src/data/round.json";

const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
const path = resolve(arg ?? DEFAULT_ROUND);

const raw = readFileSync(path, "utf8");
const result = checkRoundDigest(raw);

console.log(`round file  : ${path}`);
console.log(`hashed      : ${result.bytesHashed} bytes — the \`round\` value, sliced verbatim`);
console.log(`claimed     : ${result.claimed}`);
console.log(`recomputed  : ${result.recomputed}`);
console.log(result.ok ? "\n[  ok  ] the digest is the one the enclave attested." : "\n[ FAIL ] the round does not hash to its own attestation.");

process.exit(result.ok ? 0 : 1);
