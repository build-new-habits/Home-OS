# Home-OS: Phase 7 Build Brief — Pantry Stock + Shopping List
21 Aug 2026 v1

**Gated on: Phase 6 CLEARED.** Not merely built. Phase 7 reads straight
through `foods`, `meals`, `meal_ingredients` and `weekly_meal_plan` — every
one of them Phase 6 code. Building on an unverified foundation means
rewriting rather than fixing when the smoke test finds something, and Phase 5
needed three rounds. Do not start on this until the Phase 6 block in
`INTEGRATION_CHECKS.md` has passed on a real device.

## Scope

Pantry stock, the shopping list, and the shortfall calculation that connects
them. Two tables: `pantry_stock`, `shopping_list_items`.

This is where the app stops being a set of separate trackers and starts
being one system. Principle 5: *"shopping list generation diffs meal-plan
needs against pantry stock automatically — it doesn't ask you to manually
check what's already in the cupboard."* If the user has to look in the
cupboard and then edit the list, this phase has failed regardless of how
complete it is.

**Out of scope.** `source: 'holiday'` on `shopping_list_items` is Phase 8.
The column's CHECK constraint allows it; nothing here writes it. Do not
build holiday integration — the trigger for it lives on
`holiday_purchase_items.send_to_shopping`, which is Phase 8's to own.

---

## Two problems the schema does not solve for you

Read this section before writing anything. Both are decided below, but the
reasoning matters more than the decision, because both will resurface.

### 1. There is no unit on either quantity column

`meal_ingredients.quantity_g` is grams and says so. But `pantry_stock.
current_qty` is a bare `numeric default 0`, and `shopping_list_items.
qty_needed` is a bare `numeric`. Neither carries a unit, and the schema is
frozen, so no unit column can be added.

"Plan needs minus pantry stock" is arithmetic between the two. It is only
meaningful if both are in the same unit as `quantity_g`.

**Decision: both are GRAMS.** This is not a preference, it is the only
option the frozen schema supports. The alternative reading — `current_qty`
as a count of packs or tins — cannot be diffed against grams without a pack
size, and `foods` has no pack-size column. Grams is also consistent with the
rest of the app's canonical-unit discipline: kg for weight, millilitres for
water, per-100 g for macros.

**This requires a documentation amendment to `schema.md`**, not a schema
change. Add `**canonical unit grams**` to the Notes cell for
`pantry_stock.current_qty` and `shopping_list_items.qty_needed`, exactly as
`weight_logs.weight_kg` and `water_logs.ml_logged` already carry theirs. No
column is added, renamed or removed. Make this edit **first**, before any
code, per the schema-first rule — and say in the handoff that you did.

Grams read badly at scale in the UI ("1240 g of oats"), so extend
`lib/units.js` with `formatGrams()` switching to kg above 1000 g, mirroring
the existing `formatMl()`. `units.js` is not write-once; extend by addition
and change no existing export's signature.

### 2. There is no purchase date, so "near expiry" has no honest source

`pantry_stock.shelf_life_days` exists. Nothing records when the item was
bought or last restocked. The only dates on the row are the universal
`created_at` and `updated_at`.

Principle 5 requires perishables to surface in **both** the shopping list
("don't rebuy") and the meal planner ("use this up") — one signal, two
surfaces. So the feature cannot simply be dropped.

**Decision: use `updated_at` as a "last restocked" proxy, and never present
it as an expiry date.** Editing `current_qty` is, in practice, restocking or
using up, so `updated_at` tracks the last time the item was touched. It is
an approximation and the UI must say so in those terms: *"stocked about 9
days ago; this usually keeps about 14"* — never *"expires Tuesday"*, and
never a red warning. A date the app cannot actually know must not be
presented as though it can.

**Flag for the coordinator, not for the builder to decide:** this proxy is
wrong whenever a row is edited for an unrelated reason (fixing a typo in the
location resets it). If that turns out to be misleading in use, the honest
fix is a schema change to add a purchase date — which would be the first
since Phase 1 and needs Graeme's call, not a builder's.

---

## Files to create

| File | Purpose |
|---|---|
| `js/lib/shortfall.js` | the pure diff: plan needs − pantry stock |
| `js/data/pantry.js` | `pantry_stock` CRUD, use-soon signal |
| `js/data/shopping.js` | `shopping_list_items` CRUD, status changes |
| `js/views/pantry.js` | replaces the Phase 2 stub, whole |
| `js/views/shopping.js` | replaces the Phase 2 stub, whole |

`js/lib/units.js` extended (`formatGrams`). `css/components.css` extended
(whole file, diffed to prove nothing dropped). `service-worker.js`: three
new paths — the two view paths already exist as Phase 2 stubs — and
**bump `CACHE_NAME` to v16**. That takes the precache to **52 paths**.

Routes `pantry` and `shopping` already exist in `routes.js`. That file is
write-once and must not be touched.

### Why the shortfall maths lives in `lib/`, not `data/`

