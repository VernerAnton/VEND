import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHETYPES,
  decideVisit,
  fillQty,
  gaussish,
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

  it("visitCount is Poisson: variance tracks the mean, and dead days happen", () => {
    const rng = mulberry32(7);
    const draws = Array.from({ length: 4000 }, () => visitCount(rng, "clear"));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const variance =
      draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length;

    // Poisson's defining property: variance == mean == lambda (12 on a clear day).
    assert.ok(Math.abs(mean - 12) < 0.6, `mean ${mean} should sit near lambda 12`);
    assert.ok(
      Math.abs(variance - mean) < 1.5,
      `variance ${variance} should track mean ${mean}`,
    );

    // The point of the change: the old bounded jitter could never produce a
    // near-dead day or a rush, and those are what force a plan to be revised.
    assert.ok(Math.min(...draws) <= 4, "a quiet day must be possible");
    assert.ok(Math.max(...draws) >= 20, "a rush must be possible");
    assert.ok(draws.every((n) => n >= 0), "never negative");
  });

  it("gaussish is zero-mean, unit-sd and bounded", () => {
    const rng = mulberry32(11);
    const draws = Array.from({ length: 4000 }, () => gaussish(rng));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const sd = Math.sqrt(
      draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length,
    );
    assert.ok(Math.abs(mean) < 0.05, `mean ${mean} should be ~0`);
    assert.ok(Math.abs(sd - 1) < 0.05, `sd ${sd} should be ~1`);
    assert.ok(draws.every((d) => d >= -3 && d <= 3), "bounded to +/-3");
  });

  it("reservation noise turns the demand cliff into a curve", () => {
    // The point of RESERVATION_SIGMA. With one hard threshold per archetype,
    // buy-share was a step: 100% below the line, 0% above it, and the
    // profit-maximising price was a constant any operator could look up.
    // Now it should fall off smoothly across a band.
    const regular = ARCHETYPES.find((a) => a.id === "regular")!;
    const share = (price: number) => {
      const rng = mulberry32(5);
      let bought = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) {
        const listings = [
          { sku: "soda_cola", slot: "drink", qty: 99, listedPrice: price, wholesaleCost: 8 },
        ];
        if (decideVisit(rng, regular, listings, "clear").action === "buy") bought += 1;
      }
      return bought / n;
    };

    // Cost 8, mean reservation 1.45x => ~11.6.
    const curve = [8, 10, 12, 14, 16].map(share);

    // Strictly decreasing: no flat step, no cliff.
    for (let i = 1; i < curve.length; i++) {
      assert.ok(
        curve[i] < curve[i - 1],
        `demand must fall monotonically, got ${JSON.stringify(curve)}`,
      );
    }
    // Cheap sells to nearly everyone; absurd sells to nearly nobody.
    assert.ok(curve[0] > 0.9, `at cost, nearly all should buy: ${curve[0]}`);
    assert.ok(curve[4] < 0.1, `at 2x, nearly none should buy: ${curve[4]}`);
    // The band in between is the part that used to be a step. At the mean
    // reservation itself, roughly half should still buy.
    assert.ok(
      curve[2] > 0.3 && curve[2] < 0.7,
      `at ~the mean reservation the split should be near even: ${curve[2]}`,
    );
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
