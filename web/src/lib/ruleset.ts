/**
 * The second implementation of the ruleset, as the browser sees it.
 *
 * This is a re-export, not a copy. `agent/src/lib/recompute.ts` is the file
 * `npm run judge` runs, and it is the file this page runs — the same bytes,
 * reached by a relative path out of the web app rather than duplicated into
 * it. A copy would have been easier and would have been worth much less: the
 * claim on this site is that a stranger can recompute the round, and a copy
 * that had quietly drifted from the one the command-line verifier uses would
 * make the two disagree while both said yes.
 *
 * It re-exports rather than being imported directly at each call site so the
 * relative climb out of `web/` appears exactly once.
 *
 * The file it points at has no imports at all — no `node:crypto`, no `fs` — so
 * there is nothing in it that needs a Node runtime. That was true before this
 * page existed; it is what made this possible.
 */
export {
  aggregate,
  mean,
  norm,
  percentile,
  type Band,
  type RawRecord,
  type Recomputed,
  type Ruleset,
  type Suppressed,
} from "../../../agent/src/lib/recompute";
