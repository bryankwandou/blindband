import React from "react";
import { AbsoluteFill } from "remotion";
import { Bg, Eyebrow, mono, useHold, useRise } from "../ui";
import { C, SCENES } from "../theme";
import { gates } from "../data";

const Card: React.FC<{ i: number; g: (typeof gates)[number] }> = ({ i, g }) => (
  <div
    style={{
      ...useRise(18 + i * 14),
      background: C.raised,
      border: `1px solid ${C.line}`,
      borderLeft: `2px solid ${C.signalDim}`,
      borderRadius: 4,
      padding: "28px 32px",
    }}
  >
    <div style={{ fontFamily: mono, fontSize: 20, color: C.signal, letterSpacing: 2 }}>
      GATE {i + 1}
    </div>
    <div style={{ fontSize: 36, fontWeight: 600, color: C.ivory, marginTop: 12 }}>{g.name}</div>
    <div style={{ fontFamily: mono, fontSize: 24, color: C.quiet, marginTop: 10 }}>{g.rule}</div>
  </div>
);

export const Gates: React.FC = () => {
  const hold = useHold(SCENES.gates);
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px", ...hold }}>
        <div style={useRise(0)}>
          <Eyebrow>Four gates, compiled into the contract</Eyebrow>
        </div>
        <div
          style={{
            ...useRise(6),
            fontSize: 44,
            color: C.ivory,
            marginTop: 20,
            marginBottom: 40,
            maxWidth: 1300,
          }}
        >
          A cell is published only after it clears all four, inside the enclave.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {gates.map((g, i) => (
            <Card key={g.name} i={i} g={g} />
          ))}
        </div>
      </AbsoluteFill>
    </Bg>
  );
};
