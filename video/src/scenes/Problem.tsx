import React from "react";
import { AbsoluteFill } from "remotion";
import { Bg, Eyebrow, Rule, useHold, useRise } from "../ui";
import { C, SCENES } from "../theme";

const Line: React.FC<{ delay: number; children: React.ReactNode; color?: string }> = ({
  delay,
  children,
  color = C.ivory,
}) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: 54,
      lineHeight: 1.32,
      fontWeight: 400,
      color,
      maxWidth: 1300,
    }}
  >
    {children}
  </div>
);

export const Problem: React.FC = () => {
  const hold = useHold(SCENES.problem);
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px", ...hold }}>
        <div style={useRise(0)}>
          <Eyebrow color={C.faint}>The way this is done today</Eyebrow>
        </div>
        <div style={{ height: 34 }} />
        <Line delay={8}>Everyone mails a spreadsheet to a survey vendor.</Line>
        <Line delay={26} color={C.quiet}>
          The vendor promises confidentiality. A PDF arrives months later.
        </Line>
        <Rule width={420} style={{ ...useRise(52), margin: "40px 0" }} />
        <Line delay={62} color={C.signal}>
          A promise is not a control — and competition law asks for a control.
        </Line>
      </AbsoluteFill>
    </Bg>
  );
};
