# scripts/seasons/bakes.py — 27 Nov 2026 v1
# Phase 44. Oven bakes: pasta bakes, gratins, pies, crumbles, cakes,
# cookies, muffins, scones, tarts, jackets, fish parcels, pizzas, baked oats.
from build import Book
from gen import t, join, refs_of

b = Book('bakes', 'Oven bakes', 'bk')

# ---- Pasta bakes: (key, name, cuisine, sauce ings, sauce steps) ----
PB = [
  ('tomato-mozzarella', 'Tomato and mozzarella pasta bake', 'Italian', ['passata 700g', 'garlic-clove 2', 'dried-oregano 1tsp', 'mozzarella 2'], 'Stir {passata}, {garlic-clove} and {dried-oregano} through the pasta.', 'Tear over {mozzarella}.'),
  ('sausage-fennel', 'Sausage and fennel pasta bake', 'Italian', ['sausage-pork 6', 'fennel-seeds 1tsp', 'passata 700g', 'cheddar-cheese 100g'], 'Fry {sausage-pork} meat out of its skins with {fennel-seeds} 8 minutes. Stir through the pasta with {passata}.', 'Scatter {cheddar-cheese}.'),
  ('tuna', 'Tuna pasta bake', 'British', ['tuna-tinned-in-spring-water 2', 'sweetcorn-tinned 1', 'passata 500g', 'cheddar-cheese 120g'], 'Stir drained {tuna-tinned-in-spring-water}, {sweetcorn-tinned} and {passata} through the pasta.', 'Scatter {cheddar-cheese}.'),
  ('chicken-pesto', 'Chicken and pesto pasta bake', 'Italian', ['chicken-breast-roast 300g', 'pesto 120g', 'creme-fraiche 200ml', 'mozzarella 1'], 'Shred {chicken-breast-roast}. Stir through the pasta with {pesto} and {creme-fraiche}.', 'Tear over {mozzarella}.'),
  ('roast-veg', 'Roast vegetable pasta bake', 'Italian', ['courgette 2', 'pepper-bell 2', 'red-onion 1', 'passata 600g', 'feta 150g'], 'Stir chopped {courgette}, {pepper-bell}, {red-onion} and {passata} through the pasta.', 'Crumble over {feta}.'),
  ('broccoli-cheese', 'Broccoli and cheese pasta bake', 'British', ['broccoli-head 1', 'milk-whole 600ml', 'flour-plain 3tbsp', 'butter-unsalted 40g', 'cheddar-cheese 150g'], 'Add {broccoli-head} florets to the pasta water for the last 3 minutes. Whisk {milk-whole}, {flour-plain} and {butter-unsalted} until thick.', 'Stir in most of {cheddar-cheese}; scatter the rest.'),
  ('meatball', 'Meatball pasta bake', 'Italian', ['beef-mince-5-fat 400g', 'breadcrumbs-dried 30g', 'passata 700g', 'mozzarella 1'], 'Mix {beef-mince-5-fat} and {breadcrumbs-dried}. Roll 16 balls. Nestle in the pasta with {passata}.', 'Tear over {mozzarella}.'),
  ('spinach-ricotta', 'Spinach and ricotta pasta bake', 'Italian', ['spinach 200g', 'ricotta 250g', 'passata 600g', 'parmesan 40g', 'nutmeg 0.25tsp'], 'Stir wilted {spinach}, {ricotta}, {nutmeg} and {passata} through the pasta.', 'Grate over {parmesan}.'),
  ('chorizo-pepper', 'Chorizo and pepper pasta bake', 'Spanish', ['chorizo 120g', 'pepper-bell 2', 'passata 700g', 'smoked-paprika 1tsp', 'cheddar-cheese 100g'], 'Stir diced {chorizo}, sliced {pepper-bell}, {smoked-paprika} and {passata} through the pasta.', 'Scatter {cheddar-cheese}.'),
  ('salmon-leek', 'Salmon and leek pasta bake', 'British', ['salmon-fillet 2', 'leek 2', 'creme-fraiche 250ml', 'parmesan 40g'], 'Slice {leek}. Stir through the pasta with flaked raw {salmon-fillet} and {creme-fraiche}.', 'Grate over {parmesan}.'),
]
for key, name, cui, extra, s1, s2 in PB:
  ings = ['penne-dry 400g'] + extra
  steps = ['Heat the oven to 200C.',
           'Cook {penne-dry} 2 minutes less than the packet says. Drain. Tip into a baking dish.',
           s1, s2,
           'Bake 25 minutes, until bubbling and golden.']
  b.R(f'pastabake-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

# ---- Gratins ----
GR = [
  ('dauphinoise', 'Potato dauphinoise', ['potato-large 4', 'double-cream 300ml', 'milk-whole 200ml', 'garlic-clove 2', 'nutmeg 0.25tsp'], 75),
  ('leek-gratin', 'Leek and Gruyère gratin', ['leek 4', 'double-cream 200ml', 'gruyere 100g', 'breadcrumbs-dried 30g'], 30),
  ('fennel-gratin', 'Fennel and parmesan gratin', ['fennel-bulb 3', 'double-cream 200ml', 'parmesan 50g', 'fresh-thyme 4'], 35),
  ('squash-gratin', 'Butternut squash and sage gratin', ['butternut-squash 1', 'double-cream 300ml', 'fresh-sage 6', 'cheddar-cheese 80g'], 50),
  ('celeriac-gratin', 'Celeriac and potato gratin', ['celeriac 500g', 'potato-medium 3', 'double-cream 300ml', 'garlic-clove 2'], 60),
  ('cauli-broccoli', 'Cauliflower and broccoli cheese', ['cauliflower-head 1', 'broccoli-head 1', 'milk-whole 500ml', 'flour-plain 3tbsp', 'cheddar-cheese 150g'], 25),
  ('sweet-potato-gratin', 'Sweet potato and coconut gratin', ['sweet-potato 4', 'coconut-milk-tinned 1', 'garlic-clove 2', 'chilli-flakes 0.5tsp'], 50),
  ('tomato-gratin', 'Provençal tomato gratin', ['tomato-medium 8', 'breadcrumbs-dried 50g', 'garlic-clove 2', 'olive-oil 3tbsp', 'fresh-parsley 15g'], 30),
]
for key, name, ings, mins in GR:
  refs = refs_of(ings)
  veg = [r for r in refs if r in ('potato-large', 'potato-medium', 'leek', 'fennel-bulb', 'butternut-squash', 'celeriac', 'cauliflower-head', 'broccoli-head', 'sweet-potato', 'tomato-medium')]
  rest = [r for r in refs if r not in veg]
  steps = ['Heat the oven to 180C.',
           f'Slice {join(veg)} thinly.',
           'Layer in a buttered baking dish.',
           f'Pour over or scatter {join(rest)}.',
           f'Bake {mins} minutes, until tender and golden on top.']
  b.R(f'gratin-{key}', name, 'side', ings, steps, serves=6, tier='everyday', cuisine='French')

# ---- Pies ----
PIES = [
  ('steak-ale', 'Steak and mushroom pie', ['beef-braising 700g', 'flour-plain 2tbsp', 'onion-medium 1', 'mushroom-chestnut 10', 'stock-cube 2', 'puff-pastry 320g', 'egg-medium 1'],
   ['Toss diced {beef-braising} in {flour-plain}. Brown in a casserole with chopped {onion-medium}.', 'Add {mushroom-chestnut} and {stock-cube} in 500 ml water. Cover. Cook in the oven at 160C for 2 hours.', 'Cool a little. Tip into a pie dish. Turn the oven up to 200C.', 'Top with {puff-pastry}. Brush with beaten {egg-medium}.', 'Bake 30 minutes, until puffed and golden.']),
  ('cottage-pie', 'Cottage pie', ['beef-mince-5-fat 500g', 'onion-medium 1', 'carrot-medium 2', 'tomato-purée 2tbsp', 'stock-cube 1', 'potato-large 4', 'butter-unsalted 40g', 'milk-whole 100ml'],
   ['Brown {beef-mince-5-fat} with chopped {onion-medium} and {carrot-medium} 10 minutes.', 'Add {tomato-purée} and {stock-cube} in 300 ml water. Simmer 20 minutes.', 'Boil peeled {potato-large} 20 minutes. Mash with {butter-unsalted} and {milk-whole}.', 'Heat the oven to 200C. Tip the mince into a dish. Top with the mash.', 'Bake 30 minutes, until golden.']),
  ('fish-pie-prawn', 'Prawn and smoked haddock pie', ['haddock-smoked 300g', 'king-prawns-raw 200g', 'milk-whole 500ml', 'butter-unsalted 40g', 'flour-plain 3tbsp', 'peas-frozen 100g', 'potato-large 4'],
   ['Boil peeled {potato-large} 20 minutes. Mash.', 'Melt {butter-unsalted}. Stir in {flour-plain}. Add {milk-whole} slowly until thick.', 'Add {haddock-smoked} in chunks, {king-prawns-raw} and {peas-frozen}. Tip into a dish.', 'Heat the oven to 200C. Top with the mash.', 'Bake 30 minutes, until golden and bubbling.']),
  ('chicken-leek-pie', 'Chicken, leek and tarragon pie', ['chicken-thigh-boneless 8', 'leek 2', 'butter-unsalted 30g', 'flour-plain 2tbsp', 'stock-chicken 300ml', 'creme-fraiche 150ml', 'fresh-tarragon 10g', 'puff-pastry 320g', 'egg-medium 1'],
   ['Heat the oven to 200C. Fry sliced {leek} and diced {chicken-thigh-boneless} in {butter-unsalted} 10 minutes.', 'Stir in {flour-plain}. Add {stock-chicken} until thick.', 'Stir in {creme-fraiche} and {fresh-tarragon}. Tip into a pie dish.', 'Top with {puff-pastry}. Brush with beaten {egg-medium}.', 'Bake 30 minutes, until golden.']),
  ('cheese-onion-pie', 'Cheese and onion pie', ['shortcrust-pastry 500g', 'potato-medium 2', 'onion-medium 2', 'butter-unsalted 25g', 'cheddar-cheese 200g', 'egg-medium 1'],
   ['Heat the oven to 200C. Boil diced {potato-medium} 10 minutes. Drain.', 'Fry sliced {onion-medium} in {butter-unsalted} 10 minutes.', 'Mix with the potato and grated {cheddar-cheese}.', 'Line a pie dish with two thirds of {shortcrust-pastry}. Fill. Cover with the rest.', 'Brush with beaten {egg-medium}. Bake 40 minutes, until golden.']),
  ('veg-pie', 'Root vegetable and lentil pie', ['carrot-medium 3', 'parsnip 2', 'onion-medium 1', 'olive-oil 2tbsp', 'lentils-tinned 1', 'stock-vegetable 300ml', 'fresh-thyme 4', 'puff-pastry 320g'],
   ['Heat the oven to 200C. Dice {carrot-medium}, {parsnip} and {onion-medium}. Fry in {olive-oil} 10 minutes.', 'Add drained {lentils-tinned}, {stock-vegetable} and {fresh-thyme}. Simmer 10 minutes.', 'Tip into a pie dish. Top with {puff-pastry}.', 'Bake 30 minutes, until golden.']),
  ('shepherds', "Shepherd's pie", ['lamb-mince 500g', 'onion-medium 1', 'carrot-medium 2', 'tomato-purée 2tbsp', 'stock-cube 1', 'fresh-rosemary 1', 'potato-large 4', 'butter-unsalted 40g'],
   ['Brown {lamb-mince} with chopped {onion-medium} and {carrot-medium} 10 minutes.', 'Add {tomato-purée}, {fresh-rosemary} and {stock-cube} in 300 ml water. Simmer 20 minutes.', 'Boil peeled {potato-large} 20 minutes. Mash with {butter-unsalted}.', 'Heat the oven to 200C. Tip the lamb into a dish. Top with mash.', 'Bake 30 minutes, until golden.']),
  ('pork-apple-pie', 'Pork, apple and sage pie', ['pork-shoulder 600g', 'apple-medium 2', 'onion-medium 1', 'fresh-sage 6', 'cider-dry 200ml', 'shortcrust-pastry 500g', 'egg-medium 1'],
   ['Dice {pork-shoulder}. Brown with chopped {onion-medium}. Add {cider-dry}. Simmer 45 minutes, until tender.', 'Stir in chopped {apple-medium} and {fresh-sage}. Cool.', 'Heat the oven to 200C. Line a pie dish with {shortcrust-pastry}. Fill. Cover.', 'Brush with beaten {egg-medium}. Bake 40 minutes, until golden.']),
]
for key, name, ings, steps in PIES:
  b.R(f'pie-{key}', name, 'main', ings, steps, serves=6, tier='everyday', cuisine='British')

# ---- Crumbles: fruit x topping ----
FRUIT = {
  'apple': ('apple', ['apple-cooking 3', 'sugar-caster 60g']),
  'plum': ('plum', ['plums 10', 'sugar-caster 60g']),
  'pear-ginger': ('pear and ginger', ['pear 5', 'stem-ginger 2', 'sugar-caster 40g']),
  'berry': ('summer berry', ['raspberries 200g', 'blueberries 200g', 'strawberries 200g', 'sugar-caster 50g']),
  'peach': ('peach and raspberry', ['peach 5', 'raspberries 150g', 'sugar-caster 40g']),
  'gooseberry': ('gooseberry', ['gooseberries 500g', 'sugar-caster 100g']),
}
TOP = {
  'classic': ('crumble', ['flour-plain 150g', 'butter-unsalted 100g', 'sugar-demerara 50g']),
  'oat': ('oat crumble', ['flour-plain 100g', 'oats-rolled 60g', 'butter-unsalted 100g', 'sugar-soft-brown 60g']),
  'almond': ('almond crumble', ['flour-plain 100g', 'ground-almonds 50g', 'butter-unsalted 100g', 'sugar-demerara 50g']),
  'vegan': ('vegan crumble', ['flour-plain 150g', 'dairy-free-spread 100g', 'sugar-demerara 50g']),
}
for fk, (fname, fings) in FRUIT.items():
  for tk, (tname, tings) in TOP.items():
    if (fk, tk) in {('gooseberry', 'almond'), ('berry', 'oat'), ('apple', 'almond')}:
      continue
    ings = fings + tings
    frefs = [r for r in refs_of(fings) if r != 'sugar-caster']
    fat = 'butter-unsalted' if 'butter-unsalted' in refs_of(tings) else 'dairy-free-spread'
    dry = [r for r in refs_of(tings) if r != fat]
    steps = ['Heat the oven to 190C.',
             f'Prepare {join(frefs)}: peel, stone or slice as needed.',
             f'Toss with {t("sugar-caster")} in a baking dish.',
             f'Rub {t(fat)} into {join(dry)} until it looks like breadcrumbs.',
             'Scatter over the fruit.',
             'Bake 35 minutes, until golden and bubbling at the edges.']
    b.R(f'crumble-{fk}-{tk}', f'{fname.capitalize()} {tname}', 'pudding', ings, steps, serves=6, tier='budget', cuisine='British')

# ---- Cakes: flavour on a sponge base ----
CAKES = [
  ('lemon-poppy', 'Lemon drizzle traybake', ['lemon 2', 'icing-sugar 100g'], 'Fold in the zest of {lemon}.', 'Mix the lemon juice with {icing-sugar}. Pour over while warm.'),
  ('coffee-walnut', 'Coffee and walnut cake', ['coffee-instant 2tbsp', 'walnuts 80g', 'icing-sugar 150g', 'cream-cheese 150g'], 'Dissolve {coffee-instant} in 2 tbsp hot water. Fold in with chopped {walnuts}.', 'Beat {cream-cheese} with {icing-sugar}. Spread on top.'),
  ('chocolate-fudge', 'Chocolate fudge cake', ['cocoa-powder 50g', 'dark-chocolate 100g', 'icing-sugar 150g'], 'Fold in {cocoa-powder} with 3 tbsp milk.', 'Melt {dark-chocolate}. Beat with {icing-sugar} and 3 tbsp hot water. Spread over.'),
  ('carrot-orange', 'Carrot and orange cake', ['carrot-medium 3', 'orange 1', 'cinnamon-ground 1tsp', 'cream-cheese 150g', 'icing-sugar 100g'], 'Fold in grated {carrot-medium}, the zest of {orange} and {cinnamon-ground}.', 'Beat {cream-cheese} with {icing-sugar}. Spread on top.'),
  ('banana-bread', 'Banana bread', ['banana-medium 3', 'cinnamon-ground 1tsp'], 'Fold in mashed {banana-medium} and {cinnamon-ground}.', 'Cool before slicing.'),
  ('lemon-blueberry', 'Lemon and blueberry cake', ['lemon 1', 'blueberries 150g', 'icing-sugar 80g'], 'Fold in the zest of {lemon} and {blueberries}.', 'Mix {icing-sugar} with the lemon juice. Drizzle over.'),
  ('apple-cinnamon-cake', 'Apple and cinnamon cake', ['apple-medium 2', 'cinnamon-ground 2tsp', 'sugar-demerara 2tbsp'], 'Fold in diced {apple-medium} and {cinnamon-ground}.', 'Sprinkle with {sugar-demerara} before baking.'),
  ('ginger-cake', 'Sticky ginger cake', ['ginger-ground 2tsp', 'golden-syrup 4tbsp', 'stem-ginger 3'], 'Fold in {ginger-ground}, {golden-syrup} and chopped {stem-ginger}.', 'Wrap and leave a day; it turns stickier.'),
  ('raspberry-almond', 'Raspberry and almond cake', ['ground-almonds 80g', 'raspberries 150g', 'almonds 30g'], 'Fold in {ground-almonds}, then dot with {raspberries}.', 'Scatter chopped {almonds} before baking.'),
  ('orange-polenta', 'Orange and polenta cake', ['polenta-dry 100g', 'orange 2', 'ground-almonds 100g'], 'Fold in {polenta-dry}, {ground-almonds} and the zest of {orange}.', 'Pour over the orange juice warmed with 2 tbsp sugar.'),
  ('marble', 'Marble cake', ['cocoa-powder 2tbsp', 'vanilla-extract 1tsp'], 'Add {vanilla-extract}. Stir {cocoa-powder} into half the mix. Swirl the two together in the tin.', 'Cool before slicing.'),
  ('cherry-bakewell', 'Cherry Bakewell cake', ['ground-almonds 80g', 'glace-cherries 100g', 'icing-sugar 80g'], 'Fold in {ground-almonds} and halved {glace-cherries}.', 'Drizzle with {icing-sugar} mixed with a little water.'),
]
for key, name, extra, s_fold, s_fin in CAKES:
  ings = ['butter-unsalted 175g', 'sugar-caster 175g', 'egg-medium 3', 'flour-self-raising 175g'] + extra
  steps = ['Heat the oven to 180C. Line a 20 cm tin.',
           'Beat {butter-unsalted} and {sugar-caster} until pale and fluffy.',
           'Beat in {egg-medium} one at a time.',
           'Fold in {flour-self-raising}.',
           s_fold,
           'Bake 40 minutes, until a skewer comes out clean.',
           s_fin]
  b.R(f'cake-{key}', name, 'pudding', ings, steps, serves=10, tier='budget', cuisine='British')

# ---- Cookies and biscuits ----
COOKIES = [
  ('choc-chip', 'Chocolate chip cookies', ['dark-chocolate 100g'], 'Stir in chopped {dark-chocolate}.'),
  ('double-choc', 'Double chocolate cookies', ['cocoa-powder 30g', 'white-chocolate 100g'], 'Stir in {cocoa-powder} and chopped {white-chocolate}.'),
  ('oat-raisin', 'Oat and raisin cookies', ['oats-rolled 100g', 'raisins 80g', 'cinnamon-ground 1tsp'], 'Stir in {oats-rolled}, {raisins} and {cinnamon-ground}.'),
  ('peanut-butter', 'Peanut butter cookies', ['peanut-butter 100g'], 'Beat in {peanut-butter}. Press each with a fork.'),
  ('ginger-nuts', 'Ginger biscuits', ['ginger-ground 2tsp', 'golden-syrup 2tbsp'], 'Stir in {ginger-ground} and {golden-syrup}.'),
  ('white-choc-cranberry', 'White chocolate and cranberry cookies', ['white-chocolate 100g', 'dried-cranberries 60g'], 'Stir in chopped {white-chocolate} and {dried-cranberries}.'),
  ('lemon-shortbread', 'Lemon shortbread biscuits', ['lemon 1'], 'Stir in the zest of {lemon}.'),
  ('coconut-macaroon', 'Coconut and lime cookies', ['desiccated-coconut 80g', 'lime 1'], 'Stir in {desiccated-coconut} and the zest of {lime}.'),
  ('salted-caramel', 'Salted dark chocolate cookies', ['dark-chocolate-70 100g', 'salt 0.5tsp'], 'Stir in chopped {dark-chocolate-70}. Sprinkle {salt} on top before baking.'),
  ('cinnamon-sugar', 'Cinnamon sugar cookies', ['cinnamon-ground 2tsp', 'sugar-demerara 2tbsp'], 'Roll each ball in {cinnamon-ground} mixed with {sugar-demerara}.'),
]
for key, name, extra, s in COOKIES:
  ings = ['butter-unsalted 125g', 'sugar-soft-brown 150g', 'egg-medium 1', 'flour-plain 200g', 'bicarbonate-of-soda 0.5tsp'] + extra
  steps = ['Heat the oven to 180C. Line two trays with baking paper.',
           'Beat soft {butter-unsalted} and {sugar-soft-brown} until creamy.',
           'Beat in {egg-medium}. Stir in {flour-plain} and {bicarbonate-of-soda}.',
           s,
           'Roll into 12 balls. Space well apart on the trays.',
           'Bake 11 minutes, until golden at the edges. Cool on the trays.']
  b.R(f'cookie-{key}', name, 'pudding', ings, steps, serves=12, tier='budget', cuisine='British')

# ---- Muffins ----
MUFF = [
  ('blueberry', 'Blueberry muffins', ['blueberries 150g', 'lemon 1']),
  ('double-choc-muffin', 'Double chocolate muffins', ['cocoa-powder 30g', 'dark-chocolate 100g']),
  ('banana-walnut', 'Banana and walnut muffins', ['banana-medium 2', 'walnuts 60g']),
  ('apple-cinnamon-muffin', 'Apple and cinnamon muffins', ['apple-medium 1', 'cinnamon-ground 1tsp']),
  ('raspberry-white', 'Raspberry and white chocolate muffins', ['raspberries 120g', 'white-chocolate 80g']),
  ('cheese-spring-onion', 'Cheese and spring onion muffins', ['cheddar-cheese 120g', 'spring-onion 4']),
  ('courgette-feta', 'Courgette and feta muffins', ['courgette 1', 'feta 100g']),
  ('carrot-sultana', 'Carrot and sultana muffins', ['carrot-medium 2', 'sultanas 60g', 'mixed-spice 1tsp']),
]
for key, name, extra in MUFF:
  savoury = key in ('cheese-spring-onion', 'courgette-feta')
  ings = ['flour-self-raising 250g', 'egg-medium 2', 'milk-whole 200ml', 'vegetable-oil 80ml'] + ([] if savoury else ['sugar-caster 120g']) + extra
  steps = ['Heat the oven to 200C. Put 12 cases in a muffin tin.',
           'Mix {flour-self-raising}' + ('' if savoury else ' and {sugar-caster}') + ' in a bowl.',
           'Whisk {egg-medium}, {milk-whole} and {vegetable-oil}. Stir in lightly. || A lumpy batter makes a light muffin.',
           f'Fold in {join(refs_of(extra))}, chopped or grated as needed.',
           'Divide between the cases. Bake 20 minutes, until risen and golden.']
  b.R(f'muffin-{key}', name, 'snack' if savoury else 'pudding', ings, steps, serves=12, tier='budget', cuisine='British',
      slot='snack' if savoury else None)

# ---- Savoury and sweet tarts ----
TARTS = [
  ('quiche-lorraine', 'Quiche lorraine', 'main', ['shortcrust-pastry 320g', 'bacon-rasher-back 6', 'egg-medium 3', 'double-cream 250ml', 'gruyere 80g'], 'Fry chopped {bacon-rasher-back} 5 minutes. Scatter in the case with grated {gruyere}.'),
  ('tomato-goats', 'Tomato and goats cheese tart', 'main', ['puff-pastry 320g', 'pesto 60g', 'cherry-tomato 20', 'goats-cheese 120g', 'egg-medium 1'], 'Spread {pesto} over the pastry. Top with halved {cherry-tomato} and {goats-cheese}.'),
  ('broccoli-stilton', 'Broccoli and Stilton quiche', 'main', ['shortcrust-pastry 320g', 'broccoli-head 1', 'stilton 100g', 'egg-medium 3', 'double-cream 250ml'], 'Scatter blanched {broccoli-head} florets and crumbled {stilton} in the case.'),
  ('onion-cheddar', 'Caramelised onion and cheddar tart', 'main', ['puff-pastry 320g', 'onion-large 3', 'butter-unsalted 25g', 'cheddar-cheese 120g', 'fresh-thyme 4'], 'Cook sliced {onion-large} in {butter-unsalted} 25 minutes until sweet. Spread on the pastry. Top with {cheddar-cheese} and {fresh-thyme}.'),
  ('salmon-spinach', 'Salmon and spinach quiche', 'main', ['shortcrust-pastry 320g', 'salmon-fillet 2', 'spinach 100g', 'egg-medium 3', 'double-cream 250ml'], 'Scatter flaked raw {salmon-fillet} and wilted {spinach} in the case.'),
  ('apple-tart', 'French apple tart', 'pudding', ['puff-pastry 320g', 'apple-medium 4', 'butter-unsalted 30g', 'sugar-caster 3tbsp', 'jam-strawberry 2tbsp'], 'Slice {apple-medium} thinly. Overlap on the pastry. Dot with {butter-unsalted}. Sprinkle {sugar-caster}.'),
  ('chocolate-tart', 'Dark chocolate tart', 'pudding', ['shortcrust-pastry 320g', 'dark-chocolate-70 200g', 'double-cream 300ml', 'egg-medium 2', 'sugar-caster 50g'], 'Melt {dark-chocolate-70} into hot {double-cream}. Whisk in {egg-medium} and {sugar-caster}. Pour into the case.'),
  ('custard-tart', 'Nutmeg custard tart', 'pudding', ['shortcrust-pastry 320g', 'egg-yolk 6', 'sugar-caster 75g', 'double-cream 300ml', 'milk-whole 200ml', 'nutmeg 0.5tsp'], 'Whisk {egg-yolk}, {sugar-caster}, {double-cream} and {milk-whole}. Pour in. Grate over {nutmeg}.'),
  ('bakewell', 'Bakewell tart', 'pudding', ['shortcrust-pastry 320g', 'jam-strawberry 4tbsp', 'butter-unsalted 100g', 'sugar-caster 100g', 'egg-medium 2', 'ground-almonds 100g'], 'Spread {jam-strawberry} in the case. Beat {butter-unsalted}, {sugar-caster}, {egg-medium} and {ground-almonds}. Spread over.'),
]
for key, name, course, ings, fill in TARTS:
  refs = refs_of(ings)
  pastry = refs[0]
  steps = ['Heat the oven to 190C.']
  if pastry == 'shortcrust-pastry':
    steps += ['Line a 23 cm tin with {shortcrust-pastry}. Bake 15 minutes with baking beans. Take them out.']
  else:
    steps += ['Unroll {puff-pastry} onto a lined tray. Score a 2 cm border.']
  steps.append(fill)
  if pastry == 'shortcrust-pastry' and 'egg-medium' in refs and 'double-cream' in refs and course == 'main':
    steps.append('Whisk {egg-medium} and {double-cream}. Pour over the filling.')
  steps.append('Bake 30 minutes, until set and golden.')
  if key == 'tomato-goats':
    steps.insert(2, 'Brush the border with beaten {egg-medium}.')
  if key == 'apple-tart':
    steps.append('Warm {jam-strawberry}. Brush over to glaze.')
  swaps = [('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')] if 'pesto' in refs else []
  b.R(f'tart-{key}', name, course, ings, steps, serves=8, tier='everyday', cuisine='French' if key not in ('bakewell',) else 'British', swaps=swaps)

# ---- Jackets, parcels, pizzas, baked oats, bakes ----
JACKETS = [
  ('tuna-sweetcorn', 'Jacket potatoes with tuna and sweetcorn', ['tuna-tinned-in-spring-water 1', 'sweetcorn-tinned 1', 'mayonnaise 3tbsp']),
  ('chilli-cheese', 'Jacket potatoes with chilli beans and cheese', ['kidney-beans-tinned 1', 'passata 200g', 'chilli-powder 1tsp', 'cheddar-cheese 80g']),
  ('coronation-chickpea', 'Jacket potatoes with coronation chickpeas', ['chickpeas-tinned 1', 'natural-yoghurt 100g', 'curry-powder 1tsp', 'sultanas 30g']),
  ('cheese-beans', 'Jacket potatoes with cheese and beans', ['baked-beans 1', 'cheddar-cheese 100g']),
  ('broccoli-cheese-jacket', 'Jacket potatoes with broccoli and cheese', ['broccoli-head 1', 'cheddar-cheese 100g', 'creme-fraiche 100ml']),
  ('smoked-mackerel-jacket', 'Jacket potatoes with smoked mackerel and horseradish', ['smoked-mackerel 150g', 'creme-fraiche 100ml', 'horseradish-sauce 1tbsp']),
  ('sweet-potato-jacket', 'Baked sweet potatoes with feta and chilli', ['feta 120g', 'chilli-flakes 0.5tsp', 'spring-onion 3']),
  ('egg-mayo-jacket', 'Jacket potatoes with egg and chive mayonnaise', ['egg-medium 4', 'mayonnaise 3tbsp', 'chives 10g']),
]
for key, name, top in JACKETS:
  spud = 'sweet-potato 4' if 'sweet-potato' in key else 'potato-large 4'
  sref = spud.split()[0]
  ings = [spud, 'olive-oil 1tbsp', 'salt 1tsp'] + top
  steps = ['Heat the oven to 200C.',
           f'Prick {t(sref)} all over. Rub with {t("olive-oil")} and {t("salt")}.',
           'Bake 1 hour 10 minutes, until crisp outside and soft inside.' if sref == 'potato-large' else 'Bake 45 minutes, until soft.',
           f'Prepare the filling: mix {join(refs_of(top))}, warmed or chopped as needed.',
           'Split the potatoes. Pile in the filling.']
  b.R(f'jacket-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine='British')

PARCELS = [
  ('cod-tomato', 'Cod parcels with tomato and olives', ['cod-fillet 4', 'cherry-tomato 16', 'olives-pitted 50g', 'fresh-basil 10g', 'olive-oil 2tbsp']),
  ('salmon-ginger', 'Salmon parcels with ginger and soy', ['salmon-fillet 4', 'ginger-fresh 1tbsp', 'soy-sauce 3tbsp', 'spring-onion 4', 'pak-choi 2']),
  ('hake-lemon', 'Hake parcels with lemon and herbs', ['hake-fillet 600g', 'lemon 1', 'fresh-parsley 10g', 'butter-unsalted 30g']),
  ('seabass-fennel', 'Sea bass parcels with fennel and orange', ['sea-bass-fillet 4', 'fennel-bulb 1', 'orange 1', 'olive-oil 1tbsp']),
  ('trout-almond-parcel', 'Trout parcels with leeks and white wine', ['trout-fillet 520g', 'leek 1', 'wine-white 100ml', 'butter-unsalted 20g']),
  ('prawn-coconut', 'King prawn parcels with coconut and lime', ['king-prawns-raw 400g', 'coconut-milk-tinned 1', 'thai-green-curry-paste 1tbsp', 'lime 1']),
]
for key, name, ings in PARCELS:
  refs = refs_of(ings)
  steps = ['Heat the oven to 200C. Cut 4 large squares of foil.',
           f'Divide {t(refs[0])} between the squares.',
           f'Add {join(refs[1:])}.',
           'Fold into loose sealed parcels. Put on a baking tray.',
           'Bake 15 minutes, until the fish is cooked through.',
           'Open carefully at the table. || The steam is hot.']
  b.R(f'parcel-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine='Mediterranean')

PIZZAS = [
  ('margherita', 'Margherita pizza', ['mozzarella 2', 'fresh-basil 10g']),
  ('pepperoni-style', 'Salami and chilli pizza', ['salami 12', 'mozzarella 2', 'chilli-flakes 0.5tsp']),
  ('mushroom-thyme', 'Mushroom, garlic and thyme pizza', ['mushroom-chestnut 8', 'garlic-clove 2', 'mozzarella 2', 'fresh-thyme 4']),
  ('ham-pineapple', 'Ham and pineapple pizza', ['ham-slice 6', 'pineapple 1', 'mozzarella 2']),
  ('veg-feta', 'Roast pepper and feta pizza', ['pepper-bell 2', 'red-onion 1', 'feta 120g', 'olives-pitted 40g']),
  ('nduja-honey', "'Nduja and honey pizza", ['nduja 60g', 'mozzarella 2', 'honey 1tbsp']),
  ('vegan-veg', 'Vegan garden vegetable pizza', ['courgette 1', 'pepper-bell 1', 'cherry-tomato 10', 'olives-pitted 40g', 'fresh-basil 10g']),
  ('goats-caramel-onion', 'Goats cheese and red onion pizza', ['red-onion 2', 'goats-cheese 120g', 'rocket 40g']),
]
for key, name, top in PIZZAS:
  vegan = key.startswith('vegan')
  dough = ['flour-self-raising 300g', 'baking-powder 1tsp', 'olive-oil 2tbsp'] if vegan else ['flour-self-raising 300g', 'greek-yoghurt 300g']
  ings = dough + ['passata 200g'] + top
  steps = ['Heat the oven to 240C.',
           ('Mix {flour-self-raising}, {baking-powder}, {olive-oil} and 180 ml water to a soft dough.' if vegan else 'Mix {flour-self-raising} and {greek-yoghurt} to a soft dough.'),
           'Split in two. Roll each thin. Lay on floured trays.',
           'Spread with {passata}.',
           f'Top with {join(refs_of(top))}, sliced or torn as needed.',
           'Bake 12 minutes, until crisp and bubbling.']
  b.R(f'pizza-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine='Italian',
      note='No yeast and no waiting.' if not vegan else 'No yeast, no waiting, no dairy.')

OATS = [
  ('blueberry', 'Blueberry baked oats', ['blueberries 150g', 'banana-medium 1']),
  ('apple-cinnamon', 'Apple and cinnamon baked oats', ['apple-medium 2', 'cinnamon-ground 1tsp']),
  ('chocolate-banana', 'Chocolate and banana baked oats', ['banana-medium 2', 'cocoa-powder 2tbsp']),
  ('raspberry-coconut', 'Raspberry and coconut baked oats', ['raspberries 150g', 'desiccated-coconut 3tbsp']),
  ('pear-ginger-oats', 'Pear and ginger baked oats', ['pear 2', 'ginger-ground 1tsp']),
  ('peanut-banana', 'Peanut butter and banana baked oats', ['peanut-butter 3tbsp', 'banana-medium 2']),
]
for key, name, extra in OATS:
  ings = ['oats-rolled 200g', 'baking-powder 1tsp', 'milk-semi-skimmed 400ml', 'egg-medium 2', 'maple-syrup 3tbsp'] + extra
  steps = ['Heat the oven to 190C.',
           'Mix {oats-rolled} and {baking-powder} in a baking dish.',
           'Whisk {milk-semi-skimmed}, {egg-medium} and {maple-syrup}. Pour over.',
           f'Stir in {join(refs_of(extra))}, chopped or mashed as needed.',
           'Bake 35 minutes, until set and golden.']
  b.R(f'oats-{key}', name, 'breakfast', ings, steps, serves=4, tier='budget', slot='breakfast', cuisine='British')

BAKES = [
  ('enchiladas', 'Chicken enchiladas', 'Mexican', ['chicken-breast-roast 300g', 'black-beans-tinned 1', 'tortilla-wrap 8', 'passata 500g', 'chilli-powder 1tsp', 'cheddar-cheese 120g'],
   ['Heat the oven to 200C.', 'Shred {chicken-breast-roast}. Mix with drained {black-beans-tinned}.', 'Roll up in {tortilla-wrap}. Lay in a dish.', 'Mix {passata} with {chilli-powder}. Pour over.', 'Scatter {cheddar-cheese}. Bake 20 minutes, until bubbling.']),
  ('bean-enchiladas', 'Sweet potato and black bean enchiladas', 'Mexican', ['sweet-potato 2', 'black-beans-tinned 1', 'tortilla-wrap 8', 'passata 500g', 'cumin-ground 1tsp', 'cheddar-cheese 120g'],
   ['Heat the oven to 200C. Dice {sweet-potato}. Roast 20 minutes.', 'Mix with drained {black-beans-tinned} and {cumin-ground}.', 'Roll up in {tortilla-wrap}. Lay in a dish.', 'Pour over {passata}. Scatter {cheddar-cheese}.', 'Bake 20 minutes, until bubbling.']),
  ('moussaka-light', 'Aubergine and lentil moussaka', 'Greek', ['aubergine 2', 'olive-oil 3tbsp', 'lentils-tinned 2', 'chopped-tomatoes-tinned 1', 'cinnamon-ground 1tsp', 'greek-yoghurt 300g', 'egg-medium 2', 'parmesan 40g'],
   ['Heat the oven to 200C. Slice {aubergine}. Brush with {olive-oil}. Roast 20 minutes.', 'Mix drained {lentils-tinned}, {chopped-tomatoes-tinned} and {cinnamon-ground}.', 'Layer lentils and aubergine in a dish.', 'Whisk {greek-yoghurt}, {egg-medium} and {parmesan}. Spread on top.', 'Bake 35 minutes, until golden.']),
  ('stuffed-peppers-rice', 'Baked peppers stuffed with rice and feta', 'Greek', ['pepper-bell 4', 'rice-white-cooked 1', 'cherry-tomato 10', 'feta 120g', 'dried-oregano 1tsp', 'olive-oil 2tbsp'],
   ['Heat the oven to 190C. Halve {pepper-bell}. Take out the seeds.', 'Mix {rice-white-cooked}, chopped {cherry-tomato}, crumbled {feta} and {dried-oregano}.', 'Fill the peppers. Drizzle with {olive-oil}.', 'Bake 35 minutes, until soft.']),
  ('baked-eggs', 'Baked eggs with spinach and tomato', 'Middle Eastern', ['olive-oil 1tbsp', 'spinach 200g', 'chopped-tomatoes-tinned 1', 'cumin-ground 1tsp', 'egg-medium 4', 'feta 60g'],
   ['Heat the oven to 200C.', 'Mix wilted {spinach}, {chopped-tomatoes-tinned}, {cumin-ground} and {olive-oil} in a baking dish.', 'Make 4 dips. Crack in {egg-medium}.', 'Bake 12 minutes, until the whites set.', 'Crumble over {feta}.']),
  ('toad-veg', 'Vegetarian toad in the hole', 'British', ['plant-sausages 8', 'vegetable-oil 3tbsp', 'flour-plain 140g', 'egg-medium 3', 'milk-whole 250ml'],
   ['Heat the oven to 220C. Put {plant-sausages} and {vegetable-oil} in a tin. Bake 10 minutes.', 'Whisk {flour-plain}, {egg-medium} and {milk-whole} to a batter.', 'Pour round the sausages at once, while the fat sizzles.', 'Bake 30 minutes, until risen and golden.']),
  ('lasagne', 'Classic beef lasagne', 'Italian', ['beef-mince-5-fat 500g', 'onion-medium 1', 'passata 700g', 'penne-dry 300g', 'milk-whole 600ml', 'flour-plain 3tbsp', 'butter-unsalted 40g', 'cheddar-cheese 100g'],
   ['Brown {beef-mince-5-fat} with chopped {onion-medium}. Add {passata}. Simmer 20 minutes.', 'Whisk {milk-whole}, {flour-plain} and {butter-unsalted} in a pan until thick.', 'Cook {penne-dry} 2 minutes less than the packet says. Drain.', 'Heat the oven to 200C. Layer pasta, meat and sauce in a dish.', 'Top with {cheddar-cheese}. Bake 30 minutes.']),
  ('scones', 'Plain scones', 'British', ['flour-self-raising 350g', 'butter-unsalted 85g', 'sugar-caster 3tbsp', 'milk-whole 175ml', 'jam-strawberry 6tbsp', 'double-cream 150ml'],
   ['Heat the oven to 220C.', 'Rub {butter-unsalted} into {flour-self-raising}. Stir in {sugar-caster}.', 'Add {milk-whole}. Bring together lightly. Pat to 3 cm thick.', 'Cut into 8 rounds. Bake 12 minutes, until risen and golden.', 'Serve with {jam-strawberry} and whipped {double-cream}.']),
  ('cheese-scones', 'Cheese scones', 'British', ['flour-self-raising 300g', 'butter-unsalted 75g', 'cheddar-cheese 120g', 'mustard-dijon 1tsp', 'milk-whole 160ml'],
   ['Heat the oven to 220C.', 'Rub {butter-unsalted} into {flour-self-raising}. Stir in most of {cheddar-cheese}.', 'Add {milk-whole} with {mustard-dijon}. Bring together lightly.', 'Cut into 8 rounds. Top with the rest of the cheese.', 'Bake 12 minutes, until golden.']),
  ('soda-bread', 'Quick soda bread', 'Irish', ['flour-plain 500g', 'bicarbonate-of-soda 1tsp', 'salt 1tsp', 'natural-yoghurt 400g', 'milk-whole 100ml'],
   ['Heat the oven to 200C.', 'Mix {flour-plain}, {bicarbonate-of-soda} and {salt}.', 'Stir in {natural-yoghurt} and {milk-whole} to a soft dough.', 'Shape into a round. Cut a deep cross on top.', 'Bake 35 minutes, until it sounds hollow underneath.']),
  ('flapjack', 'Golden flapjacks', 'British', ['butter-unsalted 125g', 'sugar-soft-brown 125g', 'golden-syrup 3tbsp', 'oats-rolled 250g'],
   ['Heat the oven to 180C. Line a 20 cm square tin.', 'Melt {butter-unsalted}, {sugar-soft-brown} and {golden-syrup}.', 'Stir in {oats-rolled}.', 'Press into the tin. Bake 25 minutes, until golden.', 'Cut into 12 while warm. Cool in the tin.']),
  ('blondies', 'White chocolate blondies', 'American', ['butter-unsalted 150g', 'sugar-soft-brown 200g', 'egg-medium 2', 'flour-plain 175g', 'white-chocolate 150g'],
   ['Heat the oven to 180C. Line a 20 cm square tin.', 'Melt {butter-unsalted}. Beat in {sugar-soft-brown} and {egg-medium}.', 'Fold in {flour-plain} and chopped {white-chocolate}.', 'Bake 25 minutes, until barely set in the middle.']),
]
for key, name, cui, ings, steps in BAKES:
  course = 'pudding' if key in ('scones', 'flapjack', 'blondies') else 'side' if key == 'soda-bread' else 'main'
  b.R(f'bake-{key}', name, course, ings, steps, serves=8 if course != 'main' else 4, tier='budget', cuisine=cui)

# ---- Phase 44 (second batch) ----
CAKES2 = [
  ('victoria-traybake', 'Jam and coconut traybake', ['jam-strawberry 4tbsp', 'desiccated-coconut 40g'], 'Spread with {jam-strawberry} once baked.', 'Scatter with {desiccated-coconut}.'),
  ('chocolate-orange-cake', 'Chocolate orange loaf', ['cocoa-powder 30g', 'orange 1', 'dark-chocolate 60g'], 'Fold in {cocoa-powder} and the zest of {orange}.', 'Drizzle with melted {dark-chocolate}.'),
  ('pineapple-upside', 'Pineapple upside-down cake', ['pineapple 1', 'golden-syrup 3tbsp', 'glace-cherries 30g'], 'Lay rings of {pineapple} and {glace-cherries} over {golden-syrup} in the tin first.', 'Turn out upside down while warm.'),
  ('rhubarb-custard-cake', 'Rhubarb and custard cake', ['rhubarb 300g', 'custard-powder 3tbsp'], 'Fold in {custard-powder}. Dot with chopped {rhubarb}.', 'Cool before slicing.'),
  ('plum-almond', 'Plum and almond cake', ['plums 6', 'ground-almonds 80g'], 'Fold in {ground-almonds}. Press halved {plums} into the top.', 'Dust with sugar to serve.'),
  ('pear-chocolate', 'Pear and chocolate cake', ['pear 2', 'cocoa-powder 30g'], 'Fold in {cocoa-powder}. Press sliced {pear} into the top.', 'Cool before slicing.'),
  ('date-walnut', 'Date and walnut loaf', ['dates-pitted 12', 'walnuts 60g', 'mixed-spice 1tsp'], 'Fold in chopped {dates-pitted}, {walnuts} and {mixed-spice}.', 'Spread with butter to serve.'),
  ('coconut-lime-cake', 'Coconut and lime cake', ['desiccated-coconut 60g', 'lime 2', 'icing-sugar 100g'], 'Fold in {desiccated-coconut} and the zest of {lime}.', 'Mix the lime juice with {icing-sugar}. Drizzle over.'),
  ('lemon-yoghurt', 'Lemon and yoghurt loaf', ['greek-yoghurt 100g', 'lemon 2'], 'Fold in {greek-yoghurt} and the zest of {lemon}.', 'Pour the lemon juice mixed with sugar over the warm cake.'),
  ('spiced-apple-loaf', 'Spiced apple and sultana loaf', ['apple-medium 2', 'sultanas 80g', 'mixed-spice 1tsp'], 'Fold in grated {apple-medium}, {sultanas} and {mixed-spice}.', 'Cool before slicing.'),
]
for key, name, extra, s_fold, s_fin in CAKES2:
  ings = ['butter-unsalted 175g', 'sugar-caster 175g', 'egg-medium 3', 'flour-self-raising 175g'] + extra
  steps = ['Heat the oven to 180C. Line a 20 cm tin.', 'Beat {butter-unsalted} and {sugar-caster} until pale and fluffy.',
           'Beat in {egg-medium} one at a time.', 'Fold in {flour-self-raising}.', s_fold, 'Bake 40 minutes, until a skewer comes out clean.', s_fin]
  b.R(f'cake-{key}', name, 'pudding', ings, steps, serves=10, tier='budget', cuisine='British')

BROWNIES = [
  ('raspberry', 'Raspberry brownies', ['raspberries 150g']),
  ('salted-peanut', 'Peanut butter brownies', ['peanut-butter 4tbsp']),
  ('orange', 'Chocolate orange brownies', ['orange 1']),
  ('cherry', 'Black forest brownies', ['cherries 150g']),
  ('white-choc-brownie', 'White chocolate chunk brownies', ['white-chocolate 100g']),
  ('vegan-brownie', 'Vegan chocolate brownies', []),
]
for key, name, extra in BROWNIES:
  if key == 'vegan-brownie':
    ings = ['dark-chocolate-70 200g', 'dairy-free-spread 150g', 'sugar-caster 250g', 'oat-milk 120ml', 'flour-plain 150g', 'cocoa-powder 40g']
    steps = ['Heat the oven to 180C. Line a 20 cm square tin.', 'Melt {dark-chocolate-70} and {dairy-free-spread} together.',
             'Whisk in {sugar-caster} and {oat-milk}.', 'Fold in {flour-plain} and {cocoa-powder}.', 'Bake 25 minutes, until set at the edges.', 'Cool in the tin before cutting into 12.']
  else:
    ings = ['dark-chocolate 200g', 'butter-unsalted 175g', 'sugar-caster 275g', 'egg-medium 3', 'flour-plain 75g', 'cocoa-powder 40g'] + extra
    steps = ['Heat the oven to 180C. Line a 20 cm square tin.', 'Melt {dark-chocolate} and {butter-unsalted} together.',
             'Whisk {sugar-caster} and {egg-medium} until thick. Fold in the chocolate.', 'Fold in {flour-plain} and {cocoa-powder}.',
             f'Dot or swirl in {join(refs_of(extra))}, zested or chopped as needed.', 'Bake 25 minutes, until barely set in the middle. Cool before cutting.']
  b.R(f'brownie-{key}', name, 'pudding', ings, steps, serves=12, tier='budget', cuisine='American')

CHEESECAKES = [
  ('vanilla', 'Baked vanilla cheesecake', ['vanilla-extract 2tsp']),
  ('lemon-baked', 'Baked lemon cheesecake', ['lemon 2']),
  ('chocolate-baked', 'Baked chocolate cheesecake', ['dark-chocolate 150g']),
  ('ginger-baked', 'Baked ginger cheesecake', ['stem-ginger 3']),
]
for key, name, extra in CHEESECAKES:
  base = 'ginger-nut-biscuits 20' if key == 'ginger-baked' else 'digestive-biscuit 14'
  bref = base.split()[0]
  ings = [base, 'butter-unsalted 80g', 'cream-cheese 600g', 'sugar-caster 150g', 'egg-medium 3', 'soured-cream 150ml'] + extra
  steps = ['Heat the oven to 160C. Line a 20 cm springform tin.',
           f'Crush {t(bref)}. Mix with melted {t("butter-unsalted")}. Press into the tin.',
           'Beat {cream-cheese}, {sugar-caster}, {egg-medium} and {soured-cream} until smooth.',
           f'Stir in {join(refs_of(extra))}, melted, zested or chopped as needed.',
           'Pour over the base. Bake 50 minutes, until set with a wobble in the middle.',
           'Cool in the oven with the door open. Chill overnight.']
  b.R(f'cheesecake-{key}', name, 'pudding', ings, steps, serves=10, tier='everyday', cuisine='American')

COOK2 = [
  ('anzac', 'Oat and coconut biscuits', ['oats-rolled 80g', 'desiccated-coconut 50g', 'golden-syrup 2tbsp'], 'Stir in {oats-rolled}, {desiccated-coconut} and {golden-syrup}.'),
  ('chocolate-orange-cookie', 'Chocolate orange cookies', ['dark-chocolate 100g', 'orange 1'], 'Stir in chopped {dark-chocolate} and the zest of {orange}.'),
  ('pecan-maple', 'Maple pecan cookies', ['pecans 80g', 'maple-syrup 2tbsp'], 'Stir in chopped {pecans} and {maple-syrup}.'),
  ('lemon-poppy-cookie', 'Lemon and white chocolate cookies', ['lemon 1', 'white-chocolate 80g'], 'Stir in the zest of {lemon} and chopped {white-chocolate}.'),
  ('choc-cherry', 'Chocolate and cherry cookies', ['dark-chocolate 80g', 'glace-cherries 60g'], 'Stir in chopped {dark-chocolate} and {glace-cherries}.'),
  ('spiced-oat', 'Spiced oat and sultana cookies', ['oats-rolled 80g', 'sultanas 60g', 'mixed-spice 1tsp'], 'Stir in {oats-rolled}, {sultanas} and {mixed-spice}.'),
]
for key, name, extra, s in COOK2:
  ings = ['butter-unsalted 125g', 'sugar-soft-brown 150g', 'egg-medium 1', 'flour-plain 200g', 'bicarbonate-of-soda 0.5tsp'] + extra
  steps = ['Heat the oven to 180C. Line two trays with baking paper.', 'Beat soft {butter-unsalted} and {sugar-soft-brown} until creamy.',
           'Beat in {egg-medium}. Stir in {flour-plain} and {bicarbonate-of-soda}.', s, 'Roll into 12 balls. Space well apart on the trays.',
           'Bake 11 minutes, until golden at the edges. Cool on the trays.']
  b.R(f'cookie-{key}', name, 'pudding', ings, steps, serves=12, tier='budget', cuisine='British')

MUFF2 = [
  ('lemon-blueberry-m', 'Lemon and poppy-style muffins', ['lemon 2', 'chia-seeds 1tbsp']),
  ('chocolate-banana-m', 'Chocolate and banana muffins', ['banana-medium 2', 'dark-chocolate 80g']),
  ('raspberry-oat-m', 'Raspberry and oat muffins', ['raspberries 120g', 'oats-rolled 40g']),
  ('ham-cheese-m', 'Ham and cheese muffins', ['ham-slice 4', 'cheddar-cheese 100g']),
  ('spinach-feta-m', 'Spinach and feta muffins', ['spinach 80g', 'feta 100g']),
  ('pumpkin-spice-m', 'Spiced pumpkin muffins', ['pumpkin 200g', 'mixed-spice 1tsp']),
]
for key, name, extra in MUFF2:
  savoury = key in ('ham-cheese-m', 'spinach-feta-m')
  ings = ['flour-self-raising 250g', 'egg-medium 2', 'milk-whole 200ml', 'vegetable-oil 80ml'] + ([] if savoury else ['sugar-caster 120g']) + extra
  steps = ['Heat the oven to 200C. Put 12 cases in a muffin tin.', 'Mix {flour-self-raising}' + ('' if savoury else ' and {sugar-caster}') + ' in a bowl.',
           'Whisk {egg-medium}, {milk-whole} and {vegetable-oil}. Stir in lightly.', f'Fold in {join(refs_of(extra))}, chopped or grated as needed.',
           'Divide between the cases. Bake 20 minutes, until risen and golden.']
  b.R(f'muffin-{key}', name, 'snack' if savoury else 'pudding', ings, steps, serves=12, tier='budget', cuisine='British', slot='snack' if savoury else None)

PB2 = [
  ('mac-bacon', 'Bacon and leek macaroni bake', 'British', ['bacon-rasher-back 6', 'leek 2', 'milk-whole 600ml', 'flour-plain 3tbsp', 'cheddar-cheese 150g'], 'Fry chopped {bacon-rasher-back} and sliced {leek} 8 minutes. Whisk {milk-whole} and {flour-plain} into a sauce.', 'Mix in. Scatter {cheddar-cheese}.'),
  ('mushroom-spinach-bake', 'Mushroom and spinach pasta bake', 'Italian', ['mushroom-chestnut 12', 'spinach 150g', 'creme-fraiche 250ml', 'parmesan 40g'], 'Stir sliced {mushroom-chestnut}, {spinach} and {creme-fraiche} through the pasta.', 'Grate over {parmesan}.'),
  ('aubergine-bake', 'Aubergine and mozzarella pasta bake', 'Italian', ['aubergine 1', 'passata 700g', 'mozzarella 2', 'fresh-basil 10g'], 'Stir diced {aubergine}, {passata} and {fresh-basil} through the pasta.', 'Tear over {mozzarella}.'),
  ('chicken-broccoli-bake', 'Chicken and broccoli pasta bake', 'British', ['chicken-breast-roast 300g', 'broccoli-head 1', 'creme-fraiche 250ml', 'cheddar-cheese 100g'], 'Stir shredded {chicken-breast-roast}, {broccoli-head} florets and {creme-fraiche} through the pasta.', 'Scatter {cheddar-cheese}.'),
  ('chilli-bake', 'Chilli beef pasta bake', 'Mexican', ['beef-mince-5-fat 400g', 'kidney-beans-tinned 1', 'passata 500g', 'chilli-powder 1tsp', 'cheddar-cheese 100g'], 'Brown {beef-mince-5-fat}. Add {kidney-beans-tinned}, {passata} and {chilli-powder}. Stir through the pasta.', 'Scatter {cheddar-cheese}.'),
  ('vegan-veg-bake', 'Roast vegetable and lentil pasta bake', 'Italian', ['courgette 1', 'pepper-bell 2', 'lentils-tinned 1', 'passata 600g', 'nutritional-yeast 3tbsp'], 'Stir chopped {courgette}, {pepper-bell}, drained {lentils-tinned} and {passata} through the pasta.', 'Sprinkle with {nutritional-yeast}.'),
]
for key, name, cui, extra, s1, s2 in PB2:
  ings = ['penne-dry 400g'] + extra
  steps = ['Heat the oven to 200C.', 'Cook {penne-dry} 2 minutes less than the packet says. Drain. Tip into a baking dish.', s1, s2, 'Bake 25 minutes, until bubbling and golden.']
  b.R(f'pastabake-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

STUFFED = [
  ('mushrooms-garlic', 'Garlic and herb stuffed mushrooms', 'starter', ['portobello-mushroom 4', 'breadcrumbs-dried 40g', 'garlic-clove 2', 'fresh-parsley 10g', 'olive-oil 3tbsp', 'parmesan 30g']),
  ('tomatoes-rice', 'Greek stuffed tomatoes', 'main', ['tomato-medium 6', 'rice-white-cooked 1', 'feta 100g', 'fresh-mint 10g', 'olive-oil 2tbsp']),
  ('courgettes-mince', 'Stuffed courgettes with lamb and mint', 'main', ['courgette 4', 'lamb-mince 300g', 'chopped-tomatoes-tinned 1', 'fresh-mint 10g', 'feta 80g']),
  ('aubergine-boats', 'Aubergine boats with tomato and mozzarella', 'main', ['aubergine 2', 'olive-oil 3tbsp', 'passata 300g', 'mozzarella 1', 'fresh-basil 10g']),
  ('squash-quinoa', 'Squash stuffed with quinoa and cranberries', 'main', ['butternut-squash 2', 'quinoa-dry 150g', 'dried-cranberries 40g', 'pumpkin-seeds 3tbsp', 'olive-oil 2tbsp']),
  ('onions-sausage', 'Baked onions stuffed with sausage and sage', 'main', ['onion-large 4', 'sausagemeat 300g', 'fresh-sage 6', 'breadcrumbs-dried 30g']),
]
for key, name, course, ings in STUFFED:
  refs = refs_of(ings)
  shell = refs[0]
  fill = refs[1:]
  steps = ['Heat the oven to 190C.',
           f'Halve or hollow out {t(shell)}. Keep any scooped flesh, chopped.',
           f'Mix the flesh with {join(fill)}. Cook any raw grain or meat in a pan first.' if any(r in fill for r in ('quinoa-dry', 'lamb-mince')) else f'Mix the flesh with {join(fill)}.',
           'Pile into the shells. Sit in a baking dish.',
           'Bake 35 minutes, until tender and golden.']
  b.R(f'stuffed-{key}', name, course, ings, steps, serves=4, tier='budget', cuisine='Mediterranean')

FISHBAKE = [
  ('cod-crumb', 'Baked cod with a lemon and parsley crumb', ['cod-fillet 4', 'breadcrumbs-dried 50g', 'lemon 1', 'fresh-parsley 10g', 'butter-unsalted 30g']),
  ('salmon-teriyaki-bake', 'Oven-baked teriyaki salmon', ['salmon-fillet 4', 'soy-sauce 3tbsp', 'honey 2tbsp', 'ginger-fresh 1tsp', 'sesame-seeds 1tbsp']),
  ('haddock-tomato', 'Smoked haddock baked with tomatoes and cream', ['haddock-smoked 500g', 'cherry-tomato 16', 'double-cream 150ml', 'chives 10g']),
  ('mackerel-baked', 'Baked mackerel with beetroot and horseradish', ['mackerel-fillet 4', 'beetroot 3', 'horseradish-sauce 2tbsp', 'creme-fraiche 100ml']),
]
for key, name, ings in FISHBAKE:
  refs = refs_of(ings)
  steps = ['Heat the oven to 200C.', f'Lay {t(refs[0])} in a baking dish.', f'Top or surround with {join(refs[1:])}, mixed or sliced as needed.',
           'Bake 15 minutes, until the fish flakes.']
  b.R(f'fishbake-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine='British')

BREADS = [
  ('cheese-soda', 'Cheese and onion soda bread', ['flour-plain 450g', 'bicarbonate-of-soda 1tsp', 'cheddar-cheese 120g', 'spring-onion 4', 'natural-yoghurt 400g']),
  ('focaccia-quick', 'Quick rosemary flatbread', ['flour-self-raising 300g', 'olive-oil 4tbsp', 'fresh-rosemary 2', 'salt 1tsp']),
  ('cornbread', 'Cornbread', ['polenta-dry 150g', 'flour-plain 150g', 'baking-powder 2tsp', 'egg-medium 2', 'milk-whole 250ml', 'butter-unsalted 60g']),
  ('fruit-scones', 'Fruit scones', ['flour-self-raising 350g', 'butter-unsalted 85g', 'sugar-caster 3tbsp', 'sultanas 80g', 'milk-whole 175ml']),
]
for key, name, ings in BREADS:
  refs = refs_of(ings)
  steps = ['Heat the oven to 200C. Line a baking tray.', f'Mix {join(refs[:3])} in a bowl.', f'Add {join(refs[3:])}. Bring together to a soft dough or batter.',
           'Shape or spread on the tray, or into a tin.', 'Bake 25 minutes, until risen and golden. Scones need 12.']
  b.R(f'bread-{key}', name, 'side' if key in ('cheese-soda', 'focaccia-quick', 'cornbread') else 'pudding', ings, steps, serves=8, tier='budget', cuisine='British')

# ---- Phase 44 (third batch) ----
for key, name, top in [('pesto-chicken-pizza', 'Chicken, pesto and red onion pizza', ['chicken-breast-roast 200g', 'pesto 60g', 'red-onion 1', 'mozzarella 2']),
                       ('spinach-ricotta-pizza', 'Spinach, ricotta and garlic pizza', ['spinach 100g', 'ricotta 150g', 'garlic-clove 2', 'mozzarella 1']),
                       ('chorizo-pepper-pizza', 'Chorizo and pepper pizza', ['chorizo 80g', 'pepper-bell 1', 'mozzarella 2']),
                       ('tuna-sweetcorn-pizza', 'Tuna and sweetcorn pizza', ['tuna-tinned-in-spring-water 1', 'sweetcorn-tinned 1', 'red-onion 1', 'mozzarella 2'])]:
  ings = ['flour-self-raising 300g', 'greek-yoghurt 300g', 'passata 200g'] + top
  steps = ['Heat the oven to 240C.', 'Mix {flour-self-raising} and {greek-yoghurt} to a soft dough.', 'Split in two. Roll each thin. Lay on floured trays.',
           'Spread with {passata}.', f'Top with {join(refs_of(top))}, sliced or torn as needed.', 'Bake 12 minutes, until crisp and bubbling.']
  swaps = [('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')] if any(x.startswith('pesto') for x in top) else []
  b.R(f'pizza-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine='Italian', swaps=swaps, note='No yeast and no waiting.')

for key, name, top in [('jacket-chicken-pesto', 'Jacket potatoes with chicken and pesto', ['chicken-breast-roast 200g', 'pesto 60g', 'creme-fraiche 80ml']),
                       ('jacket-prawn', 'Jacket potatoes with prawn cocktail', ['prawns-cooked 200g', 'mayonnaise 3tbsp', 'tomato-ketchup 1tbsp']),
                       ('jacket-chilli-con', 'Jacket potatoes with beef chilli', ['beef-mince-5-fat 300g', 'kidney-beans-tinned 1', 'passata 200g', 'chilli-powder 1tsp']),
                       ('jacket-feta-spinach', 'Jacket potatoes with spinach and feta', ['spinach 100g', 'feta 120g', 'garlic-clove 1'])]:
  ings = ['potato-large 4', 'olive-oil 1tbsp', 'salt 1tsp'] + top
  steps = ['Heat the oven to 200C.', 'Prick {potato-large} all over. Rub with {olive-oil} and {salt}.', 'Bake 1 hour 10 minutes, until crisp outside and soft inside.',
           f'Prepare the filling: mix {join(refs_of(top))}, cooked or chopped as needed.', 'Split the potatoes. Pile in the filling.']
  b.R(f'jacket-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine='British')

for tk, (tname, tings) in TOP.items():
  if tk == 'almond':
    continue
  ings = ['rhubarb 600g', 'sugar-caster 100g'] + tings
  fat = 'butter-unsalted' if 'butter-unsalted' in refs_of(tings) else 'dairy-free-spread'
  dry = [r for r in refs_of(tings) if r != fat]
  steps = ['Heat the oven to 190C.', 'Cut {rhubarb} into short lengths. Toss with {sugar-caster} in a baking dish.',
           f'Rub {t(fat)} into {join(dry)} until it looks like breadcrumbs.', 'Scatter over the fruit.', 'Bake 35 minutes, until golden and bubbling.']
  b.R(f'crumble-rhubarb-{tk}', f'Rhubarb {tname}', 'pudding', ings, steps, serves=6, tier='budget', cuisine='British')

for key, name, ings, steps in [
  ('pie-chicken-ham', 'Chicken and ham pie', ['chicken-thigh-boneless 6', 'ham-slice 6', 'leek 1', 'butter-unsalted 30g', 'flour-plain 2tbsp', 'stock-chicken 300ml', 'puff-pastry 320g', 'egg-medium 1'],
   ['Heat the oven to 200C. Fry diced {chicken-thigh-boneless} and sliced {leek} in {butter-unsalted} 10 minutes.', 'Stir in {flour-plain}. Add {stock-chicken} until thick. Add torn {ham-slice}.', 'Tip into a pie dish. Top with {puff-pastry}. Brush with beaten {egg-medium}.', 'Bake 30 minutes, until golden.']),
  ('pie-mushroom-leek', 'Mushroom, leek and thyme pie', ['butter-unsalted 30g', 'leek 2', 'mushroom-chestnut 16', 'flour-plain 2tbsp', 'stock-vegetable 300ml', 'creme-fraiche 100ml', 'fresh-thyme 4', 'puff-pastry 320g'],
   ['Heat the oven to 200C. Fry sliced {leek} and {mushroom-chestnut} in {butter-unsalted} 10 minutes.', 'Stir in {flour-plain}. Add {stock-vegetable} until thick. Stir in {creme-fraiche} and {fresh-thyme}.', 'Tip into a pie dish. Top with {puff-pastry}.', 'Bake 30 minutes, until golden.']),
  ('pie-fish-cheesy', 'Cheesy cod and spinach pie', ['cod-fillet 3', 'spinach 150g', 'milk-whole 500ml', 'butter-unsalted 40g', 'flour-plain 3tbsp', 'cheddar-cheese 100g', 'potato-large 4'],
   ['Boil peeled {potato-large} 20 minutes. Mash.', 'Melt {butter-unsalted}. Stir in {flour-plain}. Add {milk-whole} until thick. Stir in half of {cheddar-cheese}.', 'Heat the oven to 200C. Layer {spinach} and chunks of {cod-fillet} in a dish. Pour over the sauce.', 'Top with mash and the rest of the cheese. Bake 30 minutes.']),
  ('pie-vegan-lentil', 'Lentil and sweet potato cottage pie', ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 2', 'lentils-tinned 2', 'passata 300g', 'soy-sauce 1tbsp', 'sweet-potato 4'],
   ['Boil peeled {sweet-potato} 15 minutes. Mash.', 'Fry chopped {onion-medium} and {carrot-medium} in {olive-oil} 8 minutes.', 'Add drained {lentils-tinned}, {passata} and {soy-sauce}. Simmer 10 minutes.', 'Heat the oven to 200C. Tip into a dish. Top with the mash. Bake 25 minutes.']),
]:
  b.R(f'pie-{key}', name, 'main', ings, steps, serves=6, tier='everyday', cuisine='British')

for key, name, extra, s_fold, s_fin in [
  ('cardamom-orange', 'Orange and cardamom cake', ['orange 1', 'cardamom 6'], 'Fold in the zest of {orange} and the crushed seeds of {cardamom}.', 'Pour over the orange juice while warm.'),
  ('choc-courgette', 'Chocolate courgette cake', ['courgette 1', 'cocoa-powder 40g'], 'Fold in grated {courgette} and {cocoa-powder}.', 'Cool before slicing.'),
  ('lemon-raspberry-traybake', 'Raspberry and lemon traybake', ['raspberries 150g', 'lemon 1'], 'Fold in the zest of {lemon}. Dot with {raspberries}.', 'Squeeze over the lemon juice mixed with sugar.'),
  ('treacle-gingerbread', 'Treacle gingerbread', ['black-treacle 3tbsp', 'ginger-ground 2tsp'], 'Fold in {black-treacle} and {ginger-ground}.', 'Wrap and leave a day before cutting.'),
  ('blueberry-almond', 'Blueberry and almond loaf', ['blueberries 150g', 'ground-almonds 60g'], 'Fold in {ground-almonds} and {blueberries}.', 'Cool before slicing.'),
  ('vanilla-sprinkle-traybake', 'Vanilla sprinkle traybake', ['vanilla-extract 1tsp', 'icing-sugar 150g', 'sprinkles 2tbsp'], 'Fold in {vanilla-extract}.', 'Ice with {icing-sugar} mixed with water. Shower with {sprinkles}.'),
]:
  ings = ['butter-unsalted 175g', 'sugar-caster 175g', 'egg-medium 3', 'flour-self-raising 175g'] + extra
  steps = ['Heat the oven to 180C. Line a 20 cm tin.', 'Beat {butter-unsalted} and {sugar-caster} until pale and fluffy.', 'Beat in {egg-medium} one at a time.',
           'Fold in {flour-self-raising}.', s_fold, 'Bake 40 minutes, until a skewer comes out clean.', s_fin]
  b.R(f'cake-{key}', name, 'pudding', ings, steps, serves=10, tier='budget', cuisine='British')

for key, name, ings in [
  ('cod-chorizo-bake', 'Cod baked with chorizo and potatoes', ['potato-medium 4', 'olive-oil 2tbsp', 'chorizo 80g', 'cod-fillet 4', 'fresh-parsley 10g']),
  ('salmon-pesto-bake', 'Salmon baked with pesto and tomatoes', ['salmon-fillet 4', 'pesto 60g', 'cherry-tomato 16', 'olive-oil 1tbsp']),
  ('trout-herb-bake', 'Baked trout with dill butter', ['trout-fillet 520g', 'butter-unsalted 30g', 'fresh-dill 10g', 'lemon 1']),
  ('hake-salsa-bake', 'Baked hake with tomato and caper salsa', ['hake-fillet 600g', 'cherry-tomato 12', 'capers 1tbsp', 'olive-oil 2tbsp', 'fresh-basil 10g']),
  ('chicken-parm-bake', 'Chicken parmigiana bake', ['chicken-breast-skinless 4', 'passata 400g', 'mozzarella 2', 'parmesan 30g', 'fresh-basil 10g']),
  ('sausage-bean-bake', 'Sausage and bean bake', ['sausage-pork 8', 'cannellini-beans-tinned 2', 'passata 400g', 'smoked-paprika 1tsp']),
]:
  refs = refs_of(ings)
  steps = ['Heat the oven to 200C.', f'Lay {t(refs[0])} in a baking dish.', f'Top or surround with {join(refs[1:])}, mixed or sliced as needed.',
           'Bake 25 minutes, until cooked through and bubbling.' if refs[0] in ('chicken-breast-skinless', 'sausage-pork', 'potato-medium') else 'Bake 15 minutes, until the fish flakes.']
  swaps = [('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')] if 'pesto' in refs else []
  b.R(f'fishbake-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine='Mediterranean', swaps=swaps)