`REPO_STRUCTURE.md` is explicit: *"data imports supabaseClient and lib
only"*. The shortfall needs the plan, the ingredients and the pantry —
three domains — so `data/shopping.js` cannot compute it without importing
`data/meals.js` and breaking that rule.

So: `lib/shortfall.js` holds a **pure function** taking already-fetched
rows, and the **view orchestrates** — it calls `mealPlan.listPlan()`,
`meals.listIngredients()` and `pantry.listStock()`, hands the results to
`computeShortfall()`, then calls `shopping.replaceGeneratedItems()`. Import
direction stays one-way and the maths stays testable without a database,
exactly as `computeMacros()` is.

---

## The shortfall calculation

For every row in `weekly_meal_plan`:

```
serves  = serves_override ?? meal.default_serves
scale   = serves / meal.default_serves
```

then for each of that meal's ingredients:

```
needed_g[food_id] += quantity_g * scale
```

`meal_ingredients.quantity_g` is stated for the meal's `default_serves`, so
scaling by the ratio is what makes principle 5 true — *"without you having
to re-enter ingredient quantities each time"*. Guard `default_serves` at
zero or null before dividing; it is `NOT NULL DEFAULT 4`, but a division by
zero here would produce `Infinity` and silently poison the whole list.

Then, per food:

```
shortfall_g = max(0, needed_g - (pantry.current_qty ?? 0))
```

Only foods with a shortfall above zero become list items. **A food with
enough stock must not appear.** That is the check the integration block
leads with, and it is the difference between a shopping list and an
inventory printout.

A food with no `pantry_stock` row at all is treated as **zero stock**, not
as unknown — you do not have it, so you need all of it. This is the one
place in the app where absent data is safely read as zero, and it is worth
a comment saying why, because everywhere else (macros) the opposite rule
holds.

Reuse `servesFor(entry)` from `data/mealPlan.js` rather than re-deriving the
override logic, and `groupByMeal()` from `data/meals.js` rather than an N+1
query. `listIngredients()` with no argument already returns every meal's
ingredients in one call.

---

## Regeneration must be idempotent and must not destroy decisions

Generating the list twice must not double it. Equally, it must not wipe
things the user has decided.

**Rule: regeneration replaces only rows where `source = 'meal_plan'` AND
`status = 'needed'`.** Everything else survives:

- `status = 'have'` or `'bought'` — the user looked and decided. Deleting
  these would make bought items reappear on the list, which reads as the app
  forgetting what you told it. Nothing regenerates over a decision.
- `source = 'usual'` — manually added staples. Never touched by generation.
- `source = 'holiday'` — Phase 8's. Never touched.

Do the delete and the insert as separate calls, delete first, and check the
error on both. If the delete succeeds and the insert fails, the user has an
empty list rather than a doubled one — recoverable by regenerating, which
the failure message should say.

**Before regenerating, say what will happen and get a confirm** if any
`meal_plan` rows will be removed: *"This rebuilds the list from your weekly
plan. 4 items you haven't ticked will be replaced; 3 you've marked as have
or bought will be kept."* Counting before acting, the same discipline as the
restrict deletes.

---

## Status changes are the one-tap action of this phase

Ticking items in a shop is the daily-use action here, and a shop is exactly
where signal fails. So `needed → have → bought` follows the Phase 5 shape,
not the Phase 6 meal-building shape:

- **Optimistic.** The tap counts immediately, the write happens behind it,
  and an outright failure rolls back visibly. `views/water.js` v3 is the
  reference. Awaiting a round trip before acknowledging a tap defeats the
  offline queue and fails hardest where the app is most needed.
- **Queued offline** via `attemptWrite()` and `enqueue()`, with
  `flush(applyFn, { tables: ['shopping_list_items'] })` and an `op.table`
  assertion that **throws** on a foreign op (standing rule 7).
- The button is never disabled while a write is in flight.

Pantry edits are not one-tap actions and are not queued; say so plainly when
offline rather than failing silently.

Note that a queued status change carries a real row id, so unlike Phase 6's
queued foods it has no dependency problem — it can be applied on reconnect
with no special handling.

---

## The use-soon signal, and a cross-phase edit that is gated

`data/pantry.js` exports `listUseSoon()` returning stock whose
`updated_at + shelf_life_days` is near or past, with the days figure so the
caller can word it. One signal, computed in one place.

Two surfaces consume it:

1. **The shopping list** — flag the item as already stocked and likely still
   good, so it is not rebought. If a use-soon food also has a shortfall,
   show both facts rather than suppressing either; the user decides.
2. **The meal planner** — a "use these up" section in `views/meals.js`.

Surface 2 means **editing a Phase 6 file**. `REPO_STRUCTURE.md` requires a
later phase's edit to an earlier file to be recorded in that phase's
handoff, so record it. Three constraints on it:

- Make it **last**, after everything else in Phase 7 is working.
- Make it **additive** — one appended section and its loader. Change no
  existing function in that file.
- Re-run `Tests/run-all.sh` afterwards. `views/meals.js` is covered by both
  the render gate and the structural a11y checks, and this is the exact
  shape of edit those exist to protect.

