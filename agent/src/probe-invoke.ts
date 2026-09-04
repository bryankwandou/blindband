/**
 * Diagnostic: show exactly what `invoke()` sends and what the node says back.
 *
 * The SDK reports a bare "server returned HTTP 400" and drops the response
 * body, which is not enough to fix anything. This wraps `fetch` to print the
 * request and the error body, then tries a couple of encodings for the
 * contract input so the accepted shape is identified from evidence rather
 * than guessed.
 *
 * Not part of the pipeline. Kept because it is the tool that answered the
 * question, and the next person will hit the same wall.
 */

import "dotenv/config";

import { invoke } from "@terminal3/t3n-sdk";

import { loadState } from "./lib/invoke.js";
import { nodeUrl } from "./lib/session.js";

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  console.log(`\n→ ${init?.method ?? "GET"} ${url}`);
  if (init?.body && typeof init.body === "string") {
    console.log(`  body: ${init.body.slice(0, 500)}${init.body.length > 500 ? " …" : ""}`);
  }

  const res = await realFetch(input as never, init);
  const clone = res.clone();
  const text = await clone.text();
  console.log(`← ${res.status} ${text.slice(0, 700)}`);
  return res;
}) as typeof fetch;

async function attempt(label: string, payload: unknown) {
  const state = loadState();
  console.log(`\n══ ${label} ══`);
  try {
    const out = await invoke<unknown>({
      baseUrl: nodeUrl(),
      apiKey: process.env.T3N_API_KEY!,
      timeoutMs: 60_000,
      request: {
        contract_id: state.contractName,
        contract_version: state.contractVersion,
        function_name: "get-round",
        input: payload,
      },
    });
    console.log(`   OK: ${JSON.stringify(out).slice(0, 300)}`);
    return true;
  } catch (err) {
    console.log(`   failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function main() {
  // `get-round` is the cheapest probe: it reads, it takes a tiny input, and a
  // miss is a clean "not published" rather than a write.
  const query = { round_id: "2026-q1" };

  await attempt("input as object", query);
  await attempt("input as JSON string", JSON.stringify(query));
  await attempt("input as byte array", Array.from(Buffer.from(JSON.stringify(query), "utf8")));
  await attempt("input as base64", Buffer.from(JSON.stringify(query), "utf8").toString("base64"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
