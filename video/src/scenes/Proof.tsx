import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Bg, Eyebrow, mono, useHold, useRise } from "../ui";
import { C, SCENES } from "../theme";
import { anchor, digest } from "../data";

const TIERS = [
  {
    n: "1",
    name: "Offline",
    body: "SHA-256 over the exact bytes of the round, recomputed in the visitor's own browser.",
  },
  {
    n: "2",
    name: "On chain",
    body: "The same digest written to Solana devnet as an SPL Memo — an independent timestamp.",
  },
  {
    n: "3",
    name: "Enclave",
    body: "Receipt inclusion, asked of the contract. The third probe is a forgery, on purpose.",
  },
];

/** A browser chrome, so a screenshot reads as a live page rather than as a
 *  slide someone pasted an image into. */
const Frame: React.FC<{ src: string; url: string }> = ({ src, url }) => (
  <div
    style={{
      border: `1px solid ${C.line}`,
      borderRadius: 8,
      overflow: "hidden",
      background: C.raised,
      boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      {[C.line, C.line, C.line].map((_, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: C.lineBright }} />
      ))}
      <div style={{ fontFamily: mono, fontSize: 18, color: C.faint, marginLeft: 12 }}>{url}</div>
    </div>
    <Img src={src} style={{ display: "block", width: "100%" }} />
  </div>
);

export const Proof: React.FC = () => {
  const hold = useHold(SCENES.proof);
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px", ...hold }}>
        <div style={useRise(0)}>
          <Eyebrow>Three tiers of trust — two of them need nothing from us</Eyebrow>
        </div>
        <div style={{ height: 40 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 60, alignItems: "center" }}>
          <div>
            {TIERS.map((t, i) => (
              <div key={t.n} style={{ ...useRise(12 + i * 14), display: "flex", gap: 22, marginBottom: 30 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 26,
                    color: C.signal,
                    border: `1px solid ${C.signalDim}`,
                    borderRadius: 4,
                    width: 46,
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {t.n}
                </div>
                <div>
                  <div style={{ fontSize: 34, fontWeight: 600, color: C.ivory }}>{t.name}</div>
                  <div style={{ fontSize: 26, color: C.quiet, lineHeight: 1.45, marginTop: 6, maxWidth: 640 }}>
                    {t.body}
                  </div>
                </div>
              </div>
            ))}
            <div
              style={{
                ...useRise(66),
                borderTop: `1px solid ${C.line}`,
                paddingTop: 24,
                fontFamily: mono,
                fontSize: 22,
                color: C.faint,
                lineHeight: 1.7,
              }}
            >
              <div>
                digest <span style={{ color: C.signal }}>{digest.slice(0, 32)}…</span>
              </div>
              <div>
                devnet <span style={{ color: C.ivory }}>{anchor.signature.slice(0, 24)}…</span> · slot{" "}
                {anchor.slot.toLocaleString("en-US")}
              </div>
              <div style={{ color: C.published }}>8 of 8 checks passed</div>
            </div>
          </div>
          <div style={useRise(30)}>
            <Frame src={staticFile("shots/08-verifier-match.png")} url="blindband.vercel.app/en/verify" />
          </div>
        </div>
      </AbsoluteFill>
    </Bg>
  );
};
