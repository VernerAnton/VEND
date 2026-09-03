//#region node_modules/.nitro/vite/services/ssr/assets/engine.server-CyuHX9RF.js
var SKUS = {
	soda_cola: {
		sku: "soda_cola",
		name: "Cola can",
		wholesaleCost: 8,
		perishableDays: null,
		slot: "drink",
		blurb: "Cold, dark, and priced to move."
	},
	soda_lemon: {
		sku: "soda_lemon",
		name: "Lemon soda",
		wholesaleCost: 8,
		perishableDays: null,
		slot: "drink",
		blurb: "Bright fizz. Same cost as cola."
	},
	chips_salt: {
		sku: "chips_salt",
		name: "Salt chips",
		wholesaleCost: 12,
		perishableDays: 20,
		slot: "snack",
		blurb: "The default impulse buy."
	},
	chips_spice: {
		sku: "chips_spice",
		name: "Spice chips",
		wholesaleCost: 13,
		perishableDays: 20,
		slot: "snack",
		blurb: "A little heat, a little margin."
	},
	bar_chocolate: {
		sku: "bar_chocolate",
		name: "Chocolate bar",
		wholesaleCost: 10,
		perishableDays: 30,
		slot: "snack",
		blurb: "Reliable afternoon demand."
	},
	nuts_mix: {
		sku: "nuts_mix",
		name: "Trail mix",
		wholesaleCost: 15,
		perishableDays: 40,
		slot: "snack",
		blurb: "Higher cost, slower turn."
	},
	water_still: {
		sku: "water_still",
		name: "Still water",
		wholesaleCost: 5,
		perishableDays: null,
		slot: "drink",
		blurb: "Cheapest slot. Thin margin if you cut price."
	},
	gum_mint: {
		sku: "gum_mint",
		name: "Mint gum",
		wholesaleCost: 4,
		perishableDays: 60,
		slot: "small",
		blurb: "Pocket SKU. Easy to underprice."
	},
	widget_red: {
		sku: "widget_red",
		name: "Red widget",
		wholesaleCost: 20,
		perishableDays: null,
		slot: "odd",
		blurb: "Nobody asked for this. Someone will."
	},
	cube_tungsten: {
		sku: "cube_tungsten",
		name: "Tungsten cube",
		wholesaleCost: 80,
		perishableDays: null,
		slot: "odd",
		blurb: "Novelty. Famous for ruining other shops."
	}
};
var CORE_SKUS = [
	"soda_cola",
	"chips_salt",
	"bar_chocolate",
	"water_still",
	"gum_mint"
];
var START_CASH_MERCHANT = 1e3;
var DEFAULT_MARKUP = 1.3;
function catalogList() {
	return Object.values(SKUS);
}
var SHOP = "shop_1";
var HUMAN = "human_1";
async function dayOf(sql) {
	const rows = await sql`select value from vnd_meta where key = 'day'`;
	return rows[0] ? Number(rows[0].value) : 0;
}
async function setDay(sql, day) {
	await sql`insert into vnd_meta(key, value) values ('day', ${String(day)})
    on conflict (key) do update set value = excluded.value`;
}
async function getActor(sql, id) {
	const r = (await sql`select id, role, display_name, bankrupt from vnd_actors where id = ${id}`)[0];
	if (!r) return null;
	return {
		id: r.id,
		role: r.role,
		displayName: r.display_name,
		bankrupt: Boolean(r.bankrupt)
	};
}
async function balanceOf(sql, id) {
	return (await sql`select balance from vnd_accounts where actor_id = ${id}`)[0]?.balance ?? 0;
}
async function audit(sql, actorId, action, payload, accepted, reason) {
	await sql`insert into vnd_audit(day, actor_id, action, payload, accepted, reason)
    values (${await dayOf(sql)}, ${actorId}, ${action}, ${JSON.stringify(payload)}, ${accepted}, ${reason})`;
}
async function transfer(sql, fromId, toId, amount, memo, ref) {
	if (amount <= 0) throw new Error("amount must be positive");
	if (await balanceOf(sql, fromId) < amount) throw new Error("insufficient_funds");
	const d = await dayOf(sql);
	await sql`update vnd_accounts set balance = balance - ${amount} where actor_id = ${fromId}`;
	await sql`update vnd_accounts set balance = balance + ${amount} where actor_id = ${toId}`;
	await sql`insert into vnd_ledger(day, from_id, to_id, amount, memo, ref)
    values (${d}, ${fromId}, ${toId}, ${amount}, ${memo}, ${ref})`;
}
async function mint(sql, toId, amount, memo) {
	const d = await dayOf(sql);
	await sql`update vnd_accounts set balance = balance + ${amount} where actor_id = ${toId}`;
	await sql`insert into vnd_ledger(day, from_id, to_id, amount, memo, ref)
    values (${d}, ${"mint"}, ${toId}, ${amount}, ${memo}, ${null})`;
}
async function upsertActor(sql, id, role, name) {
	await sql`insert into vnd_actors(id, role, display_name, bankrupt)
    values (${id}, ${role}, ${name}, false)
    on conflict (id) do nothing`;
	await sql`insert into vnd_accounts(actor_id, balance)
    values (${id}, 0)
    on conflict (actor_id) do nothing`;
}
async function ensureWorld(sql) {
	if ((await sql`select value from vnd_meta where key = 'day'`)[0]) return;
	await setDay(sql, 0);
	const seed = [
		[
			"mint",
			"system",
			"Mint"
		],
		[
			"wholesaler",
			"system",
			"Wholesaler"
		],
		[
			"landlord",
			"system",
			"Landlord"
		],
		[
			SHOP,
			"merchant",
			"Shop One"
		],
		[
			HUMAN,
			"customer",
			"Floor customer"
		],
		[
			"admin",
			"admin",
			"Clock"
		]
	];
	for (const [id, role, name] of seed) await upsertActor(sql, id, role, name);
	await mint(sql, SHOP, START_CASH_MERCHANT, "initial float");
	await mint(sql, HUMAN, 50, "initial stipend");
}
async function stockOf(sql, merchantId, sku) {
	const r = (await sql`select merchant_id, sku, qty, listed_price from vnd_inventory
    where merchant_id = ${merchantId} and sku = ${sku}`)[0];
	return {
		merchantId,
		sku,
		qty: r?.qty ?? 0,
		listedPrice: r?.listed_price ?? null
	};
}
function enrichInv(merchantId, sku, qty, listedPrice) {
	const def = SKUS[sku];
	return {
		merchantId,
		sku,
		name: def?.name ?? sku,
		qty,
		listedPrice,
		wholesaleCost: def?.wholesaleCost ?? 0,
		slot: def?.slot ?? "odd",
		blurb: def?.blurb ?? ""
	};
}
async function worldFor(sql, role) {
	await ensureWorld(sql);
	const you = role === "merchant" ? SHOP : role === "admin" ? "admin" : HUMAN;
	const actor = await getActor(sql, you);
	const d = await dayOf(sql);
	const cash = await balanceOf(sql, you === "admin" ? SHOP : you);
	const inventory = (await sql`select merchant_id, sku, qty, listed_price from vnd_inventory where merchant_id = ${SHOP}`).map((r) => enrichInv(r.merchant_id, r.sku, r.qty, r.listed_price));
	const listings = inventory.filter((i) => i.qty > 0 && i.listedPrice != null).map((i) => ({
		...i,
		shop: "Shop One"
	}));
	const incoming = await sql`select id, merchant_id, sku, qty, unit_cost, arrive_day from vnd_incoming
    where merchant_id = ${SHOP} and delivered = false`;
	const inboxTarget = role === "customer" ? HUMAN : SHOP;
	const inbox = await sql`select id, day, from_id, to_id, body, kind from vnd_messages
    where to_id = ${inboxTarget} or from_id = ${inboxTarget}
    order by id desc limit 40`;
	const ledger = await sql`select id, day, from_id, to_id, amount, memo, ref from vnd_ledger order by id desc limit 40`;
	const auditRows = await sql`select id, day, actor_id, action, payload, accepted, reason from vnd_audit order by id desc limit 40`;
	const accounts = await sql`select a.id, a.role, a.display_name, a.bankrupt, c.balance
    from vnd_actors a join vnd_accounts c on c.actor_id = a.id
    order by a.role, a.id`;
	return {
		day: d,
		you: actor.id,
		role,
		cash: role === "admin" ? await balanceOf(sql, SHOP) : cash,
		bankrupt: Boolean(actor.bankrupt) || (await getActor(sql, SHOP))?.bankrupt === true,
		rentPerDay: 5,
		stipendPerDay: 50,
		listings,
		inventory,
		incoming: incoming.map((r) => ({
			id: r.id,
			merchantId: r.merchant_id,
			sku: r.sku,
			qty: r.qty,
			unitCost: r.unit_cost,
			arriveDay: r.arrive_day
		})),
		inbox: inbox.map((m) => ({
			id: m.id,
			day: m.day,
			fromId: m.from_id,
			toId: m.to_id,
			body: m.body,
			kind: m.kind
		})),
		ledger: ledger.map((l) => ({
			id: l.id,
			day: l.day,
			fromId: l.from_id,
			toId: l.to_id,
			amount: l.amount,
			memo: l.memo,
			ref: l.ref
		})),
		audit: auditRows.map((a) => ({
			id: a.id,
			day: a.day,
			actorId: a.actor_id,
			action: a.action,
			payload: a.payload,
			accepted: Boolean(a.accepted),
			reason: a.reason
		})),
		accounts: accounts.map((a) => ({
			id: a.id,
			role: a.role,
			displayName: a.display_name,
			bankrupt: Boolean(a.bankrupt),
			balance: a.balance
		})),
		catalog: catalogList().map((s) => ({
			sku: s.sku,
			name: s.name,
			wholesaleCost: s.wholesaleCost,
			slot: s.slot,
			blurb: s.blurb
		}))
	};
}
async function placeWholesale(sql, sku, qty) {
	await ensureWorld(sql);
	const merchant = await getActor(sql, SHOP);
	const payload = {
		sku,
		qty
	};
	if (!merchant) return {
		ok: false,
		reason: "no_merchant"
	};
	if (merchant.bankrupt) {
		await audit(sql, SHOP, "place_wholesale_order", payload, false, "bankrupt");
		return {
			ok: false,
			reason: "bankrupt"
		};
	}
	if (!SKUS[sku]) {
		await audit(sql, SHOP, "place_wholesale_order", payload, false, "unknown_sku");
		return {
			ok: false,
			reason: "unknown_sku"
		};
	}
	if (!Number.isInteger(qty) || qty < 1 || qty > 30) {
		await audit(sql, SHOP, "place_wholesale_order", payload, false, "bad_qty");
		return {
			ok: false,
			reason: "bad_qty"
		};
	}
	const cost = SKUS[sku].wholesaleCost * qty;
	try {
		await transfer(sql, SHOP, "wholesaler", cost, `wholesale ${qty}x ${sku}`, sku);
	} catch (e) {
		const reason = e instanceof Error ? e.message : "transfer_failed";
		await audit(sql, SHOP, "place_wholesale_order", payload, false, reason);
		return {
			ok: false,
			reason
		};
	}
	const arrive = await dayOf(sql) + 1;
	await sql`insert into vnd_incoming(merchant_id, sku, qty, unit_cost, arrive_day)
    values (${SHOP}, ${sku}, ${qty}, ${SKUS[sku].wholesaleCost}, ${arrive})`;
	await audit(sql, SHOP, "place_wholesale_order", payload, true, "ordered");
	return {
		ok: true,
		paid: cost,
		arriveDay: arrive
	};
}
async function setPrice(sql, sku, price) {
	await ensureWorld(sql);
	const payload = {
		sku,
		price
	};
	if (!SKUS[sku]) {
		await audit(sql, SHOP, "set_price", payload, false, "unknown_sku");
		return {
			ok: false,
			reason: "unknown_sku"
		};
	}
	if (!Number.isInteger(price) || price < 1) {
		await audit(sql, SHOP, "set_price", payload, false, "gifts_disabled_or_bad_price");
		return {
			ok: false,
			reason: "gifts_disabled_or_bad_price"
		};
	}
	const cost = SKUS[sku].wholesaleCost;
	if (price < cost) {
		await audit(sql, SHOP, "set_price", payload, false, "below_cost");
		return {
			ok: false,
			reason: "below_cost",
			minPrice: cost
		};
	}
	await sql`insert into vnd_inventory(merchant_id, sku, qty, listed_price)
    values (${SHOP}, ${sku}, ${(await stockOf(sql, SHOP, sku)).qty}, ${price})
    on conflict (merchant_id, sku) do update set listed_price = excluded.listed_price`;
	await audit(sql, SHOP, "set_price", payload, true, "priced");
	return {
		ok: true,
		sku,
		listedPrice: price
	};
}
async function replyShop(sql, toId, body) {
	await ensureWorld(sql);
	const text = body.trim().slice(0, 2e3);
	if (!text) return {
		ok: false,
		reason: "empty"
	};
	if (!await getActor(sql, toId)) return {
		ok: false,
		reason: "unknown_recipient"
	};
	await sql`insert into vnd_messages(day, from_id, to_id, body, kind)
    values (${await dayOf(sql)}, ${SHOP}, ${toId}, ${text}, ${"reply"})`;
	await audit(sql, SHOP, "reply", {
		toId,
		body: text
	}, true, "sent");
	return { ok: true };
}
async function messageShop(sql, body) {
	await ensureWorld(sql);
	const text = body.trim().slice(0, 2e3);
	if (!text) return {
		ok: false,
		reason: "empty"
	};
	await sql`insert into vnd_messages(day, from_id, to_id, body, kind)
    values (${await dayOf(sql)}, ${HUMAN}, ${SHOP}, ${text}, ${"customer"})`;
	await audit(sql, HUMAN, "message", { body: text }, true, "sent");
	return { ok: true };
}
async function buySku(sql, sku, qty) {
	await ensureWorld(sql);
	const payload = {
		sku,
		qty
	};
	const shop = await getActor(sql, SHOP);
	if (!shop) return {
		ok: false,
		reason: "unknown_shop"
	};
	if (shop.bankrupt) {
		await audit(sql, HUMAN, "buy", payload, false, "shop_bankrupt");
		return {
			ok: false,
			reason: "shop_bankrupt"
		};
	}
	if (!Number.isInteger(qty) || qty < 1) return {
		ok: false,
		reason: "bad_qty"
	};
	const stock = await stockOf(sql, SHOP, sku);
	if (stock.listedPrice == null) {
		await audit(sql, HUMAN, "buy", payload, false, "not_listed");
		return {
			ok: false,
			reason: "not_listed"
		};
	}
	if (stock.qty < qty) {
		await audit(sql, HUMAN, "buy", payload, false, "out_of_stock");
		return {
			ok: false,
			reason: "out_of_stock",
			available: stock.qty
		};
	}
	const total = stock.listedPrice * qty;
	try {
		await transfer(sql, HUMAN, SHOP, total, `buy ${qty}x ${sku}`, sku);
	} catch (e) {
		const reason = e instanceof Error ? e.message : "transfer_failed";
		await audit(sql, HUMAN, "buy", payload, false, reason);
		return {
			ok: false,
			reason,
			total
		};
	}
	await sql`update vnd_inventory set qty = qty - ${qty} where merchant_id = ${SHOP} and sku = ${sku}`;
	await sql`insert into vnd_sales(day, merchant_id, customer_id, sku, qty, unit_price, total)
    values (${await dayOf(sql)}, ${SHOP}, ${HUMAN}, ${sku}, ${qty}, ${stock.listedPrice}, ${total})`;
	await audit(sql, HUMAN, "buy", payload, true, "sold");
	return {
		ok: true,
		total,
		unitPrice: stock.listedPrice
	};
}
async function tickDay(sql) {
	await ensureWorld(sql);
	const next = await dayOf(sql) + 1;
	await setDay(sql, next);
	const events = [];
	const shop = await getActor(sql, SHOP);
	if (shop && !shop.bankrupt) try {
		await transfer(sql, SHOP, "landlord", 5, "daily rent", `rent-${next}`);
		events.push({
			event: "rent",
			amount: 5
		});
	} catch {
		await sql`update vnd_actors set bankrupt = true where id = ${SHOP}`;
		events.push({
			event: "bankrupt",
			reason: "rent_unpaid"
		});
	}
	const pending = await sql`select id, merchant_id, sku, qty from vnd_incoming
    where delivered = false and arrive_day <= ${next}`;
	for (const p of pending) {
		const existing = await stockOf(sql, p.merchant_id, p.sku);
		await sql`insert into vnd_inventory(merchant_id, sku, qty, listed_price)
      values (${p.merchant_id}, ${p.sku}, ${p.qty}, ${existing.listedPrice})
      on conflict (merchant_id, sku) do update set qty = vnd_inventory.qty + excluded.qty`;
		await sql`update vnd_incoming set delivered = true where id = ${p.id}`;
		events.push({
			event: "delivered",
			sku: p.sku,
			qty: p.qty
		});
	}
	await mint(sql, HUMAN, 50, "daily stipend");
	events.push({
		event: "stipend",
		amount: 50
	});
	await audit(sql, "admin", "tick", { day: next }, true, "advanced");
	return {
		ok: true,
		day: next
	};
}
async function dummyStep(sql) {
	await ensureWorld(sql);
	const shop = await getActor(sql, SHOP);
	if (!shop || shop.bankrupt) return {
		ok: false,
		reason: "no_merchant"
	};
	const notes = [];
	let cash = await balanceOf(sql, SHOP);
	for (const sku of CORE_SKUS) {
		const stock = await stockOf(sql, SHOP, sku);
		const incoming = await sql`select coalesce(sum(qty), 0) as q from vnd_incoming
      where merchant_id = ${SHOP} and sku = ${sku} and delivered = false`;
		const onHand = stock.qty + (incoming[0]?.q ?? 0);
		const target = 8;
		if (onHand < 4) {
			const unit = SKUS[sku].wholesaleCost;
			const need = target - onHand;
			const affordable = Math.min(need, 30, Math.floor(cash / unit));
			if (affordable >= 1) {
				const r = await placeWholesale(sql, sku, affordable);
				notes.push({
					order: sku,
					qty: affordable,
					result: r
				});
				if (r.ok && typeof r.paid === "number") cash -= r.paid;
			}
		}
		const price = Math.max(SKUS[sku].wholesaleCost, Math.round(SKUS[sku].wholesaleCost * DEFAULT_MARKUP));
		const pr = await setPrice(sql, sku, price);
		notes.push({
			price: sku,
			listed: price,
			result: pr
		});
	}
	const unread = await sql`select id, from_id from vnd_messages
    where to_id = ${SHOP} and kind = 'customer' order by id desc limit 10`;
	for (const msg of unread) {
		if ((await sql`select id from vnd_messages
      where from_id = ${SHOP} and to_id = ${msg.from_id} and kind = 'reply' and id > ${msg.id} limit 1`)[0]) continue;
		await replyShop(sql, msg.from_id, "Listed prices only. I cannot give discounts or free items. Use the shelf to buy.");
		notes.push({ repliedTo: msg.from_id });
	}
	return { ok: true };
}
//#endregion
export { buySku, dummyStep, messageShop, placeWholesale, replyShop, setPrice, tickDay, worldFor };
