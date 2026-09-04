/**
 * Read-only diagnostics for a contract that will not dispatch.
 *
 * `Internal error` from the node carries a request id and nothing else, so the
 * useful signal has to come from elsewhere: whether the tenant is admitted,
 * whether the contract is actually registered and enabled, and whether the
 * host wrote anything into the contract's log ring on the way down.
 *
 * ```text
 * npm run diagnose
 * ```
 */

import "dotenv/config";

import { CONTRACT_TAIL, loadState } from "./lib/invoke.js";
import { connect, creditsAvailable, formatCredits, nodeUrl, tenantFor } from "./lib/session.js";

async function show(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`${label.padEnd(16)}: `);
  try {
    const value = await fn();
    console.log(JSON.stringify(value, null, 2).slice(0, 1200));
  } catch (err) {
    console.log(`failed — ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  const state = loadState();
  console.log(`node            : ${nodeUrl()}`);
  console.log(`contract        : ${state.contractName}@${state.contractVersion}`);
  console.log(`contract id     : ${state.contractId}\n`);

  const session = await connect(process.env.T3N_API_KEY!, "tenant");
  const tenant = tenantFor(session);

  console.log(`did             : ${session.did}`);
  console.log(`credits         : ${formatCredits(await creditsAvailable(session))}\n`);

  await show("tenant.me", () => tenant.tenant.me());
  await show("contracts.list", () => tenant.contracts.list());
  await show("listDetailed", () => tenant.contracts.listDetailed());

  // The log ring is the only place a host-side link or trap failure surfaces.
  // It returns empty when the tenant's `log_max_entries` quota is zero, which
  // is itself worth knowing.
  await show("contract logs", () =>
    tenant.contracts.logs(CONTRACT_TAIL, { limit: 25, minLevel: "debug" }),
  );
}

main().catch((err) => {
  console.error(`\ndiagnose failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
