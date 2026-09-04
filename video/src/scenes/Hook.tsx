import React from "react";
import { AbsoluteFill } from "remotion";
import { Bg, Eyebrow, Rule, mono, useHold, useRise } from "../ui";
import { C, SCENES } from "../theme";
import { totals } from "../data";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const Hook: React.FC = () => {
  const hold = useHold(SCENES.hook);
  // Spelled out because a sentence should not open on a numeral, but still
  // taken from the round rather than typed in.
  const word = WORDS[totals.contributors] ?? String(totals.contributors);
  const firms = word[0].toUpperCase() + word.slice(1);
  return (
    <Bg>
      <AbsoluteFill
        style={{ justifyContent: "center", padding: "0 140px", ...hold }}
      >
        <div style={useRise(0)}>
          <Eyebrow>Blindband</Eyebrow>
        </div>
        <div
          style={{
            ...useRise(10),
            fontSize: 76,
            lineHeight: 1.12,
            fontWeight: 600,
            letterSpacing: -1.5,
            color: C.ivory,
            marginTop: 28,
            maxWidth: 1560,
          }}
        >
          {firms} firms share one salary benchmark.
        </div>
        <div
          style={{
            ...useRise(22),
            fontSize: 76,
            lineHeight: 1.12,
            fontWeight: 600,
            letterSpacing: -1.5,
            color: C.signal,
            maxWidth: 1560,
          }}
        >
          None of them saw a competitor's payroll.
        </div>
        <Rule width={520} style={{ ...useRise(38), margin: "44px 0 28px" }} />
        <div
          style={{
            ...useRise(46),
            fontFamily: mono,
            fontSize: 28,
            color: C.quiet,
            letterSpacing: 0.5,
          }}
        >
          {totals.records_ingested} sealed rows · a Terminal 3 TEE · anchored on Solana
        </div>
      </AbsoluteFill>
    </Bg>
  );
};
