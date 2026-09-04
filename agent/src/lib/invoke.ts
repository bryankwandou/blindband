/**
 * Calling the contract.
 *
 * There are two dispatch paths on this platform and picking the wrong one
 * costs an afternoon, so the reasoning is written down here.
 *
 * `invoke()` — the flat, sessionless path the docs point agents at — expects
 * an opaque `t3n_key_…` token issued by org agent provisioning. A key claimed
 * from the community sandbox page is a hex secp256k1 key for the SIWE session
 * flow, and the node rejects it with `invalid api key: malformed api key
 * token` regardless of what else the request carries. See BUG-03.
 *
 * So everything here goes through the authenticated session instead:
 * `tenant.contracts.execute(tail, { version, functionName, input })`. It costs
 * a handshake per process, which is fine — a round runs once a quarter, not
 * once a second.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import type { TenantClient } from "@terminal3/t3n-sdk";

export interface DeployState {
  environment: string;
  tenantDid: string;
  contractName: string;
  contractId: number;
  contractVersion: string;
  maps: string[];
  deployedAt: string;
}

/** The tail the contract was registered under, inside `z:<tid>:<tail>`. */
export const CONTRACT_TAIL = "blindband";

/** Read what `npm run deploy` wrote, or explain how to produce it. */
export function loadState(): DeployState {
  const path = resolve("state.json");
  if (!existsSync(path)) {
    throw new Error("No state.json. Run `npm run deploy` first.");
  }
  return JSON.parse(readFileSync(path, "utf8")) as DeployState;
}

/** WIT function names, kebab-case exactly as the interface declares them. */
export type ContractFn =
  | "submit-record"
  | "submit-batch"
  | "compute-round"
  | "get-round"
  | "verify-receipt";

/**
 * Invoke one contract function.
 *
 * Returns the parsed body and the exact text it was parsed from. Both matter:
 * the round digest is a hash over the contract's own bytes, and a value that
 * has been through `JSON.parse` and back is not those bytes any more.
 */
export async function callContract<T = unknown>(
  tenant: TenantClient,
  state: DeployState,
  fn: ContractFn,
  input: unknown,
): Promise<{ parsed: T; raw: string }> {
  const response = await tenant.contracts.execute(CONTRACT_TAIL, {
    version: state.contractVersion,
    functionName: fn,
    input,
  });

  const raw = toText(response);
  let parsed: T;
  try {
    parsed = JSON.parse(raw) as T;
  } catch {
    throw new Error(`${fn} returned a body that is not JSON: ${raw.slice(0, 400)}`);
  }
  return { parsed, raw };
}

/**
 * Normalise whatever the node hands back into the contract's own bytes.
 *
 * The response arrives as a string, a byte array, or an object wrapping one of
 * those depending on the path taken. Guessing wrong produces a digest mismatch
 * that reads like a contract bug, so each shape is handled explicitly.
 */
export function toText(response: unknown): string {
  if (typeof response === "string") return response;

  if (response instanceof Uint8Array) {
    return Buffer.from(response).toString("utf8");
  }

  if (Array.isArray(response) && response.every((n) => typeof n === "number")) {
    return Buffer.from(response as number[]).toString("utf8");
  }

  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    const inner = record.output ?? record.result ?? record.response ?? record.data ?? record.value;
    if (inner !== undefined) return toText(inner);
    return JSON.stringify(response);
  }

  throw new Error(`Cannot read the contract response: ${String(response)}`);
}

/**
 * Which identity should run this call.
 *
 * The agent when it has a key of its own, the tenant otherwise. Rounds are
 * meant to run as the agent — that is what the delegation grant is for — but a
 * tenant-run round is still a valid smoke test, and saying which one happened
 * is better than silently pretending.
 */
export function callerKey(): { apiKey: string; who: "agent" | "tenant" } {
  const agent = process.env.T3N_AGENT_API_KEY;
  if (agent && agent.trim()) return { apiKey: agent.trim(), who: "agent" };

  const tenant = process.env.T3N_API_KEY;
  if (!tenant) {
    throw new Error("Neither T3N_AGENT_API_KEY nor T3N_API_KEY is set in .env.");
  }
  return { apiKey: tenant, who: "tenant" };
}
