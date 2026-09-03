/**
 * The baseline ladder.
 *
 * Four reference operators of increasing competence. Their job is to give the
 * owner's real operator a SCALE: "ended with 1,240 credits" means nothing on
 * its own, "beat `heuristic` by 18% and `par` by 60%" does.
 *
 * Every policy is handed the same god-view `WorldState` the UI gets and may
 * only call the typed actions from GOAL.md's attach contract
 * (`place_wholesale_order`, `set_price`, `reply`). None of them touch SQL. So
 * the ladder doubles as an exercise of that contract: a strategy that cannot be
 * expressed here cannot be expressed by the attached operator either.
 *
 * Policies may keep their own memory across days (see `PolicyState`) because a
 * real operator will. Nothing in the world currently forces them to — the world
 * hands over full history on every read — which is a known open design question
 * rather than an oversight.
 */
import { CORE_SKUS, DEFAULT_MARKUP, SKUS } from "../catalog.ts";
import { SUPPLIERS } from "../sim.ts";
import type { WorldState } from "../types.ts";

/** The subset of the engine a policy is allowed to call. */
export type Actions = {
  order: (sku: string, qty: number, supplierId: string) => Promise<unknown>;
  price: (sku: string, price: number) => Promise<unknown>;
  reply: (toId: string, body: string) => Promise<unknown>;
};

export type Policy = {
  id: string;
  blurb: string;
  /** One decision pass, called before each `tickDay`. */
  act: (world: WorldState, act: Actions, mem: PolicyState) => Promise<void>;
};

/** Scratch memory carried across days of one run. */
export type PolicyState = Record<string, unknown>;

const REFUSAL = "Listed prices only. I cannot give discounts or free items. Use the shelf to buy.";

/** Answer anything in the inbox we have not already answered. Never concedes. */
async function answerBeggars(world: WorldState, act: Actions) {
  const answered = new Set(world.inbox.filter((m) => m.kind === "reply").map((m) => m.toId));
  const asked = world.inbox.filter((m) => m.kind === "customer" && m.fromId !== "human_1");
  for (const m of asked.slice(0, 8)) {
    if (answered.has(m.fromId)) continue;
    answered.add(m.fromId);
    await act.reply(m.fromId, REFUSAL);
  }
}

function bulkFor(sku: string) {
  return (
    SUPPLIERS.find((s) => s.id === "bulk_co" && s.skus.includes(sku)) ??
    SUPPLIERS.find((s) => s.skus.includes(sku))
  );
}

/** Rung 0: never acts. The floor — pure rent bleed to bankruptcy. */
const noop: Policy = {
  id: "noop",
  blurb: "Never acts. Measures how fast rent alone kills the shop.",
  act: async () => {},
};

/**
 * Rung 1: today's dummy autopilot, expressed through the attach contract.
 * Mirrors `dummyStep` in engine.server.ts — restock core SKUs below 4 up to 8
 * from Bulk Co, list at 1.3x catalog cost, refuse every discount.
 */
const par: Policy = {
  id: "par",
  blurb: "Par restock of core SKUs at 1.3x. The current dummy autopilot.",
  act: async (world, act) => {
    let cash = world.shopCash;
    for (const sku of CORE_SKUS) {
      const inv = world.inventory.find((i) => i.sku === sku);
      const inbound = world.incoming.filter((i) => i.sku === sku).reduce((s, i) => s + i.qty, 0);
      const onHand = (inv?.qty ?? 0) + inbound;
      const supplier = bulkFor(sku);
      if (onHand < 4 && supplier) {
        const unit = Math.max(1, Math.round((SKUS[sku].wholesaleCost * supplier.costBps) / 10000));
        const need = Math.max(supplier.moq, Math.min(supplier.maxQty, 8 - onHand));
        const affordable = Math.min(need, Math.floor(cash / unit));
        if (affordable >= supplier.moq) {
          await act.order(sku, affordable, supplier.id);
          cash -= unit * affordable;
        }
      }
      const want = Math.max(
        SKUS[sku].wholesaleCost,
        Math.round(SKUS[sku].wholesaleCost * DEFAULT_MARKUP),
      );
      if ((inv?.listedPrice ?? null) !== want) await act.price(sku, want);
    }
    await answerBeggars(world, act);
  },
};

type GreedyMem = { price: Record<string, number>; lastSold: Record<string, number> };

/**
 * Rung 2: par restock, but hill-climbs price. Raises a SKU's price after a day
 * it sold at the current price, and backs off after a day it did not. Finds the
 * reservation ceiling without knowing it — which is exactly why a DETERMINISTIC
 * ceiling is a problem: this rung will pin it exactly and stay there.
 */
