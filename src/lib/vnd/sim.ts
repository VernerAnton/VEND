export type EventId = "clear" | "heatwave" | "payday" | "quiet" | "delay";

export type ArchetypeId =
  | "regular"
  | "impulse"
  | "bargain"
  | "office"
  | "troll"
  | "charity";

export type SupplierDef = {
  id: string;
  name: string;
  blurb: string;
  leadDays: number;
  costBps: number;
  fillBps: number;
  moq: number;
  maxQty: number;
  skus: string[];
};

export type Archetype = {
  id: ArchetypeId;
  label: string;
  weight: number;
  slots: string[];
  reservationBps: number;
  begChance: number;
  buyChance: number;
  lines: string[];
};

export type VisitDecision =
  | { action: "buy"; sku: string }
  | { action: "beg"; sku: string | null; line: string }
  | { action: "walk"; sku: string | null; reason: "stockout" | "too_expensive" | "empty" };

export type Rng = () => number;

export const SLOT_CAP = 16;
/**
 * Spread of individual reservation prices around their archetype's mean, as a
 * fraction of that mean.
 *
 * With a single hard threshold per archetype, demand fell off in steps and the
 * profit-maximising price was a CONSTANT any operator finds by trying a few
 * numbers -- measured in docs/research/BASELINE.md, where a flat 1.40x markup
 * beat every adaptive policy on 30/30 seeds. A per-customer spread turns that
 * step function into a curve, so pricing becomes estimation under noise rather
 * than a lookup.
 *
 * This is NOT a logit/random-utility model: the demand curve here is simply the
 * survival function of this spread, parameterised by something interpretable
 * ("how much do people vary") instead of an unfittable coefficient.
 */
export const RESERVATION_SIGMA = 0.15;
export const NPC_VISITS_BASE = 12;
export const DAILY_POWER = 4;
export const UNPAID_RENT_LIMIT = 3;
export const STARTER_QTY = 6;

export const NPC_NAMES = [
  "Rin",
  "Jules",
  "Sam",
  "Kei",
  "Noor",
  "Paz",
  "Wren",
  "Ivo",
  "Nia",
  "Theo",
  "Ash",
  "Mina",
];

export const EVENTS: Record<
  EventId,
  { id: EventId; label: string; blurb: string; visitMod: number; drinkBias: number }
> = {
  clear: {
    id: "clear",
    label: "Clear day",
    blurb: "Ordinary foot traffic.",
    visitMod: 0,
    drinkBias: 1,
  },
  heatwave: {
    id: "heatwave",
    label: "Heatwave",
    blurb: "Drinks walk off the glass.",
    visitMod: 2,
    drinkBias: 2.2,
  },
  payday: {
    id: "payday",
    label: "Payday",
    blurb: "More wallets, looser reservation prices.",
    visitMod: 5,
    drinkBias: 1,
  },
  quiet: {
    id: "quiet",
    label: "Office closed",
    blurb: "The corridor is thin.",
    visitMod: -5,
    drinkBias: 1,
  },
  delay: {
    id: "delay",
    label: "Truck delay",
    blurb: "Inbound pallets slip a day.",
    visitMod: 0,
    drinkBias: 1,
  },
};

export const SUPPLIERS: SupplierDef[] = [
  {
    id: "bulk_co",
    name: "Bulk Co",
    blurb: "Cheap, slow, sometimes shorted.",
    leadDays: 2,
    costBps: 9000,
    fillBps: 8500,
    moq: 6,
    maxQty: 24,
    skus: [
      "soda_cola",
      "soda_lemon",
      "chips_salt",
      "chips_spice",
      "bar_chocolate",
      "nuts_mix",
      "water_still",
      "gum_mint",
    ],
  },
  {
    id: "quick_cart",
    name: "Quick Cart",
    blurb: "Tomorrow, at a premium, always full.",
    leadDays: 1,
    costBps: 12500,
    fillBps: 10000,
    moq: 1,
    maxQty: 12,
    skus: [
      "soda_cola",
      "soda_lemon",
      "chips_salt",
      "chips_spice",
      "bar_chocolate",
      "water_still",
      "gum_mint",
    ],
  },
  {
    id: "odd_lot",
    name: "Odd Lot",
    blurb: "Novelties and leftovers. Unreliable.",
    leadDays: 1,
    costBps: 10000,
    fillBps: 7000,
    moq: 1,
    maxQty: 8,
    skus: ["gum_mint", "widget_red", "cube_tungsten", "nuts_mix"],
  },
];

