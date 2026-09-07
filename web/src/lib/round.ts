/**
 * The published round, read off disk at build time. Server only.
 *
 * `roundRaw` is the response byte for byte as the enclave returned it. That
 * matters more than it looks: the browser recomputes the digest by hashing the
 * `round` value out of this exact text, and a string that has been through
 * `JSON.parse` and back would hash to something else. So the raw text is what
 * ships, and the parsed object is derived from it for rendering only.
 *
 * Types and formatting live in `format.ts` so client components can use them
 * without dragging `node:fs` into the browser bundle.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Anchor, PublishedRound, SampleReceipt } from "@/lib/format";
import type { RawRecord } from "@/lib/ruleset";

const DATA = join(process.cwd(), "src", "data");

function read(name: string): string {
  return readFileSync(join(DATA, name), "utf8");
}

export const roundRaw: string = read("round.json");
export const published: PublishedRound = JSON.parse(roundRaw) as PublishedRound;
export const anchor: Anchor = JSON.parse(read("anchor.json")) as Anchor;
/**
 * The 117 submissions the published round was built from.
 *
 * Shipped to the browser so the verifier on `/verify` can recompute the bands
 * rather than only rehash the digest. They are synthetic — generated for the
 * demonstration, nine pseudonymous members, no real payroll has been near this
 * — which is the only reason they can be published at all. A real consortium
 * would never expose them, and then an outsider can check the digest and the
 * anchor while each member checks their own receipt. That limit is inherent to
 * the idea, not a shortcut taken here.
 */
export const records = JSON.parse(read("records.json")) as RawRecord[];

export const sampleReceipts: SampleReceipt[] = JSON.parse(
  read("sample-receipts.json"),
) as SampleReceipt[];
