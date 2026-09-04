"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { REPLAY, type Tone } from "@/lib/replay";

/**
 * The walkthrough: the five commands, replayed at reading speed.
 *
 * A screen recording would have been quicker to make and worse to use — it
 * cannot be paused on the line you care about, the text cannot be selected, and
 * it goes stale the moment an output string changes. This plays the real
 * transcript instead, keeps every previous step on screen, and lets a reader
 * jump straight to the step they came for.
 *
 * It stops when scrolled out of view, so a tab left open in the background is
 * not running a timer forever.
 */

const TONE: Record<Tone, string> = {
  cmd: "text-ivory",
  dim: "text-faint",
  text: "text-quiet",
  ok: "text-published",
  no: "text-withheld",
  warn: "text-signal",
  key: "text-signal",
};

/** Lines land at a steady pace; blank lines pass almost instantly. */
const LINE_MS = 105;
const BLANK_MS = 34;
const STEP_PAUSE_MS = 900;

export function TerminalReplay({ className = "" }: { className?: string }) {
  const still = useReducedMotion();
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  const total = REPLAY[step]!.lines.length;
  const done = step === REPLAY.length - 1 && shown >= total;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reduced motion gets the finished transcript, not a slower animation.
  useEffect(() => {
    if (still) setShown(REPLAY[step]!.lines.length);
  }, [still, step]);

  useEffect(() => {
    if (still || !playing || !visible || done) return;

    if (shown >= total) {
      const t = setTimeout(() => {
        setStep((s) => Math.min(s + 1, REPLAY.length - 1));
        setShown(0);
      }, STEP_PAUSE_MS);
      return () => clearTimeout(t);
    }

    const blank = REPLAY[step]!.lines[shown]!.text === "";
    const t = setTimeout(() => setShown((n) => n + 1), blank ? BLANK_MS : LINE_MS);
    return () => clearTimeout(t);
  }, [still, playing, visible, done, shown, total, step]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, step]);

  const jump = useCallback((i: number) => {
    setStep(i);
    setShown(0);
    setPlaying(true);
  }, []);

  const restart = useCallback(() => jump(0), [jump]);
  const current = REPLAY[step]!;

  return (
    <div
      ref={frame}
      data-walkthrough=""
      className={`overflow-hidden rounded-xl border border-line bg-ink-raised ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-line-bright" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-bright" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-bright" />
        </div>
        <p className="truncate font-mono text-[12px] text-faint">blindband/agent</p>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => (done ? restart() : setPlaying((p) => !p))}
            className="text-[12px] text-quiet transition-colors hover:text-ivory"
          >
            {done ? "Replay" : playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2">
        {REPLAY.map((s, i) => (
          <button
            key={s.cmd}
            type="button"
            onClick={() => jump(i)}
            aria-current={i === step ? "step" : undefined}
            className={`shrink-0 rounded px-2.5 py-1 font-mono text-[11.5px] transition-colors ${
              i === step ? "bg-line text-ivory" : "text-faint hover:text-quiet"
            }`}
          >
            {i + 1}. {s.cmd.replace("npm run ", "").split(" ")[0]}
          </button>
        ))}
      </nav>

      <div ref={scroller} className="h-[19rem] overflow-y-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.65] sm:text-[13px]">
        <p className="text-ivory">
          <span className="mr-2 select-none text-signal">$</span>
          {current.cmd}
        </p>
        <div className="mt-1.5 space-y-0">
          {current.lines.slice(0, shown).map((l, i) => (
            <motion.p
              key={`${step}-${i}`}
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.14 }}
              className={`whitespace-pre-wrap break-words ${TONE[l.tone]}`}
            >
              {l.text === "" ? " " : l.text}
            </motion.p>
          ))}
        </div>

        <AnimatePresence>
          {!done && shown < total && (
            <motion.span
              exit={{ opacity: 0 }}
              className="inline-block h-[1.05em] w-[0.55em] translate-y-[0.15em] bg-signal animate-blink"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </div>

      <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-faint">{current.caption}</p>
    </div>
  );
}
