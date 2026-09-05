/**
 * Ask the platform whether this tenant may provision a delegated agent
 * identity of its own.
 *
 * ```text
 * npm run probe:agent
 * ```
 *
 * This exists because the honest answer to "is Blindband an agent?" depends on
 * something we do not control. The runner in this repository holds a T3N
 * session, deploys the component, ingests submissions, runs each round inside
 * the enclave and anchors the result — but it acts under the *tenant* DID
 * rather than an agent DID of its own. That is a real distinction and the
 * report says so, so this command records exactly why, rather than asking
 * anyone to take our word for it. See BB-11.
 *
 * A refusal creates nothing, so this is safe to run before spending anything.
 */

import "dotenv/config";
import { connect } from "./lib/session.js";

const session = await connect(process.env.T3N_API_KEY!, "tenant");
console.log(`tenant did  : ${session.did}`);

// `createAgent` is not on the tenant-scoped helper; it hangs off the client.
const client = (session as unknown as { t3n: { createAgent?: Function } }).t3n;
console.log(`createAgent : ${typeof client?.createAgent} on the client`);

if (typeof client?.createAgent !== "function") {
  console.log("\nThis SDK build does not expose agent provisioning at all.");
  process.exit(0);
}

try {
  const res = await client.createAgent(session.did, "blindband-round-runner");
  console.log("\nprovisioned :", JSON.stringify({ agentDid: res.agentDid, keyId: res.keyId }, null, 2));
  console.log("The round runner can hold its own key. Update the status section.");
} catch (err) {
  console.log(`\nrefused     : ${err instanceof Error ? err.message : String(err)}`);
  console.log("A sandbox-claimed DID is not an organisation with policy metadata,");
  console.log("so delegated agent provisioning is not reachable from this tier.");
}
