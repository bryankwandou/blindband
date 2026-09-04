/**
 * T3N session plumbing, in one place.
 *
 * Every script in this package needs the same four steps — load the WASM
 * crypto component, derive the wallet address from the API key, handshake into
 * the enclave, then prove the wallet to get a DID back. Repeating that in five
 * files is how a project becomes unmaintainable, so it lives here.
 */

import {
  T3nClient,
  TenantClient,
  createEthAuthInput,
  eth_get_address,
  fetchTrustedManifest,
  getNodeUrl,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk";

export interface Session {
  t3n: T3nClient;
  /** `did:t3n:<40-hex>` returned by the node, not the one we assumed. */
  did: string;
  /** The 40-hex tail, which is what canonical `z:<tid>:<tail>` names use. */
  tid: string;
  address: string;
}

/** Environment the sandbox claim page hands out. */
export type T3nEnv = "sandbox" | "testnet" | "mainnet";

export function envName(): T3nEnv {
  return (process.env.T3N_ENV as T3nEnv) ?? "sandbox";
}

/**
 * Pin the node's attestation, or fail loudly.
 *
 * The intended path is the operator-signed trust manifest. As of 2026-09-03
 * that path is broken end to end on the sandbox: SDK 5.7.0 requires a
 * non-empty `rtmr1_allowlist` on the manifest, and the node at
 * `cn-api.sg.testnet.t3n.terminal3.io` still serves a v1 manifest that has no
 * such field, so every client construction dies with "manifest is malformed"
 * before a single RPC is attempted. See `docs/report/bugs.md`, BUG-02.
 *
 * The SDK's sanctioned escape hatch is `{ unsafe_trust_server: true }`, which
 * skips attestation verification. That is a real reduction in security, so it
 * is not the default: it takes an explicit `T3N_ALLOW_UNVERIFIED_NODE=true`,
 * it only applies after the proper path has actually failed, and it says so
 * every time. Remove the flag the day the node ships `rtmr1_allowlist`.
 */
async function resolveAnchor() {
  try {
    return await fetchTrustedManifest(envName());
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);

    if (process.env.T3N_ALLOW_UNVERIFIED_NODE !== "true") {
      throw new Error(
        `Could not pin the node's attestation: ${reason}\n` +
          "This is BUG-02 — the sandbox node serves a trust manifest without `rtmr1_allowlist`, " +
          "which SDK 5.7.0 rejects.\nTo proceed against the sandbox anyway, set " +
          "T3N_ALLOW_UNVERIFIED_NODE=true. Never set it against a production node.",
      );
    }

    console.warn(
      `\n  !  Attestation NOT verified — running with unsafe_trust_server.\n` +
        `     Reason: ${reason}\n` +
        `     Allowed by T3N_ALLOW_UNVERIFIED_NODE=true. Sandbox only.\n`,
    );
    return { unsafe_trust_server: true } as const;
  }
}

/**
 * Open an authenticated session for one API key.
 *
 * `label` only shapes the error message. When two identities are in play — a
 * tenant and an agent — a failure that names which one saves a lot of time.
 */
export async function connect(apiKey: string, label: string): Promise<Session> {
  if (!apiKey) {
    throw new Error(
      `No API key for the ${label}. Claim one at https://go.terminal3.io/adk-community and set it in .env.`,
    );
  }

  setEnvironment(envName());

  const wasmComponent = await loadWasmComponent();
  const address = eth_get_address(apiKey);

  const t3n = new T3nClient({
    trustAnchor: await resolveAnchor(),
    wasmComponent,
    handlers: { EthSign: metamask_sign(address, undefined, apiKey) },
  });

  await t3n.handshake();
  const authenticated = await t3n.authenticate(createEthAuthInput(address));

  const did =
    typeof authenticated === "string"
      ? authenticated
      : ((authenticated as { value?: string })?.value ?? "");

  if (!did.startsWith("did:t3n:")) {
    throw new Error(
      `The ${label} authenticated but the node returned an unexpected DID: ${JSON.stringify(authenticated)}`,
    );
  }

  return { t3n, did, tid: did.slice("did:t3n:".length), address };
}

/** A tenant-scoped client for registering contracts and owning maps. */
export function tenantFor(session: Session): TenantClient {
  // `baseUrl` is not optional in practice: `contracts.register` rejects the
  // call with "requires config field(s): baseUrl" without it, even though the
  // type marks it optional and the environment already implies the node.
  const baseUrl = getNodeUrl();

  return new TenantClient({
    environment: envName(),
    endpoint: baseUrl,
    baseUrl,
    t3n: session.t3n,
    tenantDid: session.did,
  });
}

/** The node URL for the configured environment. */
export function nodeUrl(): string {
  setEnvironment(envName());
  return getNodeUrl();
}

/**
 * Credit balance, or `null` when the node does not expose usage for this key.
 *
 * Worth checking before anything expensive: a contract execution locks ten
 * billion base units, and an exhausted allocation fails with
 * `InsufficientCreditError` rather than anything that looks like a code bug.
 */
export async function creditsAvailable(session: Session): Promise<number | null> {
  try {
    const usage = await session.t3n.getUsage();
    const balance = (usage as { balance?: { available?: number | string } })?.balance;
    if (balance?.available === undefined) return null;
    return Number(balance.available);
  } catch {
    return null;
  }
}

/** Format base units as whole T3N tokens for logging. */
export function formatCredits(base: number | null): string {
  if (base === null) return "unknown";
  return `${base.toLocaleString("en-US")} base units`;
}
