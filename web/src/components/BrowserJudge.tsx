"use client";

import { useState } from "react";

import { extractRoundJson, sha256Hex } from "@/lib/digest";
import type { Anchor } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { aggregate, diffRound, fieldsCompared, type RawRecord } from "@/lib/ruleset";

/**
 * The four checks `npm run judge` runs, run here instead.
 *
 * The claim this whole project makes is that a stranger can check the round
 * without asking us for anything. That was true and it cost them a clone, a
 * Node install and a command — which is a small price and still a price, and
 * most people who should check a pay benchmark are not going to pay it.
 *
 * So the same four checks run in the visitor's browser, on bytes they
 * downloaded, and the first, second and fourth need no network at all. The
 * ruleset is imported from `@/lib/ruleset` — the identical file the command
 * line imports, not a port of it, so the two cannot drift apart and reach
 * different verdicts about the same round.
 *
 * Check three reaches a public Solana RPC endpoint we do not run. That is the
 * only part of this page that talks to anything, and it is deliberately the
 * part where talking to something is the point: the digest is read back off a
 * chain rather than out of a file we shipped.
 *
 * It runs on a click rather than on load. A page that verifies itself the
 * moment you arrive is asking to be believed about having done so; a button
 * that you press, and that takes a visible moment, is the reader doing the
 * checking.
 */

type Status = "idle" | "running" | "pass" | "fail";

interface Check {
  name: string;
  detail: string;
  ok: boolean;
}

const RPC = "https://api.devnet.solana.com";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export function BrowserJudge({
  t,
  records,
  roundRaw,
  anchor,
}: {
  t: Dictionary;
  records: RawRecord[];
  roundRaw: string;
  anchor: Anchor;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [checks, setChecks] = useState<Check[]>([]);

  async function runAll() {
    setStatus("running");
    setChecks([]);
    const results: Check[] = [];
    const push = (c: Check) => {
      results.push(c);
      setChecks([...results]);
    };

    const published = JSON.parse(roundRaw).round;
    const rules = {
      min_contributors_per_cell: published.min_contributors_per_cell,
      min_records_per_cell: published.min_records_per_cell,
      max_contributor_share_bps: published.max_contributor_share_bps,
      min_data_age_secs: published.min_data_age_secs,
    };

    // ── 1 ── the gates and the maths, from the raw submissions ──────────────
    const mine = aggregate(records, published.generated_at, rules);
    const drift = diffRound(mine, published);
    push({
      name: t.judge.checks.recompute,
      ok: drift.length === 0,
      detail:
        drift.length === 0
          ? t.judge.detail.recompute
              .replace("{fields}", String(fieldsCompared(mine)))
              .replace("{published}", String(mine.bands.length))
              .replace("{withheld}", String(mine.suppressed.length))
          : drift.slice(0, 4).join(" · "),
    });

    // ── 2 ── the digest, from the published bytes ───────────────────────────
    const roundJson = extractRoundJson(roundRaw);
    const digest = await sha256Hex(roundJson);
    const claimed = JSON.parse(roundRaw).attestation.digest;
    push({
      name: t.judge.checks.digest,
      ok: digest === claimed,
      detail: t.judge.detail.digest
        .replace("{bytes}", new TextEncoder().encode(roundJson).length.toLocaleString())
        .replace("{digest}", `${digest.slice(0, 16)}…${digest.slice(-8)}`),
    });

    // ── 3 ── the digest, read back off devnet ───────────────────────────────
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [
            anchor.signature,
            { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
          ],
        }),
      });
      const body = await res.json();
      const instructions = body?.result?.transaction?.message?.instructions ?? [];
      const memo = instructions.find(
        (ix: { programId?: string; parsed?: unknown }) =>
          ix.programId === MEMO_PROGRAM && typeof ix.parsed === "string",
      )?.parsed as string | undefined;

      const onChain = memo ? JSON.parse(memo) : null;
      const ok = !!onChain && onChain.d === digest && onChain.r === published.round_id;
      push({
        name: t.judge.checks.chain,
        ok,
        detail: ok
          ? t.judge.detail.chain
              .replace("{slot}", anchor.slot.toLocaleString())
              .replace("{round}", onChain.r)
          : t.judge.detail.chainMismatch,
      });
    } catch {
      // The other three checks stand without this one, and saying which failed
      // matters: a blocked network is not the same as a round that disagrees.
      push({ name: t.judge.checks.chain, ok: false, detail: t.judge.detail.chainOffline });
    }

    // ── 4 ── the negative controls ──────────────────────────────────────────
    const tamperedRound = roundRaw.replace(/"p50":(\d+)/, (_m, n) => `"p50":${Number(n) + 1}`);
    const tamperedDigest = await sha256Hex(extractRoundJson(tamperedRound));
    const roundRejected = tamperedDigest !== claimed;

    const tamperedRecords = records.map((r, i) =>
      i === 0 ? { ...r, base_minor: r.base_minor + 100 } : r,
    );
    const recordsRejected =
      diffRound(aggregate(tamperedRecords, published.generated_at, rules), published).length > 0;

    push({
      name: t.judge.checks.controls,
      ok: roundRejected && recordsRejected,
      detail: t.judge.detail.controls.replace(
        "{digest}",
        `${tamperedDigest.slice(0, 16)}…`,
      ),
    });

    setStatus(results.every((c) => c.ok) ? "pass" : "fail");
  }

  const passed = checks.filter((c) => c.ok).length;

  return (
    <section className="rounded-xl border border-line bg-ink-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-medium text-ivory">{t.judge.title}</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          {t.judge.kicker}
        </span>
      </div>

      <p className="mt-3 max-w-3xl text-[14px] leading-[1.7] text-quiet">{t.judge.lede}</p>

      <button
        type="button"
        onClick={runAll}
        disabled={status === "running"}
        className="mt-5 rounded-md bg-fill px-4 py-2.5 text-[13.5px] font-medium text-on-fill transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "running" ? t.judge.running : t.judge.run}
      </button>

      {checks.length > 0 && (
        <ol className="mt-6 space-y-3">
          {checks.map((c) => (
            <li key={c.name} className="flex gap-3">
              <span
                className={`mt-[3px] shrink-0 font-mono text-[11px] ${
                  c.ok ? "text-published" : "text-withheld"
                }`}
              >
                {c.ok ? "[ ok ]" : "[fail]"}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] text-ivory">{c.name}</span>
                <span className="mt-0.5 block break-words font-mono text-[12px] leading-relaxed text-faint">
                  {c.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {(status === "pass" || status === "fail") && (
        <p
          className={`mt-6 border-t border-line pt-4 font-mono text-[13px] ${
            status === "pass" ? "text-published" : "text-withheld"
          }`}
        >
          {t.judge.verdict
            .replace("{passed}", String(passed))
            .replace("{total}", String(checks.length))}
        </p>
      )}
    </section>
  );
}
