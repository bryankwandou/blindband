/**
 * The walkthrough, transcribed from the real terminal.
 *
 * These are the actual lines the five commands printed against the Terminal 3
 * sandbox and Solana devnet on 4 September 2026 — credit balances, contract
 * ids, the transaction signature and all. Nothing is written for effect; where
 * the output is ugly, it is ugly here too, including the attestation warning
 * the SDK prints when the sandbox trust manifest fails to parse.
 *
 * `tone` drives colour only. `ok` and `no` are reserved for a check passing and
 * a cell being withheld, matching the rest of the site.
 */

export type Tone = "cmd" | "dim" | "text" | "ok" | "no" | "warn" | "key";

export interface Line {
  text: string;
  tone: Tone;
}

export interface Step {
  cmd: string;
  caption: string;
  lines: Line[];
}

export const REPLAY: Step[] = [
  {
    cmd: "npm run deploy",
    caption: "Register the contract and scope the sealed maps to it.",
    lines: [
      { text: "environment : sandbox", tone: "dim" },
      { text: "component   : 412 KB", tone: "dim" },
      { text: "tenant did  : did:t3n:efd91540b28ceaccc876f9d1603d3f7f0d91d64d", tone: "dim" },
      { text: "credits     : 20,000,000,000 base units", tone: "dim" },
      { text: "", tone: "text" },
      { text: "contract    : registering blindband@0.2.0 …", tone: "text" },
      { text: "              z:efd91540…d91d64d:blindband  id 871", tone: "key" },
      { text: "map         : bb-records re-scoped  readers 870, 871", tone: "text" },
      { text: "map         : bb-rounds re-scoped  readers 870, 871", tone: "text" },
      { text: "", tone: "text" },
      { text: "state       : agent/state.json", tone: "dim" },
      { text: "spent       : 140,237,779 base units", tone: "dim" },
    ],
  },
  {
    cmd: "npm run submit -- data/records.json",
    caption: "117 rows from 9 firms, sealed in a single execution.",
    lines: [
      { text: "rows        : 117 from 9 contributors", tone: "dim" },
      { text: "round       : 2026-q1", tone: "dim" },
      { text: "", tone: "text" },
      { text: "accepted    : 117", tone: "ok" },
      { text: "rejected    : 0", tone: "text" },
      { text: "receipts    : agent/data/receipts.json", tone: "dim" },
      { text: "sample      : a7498c7bc809d08da5da9046459bbf9482691de7…", tone: "key" },
      { text: "", tone: "text" },
      { text: "spent       : 5,942,102,884 base units", tone: "dim" },
    ],
  },
  {
    cmd: "npm run round -- 2026-q1",
    caption: "The aggregation runs inside the enclave and applies the gates.",
    lines: [
      { text: "ruleset     : blindband-safe-harbour/v1", tone: "dim" },
      { text: "ingested    : 117 rows from 9 contributors", tone: "text" },
      { text: "excluded    : 0 too recent, 0 malformed", tone: "text" },
      { text: "published   : 4 bands", tone: "ok" },
      { text: "withheld    : 2 cells", tone: "no" },
      { text: "", tone: "text" },
      { text: "  backend engineer l5 / sea", tone: "text" },
      { text: "    p10 USD 12,184   p50 USD 14,627   p90 USD 16,282", tone: "key" },
      { text: "    9 contributors, 32 records, top share 15.62%", tone: "dim" },
      { text: "", tone: "text" },
      { text: "  withheld:", tone: "text" },
      {
        text: "    data scientist l5 / sea — contributor_concentration_exceeded",
        tone: "no",
      },
      { text: "    engineering manager m2 / sea — below_contributor_floor", tone: "no" },
      { text: "", tone: "text" },
      {
        text: "digest      : e4f528ad321626b2daf9b667188937609cd160a21a739d542eabd44a2f40beef",
        tone: "key",
      },
      { text: "claims bound: true", tone: "text" },
      { text: "recomputed  : matches", tone: "ok" },
    ],
  },
  {
    cmd: "npm run anchor",
    caption: "The digest goes on chain, where the operator cannot edit it.",
    lines: [
      { text: "bytes hashed  : 1589", tone: "dim" },
      { text: "recomputed    : e4f528ad321626b2daf9b667188937609cd160a2…", tone: "key" },
      { text: "digest        : matches", tone: "ok" },
      { text: "", tone: "text" },
      { text: "signer        : C3otspAauyPNbAx9NA4wkH7P8hxhxhb1dyfqzhSmzaj9", tone: "dim" },
      { text: "balance       : 0.9172 SOL", tone: "dim" },
      { text: "", tone: "text" },
      { text: "anchored", tone: "ok" },
      { text: "signature     : 5uczxVJUm4zjwDms6R5eDC9H1G3gypRUuDA1p2B1x14b…", tone: "key" },
      { text: "slot          : 492821211", tone: "text" },
      { text: "memo bytes    : 157", tone: "dim" },
    ],
  },
  {
    cmd: "npm run verify",
    caption: "Three tiers of trust, checked in order. The last probe is a forgery.",
    lines: [
      { text: "1. offline — digest over the bytes on disk", tone: "text" },
      { text: "[  ok  ] digest e4f528ad321626b2… over 1589 bytes matches", tone: "ok" },
      { text: "", tone: "text" },
      { text: "2. chain — the anchor on Solana devnet", tone: "text" },
      { text: "     slot 492821211, block time 2026-09-04T03:20:44.000Z", tone: "dim" },
      { text: "[  ok  ] on-chain digest matches the round on disk", tone: "ok" },
      { text: "[  ok  ] anchor carries 4 published / 2 withheld", tone: "ok" },
      { text: "", tone: "text" },
      { text: "3. enclave — receipt inclusion, asked of the contract", tone: "text" },
      { text: "[  ok  ] receipt in a published band → included, counted", tone: "ok" },
      { text: "[  ok  ] receipt in a withheld cell → included, not counted", tone: "ok" },
      { text: "[  ok  ] forged commitment → no row carries it", tone: "ok" },
      { text: "", tone: "text" },
      { text: "verdict     : every check passed.", tone: "ok" },
    ],
  },
];
