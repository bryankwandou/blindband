import Link from "next/link";
import { notFound } from "next/navigation";

import { BandChart } from "@/components/BandChart";
import { Reveal } from "@/components/Reveal";
import { RoundProof } from "@/components/RoundProof";
import { TerminalReplay } from "@/components/TerminalReplay";
import { Verifier } from "@/components/Verifier";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { anchor, published, roundRaw, sampleReceipts } from "@/lib/round";

const INTL: Record<Locale, string> = { en: "en-US", id: "id-ID", zh: "zh-CN" };
const REPO = "https://github.com/bryankwandou/blindband";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const { round } = published;
  const nf = new Intl.NumberFormat(INTL[locale]);

  const stats = [
    { value: round.totals.cells_published, label: t.hero.stats.published, tone: "text-published" },
    { value: round.totals.cells_suppressed, label: t.hero.stats.withheld, tone: "text-withheld" },
    { value: round.totals.contributors, label: t.hero.stats.contributors, tone: "text-ivory" },
    { value: round.totals.records_ingested, label: t.hero.stats.rows, tone: "text-ivory" },
  ];

  return (
    <>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-x-clip">
        {/* The wash runs up behind the header, which is sticky and transparent
            until the page moves. Clipped at the section's own top edge it drew
            a visible seam under the nav in the light theme — the dark theme hid
            the same bug because the gradient was too faint to see. */}
        <div
          aria-hidden="true"
          className="hero-wash pointer-events-none absolute inset-x-0 -top-24 bottom-0 animate-drift opacity-70"
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
          {/* Claim on the left, the enclave's own output on the right. Below
              the lg breakpoint the card follows the copy rather than being
              dropped — on a phone it is the first thing under the buttons,
              which is where the evidence is most useful. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-14">
          <div>
          <Reveal>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-signal">
              {t.hero.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-5 max-w-3xl text-[2.35rem] font-semibold leading-[1.06] tracking-[-0.028em] text-ivory sm:text-[3.1rem] lg:text-[3.35rem]">
              {t.hero.title}{" "}
              <span className="relative whitespace-nowrap text-signal">
                {t.hero.titleAccent}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-signal/35"
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-7 max-w-2xl text-[16px] leading-[1.72] text-quiet sm:text-[17px]">
              {t.hero.lede}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/round`}
                className="rounded-md bg-fill px-5 py-3 text-[14px] font-medium text-on-fill transition-opacity hover:opacity-90"
              >
                {t.hero.primary}
              </Link>
              <Link
                href={`/${locale}/verify`}
                className="rounded-md border border-line-bright px-5 py-3 text-[14px] text-ivory transition-colors hover:border-signal"
              >
                {t.hero.secondary}
              </Link>
            </div>
          </Reveal>

          </div>

          <Reveal delay={0.2}>
            <RoundProof
              bands={round.bands}
              suppressed={round.suppressed}
              anchor={anchor}
              roundId={round.round_id}
              t={t}
              locale={INTL[locale]}
            />
          </Reveal>
          </div>

          <Reveal delay={0.24}>
            <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className={`text-[2rem] font-semibold tabular-nums leading-none ${s.tone}`}>
                    {nf.format(s.value)}
                  </dd>
                  <p className="mt-2 text-[12.5px] leading-snug text-faint">{s.label}</p>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── problem ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div>
            <Reveal>
              <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
                {t.problem.kicker}
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-4 max-w-2xl text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
                {t.problem.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-2xl text-[15.5px] leading-[1.75] text-quiet">
                {t.problem.body}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <aside className="rounded-xl border-l-2 border-signal bg-ink-raised p-6">
              <p className="text-[14px] leading-[1.7] text-quiet">{t.problem.aside}</p>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ── how it runs ──────────────────────────────────────────────────── */}
      <div className="band">
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
            {t.how.kicker}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 max-w-3xl text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
            {t.how.title}
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <Reveal key={s.kicker} delay={0.06 * i} as="li">
              <div className="h-full bg-ink-raised p-7">
                <p className="font-mono text-[12px] text-signal">{s.kicker}</p>
                <h3 className="mt-3 text-[16.5px] font-medium leading-snug text-ivory">{s.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-quiet">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-[13.5px] leading-relaxed text-faint">{t.how.caption}</p>
        </Reveal>

        <Reveal delay={0.12}>
          <TerminalReplay className="mt-12" />
        </Reveal>
      </section>
      </div>

      {/* ── gates ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <Reveal>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
              {t.gates.kicker}
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
              {t.gates.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-[15.5px] leading-[1.75] text-quiet">{t.gates.lede}</p>
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {t.gates.items.map((g, i) => (
            <Reveal key={g.name} delay={0.05 * i} as="li">
              <div className="group h-full rounded-xl border border-line bg-ink-raised p-6 transition-colors hover:border-line-bright">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[16px] font-medium text-ivory">{g.name}</h3>
                  <span className="shrink-0 font-mono text-[11.5px] text-signal">0{i + 1}</span>
                </div>
                <p className="mt-2 font-mono text-[12.5px] text-signal/85">{g.rule}</p>
                <p className="mt-3.5 text-[14px] leading-[1.7] text-quiet">{g.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-faint">{t.gates.note}</p>
        </Reveal>
      </section>

      {/* ── the round ────────────────────────────────────────────────────── */}
      <div className="band">
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Reveal>
              <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
                {t.round.kicker} · {round.round_id}
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
                {t.round.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-[15.5px] leading-[1.75] text-quiet">{t.round.lede}</p>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <Link
              href={`/${locale}/round`}
              className="text-[13.5px] text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
            >
              {t.round.open} →
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div className="mt-10">
            <BandChart
              bands={round.bands}
              suppressed={round.suppressed}
              t={t}
              locale={INTL[locale]}
            />
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-5 max-w-2xl text-[13.5px] leading-relaxed text-faint">
            {t.round.withheldLede}
          </p>
        </Reveal>
      </section>
      </div>

      {/* ── verification ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <Reveal>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
              {t.verify.kicker}
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
              {t.verify.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-[15.5px] leading-[1.75] text-quiet">{t.verify.lede}</p>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div className="mt-10">
            <Verifier t={t} roundRaw={roundRaw} anchor={anchor} samples={sampleReceipts} />
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-5 max-w-3xl text-[13.5px] leading-relaxed text-faint">
            {t.verify.sampleNote.split("`").map((part, i) =>
              i % 2 === 1 ? (
                <code key={i} className="font-mono text-quiet">
                  {part}
                </code>
              ) : (
                part
              ),
            )}
          </p>
        </Reveal>
      </section>

      {/* ── faq ──────────────────────────────────────────────────────────── */}
      <div className="band">
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
            {t.faq.kicker}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em] text-ivory sm:text-[2.1rem]">
            {t.faq.title}
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {t.faq.items.map((f, i) => (
            <Reveal key={f.q} delay={0.04 * i}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[15.5px] font-medium text-ivory marker:hidden">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-signal transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-[14.5px] leading-[1.75] text-quiet">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      </div>

      {/* ── cta ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-8 sm:pt-24">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-2xl border border-line bg-ink-raised px-7 py-14 text-center sm:px-12">
            <h2 className="relative text-[1.6rem] font-semibold tracking-[-0.02em] text-ivory sm:text-[2rem]">
              {t.cta.title}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[15px] leading-[1.7] text-quiet">
              {t.cta.body}
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md bg-fill px-5 py-3 text-[14px] font-medium text-on-fill transition-opacity hover:opacity-90"
              >
                {t.cta.primary}
              </a>
              <Link
                href={`/${locale}/docs`}
                className="rounded-md border border-line-bright px-5 py-3 text-[14px] text-ivory transition-colors hover:border-signal"
              >
                {t.cta.secondary}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