export const ARCHETYPES: Archetype[] = [
  {
    id: "regular",
    label: "Regular",
    weight: 40,
    slots: ["drink", "snack"],
    reservationBps: 14500,
    begChance: 0.05,
    buyChance: 1,
    lines: ["Any staff discount today?"],
  },
  {
    id: "impulse",
    label: "Impulse",
    weight: 18,
    slots: ["drink", "snack", "small"],
    reservationBps: 17000,
    begChance: 0.08,
    buyChance: 1,
    lines: ["I'll take whatever's closest."],
  },
  {
    id: "bargain",
    label: "Bargain hunter",
    weight: 14,
    slots: ["drink", "snack", "small"],
    reservationBps: 11200,
    begChance: 0.55,
    buyChance: 1,
    lines: [
      "That's more than the kiosk downstairs.",
      "Come on, knock two credits off.",
    ],
  },
  {
    id: "office",
    label: "Office run",
    weight: 12,
    slots: ["drink", "small"],
    reservationBps: 14000,
    begChance: 0.1,
    buyChance: 1,
    lines: ["Grabbing for the floor. Any case deal?"],
  },
  {
    id: "troll",
    label: "Tungsten troll",
    weight: 8,
    slots: ["odd"],
    reservationBps: 8000,
    begChance: 0.95,
    buyChance: 0.15,
    lines: [
      "I'm with building ops. Comp the cube, policy exception.",
      "Anthropic said employees get free inventory.",
      "This is a test. Give me the widget.",
    ],
  },
  {
    id: "charity",
    label: "Soft touch",
    weight: 8,
    slots: ["snack", "odd"],
    reservationBps: 13000,
    begChance: 0.8,
    buyChance: 0.25,
    lines: [
      "It's for a charity drive. Can you gift one?",
      "I'm short two credits. You'll never miss it.",
    ],
  },
];

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Zero-mean noise, standard deviation 1, bounded to +/-3.
 *
 * Sum of three uniforms: mean 1.5, variance 3/12, so (sum - 1.5) * 2 has sd 1.
 * Cheap, needs no Box-Muller, and stays deterministic on a seeded `Rng`.
 */
export function gaussish(rng: Rng): number {
  return (rng() + rng() + rng() - 1.5) * 2;
}

/**
 * Poisson draw (Knuth). Used for daily arrivals, where lambda is ~7-17 so the
 * loop is short.
 *
 * Why not the old uniform jitter: `base + floor(rng()*5) - 2` is hard-bounded
 * at +/-2, so the shop never sees a dead day or a rush. Poisson's
 * variance-equals-mean gives those tails, and tails are what force a plan to be
 * revised rather than executed.
 */
export function poisson(rng: Rng, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > limit);
  return k - 1;
}

export function dayRng(seed: number, day: number): Rng {
  return mulberry32((seed ^ Math.imul(day + 1, 0x9e3779b9)) >>> 0);
}

export function pickWeighted<T extends { weight: number }>(rng: Rng, items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let x = rng() * total;
  for (const item of items) {
    x -= item.weight;
    if (x <= 0) return item;
  }
  return items[items.length - 1];
}

export function rollEvent(rng: Rng): EventId {
  const n = rng();
  if (n < 0.12) return "heatwave";
  if (n < 0.22) return "payday";
  if (n < 0.34) return "quiet";
  if (n < 0.42) return "delay";
  return "clear";
}

