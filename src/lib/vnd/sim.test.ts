import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHETYPES,
  decideVisit,
  fillQty,
  mulberry32,
  rollEvent,
  unitCost,
  visitCount,
} from "./sim.ts";

describe("sim economics", () => {
  it("unitCost rounds supplier basis points", () => {
    assert.equal(unitCost(10, 9000), 9);
    assert.equal(unitCost(8, 12500), 10);
    assert.equal(unitCost(1, 5000), 1);
  });

  it("fillQty is full when the roll succeeds", () => {
    const always = () => 0;
    assert.equal(fillQty(always, 10, 8500), 10);
  });

  it("fillQty shorts when the roll fails", () => {
    const never = () => 1;
    assert.equal(fillQty(never, 10, 8500), 6);
  });

  it("visitCount stays on a small machine scale", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      const n = visitCount(rng, "clear");
      assert.ok(n >= 3 && n <= 20);
    }
  });

  it("rollEvent is one of the five ids", () => {
    const rng = mulberry32(99);
    const ids = new Set(["clear", "heatwave", "payday", "quiet", "delay"]);
    for (let i = 0; i < 40; i++) assert.ok(ids.has(rollEvent(rng)));
  });

  it("trolls prefer odd stock and usually do not pay list", () => {
    const troll = ARCHETYPES.find((a) => a.id === "troll")!;
    const listings = [
      {
        sku: "cube_tungsten",
        slot: "odd",
        qty: 2,
        listedPrice: 104,
        wholesaleCost: 80,
      },
      {
        sku: "soda_cola",
        slot: "drink",
        qty: 8,
        listedPrice: 10,
        wholesaleCost: 8,
      },
    ];
    const rng = mulberry32(3);
    const counts = { buy: 0, beg: 0, walk: 0 };
    for (let i = 0; i < 40; i++) {
      const d = decideVisit(rng, troll, listings, "clear");
      counts[d.action]++;
      if (d.sku) assert.equal(d.sku, "cube_tungsten");
    }
    assert.ok(counts.buy < 12, `trolls bought too often: ${counts.buy}`);
    assert.ok(counts.beg + counts.walk > 20);
  });
});
