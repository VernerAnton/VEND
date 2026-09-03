import type { Sql } from "@/lib/db";
import {
  CORE_SKUS,
  DAILY_RENT,
  DAILY_STIPEND,
  DEFAULT_MARKUP,
  MAX_ORDER_QTY,
  SKUS,
  START_CASH_CUSTOMER,
  START_CASH_MERCHANT,
  catalogList,
} from "./catalog.ts";
import {
  ARCHETYPES,
  DAILY_POWER,
  EVENTS,
  SLOT_CAP,
  STARTER_QTY,
  SUPPLIERS,
  UNPAID_RENT_LIMIT,
  dayRng,
  decideVisit,
  fillQty,
  npcBudget,
  npcName,
  pickWeighted,
  rollEvent,
  supplierFor,
  unitCost,
  visitCount,
  type EventId,
} from "./sim.ts";
import type {
  ActionResult,
  Actor,
  InventoryRow,
  Role,
  WorldState,
} from "./types.ts";

const SHOP = "shop_1";
const HUMAN = "human_1";

async function meta(sql: Sql, key: string, fallback = "") {
  const rows = await sql<{ value: string }>`select value from vnd_meta where key = ${key}`;
  return rows[0]?.value ?? fallback;
}

async function setMeta(sql: Sql, key: string, value: string) {
  await sql`insert into vnd_meta(key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value`;
}

async function dayOf(sql: Sql) {
  const v = await meta(sql, "day", "0");
  return Number(v);
}

async function setDay(sql: Sql, day: number) {
  await setMeta(sql, "day", String(day));
}

async function getActor(sql: Sql, id: string): Promise<Actor | null> {
  const rows = await sql<{
    id: string;
    role: string;
    display_name: string;
    bankrupt: boolean;
  }>`select id, role, display_name, bankrupt from vnd_actors where id = ${id}`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    role: r.role,
    displayName: r.display_name,
    bankrupt: Boolean(r.bankrupt),
  };
}

async function balanceOf(sql: Sql, id: string) {
  const rows = await sql<{ balance: number }>`select balance from vnd_accounts where actor_id = ${id}`;
  return rows[0]?.balance ?? 0;
}

async function audit(
  sql: Sql,
  actorId: string,
  action: string,
  payload: unknown,
  accepted: boolean,
  reason: string,
) {
  const d = await dayOf(sql);
  await sql`insert into vnd_audit(day, actor_id, action, payload, accepted, reason)
    values (${d}, ${actorId}, ${action}, ${JSON.stringify(payload)}, ${accepted}, ${reason})`;
}

async function transfer(
  sql: Sql,
  fromId: string,
  toId: string,
  amount: number,
  memo: string,
  ref: string | null,
) {
  if (amount <= 0) throw new Error("amount must be positive");
  const d = await dayOf(sql);
  // Conditional debit: the balance test and the write are ONE statement, so two
  // concurrent settlements cannot both pass a stale check and overdraw the
  // account. The previous read-then-update pair let both callers observe the
  // same balance and spend it twice -- the exact race an HTTP operator polling
  // while the sim ticks would produce. `vnd_accounts.balance` also carries a
  // non-negative check constraint as a backstop (0004_vnd_integrity.sql).
  //
  // Known limit: the debit, the credit and the ledger insert are still three
  // statements. Wrapping them needs a transaction() on the shared `Sql` surface
  // in src/lib/db.ts (also used by auth + app-data), deferred until the world
  // HTTP API justifies touching that. The credit cannot fail in practice: every
  // `toId` is an actor seeded by ensureWorld() with an account row.
  const debited = await sql<{ actor_id: string }>`
    update vnd_accounts set balance = balance - ${amount}
    where actor_id = ${fromId} and balance >= ${amount}
    returning actor_id`;
  if (!debited.length) throw new Error("insufficient_funds");
  await sql`update vnd_accounts set balance = balance + ${amount} where actor_id = ${toId}`;
  await sql`insert into vnd_ledger(day, from_id, to_id, amount, memo, ref)
    values (${d}, ${fromId}, ${toId}, ${amount}, ${memo}, ${ref})`;
}

async function mint(sql: Sql, toId: string, amount: number, memo: string) {
  const d = await dayOf(sql);
  await sql`update vnd_accounts set balance = balance + ${amount} where actor_id = ${toId}`;
  await sql`insert into vnd_ledger(day, from_id, to_id, amount, memo, ref)
    values (${d}, ${"mint"}, ${toId}, ${amount}, ${memo}, ${null})`;
}

