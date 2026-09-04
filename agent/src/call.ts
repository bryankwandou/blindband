/**
 * Ad-hoc contract call, for debugging and for reading published rounds.
 *
 * ```text
 * npm run call -- get-round '{"round_id":"2026-q1"}'
 * npm run call -- verify-receipt '{"round_id":"2026-q1","commitment":"…"}'
 * ```
 *
 * Prints the raw body as well as the parsed one. When a digest does not match,
 * the raw bytes are the evidence.
 */

import "dotenv/config";

import { callContract, callerKey, loadState, type ContractFn } from "./lib/invoke.js";
import { connect, creditsAvailable, formatCredits, tenantFor } from "./lib/session.js";

async function main() {
  const fn = process.argv[2] as ContractFn | undefined;
  const inputArg = process.argv[3] ?? "{}";

  if (!fn) {
    throw new Error(
      "usage: npm run call -- <function-name> '<json input>'\n" +
        "functions: submit-record, submit-batch, compute-round, get-round, verify-receipt",
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(inputArg);
  } catch {
    throw new Error(`Second argument is not JSON: ${inputArg}`);
  }

  const state = loadState();
  const { apiKey, who } = callerKey();

  console.log(`contract : ${state.contractName}@${state.contractVersion}`);
  console.log(`function : ${fn}`);
  console.log(`as       : ${who}`);

  const session = await connect(apiKey, who);
  const before = await creditsAvailable(session);
  console.log(`credits  : ${formatCredits(before)}\n`);

  const { parsed, raw } = await callContract(tenantFor(session), state, fn, input);

  console.log(`raw bytes: ${Buffer.byteLength(raw, "utf8")}`);
  console.log(`${JSON.stringify(parsed, null, 2).slice(0, 4000)}`);

  const after = await creditsAvailable(session);
  if (before !== null && after !== null) {
    console.log(`\nspent    : ${(before - after).toLocaleString("en-US")} base units`);
  }
}

main().catch((err) => {
  console.error(`\ncall failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
