/**
 * Lifted verbatim from the site's `globals.css`, for the same reason it is
 * written down there: green and rust are reserved for "published" and
 * "withheld". Nothing decorative may borrow them, or a viewer who learned what
 * rust means in the table will read the wrong thing in the next frame.
 */
export const C = {
  ink: "#0a0b0d",
  raised: "#101216",
  panel: "#14171c",
  line: "#23272e",
  lineBright: "#333943",
  ivory: "#f2f0eb",
  quiet: "#9aa0a8",
  faint: "#666d76",
  signal: "#e8b14c",
  signalDim: "#7d5f28",
  published: "#6fbf9b",
  withheld: "#c4634f",
} as const;

export const FPS = 30;

/** Frame budget per scene. Kept in one place so a scene can be retimed without
 *  hunting for the offsets it shares with its neighbours. */
export const SCENES = {
  hook: 150,
  problem: 180,
  gates: 240,
  terminal: 540,
  result: 300,
  proof: 300,
  cta: 180,
} as const;

export const TOTAL = Object.values(SCENES).reduce((a, b) => a + b, 0);
