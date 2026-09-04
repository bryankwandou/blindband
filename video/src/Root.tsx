import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { FPS, SCENES, TOTAL } from "./theme";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Gates } from "./scenes/Gates";
import { Terminal } from "./scenes/Terminal";
import { Result } from "./scenes/Result";
import { Proof } from "./scenes/Proof";
import { Cta } from "./scenes/Cta";

const ORDER = [
  [SCENES.hook, Hook],
  [SCENES.problem, Problem],
  [SCENES.gates, Gates],
  [SCENES.terminal, Terminal],
  [SCENES.result, Result],
  [SCENES.proof, Proof],
  [SCENES.cta, Cta],
] as const;

const Demo: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0b0d" }}>
      {ORDER.map(([length, Scene], i) => {
        const from = at;
        at += length;
        // Premount so a scene's images and fonts are decoded before its first
        // frame is rendered, rather than on it.
        return (
          <Sequence key={i} from={from} durationInFrames={length} premountFor={FPS}>
            <Scene />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Demo"
    component={Demo}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
