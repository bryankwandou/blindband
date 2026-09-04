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

## Running a round

```bash
# 0. build the component
cd contract && cargo build --target wasm32-wasip2 --release

cd ../agent && npm install
cp .env.example .env      # T3N_API_KEY, SOLANA_SEED_HEX

npm run deploy                        # register + scope the sealed maps
npm run submit -- data/records.json   # 117 rows, one execution
npm run round -- 2026-q1              # aggregate inside the enclave
npm run anchor                        # write the digest to Solana devnet
npm run verify                        # check all of the above
```

Each step refuses to proceed if the previous one left something inconsistent.
`anchor` recomputes the digest locally and will not write to the chain if it
does not match. `verify` runs three tiers of check — offline, on-chain, and
against the enclave — and the last of its three receipt probes is a deliberate
forgery, so a verifier that only ever says yes gets caught.

### The site

```bash
cd web && npm install && npm run dev
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

agent/src/deploy.ts      register the component, re-scope the maps
agent/src/submit.ts      batch ingestion
agent/src/round.ts       run the aggregation, write round.json verbatim
agent/src/anchor.ts      verify locally, then anchor on devnet
agent/src/verify.ts      offline + on-chain + enclave checks
agent/state.json         the only state outside git

web/                     the public site, 3 locales, statically generated
```

The split between `policy.rs`/`stats.rs` and `ledger.rs` is deliberate: the
interesting logic runs under `cargo test` without a node, an enclave, or test
credits. That is what keeps this maintainable by whoever inherits it.

```bash
cd contract && cargo test   # 23 tests, host toolchain, under a second
```

## Host capabilities

```json
{ "host_capabilities": ["kv_store", "logging", "tenant_context"] }
```

No `http` capability is requested. The contract makes no outbound call, so
there is no egress surface to review and nothing to allowlist.

---

## Bugs and platform notes

Eight write-ups — five platform, three of our own — are on
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

## Status

The pipeline is real and every number above came out of it. Two things are open
before anyone's actual payroll should go near it: it runs on a sandbox tenant
with test credits, and rounds currently execute under the tenant identity
rather than a delegated agent key. The sandbox trust manifest also fails to
parse, so attestation cannot currently be verified against that node — the
agent prints that warning rather than hiding it.

## Continuing or handing over

I would like to keep running this and take it toward a real consortium pilot.
If Terminal 3 would rather host it, the handover is small: the repository is
self-contained, `npm run deploy` is idempotent, and the only state outside git
is the tenant DID, the contract ids and the map ACLs — all recorded in
`agent/state.json` and reproducible with a single deploy.

## Licence

MIT.
