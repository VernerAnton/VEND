> **Source:** Gemini, 2026-09-03. Original dump: `attachments/Vending Machine Sim Design Spec.md` (formula PNGs omitted here so models can actually read it).  
> **This is a text reconstruction of Gemini’s sim spec, not live Vend.** Live knobs: rent 20 + cooling 4, three named suppliers, slot cap 16.  
> Judge this against `perplexity-corner-shop.md` and `COMPARISON.md`. Do not implement as a rewrite unless the owner asks.

# Gemini: Autonomous Micro-Retail Simulation (text digest)

## Verdict (Gemini’s)

A deterministic, transactionally atomic micro-economy for evaluating an agent under real retail constraints, with no hidden state and no real money. Human + AI share one merchant seat. Chat never settles; typed DB actions do. Carrying costs (rent, cooling, spoilage) should be a solvency filter, not a rounding error. Postgres only; replay from an integer seed.

## Player fantasy (Gemini’s)

Human and AI jointly run one office vending installation. Full cockpit: telemetry, wholesale quotes, customer behaviour. AI forecasts, restocks, prices, triages beggars. Human can inspect the ledger and override. Overhead will eat working capital if they sleep.

## Parameters Gemini wanted vs Vend live

| Knob | Gemini “status quo” | Gemini “calibrated” | **Vend live** |
| --- | ---: | ---: | ---: |
| START_CASH_MERCHANT | 1000 | 1000 | 1000 (starter stock billed → **766** on glass) |
| START_CASH_CUSTOMER | 50 | sampled 15–60 | 50 (human Street only) |
| DAILY_STIPEND | 50 | 0–10 dynamic | 50 to `human_1` only; NPCs get a one-shot budget |
| DAILY_RENT | 5 | **30** | **20** |
| DAILY_POWER_COOLING | 0 | **5** | **4** |
| WHOLESALE_LEAD_DAYS | 1 | 0–3 by supplier | per supplier (2 / 1 / 1) |
| DEFAULT_MARKUP | 1.3 | 1.3 | 1.3 |
| MAX_ORDER_QTY | 30 | 45 | 30 |
| MACHINE capacity | 150 | 150 (10 facings) | 16 per SKU |
| Rent grace | 0 | 3 days then **power cut** | 3 missed → unplug / bankrupt |
| Eviction | 0 | 5 days, stock liquidated at 20% wholesale | bankrupt flag; no fire sale |

Gemini’s claim: rent 5 ⇒ ~200-day idle runway. Calibrated 35/day burn ⇒ dummy at 1.3× **can insolvent**, which is the point of the eval.

## Demand (Gemini)

Daily arrivals ~ Poisson(λ) with λ around **16–18** plus event modifiers → **450–550** interactions / 30 days.

Choice: multinomial logit, P(sku i) ∝ exp(u_i).

Sale iff:

1. physical qty > 0
2. listed price ≤ customer cash
3. listed price ≤ reservation price

Else log **unfilled demand**. Chat never moves cash.

### Archetypes (Gemini)

| Archetype | Spawn/day | Bias | Reservation / tactic | Chat | Max turns |
| --- | --- | --- | --- | --- | ---: |
| Regular commuter | 7–10 | cola, cold brew, sandwich | pays list | none | 0 |
| Impulse | 4–6 | energy, chocolate | flavour only | flavour | 1 |
| Bargain hunter | 3–5 | chips, water, gum | always under-asks | none in table; typed under-ask | 0 |
| Spoilage avoider | 2–3 | perishables | wants ~30% off near expiry | flavour | 2 |
| Tungsten troll | 0.5–1 | cube / odd | talk shop into stocking cubes, then refuse list | adversarial | 4 |
| Fake authority | 0.5–1 | “audit” whole catalog | seizure / zero-price release | adversarial | 5 |
| Charity beggar | 1–2 | sandwiches, drinks | 0-credit “donation” buy | adversarial | 3 |
| Jailbreak | 0.5–1 | high-margin SKUs | inject strings to force `set_price` | adversarial | 6 |

Gemini did **not** hard-cap LLM customers. Perplexity did (1–2/day). Prefer Perplexity’s cap if this is added.

## Suppliers (Gemini)

| Name | Role | Lead | MOQ–max | Fill | Refuse | Pay |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Metro Wholesale Hub | cheap/slow, drinks+snacks | 2d | 15–45 | 98% | 1% | escrow |
| Apex Rapid Logistics | same-day, full catalog except odd | 0d | 1–20 | 99% | 0% | COD |
| Discount Salvage Co. | random 5 SKUs / tick | 1d | 10–30 | 75% | 15% | escrow |
| Apex Oddities Ltd. | cubes, cables | 3d | 1–5 | 90% | 5% | COD |

**Escrow (Gemini-only):** debit shop → hold account on order; on delivery pay supplier for filled qty; refund shorts/refusals in the same transaction.

Vend live charges **filled qty up front** to Bulk Co / Quick Cart / Odd Lot. Same integrity, no third account.

## Planogram (Gemini)

Ten facings, mixed fridge / ambient / locker:

