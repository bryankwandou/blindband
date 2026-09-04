/**
 * Preflight: prove the credentials work before spending anything.
 *
 * Run this first, and run it again whenever something downstream fails in a
 * confusing way. It answers the two questions that explain most failures — is
 * the key authenticating, and are there credits left.
 *
 * ```text
 * npm run preflight
 * ```
 */

import "dotenv/config";

import { connect, creditsAvailable, envName, formatCredits } from "./lib/session.js";

/** What one contract execution locks, per the node's credit model. */
const EXECUTION_LOCK = 10_000_000_000;

async function checkIdentity(apiKey: string | undefined, label: string, expectedDid?: string) {
  console.log(`\n── ${label} ──`);
  if (!apiKey) {
    console.log("key       : not set");
    console.log(
      "            Claim one at https://go.terminal3.io/adk-community and add it to .env.",
    );
    return;
  }

  console.log(`key       : set (${apiKey.slice(0, 6)}…${apiKey.slice(-4)})`);

  const session = await connect(apiKey, label);
  console.log(`address   : ${session.address}`);
  console.log(`did       : ${session.did}`);

  if (expectedDid && expectedDid !== session.did) {
    console.log(`            note: .env expected ${expectedDid}`);
  }

  const credits = await creditsAvailable(session);
  console.log(`credits   : ${formatCredits(credits)}`);

  if (credits !== null) {
    const runs = Math.floor(credits / EXECUTION_LOCK);
    console.log(`executions: about ${runs} left (each locks ${EXECUTION_LOCK.toLocaleString("en-US")})`);
    if (runs === 0) {
      console.log(
        "            Exhausted. Top up via https://t.me/wardumb — quote the DID above and \"Superteam\".",
      );
    }
  }
}

async function main() {
  console.log(`environment: ${envName()}`);

  await checkIdentity(process.env.T3N_API_KEY, "tenant", process.env.T3N_EXPECTED_DID);
  await checkIdentity(process.env.T3N_AGENT_API_KEY, "agent");

  if (!process.env.T3N_AGENT_API_KEY) {
    console.log(
      "\nThe agent has no key of its own yet. Rounds can still be run from the tenant\n" +
        "identity for a smoke test, but the delegation story only holds once the agent\n" +
        "authenticates separately — that is the whole point of the grant.",
    );
  }
}

main().catch((err) => {
  console.error(`\npreflight failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
