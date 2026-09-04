/**
 * Types and formatting for the published round.
 *
 * Kept apart from `round.ts` on purpose: that module reads the round off disk
 * with `node:fs`, and anything importing it is pinned to the server. The chart
 * and the verifier are client components, so the shapes and the number
 * formatting live here where both sides can reach them.
 */

export interface Band {
  role: string;
  level: string;
  region: string;
  currency: string;
  contributors: number;
  records: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
  top_contributor_share_bps: number;
}

export interface Suppressed {
  role: string;
  level: string;
  region: string;
  contributors: number;
  records: number;
  reason: string;
}

export interface Round {
  round_id: string;
  ruleset: string;
  min_contributors_per_cell: number;
  min_records_per_cell: number;
  max_contributor_share_bps: number;
  min_data_age_secs: number;
  generated_at: number;
  totals: {
    records_ingested: number;
    records_excluded_recent: number;
    records_excluded_malformed: number;
    contributors: number;
    cells_published: number;
    cells_suppressed: number;
  };
  bands: Band[];
  suppressed: Suppressed[];
  inputs_digest: string;
}

export interface PublishedRound {
  round: Round;
  attestation: {
    digest: string;
    ruleset: string;
    claims_digest_set: boolean;
    note: string;
  };
}

export interface Anchor {
  signature: string;
  slot: number;
  explorerUrl: string;
  cluster: string;
  signer: string;
  payload: { p: string; v: number; r: string; d: string; rs: string; pub: number; sup: number };
  anchoredAt: string;
}

export interface SampleReceipt {
  commitment: string;
  round_id: string;
  cell: string;
  published: boolean;
}

/** Minor units are cents. Benchmarks are read at a glance; cents are noise. */
export function money(minor: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function cellKey(x: { role: string; level: string; region: string }): string {
  return `${x.role}|${x.level}|${x.region}`;
}

/** Title-case for display only; the contract's own keys stay lowercase. */
export function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
