import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Reveal } from "@/components/Reveal";
import { money, titleCase } from "@/lib/format";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { anchor, published } from "@/lib/round";

const INTL: Record<Locale, string> = { en: "en-US", id: "id-ID", zh: "zh-CN" };

export default async function RoundPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const { round, attestation } = published;
  const intl = INTL[locale];
  const nf = new Intl.NumberFormat(intl);

  const totals: Array<[string, string]> = [
    ["records ingested", nf.format(round.totals.records_ingested)],
    ["contributors", nf.format(round.totals.contributors)],
    ["excluded, too recent", nf.format(round.totals.records_excluded_recent)],
    ["excluded, malformed", nf.format(round.totals.records_excluded_malformed)],
    ["cells published", nf.format(round.totals.cells_published)],
    ["cells withheld", nf.format(round.totals.cells_suppressed)],
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <Link href={`/${locale}`} className="text-[13px] text-quiet hover:text-ivory">
        ← {t.pages.round.back}
      </Link>

      <Reveal>
        <h1 className="mt-6 text-[2rem] font-semibold tracking-[-0.025em] text-ivory sm:text-[2.6rem]">
          {t.pages.round.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.7] text-quiet">
          {t.pages.round.lede}
        </p>
        <p className="mt-4 font-mono text-[12.5px] text-faint">
          {round.ruleset} · generated{" "}
          {new Date(round.generated_at * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC
        </p>
      </Reveal>

      {/* ── bands ────────────────────────────────────────────────────────── */}
      <Reveal delay={0.06}>
        <div className="mt-12 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-ink-raised">
                <Th>{t.round.tableRole}</Th>
                <Th right>P10</Th>
                <Th right>P25</Th>
                <Th right>P50</Th>
                <Th right>P75</Th>
                <Th right>P90</Th>
                <Th right>{t.round.tableContributors}</Th>
                <Th right>{t.round.tableRecords}</Th>
                <Th right>{t.round.tableShare}</Th>
              </tr>
            </thead>
            <tbody>
              {round.bands.map((b) => (
                <tr key={`${b.role}-${b.level}`} className="border-b border-line last:border-0">
                  <Td>
                    <span className="text-ivory">{titleCase(b.role)}</span>{" "}
                    <span className="text-faint">{b.level.toUpperCase()}</span>
                  </Td>
                  <Td right mono>{money(b.p10, b.currency, intl)}</Td>
                  <Td right mono>{money(b.p25, b.currency, intl)}</Td>
                  <Td right mono strong>{money(b.p50, b.currency, intl)}</Td>
                  <Td right mono>{money(b.p75, b.currency, intl)}</Td>
                  <Td right mono>{money(b.p90, b.currency, intl)}</Td>
                  <Td right mono>{b.contributors}</Td>
                  <Td right mono>{b.records}</Td>
                  <Td right mono>{(b.top_contributor_share_bps / 100).toFixed(2)}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* ── withheld ─────────────────────────────────────────────────────── */}
      <Reveal delay={0.08}>
        <h2 className="mt-14 text-[1.3rem] font-semibold tracking-[-0.015em] text-ivory">
          {t.round.withheldTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.7] text-quiet">
          {t.round.withheldLede}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {round.suppressed.map((s) => (
            <li
              key={`${s.role}-${s.level}`}
              className="rounded-xl border border-line border-l-2 border-l-withheld bg-ink-raised p-5"
            >
              <p className="text-[15px] font-medium text-ivory">
                {titleCase(s.role)} · {s.level.toUpperCase()} · {s.region.toUpperCase()}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-withheld">
                {t.round.reasons[s.reason] ?? s.reason}
              </p>
              <p className="mt-2 font-mono text-[12px] text-faint">
                {s.contributors} / {s.records} · {s.reason}
              </p>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── totals, attestation, anchor ──────────────────────────────────── */}
      <Reveal delay={0.1}>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <Panel title={t.pages.round.totals}>
            <dl className="space-y-2">
              {totals.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 text-[13px]">
                  <dt className="text-faint">{k}</dt>
                  <dd className="font-mono tabular-nums text-quiet">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={t.pages.round.attestation}>
            <Kv k="digest" v={attestation.digest} />
            <Kv k="inputs digest" v={round.inputs_digest} />
            <Kv k="claims bound" v={String(attestation.claims_digest_set)} />
            <p className="mt-3 text-[12.5px] leading-relaxed text-faint">{attestation.note}</p>
          </Panel>

          <Panel title={t.pages.round.anchor}>
            <Kv k="cluster" v={anchor.cluster} />
            <Kv k="slot" v={String(anchor.slot)} />
            <Kv k="signature" v={anchor.signature} />
            <a
              href={anchor.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-block text-[13px] text-signal underline decoration-signal/40 underline-offset-4"
            >
              {t.verify.onChain} ↗
            </a>
          </Panel>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <Link
          href={`/${locale}/verify`}
          className="mt-10 inline-block rounded-md border border-line-bright px-5 py-3 text-[14px] text-ivory transition-colors hover:border-signal"
        >
          {t.verify.open} →
        </Link>
      </Reveal>
    </div>
  );
}

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-faint ${
        right ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  strong,
}: {
  children: ReactNode;
  right?: boolean;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3.5 text-[13.5px] ${right ? "text-right" : ""} ${
        mono ? "font-mono tabular-nums" : ""
      } ${strong ? "text-ivory" : "text-quiet"}`}
    >
      {children}
    </td>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-ink-raised p-6">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[12px] text-faint">{k}</p>
      <p className="mt-0.5 break-all font-mono text-[12px] leading-relaxed text-quiet">{v}</p>
    </div>
  );
}