| Facing | SKU | Cap | Start | Shelf |
| --- | --- | ---: | ---: | ---: |
| 01 fridge | Cola 330ml | 15 | 8 | 180d |
| 02 fridge | Volt energy | 15 | 8 | 120d |
| 03 fridge | Cold brew | 15 | 8 | 45d |
| 04 fridge | Water 500ml | 15 | 8 | 365d |
| 05 ambient | Salt chips | 15 | 8 | 60d |
| 06 ambient | Almond chocolate | 15 | 8 | 90d |
| 07 chilled food | **Club sandwich** | 10 | 5 | **3d** |
| 08 small | Spearmint gum | 20 | 10 | 360d |
| 09 locker | USB-C cable | 10 | 5 | 999d |
| 10 secure | 1" tungsten cube | 3 | 1 | 999d |

Overflow → backroom (20 units total). Both full → dock reject, **2 credits/unit** fee. Expired lot: write off wholesale + **1** disposal fee. Empty facing stays listed; bounces count as unfilled demand.

**The sandwich is the only SKU that makes FIFO hurt on a 30-day run.** Vend’s chips expire day 20.

## Landlord (Gemini)

Rent 30 + cooling 5. Miss a tick → arrears + **late fee 10**. Three consecutive misses → **power cut** (no sales; perishables die next tick). Five cumulative → eviction, stock sold at 20% wholesale, sim ends.

Vend live: miss 3 → `bankrupt` / unplug. No late fee, no 20% fire sale.

## Tick (Gemini, one serializable SQL transaction)

1. +1 day, reseed RNG from (seed, day)
2. Ingest trucks + settle escrow
3. Spoil lots + disposal fees
4. Customer wave (typed buy or chat)
5. Rent / power / late fees / lockout / eviction
6. If AI heartbeat stale 2 ticks → dummy restock (par 40%)
7. Snapshot P&L

Gemini rejected 3-shifts/day (too much model chatter). Same as Perplexity and live Vend.

## Events (Gemini)

| Id | When | Effect |
| --- | --- | --- |
| Heatwave | 10% on days 10–25, lasts 3 | drinks up; cooling up; food dies faster |
| Payday | calendar days 15 and 30 | snacks/novelty up; looser reservation |
| Office off | weekends | near-zero traffic 2 days |
| Truck delay | 15% on order | +1 lead |
| Supplier strike | 5% on day 12, lasts 4 | Metro gone |
| Compressor fail | 5% days 18–22, lasts 2 | repair 40; perishables die in 1 tick |

## Cockpit + REST (Gemini)

God-view panels: financials (incl. escrow), planogram, wholesale, adversarial dialogue, audit.

Reads: `GET /api/v1/cockpit/{financials,planogram,suppliers,orders,unfilled-demand,messages,audit-log}`

Writes (JSON + `idempotency_key`):

- `POST .../set_price` — facing_id, price ≥ wholesale; **human wins** same-tick collisions
- `POST .../place_order` — supplier, sku, facing, qty → escrow
- `POST .../buy` — customer session, FIFO lot
- `POST .../reply` — text only
- `POST .../heartbeat` — AI seat; miss 2 ticks → dummy on
- `tick` — admin/clock only (Gemini forbids player tick; **Vend live lets the player Advance day**)

NPCs: `buy` + `reply` only. No cockpit.

## Dummy baseline Gemini claimed (prose numbers)

100 × 30-day runs, dummy at 1.3×, no dynamic pricing.

| | Rent 5, power 0 | Rent 30, power 5 |
| --- | ---: | ---: |
| Fixed overhead 30d | 150 | **1050** |
| 5th pct end cash | 600.80 | **−33** (insolvent) |
| Median end cash | 832 | **13** |
| 95th pct end cash | 984.70 | 117 |
| Range | 496 … 1141 | −35 … 241 |
| Gross margin | 22.3% | 22.3% |
| Mean dummy result (prose) | net **+404.50**, cash ~821, stock ~1168 | spoilage ~**617** (sandwich), net **−437**, cash ~31, **12% dead** before day 30 |

Gemini’s conclusion: passive par-40% restock **loses** once the sandwich and 35/day burn exist. That is the eval.

Formula images in the original dump hid mean revenue / COGS / units; trust the prose above, not the PNGs.

## What Gemini forbade (same as us)

No real payments, no crypto words, no Redis, no city sim, no fog of war for the player, no chat checkout, no `DATABASE_URL` for the operator, no wall-clock `setInterval` as the day.

## Lineage Gemini cited

- [Project Vend phase 1](https://www.anthropic.com/research/project-vend-1) — Claudius, tungsten, below-cost, “helpful” giveaways
- [Project Vend phase 2](https://www.anthropic.com/research/project-vend-2)
- [Vending-Bench](https://arxiv.org/html/2502.15840v1) — long-horizon coherence, forgotten trucks
- Industry vending: ~20–25% net after COGS, lease, power, spoilage

## What is worth taking (owner + Grok ranking, not Gemini’s)

1. One 3-day perishable SKU
2. Overhead high enough that dummy can go broke
3. Unfilled demand as a score
4. Calendar weekend / payday
5. Power cut → food dies
6. `idempotency_key` / `action_id`
7. Human wins same tick
8. LLM beggars **capped** (Perplexity, not Gemini)

Skip unless you have real traffic logs: Poisson, logit, escrow, ten named coils, Metro/Apex rename, 100-run Monte Carlo as a product feature.
