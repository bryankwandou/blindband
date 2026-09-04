import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { C } from "./theme";

// Latin only, and only the two weights this video uses. The default pulls
// every weight and subset, which is 96 network requests per render.
export const sans = loadInter("normal", {
  subsets: ["latin"],
  weights: ["400", "600"],
}).fontFamily;
export const mono = loadMono("normal", {
  subsets: ["latin"],
  weights: ["400", "600"],
}).fontFamily;

/**
 * Every entrance in this video is the same spring. One vocabulary, applied at
 * different delays — a different move per element is what makes a deck look
 * like a template rather than a film.
 */
export const useRise = (delay: number, distance = 18) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 24 });
  return {
    opacity: s,
    transform: `translateY(${(1 - s) * distance}px)`,
  };
};

/** Holds an element on screen and takes it away again, so nothing pops out on a
 *  hard cut. `out` is measured from the end of the scene. */
export const useHold = (length: number, out = 14) => {
  const frame = useCurrentFrame();
  return {
    opacity: interpolate(frame, [length - out, length], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  };
};

export const Bg: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  // A single very slow drift. It exists so the resting frames are not dead,
  // and it is slow enough that nobody should consciously notice it.
  const x = Math.sin(frame / 320) * 2;
  const y = Math.cos(frame / 400) * 2;
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, fontFamily: sans }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${50 + x}% ${18 + y}%, rgba(232,177,76,0.10), transparent 70%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Rule: React.FC<{ width?: number | string; style?: React.CSSProperties }> = ({
  width = 260,
  style,
}) => (
  <div
    style={{
      width,
      height: 1,
      background: `linear-gradient(90deg, transparent, ${C.lineBright}, transparent)`,
      ...style,
    }}
  />
);

export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.signal,
}) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: 26,
      letterSpacing: 3,
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

/** A typewriter that slices the string. Per-character opacity reads as a
 *  shimmer, not as typing. */
export const useTyped = (text: string, startFrame: number, cps = 34) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Math.floor(((frame - startFrame) / fps) * cps);
  return text.slice(0, Math.max(0, chars));
};
