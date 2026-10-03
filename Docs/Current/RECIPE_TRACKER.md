# Recipe tracker

3 Oct 2026. Two lists:

- **Household library:** every recipe scanned, exactly as transcribed. Private to the household and held in Supabase, never in this public repo.
- **Market library:** the recipes that ship to every user. Originals, plus scanned recipes converted under the rules in the kitchen blueprint.

The per-source cap ledger is `data/recipe_sources.json`.

## Conversion rules (summary)

A scanned recipe enters the market library only when all of these hold:

1. It has a new plain name.
2. It carries the line "Inspired by *Book*, Author".
3. Its ingredient list is our own: re-measured, and every line mapped to a reference food.
4. The method is in bullet steps under `RECIPE_STEP_STYLE.md`. The library gate enforces this.
5. It offers swaps where they fit: vegetarian or vegan, and for ingredients people often lack.
6. Nothing is copied: no introductions, tips or sentences.
7. It has at least two real changes beyond wording.
8. The source is under its cap: the lower of 6 and 10% of the source's recipes, counted across every month ever.

## How picks are chosen

Each pick has to fill a gap in the balance table below. In order, a pick should:

1. Add to a meal slot or diet cell that is thin.
2. Add a cuisine the library lacks or has three or fewer of.
3. Keep effort and cost spread: some quick, some weekend, mostly budget or everyday.
4. Be a dish worth cooking on its own, not a component. Dressings and sauces come in only as part of a dish.

## Market library balance, 3 Oct 2026

110 shipped recipes, all original.

| Slot | Meat or fish | Vegetarian | Vegan | Total |
| --- | --- | --- | --- | --- |
| Breakfast | 3 | 11 | **0** | 14 |
| Lunch | 5 | 10 | 10 | 25 |
| Dinner | 26 | 20 | 16 | 62 |
| Snack | 1 | 6 | **2** | 9 |
| Drink | **0** | **0** | **0** | **0** |

Cuisine counts: Italian 17, British 15, Indian 6, Middle Eastern 4, Mexican 4, French 4, Caribbean 3, Chinese 3, Thai 3. The other 34 are filed by role rather than cuisine (Vegetarian, Special, Lunch, Budget, Snacks, Breakfast).

Cost: budget 73, everyday 27, special 10.

### Gaps, in priority order

1. **Drinks: none.** The plan has a drinks row. Needs smoothies, teas, hot drinks and a few cold ones. Originals are fine here.
2. **Vegan breakfast: none.**
3. **Snacks: 9 in all, 2 vegan.**
4. **Thin cuisines:** Chinese, Thai and Caribbean have 3 each. Japanese, Korean, West African, Ethiopian, Greek, Spanish and Vietnamese have none.
5. **Special occasions: 10.** A few weekend and celebration dishes would round it out.
6. **Bowls and salads as lunch:** the Buddha Bowls scans are a natural fit here.

## Household library

| Source | Recipes scanned | Notes |
| --- | --- | --- |
| Buddha Bowls | 63 | Includes the 8 dressings and sauces, plus 4 sub-recipes linked from bowls |
| Guardian Feast, 27 Dec 2025 | 11 | Includes one meat dish (pancetta montaditos) |
| A Good Appetite, Jenny Chandler (National Trust magazine) | 11 | Lamb shoulder, jewelled rice, turkey wellington, crab gratin and others |
| **Total** | **85** | Transcribed 13 Sep 2026 |

The full list of names is filled in from Supabase `meals` once the seed is confirmed there. New scans are added here batch by batch.

### Needs re-shooting

- Malai kofta biryani (Guardian Feast, 27 Dec 2025). The ingredient column runs into the fold.

## Market picks from scans

None yet. Picks are made as batches arrive, against the gaps above. Each one is recorded here and in `data/recipe_sources.json`.

| Pick | Source | Fills | New name | Status |
| --- | --- | --- | --- | --- |
