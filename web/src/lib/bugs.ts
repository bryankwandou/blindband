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
  {
    id: "BB-09",
    kind: "ours",
    title: "state.json was committed, so the first command failed for everyone but us",
    symptom:
      "A clean clone carries `agent/state.json` naming our tenant DID and contract ids 870/871. On someone else's key, `npm run deploy` prints `contract : reusing z:efd91540…:blindband (id 871)` — a namespace that key does not own — registers nothing, and scopes their two maps to `readers: { only: [870, 871] }`. The first `submit` then dies with AccessDenied and an empty log ring.",
    cause:
      "`.gitignore` covered `data/*.json` and `.env` but not `state.json`, and `deploy.ts` trusted whatever the file said without checking it against the tenant it had just connected as.",
    fix: "Untrack `state.json`, and make the deploy compare `state.tenantDid` with the connected DID — foreign state is announced and discarded rather than used. An unparseable state file is now fatal too, which is the deeper fix BB-07 identified and did not make at the time.",
    cost: "Nothing to us, which is exactly the problem: we only found it by cloning our own public repository and reading it as a stranger. It would have failed for every judge, in the most confusing way this platform offers.",
  },
  {
    id: "BB-10",
    kind: "ours",
    title: "The sample data the README tells you to submit was not in the repository",
    symptom:
      "`npm run submit -- data/records.json` is the second command in our own quickstart. A clean clone has no `agent/data/` directory at all.",
    cause:
      "`.gitignore` held `data/*.json` with a `!data/.gitkeep` exception, and `.gitkeep` was never created — so git dropped the directory entirely. The rule was written to keep generated round and receipt files out, and it took the one input file with them.",
    fix: "Ignore the four generated artefacts by name and track `records.json`. The 117 rows are synthetic — nine members named `member-01`…`member-09` — so there is nothing to withhold.",
    cost: "Found in the same pass as BB-09. Between them, the pipeline was reproducible by nobody, while the repository claimed otherwise in three places.",
  },
  {
    id: "BB-11",
    kind: "platform",
    title: "A sandbox tenant cannot provision the delegated agent identity the SDK offers it",
    symptom:
      "`client.createAgent(did, \"blindband-round-runner\")` on a sandbox-claimed tenant returns `RPC Error: organisation has no policy meta`. The method is present and callable; the tier is not.",
    cause:
      "`createAgent` takes an *organisation* DID and requires the caller to be one of its admins. A DID claimed from the community sandbox page is not an organisation and carries no policy metadata, so there is no organisation for the agent to belong to. This is the same tier boundary as BB-01, seen from the other side: the opaque `t3n_key_…` that the flat `invoke()` path wants is precisely what `createAgent` returns.",
    fix: "None available from this tier. Rounds run under the tenant identity, and the agent reports which identity ran a round rather than implying otherwise. `npm run probe:agent` re-runs the check in one call, so whoever inherits this can tell in seconds whether their tier has lifted.",
    cost: "No lost time — but it is the single largest gap between what this is and what an agent on this platform is supposed to be, and it is not closable by writing better code.",
  },
  {
    id: "BB-12",
    kind: "ours",
    title: "The landing page was blank with JavaScript disabled",
    symptom:
      "A crawler, a reader with scripting off, or a screenshot taken before hydration got the header, the footer, and nothing in between. `curl` on the built page shows why: every section ships as `style=\"opacity:0;transform:translateY(14px)\"`.",
    cause:
      "The one entrance animation on the site starts each section at zero opacity and animates it in when it scrolls into view. That initial style is server-rendered, so the page's whole argument — the round, the gates, the verifier — depended on JavaScript running to become visible at all. Nothing in the browser ever showed it, because in a browser the animation always ran.",
    fix: "The animated wrapper carries a `data-reveal` marker and the document head carries a `<noscript>` rule that forces every one of them back to full opacity. The same commit made the light palette a `prefers-color-scheme` media query as well as a JavaScript-set attribute, so a light-configured machine gets a light page before hydration rather than a dark flash or nothing at all.",
    cost: "Found while building the screenshot script, not while using the site — which is the point. Half of the captures came back as an empty gradient, and the flaky tool turned out to be the honest witness.",
  },
];
