import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Bg, mono, useHold, useRise, useTyped } from "../ui";
import { C, SCENES } from "../theme";

type Tone = "dim" | "text" | "ok" | "no" | "key";

const TONE: Record<Tone, string> = {
  dim: C.faint,
  text: C.quiet,
  ok: C.published,
  no: C.withheld,
  key: C.signal,
};

interface Step {
  cmd: string;
  caption: string;
  lines: [string, Tone][];
  frames: number;
}

/**
 * Transcribed from the real terminal on 4 September 2026 — the same lines the
 * walkthrough on the site replays. Trimmed for length, never rewritten: where
 * the output is ugly it is ugly here too.
 */
const STEPS: Step[] = [
  {
    cmd: "npm run deploy",
    caption: "Register the contract, scope the sealed maps to it.",
    frames: 140,
    lines: [
      ["tenant did  : did:t3n:efd91540b28ceaccc876f9d1603d3f7f0d91d64d", "dim"],
      ["component   : 412 KB", "dim"],
      ["contract    : z:efd91540…d91d64d:blindband  id 871", "key"],
      ["map         : bb-records re-scoped  readers 870, 871", "text"],
      ["map         : bb-rounds  re-scoped  readers 870, 871", "text"],
      ["spent       : 140,237,779 base units", "dim"],
    ],
  },
  {
    cmd: "npm run submit -- data/records.json",
    caption: "117 rows from 9 firms, sealed, in a single execution.",
    frames: 120,
    lines: [
      ["rows        : 117 from 9 contributors", "dim"],
      ["accepted    : 117", "ok"],
      ["rejected    : 0", "text"],
      ["sample      : a7498c7bc809d08da5da9046459bbf9482691de7…", "key"],
    ],
  },
  {
    cmd: "npm run round -- 2026-q1",
    caption: "The aggregation runs where nobody can watch it.",
    frames: 280,
    lines: [
      ["ruleset     : blindband-safe-harbour/v1", "dim"],
      ["ingested    : 117 rows from 9 contributors", "text"],
      ["published   : 4 bands", "ok"],
      ["withheld    : 2 cells", "no"],
      ["", "text"],
      ["  backend engineer l5 / sea", "text"],
      ["    p10 USD 12,184   p50 USD 14,627   p90 USD 16,282", "key"],
      ["", "text"],
      ["  data scientist l5      — contributor_concentration_exceeded", "no"],
      ["  engineering manager m2 — below_contributor_floor", "no"],
      ["", "text"],
      ["digest      : e4f528ad321626b2daf9b667188937609cd160a21a739…", "key"],
      ["recomputed  : matches", "ok"],
    ],
  },
];

const Block: React.FC<{ step: Step }> = ({ step }) => {
  const frame = useCurrentFrame();
  const typed = useTyped(step.cmd, 4, 40);
  const cursorOn = Math.floor(frame / 14) % 2 === 0;
  const typingDone = 4 + (step.cmd.length / 40) * 30;
  const perLine = 7;
  const shown = Math.floor((frame - typingDone - 6) / perLine);
  const fade = interpolate(frame, [step.frames - 10, step.frames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center", opacity: fade }}>
      <div style={{ fontSize: 34, color: C.quiet, marginBottom: 26, ...useRise(0) }}>
        {step.caption}
      </div>
      <div
        style={{
          background: C.raised,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          padding: "34px 38px",
          fontFamily: mono,
          fontSize: 27,
          lineHeight: 1.62,
          minHeight: 520,
        }}
      >
        <div style={{ color: C.ivory }}>
          <span style={{ color: C.signal }}>$ </span>
          {typed}
          <span style={{ opacity: cursorOn ? 1 : 0, color: C.signal }}>▌</span>
        </div>
        <div style={{ height: 18 }} />
        {step.lines.map((l, i) => (
          <div
            key={i}
            style={{
              color: TONE[l[1]],
              opacity: i < shown ? 1 : 0,
              minHeight: 44,
              whiteSpace: "pre",
            }}
          >
            {l[0]}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Terminal: React.FC = () => {
  const hold = useHold(SCENES.terminal);
  let at = 0;
  return (
    <Bg>
      <AbsoluteFill style={hold}>
        {STEPS.map((step) => {
          const from = at;
          at += step.frames;
          return (
            <Sequence key={step.cmd} from={from} durationInFrames={step.frames}>
              <Block step={step} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </Bg>
  );
};
