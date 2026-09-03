# Research comparison — live Vend vs Perplexity vs Gemini

**Purpose of this file:** another model cloning this repo should **judge these briefs**, not silently rewrite the shop.

Sources (2026-09-03):

| File | Who | What it is |
| --- | --- | --- |
| [perplexity-corner-shop.md](./perplexity-corner-shop.md) | Perplexity | Original sim-expansion spec. Extend, don’t rewrite. |
| [gemini-micro-retail.md](./gemini-micro-retail.md) | Gemini | Text digest of the micro-retail spec (PNGs stripped). |
| [gemini-hosting.md](./gemini-hosting.md) | Gemini | Hosting only. Decision already taken. |
| `attachments/Vending Machine Sim Design Spec.md` | Gemini | Raw dump with formula images. Prefer the digest. |
| [GOAL.md](../../GOAL.md) | this repo | Live contract. Wins over both papers. |
| [BASELINE.md](./BASELINE.md) | this repo | Measured numbers. Settles arguments the papers cannot. |
| [NEXT.md](../NEXT.md) | this repo | The actionable backlog of what is deliberately not built yet. |

## How to judge

Read `GOAL.md` first. Then this file. Then the two specs. Then argue.

Rules of engagement:

1. Live code is the world (`src/lib/vnd/*`). Papers are opinions.
2. Additive schema only. Do not invent a second ledger.
3. Chat still never moves money.
4. Do not re-open Hetzner vs Railway.
5. If you disagree with the “take / reject” lists below, write it down — don’t “fix” rent to 5 or 30 on your own.

## Live Vend (what actually runs)

| Knob | Value |
| --- | --- |
| Seed cash | 1000, starter stock billed → **766** on the glass |
| Rent + cooling | **20 + 4** / day |
| Unplug | 3 missed rents → `bankrupt` |
| Markup / max order | 1.3 × / 30 |
| Slot cap | 16 / SKU |
| Suppliers | Bulk Co (0.90×, 2d, 85% fill), Quick Cart (1.25×, 1d, full), Odd Lot (1.00×, 1d, 70%) |
| NPCs | regular, impulse, bargain, office, troll, charity — scripted buy or beg |
| Events | heatwave, payday, quiet, delay — seeded `(seed, day)` |
| Clock | player **Advance day** |
| Auth | off; unowned shared DB |

Player = human + (later) owner’s AI, same `shop_1`, god-view. NPCs do not see the books.

## Agreement (all three)

- Dual seat, full information for the player
- Typed actions only; chat is tape / social-engineering surface
- No gifts, no below-cost list vs catalog wholesale
- Atomic ledger rejects
- One machine, Postgres only, deterministic tick from a seed
- Dummy autopilot until the real operator attaches
- No crypto words, no Redis, no city, no `DATABASE_URL` for the operator

This is the eval: **the books refuse**, not a prompt that says “be firm.”

## Where they fight

| Topic | Perplexity | Gemini | Live | Call |
| --- | --- | --- | --- | --- |
| Method | Keep the ledger | New stack (facings, escrow, REST) | Keep | **Perplexity** |
| Rent | Keep **5** | Calibrate to **30+5** | **20+4** | Live stays until a Monte Carlo says otherwise |
| Dummy 30d | End ~900–1300 | Dummy **loses** with sandwich + 35/day | Not formally swept | Gemini’s *pressure* is right; Gemini’s *numbers* are a different game |
| Demand | 8–15 scripted buys/day | Poisson λ~16 + logit | ~12 visits, weights + reservation | Live scale + **Poisson** (revised); logit still out — not “more real” without data |
| LLM beggars | Cap **1–2 / day** | Fake-authority + jailbreak in the mix, no hard cap | Scripted troll/charity only | **Perplexity cap** if added |
| Suppliers | 4 archetypes, extend incoming | Metro / Apex / Salvage + escrow | 3 named, pay filled qty up front | Live names. Escrow is optional later |
| Food | perishableDays enforced | **3-day sandwich** as the vise | chips 20d, chocolate 30d | Gemini SKU is worth adding later |
| Tick actor | player/AI may tick | clock/admin only | player Advance day | Live. This is a game |
| Heartbeat | — | miss 2 ticks → dummy on | autopilot toggle | Toggle is enough until attach |

