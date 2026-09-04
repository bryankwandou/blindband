import React from "react";
import { AbsoluteFill } from "remotion";
import { Bg, Eyebrow, mono, useHold, useRise } from "../ui";
import { C, SCENES } from "../theme";
import { bands, withheld } from "../data";

const cell: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 26,
  padding: "13px 0",
};

export const Result: React.FC = () => {
  const hold = useHold(SCENES.result);
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px", ...hold }}>
        <div style={useRise(0)}>
          <Eyebrow>Round 2026-q1</Eyebrow>
        </div>
        <div style={{ height: 26 }} />

        <div style={{ ...useRise(8), display: "grid", gridTemplateColumns: "1.5fr repeat(5, 1fr)" }}>
          <div style={{ ...cell, color: C.published, letterSpacing: 2 }}>PUBLISHED</div>
          {["P10", "MEDIAN", "P90", "FIRMS", "TOP FIRM"].map((h) => (
            <div key={h} style={{ ...cell, color: C.faint, textAlign: "right", letterSpacing: 1 }}>
              {h}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: C.line, marginBottom: 6 }} />

        {bands.map((b, i) => (
          <div
            key={b.cell}
            style={{
              ...useRise(16 + i * 9),
              display: "grid",
              gridTemplateColumns: "1.5fr repeat(5, 1fr)",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ ...cell, color: C.ivory, textTransform: "capitalize" }}>{b.cell}</div>
            <div style={{ ...cell, color: C.quiet, textAlign: "right" }}>{b.p10}</div>
            <div style={{ ...cell, color: C.ivory, textAlign: "right" }}>{b.p50}</div>
            <div style={{ ...cell, color: C.quiet, textAlign: "right" }}>{b.p90}</div>
            <div style={{ ...cell, color: C.quiet, textAlign: "right" }}>{b.firms}</div>
            <div style={{ ...cell, color: C.quiet, textAlign: "right" }}>{b.share}</div>
          </div>
        ))}

        <div style={{ height: 44 }} />

        <div style={{ ...useRise(74), ...cell, color: C.withheld, letterSpacing: 2 }}>WITHHELD</div>
        <div style={{ height: 1, background: C.line, marginBottom: 6 }} />
        {withheld.map((w, i) => (
          <div
            key={w.cell}
            style={{
              ...useRise(82 + i * 10),
              display: "grid",
              gridTemplateColumns: "1.5fr 2fr 1fr",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ ...cell, color: C.ivory, textTransform: "capitalize" }}>{w.cell}</div>
            <div style={{ ...cell, color: C.withheld }}>{w.reason}</div>
            <div style={{ ...cell, color: C.faint, textAlign: "right" }}>
              {w.firms} firms / {w.records} rows
            </div>
          </div>
        ))}

        <div
          style={{
            ...useRise(112),
            fontSize: 34,
            color: C.quiet,
            marginTop: 44,
            maxWidth: 1420,
            lineHeight: 1.4,
          }}
        >
          Both had enough data to compute. The enclave computed them, then declined to emit
          the numbers — <span style={{ color: C.ivory }}>on two different gates.</span>
        </div>
      </AbsoluteFill>
    </Bg>
  );
};
