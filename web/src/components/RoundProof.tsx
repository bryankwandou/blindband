import { money, titleCase, type Anchor, type Band, type Suppressed } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

/**
 * The round, small enough to sit beside the headline.
 *
 * The hero used to be six paragraphs of claim with the evidence a full screen
 * below it, which is the wrong way round for a product whose entire argument is
 * "do not take my word for it". This card puts the enclave's actual output —
 * four medians, two refusals and the digest that is on Solana — above the fold,
 * so the first thing a reader sees is the thing they can check.
 *
 * The withheld rows are not an afterthought here. A benchmarking tool that only
 * ever shows numbers is easy to build and worth nothing; the two rows that say
 * "withheld" are the product, so they render in the same list at the same
 * weight rather than being tucked into a footnote.
 */
export function RoundProof({
  bands,
  suppressed,
  anchor,
  roundId,
  t,
  locale,
}: {
  bands: Band[];
  suppressed: Suppressed[];
  anchor: Anchor;
  roundId: string;
  t: Dictionary;
  locale: string;
}) {
  return (
    <figure className="rounded-xl border border-line bg-ink-raised p-5">
      <figcaption className="flex items-baseline justify-between gap-3 border-b border-line pb-3.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
          {t.hero.proof.label}
        </span>
        <span className="font-mono text-[11px] text-signal">{roundId}</span>
      </figcaption>

      <ul className="divide-y divide-line">
        {bands.map((b) => (
          <li key={`${b.role}-${b.level}`} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 truncate text-[13px] text-quiet">
              {titleCase(b.role)}{" "}
              <span className="text-faint">{b.level.toUpperCase()}</span>
            </span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-ivory">
              {money(b.p50, b.currency, locale)}
            </span>
          </li>
        ))}

        {suppressed.map((s) => (
          <li key={`${s.role}-${s.level}`} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 truncate text-[13px] text-faint">
              {titleCase(s.role)} <span>{s.level.toUpperCase()}</span>
            </span>
            <span className="shrink-0 font-mono text-[11.5px] uppercase tracking-[0.1em] text-withheld">
              {t.hero.proof.withheld}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3.5 border-t border-line pt-3.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
          {t.hero.proof.digest}
        </p>
        <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-quiet">
          {anchor.payload.d}
        </p>
        <a
          href={anchor.explorerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2.5 inline-block font-mono text-[11px] text-signal underline decoration-signal/40 underline-offset-4 transition-colors hover:decoration-signal"
        >
          {t.hero.proof.anchored} ↗
        </a>
      </div>
    </figure>
  );
}
