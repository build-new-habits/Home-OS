# Home-OS: Phase 12 Build Brief — Pack Sizes and Household Measures
01 Sep 2026 v1

**Schema revision 8.** Update `schema.md` first, then run the migration,
then write code.

## The problem, in Graeme's words

> I could tell you that I've got 1,600 grams of tins of tomatoes in the
> cupboard. How many tins have I got? That's something I don't have.

You already have it. `foods.grams_per_item = 400` plus
`pantry_stock.current_qty = 4, unit = 'item'` says exactly that, and
`computeMacros()` already converts "1 tin" to 400g of nutrition correctly.

What is missing is the **word**. Nothing knows an item of this food is
called a tin, so the UI prints "4 item", which reads as broken, and the
pantry form pushes you toward grams to avoid it.

## Revision 8

```sql
alter table foods add column item_label text;
```

Nullable. The **singular** noun for one item: `tin`, `egg`, `slice`,
`carrot`, `clove`, `bottle`, `bulb`. Null falls back to the word "item".

Rendering rule, applied everywhere a quantity in items is shown:

| Context | Output |
|---|---|
| Pantry, 4 × 400g tins | `4 tins (1.6 kg)` |
| Pantry, qty null | `Tins — amount not recorded` |
| Recipe ingredient | `1 tin chopped tomatoes` |
| Recipe, no `grams_per_item` | `1 tin chopped tomatoes — weight not set` |
| No `item_label` | `4 items` |

Pluralisation: append `s`, except a stored label already ending in `s`, and
a small explicit map for the handful that need it (`loaf/loaves`,
`half/halves`). Do not import a pluralisation library.

The parenthetical total is shown **only when `grams_per_item` is set**. It
is derived, never stored.

## Household measures — teaspoons and tablespoons

A teaspoon is 5 ml and a tablespoon is 15 ml, always. These are **display
units for ml** in exactly the way stone/lb is a display unit for kg, and
`schema.md` §8 forbids storing display units. So:

- No new value in the `unit` CHECK. The stored unit stays `ml`.
- The quantity control offers `g / ml / tsp / tbsp / item`. Picking `tsp`
  with quantity 2 stores `quantity_g = 10, unit = 'ml'`.
- **Display is the reverse conversion**, applied when the stored ml value is
  an exact multiple of 15 (→ tbsp) or 5 (→ tsp) and under 60 ml. 200 ml of
  milk stays 200 ml; it is not 13⅓ tbsp.

Density then does the work: soy sauce at `grams_per_ml` 1.2 makes a
tablespoon 18 g, peanut butter at 1.07 makes it 16 g. Both correct, no
special-casing of solids.

## Where this lands

- `js/lib/units.js` — **new file, write-once.** `formatQuantity(qty, unit,
  food)`, `pluraliseLabel(label, n)`, `toStorage(qty, displayUnit)`,
  `toDisplay(qtyMl)`. Pure functions, no imports beyond nothing. Every view
  formats through this and none rolls its own.
- `views/pantry.js` — item entry leads with the item count when
  `grams_per_item` is known, grams second.
- `views/meals.js` — the ingredient row and the ingredient form.
- `views/shopping.js` — "4 tins" on the list, not "4 item".
- `views/foods.js` — `item_label` and `grams_per_item` on the food form,
  adjacent, with the helper text "one tin weighs 400g".

## Tests

Behaviour gate: 2 tbsp stores 30 ml; 2 tsp stores
10 ml; 30 ml displays as 2 tbsp; 200 ml displays as 200 ml; 4 items with
`grams_per_item` 400 and label "tin" renders `4 tins (1.6 kg)`; null
`item_label` renders `4 items`; null `grams_per_item` omits the bracket;
`loaf` pluralises to `loaves`.

Schema gate: `foods.item_label` exists and is nullable.

Contrast and a11y gates unchanged, but the unit control is a `select` (a
constrained control for a constrained set — the `side` column lesson).

## Done when

The pantry says "4 tins of chopped tomatoes (1.6 kg)" and a recipe says
"1 tin", and the macro engine gets 400 g out of it without being told twice.
