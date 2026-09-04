/**
 * The video reads the same two files the site reads. Nothing here is retyped:
 * if a future round publishes a different set of cells, the frames change with
 * it, and a stale number cannot survive in a caption nobody re-checked.
 */
import roundFile from "../../web/src/data/round.json";
import anchorFile from "../../web/src/data/anchor.json";

export const round = roundFile.round;
export const attestation = roundFile.attestation as Record<string, unknown>;
export const anchor = anchorFile;

export const digest = anchor.payload.d;

const usd = (cents: number) =>
  "$" + Math.round(cents / 100).toLocaleString("en-US");

export const bands = round.bands.map((b) => ({
  cell: `${b.role} ${b.level.toUpperCase()}`,
  p10: usd(b.p10),
  p50: usd(b.p50),
  p90: usd(b.p90),
  firms: b.contributors,
  records: b.records,
  share: (b.top_contributor_share_bps / 100).toFixed(2) + "%",
}));

export const withheld = round.suppressed.map((s) => ({
  cell: `${s.role} ${s.level.toUpperCase()}`,
  reason: s.reason,
  firms: s.contributors,
  records: s.records,
}));

export const totals = round.totals;

export const gates = [
  {
    name: "Neutral aggregator",
    rule: "No member sees another's rows",
    detail: "the map ACL names the contract identity and nothing else",
  },
  {
    name: "Historical data",
    rule: `Effective date ≥ ${Math.round(round.min_data_age_secs / 86400)} days old`,
    detail: "current pay is the thing competitors may not exchange",
  },
  {
    name: "Contributor floor",
    rule: `≥ ${round.min_contributors_per_cell} firms and ≥ ${round.min_records_per_cell} rows per cell`,
    detail: "below this a cell is a mirror, not a market",
  },
  {
    name: "Concentration ceiling",
    rule: `No firm above ${round.max_contributor_share_bps / 100}% of a cell`,
    detail: "or the benchmark is one firm's payroll wearing a hat",
  },
];