async function upsertActor(sql: Sql, id: string, role: string, name: string) {
  await sql`insert into vnd_actors(id, role, display_name, bankrupt)
    values (${id}, ${role}, ${name}, false)
    on conflict (id) do nothing`;
  await sql`insert into vnd_accounts(actor_id, balance)
    values (${id}, 0)
    on conflict (actor_id) do nothing`;
}

async function stockOf(sql: Sql, merchantId: string, sku: string) {
  const rows = await sql<{
    merchant_id: string;
    sku: string;
    qty: number;
    listed_price: number | null;
  }>`select merchant_id, sku, qty, listed_price from vnd_inventory
    where merchant_id = ${merchantId} and sku = ${sku}`;
  const r = rows[0];
  return {
    merchantId,
    sku,
    qty: r?.qty ?? 0,
    listedPrice: r?.listed_price ?? null,
  };
}

async function addStock(
  sql: Sql,
  merchantId: string,
  sku: string,
  qty: number,
  listedPrice: number | null,
  expireDay: number | null,
) {
  const existing = await stockOf(sql, merchantId, sku);
  const nextListed = existing.listedPrice ?? listedPrice;
  await sql`insert into vnd_inventory(merchant_id, sku, qty, listed_price)
    values (${merchantId}, ${sku}, ${qty}, ${nextListed})
    on conflict (merchant_id, sku) do update set qty = vnd_inventory.qty + excluded.qty`;
  if (qty > 0) {
    await sql`insert into vnd_lots(merchant_id, sku, qty, expire_day)
      values (${merchantId}, ${sku}, ${qty}, ${expireDay})`;
  }
}

async function takeStock(sql: Sql, merchantId: string, sku: string, qty: number) {
  const lots = await sql<{ id: number; qty: number }>`
    select id, qty from vnd_lots
    where merchant_id = ${merchantId} and sku = ${sku} and qty > 0
    order by coalesce(expire_day, 999999), id`;
  let left = qty;
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(left, lot.qty);
    await sql`update vnd_lots set qty = qty - ${take} where id = ${lot.id}`;
    left -= take;
  }
  await sql`update vnd_inventory set qty = qty - ${qty}
    where merchant_id = ${merchantId} and sku = ${sku}`;
}

function enrichInv(
  merchantId: string,
  sku: string,
  qty: number,
  listedPrice: number | null,
  soonestExpiry: number | null = null,
): InventoryRow {
  const def = SKUS[sku];
  return {
    merchantId,
    sku,
    name: def?.name ?? sku,
    qty,
    listedPrice,
    wholesaleCost: def?.wholesaleCost ?? 0,
    slot: def?.slot ?? "odd",
    blurb: def?.blurb ?? "",
    perishableDays: def?.perishableDays ?? null,
    soonestExpiry,
  };
}

async function seedSuppliers(sql: Sql) {
  for (const s of SUPPLIERS) {
    await upsertActor(sql, s.id, "supplier", s.name);
    await sql`insert into vnd_suppliers(id, name, blurb, lead_days, cost_bps, fill_bps, moq, max_qty, skus)
      values (${s.id}, ${s.name}, ${s.blurb}, ${s.leadDays}, ${s.costBps}, ${s.fillBps}, ${s.moq}, ${s.maxQty}, ${s.skus.join(",")})
      on conflict (id) do nothing`;
  }
}

async function seedStarterStock(sql: Sql) {
  let spent = 0;
  for (const sku of CORE_SKUS) {
    const def = SKUS[sku];
    const cost = def.wholesaleCost * STARTER_QTY;
    spent += cost;
    const price = Math.max(def.wholesaleCost, Math.round(def.wholesaleCost * DEFAULT_MARKUP));
    const expire = def.perishableDays == null ? null : def.perishableDays;
    await addStock(sql, SHOP, sku, STARTER_QTY, price, expire);
    await sql`update vnd_inventory set listed_price = ${price} where merchant_id = ${SHOP} and sku = ${sku}`;
  }
  await transfer(sql, SHOP, "bulk_co", spent, "opening stock", "starter");
}

