/**
 * Independent verification of a round digest.
 *
 * The contract hashes `serde_json::to_vec(&round)` — the compact encoding of
 * the `round` field alone, not the whole `PublishedRound` envelope. To check
 * that hash without trusting the contract, a verifier has to hash the same
 * bytes, which means slicing them out of the response verbatim rather than
 * parsing and re-serialising. A round trip through `JSON.parse` would be
 * subtly wrong: number formatting and key order are not guaranteed to survive.
 *
 * So this module does one narrow thing — find where the `round` value starts
 * and ends inside the raw response, and hash that byte range.
 */

import { createHash } from "node:crypto";

/**
 * Return the exact substring holding the value of the top-level `round` key.
 *
 * Scans with a depth counter that respects JSON string literals and escapes,
 * so a brace inside a role name cannot throw off the balance.
 */
export function extractRoundJson(raw: string): string {
  const key = '"round":';
  const keyAt = raw.indexOf(key);
  if (keyAt < 0) {
    throw new Error("Response has no top-level `round` field.");
  }

  let i = keyAt + key.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i++;
  if (raw[i] !== "{") {
    throw new Error("The `round` field is not an object.");
  }

  const start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < raw.length; i++) {
    const ch = raw[i]!;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  throw new Error("The `round` object is not closed — the response is truncated.");
}

/** Hex SHA-256 over a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export interface DigestCheck {
  ok: boolean;
  claimed: string;
  recomputed: string;
  bytesHashed: number;
}

/**
 * Recompute the digest of a published round and compare it with the digest the
 * attestation claims.
 *
 * `raw` must be the response exactly as it came off the wire. Reformatted JSON
 * will not match, and that is the point: the check is over bytes, not shape.
 */
export function checkRoundDigest(raw: string): DigestCheck {
  const parsed = JSON.parse(raw) as { attestation?: { digest?: string } };
  const claimed = parsed?.attestation?.digest;
  if (typeof claimed !== "string") {
    throw new Error("Response carries no attestation digest to check against.");
  }

  const roundJson = extractRoundJson(raw);
  const recomputed = sha256Hex(roundJson);

  return {
    ok: recomputed === claimed,
    claimed,
    recomputed,
    bytesHashed: Buffer.byteLength(roundJson, "utf8"),
  };
}
