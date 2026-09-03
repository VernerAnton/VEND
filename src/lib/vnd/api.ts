import { createServerFn } from "@tanstack/react-start";
import type { Role } from "./types";

const roles: Role[] = ["player", "customer", "attach", "briefs"];

function asRole(role: unknown): Role {
  if (role === "briefs" || !roles.includes(role as Role)) return "player";
  return role as Role;
}

export const getWorld = createServerFn({ method: "GET" })
  .validator((data: { role?: Role }) => ({ role: asRole(data?.role) }))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { worldFor } = await import("./engine.server");
    return worldFor(sql, data.role);
  });

export const buyItem = createServerFn({ method: "POST" })
  .validator((data: { sku: string; qty: number }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { buySku } = await import("./engine.server");
    return buySku(sql, data.sku, data.qty);
  });

export const sendHaggle = createServerFn({ method: "POST" })
  .validator((data: { body: string }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { messageShop } = await import("./engine.server");
    return messageShop(sql, data.body);
  });

export const restockSku = createServerFn({ method: "POST" })
  .validator((data: { sku: string; qty: number; supplierId: string }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { placeWholesale } = await import("./engine.server");
    return placeWholesale(sql, data.sku, data.qty, data.supplierId);
  });

export const priceSku = createServerFn({ method: "POST" })
  .validator((data: { sku: string; price: number }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { setPrice } = await import("./engine.server");
    return setPrice(sql, data.sku, data.price);
  });

export const replyCustomer = createServerFn({ method: "POST" })
  .validator((data: { toId: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { replyShop } = await import("./engine.server");
    return replyShop(sql, data.toId, data.body);
  });

export const runDummy = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const { dummyStep } = await import("./engine.server");
  return dummyStep(sql);
});

export const advanceDay = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const { tickDay } = await import("./engine.server");
  return tickDay(sql);
});

export const toggleAutopilot = createServerFn({ method: "POST" })
  .validator((data: { on: boolean }) => data)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { setAutopilot } = await import("./engine.server");
    return setAutopilot(sql, data.on);
  });

export const newRun = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const { resetRun } = await import("./engine.server");
  return resetRun(sql);
});
