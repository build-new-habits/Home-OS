# Home-OS: Phase 11 Handoff — Reconcile on Scan
01 Sep 2026 v1

**Shipped. All seven gates pass. No schema change.**

## What was wrong

`findByBarcode()` matched on `foods.barcode`. A food created by typing its
name into a recipe's ingredient picker has `barcode: null`, so the scan
never found it, `createFood()` ran, and one chorizo became two rows — the
recipe pointed at the empty one forever.

This was the single largest cause of both "the recipe card never fills in"
and "the macros are unreliable". They were the same defect.

## What shipped

### New files

| Path | Purpose |
|---|---|
| `js/data/foodClaim.js` | Candidate finding, ranking, and the merge patch |
| `js/components/claimDialog.js` | The radio-group dialog |
| `js/data/restock.js` | Bought → `pantry_stock` bridge |

### Changed

`js/views/pantry.js` v5 · `js/views/shopping.js` v3 · `js/views/meals.js` v13
· `js/data/meals.js` v4 · `css/components.css` v25 · `service-worker.js` v45
(CACHE_NAME `home-os-shell-v45`, three new precache paths, all verified 200)

### 1. Claim before create

On a scan with no barcode match, `findClaimCandidates()` gathers unbarcoded
foods that are *expected* — on the shopping list with status
`needed`/`bought`, or in an ingredient of a meal in `weekly_meal_plan` —
and ranks them against the Open Food Facts product name. Max 5, plus
"None of these", which is preselected.

Claiming calls `claimFood()`, which **updates the existing row**. The id
never changes, so every `meal_ingredients` row already pointing at it gains
macros immediately. That is the whole feature.

### 2. Bought means it is in the cupboard

`restockFromPurchase()` runs on a `bought` transition. Creates a
`pantry_stock` row or adds to the existing one, and stamps
`last_restocked`.

### 3. Macro gaps closed where they are noticed

- The "N of M ingredients are not counted here" line is now a button opening
  a sheet that lists exactly those foods with a route to edit each.
  `computeMacros()` gained `incompleteFoods` (`{ id, name }`) to make that
  possible; `incompleteNames` is unchanged and still returned.
- The ingredient form shows an inline, optional weight prompt when the unit
  is `ml` or `item` and the food lacks the matching factor. Saved to the
  **food**, so every recipe using it benefits.

## Decisions worth knowing

**Similarity scores against the smaller token set, not the union.** The name
you type is nearly always shorter than the name on the packet — "Chorizo"
against "Unearthed Spanish Cooking Chorizo Ring" — and Jaccard would punish
it for that. Supermarket names are stopworded out so "Tesco Chopped
Tomatoes" does not score against "Tesco Semi Skimmed Milk".

**The merge is strictly additive.** Open Food Facts has gaps. If the row has
a figure and the scan does not, the row keeps its figure. Overwriting real
data with null because a crowd-sourced database was missing a field would
make scanning something you learn to avoid.

**`source` only becomes `openfoodfacts` when data actually arrived.** A
barcode alone leaves a manual row manual. Phase 13 leans on `source` being
honest.

**Every candidate says why it is being suggested** ("On your shopping
list"). A recommendation the app cannot account for is one people stop
trusting.

**Unit mismatch writes nothing.** List in `item`, pantry in `g`: adding 4 to
1600 is silent corruption that surfaces weeks later as a nonsense list. The
correct conversion exists via `grams_per_item`, but doing it invisibly on a
status tap is the wrong moment — the user ticked a box, they did not ask to
reconcile units. Reported, not resolved.

**Restock does not fire for a queued (offline) status write.** It is a
second write to a second table; firing it against a status the server has
not accepted would stock a purchase that never happened.

**Restock failure never rolls back the tick.** You did buy the thing. A
pantry write that did not land does not make that untrue, and un-ticking it
under your thumb in a shop would be worse than the gap it fixes.

**`restock.js` is its own module, not part of `data/shopping.js`.** The
offline queue is table-scoped and `flush()` must not replay across tables. A
`pantry_stock` write inside the module whose queue entries are all tagged
`shopping_list_items` was exactly the wrong place for it.

## Tests

Behaviour gate 194 → **221 assertions**. New coverage: ranking against
longer packet names, stopword stripping, empty-name safety, never-overwrite,
null-does-not-clear, barcode-only leaves source alone, negative values
rejected, pack size to `grams_per_item`, every restock outcome producing a
sentence, mismatch naming both units, no congratulatory language.

All seven gates green: render (15 views in jsdom), behaviour, queue, a11y
(176 checks), contrast (124), schema conformance, interaction trace (74).

## Known gaps

- **Claim is wired into the pantry scan only.** `views/foods.js` has its own
  scan path and still creates directly. Same three functions, same shape —
  small follow-on, and worth doing before Phase 16 seeds anything.
- **Claim needs connectivity**, since candidates come from four reads. A
  scan while offline falls through to create-new, exactly as before.
- **The Edit route from the macro gap sheet** sets
  `#/foods?food=<id>`; the Foods view does not yet read that parameter, so
  it lands on the list rather than the row. Cosmetic, one small change in
  `views/foods.js`.
- **`grams_per_ml` is asked for per 100 ml** and stored per ml. Deliberate —
  100 ml is a quantity people can estimate — but the stored and asked units
  differ, which the Phase 12 display work needs to respect.

## Next

Phase 18 (household foundation) per `ROADMAP.md`. It goes before any new
table or seeded content: adding `household_id` to 18 tables costs a day now
and triples at every step afterwards.
