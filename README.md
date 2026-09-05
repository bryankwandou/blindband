# Blindband

**Salary benchmarks that survive being checked.**

A consortium of firms wants to know what the market pays for a role. None of
them will hand its payroll to a competitor, and none of them may lawfully swap
current pay figures directly. The usual answer is to mail the data to a survey
vendor and trust a promise.

Blindband replaces the promise with an enclave. Members submit rows that stay
sealed, the aggregation runs inside a Terminal 3 TEE, and a cell is published
only after it clears four gates drawn from antitrust safe-harbour guidance. The
round is then hashed, the digest is bound into the transaction receipt, and the
same digest is written to Solana devnet — so a round cannot be quietly swapped
for a friendlier one after the fact.

- **Live site** — https://blindband.vercel.app (English, Bahasa Indonesia, 中文)
- **Demo video** — https://blindband.vercel.app/demo/blindband-demo.mp4 (63 s, no narration)
- **Mirror** — https://bryankwandou.github.io/blindband, static export of the same commit
- **Anchored round** — [`5uczxVJU…AJE3Hf` on devnet](https://explorer.solana.com/tx/5uczxVJUm4zjwDms6R5eDC9H1G3gypRUuDA1p2B1x14bXP8QCezrFxZLgfRzfGCJLG3HDJ7ubfsWpiZBG4AJE3Hf?cluster=devnet)
- **Digest** — `e4f528ad321626b2daf9b667188937609cd160a21a739d542eabd44a2f40beef`

---

## What actually ran

Round `2026-q1`, on the Terminal 3 sandbox, 4 September 2026. 117 rows from 9
firms. Four cells published, two withheld — and the two failed on *different*
gates, which is the part worth looking at.

| Cell | P10 | Median | P90 | Firms | Top firm |
|---|---:|---:|---:|---:|---:|
| Backend engineer L4 | $8,316 | $9,344 | $10,870 | 9 | 16.00% |
| Backend engineer L5 | $12,184 | $14,627 | $16,282 | 9 | 15.62% |
| Backend engineer L6 | $16,152 | $18,752 | $20,963 | 7 | 18.18% |
| Product designer L4 | $6,788 | $7,981 | $9,208 | 6 | 21.05% |

| Withheld | Reason | Firms / rows |
|---|---|---|
| Data scientist L5 | `contributor_concentration_exceeded` | 5 / 13 |
| Engineering manager M2 | `below_contributor_floor` | 3 / 6 |

## The four gates

Compiled into the contract, named in every published round, and applied before
anything leaves the enclave.

| Gate | Rule |
|---|---|
| Neutral aggregator | No member sees another's rows. The sealed map's ACL names the contract identity and nothing else. |
| Historical data | Effective date at least 91 days old. Anything more recent is dropped and counted in the totals. |
| Contributor floor | At least 5 independent firms and 10 rows per cell. |
| Concentration ceiling | No single firm above 25% of a cell's rows. |

Blindband is engineering, not legal advice. The gates follow published
safe-harbour guidance; whether they fit a particular consortium is a question
for that consortium's counsel.

---

## Checking it yourself, without asking us for anything

There is one command, and it needs no API key, no test credits, no account and
no cooperation from us.

```bash
cd agent && npm install
npm run judge
```

```text
round        : 2026-q1  (blindband-safe-harbour/v1)
submissions  : 117 rows, read from agent/data/records.json
rpc          : https://api.devnet.solana.com

[  ok  ] the gates and the maths, recomputed from the raw submissions
         70 fields agree — 4 cells published, 2 withheld (contributor_concentration_exceeded, below_contributor_floor)

[  ok  ] the digest, recomputed from the published bytes
         1589 bytes hashed → e4f528ad321626b2…2f40beef — the digest the enclave attested

[  ok  ] the digest, read back off Solana devnet
         tx 5uczxVJUm4zj… carries d=e4f528ad321626b2… for round 2026-q1,
         written at slot 492821211 — before you asked, and not by anything of ours

[  ok  ] the negative controls — a verifier that can say no
         one median raised by $0.01 → 843d5cdd8ecf6a87…, rejected
         one salary raised by $1.00 → recomputation diverges, rejected

──────────────────────────────────────────────────────────────────────
4/4 checks passed. The published round is the one the enclave
produced from these submissions, and the chain agrees.
```

The four checks are different in kind on purpose, because passing all four is
much harder to fake than passing any one of them.

1. **The numbers are rederived, not read.** `agent/src/lib/recompute.ts` is a
   second implementation of the four gates and the percentile maths, written
   against `policy.rs` rather than sharing code with it. It folds the 117 raw
   submissions into a round of its own and diffs it against the published one
   field by field — every percentile, every contributor count, both withholding
   reasons. Numbers typed in by hand do not survive this check.
2. **The digest is rehashed from the published bytes**, sliced verbatim out of
   the response, because the hash covers the contract's own encoding rather
   than a reformatted copy of it.
3. **The digest is read back off Solana devnet** through a public RPC endpoint
   we do not run. If this repository vanished tonight, that check would still
   work tomorrow.
4. **Two negative controls.** A round with one median moved by a cent, and a
   submission set with one salary moved by a dollar, must both be rejected — so
   a verifier that only ever says yes gets caught from the outside.

Only the third check needs the internet. To go further:

```bash
cd contract && cargo test    # 23 tests on the gates and the maths — no node, no enclave
cd agent && npm run digest   # just the hash, if that is all you want
npm run probe:agent          # ask the platform whether this tier can hold an agent key
```

Or open https://blindband.vercel.app/en/verify and press the button: the digest
is recomputed in your browser with the Web Crypto API and checked against the
memo on Solana. Nothing of ours is in that loop.

## Running the agent on your own data

The gates are the product. You can put your own rows through them, offline, with
no account, no key, no credits and no network — because the aggregation is plain
Rust in this repository and the enclave is what seals the inputs, not what
computes the answer.

```bash
cd contract
cargo run --example replay -- examples/payroll-sample.csv --round-id demo
```

```text
input        : examples/payroll-sample.csv — 30 rows
round        : demo
evaluated at : 1788589296  (rows effective after 1780726896 are too recent to use)
commitments  : minted locally — this run is yours, not a replay

ingested 30 rows from 5 contributors — 5 too recent, 0 malformed
1 cells published, 2 withheld

PUBLISHED
  cell                     cur          p10    median       p90  firms  top firm
  backend engineer l4      EUR      6916.00   7415.00   8009.00      5    25.00%

WITHHELD
  data scientist l5        contributor_concentration_exceeded     5 firms / 10 rows
  engineering manager m2   below_contributor_floor                3 firms / 3 rows

digest       : 6f327f46c68f7fb9a004b45387cbfc54f38b193552ec0cc8c0aa445bfb9f6e66
```

Every gate fires in that one run, on purpose. The published cell sits at exactly
25.00% — one row either way and it is withheld. The five product designer rows
never reach the maths at all: their pay is effective in 2030, so gate 1 drops
them as too recent to be lawful to pool.

Swap in your own extract and rerun. The header row is all the schema there is:

```text
contributor,role,level,region,currency,base_minor,effective_at
acme,Backend Engineer,L4,EU,EUR,720000,1755000000
```

`base_minor` is minor units — cents — so the maths stays integral. Move a salary,
delete a contributor, change a date, and watch which cells stop being publishable.
That is the whole argument for running the aggregation somewhere neither member
controls, and it is more convincing from the other side of the keyboard.

### Replaying the round that is on chain

The same command can rebuild the *published* round from its own inputs:

```bash
cargo run --example replay -- --replay
```

```text
digest       : e4f528ad321626b2daf9b667188937609cd160a21a739d542eabd44a2f40beef
expected     : e4f528ad321626b2daf9b667188937609cd160a21a739d542eabd44a2f40beef

[  ok  ] this machine derived the digest that is anchored on Solana devnet.
         Same inputs, same code, same answer — no enclave, no key, no network.
```

That closes the loop the other three checks leave open. `npm run judge` shows
the published numbers are internally consistent and that the chain agrees with
them; this shows a laptop with no credentials can take the 117 raw submissions
and *derive* the digest that was written to Solana on 4 September. The enclave
kept the inputs sealed. It did not get a say in the answer.

## Running a round inside the enclave, on your own tenant

The one thing that genuinely needs credentials is the enclave itself, because it
spends credits — yours, not ours. A sandbox tenant is free to claim from
Terminal 3’s community page, and the two free commands come first so that nobody
spends anything to discover their key does not work.

```bash
# 0. build the component
cd contract && cargo build --target wasm32-wasip2 --release

cd ../agent && npm install
cp .env.example .env      # T3N_API_KEY, SOLANA_SEED_HEX

npm run preflight                     # free: does this key reach the platform at all
npm run deploy -- --dry-run           # free: names your tenant, shows the balance,
                                      #       and says what the real deploy would do
npm run deploy                        # register + scope the sealed maps
npm run submit -- data/records.json   # 117 rows, one execution — or your own file
npm run round -- 2026-q1              # aggregate inside the enclave
npm run anchor                        # write the digest to Solana devnet
npm run verify                        # check all of the above
```

Each step refuses to proceed if the previous one left something inconsistent.
`anchor` recomputes the digest locally and will not write to the chain if it
does not match. `verify` runs three tiers of check — offline, on-chain, and
against the enclave — and the last of its three receipt probes is a deliberate
forgery, so a verifier that only ever says yes gets caught.

Run it against `data/records.json` and the enclave should hand back the same
digest the replay above derives on your laptop. Run it against your own extract
and you get a round of your own, anchored under your own signature.

### The site

```bash
cd web && npm install && npm run dev

npm run build         # the Vercel build: a Node server that answers / → /en
npm run build:pages   # a static export in web/out, for GitHub Pages or any
                      # other file host. BB_BASE_PATH sets the subpath.
```

The round file is read off disk at build time, so the bytes your browser hashes
are the bytes the enclave produced. The verifier on `/verify` recomputes the
digest with the Web Crypto API and compares it against the memo on Solana —
nothing of ours is in that loop.

---

## Layout

```
contract/src/model.rs    wire types + ruleset constants
contract/src/stats.rs    percentile maths — pure, unit-tested
contract/src/policy.rs   the four gates + aggregation — pure, unit-tested
contract/src/ledger.rs   the only module that touches the host (wasm32 only)
contract/examples/replay.rs  run the gates on your own CSV, or replay the round

agent/src/deploy.ts      register the component, re-scope the maps
agent/src/submit.ts      batch ingestion
agent/src/round.ts       run the aggregation, write round.json verbatim
agent/src/anchor.ts      verify locally, then anchor on devnet
agent/src/verify.ts      offline + on-chain + enclave checks
agent/src/judge.ts       the same round, checked by a stranger with no credentials
agent/src/lib/recompute.ts  a second implementation of the ruleset, for check 1
agent/data/records.json  the 117 submissions the published round was built from
agent/data/receipts.json the commitments that make an exact replay possible
agent/state.json         the only state outside git, and not in it

web/                     the public site, 3 locales, statically generated
video/                   the demo video, as Remotion compositions
```

The split between `policy.rs`/`stats.rs` and `ledger.rs` is deliberate: the
interesting logic runs under `cargo test` without a node, an enclave, or test
credits. That is what keeps this maintainable by whoever inherits it.

```bash
cd contract && cargo test   # 23 tests, host toolchain, under a second
```

### The video

```bash
cd video && npm install
npm run render        # out/blindband-demo.mp4
```

Every figure in it — the firm count, the bands, the withheld reasons, the
digest, the slot — is read from `web/src/data/`, the same files the site reads.
A caption cannot go stale without the round changing underneath it.

## Host capabilities

```json
{ "host_capabilities": ["kv_store", "logging", "tenant_context"] }
```

No `http` capability is requested. The contract makes no outbound call, so
there is no egress surface to review and nothing to allowlist.

---

## Bugs and platform notes

Twelve write-ups — six platform, six of our own — are on
[the docs page](https://blindband.vercel.app/en/docs), with symptom, cause, fix
and what each one cost. The three that will cost the next person the most time:

1. **The flat `invoke()` path rejects a sandbox-claimed API key.** It expects an
   opaque `t3n_key_…` from org agent provisioning; a community sandbox key is a
   hex secp256k1 key for the SIWE session flow. Use
   `tenant.contracts.execute()` instead.
2. **A KV map's ACL names contract *ids*, and a version bump mints a new one.**
   The contract then dies during instantiation with `AccessDenied` and an
   *empty log ring* — no message to search for. Track every id and re-scope
   with `tenant.maps.update()`.
3. **An execution locks 10,000,000,000 base units** against a 20,000,000,000
   allocation, though a real round settles at ~150,000,000. This rules out the
   obvious per-row API design; batch instead.

The two most recent are ours and were found the only way they could have been:
by cloning this repository from GitHub and running it as a stranger. `state.json`
was committed, so `npm run deploy` would have skipped registration on anyone
else's tenant and scoped their maps to contract ids they do not own (BB-09); and
`data/records.json` — the file the quickstart above tells you to submit — was
caught by a `.gitignore` rule and was not in the repository at all (BB-10).

## Status

The pipeline is real and every number above came out of it. Two things are open
before anyone's actual payroll should go near it: it runs on a sandbox tenant
with test credits, and rounds currently execute under the tenant identity
rather than a delegated agent key — `client.createAgent()` exists and is
callable, but a sandbox-claimed DID is not an organisation with policy
metadata, so it refuses (BB-11). `npm run probe:agent` asks the platform that
question in one call and creates nothing, so anyone can check whether their own
tier has lifted rather than taking our word for it.

The sandbox trust manifest also fails to parse, so attestation cannot currently be verified against that node — the
agent prints that warning rather than hiding it.

## Continuing or handing over

I would like to keep running this and take it toward a real consortium pilot.
If Terminal 3 would rather host it, the handover is small: the repository is
self-contained, `npm run deploy` is idempotent, and the only state outside git
is the tenant DID, the contract ids and the map ACLs — all recorded in
`agent/state.json` and reproducible with a single deploy.

## Licence

MIT.
