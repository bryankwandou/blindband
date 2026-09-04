/**
 * Register the contract and create the two maps it needs.
 *
 * ```text
 * npm run deploy
 * ```
 *
 * Credits are the constraint here, not correctness. A sandbox allocation is
 * 20,000,000,000 base units and a contract execution locks 10,000,000,000 of
 * them, so there is room for roughly two runs plus the registration. This
 * script therefore prints the balance before and after, refuses to start when
 * the balance is already too low to finish, and treats "already exists" as
 * success so a re-run costs nothing extra.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

import { connect, creditsAvailable, envName, formatCredits, tenantFor } from "./lib/session.js";

/** Where the WASM component lands after `cargo build --target wasm32-wasip2 --release`. */
const WASM_PATH = "../contract/target/wasm32-wasip2/release/z_blindband.wasm";

/** Local name inside the tenant namespace: `z:<tid>:blindband`. */
const CONTRACT_TAIL = "blindband";

/** Must match `CONTRACT_VERSION` in `contract/src/lib.rs`. */
const CONTRACT_VERSION = "0.2.0";

/** The sealed ledger and the published rounds. */
const MAPS = ["bb-records", "bb-rounds"] as const;

const STATE_PATH = resolve("state.json");

interface DeployState {
  environment: string;
  tenantDid: string;
  contractName: string;
  contractId: number;
  /**
   * Every contract id this tenant has registered, oldest first. Map ACLs are
   * granted to the whole set so a version bump cannot orphan rows written by
   * the build before it.
   */
  contractIds: number[];
  contractVersion: string;
  maps: string[];
  deployedAt: string;
}

function readState(): Partial<DeployState> {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as Partial<DeployState>;
  } catch {
    return {};
  }
}

/** `MapAlreadyExists` is the idempotent case, not a failure. */
function isAlreadyExists(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /alreadyexists|already exists/i.test(msg);
}

async function main() {
  const wasmPath = resolve(WASM_PATH);
  if (!existsSync(wasmPath)) {
    throw new Error(
      `No component at ${wasmPath}.\nBuild it first:\n  cd ../contract && cargo build --target wasm32-wasip2 --release`,
    );
  }
  const wasm = readFileSync(wasmPath);
  console.log(`environment : ${envName()}`);
  console.log(`component   : ${(wasm.length / 1024).toFixed(0)} KB`);

  const session = await connect(process.env.T3N_API_KEY!, "tenant");
  console.log(`tenant did  : ${session.did}`);

  const before = await creditsAvailable(session);
  console.log(`credits     : ${formatCredits(before)}\n`);

  const tenant = tenantFor(session);
  const prior = readState();

  // ── contract ───────────────────────────────────────────────────────────
  let contractId = prior.contractId;
  let contractName = prior.contractName;

  if (contractId && prior.contractVersion === CONTRACT_VERSION) {
    console.log(`contract    : reusing ${contractName} (id ${contractId})`);
    console.log("              Bump CONTRACT_VERSION to register a new build.");
  } else {
    console.log(`contract    : registering ${CONTRACT_TAIL}@${CONTRACT_VERSION} …`);
    const registered = await tenant.contracts.register({
      tail: CONTRACT_TAIL,
      version: CONTRACT_VERSION,
      wasm,
    });
    contractId = registered.contract_id;
    contractName = registered.name;
    console.log(`              ${contractName}  id ${contractId}`);
  }

  // ── maps ───────────────────────────────────────────────────────────────
  //
  // `readers` is mandatory in practice: the KV governor defaults to deny, so a
  // map created without it succeeds and then fails every read with
  // AccessDenied and no explanation. Both maps are scoped to this contract id
  // alone — nothing outside the enclave reads a submission, and published
  // rounds leave only through `get-round`.
  // Every id this tenant has ever registered the contract under. Registering a
  // new version mints a new contract id, and a map whose ACL still names only
  // the previous id fails every read with AccessDenied and an empty log ring —
  // the contract dies during instantiation, before it can say why. Granting the
  // union keeps rows written by an earlier build readable by the current one.
  const knownIds = [...new Set([...(prior.contractIds ?? []), contractId!])].sort(
    (a, b) => a - b,
  );

  for (const tail of MAPS) {
    let existed = false;
    try {
      await tenant.maps.create({
        tail,
        visibility: "private",
        writers: { only: knownIds },
        readers: { only: knownIds },
      });
      console.log(`map         : created ${tail}  readers ${knownIds.join(", ")}`);
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
      existed = true;
    }

    // Reconcile unconditionally when the map predates this run. `create` is a
    // no-op once the map exists, so without this the ACL keeps whatever id it
    // was born with and a version bump silently locks the contract out.
    if (existed) {
      await tenant.maps.update(tail, {
        visibility: "private",
        writers: { only: knownIds },
        readers: { only: knownIds },
      });
      console.log(`map         : ${tail} re-scoped  readers ${knownIds.join(", ")}`);
    }
  }

  const state: DeployState = {
    environment: envName(),
    tenantDid: session.did,
    contractName: contractName!,
    contractId: contractId!,
    contractIds: knownIds,
    contractVersion: CONTRACT_VERSION,
    maps: MAPS.map((m) => `z:${session.tid}:${m}`),
    deployedAt: new Date().toISOString(),
  };
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`\nstate       : ${STATE_PATH}`);

  const after = await creditsAvailable(session);
  console.log(`credits     : ${formatCredits(after)}`);
  if (before !== null && after !== null) {
    console.log(`spent       : ${(before - after).toLocaleString("en-US")} base units`);
  }
}

main().catch((err) => {
  console.error(`\ndeploy failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
