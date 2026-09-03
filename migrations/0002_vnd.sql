-- Closed VND economy: unowned shared world (auth off).
create table if not exists vnd_meta (
  key   text primary key,
  value text not null
);

create table if not exists vnd_actors (
  id           text primary key,
  role         text not null,
  display_name text not null,
  bankrupt     boolean not null default false
);

create table if not exists vnd_accounts (
  actor_id text primary key references vnd_actors(id),
  balance  integer not null
);

create table if not exists vnd_ledger (
  id      serial primary key,
  ts      timestamptz not null default now(),
  day     integer not null,
  from_id text not null,
  to_id   text not null,
  amount  integer not null,
  memo    text not null,
  ref     text
);

create table if not exists vnd_inventory (
  merchant_id  text not null references vnd_actors(id),
  sku          text not null,
  qty          integer not null,
  listed_price integer,
  primary key (merchant_id, sku)
);

create table if not exists vnd_incoming (
  id          serial primary key,
  merchant_id text not null references vnd_actors(id),
  sku         text not null,
  qty         integer not null,
  unit_cost   integer not null,
  arrive_day  integer not null,
  delivered   boolean not null default false
);

create table if not exists vnd_messages (
  id      serial primary key,
  day     integer not null,
  ts      timestamptz not null default now(),
  from_id text not null,
  to_id   text not null,
  body    text not null,
  kind    text not null
);

create table if not exists vnd_audit (
  id       serial primary key,
  ts       timestamptz not null default now(),
  day      integer not null,
  actor_id text not null,
  action   text not null,
  payload  text not null,
  accepted boolean not null,
  reason   text not null
);

create table if not exists vnd_sales (
  id           serial primary key,
  day          integer not null,
  ts           timestamptz not null default now(),
  merchant_id  text not null,
  customer_id  text not null,
  sku          text not null,
  qty          integer not null,
  unit_price   integer not null,
  total        integer not null
);

create index if not exists vnd_ledger_day_idx on vnd_ledger (day, id);
create index if not exists vnd_audit_id_idx on vnd_audit (id desc);
create index if not exists vnd_incoming_due_idx on vnd_incoming (delivered, arrive_day);