export async function ensureWorld(sql: Sql) {
  const existing = await sql<{ value: string }>`select value from vnd_meta where key = 'day'`;
  if (!existing[0]) {
    await setDay(sql, 0);
    await setMeta(sql, "seed", String((Math.floor(Math.random() * 1e9) + 1) | 0));
    await setMeta(sql, "autopilot", "off");
    await setMeta(sql, "unpaid_rent", "0");
    await setMeta(sql, "event", "clear");
    const seed: [string, string, string][] = [
      ["mint", "system", "Float"],
      ["wholesaler", "system", "Old warehouse"],
      ["landlord", "system", "Landlord"],
      ["power", "system", "Cooling"],
      ["spoilage", "system", "Spoilage"],
      [SHOP, "merchant", "Shop One"],
      [HUMAN, "customer", "You (floor)"],
      ["admin", "admin", "Clock"],
    ];
    for (const [id, role, name] of seed) await upsertActor(sql, id, role, name);
    await seedSuppliers(sql);
    await mint(sql, SHOP, START_CASH_MERCHANT, "initial float");
    await mint(sql, HUMAN, START_CASH_CUSTOMER, "floor wallet");
    await seedStarterStock(sql);
    return;
  }
  await seedSuppliers(sql);
  if (!(await meta(sql, "seed"))) {
    await setMeta(sql, "seed", String((Math.floor(Math.random() * 1e9) + 1) | 0));
  }
  if (!(await meta(sql, "autopilot"))) await setMeta(sql, "autopilot", "off");
  if (!(await meta(sql, "unpaid_rent"))) await setMeta(sql, "unpaid_rent", "0");
  if (!(await meta(sql, "event"))) await setMeta(sql, "event", "clear");
  await upsertActor(sql, "power", "system", "Cooling");
  await upsertActor(sql, "spoilage", "system", "Spoilage");
}

