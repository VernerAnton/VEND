# NEXT — what we deliberately did not build yet

**What this file is:** the single actionable backlog. Every item here was
skipped on purpose, with a reason.

**What this file is not:** a rationale store. Evidence for the economy items
lives in [research/BASELINE.md](./research/BASELINE.md); research provenance
(who proposed what, and which call was taken) lives in
[research/COMPARISON.md](./research/COMPARISON.md). Entries here stay one or
two lines and link out, so the three files cannot drift apart.

`GOAL.md` still wins over all three.

---

## A. Economy — ordered by measured priority

Ordered by [BASELINE.md](./research/BASELINE.md), not by opinion. Re-run
`npm run vnd:sweep` after each one and update BASELINE.

| # | Item | Where | Why now | Done when |
| --- | --- | --- | --- | --- |
| A1 | **Reservation noise** (draw each customer's reservation from a spread, σ≈0.15, instead of a constant) | `sim.ts` `decideVisit` | BASELINE Finding 2: the optimum is a *constant* (`markup-1.40` beats every adaptive policy 30/30). A deterministic threshold is a lookup table. | The `--probe` curve is a smooth peak with no cliff, and ladder rungs separate |
| A2 | **Longer default horizon** (60–90 days) | harness defaults | BASELINE Finding 3: `noop` survives all 30 days and is not unplugged until **day 47**. 30 days tests nothing about solvency. | `noop` dies inside the default run |
| A3 | **One 3-day perishable SKU** | `catalog.ts` | Spoilage was ~0 across all 300 runs; chips (20d) and chocolate (30d) never bind. Order quantity is currently a decision with no downside. | Over-ordering visibly costs money in the sweep |
| A4 | **Fill decided at delivery, not at order** | `engine.server.ts:586` | The operator currently learns its shortfall immediately, so there is nothing to plan around. This is the valuable half of Gemini's escrow — the information timing, not the accounting. | An order of 20 can land as 12 on arrival day |
| A5 | **Poisson arrivals** | `sim.ts` `visitCount` | Current jitter is a hard-bounded uniform ±2 — no dead days, no rushes. Poisson's variance-equals-mean gives the tails that break a plan. ~5 lines. | Visit counts show real spread across seeds |
| A6 | **Hidden supplier reliability** | `sim.ts` `fillBps` | `fillBps` is a public constant, so there is nothing to learn. Draw realized fill around a hidden per-run rate and it becomes an estimation problem. | Fill rate must be inferred from order history |
| A7 | **Calendar weekend / payday** | `sim.ts` `rollEvent` | Demand is stationary, so a moving average is near-optimal forecasting. A predictable cycle under unpredictable noise rewards modelling the world. | Day-of-week structure is visible in the day log |

## B. Engineering debt

Each of these was deferred with a reason, not overlooked.

| # | Item | Where | Deferred because |
| --- | --- | --- | --- |
| B1 | **`transaction()` on the `Sql` surface** | note at `engine.server.ts:115` | Settlement's debit → credit → ledger-insert are still three statements. The check-then-act race is fixed (conditional debit + `check (balance >= 0)`), but true atomicity needs a transaction on the surface in `src/lib/db.ts`, which auth and app-data also use. Do it when the HTTP API justifies touching that. |
| B2 | **`run_id` scoping on `vnd_*`** | migrations | Not needed yet: PGLite is in-memory and the harness resets between runs (`resetRun`, `engine.server.ts:972`), so isolation is free. Needed the moment the HTTP API allows two concurrent runs against one Postgres. |
| B3 | **Supplier fill-probing exploit** | `engine.server.ts:586` | Fill is seeded on `dayRng(seed, d*17 + qty + sku.length)`, so an operator that hits `supplier_stockout` can probe quantities until one fills. Fix with a per-order counter. Ships naturally with A4. |
| B4 | **`heuristic` targets 1.45×** | `harness/policies.ts:255` | Written before the curve was measured; 1.45 is past the 1.40 peak and across the office-run threshold, which is why it loses to `par`. Fix before using it as a benchmark rung, or the ladder understates what a decent operator does. |
| B5 | **`action_id` / idempotent retries** | attach contract | From COMPARISON's take list. Only matters once retries are possible, i.e. with the HTTP API. |

## C. Open design questions — owner's call

- **C1. Bounded history window.** Deliberately deferred until the attach API
  exists. One correction to record: the world is *already* partly bounded —
  `worldFor` returns only the **current day's** visits
  (`engine.server.ts:394`) and a day-log with no per-SKU breakdown
  (`engine.server.ts:408`). Trailing per-SKU demand therefore cannot be read
  from world state at all; an operator must accumulate it, as
  `harness/policies.ts` `heuristic` now does. The remaining question is
  narrower than "bound the history": it is whether the 30-day day-log window
  and lifetime per-SKU totals should also shrink.
- **C2. The attach HTTP API + hashed key.** `GOAL.md` hard rule 5. Not built;
  the typed actions are still TanStack server functions. Its shape depends on
  B2 and B5, so those land with it.
- **C3. LLM red-team NPCs**, capped 1–2/day per Perplexity. Worth building only
  once a real operator is attached: across 300 baseline runs the ledger logged
  **zero** `below_cost` and zero gift attempts, because no scripted policy ever
  tries. Those audit counters only produce signal against an operator that does.

## D. Revised calls

Recorded here and amended in COMPARISON.md, per its rule 5 ("if you disagree
with the take/reject lists, write it down").

- **Poisson: take it** (A5). COMPARISON rejected "Poisson + logit" as one item.
  Logit stays rejected; Poisson is separable, cheap, and adds the tails a
  stress test wants.
- **Escrow: split it** (A4). The three-account settlement stays rejected. The
  *information timing* inside it — fill revealed on delivery rather than at
  order — is worth taking on its own and costs two lines.

## E. Do not re-propose

Settled; re-litigate only with new evidence.

- **Multinomial logit as the demand engine.** Its β is unfittable without real
  sales data, and noisy reservations (A1) already produce a demand curve — the
  survival function of the reservation spread. Same economics, interpretable knob.
- **Escrow ledger** as an accounting change (see D).
- Ten-facing planogram, 20-unit backroom, supplier renames (Metro/Apex/Salvage).
- **Monte Carlo as a product feature.** It is a script — `npm run vnd:sweep` —
  not a screen.
- LLM beggar swarms (cap them: C3), player forbidden to tick, rent 5, rent 30
  as a silent overwrite of live 20.
- Real money, wallets, user accounts, crypto vocabulary. See `GOAL.md`.