If Phase 6's smoke test forced changes to `views/meals.js`, re-read it
before touching it. Do not work from this brief's description of it.

---

## Deletion

`pantry_stock` and `shopping_list_items` are both leaf tables — nothing
references them, so their own deletes cascade nothing and restrict nothing.
Both still get a confirm step (principle 9, conventions §3); the confirm is
simply short.

They are the **dependents** in the other direction: both reference `foods`
with `ON DELETE RESTRICT`. Phase 6's `countFoodDependents()` already counts
all three restrict-referencing tables, so the food-delete confirm is already
correct and needs no change. Verify that rather than assuming it — delete a
food that is in the pantry and check the message names the pantry entry.

Removing an item from the shopping list should offer an **undo toast** where
practical (conventions §3), because a mis-tap in a shop is easy and
regenerating is a heavier remedy than it deserves.

---

## Accessibility (WCAG 2.2 / 2.1 AA)

- The shopping list is a **list of stateful items**, not a grid. Use a real
  `<ul>`; each item's control announces its name **and current state** —
  `aria-pressed` or a text status, never colour alone. "Bought" must be
  readable as a word.
- Status changes announce via the live region with the item name, not just
  "saved".
- Shopping-list tap targets are **≥ 44×44**: this is a one-tap daily action
  in the friction budget, so the 24 px floor does not apply. `.btn-small`
  from Phase 6 is 36 px and is **not** appropriate here.
- Quantities always carry a unit in text (`formatGrams()`), never a bare
  number.
- Use-soon is stated in words — *"stocked about 9 days ago"* — never a red
  dot, never a colour-only badge. It is information, not a warning
  (principle 1: this is food you have, not a failure).
- The pantry list needs a usable empty state that explains how stock gets
  there, since an empty pantry is the normal starting condition.
- Compute contrast for every new pair, **all four theme combinations**
  (standing rule 11), and add them to `Tests/contrast.mjs`.

---

## Verification before commit

The harness is committed now — use it rather than rebuilding it:

```
bash Tests/run-all.sh
```

Add to it as you go; a gate that does not cover the new code is not
protecting it:

- `Tests/render-gate.mjs` — the two new views are already in `VIEWS` as
  stubs; confirm they still pass once replaced, and extend the stub's
  fixtures to cover `pantry_stock` and `shopping_list_items`.
- `Tests/behaviour.mjs` — the shortfall maths against a **hand
  calculation**, including: a food with enough stock producing no item; a
  food with no pantry row treated as zero; `serves_override` scaling the
  requirement; and `default_serves` of zero not producing `Infinity`.
- `Tests/queue.mjs` — the new table's scoped flush.
- `Tests/a11y.mjs` — the shopping list's names and states.
- `Tests/contrast.mjs` — new pairs, four themes.
- `Tests/self-test.sh` — re-run it if you change the render gate.

Then, as always: every import resolved and every named export confirmed to
exist; every precache path returns 200 (52 of them); `CACHE_NAME` bumped;
write-once files byte-identical.

---

## Smoke test (replace the Phase 7 block in `INTEGRATION_CHECKS.md`)

- [ ] Cache Storage shows `home-os-shell-v16` with **52 entries**; `v15`
      gone. Precache is all-or-nothing.
- [ ] Generate the list → it contains **only the shortfall**, not
      everything. Verify one line by hand against the plan and the pantry.
- [ ] A food with enough stock does **not** appear at all.
- [ ] A food with no pantry row at all appears at its full required amount.
- [ ] Change a `serves_override` in the plan, regenerate → that food's
      quantity moves in the right direction.
- [ ] Regenerate twice → no duplicates.
- [ ] Mark an item bought, regenerate → it is **still marked bought**, not
      resurrected as needed.
- [ ] A manually added 'usual' staple survives regeneration untouched.
- [ ] Items move needed → have → bought and persist across a reload.
- [ ] **In a shop, on real mobile data or offline:** tick three items. Each
      counts immediately, no button disables, all three sync on reconnect,
      and IndexedDB is empty afterwards.
- [ ] A near-expiry item flags in **both** the shopping list and the meal
      planner, from one underlying signal.
- [ ] Deleting a food that is in the pantry reports the pantry entry in the
      confirm and is refused cleanly.
- *Ignore:* exact quantity rounding conventions, as long as the shortfall
  direction is right; the `updated_at` proxy being imprecise when a row was
  edited for an unrelated reason — that is a known limitation, recorded.

---

## Open question for the architect

**A food can legitimately appear twice on the list**, once as a generated
`meal_plan` item and once as a manually added `usual` staple. There is no
unique constraint on `food_id`, and the schema is frozen, so both rows can
exist.

Merging them loses the `source` distinction, which is what makes
regeneration safe — a merged row cannot be replaced without destroying the
manual one. Not merging means "Oats" appears twice with two quantities,
which reads as a bug to anyone holding the phone in a shop.

Decide deliberately, and if the answer is "show both", make the list say
*why* in text rather than leaving the user to work it out. Flag it rather
than guess if the wording cannot be made to read naturally — a shopping list
that looks wrong will not get used, whatever the data model says.
