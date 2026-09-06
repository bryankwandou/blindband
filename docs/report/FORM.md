# The submission form, field by field

Copy each block into the field above it. Two blocks have a placeholder that only
you can fill: the Google Doc link and the tweet link.

---

## Your Submission

```
https://blindband.vercel.app
```

## Tweet Link

Post the six-tweet thread in `SUBMIT.md` §7 first, then paste the URL of tweet 1
here. The field is optional — the brief lists social sharing as a bonus and the
form says you may ignore it — but the thread is written and the bonus is free.

```
<URL of tweet 1>
```

## Email address

```
wall.breaker.king.commander@gmail.com
```

## What is your DID generated from the page?

```
did:t3n:efd91540b28ceaccc876f9d1603d3f7f0d91d64d
```

## Would you want to continue running this / pass it to us to run it?

```
I'd like to keep running it.

The engineering is done and honest — the work left is signing up the first five firms and finding out where the four gates are wrong in practice, which needs an operator rather than a maintainer.

If you'd rather host it, the handover is small: contract, agent and site are one self-contained repository, `npm run deploy` is idempotent and reconciles the map ACLs on every run, and the only state outside git is the tenant DID, the contract ids and the map names — all in agent/state.json and reproducible with a single deploy. Re-pointing at a different tenant is two environment variables.

Happy to talk about the startup programme and the listing page.
```

## Anything Else?

```
Blindband — confidential pay benchmarking inside a Terminal 3 TEE, anchored on Solana.

Report (public Google Doc): <PASTE THE GOOGLE DOC LINK>
Source, MIT: https://github.com/bryankwandou/blindband
Demo video, 63 s, silent, captioned: https://blindband.vercel.app/demo/blindband-demo.mp4
Static mirror of the same commit: https://bryankwandou.github.io/blindband
Anchored round: devnet slot 492821211, digest e4f528ad…a2f40beef

WHAT IT IS
A consortium of firms wants to know what the market pays for a role. None will hand its payroll to a competitor, and none may lawfully swap current pay figures directly. Blindband seals the rows into a Rust WASM contract inside a TEE, aggregates there, and publishes a cell only if it clears four gates drawn from antitrust safe-harbour guidance: a neutral aggregator, data at least 91 days old, at least 5 firms and 10 rows per cell, and no firm above 25% of a cell. The round is then SHA-256'd and the digest anchored on Solana devnet, so a round cannot be quietly swapped for a friendlier one after the fact.

WHAT ACTUALLY RAN
Round 2026-q1 on the sandbox, 4 September 2026. 117 rows from 9 firms in a single execution. 4 cells published, 2 withheld — and the two failed on different gates. Both had enough data to compute; the enclave computed them and then declined to emit the numbers.

YOU CAN CHECK IT WITHOUT ASKING ME FOR ANYTHING
  git clone https://github.com/bryankwandou/blindband && cd blindband/agent
  npm install && npm run judge

Four checks, no key, no credits, no account: the bands recomputed from the raw submissions by a second implementation of the ruleset written against policy.rs and sharing no code with it, the digest rehashed from the published bytes, the digest read back off devnet through a public RPC endpoint I do not run, and two deliberately tampered inputs that must both be rejected before it reports success — because a verifier that only ever says yes looks identical from the outside to one that works.

AND YOU CAN RUN IT, NOT JUST AUDIT IT
  cargo run --example replay -- your-payroll.csv

That puts any CSV through the four gates and prints what it would publish, what it would withhold and why, calling policy::aggregate out of the same crate that was compiled to wasm32-wasip2 and registered as the component. `--replay` rebuilds the published round from its own inputs and derives e4f528ad…beef on a laptop with no credentials. The round is not merely consistent, and not merely witnessed by the chain: it is derivable.

TWELVE BUG WRITE-UPS SHIP WITH IT — six platform, six my own — each with symptom, cause, fix and what it cost, at https://blindband.vercel.app/en/docs

Platform, each with a suggested doc change: invoke() rejecting a sandbox-claimed API key, which is a hex secp256k1 key for the SIWE flow rather than an opaque t3n_key_ token (BB-01); the sandbox trust manifest failing to parse, so attestation cannot be verified against that node (BB-02); map ACLs naming contract ids, so a version bump orphans the maps and the contract dies during instantiation with an empty log ring (BB-03); a map created without `readers` succeeding and then denying every read (BB-04); an execution locking 10,000,000,000 base units against a 20,000,000,000 allocation, which silently rules out the obvious per-row API shape (BB-05); and createAgent() being callable but refusing a sandbox-claimed DID, which is not an organisation and carries no policy metadata (BB-11).

The six that are mine are in the same list at the same weight. Two were found by cloning my own public repository into an empty directory and running it as a stranger: a committed state.json would have made `npm run deploy` skip registration on anyone else's tenant and scope their maps to contract ids they do not own (BB-09), and the sample data my own quickstart tells you to submit had been caught by a .gitignore rule and was not in the repository at all (BB-10). The most recent, BB-12, is that the landing page rendered blank with JavaScript disabled — the entrance animation's initial opacity is server-rendered, so a crawler got the header, the footer and nothing between them.

WHAT IS NOT DONE, STATED PLAINLY
1. It runs on a sandbox tenant with test credits.
2. Rounds execute under the tenant identity, not a delegated agent key. The agent reports which identity ran a round rather than pretending it was the agent. `npm run probe:agent` asks the platform that question in one call and creates nothing, so you can check your own tier rather than taking my word for it.
3. The four gates are evaluated inside a single round, so two rounds compared can leak what one round withheld. If a firm joins or leaves between rounds, the change in a cell is computed from that firm's rows alone. That is the standard differencing attack on repeated aggregates, and a consortium running this quarterly meets it in the second quarter — a real limit on the safe-harbour argument, not a theoretical one. The fix is a fifth gate comparing a cell against the same cell in the previous round and withholding when the contributor set has moved too far; the contract already stores the round history it would need. It is named here, and in the site's FAQ, rather than left for a reviewer to find: a gate that has not been written is not a gate.

BB-02 also means attestation cannot currently be verified against the sandbox node, and every run prints that warning rather than hiding it. None of those three is fixable from my side, and none of them is buried in the report.

The site is in English, Bahasa Indonesia and 中文, with light and dark themes, and the verifier on /verify recomputes the digest in your own browser.
```
