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

## Market library balance, 3 Oct 2026 (evening)

175 shipped recipes, all original. 65 added on 3 Oct across two rounds.

| Slot | Meat or fish | Vegetarian | Vegan | Total |
| --- | --- | --- | --- | --- |
| Breakfast | 6 | 12 | 4 | 22 |
| Lunch | 7 | 13 | 14 | 34 |
| Dinner | 46 | 21 | 23 | 90 |
| Snack | 3 | 7 | 8 | 18 |
| Drink | 0 | 7 | 4 | 11 |

Cuisine counts: Italian 17, British 15, Indian 6, Caribbean 5, Chinese 5, Thai 5, French 4, Greek 4, Mexican 4, Middle Eastern 4, Spanish 4, Japanese 3, Korean 3, Sri Lankan 3, Turkish 3, West African 2, Malaysian 2, Persian 2, Vietnamese 2, Ethiopian 1, Filipino 1. The rest are filed by role (Vegetarian, Snacks, Breakfast, Special, Budget, Drinks, Lunch).

Cost: budget 110, everyday 52, special 13.

Round 1 (afternoon): 8 drinks, 4 vegan breakfasts, 5 vegan snacks, and dishes from Japan, Korea, Greece, Spain, Vietnam, West Africa and Ethiopia. Eight new reference foods (fresh mint, miso, rice vinegar, gochujang, kimchi, edamame, pak choi, beansprouts).

Round 2 (evening): 4 specials (herb-crusted salmon, chicken and apricot stew, stuffed peppers, chocolate pots), 3 meat or fish breakfasts, 2 meat or fish snacks, 3 cold drinks, and Turkish, Sri Lankan, Persian, Malaysian and Filipino dishes, plus two each for Chinese, Thai and Caribbean. New reference foods: smoked salmon, dried apricots. Tea bags now carry brewed figures (about 2 kcal a cup) so iced tea can be counted.

Drinks are stored with `meal_type` 'drink' until migration 026 lets `default_slot` hold it.

Round 3 (evening): starters and puddings, now a **course** rather than a meal time. 9 starters (8 new plus bruschetta) and 12 puddings (10 new plus the chocolate torte and chocolate pots), 193 recipes in all. A course sits in the dinner (or lunch) slot beside the main; the plan panel lists dishes in eating order.

Round 4 (evening, Graeme's list): fish and vegetarian dinners. Thai green chicken curry, Thai red curry with cauliflower and tofu, massaman curry, tom yum-style prawn soup, pad Thai with prawns and tofu, teriyaki salmon, roast cauliflower with romesco, prawn and chilli spaghetti, cod in tomato and olive, butternut risotto, fish pie, salmon fishcakes, smoked mackerel pâté, tuna niçoise-style salad, sea bass with salsa verde, fish and chickpea stew, squash and chickpea tagine, Goan-style fish curry, aloo gobi, halloumi fajitas, sweet potato and black bean enchiladas. Margherita pizza and lentil ragu were already in (Italian). All are our own versions; nothing follows a named cook's recipe. Library recipes can now carry **swaps** ("Instead of chicken thighs: firm tofu…"), shown under the ingredients; 20 do so far.

Mix after round 4: 214 recipes; 32 with fish or seafood, 135 vegetarian or vegan, 47 with meat.

Swaps for the rest of the library (3 Oct, evening): 164 older recipes now carry up to three swaps, chosen from what is in them and what they already are: a vegetarian swap for meat or fish first, then vegan (honey), dairy free, gluten free and nut free, then everyday ones (spinach to kale, any white fish). A recipe that is already vegan and gluten free gets none. The rules live in the generator, so new recipes can be given swaps the same way.

### Gaps, in priority order

1. **Book picks.** The original library is now broad; the next balance gains come from converted scans (Buddha Bowls for lunches especially).
2. **Meat or fish snacks: still few.** Fine for most households; a couple more would round it out.
3. **Vegan starters and puddings:** two of each so far.
4. **Cuisines with one or two:** Filipino, Ethiopian, Malaysian, Persian, Vietnamese, West African. Polish, Lebanese and Ethiopian sides could follow.
5. **Cost:** special is 13 of 175.

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