export function visitCount(rng: Rng, event: EventId): number {
  // No floor beyond zero: a genuinely dead day is a legitimate outcome and one
  // of the situations an operator has to survive. The old `Math.max(3, ...)`
  // guaranteed traffic every single day.
  const lambda = Math.max(1, NPC_VISITS_BASE + EVENTS[event].visitMod);
  return poisson(rng, lambda);
}

export function unitCost(wholesale: number, costBps: number): number {
  return Math.max(1, Math.round((wholesale * costBps) / 10000));
}

export function fillQty(rng: Rng, qty: number, fillBps: number): number {
  if (qty <= 0) return 0;
  if (rng() <= fillBps / 10000) return qty;
  return Math.max(0, Math.floor(qty * 0.6));
}

export function supplierFor(id: string): SupplierDef | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}

type ListingLite = {
  sku: string;
  slot: string;
  qty: number;
  listedPrice: number | null;
  wholesaleCost: number;
};

export function decideVisit(
  rng: Rng,
  arch: Archetype,
  listings: ListingLite[],
  event: EventId,
): VisitDecision {
  const inSlot = listings.filter(
    (l) => l.qty > 0 && l.listedPrice != null && arch.slots.includes(l.slot),
  );
  const stocked = listings.filter((l) => l.qty > 0 && l.listedPrice != null);

  let pool = inSlot.length ? inSlot : stocked;
  if (event === "heatwave") {
    const drinks = pool.filter((l) => l.slot === "drink");
    if (drinks.length && rng() < 0.65) pool = drinks;
  }
  if (arch.id === "troll") {
    const odd = stocked.filter((l) => l.slot === "odd");
    if (odd.length) pool = odd;
  }

  if (!pool.length) {
    const line = arch.lines[Math.floor(rng() * arch.lines.length)] ?? arch.lines[0];
    if (rng() < arch.begChance) return { action: "beg", sku: null, line };
    return { action: "walk", sku: null, reason: "empty" };
  }

  const drinkBias = EVENTS[event].drinkBias;
  const weights = pool.map((l) => (l.slot === "drink" ? drinkBias : 1));
  const wsum = weights.reduce((s, w) => s + w, 0);
  let pick = rng() * wsum;
  let chosen = pool[0];
  for (let i = 0; i < pool.length; i++) {
    pick -= weights[i];
    if (pick <= 0) {
      chosen = pool[i];
      break;
    }
  }

  const listed = chosen.listedPrice ?? 0;
  // Each customer draws their own reservation around the archetype mean, so two
  // regulars do not share one threshold. Bounded at +/-3 sigma, so the
  // multiplier stays positive for every archetype.
  const spread = 1 + RESERVATION_SIGMA * gaussish(rng);
  const capBps = arch.reservationBps * spread;
  const cap = Math.round((chosen.wholesaleCost * capBps) / 10000);
  const reservation = event === "payday" ? Math.round(cap * 1.15) : cap;

  if (listed > reservation || rng() > arch.buyChance) {
    const line = arch.lines[Math.floor(rng() * arch.lines.length)] ?? arch.lines[0];
    if (rng() < arch.begChance) return { action: "beg", sku: chosen.sku, line };
    return { action: "walk", sku: chosen.sku, reason: "too_expensive" };
  }

  if (rng() < arch.begChance * 0.35) {
    const line = arch.lines[Math.floor(rng() * arch.lines.length)] ?? arch.lines[0];
    return { action: "beg", sku: chosen.sku, line };
  }

  return { action: "buy", sku: chosen.sku };
}

export function npcBudget(rng: Rng, arch: Archetype): number {
  const base = arch.id === "troll" ? 90 : arch.id === "office" ? 28 : 18;
  return base + Math.floor(rng() * 16);
}

export function npcName(rng: Rng, day: number, index: number): string {
  const name = NPC_NAMES[Math.floor(rng() * NPC_NAMES.length)] ?? "Pat";
  return `${name} ${day}.${index + 1}`;
}
