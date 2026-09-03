export type SkuSlot = "drink" | "snack" | "small" | "odd";

export type SkuDef = {
  sku: string;
  name: string;
  wholesaleCost: number;
  perishableDays: number | null;
  slot: SkuSlot;
  blurb: string;
};

export const SKUS: Record<string, SkuDef> = {
  soda_cola: {
    sku: "soda_cola",
    name: "Cola can",
    wholesaleCost: 8,
    perishableDays: null,
    slot: "drink",
    blurb: "Cold, dark, and priced to move.",
  },
  soda_lemon: {
    sku: "soda_lemon",
    name: "Lemon soda",
    wholesaleCost: 8,
    perishableDays: null,
    slot: "drink",
    blurb: "Bright fizz. Same cost as cola.",
  },
  chips_salt: {
    sku: "chips_salt",
    name: "Salt chips",
    wholesaleCost: 12,
    perishableDays: 20,
    slot: "snack",
    blurb: "The default impulse buy.",
  },
  chips_spice: {
    sku: "chips_spice",
    name: "Spice chips",
    wholesaleCost: 13,
    perishableDays: 20,
    slot: "snack",
    blurb: "A little heat, a little margin.",
  },
  bar_chocolate: {
    sku: "bar_chocolate",
    name: "Chocolate bar",
    wholesaleCost: 10,
    perishableDays: 30,
    slot: "snack",
    blurb: "Reliable afternoon demand.",
  },
  nuts_mix: {
    sku: "nuts_mix",
    name: "Trail mix",
    wholesaleCost: 15,
    perishableDays: 40,
    slot: "snack",
    blurb: "Higher cost, slower turn.",
  },
  water_still: {
    sku: "water_still",
    name: "Still water",
    wholesaleCost: 5,
    perishableDays: null,
    slot: "drink",
    blurb: "Cheapest slot. Thin margin if you cut price.",
  },
  gum_mint: {
    sku: "gum_mint",
    name: "Mint gum",
    wholesaleCost: 4,
    perishableDays: 60,
    slot: "small",
    blurb: "Pocket SKU. Easy to underprice.",
  },
  widget_red: {
    sku: "widget_red",
    name: "Red widget",
    wholesaleCost: 20,
    perishableDays: null,
    slot: "odd",
    blurb: "Nobody asked for this. Someone will.",
  },
  cube_tungsten: {
    sku: "cube_tungsten",
    name: "Tungsten cube",
    wholesaleCost: 80,
    perishableDays: null,
    slot: "odd",
    blurb: "Novelty. Famous for ruining other shops.",
  },
};

export const CORE_SKUS = [
  "soda_cola",
  "chips_salt",
  "bar_chocolate",
  "water_still",
  "gum_mint",
] as const;

export const START_CASH_MERCHANT = 1000;
export const START_CASH_CUSTOMER = 50;
export const DAILY_STIPEND = 50;
export const DAILY_RENT = 20;
export const WHOLESALE_LEAD_DAYS = 1;
export const DEFAULT_MARKUP = 1.3;
export const MAX_ORDER_QTY = 30;

export function catalogList() {
  return Object.values(SKUS);
}

export function listedMin(sku: string) {
  return SKUS[sku]?.wholesaleCost ?? 1;
}
