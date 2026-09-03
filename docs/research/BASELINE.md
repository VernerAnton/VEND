# BASELINE — measured, not argued

> Re-swept 2026-09-03 after reservation noise + Poisson arrivals landed.
> Re-run after any economy change; if you change a knob, update this file.
> The earlier 30-day numbers are superseded — both changes shift every seed.

## How to reproduce

```sh
npm run vnd:sweep                                                       # ladder, 30 seeds x 60 days
npm run vnd:sweep -- --probe --baseline markup-1.30                     # price/volume curve
npm run vnd:sweep -- --policies noop --seeds 2 --days 90                # solvency horizon
```

Policies see only `worldFor()` and call the same typed actions the attached
operator will, so the ladder also exercises the attach contract. Every policy
runs the **same** seeds, so all comparisons are paired differences — a heatwave
on day 3 hits both sides and cancels.

**Scoring is net worth** (cash + stock at catalog cost), not cash. Cash alone
rewards liquidating and punishes stocking; a shop holding 39 units has not lost
what it spent on them.

## The ladder (30 seeds × 60 days)

| policy | net worth | p05 | p95 | cash | stock | died | revenue | margin | unfilled |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `noop` | 16 | 16 | 16 | 16 | 0 | **30/30** | 306 | 23.5% | 385 |
| **`par`** (1.3×) | **907** | 685 | 995 | 748 | 134 | 0/30 | 4694 | 23.5% | 117 |
| `greedy-price` | 679 | 558 | 800 | 468 | 231 | 0/30 | 3129 | 31.3% | 288 |
| `heuristic` | 811 | 643 | 958 | 515 | 286 | 0/30 | 4521 | 24.0% | 128 |

Paired vs `par`: `heuristic` −88 (won 2/30), `greedy-price` −185 (1/30),
`noop` −881 (0/30).

## Finding 1 — the 60-day horizon fixed solvency

`noop` never acts and is now unplugged in **30 of 30 seeds**, at day 47. At the
old 30-day horizon it survived every seed with 352 credits in hand. Overhead is
a real threat again, and rent stays at 20 + 4 — the missing pressure was the
horizon, exactly as Finding 3 of the previous sweep predicted.

## Finding 2 — reservation noise removed the cliff but did *not* create depth

This is the important result, and it is not what was expected.

The mechanism worked. Buy-share for a regular on an 8-credit cola:

| markup | 1.00× | 1.13× | 1.25× | 1.38× | 1.50× | 1.63× | 1.75× | 2.00× |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| buy share | 0.98 | 0.95 | 0.87 | 0.72 | 0.52 | 0.31 | 0.15 | 0.01 |

A smooth curve where there was a step. And the profit cliff is gone:

| markup | before (30d, cash, hard thresholds) | vs 1.30× | after (60d, net worth, noisy) | vs 1.30× |
| ---: | ---: | ---: | ---: | ---: |
| 1.10 | 528 | −354 (0/30) | 277 | −599 (0/30) |
| 1.20 | 706 | −188 (0/30) | 641 | −239 (0/30) |
| 1.30 | 899 | — | 907 | — |
| **1.40** | **1047** | **+167 (30/30)** | **1019** | **+125 (28/30)** |
| 1.50 | 788 | −101 (5/30) | 958 | **+91 (26/30)** |
| 1.70 | 510 | −351 (0/30) | 434 | −443 (0/30) |

The peak-to-1.50 drop fell from **259 to 61**. 1.50× went from a bad bet
(5/30) to a good one (26/30). The sharp peak is now a broad plateau across
1.40–1.50 with no trap on either side.

**But a constant still wins.** `markup-1.40` beats every adaptive rung, and the
best adaptive policy (`heuristic`) still loses to a fixed 1.3× restock by 88.

### Why noise alone was never going to be enough

Adaptive policies beat constants only when there is **exploitable structure** —
something an operator can observe and predict. Per-customer reservation noise is
i.i.d.: the best response to it is still a single fixed price at the peak of the
smoothed curve. Unpredictable variation adds variance; it does not reward
adaptation.

So A1 bought two real things — it removed a trap that punished hill-climbing
(`greedy-price` walked off the old cliff and clawed back a credit a day), and it
made pricing an estimation problem rather than a lookup. It did not, and could
not on its own, make a thinking operator beat a constant.

Discriminating power has to come from mechanics that create **predictable
structure or genuine tradeoffs**:

- **A3, one 3-day SKU** — makes order *quantity* a real decision. Spoilage is
  still ~0 for `par` across the whole sweep; nothing perishes fast enough to
  punish over-ordering, which is why a fixed restock rule is competitive.
- **A7, calendar weekend/payday** — a predictable cycle under unpredictable
  noise is the thing that rewards modelling the world instead of reacting to it.
- **A6, hidden supplier reliability** — turns a public constant into something
  that must be estimated from order history.
- **A4, fill revealed at delivery** — forces buffering or hedging rather than
  perfect knowledge of inbound stock.

These are now the top of the list, ahead of further pricing work.

## Finding 3 — the heuristic over-orders

`heuristic` ends holding **286** in stock against `par`'s **134**, plus 8 units
spoiled and 8 lost to slot overflow, on nearly identical revenue (4521 vs 4694)
and margin (24.0% vs 23.5%). Its `cover` formula
(`perDay × (leadDays + 2) + 2`, floor 4) is too generous.

Note this was **half a measurement artifact**: on cash alone the gap read −242,
and switching to net worth cut it to −88. Cash punished it for holding stock it
had not lost.

## Honest limits of this baseline

- **Inventory is valued at catalog cost, but Bulk Co sells at 0.9×**, so every
  purchase books ~11% paper gain on arrival. This flatters stock-heavy policies
  by roughly 16 credits here — not enough to reorder the ladder, but it means
  net worth is a slight over-estimate for anyone holding a lot of stock. Valuing
  lots at the price actually paid would need a `unit_cost` on `vnd_lots`.
- `greedy-price` and `heuristic` are hand-written and beatable, and `par` is not
  optimal either — `markup-1.40` beats it on 28/30. The defensible claim is not
  that any of these is best; it is that **the best policy found is still a
  constant**, and that bounds how much any operator can win by.
- Only `insufficient_funds` and `rent_unpaid` rejections appear. Zero
  `below_cost`, zero gift attempts — no scripted policy ever tries. Those audit
  counters only produce signal against an operator that does.
- 30 seeds × 60 days. Behaviour past 60 days is unmeasured.
