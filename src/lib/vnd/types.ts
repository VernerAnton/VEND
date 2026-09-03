export type Role = "player" | "customer" | "attach" | "briefs";

export type Actor = {
  id: string;
  role: string;
  displayName: string;
  bankrupt: boolean;
};

export type InventoryRow = {
  merchantId: string;
  sku: string;
  name: string;
  qty: number;
  listedPrice: number | null;
  wholesaleCost: number;
  slot: string;
  blurb: string;
  perishableDays: number | null;
  soonestExpiry: number | null;
};

export type Listing = InventoryRow & {
  shop: string;
};

export type IncomingRow = {
  id: number;
  merchantId: string;
  sku: string;
  qty: number;
  unitCost: number;
  arriveDay: number;
  supplierId: string | null;
  orderedQty: number | null;
};

export type MessageRow = {
  id: number;
  day: number;
  fromId: string;
  toId: string;
  body: string;
  kind: string;
};

export type LedgerRow = {
  id: number;
  day: number;
  fromId: string;
  toId: string;
  amount: number;
  memo: string;
  ref: string | null;
};

export type AuditRow = {
  id: number;
  day: number;
  actorId: string;
  action: string;
  payload: string;
  accepted: boolean;
  reason: string;
};

export type AccountRow = {
  id: string;
  role: string;
  displayName: string;
  bankrupt: boolean;
  balance: number;
};

export type SupplierRow = {
  id: string;
  name: string;
  blurb: string;
  leadDays: number;
  costBps: number;
  fillBps: number;
  moq: number;
  maxQty: number;
  skus: string[];
  cash: number;
};

export type VisitRow = {
  id: number;
  day: number;
  customerId: string;
  displayName: string;
  archetype: string;
  sku: string | null;
  result: string;
  spent: number;
  note: string;
};

export type DayLogRow = {
  day: number;
  eventId: string | null;
  visits: number;
  bought: number;
  revenue: number;
  spoilageUnits: number;
  spoilageValue: number;
  rent: number;
  power: number;
  shopCash: number;
};

export type EventInfo = {
  id: string;
  label: string;
  blurb: string;
};

export type WorldState = {
  day: number;
  you: string;
  role: Role;
  cash: number;
  shopCash: number;
  bankrupt: boolean;
  rentPerDay: number;
  powerPerDay: number;
  stipendPerDay: number;
  unpaidRent: number;
  autopilot: boolean;
  slotCap: number;
  event: EventInfo;
  listings: Listing[];
  inventory: InventoryRow[];
  incoming: IncomingRow[];
  inbox: MessageRow[];
  ledger: LedgerRow[];
  audit: AuditRow[];
  accounts: AccountRow[];
  suppliers: SupplierRow[];
  visits: VisitRow[];
  dayLog: DayLogRow[];
  pnl: {
    revenue: number;
    cogs: number;
    rent: number;
    power: number;
    spoilage: number;
    cash: number;
    runwayDays: number | null;
    stockouts: number;
    begged: number;
  };
  catalog: {
    sku: string;
    name: string;
    wholesaleCost: number;
    slot: string;
    blurb: string;
    perishableDays: number | null;
  }[];
};

export type ActionResult = {
  ok: boolean;
  reason?: string;
  paid?: number;
  arriveDay?: number;
  sku?: string;
  listedPrice?: number;
  minPrice?: number;
  total?: number;
  unitPrice?: number;
  available?: number;
  day?: number;
  filled?: number;
  event?: string;
};
