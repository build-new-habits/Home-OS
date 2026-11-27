# Phase 38 handoff — Christmas menus and the macros rule
27 Nov 2026 · shell v186

## What shipped

### 52 Christmas recipes (`data/recipe_library/christmas.json`, cuisine "Christmas")
- **9 starters**: smoked salmon blinis, prawn cocktail, seared scallops with minted peas and pancetta, chicken liver pâté, beetroot with goats' cheese and walnuts, spiced parsnip and apple soup (vegan), Thai crab cakes with lime leaf, mushroom and chestnut pâté (vegan), Stilton, pear and walnut tartlets.
- **13 mains**: turkey crown, honey and mustard gammon, beef fillet with green peppercorn sauce, slow-roast duck with orange and star anise, side of salmon with herb crumb, saffron fish and mussel stew, lobster tails in garlic butter, Thai green king prawn curry with galangal and lime leaves, squash and goats' cheese Wellington, cranberry and chestnut nut roast (vegan), whole roast cauliflower with tahini (vegan), celeriac steaks with green peppercorn sauce (vegan).
- **10 sides** (marked `"side": true`): roast potatoes, honey-roast roots, sprouts with chestnuts, braised red cabbage, cranberry sauce, bread sauce, pigs in blankets, turkey gravy, vegan gravy, brandy butter. A side is never offered as a meal on its own by Fill the week or Shape my week (`weekIdeas.courseOrSide`).
- **10 puddings**: Christmas pudding, mince pies, sherry trifle, yule log, clementine pavlova, sticky toffee, chocolate orange mousse (vegan), pears in mulled wine (vegan), panettone bread and butter pudding, coconut lime and lemongrass rice pudding (vegan).
- **11 drinks**: with alcohol — mulled wine, mulled cider, cranberry and orange fizz, clementine and rosemary G&T, cooked eggnog; soft — spiced apple and cranberry punch, mulled red grape juice, orange hot chocolate, pomegranate and ginger fizz, elderflower and cranberry spritz, ginger lime and lemongrass cooler.
- Every recipe in the house step style, with swaps (vegetarian, vegan, gluten free, dairy free, no alcohol). Spoons are stored as ml, like the rest of the library.

### 12 menus (`data/menus/christmas.json`), Meals → Christmas menus
- `#/menus` lists them with filter chips: All, Meat, Fish, Shellfish, Vegetarian (includes vegan), Vegan.
- `#/menu?o=christmas&m=<slug>`: starter, main with its sides, pudding — each a card to the recipe — and under each course a **soft** and a **with alcohol** pairing. Drinks the app has a recipe for are links. Wines named by style or region, never brand. Vegan menus remind you to check wine labels.
- One primary action: **Add this menu to My meals** (Hearth). Free sees the Hearth card.