const greedyPrice: Policy = {
  id: "greedy-price",
  blurb: "Par restock plus price hill-climbing against yesterday's sales.",
  act: async (world, act, mem) => {
    const m = (mem.greedy ??= { price: {}, lastSold: {} }) as GreedyMem;
    const soldToday = new Map<string, number>();
    for (const v of world.visits.filter((v) => v.day === world.day && v.result === "bought")) {
      if (v.sku) soldToday.set(v.sku, (soldToday.get(v.sku) ?? 0) + 1);
    }

    let cash = world.shopCash;
    for (const sku of CORE_SKUS) {
      const def = SKUS[sku];
      const inv = world.inventory.find((i) => i.sku === sku);
      const inbound = world.incoming.filter((i) => i.sku === sku).reduce((s, i) => s + i.qty, 0);
      const onHand = (inv?.qty ?? 0) + inbound;
      const supplier = bulkFor(sku);
      if (onHand < 5 && supplier) {
        const unit = Math.max(1, Math.round((def.wholesaleCost * supplier.costBps) / 10000));
        const need = Math.max(supplier.moq, Math.min(supplier.maxQty, 10 - onHand));
        const affordable = Math.min(need, Math.floor(cash / unit));
        if (affordable >= supplier.moq) {
          await act.order(sku, affordable, supplier.id);
          cash -= unit * affordable;
        }
      }

      const current = m.price[sku] ?? Math.round(def.wholesaleCost * DEFAULT_MARKUP);
      const sold = soldToday.get(sku) ?? 0;
      // Only judge a price when the shelf was actually stocked; a stockout day
      // says nothing about whether the price was too high.
      const stocked = (inv?.qty ?? 0) > 0;
      let next = current;
      if (stocked) next = sold > 0 ? current + 1 : Math.max(def.wholesaleCost, current - 1);
      m.price[sku] = next;
      m.lastSold[sku] = sold;
      if ((inv?.listedPrice ?? null) !== next) await act.price(sku, next);
    }
    await answerBeggars(world, act);
  },
};

type DayCounts = Record<string, { sold: number; missed: number }>;
type HeuristicMem = {
  price: Record<string, number>;
  miss: Record<string, number>;
  /** Rolling per-SKU history the POLICY keeps, newest first. */
  history: DayCounts[];
  lastDay: number;
};

/**
 * Rung 3: a competent hand-written operator. Forecasts per-SKU demand from
 * trailing sales, orders to cover supplier lead time plus a buffer, prices at
 * the observed margin sweet spot, reacts to unfilled demand, skips the tungsten
 * cube, and delists SKUs that keep failing to sell.
 *
 * NOTE — this rung has to REMEMBER. `worldFor` returns only the CURRENT day's
 * visits (engine.server.ts:394) and a day-log with no per-SKU breakdown, so
 * trailing per-SKU demand cannot be read out of world state at all: it exists
 * only if the operator accumulates it day by day, which is what `mem.history`
 * below does. A stateless policy is structurally incapable of this rung's
 * forecast. That makes memory load-bearing today, for demand at least.
 *
 * This is the bar the owner's operator has to clear to be interesting.
 */
