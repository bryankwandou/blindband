import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/Reveal";
import { BUGS } from "@/lib/bugs";
import { getDictionary, isLocale } from "@/lib/i18n";

const COMMANDS: Array<{ cmd: string; note: string }> = [
  { cmd: "npm run deploy", note: "Registers the component and re-scopes both sealed maps to every contract id this tenant has ever held. Idempotent — a second run costs nothing." },
  { cmd: "npm run submit -- data/records.json", note: "One execution carries the whole file. Rejected rows come back with an index and a reason; accepted rows come back as receipts." },
  { cmd: "npm run round -- 2026-q1", note: "Aggregates inside the enclave, applies the four gates, and writes the response to data/round.json byte for byte." },
  { cmd: "npm run anchor", note: "Recomputes the digest locally first and refuses to write anything if it does not match. Then posts it to Solana devnet as a memo." },
  { cmd: "npm run verify", note: "Offline digest, on-chain anchor, and three receipt probes against the contract — one of them a forgery, so a verifier that only says yes is caught." },
];

const LAYOUT: Array<{ path: string; note: string }> = [
  { path: "contract/src/model.rs", note: "Wire types and the ruleset constants. No host calls." },
  { path: "contract/src/stats.rs", note: "Percentile maths. Pure, unit-tested." },
  { path: "contract/src/policy.rs", note: "The four gates and the aggregation. Pure, unit-tested." },
  { path: "contract/src/ledger.rs", note: "The only module that touches the host. wasm32 only." },
  { path: "agent/src/lib/", note: "Session, invocation, digest and Solana helpers, each with the reasoning for its approach written at the top." },
  { path: "agent/state.json", note: "The only state outside git: tenant DID, contract ids, map names. Reproducible with one deploy." },
  { path: "web/", note: "This site. Reads the round file off disk at build time so the bytes in your browser are the enclave's bytes." },
];

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const d = t.pages.docs;

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
      <Link href={`/${locale}`} className="text-[13px] text-quiet hover:text-ivory">
        ← {d.back}
      </Link>

      <Reveal>
        <h1 className="mt-6 text-[2rem] font-semibold tracking-[-0.025em] text-ivory sm:text-[2.6rem]">
          {d.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.7] text-quiet">{d.lede}</p>
      </Reveal>

      {/* ── running ──────────────────────────────────────────────────────── */}
      <Reveal delay={0.06}>
        <section className="mt-14">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.015em] text-ivory">
            {d.runTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.7] text-quiet">{d.runLede}</p>

          <ol className="mt-6 space-y-px overflow-hidden rounded-xl border border-line bg-line">
            {COMMANDS.map((c, i) => (
              <li key={c.cmd} className="bg-ink-raised p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11.5px] text-faint">0{i + 1}</span>
                  <code className="font-mono text-[13px] text-signal">{c.cmd}</code>
                </div>
                <p className="mt-2 pl-8 text-[13.5px] leading-relaxed text-quiet">{c.note}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* ── layout ───────────────────────────────────────────────────────── */}
      <Reveal delay={0.08}>
        <section className="mt-14">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.015em] text-ivory">
            {d.layoutTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.7] text-quiet">{d.layoutLede}</p>

          <dl className="mt-6 divide-y divide-line border-y border-line">
            {LAYOUT.map((l) => (
              <div key={l.path} className="grid gap-1 py-3.5 sm:grid-cols-[16rem_1fr] sm:gap-6">
                <dt className="font-mono text-[12.5px] text-ivory">{l.path}</dt>
                <dd className="text-[13.5px] leading-relaxed text-quiet">{l.note}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>

      {/* ── bugs ─────────────────────────────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section className="mt-14">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.015em] text-ivory">
            {d.bugsTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.7] text-quiet">{d.bugsLede}</p>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-faint">{d.bugsEnOnly}</p>

          <ul className="mt-6 space-y-3">
            {BUGS.map((b) => (
              <li
                key={b.id}
                className={`rounded-xl border border-line border-l-2 bg-ink-raised p-6 ${
                  b.kind === "platform" ? "border-l-signal" : "border-l-line-bright"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[11.5px] text-faint">{b.id}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.1em] ${
                      b.kind === "platform"
                        ? "border-signal/40 text-signal"
                        : "border-line-bright text-faint"
                    }`}
                  >
                    {b.kind === "platform" ? d.bugPlatform : d.bugOurs}
                  </span>
                </div>
                <h3 className="mt-2.5 text-[16px] font-medium leading-snug text-ivory">{b.title}</h3>

                <dl className="mt-4 space-y-3 text-[13.5px] leading-[1.7]">
                  <Row k={d.bugSymptom} v={b.symptom} mono />
                  <Row k={d.bugCause} v={b.cause} />
                  <Row k={d.bugFix} v={b.fix} />
                  <Row k={d.bugCost} v={b.cost} />
                </dl>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* ── handover ─────────────────────────────────────────────────────── */}
      <Reveal delay={0.12}>
        <section className="mt-14 rounded-xl border border-line bg-ink-raised p-7">
          <h2 className="text-[1.15rem] font-semibold tracking-[-0.01em] text-ivory">
            {d.handoverTitle}
          </h2>
          <p className="mt-3 text-[14.5px] leading-[1.75] text-quiet">{d.handoverBody}</p>
        </section>
      </Reveal>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{k}</dt>
      <dd className={`text-quiet ${mono ? "font-mono text-[12.5px] leading-[1.65]" : ""}`}>{v}</dd>
    </div>
  );
}
