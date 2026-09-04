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

const DATA = join(process.cwd(), "src", "data");

function read(name: string): string {
  return readFileSync(join(DATA, name), "utf8");
}

export const roundRaw: string = read("round.json");
export const published: PublishedRound = JSON.parse(roundRaw) as PublishedRound;
export const anchor: Anchor = JSON.parse(read("anchor.json")) as Anchor;
export const sampleReceipts: SampleReceipt[] = JSON.parse(
  read("sample-receipts.json"),
) as SampleReceipt[];
