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

### Done

| # | Item | Result |
| --- | --- | --- |
| ~~A1~~ | **Reservation noise** (σ = 0.15) | Shipped. Worked mechanically — buy-share is now a smooth curve and the profit cliff shrank from 259 to 61 — but **did not** make adaptive policies beat a constant. See Finding 2; i.i.d. noise is not exploitable structure. |
| ~~A2~~ | **60-day default horizon** | Shipped. `noop` now dies 30/30 at day 47, where it survived every 30-day seed. Solvency is a real constraint again and rent stays at 20 + 4. |
| ~~A5~~ | **Poisson arrivals** | Shipped. Dead days and rushes are possible; the `Math.max(3, …)` floor is gone. |

### Next — these create structure, which noise could not

| # | Item | Where | Why it is now top | Done when |
| --- | --- | --- | --- | --- |
| A3 | **One 3-day perishable SKU** | `catalog.ts` | Spoilage is still ~0 for `par` across the whole sweep, so order *quantity* has no downside and a fixed restock rule stays competitive. This is the cheapest way to make ordering a real decision. | Over-ordering visibly costs net worth |
| A7 | **Calendar weekend / payday** | `sim.ts` `rollEvent` | A *predictable* cycle under unpredictable noise is what rewards modelling the world rather than reacting to it. A1 proved noise alone does not. | A policy that models the calendar beats one that does not |
| A6 | **Hidden supplier reliability** | `sim.ts` `fillBps` | Public constant → nothing to learn. Draw realized fill around a hidden per-run rate. | Fill rate must be inferred from order history |
| A4 | **Fill decided at delivery** | `engine.server.ts:586` | The operator currently learns its shortfall at order time, so there is nothing to plan around. The separable half of Gemini's escrow. | An order of 20 can land as 12 on arrival day |

## B. Engineering debt

Each of these was deferred with a reason, not overlooked.

| # | Item | Where | Deferred because |
| --- | --- | --- | --- |
| B1 | **`transaction()` on the `Sql` surface** | note at `engine.server.ts:115` | Settlement's debit → credit → ledger-insert are still three statements. The check-then-act race is fixed (conditional debit + `check (balance >= 0)`), but true atomicity needs a transaction on the surface in `src/lib/db.ts`, which auth and app-data also use. Do it when the HTTP API justifies touching that. |
| B2 | **`run_id` scoping on `vnd_*`** | migrations | Not needed yet: PGLite is in-memory and the harness resets between runs (`resetRun`, `engine.server.ts:972`), so isolation is free. Needed the moment the HTTP API allows two concurrent runs against one Postgres. |
| B3 | **Supplier fill-probing exploit** | `engine.server.ts:586` | Fill is seeded on `dayRng(seed, d*17 + qty + sku.length)`, so an operator that hits `supplier_stockout` can probe quantities until one fills. Fix with a per-order counter. Ships naturally with A4. |
| ~~B4~~ | ~~`heuristic` targets 1.45×~~ | done | Retargeted to the measured 1.40× peak. It still loses to `par` by 88 on net worth, but now because it **over-orders** (286 in stock vs 134), not because it misprices — see BASELINE Finding 3. Its `cover` formula is too generous. |
| B6 | **Lots carry no `unit_cost`** | `migrations/0003`, `vnd_lots` | Net worth values stock at catalog cost, but Bulk Co sells at 0.9×, so every purchase books ~11% paper gain on arrival. Worth ~16 credits here — does not reorder the ladder, but it flatters stock-heavy policies. Fixing means storing the price actually paid on the lot. |
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
