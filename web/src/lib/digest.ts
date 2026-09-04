/**
 * The verification the browser does for itself.
 *
 * This is a deliberate duplicate of the agent's `lib/digest.ts`. Sharing one
 * copy across a Node CLI and a browser bundle would mean a build step whose
 * only job is to reassure people, and the point of the exercise is that a
 * reader can open this file and see the whole check in forty lines.
 *
 * No Node imports here — it has to run in the visitor's browser, on bytes they
 * downloaded, with nothing of ours in the loop.
 */

/** The exact substring holding the value of the top-level `round` key. */
export function extractRoundJson(raw: string): string {
  const key = '"round":';
  const keyAt = raw.indexOf(key);
  if (keyAt < 0) throw new Error("Response has no top-level `round` field.");

  let i = keyAt + key.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i++;
  if (raw[i] !== "{") throw new Error("The `round` field is not an object.");

  const start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < raw.length; i++) {
    const ch = raw[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return raw.slice(start, i + 1);
  }
  throw new Error("The `round` object is not closed — the response is truncated.");
}

/** SHA-256, hex, via the platform. Requires a secure context. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface BrowserDigestCheck {
  recomputed: string;
  bytesHashed: number;
}

export async function recomputeRoundDigest(raw: string): Promise<BrowserDigestCheck> {
  const roundJson = extractRoundJson(raw);
  return {
    recomputed: await sha256Hex(roundJson),
    bytesHashed: new TextEncoder().encode(roundJson).length,
  };
}
