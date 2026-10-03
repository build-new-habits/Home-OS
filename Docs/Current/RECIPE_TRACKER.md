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

## Market library balance, 3 Oct 2026 (afternoon)

146 shipped recipes, all original. 36 added on 3 Oct to fill the gaps below.

| Slot | Meat or fish | Vegetarian | Vegan | Total |
| --- | --- | --- | --- | --- |
| Breakfast | 3 | 11 | 4 | 18 |
| Lunch | 7 | 12 | 11 | 30 |
| Dinner | 34 | 20 | 21 | 75 |
| Snack | 1 | 6 | 8 | 15 |
| Drink | 0 | 6 | 2 | 8 |

Cuisine counts: Italian 17, British 15, Indian 6, French 4, Greek 4, Mexican 4, Middle Eastern 4, Spanish 4, Caribbean 3, Chinese 3, Japanese 3, Korean 3, Thai 3, West African 2, Vietnamese 2, Ethiopian 1. The rest are filed by role (Vegetarian, Snacks, Breakfast, Special, Budget, Drinks, Lunch).

Cost: budget 98, everyday 38, special 10.

Added 3 Oct: 8 drinks (smoothies, lassi, golden milk, hot chocolate, mint tea, ginger and lemon), 4 vegan breakfasts, 5 vegan snacks, and dishes from Japan, Korea, Greece, Spain, Vietnam, West Africa and Ethiopia. Eight new reference foods came with them (fresh mint, miso, rice vinegar, gochujang, kimchi, edamame, pak choi, beansprouts). Drinks are stored with `meal_type` 'drink' until migration 026 lets `default_slot` hold it.

### Gaps, in priority order

1. **Special occasions: 10.** A few weekend and celebration dishes would round it out. Good use for book picks.
2. **Meat or fish breakfasts and snacks: 3 and 1.** Smoked fish, eggs with bacon, a savoury muffin.
3. **Thin cuisines:** Caribbean, Chinese, Thai, Japanese and Korean have 3 each; West African, Vietnamese and Ethiopian 2 or fewer. Turkish, Persian, Filipino, Malaysian, Sri Lankan and Polish have none.
4. **Cold drinks:** most drinks are smoothies or hot. Iced tea, lemonade, a cordial.
5. **Bowls and salads as lunch:** the Buddha Bowls scans are a natural fit here.
6. **Cost:** special is still only 10 of 146.

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
