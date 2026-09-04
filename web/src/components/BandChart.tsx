"use client";

import { motion, useReducedMotion } from "motion/react";

import { money, titleCase, type Band, type Suppressed } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

/**
 * The published round, drawn on one shared axis.
 *
 * Every band is plotted against the same scale so the levels line up visually —
 * an L6 band that starts where the L5 band ends is the sort of thing a reader
 * should see rather than compute. Withheld cells keep their row and their
 * label, and lose only their numbers. Dropping them from the chart entirely
 * would quietly hide the most interesting thing the enclave did.
 */

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function BandChart({
  bands,
  suppressed,
  t,
  locale,
}: {
  bands: Band[];
  suppressed: Suppressed[];
  t: Dictionary;
  locale: string;
}) {
  const still = useReducedMotion();

  // One axis for everything, with a little headroom so the widest whisker does
  // not touch the edge of its track.
  const max = Math.max(...bands.map((b) => b.p90)) * 1.06;
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="space-y-1">
      {bands.map((b, i) => (
        <div
          key={`${b.role}-${b.level}`}
          className="grid gap-x-6 gap-y-2 border-b border-line px-1 py-5 sm:grid-cols-[minmax(0,15rem)_1fr]"
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ivory">
              {titleCase(b.role)} · {b.level.toUpperCase()}
            </p>
            <p className="mt-0.5 text-[12.5px] text-faint">
              {b.contributors} {t.round.tableContributors.toLowerCase()} · {b.records}{" "}
              {t.round.tableRecords.toLowerCase()} · {t.round.tableShare.toLowerCase()}{" "}
              {(b.top_contributor_share_bps / 100).toFixed(1)}%
            </p>
          </div>

          <div className="min-w-0">
            <div className="relative h-9">
              {/* the axis the whisker sits on */}
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />

              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: pct(b.p10) }}
                initial={still ? false : { width: 0, opacity: 0 }}
                whileInView={{ width: pct(b.p90 - b.p10), opacity: 1 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{ duration: 0.7, delay: 0.06 * i, ease: EASE }}
              >
                {/* p10–p90 whisker */}
                <div className="relative h-[3px] rounded-full bg-signal-dim">
                  {/* p25–p75, where the mass of the market actually is */}
                  <div
                    className="absolute inset-y-0 rounded-full bg-signal"
                    style={{
                      left: `${((b.p25 - b.p10) / (b.p90 - b.p10)) * 100}%`,
                      right: `${((b.p90 - b.p75) / (b.p90 - b.p10)) * 100}%`,
                    }}
                  />
                  {/* median */}
                  <div
                    className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-ivory"
                    style={{ left: `${((b.p50 - b.p10) / (b.p90 - b.p10)) * 100}%` }}
                  />
                </div>
              </motion.div>
            </div>

            <div className="flex items-baseline justify-between font-mono text-[12px] text-faint">
              <span>{money(b.p10, b.currency, locale)}</span>
              <span className="text-[13px] font-medium text-ivory">
                {money(b.p50, b.currency, locale)}
              </span>
              <span>{money(b.p90, b.currency, locale)}</span>
            </div>
          </div>
        </div>
      ))}

      {suppressed.map((s, i) => (
        <div
          key={`${s.role}-${s.level}`}
          className="grid gap-x-6 gap-y-2 border-b border-line px-1 py-5 sm:grid-cols-[minmax(0,15rem)_1fr]"
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-quiet">
              {titleCase(s.role)} · {s.level.toUpperCase()}
            </p>
            <p className="mt-0.5 text-[12.5px] text-faint">
              {s.contributors} {t.round.tableContributors.toLowerCase()} · {s.records}{" "}
              {t.round.tableRecords.toLowerCase()}
            </p>
          </div>

          <div className="min-w-0">
            <div className="relative flex h-9 items-center">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
              <motion.div
                className="relative h-[3px] w-full rounded-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--color-withheld) 0 5px, transparent 5px 11px)",
                }}
                initial={still ? false : { opacity: 0 }}
                whileInView={{ opacity: 0.55 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE }}
              />
            </div>
            <p className="text-[12.5px] leading-snug text-withheld">
              {t.round.reasons[s.reason] ?? s.reason}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
