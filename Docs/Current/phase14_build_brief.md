# Home-OS: Phase 14 Build Brief — Cook From What You Have
01 Sep 2026 v1

**No schema change.** This is the Phase 7 shortfall engine run backwards.

## The ask

> I've got salmon in the freezer. What can I make with salmon?

Two features, and the second is the one worth building.

## 1. Ingredient search

On the Meals screen, a search field that matches `foods.name` and returns
every meal using that food, with the quantity it needs. A join over
`meal_ingredients` and `foods`, one query.

Reuse the reference aliases from Phase 13 so "salmon" finds "Salmon fillet".

## 2. Ready to cook — the real feature

A ranked list of your meals, scored by **how little you would have to buy**.

For each meal, for each ingredient, compare the required quantity (converted
through `toGrams()`, scaled to `default_serves`) against `pantry_stock` for
that food. Classify:

| State | Meaning |
|---|---|
| `have` | pantry qty ≥ required |
| `short` | pantry row exists, qty below required |
| `missing` | no pantry row, or `current_qty` is 0 |
| `unknown` | `current_qty` is null, or units cannot be reconciled |

Rank by `missing` ascending, then `short` ascending, then meal name. Three
bands in the UI:

- **Ready now** — nothing missing, nothing short
- **Nearly there** — 1 or 2 items short or missing, and the list names them
- **Needs a shop** — 3 or more, collapsed by default

`unknown` never blocks a meal from "Ready now". You not having recorded how
much rice is in the jar is not evidence that there is none, and treating it
as a failure is exactly the framing this app rejects. Show it as a quiet
footnote: *"assumes you have rice — not recorded"*.

Filtering by an ingredient combines with this: "salmon" plus "Ready now" is
the actual question being asked.

Each row gets one action: **Add the missing items to the shopping list**,
writing `source = 'meal_plan'` rows through the existing Phase 7 path.

## Efficiency

This is a full cross-product of meals × ingredients × pantry. With 300
library recipes that is thousands of comparisons, and the Phase 9 dashboard
already carries a flagged concern about volume.

So: **one query for all meals with ingredients and foods nested, one query
for all pantry stock, and score in memory.** Never a query per meal. Compute
on view entry, hold the result in module scope, invalidate on any pantry or
meal write. If scoring 300 meals exceeds 50 ms in the render gate, add a
pre-filter on meals that share at least one food with the pantry.

## Where it lands

- `js/data/pantryMatch.js` — new module. `scoreMeals(meals, stock)` is a
  pure function taking already-fetched data, so it is testable against hand
  worked examples the way `computeMacros()` is.
- `views/meals.js` — the search field and the three bands.
- Optionally a dashboard tile, but only if it earns its place. Memory of the
  Phase 9 review: tiles must not become clutter.

## Tests

Behaviour: a meal with everything in stock lands in Ready now; one missing
item moves it to Nearly there and names it; null `current_qty` does not
demote; unit mismatch classifies `unknown`, never `missing`; the shopping
action writes only the shortfall; ingredient filter narrows correctly.

Render gate: all three bands populated, plus the empty state.

## Done when

You can stand at the freezer, type salmon, and get told which three things
you could cook tonight without going out.
