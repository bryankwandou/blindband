/**
 * An independent second implementation of the ruleset.
 *
 * The contract in `contract/` is the one that ran inside the enclave. This is a
 * deliberate reimplementation of the same gates and the same percentile maths,
 * written against `policy.rs` rather than sharing code with it, so that a reader
 * can hold the raw submissions in one hand and the published round in the other
 * and check that one really produces the other.
 *
 * A single implementation checked against itself proves nothing. Two that
 * disagree localise the disagreement to a cell and a field.
 *
 * It lives under `web/` and the command-line verifier imports it from here,
 * which is the opposite of where it started. The site is deployed from `web/`
 * alone, so a file it reaches out of the repository for does not exist in
 * production — that mistake broke a deploy once. The agent always runs from a
 * full checkout, so it is the one that can afford to reach. `judge.ts` was
 * already reading `web/src/data/round.json` for the same reason.
 *
 * One consequence worth stating: the browser and the CLI run these exact bytes.
 * Not a port of them, not a copy kept in step by a checker. If `npm run judge`
 * and the verifier on `/verify` ever disagreed, it would be about their inputs,
 * never about the rules.
 */

/** `model.rs::norm` — lowercase, collapse runs of whitespace. */
export function norm(s: string): string {
  return s.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

/** `stats.rs::percentile` — linear interpolation, whole-percent p. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (Math.min(p, 100) / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  return Math.round(sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo));
}

/** `stats.rs::mean` — integer mean, rounded half-up, accumulated wide. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((a, b) => a + BigInt(b), 0n);
  const n = BigInt(values.length);
  return Number((total + n / 2n) / n);
}

export interface RawRecord {
  contributor: string;
  role: string;
  level: string;
  region: string;
  currency: string;
  base_minor: number;
  effective_at: number;
}

export interface Band {
  role: string; level: string; region: string; currency: string;
  contributors: number; records: number;
  p10: number; p25: number; p50: number; p75: number; p90: number;
  mean: number; top_contributor_share_bps: number;
}

export interface Suppressed {
  role: string; level: string; region: string;
  contributors: number; records: number; reason: string;
}

export interface Recomputed {
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
}

export interface Ruleset {
  min_contributors_per_cell: number;
  min_records_per_cell: number;
  max_contributor_share_bps: number;
  min_data_age_secs: number;
}

/**
 * `policy.rs::aggregate`. `now` is the round's own `generated_at`, which is
 * what makes the age gate reproducible after the fact.
 */
export function aggregate(records: RawRecord[], now: number, rules: Ruleset): Recomputed {
  const totals = {
    records_ingested: records.length,
    records_excluded_recent: 0,
    records_excluded_malformed: 0,
    contributors: 0,
    cells_published: 0,
    cells_suppressed: 0,
  };

  // Gate 1 — historical data only.
  const ageFloor = now - rules.min_data_age_secs;
  const kept: RawRecord[] = [];
  for (const r of records) {
    if (r.base_minor === 0 || r.currency.trim() === "") {
      totals.records_excluded_malformed++;
      continue;
    }
    if (r.effective_at > ageFloor) {
      totals.records_excluded_recent++;
      continue;
    }
    kept.push(r);
  }

  const cells = new Map<string, RawRecord[]>();
  const contributors = new Set<string>();
  for (const r of kept) {
    contributors.add(r.contributor);
    const key = `${norm(r.role)}|${norm(r.level)}|${norm(r.region)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(r);
    else cells.set(key, [r]);
  }
  totals.contributors = contributors.size;

  const bands: Band[] = [];
  const suppressed: Suppressed[] = [];

  for (const rows of cells.values()) {
    const first = rows[0]!;
    const perContributor = new Map<string, number>();
    for (const r of rows) perContributor.set(r.contributor, (perContributor.get(r.contributor) ?? 0) + 1);

    const cellContributors = perContributor.size;
    const cellRecords = rows.length;
    const withhold = (reason: string) =>
      suppressed.push({
        role: norm(first.role), level: norm(first.level), region: norm(first.region),
        contributors: cellContributors, records: cellRecords, reason,
      });

    // Gate 2 — contributor floor.
    if (cellContributors < rules.min_contributors_per_cell) { withhold("below_contributor_floor"); continue; }
    // Gate 3 — record floor.
    if (cellRecords < rules.min_records_per_cell) { withhold("below_record_floor"); continue; }
    // Gate 4 — concentration ceiling.
    const top = Math.max(...perContributor.values());
    const shareBps = Math.floor((top * 10_000) / cellRecords);
    if (shareBps > rules.max_contributor_share_bps) { withhold("contributor_concentration_exceeded"); continue; }

    const currency = norm(first.currency);
    if (rows.some((r) => norm(r.currency) !== currency)) { withhold("mixed_currency"); continue; }

    const values = rows.map((r) => r.base_minor).sort((a, b) => a - b);
    bands.push({
      role: norm(first.role), level: norm(first.level), region: norm(first.region),
      currency: currency.toUpperCase(),
      contributors: cellContributors, records: cellRecords,
      p10: percentile(values, 10), p25: percentile(values, 25), p50: percentile(values, 50),
      p75: percentile(values, 75), p90: percentile(values, 90),
      mean: mean(values), top_contributor_share_bps: shareBps,
    });
  }

  totals.cells_published = bands.length;
  totals.cells_suppressed = suppressed.length;

  const byCell = (a: { role: string; level: string; region: string }, b: typeof a) =>
    a.role.localeCompare(b.role) || a.level.localeCompare(b.level) || a.region.localeCompare(b.region);
  bands.sort(byCell);
  suppressed.sort(byCell);

  return { totals, bands, suppressed };
}

/**
 * Compare a recomputed round against a published one, field by field.
 *
 * Lifted out of `judge.ts` so the browser and the command line reach the same
 * verdict by the same route. A verifier that agrees with itself in two places
 * because it is one piece of code is worth more than two that agree today.
 *
 * Returns a list of disagreements rather than a boolean. "It does not match" is
 * not a useful answer to give someone checking a payroll benchmark; "product
 * designer L4 p50: published 798098, recomputed 798099" is.
 */
export function diffRound(mine: Recomputed, theirs: any): string[] {
  const problems: string[] = [];

  for (const [k, v] of Object.entries(mine.totals)) {
    if (theirs.totals[k] !== v) {
      problems.push(`totals.${k}: published ${theirs.totals[k]}, recomputed ${v}`);
    }
  }
  if (mine.bands.length !== theirs.bands.length) {
    problems.push(`band count: published ${theirs.bands.length}, recomputed ${mine.bands.length}`);
  }

  for (const band of mine.bands) {
    const cell = `${band.role} ${band.level}`;
    const pub = theirs.bands.find(
      (b: any) => b.role === band.role && b.level === band.level && b.region === band.region,
    );
    if (!pub) {
      problems.push(`${cell}: recomputed as published, but absent from the round`);
      continue;
    }
    for (const [k, v] of Object.entries(band)) {
      if (pub[k] !== v) problems.push(`${cell} ${k}: published ${pub[k]}, recomputed ${v}`);
    }
  }

  for (const s of mine.suppressed) {
    const cell = `${s.role} ${s.level}`;
    const pub = theirs.suppressed.find(
      (x: any) => x.role === s.role && x.level === s.level && x.region === s.region,
    );
    if (!pub) {
      problems.push(`${cell}: recomputed as withheld, but not listed as withheld`);
      continue;
    }
    if (pub.reason !== s.reason) {
      problems.push(`${cell}: withheld as "${pub.reason}", recomputed as "${s.reason}"`);
    }
    if (pub.contributors !== s.contributors) {
      problems.push(`${cell} contributors: published ${pub.contributors}, recomputed ${s.contributors}`);
    }
    if (pub.records !== s.records) {
      problems.push(`${cell} records: published ${pub.records}, recomputed ${s.records}`);
    }
  }

  return problems;
}

/** Fields compared by `diffRound`, for reporting how much agreed. */
export function fieldsCompared(mine: Recomputed): number {
  return mine.bands.length * 13 + mine.suppressed.length * 6 + 6;
}