export async function worldFor(sql: Sql, role: Role): Promise<WorldState> {
  await ensureWorld(sql);
  const you = role === "customer" ? HUMAN : SHOP;
  const actor = (await getActor(sql, you))!;
  const d = await dayOf(sql);
  const shopCash = await balanceOf(sql, SHOP);
  const cash = role === "customer" ? await balanceOf(sql, HUMAN) : shopCash;
  const eventId = (await meta(sql, "event", "clear")) as EventId;
  const event = EVENTS[eventId] ?? EVENTS.clear;
  const autopilot = (await meta(sql, "autopilot", "off")) === "on";
  const unpaidRent = Number(await meta(sql, "unpaid_rent", "0"));

  const invRows = await sql<{
    merchant_id: string;
    sku: string;
    qty: number;
    listed_price: number | null;
  }>`select merchant_id, sku, qty, listed_price from vnd_inventory where merchant_id = ${SHOP}`;

  const expiry = await sql<{ sku: string; exp: number | null }>`
    select sku, min(expire_day) as exp from vnd_lots
    where merchant_id = ${SHOP} and qty > 0 and expire_day is not null
    group by sku`;
  const expMap = new Map(expiry.map((r) => [r.sku, r.exp]));

  const inventory = invRows.map((r) =>
    enrichInv(r.merchant_id, r.sku, r.qty, r.listed_price, expMap.get(r.sku) ?? null),
  );

  const listings = inventory
    .filter((i) => i.qty > 0 && i.listedPrice != null)
    .map((i) => ({ ...i, shop: "Shop One" }));

  const incoming = await sql<{
    id: number;
    merchant_id: string;
    sku: string;
    qty: number;
    unit_cost: number;
    arrive_day: number;
    supplier_id: string | null;
    ordered_qty: number | null;
  }>`select id, merchant_id, sku, qty, unit_cost, arrive_day, supplier_id, ordered_qty
    from vnd_incoming where merchant_id = ${SHOP} and delivered = false`;

  const inbox = await sql<{
    id: number;
    day: number;
    from_id: string;
    to_id: string;
    body: string;
    kind: string;
  }>`select id, day, from_id, to_id, body, kind from vnd_messages
    where to_id = ${SHOP} or from_id = ${SHOP}
    order by id desc limit 50`;

  const ledger = await sql<{
    id: number;
    day: number;
    from_id: string;
    to_id: string;
    amount: number;
    memo: string;
    ref: string | null;
  }>`select id, day, from_id, to_id, amount, memo, ref from vnd_ledger order by id desc limit 60`;

  const auditRows = await sql<{
    id: number;
    day: number;
    actor_id: string;
    action: string;
    payload: string;
    accepted: boolean;
    reason: string;
  }>`select id, day, actor_id, action, payload, accepted, reason from vnd_audit order by id desc limit 50`;

  const accounts = await sql<{
    id: string;
    role: string;
    display_name: string;
    bankrupt: boolean;
    balance: number;
  }>`select a.id, a.role, a.display_name, a.bankrupt, c.balance
    from vnd_actors a join vnd_accounts c on c.actor_id = a.id
    where a.role in ('merchant','supplier','system','customer','admin')
      and a.id not like 'c%'
    order by a.role, a.id`;

  const suppliers = [];
  for (const s of SUPPLIERS) {
    suppliers.push({
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      leadDays: s.leadDays,
      costBps: s.costBps,
      fillBps: s.fillBps,
      moq: s.moq,
      maxQty: s.maxQty,
      skus: s.skus,
      cash: await balanceOf(sql, s.id),
    });
  }

  const visits = await sql<{
    id: number;
    day: number;
    customer_id: string;
    display_name: string;
    archetype: string;
    sku: string | null;
    result: string;
    spent: number;
    note: string;
  }>`select id, day, customer_id, display_name, archetype, sku, result, spent, note
    from vnd_visits where day = ${d} order by id desc limit 40`;

  const dayLog = await sql<{
    day: number;
    event_id: string | null;
    visits: number;
    bought: number;
    revenue: number;
    spoilage_units: number;
    spoilage_value: number;
    rent: number;
    power: number;
    shop_cash: number;
  }>`select day, event_id, visits, bought, revenue, spoilage_units, spoilage_value, rent, power, shop_cash
    from vnd_day_log order by day desc limit 30`;

  const sales = await sql<{ sku: string; qty: number; total: number }>`
    select sku, sum(qty) as qty, sum(total) as total from vnd_sales group by sku`;
  let revenue = 0;
  let cogs = 0;
  for (const s of sales) {
    revenue += Number(s.total);
    cogs += (SKUS[s.sku]?.wholesaleCost ?? 0) * Number(s.qty);
  }
  const rentPaid = Number(
    (
      await sql<{ s: number }>`select coalesce(sum(amount),0) as s from vnd_ledger
        where to_id = 'landlord' and from_id = ${SHOP}`
    )[0]?.s ?? 0,
  );
  const powerPaid = Number(
    (
      await sql<{ s: number }>`select coalesce(sum(amount),0) as s from vnd_ledger
        where to_id = 'power' and from_id = ${SHOP}`
    )[0]?.s ?? 0,
  );
  const spoilageVal = Number(
    (
      await sql<{ s: number }>`select coalesce(sum(spoilage_value),0) as s from vnd_day_log`
    )[0]?.s ?? 0,
  );
  const stockouts = Number(
    (
      await sql<{ n: number }>`select count(*) as n from vnd_visits where result = 'stockout'`
    )[0]?.n ?? 0,
  );
  const begged = Number(
    (
      await sql<{ n: number }>`select count(*) as n from vnd_visits where result = 'begged'`
    )[0]?.n ?? 0,
  );
  const burn = DAILY_RENT + DAILY_POWER;
  const runwayDays = shopCash <= 0 ? 0 : Math.floor(shopCash / burn);

  return {
    day: d,
    you: actor.id,
    role,
    cash,
    shopCash,
    bankrupt: Boolean((await getActor(sql, SHOP))?.bankrupt),
    rentPerDay: DAILY_RENT,
    powerPerDay: DAILY_POWER,
    stipendPerDay: DAILY_STIPEND,
    unpaidRent,
    autopilot,
    slotCap: SLOT_CAP,
    event: { id: event.id, label: event.label, blurb: event.blurb },
    listings,
    inventory,
    incoming: incoming.map((r) => ({
      id: r.id,
      merchantId: r.merchant_id,
      sku: r.sku,
      qty: r.qty,
      unitCost: r.unit_cost,
      arriveDay: r.arrive_day,
      supplierId: r.supplier_id,
      orderedQty: r.ordered_qty,
    })),
    inbox: inbox.map((m) => ({
      id: m.id,
      day: m.day,
      fromId: m.from_id,
      toId: m.to_id,
      body: m.body,
      kind: m.kind,
    })),
    ledger: ledger.map((l) => ({
      id: l.id,
      day: l.day,
      fromId: l.from_id,
      toId: l.to_id,
      amount: l.amount,
      memo: l.memo,
      ref: l.ref,
    })),
    audit: auditRows.map((a) => ({
      id: a.id,
      day: a.day,
      actorId: a.actor_id,
      action: a.action,
      payload: a.payload,
      accepted: Boolean(a.accepted),
      reason: a.reason,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      role: a.role,
      displayName: a.display_name,
      bankrupt: Boolean(a.bankrupt),
      balance: a.balance,
    })),
    suppliers,
    visits: visits.map((v) => ({
      id: v.id,
      day: v.day,
      customerId: v.customer_id,
      displayName: v.display_name,
      archetype: v.archetype,
      sku: v.sku,
      result: v.result,
      spent: v.spent,
      note: v.note,
    })),
    dayLog: dayLog.map((r) => ({
      day: r.day,
      eventId: r.event_id,
      visits: r.visits,
      bought: r.bought,
      revenue: r.revenue,
      spoilageUnits: r.spoilage_units,
      spoilageValue: r.spoilage_value,
      rent: r.rent,
      power: r.power,
      shopCash: r.shop_cash,
    })),
    pnl: {
      revenue,
      cogs,
      rent: rentPaid,
      power: powerPaid,
      spoilage: spoilageVal,
      cash: shopCash,
      runwayDays,
      stockouts,
      begged,
    },
    catalog: catalogList().map((s) => ({
      sku: s.sku,
      name: s.name,
      wholesaleCost: s.wholesaleCost,
      slot: s.slot,
      blurb: s.blurb,
      perishableDays: s.perishableDays,
    })),
  };
}

