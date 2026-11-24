# Home-OS: Phase 34 Handoff — Quick Kitchen
24 Nov 2026 v1

Graeme, 24 Nov 2026, after using Phase 33 on his phone:
> "Recipes" in the app should be Meals and then Community library and my
> meals. Finding the ones I've imported is hard. We need to be better at
> figuring out the macros without the user. There needs to be an
> interpretation of [some] instructions into grams or kilograms. It's too
> procedural and complicated at the moment.

**No schema change.**

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/ingredientMatch.js` | v1 (new) | Matching without asking: any word order, singular, preparation words removed, size defaulted to medium, American words made British, then the 10,000 offline food tables (confident matches only) |
| `js/lib/kitchenMeasures.js` | v1 (new) | cup, oz, lb, pint, fl oz, quart, dessertspoon, splash, handful, knob, bunch, sprig, tin and stick of butter, converted to g or ml by what they measure. Pinch and dash have no amount, as before |
| `js/data/ownRecipe.js` | v6 | `resolveName` uses the above; `parseIngredientLine` converts measures; a table match saves its figures (source `reference`) under the cook's own word |
| `js/views/recipeCheck.js` | v1 (new) | **Check and save** (`#/recipe-check`): name, serves − n +, per-serving nutrition, each ingredient with its match ticked, one Save. "Change ingredients or steps" opens the full editor |
| `js/views/mealsHome.js` | v1 (new) | **Meals tab** (`#/meals-home`): My meals and Community library, Recently added (imports first by date), Import a recipe as the primary action |
| `js/views/recipeImport.js` | v2 | An import lands on Check and save |
| `js/views/recipeEditor.js` | v6 | Runs the same automatic matching |
| `js/data/recipeImport.js` | v2 | Converted lines keep what the recipe said ("Recipe said 1 cup") |
| `js/navConfig.js` | v15 | Bar label Recipes → **Meals**, opening `meals-home`; library listed as Community library |
| `js/views/library.js` | v9 | "Community library", back to Meals |
| `js/views/meals.js` | v34 | "My meals", back to Meals |
| `js/routes.js` | v10 | Appends `recipe-check`, `meals-home` |
| `service-worker.js` | v135 | Shell v181 |
| `css/components.css` | v102 | Check and save, Meals tab |
| `Tests/import.mjs` | v2 | +51 checks: measures, matching, table fallback refusing guesses, Recently added order, copy of the new screens |

## How much better the matching is
On 47 typical web recipe lines (lentil stew, curry, bakes, American
recipes), 46 now match a food with no tap; the one left is "salt and
pepper", which has no amount and never changes the figures. Before this
phase the same lines needed a tap for every cup, oz, lb, knob and every
name not spelled exactly like the food list.

Run end to end in jsdom against the real food data: a pasted lentil stew
caption landed on Check and save with **all 8 ingredients ready, nothing
to choose**, 265 kcal a serving, and saved in one tap.

## Decisions
- **US cup (240 ml)**, because cup recipes on the web are American. A cup of
  something the table does not know stays 240 ml: a volume is honest, a
  guessed weight is not.
- **Table matches only when every word is accounted for** (`bestMatch`'s
  confident). "Salt and pepper" and anything with "and" are not guessed.
- **A table match keeps the cook's word** as the food's name ("red lentils"),
  so the shopping list does not read "Lentils, red, split, dried, raw".
- **Routes stay.** `library` and `meals` keep their addresses; only the bar
  points somewhere new.

## Live check on the phone
1. Bottom bar says **Meals**. It shows My meals, Community library, Recently added.
2. Import a recipe (link or caption) → **Check and save** → the ingredient
   ticks and per-serving figures are there → **Save recipe** → recipe page.
3. Back on Meals, that recipe is first under Recently added.
4. A recipe with cups or ounces: the line shows grams, with "Recipe said 1 cup".

## Known limits
- Items matched only in the UK/US tables have no item weight, so "2 chicken
  thighs" from a table needs a weight (Choose asks). Everyday foods carry
  item weights already.
- The cup table covers everyday baking and cooking foods, not everything.
