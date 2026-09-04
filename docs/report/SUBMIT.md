# Submission — paste-ready

Everything the Terminal 3 form asks for, in the order the form asks for it.
The long-form report is [`SUBMISSION.md`](SUBMISSION.md); this file is the copy
deck.

---

## 1. Link to Your Submission

```
https://blindband.vercel.app
```

Public, no login, no analytics wall. Three locales, and the verifier on
`/verify` runs entirely in the visitor's browser. A static mirror of the same
commit is at `https://bryankwandou.github.io/blindband` if the first is ever
down.

## 2. Tweet Link

Paste the URL of tweet 1 of the thread below once it is posted. The thread is
in section 7.

## 3. Email address

```
wall.breaker.king.commander@gmail.com
```

## 4. DID generated from the page

```
did:t3n:efd91540b28ceaccc876f9d1603d3f7f0d91d64d
```

## 5. Would you want to continue running this / pass it to us to run it?

> **I'd like to keep running it.**
>
> The engineering is done and honest — the interesting work left is signing up
> the first five firms and finding out where the four gates are wrong in
> practice, which needs an operator rather than a maintainer.
>
> If you'd rather host it, the handover is small: contract, agent and site are
> one self-contained repository, `npm run deploy` is idempotent and reconciles
> the map ACLs on every run, and the only state outside git is the tenant DID,
> the contract ids and the map names — all in `agent/state.json` and
> reproducible with a single deploy. Re-pointing at a different tenant is two
> environment variables.

## 6. Anything Else?

> **What it is.** A consortium of firms wants to know what the market pays for a
> role. None will hand its payroll to a competitor, and none may lawfully swap
> current pay figures directly. Blindband seals the rows into a Rust WASM
> contract in a Terminal 3 TEE, aggregates there, and publishes a cell only if
> it clears four gates drawn from antitrust safe-harbour guidance — neutral
> aggregator, data at least 91 days old, at least 5 firms and 10 rows, no firm
> above 25% of a cell. The round is then SHA-256'd and the digest anchored on
> Solana devnet, so a round cannot be quietly swapped for a friendlier one.
>
> **What actually ran.** Round `2026-q1` on the sandbox, 4 September 2026. 117
> rows from 9 firms in a single execution. 4 cells published, 2 withheld — and
> the two failed on *different* gates, which is the part worth looking at: both
> had enough data to compute, the enclave computed them, and then declined to
> emit the numbers.
>
> - Demo video, 63 s, silent, captioned — https://blindband.vercel.app/demo/blindband-demo.mp4
> - Full report — https://github.com/bryankwandou/blindband/blob/main/docs/report/SUBMISSION.md
> - Source, MIT — https://github.com/bryankwandou/blindband
> - Anchored round — devnet slot 492821211, digest `e4f528ad…a2f40beef`
> - Static mirror — https://bryankwandou.github.io/blindband
>
> **Eight bug write-ups ship with it** — five platform, three of my own — each
> with symptom, cause, fix and what it cost, on `/en/docs`. The platform ones
> with a suggested doc change: `invoke()` rejecting a sandbox-claimed API key
> (BB-01), the sandbox trust manifest failing to parse so attestation cannot be
> verified (BB-02), map ACLs naming contract *ids* so a version bump orphans the
> maps and the contract dies during instantiation with an empty log ring
> (BB-03), a map created without `readers` succeeding then denying every read
> (BB-04), and an execution locking 10,000,000,000 base units against a
> 20,000,000,000 allocation, which rules out the obvious per-row API shape
> (BB-05).
>
> **What is not done.** It runs on a sandbox tenant with test credits, and
> rounds execute under the tenant identity rather than a delegated agent key —
> the agent reports which identity ran a round rather than pretending. BB-02
> also means attestation cannot currently be verified against the sandbox node;
> every run prints that warning rather than hiding it. None of that is fixable
> from my side, and none of it is hidden in the report.

---

## 7. The X thread

Character counts are of the raw text, spaces included. X shortens every URL to
23 characters, so each of these has more headroom on the platform than the
count suggests.

Add the Terminal 3 handle to tweet 1 or 5 before posting — deliberately left
out here rather than guessed at.

**1/5 — 277 characters**

```
Nine firms wanted a salary benchmark. None would show a competitor its payroll.

Blindband runs the aggregation inside a Terminal 3 TEE, publishes a cell only if it clears four antitrust gates, and writes the round's SHA-256 to Solana.

117 rows. 4 cells published, 2 withheld.
```

**2/5 — 273 characters**

```
The withheld cells are the point.

Data scientist L5 — one firm held too much of it.
Engineering manager M2 — only 3 firms in the cell.

Both had enough data to compute. The enclave computed them, then declined to emit the numbers. Two different gates, firing on their own.
```

**3/5 — 266 characters**

```
Anyone can check the round without asking me.

1. SHA-256 over the published bytes, recomputed in your own browser
2. the same digest, on Solana devnet as an SPL Memo
3. receipt inclusion, asked of the contract — the third probe is a forgery, on purpose

8/8 passed.
```

**4/5 — 259 characters**

```
Eight bug write-ups ship with it, five platform and three mine, with what each cost.

Including the one where a default target in .cargo/config.toml meant cargo test had never actually run — found by executing every command in my own README before publishing.
```

**5/5 — 257 characters**

```
Built on the Terminal 3 ADK. Sixty-three second demo, no narration:
blindband.vercel.app/demo/blindband-demo.mp4

Round, verifier and walkthrough in EN / ID / 中文. Source MIT:
github.com/bryankwandou/blindband

Devnet slot 492821211, digest e4f528ad…f40beef.
```

### If only one tweet is wanted — 270 characters

```
Nine firms wanted a salary benchmark. None would show a competitor its payroll.

Blindband aggregates inside a Terminal 3 TEE, publishes a cell only if it clears four antitrust gates, and writes the round SHA-256 to Solana.

4 published, 2 withheld.
blindband.vercel.app
```

Attach `web/public/demo/poster.png` or the video itself to tweet 1 — the thread
reads muted, and the video has no narration to lose.

---

## 8. Assets already produced

| What | Where |
|---|---|
| Demo video, 1920×1080, 63 s, h264 | `web/public/demo/blindband-demo.mp4`, live at `/demo/blindband-demo.mp4` |
| Video poster / thumbnail | `web/public/demo/poster.png` |
| Video source (Remotion) | `video/` — `npm run render` rebuilds it |
| Screenshots, 11, captured with Playwright | `docs/images/` |
| Long-form report | `docs/report/SUBMISSION.md` |
| Bug write-ups | `web/src/lib/bugs.ts`, rendered at `/en/docs` |
