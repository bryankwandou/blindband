import React from "react";
import { AbsoluteFill } from "remotion";
import { Bg, Rule, mono, useRise } from "../ui";
import { C } from "../theme";

export const Cta: React.FC = () => (
  <Bg>
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          ...useRise(0),
          fontSize: 92,
          fontWeight: 600,
          letterSpacing: -2,
          color: C.ivory,
        }}
      >
        Blindband
      </div>
      <div style={{ ...useRise(8), fontSize: 40, color: C.quiet, marginTop: 14 }}>
        Salary benchmarks that survive being checked.
      </div>
      <Rule width={560} style={{ ...useRise(20), margin: "46px 0 38px" }} />
      <div style={{ ...useRise(26), fontFamily: mono, fontSize: 40, color: C.signal }}>
        blindband.vercel.app
      </div>
      <div
        style={{
          ...useRise(36),
          fontFamily: mono,
          fontSize: 22,
          color: C.faint,
          marginTop: 26,
          lineHeight: 1.8,
        }}
      >
        <div>github.com/bryankwandou/blindband · MIT</div>
        <div>did:t3n:efd91540b28ceaccc876f9d1603d3f7f0d91d64d</div>
      </div>
    </AbsoluteFill>
  </Bg>
);
