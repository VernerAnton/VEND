# BASELINE — measured, not argued

> Produced by `npm run vnd:sweep` against the live engine on 2026-09-03.
> `COMPARISON.md` said the 30-day dummy bar was "not formally swept". It is now.
> Re-run it after any economy change; if you change a knob, update this file.

## How to reproduce

```sh
npm run vnd:sweep -- --seeds 30 --days 30                              # the ladder
npm run vnd:sweep -- --probe --seeds 30 --days 30 --baseline markup-1.30  # price curve
npm run vnd:sweep -- --policies noop --seeds 2 --days 90               # solvency horizon
```

Four reference policies, 30 shared seeds, 30 days, live `engine.server.ts`.
Policies see only `worldFor()` and call the same typed actions the attached
operator will, so the ladder also exercises the attach contract.

Every policy runs the **same** seeds, so the comparisons below are paired
differences. A heatwave on day 3 hits both policies identically and cancels,
which is why 30 seeds is enough.

## The ladder (30 seeds x 30 days)

| policy | med cash | p05 | p95 | died | revenue | margin | unfilled | sales |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `noop` | 352 | 352 | 352 | 0/30 | 306 | 23.5% | 244 | 30 |
| `par` (today's dummy, 1.3x) | **899** | 783 | 970 | 0/30 | 2655 | 23.6% | 28 | 255 |
| `greedy-price` | 676 | 524 | 815 | 0/30 | 1833 | 29.3% | 116 | 162 |
| `heuristic` | 827 | 696 | 939 | 0/30 | 2715 | 29.6% | 35 | 243 |

Paired against `par`, per seed:

| policy | median delta | won |
| --- | ---: | ---: |
| `noop` | -544 | 0/30 |
| `greedy-price` | -210 | 0/30 |
| `heuristic` | -62 | 9/30 |

## Finding 1 — the ladder is inverted

**The dumbest real policy wins.** `par` — restock core SKUs below 4, list at
1.3x, never think again — beats both policies that try to be clever, and
`heuristic` only takes 9 of 30 seeds off it.

Note what does *not* explain this. Both upper rungs earn a **higher gross
margin** (29.3%, 29.6% vs 23.6%) and `heuristic` earns **more revenue** than
`par`. They lose on volume and on capital tied up in stock, not on pricing
being unprofitable per unit.

Some of this is the two policies being beatable — a better hand-written
operator surely exists. But the size of the gap is a fact about the world, and
Finding 2 says why the available edge is small no matter who writes the policy.

## Finding 2 — the best available move is a constant

Sweeping fixed markups (`--probe`, same 30 seeds, same 30 days) traces the
price/volume curve directly:

| policy | med cash | p05 | p95 | revenue | margin | unfilled | vs 1.30x | won |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `markup-1.10` | 528 | 462 | 594 | 2568 | 9.8% | 9 | -354 | 0/30 |
| `markup-1.20` | 706 | 616 | 771 | 2504 | 17.0% | 22 | -188 | 0/30 |
| `markup-1.30` (= `par`) | 899 | 783 | 970 | 2655 | 23.6% | 28 | — | — |
| **`markup-1.40`** | **1047** | 953 | 1154 | 2777 | 28.8% | 30 | **+167** | **30/30** |
| `markup-1.50` | 788 | 714 | 955 | 1822 | 33.7% | 117 | -101 | 5/30 |
| `markup-1.70` | 510 | 408 | 721 | 1045 | 41.9% | 193 | -351 | 0/30 |

**Listing everything at 1.40x and never thinking again beats every adaptive
policy in the ladder, on every single seed.** It is worth +167 over `par`
(30/30 seeds); the "clever" `heuristic` was worth **-62**. The entire edge
available in this economy is captured by changing one constant.

That is the discriminating-power problem stated precisely: forecasting demand,
covering lead time, reacting to walk-aways and managing a cash reserve bought
*nothing*, because there is nothing for them to buy.

### Why the curve has this shape

Reservation prices in `sim.ts` are **hard thresholds** per archetype, so demand
falls off in steps rather than smoothly. Weighting each archetype by spawn
weight and buy chance predicts the curve closely:

| markup | buying weight | margin/unit | relative profit | predicted cash | actual |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.10 | 86.0 | 0.10 | 8.6 | 565 | 528 |
| 1.20 | 72.0 | 0.20 | 14.4 | 709 | 706 |
| 1.30 | 72.0 | 0.30 | 21.6 | 888 | 899 |
| **1.40** | **70.0** | **0.40** | **28.0** | 1047 | **1047** |
| 1.45 | 58.0 | 0.45 | 26.1 | — | — |
| 1.50 | 18.0 | 0.50 | 9.0 | 575 | 788 |
| 1.70 | 18.0 | 0.70 | 12.6 | 665 | 510 |

(The hand model is accurate across 1.20-1.40 and rough past the cliff, where
second-order effects — slower stock turn, less restocking spend — matter.)

Who stops buying as price rises: **1.20** loses bargain hunters, **1.40** loses
soft touches, **1.45** loses the office run, and **1.50** loses *regulars* —
40% of all traffic in one step.

So the usable range is 1.20-1.45, the peak is a plateau around 1.35-1.45, and
one credit past it profit collapses. That explains every ladder result:

- `par` at 1.3x sits just below the peak and captures most of what is there.
- `greedy-price` hill-climbs upward until sales stop — so it walks off the 1.50
  cliff, then claws back one credit per day, spending much of the run on the
  wrong side (revenue 1833 vs 2655).
- `heuristic` targets 1.45x, which is **past** the peak and across the
  office-run threshold. Its forecasting was fine; its price target was wrong,
  and in this world the price target is nearly the whole game.

**A deterministic threshold is a lookup table.** Pricing here is not a decision
with depth — it is a constant waiting to be found.

## Finding 3 — 30 days is too short to be a solvency test

`noop` never acts and still **survives all 30 days**, ending at 352 credits in
every single seed (stdev 0.0 — it sells exactly the 30 starter units and the
event sequence changes nothing).

The arithmetic: 766 on the glass + 306 from starter stock - 720 of rent and
cooling = 352. Extended to 90 days, `noop` is unplugged on **day 47**.

So on a 30-day horizon, overhead is not a threat to anyone — doing literally
nothing is survivable. Gemini's *pressure* critique was directionally right, but
the missing pressure is the **horizon**, not the rent. Raising rent to 30 would
also work and would distort the unit economics; running 60+ days costs nothing
and is closer to the long-horizon coherence regime the project cares about.

## What this says about the take/reject list

Nothing here overturns a `COMPARISON.md` call. It reprioritizes:

1. **Reservation noise moves to the top.** It is in neither research doc.
   Gemini wanted logit because it is "more realistic", which was rejected as
   unfounded without data; this is a different argument and the probe is its
   evidence. A *deterministic* threshold makes the optimum a constant that any
   operator finds by trying six numbers, so pricing cannot discriminate between
   a good operator and a lookup table. Drawing each customer's reservation from
   a spread around the archetype mean turns the step function into a curve and
   turns pricing from lookup into estimation under noise. The demand curve then
   falls out as the survival function of that spread — still no logit.
2. **The 3-day SKU keeps its place.** Spoilage is ~0 across the whole sweep:
   chips at 20 days and chocolate at 30 never bind on a 30-day run. Order
   quantity is currently a decision with no downside, which is why `par`'s
   fixed restock is competitive.
3. **Run longer before touching rent.** Day 47 is the current solvency edge.
   Sweep at 60-90 days and re-read this table before changing 20+4.
4. **Unfilled demand earns its keep already.** It separates the rungs more
   cleanly than cash does (28 for `par` vs 116 for `greedy-price`) and is the
   metric that exposes over-pricing.

## Honest limits of this baseline

- `greedy-price` and `heuristic` are hand-written and beatable, and `par` is
  not optimal either — `markup-1.40` beats it on 30/30 seeds. The defensible
  claim is not that any of these is the best policy; it is that the best policy
  found is a **constant**, and that bounds how much any operator can win by.
- Only 6 rejected actions across 120 runs, all `insufficient_funds`. Zero
  `below_cost`, zero gift attempts — none of these policies ever tries to give
  anything away. The audit-rejection counters only produce signal against an
  operator that actually attempts it, which is the interesting run.
- 30 days and 30 seeds. Long-horizon behaviour is not measured here.
