# Home-OS: Phase 11 Build Brief — Reconcile on Scan
01 Sep 2026 v1

**No schema change.** Everything here is application logic over the existing
18 tables.

## The defect

`js/data/foods.js` `findByBarcode()` looks for a `foods` row carrying that
barcode. A food you created by typing its name into the meal ingredient
picker has `barcode: null`. So the scan never matches it, `createFood()`
runs, and you end up with two rows for one thing:

| Row | Created by | barcode | macros | referenced by |
|---|---|---|---|---|
| A | ingredient picker | null | null | **your recipe** |
| B | the scan | 5012345678900 | full | nothing |

The recipe stays on A forever. This is the single largest cause of both
"the recipe card never fills in" and "the macros are unreliable".

## Scope

Three changes. Do them in this order.

---

### 1. The claim step

`components/scannerDialog.js` currently branches: match found → use it; no
match → create new. Insert a third branch between them.

**When** a scan returns a barcode with no `foods` match, before offering to
create anything, build a **candidate list** of rows the barcode plausibly
belongs to. A candidate is a `foods` row where `barcode is null` AND it is
currently *expected*:

- it appears in `shopping_list_items` with status `needed` or `bought`, OR
- it appears in `meal_ingredients` for a meal in the current
  `weekly_meal_plan`.

Rank by similarity between `foods.name` and the product name Open Food Facts
returned. Use a simple normalised token overlap (lowercase, strip
punctuation, drop words under 3 characters). Do not pull in a fuzzy-match
dependency for this.

Show at most 5, plus **"None of these — add as a new item"**.

**Choosing a candidate merges into it.** `updateFood(id, {...})` writing
`barcode`, `calories_per_100g`, `protein_g`, `fat_g`, `carbs_g`,
`source: 'openfoodfacts'`. The row id does not change, so every
`meal_ingredients` row already pointing at it now has macros. That is the
whole feature.

**Never overwrite a non-null macro with null.** If Open Food Facts has no
protein figure and the row has one, keep the row's. Merge is additive.

If the candidate list is empty, behave exactly as today. No empty dialog.

**A11y:** the candidate list is a radio group with a visible legend naming
the scanned product. Not a list of buttons — the user is answering one
question, not taking five actions.

---

### 2. Bought means it is in the cupboard

Marking a `shopping_list_items` row `bought` currently only writes `status`.
It must also upsert `pantry_stock` for that `food_id`:

- Row exists → `current_qty = coalesce(current_qty, 0) + qty_needed`,
  `last_restocked = today`. **Only when the units match.** If the list says
  `item` and the pantry row says `g`, do not add — flag the row and leave
  both alone. Silently adding 4 to 1600 would be a real corruption.
- No row → insert with `current_qty = qty_needed`, `unit` from the list
  item, `last_restocked = today`, `default_location` null.
- `qty_needed` null → set `current_qty` to null (schema.md: null is "amount
  not recorded", which is honest, and distinct from 0).

Reverting `bought` back to `needed` **does not** subtract. Undoing a
checkbox must not silently empty your cupboard. The confirm on revert says
so in one line.

---

### 3. Close the macro gaps where they are noticed

**3a.** The meal card's incomplete line ("2 of 5 ingredients have no
nutrition data") becomes a button. It opens a detail sheet listing exactly
those ingredients, each with an Edit and a Scan action. Fix it where you see
it — friction reduction, not a trip to another screen.

**3b.** In the meal ingredient form, when the unit is set to `ml` or `item`
and the chosen food has no `grams_per_ml` / `grams_per_item`, reveal an
inline field: *"Roughly how much does 1 [item_label or 'item'] weigh?"* /
*"How much does 100ml weigh?"*. Optional — skipping leaves the current
correct-but-empty behaviour. Filling it writes to `foods` once and every
recipe using that food benefits.

Do **not** guess a default. `toGrams()`'s refusal to invent numbers is
deliberate and stays.

---

## Tests

Add to the behaviour gate:

1. Scan with no barcode match and one shopping-list candidate → candidate
   offered, not a create form.
2. Claiming a candidate leaves `foods.id` unchanged and the meal's macro
   totals move from incomplete to complete.
3. Merge does not null out an existing macro when OFF returns nothing.
4. `bought` with matching units increments `current_qty`.
5. `bought` with mismatched units does not write, and reports why.
6. Reverting `bought` leaves `pantry_stock` untouched.
7. Candidate list empty → identical behaviour to today.

Render gate: scanner dialog with a candidate list, and the meal detail sheet
opened from the incomplete line.

## Done when

You can add "chorizo" to a recipe, see it on the shopping list, scan the
packet, and watch the recipe's macro table complete without a second
chorizo appearing anywhere.
