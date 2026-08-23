# Home-OS: Phase 7 Build Brief — Pantry Stock + Shopping List
21 Aug 2026 **v2** — supersedes v1 entirely

**v1 is void, not amended.** It was written against the frozen schema and
locked in "all quantities are grams" as the only reading that schema
supported. Schema revision 3 (applied 21 Aug, `schema.md` v3 §0) disproved
that premise: you do not buy 400 g of light bulbs. The units section, the
holiday-bridge deferral and the near-expiry workaround are all gone. Read
this file, not the old one.

**Gated on: Phase 6 CLEARED.** Not merely built. Phase 7 reads straight
through `foods`, `meals`, `meal_ingredients` and `weekly_meal_plan` — all
Phase 6 code, none of it smoke-tested. Building on that means rewriting
rather than fixing when the smoke test finds something.

## Scope

Pantry stock, the shopping list, and the shortfall calculation joining them.
Tables: `pantry_stock`, `shopping_list_items`.

This is where the app stops being separate trackers and becomes one system.
Principle 5: *"shopping list generation diffs meal-plan needs against pantry
stock automatically — it doesn't ask you to manually check what's already in
the cupboard."* If the user has to look in the cupboard and then edit the
list, this phase has failed however complete it is.

---

## What revision 3 changed, and what it now demands

Three columns landed. Each one removes a workaround v1 had baked in.

**`foods.category`** — nine values, so `foods` is *things you buy*, not
food. A real shop is shampoo, toilet roll, light bulbs, guinea pig bedding,
birthday cards, razors, batteries. Full list and meanings in `schema.md`.

Two hard requirements follow:

- **Ingredient pickers filter to `food_fresh`, `food_frozen`,
  `food_ambient`, `drink`.** Offering shower gel mid-recipe is the failure
  this column exists to prevent. That filter belongs in the *meals* view —
  see the cross-phase edit section.
- **The shopping list groups by category, in aisle order.** Not alphabetical.
  A list that walks you through the shop in order is the difference between
  a list you use and a list you ignore. Order: fresh → frozen → ambient →
  drink → household → personal → home → pet → other.

**`unit` on `pantry_stock` and `shopping_list_items`** — `g` / `ml` /
`item`. `item` is what makes non-food work: 3 light bulbs, 1 shower gel.
Every quantity shown must carry its unit as text. Extend `lib/units.js` with
a `formatQuantity(value, unit)` that switches g→kg above 1000 and ml→l above
1000, and pluralises `item` ("1 item", "3 items"). Extend by addition;
change no existing export's signature.

**`pantry_stock.last_restocked`** — a real date. **Near-expiry is
`last_restocked + shelf_life_days`.** Never `updated_at`: it moves whenever
a row is edited for any reason, so fixing a typo in a location would have
silently reset an item's freshness.

`last_restocked` is nullable on purpose. "I don't know when I bought this"
is a real state. Show *"date not recorded"* and simply do not compute
near-expiry when either it or `shelf_life_days` is null. Never invent a
date, and never fall back to `updated_at` — that is the bug this column was
added to kill.

Offer a sensible default `shelf_life_days` per category when a pantry row is
created (fresh ~5, frozen ~90, ambient ~365, drink ~180, household/personal
~730, home/pet/other blank). A default the user can overwrite, never a value
written silently.

---

## The unit mismatch — the one genuinely awkward thing left

`meal_ingredients.quantity_g` is **grams, always**. It has no unit column,
it is Phase 6 code, and revision 3 did not touch it.

So the shortfall — plan needs minus pantry stock — is only meaningful when
the pantry row for that food is **also in grams**.

**Do not convert between units.** 1 ml of water is 1 g; 1 ml of oil is
about 0.9 g; flour is nowhere near either. There is no density column and
guessing one would produce a confidently wrong shopping list, which is worse
than no list.

Rule, and it must be visible in the UI rather than silent:

- Pantry row is **`g`** → subtract normally.
- Pantry row is **`ml`** or **`item`** → the stock **cannot be compared**.
  List the full amount the plan needs, and say why on that line: *"you have
  500 ml in the pantry, but the recipe is in grams — check this one
  yourself."*

Erring toward listing it means over-buying rather than running out, which is
the right direction to fail, but only if the user is told. A silently
over-stated list stops being trusted after about two shops.

