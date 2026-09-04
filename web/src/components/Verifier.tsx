"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { recomputeRoundDigest } from "@/lib/digest";
import { titleCase, type Anchor, type SampleReceipt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

/**
 * The three checks, in the order a sceptic would run them.
 *
 * They are laid out as one row on purpose. An earlier arrangement put the two
 * interactive cards side by side and pushed the static one below, which meant
 * the page read 01, 03, 02 — a small thing that quietly undermines a page whose
 * entire argument is that the steps follow from each other.
 *
 * Check one hashes the round bytes in the visitor's own browser and compares
 * the result with the digest recorded on Solana. That is the check that
 * matters, and nothing of ours participates in it.
 *
 * Check three is honest about its limits. Asking the enclave whether a
 * commitment is in the ledger costs an execution against a sandbox tenant with
 * a fixed credit allocation, so a public endpoint doing it would be drained by
 * the first crawler that found it. It looks the commitment up in the sample set
 * shipped with the page instead, and the page says so.
 */

export function Verifier({
  t,
  roundRaw,
  anchor,
  samples,
}: {
  t: Dictionary;
  roundRaw: string;
  anchor: Anchor;
  samples: SampleReceipt[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DigestCard t={t} roundRaw={roundRaw} anchor={anchor} />
      <AnchorCard t={t} anchor={anchor} />
      <ReceiptCard t={t} samples={samples} />
    </div>
  );
}

/* ── 01 ─────────────────────────────────────────────────────────────────── */

type State = "idle" | "working" | "match" | "mismatch";

function DigestCard({
  t,
  roundRaw,
  anchor,
}: {
  t: Dictionary;
  roundRaw: string;
  anchor: Anchor;
}) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<{ digest: string; bytes: number } | null>(null);

  async function hashIt() {
    setState("working");
    // Hashing 1.5 KB is instant; the beat exists so the state change is legible
    // rather than a flicker the eye reads as "nothing happened".
    await new Promise((r) => setTimeout(r, 260));
    try {
      const { recomputed, bytesHashed } = await recomputeRoundDigest(roundRaw);
      setResult({ digest: recomputed, bytes: bytesHashed });
      setState(recomputed === anchor.payload.d ? "match" : "mismatch");
    } catch {
      setState("mismatch");
    }
  }

  return (
    <Card step="01" title={t.verify.step1} body={t.verify.step1Body}>
      <div className="mt-5 space-y-3 font-mono text-[11.5px]">
        <Field label="anchored on solana" value={anchor.payload.d} tone="quiet" />
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Field
                label={`computed in your browser · ${result.bytes} bytes`}
                value={result.digest}
                tone={state === "match" ? "ok" : "no"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto pt-6">
        {state === "match" || state === "mismatch" ? (
          <p
            className={`text-[13.5px] font-medium ${
              state === "match" ? "text-published" : "text-withheld"
            }`}
          >
            {state === "match" ? t.verify.match : t.verify.mismatch}
          </p>
        ) : (
          <button
            type="button"
            onClick={hashIt}
            disabled={state === "working"}
            className="rounded-md bg-signal px-4 py-2.5 text-[13.5px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {state === "working" ? t.verify.recomputing : t.verify.recompute}
          </button>
        )}
      </div>
    </Card>
  );
}

/* ── 02 ─────────────────────────────────────────────────────────────────── */

function AnchorCard({ t, anchor }: { t: Dictionary; anchor: Anchor }) {
  return (
    <Card step="02" title={t.verify.step2} body={t.verify.step2Body}>
      <dl className="mt-5 space-y-3 font-mono text-[11.5px]">
        <Field label="slot" value={String(anchor.slot)} tone="quiet" />
        <Field
          label="block time"
          value={`${anchor.anchoredAt.replace("T", " ").slice(0, 19)} UTC`}
          tone="quiet"
        />
        <Field label="signature" value={anchor.signature} tone="quiet" />
      </dl>

      <div className="mt-auto pt-6">
        <a
          href={anchor.explorerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-line-bright px-4 py-2.5 text-[13.5px] text-ivory transition-colors hover:border-signal"
        >
          {t.verify.onChain} ↗
        </a>
      </div>
    </Card>
  );
}

/* ── 03 ─────────────────────────────────────────────────────────────────── */

function ReceiptCard({ t, samples }: { t: Dictionary; samples: SampleReceipt[] }) {
  const [input, setInput] = useState("");
  const [lookup, setLookup] = useState<SampleReceipt | "none" | null>(null);

  function checkReceipt(value: string) {
    const clean = value.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      setLookup("none");
      return;
    }
    setLookup(samples.find((s) => s.commitment === clean) ?? "none");
  }

  return (
    <Card step="03" title={t.verify.step3} body={t.verify.step3Body}>
      <div className="mt-5">
        <label htmlFor="commitment" className="block text-[12.5px] text-faint">
          {t.verify.inputLabel}
        </label>
        <input
          id="commitment"
          value={input}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setInput(e.target.value);
            setLookup(null);
          }}
          placeholder="a7498c7bc809d08d…"
          className="mt-1.5 w-full rounded-md border border-line bg-ink px-3 py-2.5 font-mono text-[12.5px] text-ivory placeholder:text-faint focus:border-signal focus:outline-none"
        />
        <p className="mt-1.5 text-[12px] leading-snug text-faint">{t.verify.inputHint}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => checkReceipt(input)}
          className="rounded-md border border-line-bright px-4 py-2 text-[13.5px] text-ivory transition-colors hover:border-signal"
        >
          {t.verify.check}
        </button>
        <button
          type="button"
          onClick={() => {
            const pick = samples[Math.floor(Math.random() * samples.length)]!;
            setInput(pick.commitment);
            checkReceipt(pick.commitment);
          }}
          className="text-[13px] text-quiet underline decoration-line-bright underline-offset-4 hover:text-ivory"
        >
          {t.verify.tryOne}
        </button>
      </div>

      <div className="mt-auto pt-5">
        <AnimatePresence mode="wait">
          {lookup && (
            <motion.div
              key={lookup === "none" ? "none" : lookup.commitment}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-md border border-line bg-ink p-3.5"
            >
              {lookup === "none" ? (
                <p className="text-[13.5px] leading-snug text-quiet">{t.verify.resultNone}</p>
              ) : (
                <>
                  <p className="font-mono text-[12px] text-faint">
                    {titleCase(lookup.cell.split("|")[0]!)} ·{" "}
                    {lookup.cell.split("|")[1]!.toUpperCase()}
                  </p>
                  <p
                    className={`mt-1 text-[13.5px] leading-snug ${
                      lookup.published ? "text-published" : "text-withheld"
                    }`}
                  >
                    {lookup.published ? t.verify.resultIn : t.verify.resultWithheld}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/* ── shared ─────────────────────────────────────────────────────────────── */

function Card({
  step,
  title,
  body,
  children,
}: {
  step: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-line bg-ink-raised p-6">
      <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-faint">{step}</p>
      <h3 className="mt-2 text-[17px] font-medium leading-snug text-ivory">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-quiet">{body}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "quiet" | "ok" | "no";
}) {
  const colour =
    tone === "ok" ? "text-published" : tone === "no" ? "text-withheld" : "text-quiet";
  return (
    <div>
      <p className="text-faint">{label}</p>
      <p className={`mt-1 break-all leading-relaxed ${colour}`}>{value}</p>
    </div>
  );
}