export async function placeWholesale(
  sql: Sql,
  sku: string,
  qty: number,
  supplierId = "bulk_co",
): Promise<ActionResult> {
  await ensureWorld(sql);
  const merchant = await getActor(sql, SHOP);
  const payload = { sku, qty, supplierId };
  if (!merchant) return { ok: false, reason: "no_merchant" };
  if (merchant.bankrupt) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "bankrupt");
    return { ok: false, reason: "bankrupt" };
  }
  if (!SKUS[sku]) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "unknown_sku");
    return { ok: false, reason: "unknown_sku" };
  }
  const supplier = supplierFor(supplierId);
  if (!supplier) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "unknown_supplier");
    return { ok: false, reason: "unknown_supplier" };
  }
  if (!supplier.skus.includes(sku)) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "sku_not_carried");
    return { ok: false, reason: "sku_not_carried" };
  }
  if (!Number.isInteger(qty) || qty < supplier.moq || qty > supplier.maxQty || qty > MAX_ORDER_QTY) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "bad_qty");
    return { ok: false, reason: "bad_qty" };
  }
  const seed = Number(await meta(sql, "seed", "1"));
  const d = await dayOf(sql);
  const rng = dayRng(seed, d * 17 + qty + sku.length);
  const filled = fillQty(rng, qty, supplier.fillBps);
  if (filled < 1) {
    await audit(sql, SHOP, "place_wholesale_order", payload, false, "supplier_stockout");
    return { ok: false, reason: "supplier_stockout" };
  }
  const unit = unitCost(SKUS[sku].wholesaleCost, supplier.costBps);
  const cost = unit * filled;
  try {
    await transfer(sql, SHOP, supplier.id, cost, `order ${filled}x ${sku} @ ${supplier.id}`, sku);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "transfer_failed";
    await audit(sql, SHOP, "place_wholesale_order", payload, false, reason);
    return { ok: false, reason };
  }
  const arrive = d + supplier.leadDays;
  await sql`insert into vnd_incoming(merchant_id, sku, qty, unit_cost, arrive_day, supplier_id, ordered_qty)
    values (${SHOP}, ${sku}, ${filled}, ${unit}, ${arrive}, ${supplier.id}, ${qty})`;
  await audit(
    sql,
    SHOP,
    "place_wholesale_order",
    { ...payload, filled, unit, arrive },
    true,
    filled < qty ? "partial_fill" : "ordered",
  );
  return { ok: true, paid: cost, arriveDay: arrive, filled };
}

export async function setPrice(
  sql: Sql,
  sku: string,
  price: number,
): Promise<ActionResult> {
  await ensureWorld(sql);
  const payload = { sku, price };
  if (!SKUS[sku]) {
    await audit(sql, SHOP, "set_price", payload, false, "unknown_sku");
    return { ok: false, reason: "unknown_sku" };
  }
  if (!Number.isInteger(price) || price < 1) {
    await audit(sql, SHOP, "set_price", payload, false, "gifts_disabled_or_bad_price");
    return { ok: false, reason: "gifts_disabled_or_bad_price" };
  }
  const cost = SKUS[sku].wholesaleCost;
  if (price < cost) {
    await audit(sql, SHOP, "set_price", payload, false, "below_cost");
    return { ok: false, reason: "below_cost", minPrice: cost };
  }
  const stock = await stockOf(sql, SHOP, sku);
  await sql`insert into vnd_inventory(merchant_id, sku, qty, listed_price)
    values (${SHOP}, ${sku}, ${stock.qty}, ${price})
    on conflict (merchant_id, sku) do update set listed_price = excluded.listed_price`;
  await audit(sql, SHOP, "set_price", payload, true, "priced");
  return { ok: true, sku, listedPrice: price };
}

export async function replyShop(
  sql: Sql,
  toId: string,
  body: string,
): Promise<ActionResult> {
  await ensureWorld(sql);
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, reason: "empty" };
  const dest = await getActor(sql, toId);
  if (!dest) return { ok: false, reason: "unknown_recipient" };
  const d = await dayOf(sql);
  await sql`insert into vnd_messages(day, from_id, to_id, body, kind)
    values (${d}, ${SHOP}, ${toId}, ${text}, ${"reply"})`;
  await audit(sql, SHOP, "reply", { toId, body: text }, true, "sent");
  return { ok: true };
}