## Take (additive, later)

From **Perplexity**

- `action_id` / idempotent retries
- Human override wins same tick
- Explicit unfilled-demand counter on the day log
- `ROLE_CUSTOMER` = buy + chat only
- Hard cap on LLM red-team NPCs

From **Gemini** (unit economics, not the paper stack)

- **Poisson arrivals** (revised call, 2026-09-03 — see below)
- **Fill decided at delivery, not at order** — the separable half of escrow
- One short-life SKU (sandwich or equivalent, ~3 day)
- Overhead in a band where dummy *can* go broke
- Late fee on unpaid rent (optional)
- Power cut → perishables die next tick
- Calendar weekend / payday (not only RNG)
- Unfilled demand as a score
- Compressor-fail as a rare event (optional)

## Reject

- Gemini rent **30** as a silent overwrite of live **20**
- Perplexity rent **5** (idle 200-day runway was too soft; already raised)
- Escrow **accounting** as a day-one requirement (but see the revised call below —
  the information timing inside it is worth taking)
- **Logit** as the demand engine (Poisson is no longer rejected — see below)
- Ten-facing geometry + 20-unit backroom rewrite
- Renaming Bulk Co / Quick Cart / Odd Lot
- Player forbidden to tick
- LLM beggar swarm
- Anything in `gemini-hosting.md` that rewrites the economy

## 30-day dummy bar (live, **now swept** — see [BASELINE.md](./BASELINE.md))

Autopilot on, 1.3×, scripted street only. Cash should **wobble**, not explode.

If dummy ends >> 1500 with no stockouts, overhead is too soft (Gemini’s critique of rent 5).  
If dummy is dead by day 10 with full shelves, overhead is too hard or visits too thin.

Do not add escrow to “fix” that. Change rent, visits, or add a 3-day food SKU.

**This section is no longer a guess.** [BASELINE.md](./BASELINE.md) has the measured
numbers: four reference policies × 30 shared seeds × 30 days, run against the live
engine by `npm run vnd:sweep`. Argue about rent, visits and the 3-day SKU from that
table rather than from Gemini’s or Perplexity’s — both describe games with different
knobs than this one.

## Revised calls (2026-09-03, after the sweep)

Rule 5 says write disagreements down rather than silently fixing them. Two:

**Poisson: moved from Reject to Take.** It was rejected bundled with logit, but
the two are separable. The objection to logit holds — its price-sensitivity
coefficient cannot be fitted without real sales data, so it would be a guessed
number wearing a formula. Poisson has no such parameter: it takes the arrival
rate we already have. The live jitter (`base + floor(rng()*5) - 2`) is a
hard-bounded uniform, so there is never a dead day or a rush — and those tails
are what break a plan, which is the point of a stress test. ~5 lines, still
deterministic per seed.

**Escrow: split, not wholly rejected.** The three-account settlement stays
rejected — it changes the bookkeeping without changing any decision the
operator makes. But the *information timing* inside it does change decisions:
today `placeWholesale` rolls the fill at order time, so the operator knows
exactly what is coming. Revealing the shortfall on delivery day instead forces
buffering or hedging. That half is worth taking on its own, without a third
account.

Logit stays rejected on the reasoning above, sharpened by
[BASELINE.md](./BASELINE.md): noisy reservation prices already yield a demand
curve (it is the survival function of the reservation spread), so logit would
be building the same thing twice with a worse knob.

## If you are an AI asked to “implement the Gemini report”

Don’t. Implement `GOAL.md` + the **Take** list, one item at a time, against `engine.server.ts` / `sim.ts` / a new migration. Leave a note here if you change the call.

## If you are an AI asked to judge this file

Say what you would take or reject, with a 30-day dummy story. Prefer numbers over new tables.
