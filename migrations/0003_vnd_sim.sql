-- Shop sim extras: suppliers, lots (spoilage), NPC visits, daily books.
create table if not exists vnd_suppliers (
  id        text primary key,
  name      text not null,
  blurb     text not null,
  lead_days integer not null,
  cost_bps  integer not null,
  fill_bps  integer not null,
  moq       integer not null,
  max_qty   integer not null,
  skus      text not null
);

alter table vnd_incoming add column if not exists supplier_id text;
alter table vnd_incoming add column if not exists ordered_qty integer;

create table if not exists vnd_lots (
  id          serial primary key,
  merchant_id text not null,
  sku         text not null,
  qty         integer not null,
  expire_day  integer
);

create table if not exists vnd_visits (
  id           serial primary key,
  day          integer not null,
  customer_id  text not null,
  display_name text not null,
  archetype    text not null,
  sku          text,
  result       text not null,
  spent        integer not null default 0,
  note         text not null default ''
);

create table if not exists vnd_day_log (
  day             integer primary key,
  event_id        text,
  visits          integer not null,
  bought          integer not null,
  revenue         integer not null,
  spoilage_units  integer not null,
  spoilage_value  integer not null,
  rent            integer not null,
  power           integer not null,
  shop_cash       integer not null
);

create index if not exists vnd_visits_day_idx on vnd_visits (day desc, id desc);
create index if not exists vnd_lots_sku_idx on vnd_lots (merchant_id, sku);
