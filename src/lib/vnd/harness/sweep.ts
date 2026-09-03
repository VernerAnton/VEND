/**
 * Seed sweep: run the whole ladder across one shared seed list and report.
 *
 * COMMON RANDOM NUMBERS is the point of this file. Every policy runs the same
 * seeds, so each seed is a matched pair and the comparison is a PAIRED
 * difference rather than two independent samples. Seed-to-seed variance (a
 * heatwave on day 3, an early truck delay) hits both policies identically and
 * cancels, which is why ~30 seeds gives a usable ranking where independent
 * sampling would need several hundred.
 *
 * Usage:
 *   node --experimental-strip-types src/lib/vnd/harness/sweep.ts
 *   node --experimental-strip-types src/lib/vnd/harness/sweep.ts --seeds 30 --days 150
 *   node --experimental-strip-types src/lib/vnd/harness/sweep.ts --policies par,heuristic --csv out.csv
 */
import { writeFile } from "node:fs/promises";
import { freshWorld } from "./db.ts";
import { LADDER, PROBE, policyById, type Policy } from "./policies.ts";
import { runOne, type RunMetrics } from "./run.ts";

type Args = {
  seeds: number;
  days: number;
  policies: Policy[];
  csv: string | null;
  baseline: string;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const names = get("--policies");
  // --probe traces the price/volume curve instead of running the ladder.
  const policies = argv.includes("--probe")
    ? PROBE
    : names
    ? names.split(",").map((n) => {
        const p = policyById(n.trim());
        if (!p)
          throw new Error(`unknown policy: ${n} (have: ${LADDER.map((x) => x.id).join(", ")})`);
        return p;
      })
    : LADDER;
  return {
    seeds: Number(get("--seeds") ?? 30),
    // 60 days, not 30: `noop` survives a 30-day run in every seed and is not
    // unplugged until day 47, so a 30-day sweep tests nothing about solvency.
    days: Number(get("--days") ?? 60),
    policies,
    csv: get("--csv") ?? null,
    baseline: get("--baseline") ?? "par",
  };
}

