/**
 * One quarter, one command.
 *
 * ```text
 * npm run quarter -- --round 2026-q2 --data data/q2.json --follows 2026-q1
 * npm run quarter -- --round 2026-q2 --data data/q2.json --follows 2026-q1 --dry-run
 * ```
 *
 * Running a round was five commands in a fixed order, each with its own
 * arguments, and getting the order wrong is not obvious until something
 * downstream fails oddly: anchor before round and you anchor the previous
 * quarter's digest onto this quarter's label. A consortium runs this four times
 * a year, which is exactly often enough to forget the order and not often
 * enough to build the habit.
 *
 * So this is the whole quarter: preflight, submit, round, anchor, verify. It
 * spawns the same scripts a person would run by hand rather than reimplementing
 * them, so there is no second copy of the sequence to drift out of step with
 * the one in the README.
 *
 * `--dry-run` prints the exact commands and stops before anything that spends
 * credits or writes to a chain. It still runs preflight, so it answers the two
 * questions that explain most failures — is the key authenticating, are there
 * credits — without costing anything to ask.
 *
 * What this does not do is decide anything for you. It will not invent a round
 * id, guess which rounds this one follows, or continue past a failed step. Each
 * of those is a decision with consequences a quarter long.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

interface Args {
  round: string;
  data: string;
  follows: string[];
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  let round = "";
  let data = "";
  const follows: string[] = [];
  let dryRun = false;

  const need = (flag: string, value: string | undefined) => {
    if (!value || value.startsWith("--")) throw new Error(`${flag} needs a value`);
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--round":
        round = need("--round", argv[++i]);
        break;
      case "--data":
        data = need("--data", argv[++i]);
        break;
      case "--follows":
        follows.push(need("--follows", argv[++i]));
        break;
      case "--dry-run":
        dryRun = true;
        break;
      default:
        throw new Error(`unknown option \`${argv[i]}\``);
    }
  }

  if (!round) throw new Error("--round is required, e.g. --round 2026-q2");
  if (!data) throw new Error("--data is required, e.g. --data data/records.json");
  return { round, data, follows, dryRun };
}

/** One step, named the way the README names it. */
interface Step {
  what: string;
  script: string;
  args: string[];
  /** Steps that cost credits or write to a chain are skipped by --dry-run. */
  spends: boolean;
}

function plan(a: Args): Step[] {
  return [
    { what: "check the key and the credits", script: "src/preflight.ts", args: [], spends: false },
    { what: "seal the rows into the ledger", script: "src/submit.ts", args: [a.data], spends: true },
    {
      what: "run the gates inside the enclave",
      script: "src/round.ts",
      args: [a.round, ...a.follows.flatMap((f) => ["--follows", f])],
      spends: true,
    },
    { what: "anchor the digest on devnet", script: "src/anchor.ts", args: [], spends: true },
    { what: "check what was published", script: "src/verify.ts", args: [], spends: true },
  ];
}

/**
 * Node with tsx loaded, not `npx tsx` through a shell.
 *
 * Spawning `npx` on Windows needs `shell: true`, which concatenates arguments
 * rather than passing them — and this repository's own path contains spaces. A
 * quoting bug there would surface as a missing data file rather than as a
 * quoting bug. `--import tsx` runs the same transpiler with no shell in the way.
 */
function run(step: Step): number {
  const result = spawnSync(process.execPath, ["--import", "tsx", step.script, ...step.args], {
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function main() {
  const a = parseArgs(process.argv.slice(2));

  if (!existsSync(a.data)) {
    console.error(`quarter: ${a.data} does not exist. Nothing would be submitted.`);
    process.exit(1);
  }

  const steps = plan(a);

  console.log(`round        : ${a.round}`);
  console.log(`submissions  : ${a.data}`);
  console.log(
    a.follows.length
      ? `follows      : ${a.follows.join(", ")} — gate 5 will compare against each`
      : `follows      : nothing. Gate 5 has no history to check, so this is a first round`,
  );
  if (!a.follows.length) {
    console.log(
      `               If this consortium has published before, name those rounds with\n` +
        `               --follows or the round goes out under four gates instead of five.`,
    );
  }
  console.log(a.dryRun ? `mode         : dry run — nothing will be spent\n` : `\n`);

  for (const [i, step] of steps.entries()) {
    const label = `${i + 1}/${steps.length}  ${step.what}`;
    const cmd = `npx tsx ${step.script}${step.args.length ? " " + step.args.join(" ") : ""}`;

    if (a.dryRun && step.spends) {
      console.log(`── ${label}\n   would run: ${cmd}\n`);
      continue;
    }

    console.log(`── ${label}\n   ${cmd}\n`);
    const code = run(step);
    if (code !== 0) {
      // Stopping here is the point. Every later step reads what an earlier one
      // wrote, so continuing past a failure anchors or verifies a file that is
      // stale, missing, or half-written — and does it under this round's label.
      console.error(
        `\nquarter: step ${i + 1} (${step.what}) exited ${code}. Stopping.\n` +
          `Nothing after this ran, so nothing later in the sequence has acted on a\n` +
          `partial result. Fix the cause and run the same command again — submit is\n` +
          `keyed by commitment and round, so re-running it does not double-count rows.`,
      );
      process.exit(code);
    }
  }

  console.log(
    a.dryRun
      ? `\nDry run complete. Preflight passed and the plan above is what would run.`
      : `\nQuarter ${a.round} is published, anchored and verified.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`quarter: ${err instanceof Error ? err.message : String(err)}\n`);
  console.error(
    `Usage:\n` +
      `  npm run quarter -- --round <id> --data <file> [--follows <earlier-round> ...] [--dry-run]\n\n` +
      `  --round     the label for this quarter, e.g. 2026-q2\n` +
      `  --data      the submissions to seal, JSON or CSV\n` +
      `  --follows   a round this contract has already published. Repeat it, oldest\n` +
      `              first, for every earlier round. Gate 5 compares against each.\n` +
      `  --dry-run   check the key and the credits, print the plan, spend nothing.`,
  );
  process.exit(1);
}