**Record as debt:** `meal_ingredients` has no unit column. If this proves
annoying in real use, that is a revision 4 conversation, and Graeme's call —
not something to work around with a density table.

---

## Files to create

| File | Purpose |
|---|---|
| `js/lib/shortfall.js` | the pure diff: plan needs − pantry stock, unit-aware |
| `js/data/pantry.js` | `pantry_stock` CRUD, near-expiry signal |
| `js/data/shopping.js` | `shopping_list_items` CRUD, status changes |
| `js/views/pantry.js` | replaces the Phase 2 stub, whole |
| `js/views/shopping.js` | replaces the Phase 2 stub, whole |

`js/lib/units.js` extended. `css/components.css` whole file, diffed to prove
additions only. `service-worker.js`: three new paths (the two views already
exist as stubs) and **`CACHE_NAME` v19**, taking the precache to **53**.

Routes `pantry` and `shopping` already exist. `routes.js` is write-once.

### Why the shortfall maths lives in `lib/`, not `data/`

`REPO_STRUCTURE.md`: *"data imports supabaseClient and lib only"*. The
shortfall spans plan, ingredients and pantry — three domains — so
`data/shopping.js` cannot compute it without importing `data/meals.js`.

So `lib/shortfall.js` holds a **pure function** over already-fetched rows,
and the **view orchestrates**: it calls `mealPlan.listPlan()`,
`meals.listIngredients()` and `pantry.listStock()`, hands the results to
`computeShortfall()`, then calls `shopping.replaceGeneratedItems()`. Import
direction stays one-way and the maths stays testable without a database,
exactly as `computeMacros()` is.

Note Phase 8 found the inverse of this rule useful: one table, one data
module. `pantry_stock` and `shopping_list_items` are different tables and
get different modules.

---

## The shortfall calculation

For every row in `weekly_meal_plan`:

```
serves = serves_override ?? meal.default_serves
scale  = serves / meal.default_serves
```

then per ingredient:

```
needed_g[food_id] += quantity_g * scale
```

`quantity_g` is stated for the meal's `default_serves`, so scaling by the
ratio is what makes principle 5 true — *"without you having to re-enter
ingredient quantities each time"*. **Guard `default_serves` at zero or null
before dividing**; it is `NOT NULL DEFAULT 4`, but a division by zero yields
`Infinity` and silently poisons the entire list.

Then per food:

```
if pantry row missing      -> shortfall = needed_g,      comparable
if pantry.unit === 'g'     -> shortfall = max(0, needed_g - current_qty)
otherwise                  -> shortfall = needed_g,      NOT comparable, flag it
```

**A food with enough stock must not appear at all.** That is the check the
integration block leads with, and the difference between a shopping list and
an inventory printout.

**A food with no pantry row is zero stock, not unknown** — you do not have
it, so you need all of it. This is the one place in the app where absent
data is safely read as zero, and it needs a comment saying why, because the
macro rule in Phase 6 is the exact opposite.

Reuse `servesFor(entry)` from `data/mealPlan.js` rather than re-deriving the
override logic, and `groupByMeal()` from `data/meals.js` rather than an N+1
query — `listIngredients()` with no argument already returns every meal's
ingredients in one call.

---

## Regeneration must be idempotent and must not destroy decisions

Generating twice must not double the list. Equally it must not wipe things
the user has decided.

**Rule: regeneration replaces only rows where `source = 'meal_plan'` AND
`status = 'needed'`.** Everything else survives:

- `status = 'have'` or `'bought'` — the user looked and decided. Deleting
  these makes bought items reappear, which reads as the app forgetting what
  you told it.
- `source = 'usual'` — manually added staples. Never touched.
- `source = 'holiday'` — see below. Never touched by meal-plan regeneration.

Delete and insert as separate calls, delete first, check `error` on both. If
the delete succeeds and the insert fails the user has an empty list rather
than a doubled one — recoverable by regenerating, which the failure message
should say.

**Count before acting.** If any `meal_plan` rows will be removed, say so and
confirm: *"This rebuilds the list from your weekly plan. 4 items you haven't
ticked will be replaced; 3 you've marked as have or bought will be kept."*
Same discipline as the restrict deletes.

---

## The holiday bridge — now buildable, and it belongs here