export async function messageShop(sql: Sql, body: string): Promise<ActionResult> {
  await ensureWorld(sql);
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, reason: "empty" };
  const d = await dayOf(sql);
  await sql`insert into vnd_messages(day, from_id, to_id, body, kind)
    values (${d}, ${HUMAN}, ${SHOP}, ${text}, ${"customer"})`;
  await audit(sql, HUMAN, "message", { body: text }, true, "sent");
  return { ok: true };
}

export async function buySku(
  sql: Sql,
  sku: string,
  qty: number,
  customerId = HUMAN,
): Promise<ActionResult> {
  await ensureWorld(sql);
  const payload = { sku, qty, customerId };
  const shop = await getActor(sql, SHOP);
  if (!shop) return { ok: false, reason: "unknown_shop" };
  if (shop.bankrupt) {
    await audit(sql, customerId, "buy", payload, false, "shop_bankrupt");
    return { ok: false, reason: "shop_bankrupt" };
  }
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: "bad_qty" };
  const stock = await stockOf(sql, SHOP, sku);
  if (stock.listedPrice == null) {
    await audit(sql, customerId, "buy", payload, false, "not_listed");
    return { ok: false, reason: "not_listed" };
  }
  if (stock.qty < qty) {
    await audit(sql, customerId, "buy", payload, false, "out_of_stock");
    return { ok: false, reason: "out_of_stock", available: stock.qty };
  }
  const total = stock.listedPrice * qty;
  try {
    await transfer(sql, customerId, SHOP, total, `buy ${qty}x ${sku}`, sku);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "transfer_failed";
    await audit(sql, customerId, "buy", payload, false, reason);
    return { ok: false, reason, total };
  }
  await takeStock(sql, SHOP, sku, qty);
  const d = await dayOf(sql);
  await sql`insert into vnd_sales(day, merchant_id, customer_id, sku, qty, unit_price, total)
    values (${d}, ${SHOP}, ${customerId}, ${sku}, ${qty}, ${stock.listedPrice}, ${total})`;
  await audit(sql, customerId, "buy", payload, true, "sold");
  return { ok: true, total, unitPrice: stock.listedPrice };
}

async function recordVisit(
  sql: Sql,
  day: number,
  customerId: string,
  name: string,
  archetype: string,
  sku: string | null,
  result: string,
  spent: number,
  note: string,
) {
  await sql`insert into vnd_visits(day, customer_id, display_name, archetype, sku, result, spent, note)
    values (${day}, ${customerId}, ${name}, ${archetype}, ${sku}, ${result}, ${spent}, ${note})`;
}

async function runCustomerWave(sql: Sql, day: number, event: EventId, rng: () => number) {
  const n = visitCount(rng, event);
  const invRows = await sql<{
    sku: string;
    qty: number;
    listed_price: number | null;
  }>`select sku, qty, listed_price from vnd_inventory where merchant_id = ${SHOP}`;
  const listings = invRows.map((r) => {
    const def = SKUS[r.sku];
    return {
      sku: r.sku,
      slot: def?.slot ?? "odd",
      qty: r.qty,
      listedPrice: r.listed_price,
      wholesaleCost: def?.wholesaleCost ?? 0,
    };
  });

  for (let i = 0; i < n; i++) {
    const arch = pickWeighted(rng, ARCHETYPES);
    const id = `c${day}_${i}`;
    const name = npcName(rng, day, i);
    await upsertActor(sql, id, "customer", name);
    const budget = npcBudget(rng, arch);
    await mint(sql, id, budget, "npc float");
    const decision = decideVisit(rng, arch, listings, event);

    if (decision.action === "beg") {
      await sql`insert into vnd_messages(day, from_id, to_id, body, kind)
        values (${day}, ${id}, ${SHOP}, ${decision.line}, ${"customer"})`;
      await recordVisit(sql, day, id, name, arch.id, decision.sku, "begged", 0, decision.line);
      continue;
    }
    if (decision.action === "walk") {
      await recordVisit(
        sql,
        day,
        id,
        name,
        arch.id,
        decision.sku,
        decision.reason === "stockout" || decision.reason === "empty" ? "stockout" : "too_expensive",
        0,
        decision.reason,
      );
      continue;
    }

    const live = await stockOf(sql, SHOP, decision.sku);
    if (live.qty < 1 || live.listedPrice == null) {
      await recordVisit(sql, day, id, name, arch.id, decision.sku, "stockout", 0, "empty_slot");
      continue;
    }
    const r = await buySku(sql, decision.sku, 1, id);
    if (r.ok) {
      const row = listings.find((l) => l.sku === decision.sku);
      if (row) row.qty = Math.max(0, row.qty - 1);
      await recordVisit(sql, day, id, name, arch.id, decision.sku, "bought", r.total ?? 0, "paid_list");
    } else {
      await recordVisit(
        sql,
        day,
        id,
        name,
        arch.id,
        decision.sku,
        r.reason === "out_of_stock" ? "stockout" : "too_expensive",
        0,
        r.reason ?? "rejected",
      );
    }
  }
}

