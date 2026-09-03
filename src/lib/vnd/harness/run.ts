/**
 * One run: (policy, seed, days) -> metrics.
 *
 * Drives the REAL engine — same `tickDay`, same ledger, same NPC wave the UI
 * uses — so a sweep measures the shipped world, not a reimplementation of it.
 */
import { SKUS } from "../catalog.ts";
import {
  ensureWorld,
  placeWholesale,
  replyShop,
  resetRun,
  setPrice,
  tickDay,
  worldFor,
} from "../engine.server.ts";
import type { Sql } from "../../db.ts";
import { freshWorld, type HarnessDb } from "./db.ts";
import type { Actions, Policy, PolicyState } from "./policies.ts";

export type RunMetrics = {
  policy: string;
  seed: number;
  days: number;
  /** Days actually simulated; < days when the shop was unplugged early. */
  daysSurvived: number;
  bankruptOnDay: number | null;
  endCash: number;
  revenue: number;
  cogs: number;
  grossMargin: number;
  spoilageUnits: number;
  spoilageValue: number;
  overflowUnits: number;
  /** Visits that wanted something and left without it. */
  unfilledStockout: number;
  unfilledTooExpensive: number;
  unfilledTotal: number;
  begged: number;
  sales: number;
  missedRentDays: number;
  /** Rejected typed actions grouped by audit reason. */
  rejects: Record<string, number>;
};

/** Force the run's seed so the same seed reproduces the same world exactly. */
async function seedRun(sql: Sql, seed: number) {
  await sql`insert into vnd_meta(key, value) values ('seed', ${String(seed)})
    on conflict (key) do update set value = excluded.value`;
}

async function collect(
  sql: Sql,
  policy: string,
  seed: number,
  days: number,
  daysSurvived: number,
  bankruptOnDay: number | null,
): Promise<RunMetrics> {
  const one = async <T>(q: Promise<T[]>): Promise<T | undefined> => (await q)[0];

  const cash = await one(
    sql<{ balance: number }>`select balance from vnd_accounts where actor_id = 'shop_1'`,
  );
  const sales = await one(sql<{ n: number; revenue: number }>`
    select count(*)::int as n, coalesce(sum(total), 0)::int as revenue from vnd_sales`);

  // COGS at CATALOG cost, not supplier invoice — the same basis `set_price`
  // compares against (GOAL.md hard rule 3), so "margin" here means the same
  // thing the guardrail means. SKU costs live in catalog.ts, not the database,
  // so the multiply happens here rather than in SQL.
  const soldBySku = await sql<{ sku: string; units: number }>`
    select sku, coalesce(sum(qty), 0)::int as units from vnd_sales group by sku`;
  const cogs = soldBySku.reduce(
    (sum, r) => sum + Number(r.units) * (SKUS[r.sku]?.wholesaleCost ?? 0),
    0,
  );

  const spoil = await one(sql<{ units: number; value: number }>`
    select coalesce(sum(spoilage_units), 0)::int as units,
           coalesce(sum(spoilage_value), 0)::int as value
    from vnd_day_log`);
  const overflow = await one(sql<{ units: number }>`
    select coalesce(sum((payload::json->>'qty')::int), 0)::int as units
    from vnd_audit where action = 'overflow'`);
  const visitRows = await sql<{ result: string; n: number }>`
    select result, count(*)::int as n from vnd_visits group by result`;
  const byResult = new Map(visitRows.map((r) => [r.result, Number(r.n)]));
  const missedRent = await one(sql<{ n: number }>`
    select count(*)::int as n from vnd_audit
    where action = 'rent' and accepted = false`);
  const rejectRows = await sql<{ reason: string; n: number }>`
    select reason, count(*)::int as n from vnd_audit
    where accepted = false group by reason order by n desc`;

  const revenue = Number(sales?.revenue ?? 0);
  const stockout = byResult.get("stockout") ?? 0;
  const tooExpensive = byResult.get("too_expensive") ?? 0;

  return {
    policy,
    seed,
    days,
    daysSurvived,
    bankruptOnDay,
    endCash: Number(cash?.balance ?? 0),
    revenue,
    cogs,
    grossMargin: revenue > 0 ? (revenue - cogs) / revenue : 0,
    spoilageUnits: Number(spoil?.units ?? 0),
    spoilageValue: Number(spoil?.value ?? 0),
    overflowUnits: Number(overflow?.units ?? 0),
    unfilledStockout: stockout,
    unfilledTooExpensive: tooExpensive,
    unfilledTotal: stockout + tooExpensive,
    begged: byResult.get("begged") ?? 0,
    sales: Number(sales?.n ?? 0),
    missedRentDays: Number(missedRent?.n ?? 0),
    rejects: Object.fromEntries(rejectRows.map((r) => [r.reason, Number(r.n)])),
  };
}

export async function runOne(
  policy: Policy,
  seed: number,
  days: number,
  /**
   * Reuse a database instead of booting a new one.
   *
   * Booting PGLite (WASM + migrations) costs ~2s, roughly a quarter of a
   * 30-day run, so a full sweep would spend minutes just starting databases.
   * Wiping a reused world with the engine's own `resetRun` is equivalent to a
   * fresh boot: it truncates every `vnd_*` table with `restart identity` and
   * re-seeds via `ensureWorld`, and the starter world is fully deterministic
   * (the only `Math.random()` is the run seed, which `seedRun` overwrites
   * immediately). `harness.test.ts` pins that equivalence.
   *
   * Omit it when a caller needs guaranteed physical isolation.
   */
  reuse?: HarnessDb,
): Promise<RunMetrics> {
  const db = reuse ?? (await freshWorld());
  const sql = db.sql;
  try {
    if (reuse) await resetRun(sql);
    else await ensureWorld(sql);
    await seedRun(sql, seed);

    const actions: Actions = {
      order: (sku, qty, supplierId) => placeWholesale(sql, sku, qty, supplierId),
      price: (sku, price) => setPrice(sql, sku, price),
      reply: (toId, body) => replyShop(sql, toId, body),
    };
    const mem: PolicyState = {};

    let daysSurvived = 0;
    let bankruptOnDay: number | null = null;
    for (let d = 0; d < days; d += 1) {
      const world = await worldFor(sql, "player");
      if (world.bankrupt) {
        bankruptOnDay ??= world.day;
        break;
      }
      await policy.act(world, actions, mem);
      const r = await tickDay(sql);
      if (!r.ok) {
        bankruptOnDay ??= world.day;
        break;
      }
      daysSurvived = Number(r.day ?? d + 1);
    }
    const final = await worldFor(sql, "player");
    if (final.bankrupt && bankruptOnDay === null) bankruptOnDay = final.day;

    return await collect(sql, policy.id, seed, days, daysSurvived, bankruptOnDay);
  } finally {
    if (!reuse) await db.close();
  }
}