v1 deferred this because `shopping_list_items.food_id` is
`NOT NULL references foods(id)` and "sun cream" had no `foods` row. Revision
3 resolved it: `foods` covers everything you buy, and `category` says what
kind of thing it is.

Phase 8 already stores `holiday_purchase_items.send_to_shopping` and
deliberately writes nothing else. Phase 7 completes it:

- For each purchase item with `send_to_shopping = true`, find or create a
  `foods` row by name, then insert a `shopping_list_items` row with
  `source = 'holiday'`.
- **Match before creating.** Reuse the Phase 6 lesson: look up by name
  (case-insensitive, trimmed) before inserting, or every holiday adds a
  duplicate "Sun cream" to `foods`. `findByBarcode()` is the pattern, but
  name matching is fuzzier — if a match is ambiguous, ask rather than guess.
- Ask the user for a **category** when creating a new food this way. Do not
  default it to `food_ambient` — sun cream is `personal`, and a wrong
  category puts it in the ingredient picker, which is the exact failure
  `category` exists to prevent.

Move that integration check from the Phase 8 block back into Phase 7's.

---

## Status changes are the one-tap action of this phase

Ticking items in a shop is the daily-use action, and a shop is exactly where
signal fails. `needed → have → bought` follows the Phase 5 shape:

- **Optimistic.** The tap counts immediately, the write happens behind it,
  an outright failure rolls back visibly. `views/water.js` v3 and Phase 8's
  `check-toggle` are the references. Never disable the button while a write
  is in flight.
- **Queued offline** via `attemptWrite()` / `enqueue()`, flushed with
  `flush(applyFn, { tables: ['shopping_list_items'] })` and an `op.table`
  assertion that **throws** on a foreign op (standing rule 7).
- A queued status change carries a real row id, so unlike Phase 6's queued
  foods there is no dependency problem — it applies cleanly on reconnect.

Pantry edits are not one-tap actions and are not queued; say so plainly when
offline rather than failing silently.

---

## Near-expiry, and a cross-phase edit that is gated

`data/pantry.js` exports `listUseSoon()` returning stock where
`last_restocked + shelf_life_days` is near or past, with the day count so the
caller can word it. One signal, computed once.

Two surfaces consume it:

1. **The shopping list** — flag as already stocked and likely still good, so
   it is not rebought. If a use-soon food also has a shortfall, show both
   facts; the user decides.
2. **The meal planner** — a "use these up" section in `views/meals.js`.

Surface 2 means **editing a Phase 6 file**, as does the ingredient-picker
category filter. Both are declared cross-phase edits; record them in the
handoff per `REPO_STRUCTURE.md`. Three constraints:

- Make them **last**, after everything else works.
- Make them **additive** — the filter is one `.filter()` on an existing
  list; the use-up section is one appended block. Change no existing
  function.
- Re-run `Tests/run-all.sh` after. `views/meals.js` is covered by the render
  gate, the a11y checks and the interaction trace, and this is exactly the
  shape of edit those exist to protect.

If Phase 6's smoke test forced changes to `views/meals.js`, re-read it
before touching it. Do not work from this brief's description of it.

---

## Deletion

`pantry_stock` and `shopping_list_items` are leaf tables — nothing
references them, so their deletes cascade and restrict nothing. Both still
get a confirm (principle 9); it is simply short.

They are the **dependents** in the other direction: both reference `foods`
with `ON DELETE RESTRICT`. Phase 6's `countFoodDependents()` already counts
all three restrict tables, so the food-delete confirm is already correct.
**Verify that rather than assuming** — put a food in the pantry, delete it,
and check the message names the pantry entry.

Removing a shopping item should offer an **undo toast** where practical
(conventions §3): a mis-tap in a shop is easy, and regenerating is a heavier
remedy than it deserves.

---

## Accessibility (WCAG 2.2 / 2.1 AA)

- The shopping list is a **list of stateful items**, not a grid. Real
  `<ul>`; each control announces its item name **and current state** via
  `aria-pressed` or text — never colour alone. "Bought" must read as a word.
- Category groups are real headings with the group's item count, so the list
  is navigable by heading rather than by scrolling.
- Shopping tap targets **≥ 44×44** — one-tap daily action. Phase 6's
  `.btn-small` (36px) is **not** appropriate here. Phase 8's `.check-toggle`
  is the right precedent.
