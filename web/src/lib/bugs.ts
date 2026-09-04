/**
 * What broke, and what it cost.
 *
 * Written in English regardless of the reader's locale, on purpose: these are
 * meant to be forwarded to Terminal 3 verbatim, and a translated error string
 * is not searchable against their logs.
 *
 * `kind` separates the two honest categories. "platform" is something the SDK
 * or the node did that a reasonable developer would not predict from the docs.
 * "ours" is a mistake in this repository that took long enough to find that
 * writing it down seems more useful than quietly fixing it.
 */

export interface BugNote {
  id: string;
  kind: "platform" | "ours";
  title: string;
  symptom: string;
  cause: string;
  fix: string;
  cost: string;
}

export const BUGS: BugNote[] = [
  {
    id: "BB-01",
    kind: "platform",
    title: "The flat invoke() path rejects a sandbox-claimed API key",
    symptom:
      "`invalid api key: malformed api key token`, returned for every request, regardless of body or headers.",
    cause:
      "`invoke()` expects an opaque `t3n_key_…` token issued by organisation agent provisioning. A key claimed from the community sandbox page is a hex secp256k1 key intended for the SIWE session flow. The two are not interchangeable, and the error names neither.",
    fix: "Use the authenticated session instead: `tenant.contracts.execute(tail, { version, functionName, input })`. It costs one handshake per process, which is irrelevant for a round that runs quarterly.",
    cost: "Roughly half a day, most of it spent assuming the request body was wrong.",
  },
  {
    id: "BB-02",
    kind: "platform",
    title: "The sandbox trust manifest does not parse, so attestation cannot be verified",
    symptom:
      "`Trust manifest at https://cn-api.sg.testnet.t3n.terminal3.io/api/trust-manifest is malformed.` The SDK then refuses to proceed unless `T3N_ALLOW_UNVERIFIED_NODE=true` is set.",
    cause:
      "The manifest served by the sandbox control node is not in the shape the SDK expects. The SDK's behaviour is correct — it declines to trust a node it cannot attest.",
    fix: "None available from the client side. Every run on the sandbox therefore carries an `unsafe_trust_server` warning, which the agent prints rather than suppresses.",
    cost: "Not blocking, but it undercuts the demo: the one property a TEE platform sells is the property that cannot currently be checked on its own sandbox.",
  },
  {
    id: "BB-03",
    kind: "platform",
    title: "A KV map's ACL names contract ids, and a version bump mints a new one",
    symptom:
      "After registering v0.2.0, every read failed with `kv_store.get on 'z:…:bb-rounds' read denied: access denied: TenantContract(did:t3n:…/871) cannot read map` — and the log ring came back empty, because the contract dies during instantiation before it can log anything.",
    cause:
      "The maps were created with `readers: { only: [870] }`, the id of the previous build. Registering a new version produces a new contract id, and the old ACL does not follow it.",
    fix: "Track every id the tenant has registered in `state.json` and re-scope both maps to the union with `tenant.maps.update()` on each deploy. The method exists in the SDK but is not mentioned in the KV maps guide.",
    cost: "The longest single block of the build. The empty log ring is what made it expensive — the failure gives you nothing to search for.",
  },
  {
    id: "BB-04",
    kind: "platform",
    title: "A map created without `readers` succeeds, then denies every read",
    symptom: "`create` returns cleanly. Every subsequent `kv_store.get` fails with AccessDenied.",
    cause: "The KV governor defaults to deny. An omitted `readers` set is not an open map, it is a closed one.",
    fix: "Always pass `readers` and `writers` explicitly at creation. Worth a line in the docs, since the failure surfaces far from the call that caused it.",
    cost: "An hour, and it would have been more without BB-03 already teaching us to suspect the ACL.",
  },
  {
    id: "BB-05",
    kind: "platform",
    title: "An execution locks half the sandbox allocation regardless of what it spends",
    symptom:
      "A sandbox allocation is 20,000,000,000 base units. Each contract execution locks 10,000,000,000 while it runs, though a real round settles at roughly 100–180,000,000.",
    cause: "The lock is a worst-case reservation, not a charge. It is released on completion.",
    fix: "Batch aggressively. Submitting 117 rows one call at a time would need 117 executions; `submit-batch` does it in one for 5.9B. The constraint shaped the contract's interface, which is worth saying out loud in the docs.",
    cost: "No lost time, but it silently rules out the obvious per-row API design.",
  },
  {
    id: "BB-06",
    kind: "ours",
    title: "The verifier could not read the anchor it had just written",
    symptom: "`Memo on 5uczxVJU… is not a Blindband anchor.` — reported against a transaction that was, in fact, a Blindband anchor.",
    cause:
      'SPL Memo v2 echoes the payload into the program log as a JSON *string literal*: `Memo (len 157): "{\\"p\\":\\"blindband\\"…}"`. Slicing between the outer quotes yields text with the escapes still in it, which fails to parse.',
    fix: "Read the decoded instruction data from `getParsedTransaction` instead of the log echo, and unescape properly in the fallback path. The instruction data is the committed bytes; the log is a convenience.",
    cost: "An hour, and a genuinely alarming few minutes in which the tool appeared to be reporting tampering.",
  },
  {
    id: "BB-07",
    kind: "ours",
    title: "A byte-order mark in state.json silently re-registered the contract",
    symptom: "`contract version invalid: version 0.2.0 is not higher than current version 0.2.0`.",
    cause:
      "`readState()` caught the JSON parse failure and returned `{}`, so the deploy believed nothing had been registered yet. The parse failed because the file had been rewritten from PowerShell, which adds a UTF-8 BOM by default.",
    fix: "Write the file BOM-free. The deeper fix is that a state file which fails to parse should stop the deploy rather than being treated as an empty state.",
    cost: "Half an hour of doubting the platform for something local.",
  },
  {
    id: "BB-08",
    kind: "ours",
    title: "A default build target in .cargo/config.toml made cargo test impossible",
    symptom:
      "`cargo test` compiled everything, then died with `could not execute process … z_blindband-….wasm` / `%1 is not a valid Win32 application. (os error 193)`.",
    cause:
      "`.cargo/config.toml` set `[build] target = \"wasm32-wasip2\"` so the component build could be typed more briefly. That default applies to `cargo test` too: cargo built the test harnesses as wasm and then tried to execute them as native binaries.",
    fix: "Delete the default target and name it on the one command that needs it — `cargo build --target wasm32-wasip2 --release`, which is what the deploy script already looked for. Plain `cargo test` now runs the 23 host tests.",
    cost: "Small in minutes, large in consequence: the repository claimed the gates were covered by a command that did not run. Found by actually running every command in our own documentation before publishing.",
  },
];
