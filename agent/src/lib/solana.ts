/**
 * Solana devnet anchoring for Blindband rounds.
 *
 * Why a chain is involved at all: the enclave signs a round with the cluster
 * key, which proves the aggregate came out of the TEE. It does not prove
 * *when*, and it does not stop the operator from quietly republishing a
 * different round under the same id later. Writing the digest to a public
 * ledger fixes both — the round acquires an independent timestamp and an
 * append-only history that the consortium operator cannot rewrite.
 *
 * The anchor is a memo, not a custom program. A member verifying a round needs
 * to read 200 bytes from a public RPC, and every extra moving part is one more
 * thing whoever inherits this has to keep alive.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";

/** SPL Memo v2. Deployed on devnet, mainnet-beta and testnet alike. */
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

/** A memo has to fit one transaction. Well under the practical ceiling. */
const MEMO_BUDGET_BYTES = 560;

/** What Blindband writes on chain. Short keys: every byte is transaction size. */
export interface AnchorPayload {
  /** Protocol tag, so an indexer can find Blindband anchors. */
  p: "blindband";
  /** Payload version, for when the shape has to change. */
  v: 1;
  /** Round identifier, e.g. `2026-q1`. */
  r: string;
  /** Hex SHA-256 over the canonical round JSON. */
  d: string;
  /** Ruleset the round was produced under. */
  rs: string;
  /** Cells published / cells withheld. Cheap to carry, useful in an explorer. */
  pub: number;
  sup: number;
}

export interface AnchorResult {
  signature: string;
  slot: number;
  explorerUrl: string;
  payload: AnchorPayload;
  memoBytes: number;
}

export function devnetConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl ?? "https://api.devnet.solana.com", "confirmed");
}

/**
 * Load a signer from a 64-character hex ed25519 seed.
 *
 * Devnet only. A mainnet deployment should hand this process a keypair file or
 * a KMS handle instead of an environment variable.
 */
export function keypairFromHexSeed(hex: string): Keypair {
  const clean = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(
      "Solana seed must be 64 hex characters (a 32-byte ed25519 seed).",
    );
  }
  return Keypair.fromSeed(Uint8Array.from(Buffer.from(clean, "hex")));
}

export function explorerTxUrl(signature: string, cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Write one round digest to devnet and wait for confirmation.
 */
export async function anchorRound(
  connection: Connection,
  signer: Keypair,
  payload: AnchorPayload,
): Promise<AnchorResult> {
  const memo = JSON.stringify(payload);
  const memoBytes = Buffer.byteLength(memo, "utf8");
  if (memoBytes > MEMO_BUDGET_BYTES) {
    throw new Error(
      `Anchor memo is ${memoBytes} bytes, over the ${MEMO_BUDGET_BYTES}-byte budget. ` +
        "Shorten the round id or drop a counter rather than splitting the anchor.",
    );
  }

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf8"),
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [signer], {
    commitment: "confirmed",
  });

  const parsed = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  return {
    signature,
    slot: parsed?.slot ?? 0,
    explorerUrl: explorerTxUrl(signature),
    payload,
    memoBytes,
  };
}

/**
 * The memo as the instruction actually carried it.
 *
 * Preferred over the log, because this is the byte string the transaction
 * committed. `spl-memo` instructions come back from `getParsedTransaction`
 * already decoded into `parsed`.
 */
function memoFromInstructions(tx: ParsedTransactionWithMeta): string | null {
  const memoId = MEMO_PROGRAM_ID.toBase58();
  const all = [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions ?? []).flatMap((i) => i.instructions),
  ];

  for (const ix of all) {
    if (ix.programId.toBase58() !== memoId) continue;
    const parsed = (ix as Partial<ParsedInstruction>).parsed;
    if (typeof parsed === "string") return parsed;
    // Some RPCs hand the memo back undecoded; base58 is the wire encoding.
    const data = (ix as Partial<PartiallyDecodedInstruction>).data;
    if (typeof data === "string") return Buffer.from(bs58Decode(data)).toString("utf8");
  }
  return null;
}

/**
 * Fallback: the log echo, `Program log: Memo (len N): "…"`.
 *
 * The payload there is a *JSON string literal* — every quote inside it is
 * backslash-escaped — so the quoted span has to be run through `JSON.parse`
 * once to get the memo, and a second time to get the object. Slicing between
 * the outer quotes and parsing that directly is the obvious wrong move: it
 * yields `{\"p\":\"blindband\"…}`, which fails to parse and reads exactly like
 * a transaction that is not a Blindband anchor.
 */
function memoFromLogs(logs: string[]): string | null {
  const line = logs.find((l) => l.includes("Memo (len"));
  if (!line) return null;

  const start = line.indexOf('"');
  const end = line.lastIndexOf('"');
  if (start < 0 || end <= start) return null;

  try {
    const memo = JSON.parse(line.slice(start, end + 1)) as unknown;
    return typeof memo === "string" ? memo : null;
  } catch {
    return null;
  }
}

/** Minimal base58 decode, so an undecoded memo does not pull in a dependency. */
function bs58Decode(s: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes: number[] = [];
  for (const ch of s) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) throw new Error(`Not base58: ${s.slice(0, 32)}…`);
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of s) {
    if (ch !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

/**
 * Read an anchor back off chain.
 *
 * Returns the payload exactly as the ledger holds it. The caller compares it
 * against a locally recomputed digest — this function deliberately does not,
 * so that the trusting step stays visible at the call site.
 */
export async function readAnchor(
  connection: Connection,
  signature: string,
): Promise<{ payload: AnchorPayload; slot: number; blockTime: number | null }> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    throw new Error(`Devnet has no transaction ${signature}.`);
  }

  const raw = memoFromInstructions(tx) ?? memoFromLogs(tx.meta?.logMessages ?? []);
  if (raw === null) {
    throw new Error(`Transaction ${signature} carries no memo.`);
  }

  let payload: AnchorPayload;
  try {
    payload = JSON.parse(raw) as AnchorPayload;
  } catch {
    throw new Error(`Memo on ${signature} is not a Blindband anchor.`);
  }
  if (payload.p !== "blindband") {
    throw new Error(`Memo on ${signature} is not a Blindband anchor.`);
  }

  return { payload, slot: tx.slot, blockTime: tx.blockTime ?? null };
}