### The macros rule (`Tests/pantry.mjs`, gate 17)
Every run checks:
1. every food (not household, toiletries or pet) has all five figures — energy, protein, fat, carbohydrate, fibre;
2. every food has a `basis` saying where they come from;
3. a figure cited from CoFID or USDA matches that row exactly;
4. energy adds up from the five figures (exceptions listed with reasons);
5. no name or alias points at two foods;
6. every library ingredient converts to grams (density for ml, weight for items);
7. every library recipe's nutrition is complete — nothing unknown;
8. 107 ingredient lines typed as a cook writes them (kaffir lime leaves, green peppercorns in brine, galangal, shrimp paste, star anise, sumac, za'atar…, and everyday ones) resolve to a food with figures and grams.

### World pantry (`scripts/world_pantry.py`, `food_reference.json` v5)
- **147 foods added or replaced**, 622 in all. CoFID 2019 first, USDA SR Legacy second, typical UK label values third (no brands), blends worked out from their parts. Each with spoon densities and item weights (a lime leaf 0.5 g, a star anise 0.6 g, a clove 0.1 g, a cinnamon stick 3 g).
- **One carbohydrate, UK-style.** USDA counts fibre inside carbohydrate; UK labels and CoFID do not. 93 older entries had USDA totals (cinnamon 81 g → 28 g, chia 42 g → 8 g, cocoa 58 g → 25 g, avocado 8.5 g → 1.8 g). All corrected. New USDA figures arrive with fibre taken out.
- Coffee had no figures at all; now it does.
- To add a food: one line in `SPEC`, run the script, run the gates.

### Also
- Meat, fish and diet readers know the new foods: `recipeLibrary.proteinsOf` (hake, scallops, lobster, pancetta, venison…), `dietSwitch` (never offers duck or shellfish as vegetarian; crème fraîche, panettone not vegan), `shelves` (whole spices, world pastes).
- `foodNames.countedName`: "6 kaffir lime leaves", "12 scallops", "6 juniper berries" (was "leaves of kaffir lime leaves").

### Saved foods brought up to date
- Foods already in your database with figures from the reference (`source = 'reference'`) are matched again by name once, on the next daily nutrition pass, and updated where the reference now differs (`nutritionRepair.refreshReferenceFoods`, `REFERENCE_VERSION = 5`). They appear on Nutrition filled in with a Change button. A figure you typed or scanned is never touched.
- Find nutrition and the automatic ingredient match now read the US tables UK-style too (`cofid.ukCarbs`), so one carbohydrate runs through every source.

## Not done / next
- Duck figures are raw meat and skin; fat poured off after roasting is not subtracted.
- No database change in this phase. Migration 030 (Phase 37) is still to run.

## Gates
18 gates, all passing: + Pantry (10,488 checks), + Menus (574 checks). Library 334 recipes.

---

# Phase 38b — many more Christmas recipes (27 Nov 2026)

- **138 Christmas recipes** (was 52): 28 starters, 37 mains, 23 sides, 29 puddings, 21 drinks. New mains include mushroom and chestnut Wellington (vegan), classic nut loaf, chermoula sea bass, hasselback butternut squash, squash and sage risotto, squash and chickpea curry, wild-rice stuffed squash, roast goose, pheasant, leg of lamb, venison casserole, pork belly, roast beef, salmon en croûte, smoked haddock fish pie, seafood linguine, monkfish, mushroom bourguignon, vegan shepherd's pie, filo pie, and Boxing Day turkey pie and curry.
- **29 menus** (was 12), including goose, game, lamb, beef, pork, two fish suppers, Italian seafood, vegan Wellington, vegan bourguignon and Boxing Day leftovers.
- **16 more pantry foods** (goose, pheasant, topside, pork belly, smoked haddock, wild rice, ricotta, figs, cherries, blackberries, fennel, chicory, ginger nuts, condensed milk, sourdough, cavolo nero). 638 foods in all.
- **Spoon weights for older foods** (`DENSITY_ADD`): cocoa, icing sugar, flours, sugars, seeds, nuts, herbs and more, so "1 tbsp cocoa" counts. The pantry gate found these.
- Gate floors raised: at least 25 starters, 35 mains, 25 puddings, 20 sides, 25 menus.
- Missing macros: none. Every food in the reference has all five figures and a source (the gate fails the build otherwise); only household, toiletry and pet items have none, on purpose. Foods in your own database with no figures are still filled once a day by the nutrition repair.

## Phase 38c — luxury Christmas (27 Nov 2026)

- Christmas library doubled to 279 recipes: 63 starters, 81 mains, 65 puddings, 34 sides and 36 drinks. The new recipes carry the `lux-` slug prefix. Examples: beef Wellington, lobster thermidor, miso black cod, turbot in Champagne butter, venison with dark chocolate, porchetta, beetroot Wellington, chestnut mushroom pithivier, yuzu tart, Mont Blanc and passion fruit pavlova.
- 36 new foods in food_reference.json, among them quail, turbot, oysters, langoustines, caviar, yuzu, sake, mirin, burrata, truffle oil and nori. Each comes with full macros and a stated basis.
- Menus doubled to 58. The 29 new luxury menus cover meat, fish, shellfish, vegetarian and vegan. Every course carries a soft drink and an alcoholic drink, and every vegan menu carries the vegan wine note.
- Gate 18 floors raised: 50 menus, 55 starters, 70 mains, 55 puddings, 30 sides. Sake counts as a drink with alcohol.

## Phase 38d — the chefs' batch (27 Nov 2026, night)

- **558 Christmas recipes** (was 279): 127 starters, 161 mains, 130 puddings, 68 sides and 72 drinks. The new recipes use the `chef-` slug prefix. They take inspiration from this season's food writing and supermarket ranges: Ottolenghi-style spice and pomegranate, Guardian-style vegan and Indian cooking, BBC Good Food classics, and the 2026 trends for pistachio, maple, sour cherry, malt, vol-au-vents and aperitivo drinks. Every recipe and every word of method is written for Home-OS. No chef, shop or brand is named in the app.
- **130 menus** (was 58): 29 more meat menus, 13 fish, 10 shellfish, 10 vegetarian and 10 vegan.
- **22 new foods**, each with five figures and a stated basis: black garlic, dried sour cherries, radicchio, labneh, preserved lemon, orange blossom water, chilli flakes (pul biber, Aleppo, Urfa), bulgur, freekeh, malted milk powder, pecorino, 'nduja, plantain, paneer, polenta, clams, halva, sweet chestnut purée, jerk paste, dukkah (a blend), vermouth and bitter aperitivo (named in the app by style, never by brand). There is also a spoon weight for ice cream.
- **Diet readers:**
  - `recipeLibrary` v9 counts prosciutto, salami, 'nduja, quail and porchetta as meat, and turbot, halibut, bream, caviar and cockles as fish.
  - `dietSwitch` v4 never offers those, or game birds and luxury shellfish, as vegetarian. It never offers burrata, ricotta, labneh, paneer or pecorino as vegan.
- **Tags:** the build now adds `vegetarian` to every vegan recipe, so the vegetarian filter includes vegan dishes.
- **Cache:** service worker v141, shell v187. Phones fetch the new library the first time they open the app.
- **Gate 18 floors:** at least 110 menus, 120 starters, 150 mains, 120 puddings and 60 sides. Vermouth and bitter aperitivo count as drinks with alcohol.
