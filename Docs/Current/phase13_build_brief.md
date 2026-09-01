# Home-OS: Phase 13 Build Brief — Reference Food Data
01 Sep 2026 v1

**Schema revision 9.** One widened CHECK constraint.

## Why a data file and not a document

A markdown table of average weights is something a human reads. This needs
to be something the app *reads*, so it pre-fills a form the moment you type
a name it recognises. It ships as `data/food_reference.json`, versioned in
the repo, precached by the service worker.

## Revision 9

```sql
alter table foods drop constraint if exists foods_source_check;
alter table foods add constraint foods_source_check
  check (source in ('manual','openfoodfacts','reference'));
```

Widening only. No existing row becomes invalid. `schema.md` §3 `foods` and
the revisions log both updated before this runs.

## The honesty problem, and its answer

`js/data/meals.js` refuses to guess, on purpose, and that refusal is the
reason the macro figures can be trusted at all. A reference average **is** a
guess. A good one, but a guess.

So reference-derived data is labelled, not hidden:

- A food pre-filled from the reference file gets `source = 'reference'`.
- `computeMacros()` returns an additional count, `estimatedCount`, of
  contributing ingredients whose food is `source = 'reference'`.
- The meal card's macro table caption reads *"3 of 6 ingredients use
  reference averages"* when that count is above zero. Neutral statement of
  fact, no warning styling — behavioural principle 1.
- Scanning the real product (Phase 11's merge) rewrites `source` to
  `openfoodfacts` and the caption drops away on its own.

Estimated figures **do** contribute to the totals. Refusing to count them
would put us back where we started.

## File format

```json
{
  "version": 1,
  "updated": "2026-09-01",
  "foods": [
    {
      "slug": "egg-medium",
      "name": "Egg, medium",
      "aliases": ["egg", "eggs", "medium egg"],
      "category": "food_fresh",
      "grams_per_item": 58,
      "item_label": "egg",
      "calories_per_100g": 143,
      "protein_g": 12.6, "fat_g": 9.5, "carbs_g": 0.7
    }
  ]
}
```

`grams_per_ml` present for liquids, absent for solids. Macros omitted
entirely for non-food (`grams_per_item` and `item_label` still useful —
a light bulb is one bulb).

## Initial contents — around 250 entries

Everything below carries a weight or density, and macros where it is food.

- **Eggs** small/medium/large/very large
- **Common veg by size** onion, carrot, potato, pepper, courgette,
  tomato, garlic clove, leek, celery stick, mushroom (small/medium/large
  where the size genuinely differs)
- **Fruit by size** apple, banana, lemon, lime, orange, avocado
- **Standard pack and tin sizes** 400g tin tomatoes/beans/chickpeas,
  198g tin sweetcorn, 400ml tin coconut milk, 250g butter block, 800g loaf
- **Liquids with densities** water, milk (whole/semi/skimmed), oils,
  soy sauce, fish sauce, vinegars, honey, maple syrup, stock
- **Spoonable solids with densities** peanut butter, tahini, tomato purée,
  mustard, mayonnaise, yoghurt, jam
- **Dry goods per 100g** rices, pastas, flours, oats, sugars, lentils,
  couscous
- **Herbs and spices** density for the ones measured in spoons
- **Staple proteins** chicken breast/thigh, salmon fillet, mince at common
  fat percentages, bacon rasher, sausage
- **Non-food with item weights** where the pantry benefits

Sourced from published composition tables (USDA FoodData Central, McCance
and Widdowson). These are factual measurements, not anyone's creative work.
Round sensibly; false precision on an average is its own kind of lie.

## Behaviour

**In the food form.** Typing a name matches against `name` and `aliases`
(normalised, case-insensitive). One good match shows an inline offer:
*"Use reference values for Egg, medium? Fills weight and macros. You can
change any of them."* Accepting fills the fields and sets `source`. It
never writes without the tap.

**In the ingredient picker.** Typing a food that exists in the reference but
not in your `foods` offers to create it complete, in one step, rather than
creating an empty row you have to go back and fill.

**Never overwrites.** A field you have already filled is left alone.
Reference data only fills blanks.

## New module

`js/data/foodReference.js` — loads and caches the JSON, exposes
`lookup(name)` and `search(term)`. Returns `{ ok, data | error }` like every
other data module. A missing or malformed file must degrade to "no
suggestions", never break the food form.

Service worker: add the JSON to the precache list, bump `CACHE_NAME`, and
verify the path returns 200 before shipping.

## Tests

Behaviour: alias match; no-match returns cleanly; accepting fills only
blank fields; `source` set to `reference`; `estimatedCount` counts only
contributing reference ingredients; corrupt JSON degrades quietly; scanning
over a reference food clears the estimated caption.

Schema: `source` accepts `reference`, still rejects junk.

## Done when

Typing "medium egg" into a recipe produces a complete ingredient with real
macros in one tap, and the card says plainly that some of its figures are
averages.