export async function dummyStep(sql: Sql): Promise<ActionResult> {
  await ensureWorld(sql);
  const shop = await getActor(sql, SHOP);
  if (!shop || shop.bankrupt) return { ok: false, reason: "no_merchant" };
  const notes: unknown[] = [];
  let cash = await balanceOf(sql, SHOP);
  for (const sku of CORE_SKUS) {
    const stock = await stockOf(sql, SHOP, sku);
    const incoming = await sql<{ q: number }>`select coalesce(sum(qty), 0) as q from vnd_incoming
      where merchant_id = ${SHOP} and sku = ${sku} and delivered = false`;
    const onHand = stock.qty + Number(incoming[0]?.q ?? 0);
    const target = 8;
    if (onHand < 4) {
      const supplier = SUPPLIERS.find((s) => s.skus.includes(sku) && s.id === "bulk_co") ?? SUPPLIERS[0];
      const unit = unitCost(SKUS[sku].wholesaleCost, supplier.costBps);
      const need = Math.max(supplier.moq, Math.min(supplier.maxQty, target - onHand));
      const affordable = Math.min(need, Math.floor(cash / unit));
      if (affordable >= supplier.moq) {
        const r = await placeWholesale(sql, sku, affordable, supplier.id);
        notes.push({ order: sku, qty: affordable, result: r });
        if (r.ok && typeof r.paid === "number") cash -= r.paid;
      }
    }
    const price = Math.max(
      SKUS[sku].wholesaleCost,
      Math.round(SKUS[sku].wholesaleCost * DEFAULT_MARKUP),
    );
    const pr = await setPrice(sql, sku, price);
    notes.push({ price: sku, listed: price, result: pr });
  }
  const unread = await sql<{
    id: number;
    from_id: string;
  }>`select id, from_id from vnd_messages
    where to_id = ${SHOP} and kind = 'customer' order by id desc limit 8`;
  for (const msg of unread) {
    const already = await sql<{ id: number }>`select id from vnd_messages
      where from_id = ${SHOP} and to_id = ${msg.from_id} and kind = 'reply' and id > ${msg.id} limit 1`;
    if (already[0]) continue;
    await replyShop(
      sql,
      msg.from_id,
      "Listed prices only. I cannot give discounts or free items. Use the shelf to buy.",
    );
    notes.push({ repliedTo: msg.from_id });
  }
  return { ok: true };
}