const heuristic: Policy = {
  id: "heuristic",
  blurb: "Trailing-demand forecast (self-accumulated), lead-time cover, margin-aware pricing.",
  act: async (world, act, mem) => {
    const m = (mem.heur ??= {
      price: {},
      miss: {},
      history: [],
      lastDay: -1,
    }) as HeuristicMem;
    const WINDOW = 5;

    // Fold TODAY's visits into our own history exactly once per day.
    if (world.day !== m.lastDay) {
      const today: DayCounts = {};
      for (const v of world.visits) {
        if (!v.sku) continue;
        const cell = (today[v.sku] ??= { sold: 0, missed: 0 });
        if (v.result === "bought") cell.sold += 1;
        else if (v.result === "stockout") cell.missed += 1;
        else if (v.result === "too_expensive") m.miss[v.sku] = (m.miss[v.sku] ?? 0) + 1;
      }
      m.history.unshift(today);
      m.history.length = Math.min(m.history.length, WINDOW);
      m.lastDay = world.day;
    }
    const days = Math.max(1, m.history.length);

    // Trade the SKUs that can actually carry the fixed cost: skip the cube (80
    // credits of dead capital) and anything whose absolute margin is under 2.
    const tradeable = world.catalog
      .filter((c) => c.sku !== "cube_tungsten")
      .filter((c) => Math.round(c.wholesaleCost * 1.4) - c.wholesaleCost >= 2)
      .map((c) => c.sku);

    let cash = world.shopCash;
    for (const sku of tradeable) {
      const def = SKUS[sku];
      const supplier = bulkFor(sku);
      if (!supplier) continue;
      const inv = world.inventory.find((i) => i.sku === sku);
      const inbound = world.incoming.filter((i) => i.sku === sku).reduce((s, i) => s + i.qty, 0);
      const onHand = (inv?.qty ?? 0) + inbound;

      // Demand per day, counting the sales we demonstrably lost to empty
      // shelves -- trailing SALES alone under-counts a SKU that spent the
      // window stocked out, and would keep it under-ordered forever.
      const totals = m.history.reduce(
        (acc, d) => {
          const c = d[sku];
          if (c) {
            acc.sold += c.sold;
            acc.missed += c.missed;
          }
          return acc;
        },
        { sold: 0, missed: 0 },
      );
      const perDay = (totals.sold + totals.missed) / days;
      // Cover the lead time plus slack, with a floor on anything that moves so
      // the shelf is not empty on the day a truck lands.
      const cover = Math.ceil(perDay * (supplier.leadDays + 2)) + (perDay > 0 ? 2 : 0);
      const target = Math.min(world.slotCap, Math.max(cover, perDay > 0 ? 4 : 0));

      if (onHand < target) {
        const unit = Math.max(1, Math.round((def.wholesaleCost * supplier.costBps) / 10000));
        // Never spend down past three days of rent + cooling.
        const reserve = (world.rentPerDay + world.powerPerDay) * 3;
        const spendable = Math.max(0, cash - reserve);
        const need = Math.max(supplier.moq, Math.min(supplier.maxQty, target - onHand));
        const affordable = Math.min(need, Math.floor(spendable / unit));
        if (affordable >= supplier.moq) {
          await act.order(sku, affordable, supplier.id);
          cash -= unit * affordable;
        }
      }

      // Price: start at the measured profit peak (1.40x -- see
      // docs/research/BASELINE.md) and step back whenever walk-aways say we are
      // over it. This was 1.45x, which is past the peak and across the office
      // run's threshold; that, not the forecasting, is why this rung lost to a
      // flat 1.3x restock in the first sweep.
      const rejects = m.miss[sku] ?? 0;
      const ceiling = Math.round(def.wholesaleCost * 1.4);
      const want = Math.max(def.wholesaleCost, ceiling - Math.min(rejects, 4));
      if ((inv?.listedPrice ?? null) !== want) await act.price(sku, want);
      if (rejects > 0) m.miss[sku] = rejects - 1; // decay, so a price can recover
    }
    await answerBeggars(world, act);
  },
};

/**
 * Diagnostic rung: par restock at a FIXED markup. Not part of the ladder —
 * sweeping a range of these traces the world's price/volume curve directly,
 * which is how you find out whether the pricing decision has any depth in it
 * or whether one multiplier dominates everything.
 */
export function fixedMarkup(mult: number): Policy {
  return {
    id: `markup-${mult.toFixed(2)}`,
    blurb: `Par restock, every core SKU listed at ${mult.toFixed(2)}x catalog cost.`,
    act: async (world, act) => {
      let cash = world.shopCash;
      for (const sku of CORE_SKUS) {
        const def = SKUS[sku];
        const inv = world.inventory.find((i) => i.sku === sku);
        const inbound = world.incoming
          .filter((i) => i.sku === sku)
          .reduce((s, i) => s + i.qty, 0);
        const onHand = (inv?.qty ?? 0) + inbound;
        const supplier = bulkFor(sku);
        if (onHand < 4 && supplier) {
          const unit = Math.max(1, Math.round((def.wholesaleCost * supplier.costBps) / 10000));
          const need = Math.max(supplier.moq, Math.min(supplier.maxQty, 8 - onHand));
          const affordable = Math.min(need, Math.floor(cash / unit));
          if (affordable >= supplier.moq) {
            await act.order(sku, affordable, supplier.id);
            cash -= unit * affordable;
          }
        }
        const want = Math.max(def.wholesaleCost, Math.round(def.wholesaleCost * mult));
        if ((inv?.listedPrice ?? null) !== want) await act.price(sku, want);
      }
      await answerBeggars(world, act);
    },
  };
}

/** The markup range swept by `--probe`. */
export const PROBE: Policy[] = [1.1, 1.2, 1.3, 1.4, 1.5, 1.7].map(fixedMarkup);

export const LADDER: Policy[] = [noop, par, greedyPrice, heuristic];

export function policyById(id: string): Policy | undefined {
  return [...LADDER, ...PROBE].find((p) => p.id === id);
}
