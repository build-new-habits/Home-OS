# scripts/seasons/hob.py — 27 Nov 2026 v1
# Phase 44. On the hob: soups, pasta with its sauce, risottos, dals and
# stews, noodle soups, porridges and stovetop puddings.
from build import Book
from gen import t, join, refs_of

b = Book('hob', 'On the hob', 'hob')

# ---- Soups: (key, name, cuisine, base, main, liquid, extra, blend, finish_ings, finish_step) ----
SOUPS = [
  ('tomato-basil', 'Roast-free tomato and basil soup', 'Italian', ['onion-medium 1', 'garlic-clove 2'], ['chopped-tomatoes-tinned 2', 'sugar-caster 1tsp'], ['stock-vegetable 500ml'], [], True, ['fresh-basil 15g', 'double-cream 50ml'], 'Swirl in {double-cream}. Tear over {fresh-basil}.'),
  ('carrot-coriander', 'Carrot and coriander soup', 'British', ['onion-medium 1'], ['carrot-large 6', 'coriander-ground 2tsp'], ['stock-vegetable 1000ml'], [], True, ['fresh-coriander 15g'], 'Stir in chopped {fresh-coriander}.'),
  ('minestrone', 'Minestrone', 'Italian', ['onion-medium 1', 'carrot-medium 2', 'celery-stick 2'], ['chopped-tomatoes-tinned 1', 'cannellini-beans-tinned 1'], ['stock-vegetable 1000ml'], ['penne-dry 80g', 'cabbage-white 1'], False, ['parmesan 30g'], 'Top with grated {parmesan}.'),
  ('lentil-bacon', 'Red lentil and bacon soup', 'British', ['bacon-rasher-back 4', 'onion-medium 1', 'carrot-medium 2'], ['lentils-red-dry 200g'], ['stock-chicken 1200ml'], [], True, ['black-pepper-ground 0.5tsp'], 'Grind over {black-pepper-ground}.'),
  ('mushroom', 'Cream of mushroom soup', 'French', ['butter-unsalted 30g', 'onion-medium 1', 'garlic-clove 2'], ['mushroom-chestnut 20', 'fresh-thyme 4'], ['stock-vegetable 900ml'], [], True, ['single-cream 100ml'], 'Stir in {single-cream}.'),
  ('broccoli-stilton', 'Broccoli and Stilton soup', 'British', ['butter-unsalted 25g', 'onion-medium 1'], ['broccoli-head 1', 'potato-medium 1'], ['stock-vegetable 1000ml'], [], True, ['stilton 100g'], 'Stir in crumbled {stilton} until melted.'),
  ('cauliflower-cheese', 'Cauliflower cheese soup', 'British', ['butter-unsalted 25g', 'onion-medium 1'], ['cauliflower-head 1', 'potato-medium 1'], ['stock-vegetable 900ml', 'milk-whole 300ml'], [], True, ['cheddar-cheese 120g', 'mustard-dijon 1tsp'], 'Stir in grated {cheddar-cheese} and {mustard-dijon}.'),
  ('sweet-potato-coconut', 'Sweet potato, coconut and chilli soup', 'Thai', ['onion-medium 1', 'ginger-fresh 1tbsp', 'chilli-fresh 1'], ['sweet-potato 3'], ['stock-vegetable 800ml', 'coconut-milk-tinned 1'], [], True, ['lime 1', 'fresh-coriander 10g'], 'Squeeze in {lime}. Scatter with {fresh-coriander}.'),
  ('chicken-noodle', 'Chicken noodle soup', 'British', ['onion-medium 1', 'carrot-medium 2', 'celery-stick 2'], ['chicken-breast-skinless 2'], ['stock-chicken 1500ml'], ['egg-noodles-dry 120g'], False, ['fresh-parsley 10g'], 'Scatter with chopped {fresh-parsley}.'),
  ('tom-kha', 'Thai coconut chicken soup', 'Thai', ['lemongrass 2', 'galangal 1tbsp', 'lime-leaves 4'], ['chicken-breast-skinless 2', 'mushroom-chestnut 8'], ['stock-chicken 600ml', 'coconut-milk-tinned 1'], [], False, ['fish-sauce 2tbsp', 'lime 2', 'fresh-coriander 10g'], 'Stir in {fish-sauce} and the juice of {lime}. Scatter {fresh-coriander}.'),
  ('miso-noodle', 'Miso noodle soup with greens', 'Japanese', ['ginger-fresh 1tbsp', 'spring-onion 4'], ['shiitake-dried 15g', 'tofu-firm 1'], ['stock-vegetable 1200ml', 'miso-paste 3tbsp'], ['rice-noodles-dry 150g', 'pak-choi 2'], False, ['sesame-oil 1tsp'], 'Drizzle with {sesame-oil}.'),
  ('borscht', 'Beetroot borscht', 'Eastern European', ['onion-medium 1', 'carrot-medium 2'], ['beetroot-raw 3', 'cabbage-white 1'], ['stock-vegetable 1200ml'], [], False, ['soured-cream 150ml', 'fresh-dill 10g'], 'Serve with {soured-cream} and {fresh-dill}.'),
  ('celeriac-apple', 'Celeriac and apple soup', 'British', ['butter-unsalted 25g', 'onion-medium 1'], ['celeriac 600g', 'apple-medium 2'], ['stock-vegetable 1000ml'], [], True, ['chives 10g'], 'Snip over {chives}.'),
  ('curried-parsnip', 'Curried parsnip soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1'], ['parsnip 6', 'curry-powder 2tsp'], ['stock-vegetable 1200ml'], [], True, ['natural-yoghurt 100g'], 'Swirl in {natural-yoghurt}.'),
  ('pepper-tomato', 'Red pepper and tomato soup', 'Spanish', ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2'], ['pepper-bell 4', 'chopped-tomatoes-tinned 1', 'smoked-paprika 1tsp'], ['stock-vegetable 700ml'], [], True, ['fresh-basil 10g'], 'Tear over {fresh-basil}.'),
  ('black-bean', 'Mexican black bean soup', 'Mexican', ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2'], ['black-beans-tinned 2', 'cumin-ground 2tsp', 'chopped-tomatoes-tinned 1'], ['stock-vegetable 700ml'], [], True, ['lime 1', 'soured-cream 100ml'], 'Squeeze in {lime}. Top with {soured-cream}.'),
  ('harissa-chickpea', 'Harissa chickpea and tomato soup', 'Middle Eastern', ['olive-oil 2tbsp', 'onion-medium 1'], ['chickpeas-tinned 2', 'harissa-paste 2tbsp', 'chopped-tomatoes-tinned 1'], ['stock-vegetable 800ml'], ['spinach 100g'], False, ['lemon 1'], 'Squeeze in {lemon}.'),
  ('white-bean-kale', 'White bean, kale and rosemary soup', 'Italian', ['olive-oil 3tbsp', 'onion-medium 1', 'garlic-clove 3'], ['cannellini-beans-tinned 2', 'fresh-rosemary 2'], ['stock-vegetable 1000ml'], ['kale 150g'], False, ['parmesan 30g'], 'Top with grated {parmesan}.'),
  ('chunky-veg', 'Chunky vegetable soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1', 'leek 1'], ['carrot-medium 3', 'potato-medium 2', 'swede 200g'], ['stock-vegetable 1500ml'], ['peas-frozen 100g'], False, ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('mulligatawny', 'Mulligatawny', 'Anglo-Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'apple-medium 1'], ['lentils-red-dry 150g', 'curry-powder 2tbsp', 'carrot-medium 2'], ['stock-vegetable 1200ml', 'coconut-milk-tinned 1'], [], True, ['fresh-coriander 10g'], 'Scatter with {fresh-coriander}.'),
  ('thai-sweetcorn', 'Thai sweetcorn soup', 'Thai', ['spring-onion 4', 'ginger-fresh 1tbsp'], ['sweetcorn-tinned 2', 'thai-red-curry-paste 1tbsp'], ['stock-vegetable 800ml', 'coconut-milk-tinned 1'], [], True, ['lime 1'], 'Squeeze in {lime}.'),
  ('watercress', 'Watercress and potato soup', 'British', ['butter-unsalted 25g', 'onion-medium 1'], ['potato-medium 3'], ['stock-vegetable 1000ml'], ['watercress 150g'], True, ['creme-fraiche 100ml'], 'Swirl in {creme-fraiche}.'),
  ('spinach-pea', 'Spinach, pea and lemon soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1'], ['potato-medium 1', 'peas-frozen 300g'], ['stock-vegetable 1000ml'], ['spinach 150g'], True, ['lemon 1'], 'Squeeze in {lemon}.'),
  ('roast-free-squash', 'Butternut squash and ginger soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1', 'ginger-fresh 1tbsp'], ['butternut-squash 1'], ['stock-vegetable 1200ml'], [], True, ['pumpkin-seeds 2tbsp'], 'Scatter with {pumpkin-seeds}.'),
  ('pea-ham-hock', 'Split pea style soup with ham', 'British', ['onion-medium 1', 'carrot-medium 2'], ['lentils-green-dry 200g', 'ham-slice 6'], ['stock-chicken 1500ml'], [], False, ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('egg-drop', 'Chinese egg drop soup', 'Chinese', ['ginger-fresh 1tsp', 'spring-onion 4'], ['sweetcorn-tinned 1', 'soy-sauce 2tbsp'], ['stock-chicken 1200ml'], ['cornflour 2tbsp', 'egg-medium 3'], False, ['sesame-oil 1tsp'], 'Drizzle with {sesame-oil}.'),
  ('lentil-lemon', 'Lemony lentil and spinach soup', 'Middle Eastern', ['olive-oil 2tbsp', 'onion-medium 1', 'cumin-ground 2tsp'], ['lentils-red-dry 200g', 'carrot-medium 2'], ['stock-vegetable 1200ml'], ['spinach 100g'], False, ['lemon 1'], 'Squeeze in {lemon}.'),
  ('potato-leek-bacon', 'Potato, bacon and leek chowder', 'American', ['bacon-rasher-back 4', 'leek 2'], ['potato-medium 3', 'sweetcorn-tinned 1'], ['stock-chicken 600ml', 'milk-whole 400ml'], [], False, ['chives 10g'], 'Snip over {chives}.'),
]
for key, name, cui, base, main, liquid, extra, blend, fin, fs in SOUPS:
  ings, seen = [], set()
  for i in base + main + liquid + extra + fin:
    r = i.split()[0]
    if r not in seen:
      seen.add(r); ings.append(i)
  fats = [r for r in refs_of(base) if r in ('butter-unsalted', 'olive-oil', 'vegetable-oil', 'bacon-rasher-back')]
  aroma = [r for r in refs_of(base) if r not in fats]
  steps = ['Put a large pan on a medium heat.']
  if fats:
    steps.append(f'Add {join(fats)}.' + (' Fry 4 minutes, until crisp.' if 'bacon-rasher-back' in fats else ''))
  steps.append(f'Chop {join(aroma)}. Fry 8 minutes, until soft.' if aroma else 'Warm through.')
  mr = refs_of(main)
  steps.append(f'Add {join(mr)}, chopped as needed.')
  steps.append(f'Add {join(refs_of(liquid))}. Simmer 20 minutes, until tender.')
  ex = refs_of(extra)
  if 'egg-medium' in ex:
    steps.append('Mix {cornflour} with 3 tbsp cold water. Stir in until the soup thickens.')
    steps.append('Beat {egg-medium}. Pour in slowly, stirring, so it sets in ribbons.')
  elif ex:
    steps.append(f'Add {join(ex)}. Simmer 8 minutes more, until cooked.')
  if blend:
    steps.append('Blend until smooth.')
  steps.append(fs)
  b.R(f'soup-{key}', name, 'starter', ings, steps, serves=6, tier='budget', cuisine=cui, note='Keeps three days in the fridge and freezes well.')

# ---- Pasta with its sauce: pasta boiled, sauce in a second pan ----
PASTA = [
  ('carbonara', 'Spaghetti carbonara', 'Italian', ['bacon-rasher-back 6', 'egg-medium 3', 'parmesan 60g', 'black-pepper-ground 1tsp'], 'Fry chopped {bacon-rasher-back} 5 minutes, until crisp.', 'Beat {egg-medium} with grated {parmesan} and {black-pepper-ground}.', 'Off the heat, toss the pasta with the bacon, eggs and a splash of water until silky. || Off the heat, or the eggs scramble.'),
  ('aglio-olio', 'Spaghetti with garlic, oil and chilli', 'Italian', ['olive-oil 5tbsp', 'garlic-clove 5', 'chilli-flakes 1tsp', 'fresh-parsley 20g'], 'Slice {garlic-clove}. Warm in {olive-oil} with {chilli-flakes} 3 minutes, until pale gold.', '', 'Toss the pasta in the oil with chopped {fresh-parsley} and a splash of water.'),
  ('amatriciana', 'Bucatini-style amatriciana', 'Italian', ['pancetta 120g', 'onion-medium 1', 'chopped-tomatoes-tinned 1', 'chilli-flakes 0.5tsp', 'pecorino 40g'], 'Fry {pancetta} 5 minutes. Add chopped {onion-medium}. Fry 5 minutes.', 'Add {chopped-tomatoes-tinned} and {chilli-flakes}. Simmer 12 minutes.', 'Toss the pasta through the sauce. Top with grated {pecorino}.'),
  ('alfredo', 'Fettuccine-style alfredo', 'Italian', ['butter-unsalted 50g', 'double-cream 200ml', 'parmesan 80g', 'nutmeg 0.25tsp'], 'Melt {butter-unsalted} with {double-cream}. Bubble 2 minutes.', 'Stir in grated {parmesan} and {nutmeg}.', 'Toss the pasta through the sauce with a splash of water.'),
  ('primavera', 'Pasta primavera', 'Italian', ['olive-oil 3tbsp', 'courgette 1', 'asparagus 10', 'peas-frozen 150g', 'lemon 1', 'parmesan 30g'], 'Slice {courgette} and {asparagus}. Fry in {olive-oil} 5 minutes.', 'Add {peas-frozen}. Cook 2 minutes. Add the zest and juice of {lemon}.', 'Toss the pasta through. Top with grated {parmesan}.'),
  ('tuna-tomato', 'Tuna, caper and tomato pasta', 'Italian', ['olive-oil 2tbsp', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'capers 1tbsp', 'tuna-tinned-in-spring-water 2', 'fresh-parsley 10g'], 'Fry sliced {garlic-clove} in {olive-oil} 1 minute.', 'Add {chopped-tomatoes-tinned} and {capers}. Simmer 10 minutes. Flake in {tuna-tinned-in-spring-water}.', 'Toss the pasta through. Scatter {fresh-parsley}.'),
  ('salmon-dill', 'Salmon, dill and crème fraîche pasta', 'British', ['salmon-fillet 2', 'creme-fraiche 200ml', 'lemon 1', 'fresh-dill 10g', 'peas-frozen 100g'], 'Poach {salmon-fillet} in simmering water 8 minutes. Flake.', 'Warm {creme-fraiche} with {peas-frozen} and the zest of {lemon}.', 'Toss the pasta, salmon and sauce with chopped {fresh-dill}.'),
  ('prawn-chilli', 'King prawn, chilli and garlic linguine', 'Italian', ['olive-oil 3tbsp', 'garlic-clove 3', 'chilli-fresh 1', 'king-prawns-raw 300g', 'lemon 1', 'fresh-parsley 10g'], 'Fry sliced {garlic-clove} and {chilli-fresh} in {olive-oil} 1 minute.', 'Add {king-prawns-raw}. Cook 3 minutes, until pink.', 'Toss the pasta through with the juice of {lemon} and {fresh-parsley}.'),
  ('sausage-ragu', 'Sausage ragù', 'Italian', ['sausage-pork 6', 'onion-medium 1', 'garlic-clove 2', 'passata 500g', 'wine-red 125ml', 'fennel-seeds 1tsp', 'parmesan 30g'], 'Squeeze {sausage-pork} out of their skins. Fry 6 minutes, breaking up, with chopped {onion-medium}.', 'Add {garlic-clove}, {fennel-seeds}, {wine-red} and {passata}. Simmer 20 minutes.', 'Toss the pasta through. Top with grated {parmesan}.'),
  ('beef-ragu', 'Slow beef ragù on the hob', 'Italian', ['beef-mince-20-fat 500g', 'onion-medium 1', 'carrot-medium 1', 'celery-stick 1', 'wine-red 150ml', 'chopped-tomatoes-tinned 2', 'milk-whole 100ml'], 'Fry {beef-mince-20-fat} 8 minutes, until browned. Add chopped {onion-medium}, {carrot-medium} and {celery-stick}.', 'Add {wine-red}, {chopped-tomatoes-tinned} and {milk-whole}. Simmer 1 hour, until rich.', 'Toss the pasta through the ragù.'),
  ('pesto-beans', 'Pesto pasta with green beans and potato', 'Italian', ['potato-medium 1', 'green-beans 150g', 'pesto 120g', 'parmesan 30g'], 'Dice {potato-medium}. Add to the pasta water for the last 10 minutes.', 'Add {green-beans} for the last 5 minutes.', 'Drain. Toss with {pesto}. Top with grated {parmesan}.'),
  ('puttanesca-tuna', 'Tomato, olive and caper pasta', 'Italian', ['olive-oil 2tbsp', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'olives-pitted 80g', 'capers 1tbsp', 'chilli-flakes 0.5tsp'], 'Fry sliced {garlic-clove} in {olive-oil} 1 minute.', 'Add {chopped-tomatoes-tinned}, {olives-pitted}, {capers} and {chilli-flakes}. Simmer 12 minutes.', 'Toss the pasta through.'),
  ('mushroom-stroganoff-pasta', 'Mushroom and paprika cream pasta', 'Eastern European', ['butter-unsalted 25g', 'onion-medium 1', 'mushroom-chestnut 16', 'smoked-paprika 1tsp', 'soured-cream 150ml'], 'Fry chopped {onion-medium} in {butter-unsalted} 6 minutes.', 'Add sliced {mushroom-chestnut} and {smoked-paprika}. Fry 8 minutes. Stir in {soured-cream}.', 'Toss the pasta through.'),
  ('cacio-pepe-peas', 'Pea and black pepper cheese pasta', 'Italian', ['peas-frozen 200g', 'butter-unsalted 30g', 'pecorino 80g', 'black-pepper-ground 1tsp'], 'Add {peas-frozen} to the pasta for the last 3 minutes.', 'Melt {butter-unsalted} with {black-pepper-ground} in the empty pan.', 'Return the drained pasta. Toss with grated {pecorino} and a splash of water until creamy.'),
  ('lemon-ricotta-courgette', 'Courgette, lemon and mint pasta', 'Italian', ['olive-oil 3tbsp', 'courgette 2', 'garlic-clove 2', 'lemon 1', 'fresh-mint 10g', 'feta 100g'], 'Grate {courgette}. Fry with {garlic-clove} in {olive-oil} 6 minutes.', 'Add the zest and juice of {lemon}.', 'Toss the pasta through with {fresh-mint}. Crumble over {feta}.'),
  ('chorizo-tomato', 'Chorizo, tomato and spinach pasta', 'Spanish', ['chorizo 120g', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'spinach 100g'], 'Fry diced {chorizo} 4 minutes, until it releases its oil.', 'Add {garlic-clove} and {chopped-tomatoes-tinned}. Simmer 10 minutes. Stir in {spinach}.', 'Toss the pasta through.'),
  ('broccoli-pesto-pasta', 'Broccoli and almond pesto pasta', 'Italian', ['broccoli-head 1', 'almonds 50g', 'garlic-clove 1', 'olive-oil 5tbsp', 'parmesan 40g', 'lemon 1'], 'Add {broccoli-head} florets to the pasta for the last 4 minutes.', 'Blend a third of the broccoli with {almonds}, {garlic-clove}, {olive-oil}, {parmesan} and {lemon} juice.', 'Toss everything together with a splash of water.'),
  ('nduja-tomato', "'Nduja and tomato pasta", 'Italian', ['nduja 60g', 'garlic-clove 2', 'passata 400g', 'mascarpone 100g'], 'Melt {nduja} in a pan 2 minutes.', 'Add {garlic-clove} and {passata}. Simmer 10 minutes. Stir in {mascarpone}.', 'Toss the pasta through.'),
]
for key, name, cui, extra, s1, s2, s3 in PASTA:
  pasta = 'spaghetti-dry 400g'
  ings = [pasta] + extra
  steps = ['Put a large pan of salted water on to boil.',
           'Cook {spaghetti-dry} for the time on the packet. Keep a mug of the water.',
           '## Sauce', s1]
  if s2:
    steps.append(s2)
  steps.append('## Together')
  steps.append(s3)
  b.R(f'pasta-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

# ---- Risottos ----
RISOTTO = [
  ('butternut', 'Butternut squash and sage risotto', ['butternut-squash 1', 'fresh-sage 6'], ['parmesan 50g'], 'Dice half of {butternut-squash}. Add with the rice. Fry {fresh-sage} until crisp to finish.'),
  ('beetroot-goats', 'Beetroot and goats cheese risotto', ['beetroot 3'], ['goats-cheese 120g'], 'Grate {beetroot}. Add with the first ladle of stock.'),
  ('chicken-mushroom', 'Chicken and mushroom risotto', ['chicken-thigh-boneless 4', 'mushroom-chestnut 10'], ['parmesan 40g'], 'Fry diced {chicken-thigh-boneless} and sliced {mushroom-chestnut} with the onion.'),
  ('prawn-courgette', 'Prawn, courgette and lemon risotto', ['courgette 2', 'king-prawns-raw 300g', 'lemon 1'], [], 'Grate {courgette}. Add {king-prawns-raw} and the zest of {lemon} for the last 4 minutes.'),
  ('tomato-mozzarella', 'Tomato and mozzarella risotto', ['chopped-tomatoes-tinned 1', 'fresh-basil 10g'], ['mozzarella 1'], 'Add {chopped-tomatoes-tinned} with the first ladle. Tear in {fresh-basil} at the end.'),
  ('spinach-stilton', 'Spinach and Stilton risotto', ['spinach 150g'], ['stilton 100g'], 'Stir in {spinach} for the last 2 minutes.'),
  ('sausage-red-wine', 'Sausage and red wine risotto', ['sausage-pork 4', 'wine-red 150ml'], ['parmesan 40g'], 'Fry {sausage-pork} meat out of its skins with the onion. Use {wine-red} as the first liquid.'),
  ('saffron', 'Saffron risotto', ['saffron 0.25tsp', 'wine-white 125ml'], ['parmesan 60g'], 'Soak {saffron} in a ladle of hot stock. Add after {wine-white}.'),
  ('leek-bacon', 'Leek and bacon risotto', ['bacon-rasher-back 4', 'leek 2'], ['parmesan 40g'], 'Fry chopped {bacon-rasher-back} and sliced {leek} with the onion.'),
  ('pea-mint-ricotta', 'Pea, mint and ricotta risotto', ['peas-frozen 200g', 'fresh-mint 10g'], ['ricotta 150g'], 'Add {peas-frozen} for the last 4 minutes. Stir in {fresh-mint} at the end.'),
]
for key, name, flav, cheese, special in RISOTTO:
  ings = ['stock-vegetable 1200ml', 'butter-unsalted 30g', 'onion-medium 1', 'rice-arborio-dry 300g'] + flav + cheese
  cref = refs_of(cheese)
  steps = ['Warm {stock-vegetable} in a pan.',
           'Melt {butter-unsalted} in a wide pan. Chop {onion-medium}. Fry 8 minutes, until soft.',
           'Add {rice-arborio-dry}. Stir 1 minute, until the grains turn see-through at the edges.',
           special,
           'Add the stock a ladle at a time, stirring, about 18 minutes, until creamy.']
  steps.append(f'Stir in {join(cref)}. Rest 2 minutes.' if cref else 'Rest 2 minutes off the heat.')
  b.R(f'risotto-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine='Italian',
      note='Wait for each ladle to soak in before the next.')

# ---- Dals, beans and stews ----
STEWS = [
  ('tarka-dal', 'Tarka dal', 'Indian', ['lentils-red-dry 250g', 'turmeric-ground 1tsp', 'water 1000ml', 'vegetable-oil 3tbsp', 'cumin-ground 1tsp', 'garlic-clove 3', 'chilli-fresh 1', 'fresh-coriander 10g'],
   ['Rinse {lentils-red-dry}. Simmer with {turmeric-ground} and {water} 25 minutes, stirring, until soft.', '## Tarka', 'Heat {vegetable-oil} in a small pan. Add {cumin-ground}, sliced {garlic-clove} and {chilli-fresh}.', 'Fry 1 minute, until the garlic is golden. Pour over the dal.', 'Scatter with {fresh-coriander}.']),
  ('chana-masala', 'Chana masala', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 2', 'garlic-clove 3', 'ginger-fresh 1tbsp', 'garam-masala 2tsp', 'cumin-ground 1tsp', 'chopped-tomatoes-tinned 1', 'chickpeas-tinned 2', 'lemon 1', 'fresh-coriander 10g'],
   ['Fry chopped {onion-medium} in {vegetable-oil} 10 minutes, until deep golden.', 'Add {garlic-clove}, {ginger-fresh}, {garam-masala} and {cumin-ground}. Fry 1 minute.', 'Add {chopped-tomatoes-tinned} and drained {chickpeas-tinned}. Simmer 20 minutes.', 'Squeeze in {lemon}. Scatter {fresh-coriander}.']),
  ('rajma', 'Rajma (kidney bean curry)', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'ginger-fresh 1tbsp', 'garam-masala 2tsp', 'chilli-powder 1tsp', 'passata 400g', 'kidney-beans-tinned 2', 'rice-basmati-dry 300g'],
   ['Cook {rice-basmati-dry} for the time on the packet.', 'Fry chopped {onion-medium} in {vegetable-oil} 8 minutes.', 'Add {garlic-clove}, {ginger-fresh}, {garam-masala} and {chilli-powder}. Fry 1 minute.', 'Add {passata} and drained {kidney-beans-tinned}. Simmer 20 minutes, until thick.', 'Serve with the rice.']),
  ('black-bean-stew', 'Cuban-style black bean stew', 'Caribbean', ['olive-oil 2tbsp', 'onion-medium 1', 'pepper-bell 1', 'garlic-clove 2', 'cumin-ground 2tsp', 'dried-oregano 1tsp', 'black-beans-tinned 2', 'stock-vegetable 300ml', 'lime 1', 'rice-basmati-dry 300g'],
   ['Cook {rice-basmati-dry} for the time on the packet.', 'Fry chopped {onion-medium} and {pepper-bell} in {olive-oil} 8 minutes.', 'Add {garlic-clove}, {cumin-ground} and {dried-oregano}. Fry 1 minute.', 'Add {black-beans-tinned} with their liquid and {stock-vegetable}. Simmer 20 minutes.', 'Squeeze in {lime}. Serve on the rice.']),
  ('lentil-ragout', 'French lentil and mushroom ragout', 'French', ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 2', 'mushroom-chestnut 10', 'lentils-green-dry 250g', 'stock-vegetable 900ml', 'fresh-thyme 4', 'mustard-dijon 1tbsp'],
   ['Fry chopped {onion-medium} and {carrot-medium} in {olive-oil} 8 minutes.', 'Add sliced {mushroom-chestnut}. Fry 5 minutes.', 'Add {lentils-green-dry}, {stock-vegetable} and {fresh-thyme}. Simmer 30 minutes, until tender.', 'Stir in {mustard-dijon}.']),
  ('shakshuka-beans', 'Smoky beans and eggs', 'Middle Eastern', ['olive-oil 2tbsp', 'onion-medium 1', 'smoked-paprika 2tsp', 'cannellini-beans-tinned 2', 'chopped-tomatoes-tinned 1', 'egg-medium 4', 'fresh-parsley 10g'],
   ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.', 'Add {smoked-paprika}, drained {cannellini-beans-tinned} and {chopped-tomatoes-tinned}. Simmer 10 minutes.', 'Make 4 dips. Crack in {egg-medium}. Cover. Cook 6 minutes, until the whites set.', 'Scatter with {fresh-parsley}.']),
  ('beef-stroganoff', 'Beef stroganoff', 'Russian', ['beef-sirloin 2', 'butter-unsalted 30g', 'onion-medium 1', 'mushroom-chestnut 12', 'paprika 1tsp', 'mustard-dijon 1tsp', 'soured-cream 200ml', 'rice-basmati-dry 300g'],
   ['Cook {rice-basmati-dry} for the time on the packet.', 'Slice {beef-sirloin} into strips. Sear in half of {butter-unsalted} 2 minutes. Lift out.', 'Fry sliced {onion-medium} and {mushroom-chestnut} in the rest of the butter 8 minutes.', 'Add {paprika}, {mustard-dijon} and {soured-cream}. Warm through without boiling.', 'Return the beef. Serve with the rice.']),
  ('sausage-casserole-hob', 'Sausage and lentil stew', 'British', ['sausage-pork 8', 'olive-oil 1tbsp', 'onion-medium 1', 'carrot-medium 2', 'lentils-green-dry 150g', 'chopped-tomatoes-tinned 1', 'stock-chicken 600ml', 'fresh-thyme 4'],
   ['Brown {sausage-pork} in {olive-oil} 6 minutes. Lift out.', 'Fry chopped {onion-medium} and {carrot-medium} 8 minutes.', 'Add {lentils-green-dry}, {chopped-tomatoes-tinned}, {stock-chicken} and {fresh-thyme}.', 'Return the sausages. Simmer 30 minutes, until the lentils are tender.']),
  ('chicken-cacciatore', 'Chicken cacciatore', 'Italian', ['olive-oil 2tbsp', 'chicken-thigh-boneless 8', 'onion-medium 1', 'pepper-bell 2', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'olives-pitted 60g', 'fresh-rosemary 2'],
   ['Brown {chicken-thigh-boneless} in {olive-oil} 6 minutes. Lift out.', 'Fry sliced {onion-medium} and {pepper-bell} 8 minutes.', 'Add {garlic-clove}, {chopped-tomatoes-tinned}, {olives-pitted} and {fresh-rosemary}.', 'Return the chicken. Simmer 25 minutes, until cooked through.']),
  ('veg-chilli', 'Three-bean chilli', 'Mexican', ['olive-oil 2tbsp', 'onion-medium 1', 'pepper-bell 2', 'garlic-clove 2', 'chilli-powder 2tsp', 'cumin-ground 2tsp', 'kidney-beans-tinned 1', 'black-beans-tinned 1', 'cannellini-beans-tinned 1', 'chopped-tomatoes-tinned 2'],
   ['Fry chopped {onion-medium} and {pepper-bell} in {olive-oil} 8 minutes.', 'Add {garlic-clove}, {chilli-powder} and {cumin-ground}. Fry 1 minute.', 'Add drained {kidney-beans-tinned}, {black-beans-tinned} and {cannellini-beans-tinned}.', 'Add {chopped-tomatoes-tinned}. Simmer 25 minutes, until thick.']),
]
for key, name, cui, ings, steps in STEWS:
  b.R(f'stew-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

# ---- Noodle soups ----
NOODLES = [
  ('chicken-ramen', 'Chicken ramen', 'Japanese', ['stock-chicken 1500ml', 'soy-sauce 3tbsp', 'ginger-fresh 1tbsp', 'garlic-clove 2', 'chicken-breast-skinless 2', 'egg-medium 4', 'egg-noodles-dry 250g', 'pak-choi 2', 'spring-onion 4']),
  ('prawn-laksa', 'King prawn laksa', 'Malaysian', ['vegetable-oil 1tbsp', 'thai-red-curry-paste 3tbsp', 'coconut-milk-tinned 1', 'stock-vegetable 700ml', 'king-prawns-raw 300g', 'rice-noodles-dry 200g', 'beansprouts 100g', 'lime 1']),
  ('tofu-pho', 'Tofu and herb noodle soup', 'Vietnamese', ['stock-vegetable 1500ml', 'star-anise 2', 'cinnamon-stick 1', 'ginger-fresh 1tbsp', 'soy-sauce 2tbsp', 'tofu-firm 1', 'rice-noodles-dry 200g', 'beansprouts 100g', 'fresh-mint 10g', 'lime 1']),
  ('beef-pho', 'Beef pho', 'Vietnamese', ['stock-cube 2', 'star-anise 2', 'cinnamon-stick 1', 'ginger-fresh 1tbsp', 'fish-sauce 2tbsp', 'beef-sirloin 1', 'rice-noodles-dry 200g', 'beansprouts 100g', 'fresh-coriander 10g', 'lime 1']),
  ('miso-ramen', 'Mushroom miso ramen', 'Japanese', ['stock-vegetable 1500ml', 'miso-paste 3tbsp', 'shiitake-dried 15g', 'mushroom-chestnut 8', 'egg-noodles-dry 250g', 'spinach 100g', 'spring-onion 4', 'sesame-oil 1tsp']),
  ('coconut-noodle', 'Coconut chicken noodle soup', 'Thai', ['thai-green-curry-paste 2tbsp', 'coconut-milk-tinned 1', 'stock-chicken 800ml', 'chicken-breast-skinless 2', 'rice-noodles-dry 200g', 'green-beans 100g', 'lime 1', 'fresh-basil 10g']),
]
for key, name, cui, ings in NOODLES:
  refs = refs_of(ings)
  broth = [r for r in refs if r in ('stock-chicken', 'stock-vegetable', 'soy-sauce', 'ginger-fresh', 'garlic-clove', 'star-anise', 'cinnamon-stick', 'miso-paste', 'shiitake-dried', 'thai-red-curry-paste', 'thai-green-curry-paste', 'coconut-milk-tinned', 'fish-sauce', 'vegetable-oil', 'stock-cube')]
  protein = [r for r in refs if r in ('chicken-breast-skinless', 'king-prawns-raw', 'tofu-firm', 'beef-sirloin', 'mushroom-chestnut')]
  noodle = [r for r in refs if 'noodles' in r][0]
  greens = [r for r in refs if r in ('pak-choi', 'beansprouts', 'spinach', 'green-beans')]
  fin = [r for r in refs if r in ('spring-onion', 'lime', 'fresh-mint', 'fresh-coriander', 'fresh-basil', 'sesame-oil')]
  steps = [f'Put {join(broth[:5])} in a large pan.' if len(broth) > 0 else 'Put a large pan on the heat.']
  if len(broth) > 5:
    steps.append(f'Add {join(broth[5:])}.')
  if 'stock-cube' in broth:
    steps.append('Add 1.5 litres of water.')
  steps.append('Simmer 15 minutes, until fragrant.')
  if 'egg-medium' in refs:
    steps.append('Boil {egg-medium} 7 minutes in a small pan. Cool, peel and halve.')
  steps.append(f'Slice {join(protein)} thinly. Add. Simmer 5 minutes, until cooked through.' if 'beef-sirloin' not in protein else 'Slice {beef-sirloin} very thinly. Lay in the bowls raw; the hot broth cooks it.')
  steps.append(f'Cook {t(noodle)} for the time on the packet. Divide between bowls.')
  steps.append(f'Add {join(greens)} to the broth 2 minutes. Ladle over the noodles.')
  steps.append(f'Finish with {join(fin)}.')
  b.R(f'noodle-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine=cui)

# ---- Porridge ----
PORRIDGE = [
  ('apple-cinnamon', 'Apple and cinnamon porridge', ['apple-medium 1', 'cinnamon-ground 0.5tsp', 'maple-syrup 1tbsp'], 'Grate in {apple-medium} with {cinnamon-ground} for the last 2 minutes. Drizzle with {maple-syrup}.'),
  ('banana-peanut', 'Banana and peanut butter porridge', ['banana-medium 1', 'peanut-butter 1tbsp'], 'Top with sliced {banana-medium} and {peanut-butter}.'),
  ('berry', 'Berry porridge', ['blueberries 80g', 'raspberries 60g', 'honey 1tbsp'], 'Stir in {blueberries} for the last minute. Top with {raspberries} and {honey}.'),
  ('chocolate', 'Chocolate porridge', ['cocoa-powder 1tbsp', 'maple-syrup 1tbsp', 'banana-medium 1'], 'Stir in {cocoa-powder} and {maple-syrup}. Top with sliced {banana-medium}.'),
  ('pear-ginger', 'Pear and ginger porridge', ['pear 1', 'ginger-ground 0.5tsp', 'honey 1tbsp'], 'Dice in {pear} with {ginger-ground} for the last 3 minutes. Drizzle with {honey}.'),
  ('date-tahini', 'Date and tahini porridge', ['dates-pitted 4', 'tahini 1tbsp'], 'Chop {dates-pitted}. Stir in. Swirl over {tahini}.'),
  ('golden-syrup', 'Golden syrup porridge', ['golden-syrup 1tbsp', 'double-cream 2tbsp'], 'Top with {golden-syrup} and {double-cream}.'),
  ('mango-coconut', 'Coconut and mango porridge', ['coconut-milk-tinned 1', 'mango 1', 'lime 1'], 'Use half of {coconut-milk-tinned} in place of half the milk. Top with diced {mango} and {lime} zest.'),
]
for key, name, extra, fin in PORRIDGE:
  ings = ['oats-rolled 100g', 'milk-semi-skimmed 500ml'] + extra
  steps = ['Put {oats-rolled} and {milk-semi-skimmed} in a pan.',
           'Bring to a simmer on a medium heat, stirring.',
           'Simmer 5 minutes, stirring, until thick and creamy.',
           fin]
  b.R(f'porridge-{key}', name, 'breakfast', ings, steps, serves=2, tier='budget', slot='breakfast', cuisine='British')

# ---- Hob puddings ----
PUDS = [
  ('custard', 'Proper vanilla custard', ['milk-whole 500ml', 'egg-yolk 4', 'sugar-caster 50g', 'cornflour 1tbsp', 'vanilla-extract 1tsp'],
   ['Warm {milk-whole} with {vanilla-extract} until steaming.', 'Whisk {egg-yolk}, {sugar-caster} and {cornflour}.', 'Pour in the hot milk, whisking.', 'Return to the pan. Stir on a low heat 5 minutes, until it coats the spoon. || Never let it boil, or it splits.']),
  ('stewed-apples', 'Stewed apples with cinnamon', ['apple-cooking 4', 'sugar-caster 60g', 'cinnamon-ground 0.5tsp', 'water 3tbsp'],
   ['Peel, core and chop {apple-cooking}.', 'Put in a pan with {sugar-caster}, {cinnamon-ground} and {water}.', 'Simmer 10 minutes, stirring, until soft and fluffy.']),
  ('chocolate-sauce-bananas', 'Bananas in hot chocolate sauce', ['dark-chocolate 100g', 'double-cream 150ml', 'banana-medium 4'],
   ['Warm {double-cream} in a pan until steaming.', 'Take off the heat. Add {dark-chocolate}. Stir until glossy.', 'Slice {banana-medium}. Pour the sauce over.']),
  ('rice-pudding-hob', 'Stovetop rice pudding', ['rice-arborio-dry 100g', 'milk-whole 800ml', 'sugar-caster 50g', 'vanilla-extract 1tsp', 'jam-strawberry 4tbsp'],
   ['Put {rice-arborio-dry}, {milk-whole} and {sugar-caster} in a pan.', 'Simmer 30 minutes on a low heat, stirring often, until creamy.', 'Stir in {vanilla-extract}.', 'Serve with {jam-strawberry}.']),
  ('poached-plums', 'Plums poached in orange', ['plums 8', 'orange-juice 300ml', 'sugar-caster 50g', 'star-anise 2', 'greek-yoghurt 200g'],
   ['Halve and stone {plums}.', 'Simmer {orange-juice}, {sugar-caster} and {star-anise} 3 minutes.', 'Add the plums. Poach 8 minutes, until soft.', 'Serve warm with {greek-yoghurt}.']),
  ('caramel-pears', 'Caramelised pears', ['butter-unsalted 30g', 'sugar-soft-brown 3tbsp', 'pear 4', 'double-cream 100ml'],
   ['Melt {butter-unsalted} and {sugar-soft-brown} in a pan.', 'Peel and quarter {pear}. Add.', 'Cook 8 minutes, turning, until golden and sticky.', 'Pour in {double-cream}. Bubble 1 minute.']),
  ('berry-compote', 'Warm berry compote', ['blueberries 200g', 'raspberries 150g', 'sugar-caster 50g', 'lemon 1', 'natural-yoghurt 300g'],
   ['Put {blueberries}, {raspberries} and {sugar-caster} in a pan.', 'Simmer 5 minutes, until the berries burst.', 'Squeeze in {lemon}.', 'Spoon over {natural-yoghurt}.']),
  ('coconut-rice', 'Coconut rice pudding with mango', ['rice-arborio-dry 100g', 'coconut-milk-tinned 2', 'sugar-caster 50g', 'mango 1'],
   ['Put {rice-arborio-dry}, {coconut-milk-tinned} and {sugar-caster} in a pan with 200 ml water.', 'Simmer 30 minutes, stirring often, until thick.', 'Top with diced {mango}.']),
]
for key, name, ings, steps in PUDS:
  b.R(f'pud-{key}', name, 'pudding', ings, steps, serves=4, tier='budget', cuisine='British')

# ---- Phase 44 (second batch): more soups, pastas, risottos, stews, sides ----
MORE_SOUPS = [
  ('pea-pesto', 'Pea and pesto soup', 'Italian', ['olive-oil 1tbsp', 'onion-medium 1'], ['peas-frozen 500g'], ['stock-vegetable 900ml'], [], True, ['pesto 60g'], 'Swirl in {pesto}.'),
  ('tomato-lentil', 'Tomato and red lentil soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2'], ['lentils-red-dry 150g', 'chopped-tomatoes-tinned 2'], ['stock-vegetable 1000ml'], [], True, ['fresh-basil 10g'], 'Tear over {fresh-basil}.'),
  ('leek-stilton', 'Leek and Stilton soup', 'British', ['butter-unsalted 25g', 'leek 3'], ['potato-medium 2'], ['stock-vegetable 1000ml'], [], True, ['stilton 100g'], 'Stir in crumbled {stilton}.'),
  ('gazpacho-free-carrot-ginger', 'Carrot, ginger and orange soup', 'British', ['olive-oil 2tbsp', 'onion-medium 1', 'ginger-fresh 1tbsp'], ['carrot-large 6', 'orange 1'], ['stock-vegetable 1000ml'], [], True, ['creme-fraiche 80ml'], 'Swirl in {creme-fraiche}.'),
  ('chorizo-bean', 'Chorizo, bean and tomato soup', 'Spanish', ['chorizo 100g', 'onion-medium 1'], ['cannellini-beans-tinned 2', 'chopped-tomatoes-tinned 1', 'smoked-paprika 1tsp'], ['stock-chicken 800ml'], ['kale 100g'], False, ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('sweetcorn-chowder', 'Sweetcorn and potato chowder', 'American', ['butter-unsalted 25g', 'onion-medium 1'], ['potato-medium 3', 'sweetcorn-tinned 2'], ['stock-vegetable 600ml', 'milk-whole 400ml'], [], False, ['chives 10g'], 'Snip over {chives}.'),
  ('smoked-haddock-chowder-hob', 'Smoked haddock and sweetcorn chowder', 'British', ['butter-unsalted 25g', 'leek 1'], ['potato-medium 2', 'haddock-smoked 300g'], ['milk-whole 700ml'], ['sweetcorn-tinned 1'], False, ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('spiced-squash-lentil', 'Spiced squash and lentil soup', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2'], ['butternut-squash 1', 'lentils-red-dry 100g', 'garam-masala 2tsp'], ['stock-vegetable 1200ml'], [], True, ['coconut-yoghurt 100g'], 'Swirl in {coconut-yoghurt}.'),
  ('chicken-rice-soup', 'Lemon chicken and rice soup', 'Greek', ['olive-oil 1tbsp', 'onion-medium 1', 'carrot-medium 2'], ['chicken-breast-skinless 2', 'rice-basmati-dry 80g'], ['stock-chicken 1500ml'], [], False, ['lemon 2', 'fresh-dill 10g'], 'Squeeze in {lemon}. Scatter {fresh-dill}.'),
  ('kimchi-tofu', 'Kimchi and tofu soup', 'Korean', ['sesame-oil 1tbsp', 'garlic-clove 2'], ['kimchi 200g', 'gochujang 1tbsp', 'tofu-firm 1'], ['stock-vegetable 1000ml'], [], False, ['spring-onion 4'], 'Scatter with sliced {spring-onion}.'),
  ('hot-sour', 'Hot and sour mushroom soup', 'Chinese', ['ginger-fresh 1tbsp', 'chilli-fresh 1'], ['mushroom-chestnut 12', 'soy-sauce 3tbsp', 'rice-vinegar 3tbsp'], ['stock-vegetable 1200ml'], ['tofu-firm 1'], False, ['spring-onion 3'], 'Scatter with sliced {spring-onion}.'),
  ('pumpkin-coconut-hob', 'Pumpkin and coconut soup', 'Thai', ['vegetable-oil 1tbsp', 'onion-medium 1', 'thai-red-curry-paste 2tbsp'], ['pumpkin 800g'], ['stock-vegetable 700ml', 'coconut-milk-tinned 1'], [], True, ['lime 1'], 'Squeeze in {lime}.'),
  ('green-minestrone', 'Spring green minestrone', 'Italian', ['olive-oil 2tbsp', 'leek 1', 'celery-stick 2'], ['courgette 1', 'cannellini-beans-tinned 1'], ['stock-vegetable 1200ml'], ['penne-dry 60g', 'peas-frozen 100g', 'spinach 80g'], False, ['pesto 60g'], 'Swirl in {pesto}.'),
  ('beetroot-dill', 'Beetroot and dill soup', 'Eastern European', ['olive-oil 1tbsp', 'onion-medium 1'], ['beetroot-raw 4', 'potato-medium 1'], ['stock-vegetable 1200ml'], [], True, ['soured-cream 100ml', 'fresh-dill 10g'], 'Swirl in {soured-cream}. Scatter {fresh-dill}.'),
  ('cauliflower-cumin', 'Spiced cauliflower soup', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1'], ['cauliflower-head 1', 'cumin-ground 2tsp', 'turmeric-ground 1tsp'], ['stock-vegetable 1000ml', 'coconut-milk-tinned 1'], [], True, ['fresh-coriander 10g'], 'Scatter with {fresh-coriander}.'),
  ('mushroom-barley', 'Mushroom and barley broth', 'British', ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 2'], ['mushroom-chestnut 12', 'pearl-barley 100g'], ['stock-vegetable 1500ml'], [], False, ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('lentil-sausage', 'Sausage and lentil soup', 'Italian', ['sausage-pork 4', 'onion-medium 1'], ['lentils-green-dry 150g', 'chopped-tomatoes-tinned 1'], ['stock-chicken 1200ml'], ['spinach 100g'], False, ['parmesan 30g'], 'Top with grated {parmesan}.'),
  ('pea-ham-mint', 'Pea, ham and mint soup', 'British', ['butter-unsalted 20g', 'onion-medium 1'], ['peas-frozen 500g', 'fresh-mint 10g'], ['stock-chicken 900ml'], ['ham-slice 4'], True, ['creme-fraiche 60ml'], 'Swirl in {creme-fraiche}.'),
  ('chickpea-chorizo-soup', 'Chickpea, spinach and smoked paprika soup', 'Spanish', ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2'], ['chickpeas-tinned 2', 'smoked-paprika 2tsp', 'chopped-tomatoes-tinned 1'], ['stock-vegetable 800ml'], ['spinach 100g'], False, ['lemon 1'], 'Squeeze in {lemon}.'),
  ('sweet-potato-peanut', 'Sweet potato and peanut soup', 'West African', ['vegetable-oil 1tbsp', 'onion-medium 1', 'ginger-fresh 1tbsp'], ['sweet-potato 3', 'peanut-butter 3tbsp', 'chopped-tomatoes-tinned 1'], ['stock-vegetable 1000ml'], [], True, ['fresh-coriander 10g'], 'Scatter with {fresh-coriander}.'),
]
SOUPS2 = MORE_SOUPS
for key, name, cui, base, main, liquid, extra, blend, fin, fs in SOUPS2:
  ings, seen = [], set()
  for i in base + main + liquid + extra + fin:
    r = i.split()[0]
    if r not in seen:
      seen.add(r); ings.append(i)
  fats = [r for r in refs_of(base) if r in ('butter-unsalted', 'olive-oil', 'vegetable-oil', 'sesame-oil', 'chorizo', 'sausage-pork')]
  aroma = [r for r in refs_of(base) if r not in fats]
  steps = ['Put a large pan on a medium heat.', f'Add {join(fats)}.' if fats else 'Add a splash of water.',
           f'Chop {join(aroma)}. Fry 8 minutes, until soft.' if aroma else 'Warm 1 minute.',
           f'Add {join(refs_of(main))}, chopped as needed.',
           f'Add {join(refs_of(liquid))}. Simmer 20 minutes, until tender.']
  if extra:
    steps.append(f'Add {join(refs_of(extra))}. Simmer 8 minutes more.')
  if blend:
    steps.append('Blend until smooth.')
  steps.append(fs)
  b.R(f'soup-{key}', name, 'starter', ings, steps, serves=6, tier='budget', cuisine=cui, note='Keeps three days in the fridge and freezes well.')

MORE_PASTA = [
  ('crab-lemon', 'Crab, lemon and chilli spaghetti', 'Italian', ['olive-oil 3tbsp', 'garlic-clove 2', 'chilli-fresh 1', 'crab-white-meat 200g', 'lemon 1', 'fresh-parsley 10g'], 'Fry sliced {garlic-clove} and {chilli-fresh} in {olive-oil} 1 minute.', 'Stir in {crab-white-meat} and the zest and juice of {lemon}.', 'Toss the pasta through with {fresh-parsley}.'),
  ('vongole-style', 'Spaghetti with clams and white wine', 'Italian', ['olive-oil 3tbsp', 'garlic-clove 3', 'clams 40', 'wine-white 150ml', 'fresh-parsley 15g'], 'Fry sliced {garlic-clove} in {olive-oil} 1 minute.', 'Add {clams} and {wine-white}. Cover 4 minutes, until they open.', 'Toss the pasta through with {fresh-parsley}.'),
  ('pumpkin-sage', 'Pumpkin and sage pasta', 'Italian', ['butter-unsalted 40g', 'fresh-sage 8', 'pumpkin 400g', 'parmesan 40g'], 'Dice {pumpkin}. Add to the pasta water for the last 10 minutes.', 'Fry {fresh-sage} in {butter-unsalted} until crisp.', 'Toss the pasta and pumpkin in the sage butter. Top with {parmesan}.'),
  ('salmon-pea-cream', 'Hot-smoked salmon, pea and dill pasta', 'British', ['smoked-salmon 150g', 'peas-frozen 150g', 'creme-fraiche 200ml', 'fresh-dill 10g', 'lemon 1'], 'Add {peas-frozen} to the pasta for the last 3 minutes.', 'Warm {creme-fraiche} with the zest of {lemon}.', 'Toss the pasta with the sauce, torn {smoked-salmon} and {fresh-dill}.'),
  ('aubergine-tomato', 'Aubergine and tomato pasta (alla Norma)', 'Italian', ['olive-oil 4tbsp', 'aubergine 1', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'fresh-basil 10g', 'ricotta 100g'], 'Dice {aubergine}. Fry in {olive-oil} 10 minutes, until golden.', 'Add {garlic-clove} and {chopped-tomatoes-tinned}. Simmer 12 minutes.', 'Toss the pasta through. Top with {ricotta} and {fresh-basil}.'),
  ('chicken-mushroom-cream', 'Chicken and mushroom tagliatelle-style pasta', 'Italian', ['olive-oil 1tbsp', 'chicken-breast-skinless 2', 'mushroom-chestnut 10', 'garlic-clove 2', 'creme-fraiche 200ml', 'fresh-parsley 10g'], 'Slice {chicken-breast-skinless}. Fry in {olive-oil} 6 minutes.', 'Add {mushroom-chestnut} and {garlic-clove}. Fry 5 minutes. Stir in {creme-fraiche}.', 'Toss the pasta through. Scatter {fresh-parsley}.'),
  ('lentil-ragu-hob', 'Lentil and mushroom ragù', 'Italian', ['olive-oil 2tbsp', 'onion-medium 1', 'mushroom-chestnut 10', 'lentils-tinned 2', 'passata 500g', 'dried-oregano 1tsp'], 'Fry chopped {onion-medium} and {mushroom-chestnut} in {olive-oil} 8 minutes.', 'Add drained {lentils-tinned}, {passata} and {dried-oregano}. Simmer 20 minutes.', 'Toss the pasta through.'),
  ('prawn-tomato-cream', 'King prawn and tomato cream pasta', 'Italian', ['olive-oil 1tbsp', 'garlic-clove 2', 'passata 400g', 'king-prawns-raw 300g', 'double-cream 100ml', 'fresh-basil 10g'], 'Fry {garlic-clove} in {olive-oil} 1 minute. Add {passata}. Simmer 10 minutes.', 'Add {king-prawns-raw} and {double-cream}. Cook 3 minutes.', 'Toss the pasta through with {fresh-basil}.'),
  ('kale-walnut', 'Kale and walnut pesto pasta', 'Italian', ['kale 100g', 'walnuts 50g', 'garlic-clove 1', 'olive-oil 5tbsp', 'parmesan 40g', 'lemon 1'], 'Add {kale} to the pasta water for the last 2 minutes. Lift out.', 'Blend the kale with {walnuts}, {garlic-clove}, {olive-oil}, {parmesan} and {lemon} juice.', 'Toss the pasta through with a splash of water.'),
  ('tomato-mascarpone', 'Tomato and mascarpone pasta', 'Italian', ['olive-oil 2tbsp', 'garlic-clove 2', 'passata 500g', 'mascarpone 120g', 'fresh-basil 10g'], 'Fry {garlic-clove} in {olive-oil} 1 minute. Add {passata}. Simmer 10 minutes.', 'Stir in {mascarpone}.', 'Toss the pasta through. Tear over {fresh-basil}.'),
  ('chilli-broccoli', 'Purple sprouting-style broccoli and chilli pasta', 'Italian', ['broccoli-head 1', 'olive-oil 4tbsp', 'garlic-clove 3', 'chilli-flakes 1tsp', 'lemon 1', 'parmesan 30g'], 'Add {broccoli-head} florets to the pasta for the last 4 minutes.', 'Fry sliced {garlic-clove} and {chilli-flakes} in {olive-oil} 2 minutes.', 'Toss everything with {lemon} juice. Top with {parmesan}.'),
  ('chorizo-chickpea-pasta', 'Chorizo, chickpea and tomato pasta', 'Spanish', ['chorizo 100g', 'chickpeas-tinned 1', 'passata 400g', 'smoked-paprika 1tsp', 'fresh-parsley 10g'], 'Fry diced {chorizo} 4 minutes.', 'Add drained {chickpeas-tinned}, {passata} and {smoked-paprika}. Simmer 10 minutes.', 'Toss the pasta through. Scatter {fresh-parsley}.'),
]
for key, name, cui, extra, s1, s2, s3 in MORE_PASTA:
  ings = ['spaghetti-dry 400g'] + extra
  steps = ['Put a large pan of salted water on to boil.', 'Cook {spaghetti-dry} for the time on the packet. Keep a mug of the water.', '## Sauce', s1, s2, '## Together', s3]
  b.R(f'pasta-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

MORE_RISOTTO = [
  ('lemon-asparagus-hob', 'Lemon and herb risotto', ['lemon 1', 'fresh-parsley 15g', 'chives 10g'], ['parmesan 50g'], 'Add the zest of {lemon} with the rice. Stir in {fresh-parsley} and {chives} at the end.'),
  ('mushroom-thyme-hob', 'Chestnut mushroom and thyme risotto', ['mushroom-chestnut 16', 'fresh-thyme 4'], ['parmesan 50g'], 'Fry sliced {mushroom-chestnut} and {fresh-thyme} with the onion.'),
  ('squash-chilli', 'Squash, chilli and feta risotto', ['butternut-squash 1', 'chilli-fresh 1'], ['feta 100g'], 'Dice half of {butternut-squash}. Add with the rice and sliced {chilli-fresh}.'),
  ('pea-ham', 'Pea and ham risotto', ['peas-frozen 200g', 'ham-slice 6'], ['parmesan 40g'], 'Add {peas-frozen} and torn {ham-slice} for the last 4 minutes.'),
  ('smoked-haddock', 'Smoked haddock and leek risotto', ['leek 1', 'haddock-smoked 300g'], [], 'Fry sliced {leek} with the onion. Flake in {haddock-smoked} for the last 5 minutes.'),
  ('red-wine-radicchio', 'Red wine and radicchio risotto', ['radicchio 1', 'wine-red 150ml'], ['parmesan 50g'], 'Use {wine-red} as the first liquid. Stir in shredded {radicchio} for the last 3 minutes.'),
]
for key, name, flav, cheese, special in MORE_RISOTTO:
  ings = ['stock-vegetable 1200ml', 'butter-unsalted 30g', 'onion-medium 1', 'rice-arborio-dry 300g'] + flav + cheese
  cref = refs_of(cheese)
  steps = ['Warm {stock-vegetable} in a pan.', 'Melt {butter-unsalted} in a wide pan. Chop {onion-medium}. Fry 8 minutes, until soft.',
           'Add {rice-arborio-dry}. Stir 1 minute.', special, 'Add the stock a ladle at a time, stirring, about 18 minutes, until creamy.',
           f'Stir in {join(cref)}. Rest 2 minutes.' if cref else 'Rest 2 minutes off the heat.']
  b.R(f'risotto-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine='Italian')

SIDES = [
  ('mash-mustard', 'Mustard mash', ['potato-large 4', 'butter-unsalted 40g', 'milk-whole 100ml', 'wholegrain-mustard 1tbsp']),
  ('mash-garlic', 'Garlic and olive oil mash', ['potato-large 4', 'olive-oil 4tbsp', 'garlic-clove 3']),
  ('mash-cheddar-chive', 'Cheddar and chive mash', ['potato-large 4', 'butter-unsalted 30g', 'milk-whole 100ml', 'cheddar-cheese 80g', 'chives 10g']),
  ('mash-sweet-potato', 'Sweet potato and lime mash', ['sweet-potato 4', 'butter-unsalted 25g', 'lime 1']),
  ('mash-carrot-parsnip', 'Carrot and parsnip mash', ['carrot-large 3', 'parsnip 3', 'butter-unsalted 30g', 'nutmeg 0.25tsp']),
  ('mash-pea', 'Crushed minted peas', ['peas-frozen 500g', 'butter-unsalted 25g', 'fresh-mint 10g', 'lemon 1']),
  ('buttered-cabbage', 'Buttered cabbage with black pepper', ['cabbage-white 1', 'butter-unsalted 30g', 'black-pepper-ground 0.5tsp']),
  ('green-beans-almond', 'Green beans with garlic and almonds', ['green-beans 400g', 'olive-oil 2tbsp', 'garlic-clove 2', 'almonds 30g']),
  ('boiled-new-potatoes', 'New potatoes with parsley butter', ['new-potatoes 24', 'butter-unsalted 30g', 'fresh-parsley 10g']),
  ('glazed-carrots-cumin', 'Cumin-glazed carrots', ['carrot-medium 8', 'butter-unsalted 20g', 'cumin-ground 1tsp', 'honey 1tbsp']),
  ('rice-pilau-simple', 'Simple pilau rice', ['rice-basmati-dry 300g', 'butter-unsalted 20g', 'cardamom 4', 'turmeric-ground 0.5tsp', 'bay-leaf 1']),
  ('coconut-rice-side', 'Coconut rice', ['rice-jasmine-dry 300g', 'coconut-milk-tinned 1', 'salt 0.5tsp']),
  ('spiced-lentils-side', 'Spiced green lentils', ['lentils-green-dry 200g', 'olive-oil 2tbsp', 'cumin-ground 1tsp', 'lemon 1']),
  ('creamed-leeks', 'Creamed leeks', ['leek 4', 'butter-unsalted 25g', 'double-cream 100ml', 'nutmeg 0.25tsp']),
]
for key, name, ings in SIDES:
  refs = refs_of(ings)
  main = refs[0]
  rest = refs[1:]
  if main.startswith('rice-'):
    steps = [f'Rinse {t(main)} until the water runs clear.', f'Put in a pan with {join(rest)} and 500 ml water.' if main != 'rice-jasmine-dry' else f'Put in a pan with {join(rest)} and 200 ml water.',
             'Bring to the boil. Cover. Simmer on the lowest heat 12 minutes.', 'Leave covered off the heat 5 minutes. Fluff with a fork.']
  elif main.startswith('lentils'):
    steps = [f'Simmer {t(main)} in plenty of water 25 minutes, until tender. Drain.', f'Toss with {join(rest)}.']
  else:
    steps = [f'Peel and chop {t(main)} as needed.', 'Simmer in salted water until tender: 20 minutes for roots, 4 for greens.', 'Drain well.',
             f'Mash or toss with {join(rest)}.']
  b.R(f'side-{key}', name, 'side', ings, steps, serves=4, tier='budget', cuisine='British')

MORE_STEWS = [
  ('chilli-con-carne-hob', 'Chilli con carne', 'Mexican', ['olive-oil 1tbsp', 'onion-medium 1', 'beef-mince-5-fat 500g', 'garlic-clove 2', 'chilli-powder 2tsp', 'cumin-ground 1tsp', 'chopped-tomatoes-tinned 2', 'kidney-beans-tinned 1'],
   ['Fry chopped {onion-medium} in {olive-oil} 6 minutes.', 'Add {beef-mince-5-fat}. Fry 8 minutes, breaking it up.', 'Add {garlic-clove}, {chilli-powder} and {cumin-ground}. Fry 1 minute.', 'Add {chopped-tomatoes-tinned} and drained {kidney-beans-tinned}. Simmer 30 minutes.']),
  ('turkey-chilli', 'Turkey and sweet potato chilli', 'Mexican', ['olive-oil 1tbsp', 'onion-medium 1', 'turkey-mince 500g', 'sweet-potato 2', 'chilli-powder 2tsp', 'chopped-tomatoes-tinned 2', 'black-beans-tinned 1'],
   ['Fry chopped {onion-medium} in {olive-oil} 6 minutes.', 'Add {turkey-mince}. Fry 6 minutes.', 'Add diced {sweet-potato}, {chilli-powder}, {chopped-tomatoes-tinned} and drained {black-beans-tinned}.', 'Simmer 25 minutes, until the potato is soft.']),
  ('chickpea-spinach-stew', 'Chickpea, spinach and tomato stew', 'Spanish', ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'smoked-paprika 2tsp', 'chickpeas-tinned 2', 'chopped-tomatoes-tinned 1', 'spinach 200g'],
   ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.', 'Add {garlic-clove} and {smoked-paprika}. Fry 1 minute.', 'Add drained {chickpeas-tinned} and {chopped-tomatoes-tinned}. Simmer 15 minutes.', 'Stir in {spinach} until wilted.']),
  ('fish-stew-hob', 'Quick Mediterranean fish stew', 'Mediterranean', ['olive-oil 2tbsp', 'onion-medium 1', 'fennel-bulb 1', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'stock-vegetable 400ml', 'cod-fillet 2', 'king-prawns-raw 200g', 'fresh-parsley 10g'],
   ['Fry sliced {onion-medium} and {fennel-bulb} in {olive-oil} 8 minutes.', 'Add {garlic-clove}, {chopped-tomatoes-tinned} and {stock-vegetable}. Simmer 10 minutes.', 'Add {cod-fillet} in chunks and {king-prawns-raw}. Simmer 5 minutes.', 'Scatter with {fresh-parsley}.']),
  ('pork-paprika', 'Pork and paprika stew', 'Hungarian', ['olive-oil 1tbsp', 'pork-tenderloin 500g', 'onion-medium 1', 'pepper-bell 2', 'paprika 2tbsp', 'chopped-tomatoes-tinned 1', 'soured-cream 100ml'],
   ['Slice {pork-tenderloin}. Brown in {olive-oil} 4 minutes. Lift out.', 'Fry sliced {onion-medium} and {pepper-bell} 8 minutes.', 'Add {paprika} and {chopped-tomatoes-tinned}. Simmer 10 minutes.', 'Return the pork. Simmer 5 minutes. Stir in {soured-cream}.']),
  ('mushroom-bourguignon-hob', 'Quick mushroom bourguignon', 'French', ['olive-oil 2tbsp', 'shallot 8', 'mushroom-chestnut 20', 'garlic-clove 2', 'wine-red 250ml', 'stock-vegetable 200ml', 'fresh-thyme 4', 'tomato-purée 1tbsp'],
   ['Fry halved {shallot} in {olive-oil} 6 minutes.', 'Add {mushroom-chestnut} and {garlic-clove}. Fry 6 minutes.', 'Add {wine-red}, {stock-vegetable}, {fresh-thyme} and {tomato-purée}.', 'Simmer 20 minutes, until glossy.']),
  ('dal-makhani-style', 'Creamy black bean dal', 'Indian', ['butter-unsalted 30g', 'onion-medium 1', 'garlic-clove 3', 'ginger-fresh 1tbsp', 'garam-masala 2tsp', 'black-beans-tinned 2', 'passata 300g', 'double-cream 100ml'],
   ['Melt {butter-unsalted}. Fry chopped {onion-medium} 8 minutes.', 'Add {garlic-clove}, {ginger-fresh} and {garam-masala}. Fry 1 minute.', 'Add drained {black-beans-tinned} and {passata}. Simmer 25 minutes, mashing a few beans.', 'Stir in {double-cream}.']),
  ('spinach-dal', 'Spinach and coconut dal', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'curry-powder 2tsp', 'lentils-red-dry 250g', 'coconut-milk-tinned 1', 'spinach 150g', 'lime 1'],
   ['Fry chopped {onion-medium} in {vegetable-oil} 8 minutes.', 'Add {curry-powder}. Fry 1 minute.', 'Add {lentils-red-dry}, {coconut-milk-tinned} and 500 ml water. Simmer 25 minutes.', 'Stir in {spinach}. Squeeze in {lime}.']),
  ('chicken-chasseur', 'Chicken chasseur', 'French', ['olive-oil 1tbsp', 'chicken-thigh-boneless 8', 'shallot 4', 'mushroom-chestnut 10', 'wine-white 150ml', 'chopped-tomatoes-tinned 1', 'fresh-tarragon 10g'],
   ['Brown {chicken-thigh-boneless} in {olive-oil} 6 minutes. Lift out.', 'Fry {shallot} and sliced {mushroom-chestnut} 6 minutes.', 'Add {wine-white} and {chopped-tomatoes-tinned}. Return the chicken.', 'Simmer 25 minutes. Stir in {fresh-tarragon}.']),
  ('sweet-sour-tofu', 'Sweet and sour tofu with pineapple', 'Chinese', ['vegetable-oil 2tbsp', 'tofu-firm 1', 'pepper-bell 2', 'onion-medium 1', 'pineapple 1', 'tomato-ketchup 3tbsp', 'rice-vinegar 2tbsp', 'soy-sauce 2tbsp', 'cornflour 1tbsp'],
   ['Cube {tofu-firm}. Fry in {vegetable-oil} 6 minutes until golden. Lift out.', 'Fry chunks of {pepper-bell} and {onion-medium} 4 minutes.', 'Add chunks of a quarter of {pineapple}, {tomato-ketchup}, {rice-vinegar} and {soy-sauce} with 150 ml water.', 'Stir in {cornflour} mixed with water. Simmer 2 minutes, until glossy. Return the tofu.']),
]
for key, name, cui, ings, steps in MORE_STEWS:
  b.R(f'stew-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

MORE_PORRIDGE = [
  ('cinnamon-raisin', 'Cinnamon and raisin porridge', ['raisins 30g', 'cinnamon-ground 0.5tsp', 'honey 1tbsp'], 'Stir in {raisins} and {cinnamon-ground}. Drizzle with {honey}.'),
  ('blackberry-apple', 'Blackberry and apple porridge', ['blackberries 80g', 'apple-medium 1', 'maple-syrup 1tbsp'], 'Grate in {apple-medium}. Top with {blackberries} and {maple-syrup}.'),
  ('rhubarb', 'Rhubarb and ginger porridge', ['rhubarb 150g', 'sugar-caster 2tbsp', 'ginger-ground 0.25tsp'], 'Stew chopped {rhubarb} with {sugar-caster} and {ginger-ground} in a small pan 6 minutes. Spoon on top.'),
  ('savoury-egg', 'Savoury porridge with soy and egg', ['egg-medium 2', 'soy-sauce 1tbsp', 'spring-onion 2'], 'Poach {egg-medium} in simmering water 3 minutes. Top the porridge with eggs, {soy-sauce} and {spring-onion}.'),
]
for key, name, extra, fin in MORE_PORRIDGE:
  ings = ['oats-rolled 100g', 'milk-semi-skimmed 500ml'] + extra
  steps = ['Put {oats-rolled} and {milk-semi-skimmed} in a pan.', 'Bring to a simmer on a medium heat, stirring.', 'Simmer 5 minutes, stirring, until thick and creamy.', fin]
  b.R(f'porridge-{key}', name, 'breakfast', ings, steps, serves=2, tier='budget', slot='breakfast', cuisine='British')

# ---- Phase 44 (third batch) ----
NOODLES2 = [
  ('prawn-tom-yum', 'Prawn tom yum noodle soup', 'Thai', ['stock-vegetable 1200ml', 'lemongrass 2', 'lime-leaves 4', 'thai-red-curry-paste 1tbsp', 'fish-sauce 2tbsp', 'king-prawns-raw 300g', 'rice-noodles-dry 150g', 'mushroom-chestnut 6', 'lime 2', 'fresh-coriander 10g']),
  ('pork-ramen', 'Pork and greens ramen', 'Japanese', ['stock-chicken 1500ml', 'soy-sauce 3tbsp', 'ginger-fresh 1tbsp', 'garlic-clove 2', 'pork-tenderloin 300g', 'egg-noodles-dry 250g', 'pak-choi 2', 'spring-onion 4']),
  ('veg-udon-style', 'Vegetable noodle soup with miso', 'Japanese', ['stock-vegetable 1500ml', 'miso-paste 3tbsp', 'ginger-fresh 1tbsp', 'mushroom-chestnut 8', 'egg-noodles-dry 250g', 'spinach 100g', 'spring-onion 4']),
  ('chicken-laksa', 'Chicken laksa', 'Malaysian', ['vegetable-oil 1tbsp', 'thai-red-curry-paste 3tbsp', 'coconut-milk-tinned 1', 'stock-chicken 700ml', 'chicken-breast-skinless 2', 'rice-noodles-dry 200g', 'beansprouts 100g', 'lime 1']),
]
for key, name, cui, ings in NOODLES2:
  refs = refs_of(ings)
  broth = [r for r in refs if r in ('stock-chicken', 'stock-vegetable', 'soy-sauce', 'ginger-fresh', 'garlic-clove', 'miso-paste', 'thai-red-curry-paste', 'coconut-milk-tinned', 'fish-sauce', 'vegetable-oil', 'lemongrass', 'lime-leaves')]
  protein = [r for r in refs if r in ('chicken-breast-skinless', 'king-prawns-raw', 'pork-tenderloin', 'mushroom-chestnut')]
  noodle = [r for r in refs if 'noodles' in r][0]
  greens = [r for r in refs if r in ('pak-choi', 'beansprouts', 'spinach')]
  fin = [r for r in refs if r in ('spring-onion', 'lime', 'fresh-coriander')]
  steps = [f'Put {join(broth[:5])} in a large pan.']
  if broth[5:]:
    steps.append(f'Add {join(broth[5:])}.')
  steps += ['Simmer 15 minutes, until fragrant.', f'Slice {join(protein)} thinly. Add. Simmer 5 minutes, until cooked through.',
            f'Cook {t(noodle)} for the time on the packet. Divide between bowls.']
  if greens:
    steps.append(f'Add {join(greens)} to the broth 2 minutes. Ladle over the noodles.')
  steps.append(f'Finish with {join(fin)}.')
  b.R(f'noodle-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine=cui)

PUDS3 = [
  ('chocolate-custard', 'Chocolate custard', ['milk-whole 500ml', 'custard-powder 3tbsp', 'cocoa-powder 2tbsp', 'sugar-caster 3tbsp'], ['Mix {custard-powder}, {cocoa-powder} and {sugar-caster} with a little of {milk-whole} to a paste.', 'Heat the rest of the milk until steaming. Pour on, stirring.', 'Return to the pan. Stir 2 minutes, until thick.']),
  ('stewed-rhubarb-custard', 'Stewed rhubarb and custard', ['rhubarb 500g', 'sugar-caster 80g', 'custard-ready 500ml'], ['Chop {rhubarb}. Simmer with {sugar-caster} and 2 tbsp water 8 minutes.', 'Warm {custard-ready} in a pan.', 'Serve the rhubarb with the custard.']),
  ('cinnamon-apples-pan', 'Buttery cinnamon apples', ['apple-medium 4', 'butter-unsalted 30g', 'sugar-soft-brown 2tbsp', 'cinnamon-ground 1tsp', 'greek-yoghurt 200g'], ['Core and slice {apple-medium}.', 'Melt {butter-unsalted} with {sugar-soft-brown} and {cinnamon-ground}.', 'Add the apples. Cook 8 minutes, until soft and golden.', 'Serve with {greek-yoghurt}.']),
  ('poached-peaches', 'Peaches poached in vanilla syrup', ['peach 4', 'sugar-caster 100g', 'vanilla-extract 1tsp', 'water 500ml', 'creme-fraiche 150ml'], ['Simmer {sugar-caster}, {vanilla-extract} and {water} 3 minutes.', 'Halve and stone {peach}. Poach 6 minutes.', 'Slip off the skins. Serve with {creme-fraiche}.']),
  ('semolina-free-rice-choc', 'Chocolate rice pudding', ['rice-arborio-dry 100g', 'milk-whole 800ml', 'sugar-caster 50g', 'dark-chocolate 60g'], ['Simmer {rice-arborio-dry}, {milk-whole} and {sugar-caster} 30 minutes, stirring often.', 'Stir in {dark-chocolate} until melted.']),
  ('mulled-plums', 'Spiced plum compote', ['plums 10', 'sugar-caster 60g', 'cinnamon-stick 1', 'orange 1', 'natural-yoghurt 300g'], ['Halve and stone {plums}.', 'Simmer with {sugar-caster}, {cinnamon-stick} and the juice of {orange} 10 minutes.', 'Serve warm with {natural-yoghurt}.']),
  ('caramel-bananas', 'Caramel bananas', ['butter-unsalted 30g', 'sugar-soft-brown 40g', 'banana-medium 4', 'ice-cream-vanilla 4'], ['Melt {butter-unsalted} and {sugar-soft-brown} in a pan until bubbling.', 'Add sliced {banana-medium}. Cook 3 minutes, turning.', 'Serve with {ice-cream-vanilla}.']),
  ('berry-sauce-pancake-free', 'Warm cherry compote with yoghurt', ['cherries 400g', 'sugar-caster 50g', 'lemon 1', 'greek-yoghurt 300g'], ['Stone {cherries}.', 'Simmer with {sugar-caster} and the juice of {lemon} 8 minutes.', 'Spoon over {greek-yoghurt}.']),
]
for key, name, ings, steps in PUDS3:
  b.R(f'pud-{key}', name, 'pudding', ings, steps, serves=4, tier='budget', cuisine='British')

STEWS3 = [
  ('lentil-coconut-squash', 'Coconut, squash and lentil stew', 'Caribbean', ['vegetable-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'jerk-paste 1tbsp', 'butternut-squash 1', 'lentils-red-dry 150g', 'coconut-milk-tinned 1', 'stock-vegetable 500ml', 'lime 1']),
  ('white-bean-chorizo', 'White bean and chorizo stew', 'Spanish', ['chorizo 120g', 'onion-medium 1', 'garlic-clove 2', 'cannellini-beans-tinned 2', 'chopped-tomatoes-tinned 1', 'stock-chicken 300ml', 'spinach 100g']),
  ('prawn-coconut-stew', 'Brazilian-style prawn and coconut stew', 'Brazilian', ['olive-oil 2tbsp', 'onion-medium 1', 'pepper-bell 2', 'garlic-clove 2', 'chopped-tomatoes-tinned 1', 'coconut-milk-tinned 1', 'king-prawns-raw 400g', 'lime 1', 'fresh-coriander 10g']),
  ('ratatouille-hob', 'Quick hob ratatouille', 'French', ['olive-oil 4tbsp', 'onion-medium 1', 'aubergine 1', 'courgette 2', 'pepper-bell 2', 'chopped-tomatoes-tinned 1', 'fresh-basil 10g']),
  ('chicken-tagine-hob', 'Chicken, apricot and chickpea tagine', 'Middle Eastern', ['olive-oil 2tbsp', 'chicken-thigh-boneless 8', 'onion-medium 1', 'ras-el-hanout 2tbsp', 'chickpeas-tinned 1', 'dried-apricots 80g', 'chopped-tomatoes-tinned 1', 'stock-chicken 300ml']),
  ('beef-chilli-chocolate', 'Beef and black bean chilli with chocolate', 'Mexican', ['olive-oil 1tbsp', 'onion-medium 1', 'beef-mince-5-fat 500g', 'chilli-powder 2tsp', 'cumin-ground 1tsp', 'chopped-tomatoes-tinned 2', 'black-beans-tinned 1', 'dark-chocolate-70 20g']),
  ('kidney-bean-curry-veg', 'Sweet potato and kidney bean curry', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'curry-powder 2tbsp', 'sweet-potato 2', 'kidney-beans-tinned 1', 'chopped-tomatoes-tinned 1', 'coconut-milk-tinned 1', 'spinach 100g']),
  ('mushroom-chickpea-stroganoff', 'Mushroom and chickpea paprika stew', 'Eastern European', ['olive-oil 2tbsp', 'onion-medium 1', 'mushroom-chestnut 16', 'smoked-paprika 2tsp', 'chickpeas-tinned 1', 'stock-vegetable 300ml', 'soured-cream 150ml']),
]
for key, name, cui, ings in STEWS3:
  refs = refs_of(ings)
  fat = refs[0]
  aroma = [r for r in refs if r in ('onion-medium', 'garlic-clove', 'pepper-bell', 'aubergine', 'courgette', 'mushroom-chestnut')]
  spice = [r for r in refs if r in ('jerk-paste', 'smoked-paprika', 'ras-el-hanout', 'chilli-powder', 'cumin-ground', 'curry-powder')]
  meat = [r for r in refs if r in ('chicken-thigh-boneless', 'beef-mince-5-fat')]
  rest = [r for r in refs if r not in [fat] + aroma + spice + meat + ['lime', 'fresh-coriander', 'fresh-basil', 'spinach', 'soured-cream', 'dark-chocolate-70', 'king-prawns-raw']]
  late = [r for r in refs if r in ('spinach', 'soured-cream', 'dark-chocolate-70', 'king-prawns-raw')]
  fin = [r for r in refs if r in ('lime', 'fresh-coriander', 'fresh-basil')]
  steps = [f'Put a large pan on a medium heat. Add {t(fat)}.' + (' Fry 3 minutes.' if fat == 'chorizo' else '')]
  if meat:
    steps.append(f'Brown {join(meat)} 6 minutes, cut as needed.')
  steps.append(f'Add {join(aroma)}, chopped. Fry 8 minutes, until soft.')
  if spice:
    steps.append(f'Stir in {join(spice)} for 1 minute.')
  steps.append(f'Add {join(rest)}. Simmer 20 minutes, until thick.')
  if late:
    steps.append(f'Stir in {join(late)}. Cook 4 minutes more.')
  if fin:
    steps.append(f'Finish with {join(fin)}.')
  b.R(f'stew-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui)

# ---- Phase 44 (last few) ----
for key, name, ings in [
  ('mash-horseradish', 'Horseradish mash', ['potato-large 4', 'butter-unsalted 30g', 'milk-whole 100ml', 'horseradish-sauce 2tbsp']),
  ('mash-colcannon-kale', 'Kale and spring onion mash', ['potato-large 4', 'kale 100g', 'spring-onion 4', 'butter-unsalted 40g']),
  ('mash-celeriac-garlic', 'Celeriac and garlic purée', ['celeriac 700g', 'garlic-clove 3', 'butter-unsalted 30g', 'milk-whole 100ml']),
  ('broccoli-lemon', 'Broccoli with lemon and chilli', ['broccoli-head 2', 'olive-oil 2tbsp', 'lemon 1', 'chilli-flakes 0.25tsp']),
  ('sprouts-bacon-hob', 'Sprouts with bacon and chestnuts', ['brussels-sprouts 500g', 'bacon-rasher-back 4', 'chestnuts-cooked 180g', 'butter-unsalted 20g']),
  ('peas-bacon', 'Peas with bacon and shallots', ['peas-frozen 500g', 'bacon-rasher-back 3', 'shallot 2', 'butter-unsalted 20g']),
  ('spinach-garlic', 'Garlic spinach', ['spinach 400g', 'olive-oil 2tbsp', 'garlic-clove 2', 'nutmeg 0.25tsp']),
  ('corn-cobs-boiled', 'Buttered corn on the cob', ['corn-on-the-cob 4', 'butter-unsalted 30g', 'salt 0.5tsp']),
  ('cabbage-caraway-butter', 'Savoy-style cabbage with caraway butter', ['cabbage-white 1', 'butter-unsalted 30g', 'caraway-seeds 1tsp']),
  ('lemon-couscous-hob', 'Herby giant-style couscous', ['couscous-dry 250g', 'stock-vegetable 400ml', 'olive-oil 2tbsp', 'lemon 1', 'fresh-parsley 15g']),
  ('jasmine-rice-ginger', 'Ginger and spring onion rice', ['rice-jasmine-dry 300g', 'ginger-fresh 1tbsp', 'spring-onion 4', 'sesame-oil 1tsp']),
  ('beans-tomato-side', 'Butter beans in tomato and herbs', ['butter-beans-tinned 2', 'passata 300g', 'garlic-clove 2', 'fresh-parsley 10g']),
]:
  refs = refs_of(ings)
  main, rest = refs[0], refs[1:]
  if main.startswith('rice-') or main.startswith('couscous'):
    steps = [f'Put {t(main)} in a pan with {join(rest[:2])} and 450 ml water.' if main.startswith('rice') else f'Simmer {t(main)} in {t("stock-vegetable")} 8 minutes, until tender.',
             'Cover. Simmer on the lowest heat 12 minutes.' if main.startswith('rice') else f'Stir in {join(rest[1:])}.',
             'Rest 5 minutes off the heat. Fluff with a fork.' + (f' Stir in {t(rest[-1])}.' if main.startswith('rice') else '')]
  elif main == 'butter-beans-tinned':
    steps = ['Drain {butter-beans-tinned}.', 'Simmer with {passata} and crushed {garlic-clove} 10 minutes.', 'Stir in chopped {fresh-parsley}.']
  else:
    steps = [f'Prepare {t(main)}: peel, trim or chop as needed.', 'Simmer in salted water until tender: 20 minutes for roots, 4 for greens.', 'Drain well.',
             f'Mash or toss with {join(rest)}, fried or warmed as needed.']
  b.R(f'side-{key}', name, 'side', ings, steps, serves=4, tier='budget', cuisine='British')