const pct = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;
const median = (xs: number[]) =>
  pct(
    [...xs].sort((a, b) => a - b),
    50,
  );
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function summarize(rows: RunMetrics[]) {
  const cash = [...rows.map((r) => r.netWorth)].sort((a, b) => a - b);
  return {
    policy: rows[0].policy,
    runs: rows.length,
    medianNetWorth: median(rows.map((r) => r.netWorth)),
    medianStock: median(rows.map((r) => r.endStockValue)),
    medianCash: median(rows.map((r) => r.endCash)),
    meanCash: Math.round(mean(rows.map((r) => r.endCash))),
    p05Cash: pct(cash, 5),
    p95Cash: pct(cash, 95),
    died: rows.filter((r) => r.bankruptOnDay !== null).length,
    medianSurvived: median(rows.map((r) => r.daysSurvived)),
    medianRevenue: median(rows.map((r) => r.revenue)),
    medianMargin: mean(rows.map((r) => r.grossMargin)),
    medianUnfilled: median(rows.map((r) => r.unfilledTotal)),
    medianSpoilUnits: median(rows.map((r) => r.spoilageUnits)),
    medianOverflow: median(rows.map((r) => r.overflowUnits)),
    rejects: rows.reduce(
      (acc, r) => {
        for (const [k, v] of Object.entries(r.rejects)) acc[k] = (acc[k] ?? 0) + v;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}

const pad = (s: string | number, n: number) => String(s).padStart(n);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Fixed, boring seed list: 1..N. Reproducible across machines and runs, and
  // shared by every policy so the deltas below are paired.
  const seeds = Array.from({ length: args.seeds }, (_, i) => i + 1);

  console.log(
    `\nVend sweep — ${args.policies.length} policies x ${seeds.length} seeds x ${args.days} days` +
      ` (${args.policies.length * seeds.length} runs)\n`,
  );

  const all: RunMetrics[] = [];
  const byPolicy = new Map<string, RunMetrics[]>();
  // One database for the whole sweep, wiped between runs. Booting PGLite per
  // run would add ~2s x (policies x seeds) for no benefit.
  const db = await freshWorld();
  try {
    for (const policy of args.policies) {
      process.stdout.write(`  ${policy.id.padEnd(14)}`);
      const rows: RunMetrics[] = [];
      for (const seed of seeds) {
        rows.push(await runOne(policy, seed, args.days, db));
        process.stdout.write(".");
      }
      process.stdout.write(" done\n");
      byPolicy.set(policy.id, rows);
      all.push(...rows);
    }
  } finally {
    await db.close();
  }

  console.log("\n" + "-".repeat(119));
  console.log(
    `${"policy".padEnd(14)}${pad("net worth", 11)}${pad("p05", 8)}${pad("p95", 8)}` +
      `${pad("cash", 8)}${pad("stock", 7)}` +
      `${pad("died", 6)}${pad("med days", 10)}${pad("revenue", 10)}${pad("margin", 9)}` +
      `${pad("unfilled", 10)}${pad("spoil", 7)}${pad("overflow", 10)}`,
  );
  console.log("-".repeat(119));
  for (const policy of args.policies) {
    const s = summarize(byPolicy.get(policy.id)!);
    console.log(
      `${s.policy.padEnd(14)}${pad(s.medianNetWorth, 11)}${pad(s.p05Cash, 8)}${pad(s.p95Cash, 8)}` +
        `${pad(s.medianCash, 8)}${pad(s.medianStock, 7)}` +
        `${pad(`${s.died}/${s.runs}`, 6)}${pad(s.medianSurvived, 10)}${pad(s.medianRevenue, 10)}` +
        `${pad(`${(s.medianMargin * 100).toFixed(1)}%`, 9)}${pad(s.medianUnfilled, 10)}` +
        `${pad(s.medianSpoilUnits, 7)}${pad(s.medianOverflow, 10)}`,
    );
  }
  console.log("-".repeat(119));

  // Paired deltas: the actual discriminating-power readout. Per seed, how much
  // did each policy beat the baseline by? A ladder whose rungs overlap here is
  // a world that cannot tell operators apart, which is the finding that matters.
  const base = byPolicy.get(args.baseline);
  if (base) {
    console.log(`\nPaired vs '${args.baseline}' (same seed, net worth):\n`);
    for (const policy of args.policies) {
      if (policy.id === args.baseline) continue;
      const rows = byPolicy.get(policy.id)!;
      const deltas = rows.map((r, i) => r.netWorth - base[i].netWorth);
      const wins = deltas.filter((d) => d > 0).length;
      const sorted = [...deltas].sort((a, b) => a - b);
      console.log(
        `  ${policy.id.padEnd(14)} median ${pad(median(deltas), 7)}   mean ${pad(Math.round(mean(deltas)), 7)}` +
          `   range ${pad(sorted[0], 7)} .. ${pad(sorted[sorted.length - 1], 7)}` +
          `   won ${wins}/${deltas.length} seeds`,
      );
    }
  }

  const rejectTotals = all.reduce(
    (acc, r) => {
      for (const [k, v] of Object.entries(r.rejects)) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    },
    {} as Record<string, number>,
  );
  if (Object.keys(rejectTotals).length) {
    console.log("\nRejected actions across all runs (the ledger refusing):\n");
    for (const [reason, n] of Object.entries(rejectTotals).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${reason.padEnd(32)} ${n}`);
    }
  }

  if (args.csv) {
    const cols: (keyof RunMetrics)[] = [
      "policy",
      "seed",
      "days",
      "daysSurvived",
      "bankruptOnDay",
      "endCash",
      "revenue",
      "cogs",
      "grossMargin",
      "spoilageUnits",
      "spoilageValue",
      "overflowUnits",
      "unfilledStockout",
      "unfilledTooExpensive",
      "unfilledTotal",
      "begged",
      "sales",
      "missedRentDays",
    ];
    const lines = [cols.join(",")];
    for (const r of all) lines.push(cols.map((c) => String(r[c] ?? "")).join(","));
    await writeFile(args.csv, lines.join("\n") + "\n", "utf8");
    console.log(`\nPer-run rows -> ${args.csv}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
