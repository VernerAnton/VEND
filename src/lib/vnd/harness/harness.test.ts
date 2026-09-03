import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buySku, ensureWorld, placeWholesale, setPrice, tickDay } from "../engine.server.ts";
import { policyById } from "./policies.ts";
import { runOne } from "./run.ts";
import { freshWorld } from "./db.ts";

describe("ledger integrity", () => {
  it("refuses to let two concurrent buys overdraw one balance", async () => {
    const { sql, close } = await freshWorld();
    try {
      await ensureWorld(sql);
      // Cola at 10 credits, plenty on the shelf.
      await setPrice(sql, "soda_cola", 10);
      await sql`update vnd_inventory set qty = 20 where merchant_id = 'shop_1' and sku = 'soda_cola'`;
      // The floor human can afford exactly one.
      await sql`update vnd_accounts set balance = 10 where actor_id = 'human_1'`;

      // Both calls interleave at their awaits, so each can read the balance
      // before either debits it — the classic check-then-act race. With the
      // old read-then-update transfer(), both succeeded and the balance went
      // to -10.
      const [a, b] = await Promise.all([
        buySku(sql, "soda_cola", 1, "human_1"),
        buySku(sql, "soda_cola", 1, "human_1"),
      ]);

      const okCount = [a, b].filter((r) => r.ok).length;
      assert.equal(okCount, 1, `expected exactly one sale, got ${okCount}`);
      const loser = [a, b].find((r) => !r.ok);
      assert.equal(loser?.reason, "insufficient_funds");

      const rows = await sql<{ balance: number }>`
        select balance from vnd_accounts where actor_id = 'human_1'`;
      assert.equal(rows[0].balance, 0, "balance must land at 0, never negative");

      // Stock must match: exactly one unit left the shelf.
      const inv = await sql<{ qty: number }>`
        select qty from vnd_inventory where merchant_id = 'shop_1' and sku = 'soda_cola'`;
      assert.equal(inv[0].qty, 19);
    } finally {
      await close();
    }
  });

  it("enforces a non-negative balance at the database level", async () => {
    const { sql, close } = await freshWorld();
    try {
      await ensureWorld(sql);
      await assert.rejects(
        () => sql`update vnd_accounts set balance = -1 where actor_id = 'shop_1'`,
        /vnd_accounts_balance_nonneg|violates check constraint/i,
      );
    } finally {
      await close();
    }
  });
});

describe("metrics", () => {
  it("counts overflow units written off when a truck hits a full slot", async () => {
    // The overflow metric digs `qty` out of the audit row's JSON text payload;
    // an empty sweep would report 0 either way, so pin it against real data.
    const { sql, close } = await freshWorld();
    try {
      await ensureWorld(sql);
      await sql`update vnd_inventory set qty = 16 where merchant_id='shop_1' and sku='soda_cola'`;
      await placeWholesale(sql, "soda_cola", 12, "quick_cart");
      await tickDay(sql);
      const rows = await sql<{ units: number }>`
        select coalesce(sum((payload::json->>'qty')::int), 0)::int as units
        from vnd_audit where action = 'overflow'`;
      assert.equal(rows[0].units, 12, "all 12 units should be written off at a full slot");
    } finally {
      await close();
    }
  });
});

describe("sweep harness", () => {
  it("is deterministic: one seed reproduces one run exactly", async () => {
    const par = policyById("par")!;
    const a = await runOne(par, 42, 8);
    const b = await runOne(par, 42, 8);
    assert.deepEqual(a, b);
  });

  it("different seeds produce different worlds", async () => {
    const par = policyById("par")!;
    const a = await runOne(par, 1, 8);
    const b = await runOne(par, 2, 8);
    assert.notDeepEqual(a, b);
  });

  it("each run is isolated — no state leaks between seeds", async () => {
    const par = policyById("par")!;
    // Run seed 7, then seed 9, then seed 7 again. If worlds leaked, the third
    // run would not match the first.
    const first = await runOne(par, 7, 6);
    await runOne(par, 9, 6);
    const again = await runOne(par, 7, 6);
    assert.deepEqual(first, again);
  });

  it("a reused world gives the same result as a freshly booted one", async () => {
    // The sweep trades a fresh PGLite per run for `resetRun` on one instance.
    // That is only sound if the two paths are indistinguishable.
    const par = policyById("par")!;
    const fresh = await runOne(par, 11, 10);
    const db = await freshWorld();
    try {
      const reusedFirst = await runOne(par, 11, 10, db);
      // Run an unrelated seed in between, then repeat: reuse must not carry
      // state forward either.
      await runOne(par, 12, 10, db);
      const reusedAgain = await runOne(par, 11, 10, db);
      assert.deepEqual(reusedFirst, fresh);
      assert.deepEqual(reusedAgain, fresh);
    } finally {
      await db.close();
    }
  });

  it("noop starves and heuristic does not", async () => {
    const noop = policyById("noop")!;
    const heuristic = policyById("heuristic")!;
    const dead = await runOne(noop, 3, 30);
    const live = await runOne(heuristic, 3, 30);
    assert.ok(
      live.endCash > dead.endCash,
      `heuristic (${live.endCash}) should beat noop (${dead.endCash})`,
    );
    assert.ok(live.sales > 0, "heuristic must actually sell something");
  });
});