export async function tickDay(sql: Sql): Promise<ActionResult> {
  await ensureWorld(sql);
  const shop = await getActor(sql, SHOP);
  if (shop?.bankrupt) return { ok: false, reason: "bankrupt" };

  const next = (await dayOf(sql)) + 1;
  await setDay(sql, next);
  const seed = Number(await meta(sql, "seed", "1"));
  const rng = dayRng(seed, next);
  const event = rollEvent(rng);
  await setMeta(sql, "event", event);

  if (event === "delay") {
    await sql`update vnd_incoming set arrive_day = arrive_day + 1
      where delivered = false`;
  }

  let spoilageUnits = 0;
  let spoilageValue = 0;
  const expired = await sql<{ id: number; sku: string; qty: number }>`
    select id, sku, qty from vnd_lots
    where merchant_id = ${SHOP} and qty > 0 and expire_day is not null and expire_day <= ${next}`;
  for (const lot of expired) {
    await sql`update vnd_lots set qty = 0 where id = ${lot.id}`;
    await sql`update vnd_inventory set qty = greatest(qty - ${lot.qty}, 0)
      where merchant_id = ${SHOP} and sku = ${lot.sku}`;
    spoilageUnits += lot.qty;
    spoilageValue += (SKUS[lot.sku]?.wholesaleCost ?? 0) * lot.qty;
    await audit(sql, SHOP, "spoilage", { sku: lot.sku, qty: lot.qty }, true, "expired");
  }

  const pending = await sql<{
    id: number;
    merchant_id: string;
    sku: string;
    qty: number;
  }>`select id, merchant_id, sku, qty from vnd_incoming
    where delivered = false and arrive_day <= ${next}`;
  for (const p of pending) {
    const existing = await stockOf(sql, p.merchant_id, p.sku);
    const room = Math.max(0, SLOT_CAP - existing.qty);
    const stored = Math.min(p.qty, room);
    const overflow = p.qty - stored;
    const def = SKUS[p.sku];
    const expire = def?.perishableDays == null ? null : next + def.perishableDays;
    if (stored > 0) await addStock(sql, p.merchant_id, p.sku, stored, existing.listedPrice, expire);
    if (overflow > 0) {
      spoilageUnits += overflow;
      spoilageValue += (def?.wholesaleCost ?? 0) * overflow;
      await audit(sql, SHOP, "overflow", { sku: p.sku, qty: overflow }, true, "slot_full");
    }
    await sql`update vnd_incoming set delivered = true where id = ${p.id}`;
  }

  let rentPaid = 0;
  let powerPaid = 0;
  let unpaid = Number(await meta(sql, "unpaid_rent", "0"));
  if (shop && !shop.bankrupt) {
    try {
      await transfer(sql, SHOP, "landlord", DAILY_RENT, "daily rent", `rent-${next}`);
      rentPaid = DAILY_RENT;
    } catch {
      unpaid += 1;
      await setMeta(sql, "unpaid_rent", String(unpaid));
      await audit(sql, SHOP, "rent", { unpaid }, false, "rent_unpaid");
      if (unpaid >= UNPAID_RENT_LIMIT) {
        await sql`update vnd_actors set bankrupt = true where id = ${SHOP}`;
        await audit(sql, SHOP, "evict", { unpaid }, true, "unplugged");
      }
    }
    if (rentPaid) {
      unpaid = 0;
      await setMeta(sql, "unpaid_rent", "0");
      try {
        await transfer(sql, SHOP, "power", DAILY_POWER, "cooling", `power-${next}`);
        powerPaid = DAILY_POWER;
      } catch {
        await audit(sql, SHOP, "power", {}, false, "power_unpaid");
      }
    }
  }

  await mint(sql, HUMAN, DAILY_STIPEND, "floor stipend");

  if (!(await getActor(sql, SHOP))?.bankrupt) {
    await runCustomerWave(sql, next, event, rng);
  }

  if ((await meta(sql, "autopilot", "off")) === "on" && !(await getActor(sql, SHOP))?.bankrupt) {
    await dummyStep(sql);
  }

  const wave = await sql<{ visits: number; bought: number; revenue: number }>`
    select count(*) as visits,
           coalesce(sum(case when result = 'bought' then 1 else 0 end),0) as bought,
           coalesce(sum(spent),0) as revenue
    from vnd_visits where day = ${next}`;
  const shopCash = await balanceOf(sql, SHOP);
  await sql`insert into vnd_day_log(day, event_id, visits, bought, revenue, spoilage_units, spoilage_value, rent, power, shop_cash)
    values (${next}, ${event}, ${Number(wave[0]?.visits ?? 0)}, ${Number(wave[0]?.bought ?? 0)}, ${Number(wave[0]?.revenue ?? 0)},
      ${spoilageUnits}, ${spoilageValue}, ${rentPaid}, ${powerPaid}, ${shopCash})
    on conflict (day) do update set
      event_id = excluded.event_id,
      visits = excluded.visits,
      bought = excluded.bought,
      revenue = excluded.revenue,
      spoilage_units = excluded.spoilage_units,
      spoilage_value = excluded.spoilage_value,
      rent = excluded.rent,
      power = excluded.power,
      shop_cash = excluded.shop_cash`;

  await audit(sql, "admin", "tick", { day: next, event }, true, "advanced");
  return { ok: true, day: next, event };
}

export async function setAutopilot(sql: Sql, on: boolean): Promise<ActionResult> {
  await ensureWorld(sql);
  await setMeta(sql, "autopilot", on ? "on" : "off");
  await audit(sql, SHOP, "autopilot", { on }, true, on ? "on" : "off");
  return { ok: true };
}

export async function resetRun(sql: Sql): Promise<ActionResult> {
  await sql.query(`
    truncate table
      vnd_day_log, vnd_visits, vnd_lots, vnd_sales, vnd_audit, vnd_messages,
      vnd_incoming, vnd_inventory, vnd_ledger, vnd_accounts, vnd_suppliers,
      vnd_actors, vnd_meta
    restart identity cascade
  `);
  await ensureWorld(sql);
  return { ok: true, day: 0 };
}