- Every quantity carries its unit in text via `formatQuantity()`, never a
  bare number.
- Near-expiry is stated in words — *"bought 9 days ago, usually keeps
  14"* — never a red dot or colour-only badge. It is information about food
  you have, not a warning (principle 1).
- "Can't compare units" is explained on the line, not encoded in an icon.
- The pantry needs a usable empty state explaining how stock gets there —
  an empty pantry is the normal starting condition.
- New colour pairs: contrast across **all four theme combinations**
  (standing rule 11), added to `Tests/contrast.mjs`.

---

## Verification before commit

```
bash Tests/run-all.sh
```

Seven gates. Extend them — a gate that does not cover the new code protects
nothing:

- `Tests/behaviour.mjs` — the shortfall against a **hand calculation**:
  enough stock produces no item; no pantry row is treated as zero;
  `serves_override` scales the requirement; `default_serves` of zero does
  not produce `Infinity`; a `ml` or `item` pantry row is flagged
  incomparable rather than silently converted.
- `Tests/schema-conformance.mjs` — will pick up `category`, `unit` and
  `last_restocked` automatically. **Confirm it actually registered them**
  rather than merely not complaining: it is table-aware, so `unit` is valid
  on `pantry_stock` and invalid on `foods`.
- `Tests/trace.mjs` — every new control clicked, every write inspected.
  Assert that regeneration does **not** delete `have`/`bought`/`usual` rows.
- `Tests/queue.mjs` — the new table's scoped flush.
- `Tests/a11y.mjs`, `Tests/contrast.mjs` — as above.

Then: imports resolved, named exports confirmed, 53 precache paths returning
200, `CACHE_NAME` bumped, write-once files byte-identical.

---

## Smoke test (replaces the Phase 7 block in `INTEGRATION_CHECKS.md`)

- [ ] Cache Storage shows `home-os-shell-v19` with **53 entries**.
- [ ] Generate the list → **only the shortfall**, not everything. Verify one
      line by hand against the plan and the pantry.
- [ ] A food with enough stock does **not** appear.
- [ ] A food with no pantry row appears at its full required amount.
- [ ] Change a `serves_override`, regenerate → that quantity moves the right
      way.
- [ ] Regenerate twice → no duplicates.
- [ ] Mark an item bought, regenerate → **still bought**, not resurrected.
- [ ] A `usual` staple survives regeneration untouched.
- [ ] **Add a non-food item** — shower gel, light bulbs, guinea pig bedding
      — with the right category and `item` unit. It lists correctly with a
      sensible quantity ("3 items", not "3 g").
- [ ] **Open Meals. The non-food item is NOT offered as an ingredient.**
- [ ] The list is grouped by category in **aisle order**, not alphabetically.
- [ ] A pantry item stocked in `ml` against a grams recipe says so on the
      line rather than silently converting.
- [ ] Near-expiry uses `last_restocked`, and an item with no date recorded
      says "date not recorded" rather than guessing.
- [ ] A holiday purchase item ticked "add to shopping list" reaches the list
      with `source = 'holiday'`, and asks for a category when creating the
      food.
- [ ] **In a shop, on real mobile data or offline:** tick three items. Each
      counts immediately, no button disables, all sync on reconnect,
      IndexedDB empty after.
- [ ] Deleting a food that is in the pantry names the pantry entry in the
      confirm and is refused cleanly.
- *Ignore:* exact rounding conventions, as long as the shortfall direction
  is right.

---

## Open question for the architect

**A food can legitimately appear twice** — once generated from the meal
plan, once as a manually added `usual` staple. There is no unique constraint
on `food_id` and revision 3 did not add one.

Merging loses the `source` distinction, which is what makes regeneration
safe: a merged row cannot be replaced without destroying the manual one. Not
merging means "Oats" appears twice with two quantities, which reads as a bug
to someone holding the phone in a shop.

Category grouping makes this slightly worse, not better — both copies land
in the same group, adjacent.

Decide deliberately. If the answer is "show both", the list must say **why**
in text rather than leaving the user to work it out. Flag it rather than
guess if the wording cannot be made to read naturally — a shopping list that
looks wrong will not get used, whatever the data model says.
