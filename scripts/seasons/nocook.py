# scripts/seasons/nocook.py — 27 Nov 2026 v1
# Phase 44. No cooking at all: salads, dips, smoothies, overnight oats,
# sandwiches and wraps, boards, cold puddings and cold drinks.
# Nothing here uses a hob, an oven, a grill or a kettle.
from build import Book
from gen import t, join, refs_of

b = Book('nocook', 'No cooking', 'nc')

DRESS = {
  'lemon': (['olive-oil 3tbsp', 'lemon 1'], 'Whisk {olive-oil} with the juice of {lemon}.'),
  'balsamic': (['olive-oil 3tbsp', 'balsamic-vinegar 1tbsp'], 'Whisk {olive-oil} with {balsamic-vinegar}.'),
  'mustard': (['olive-oil 3tbsp', 'white-wine-vinegar 1tbsp', 'mustard-dijon 1tsp'], 'Whisk {olive-oil}, {white-wine-vinegar} and {mustard-dijon}.'),
  'lime-chilli': (['lime 2', 'sweet-chilli-sauce 2tbsp', 'fish-sauce 1tbsp'], 'Mix the juice of {lime} with {sweet-chilli-sauce} and {fish-sauce}.'),
  'lime-veg': (['lime 2', 'sweet-chilli-sauce 2tbsp', 'soy-sauce 1tbsp'], 'Mix the juice of {lime} with {sweet-chilli-sauce} and {soy-sauce}.'),
  'tahini': (['tahini 3tbsp', 'lemon 1'], 'Whisk {tahini} with the juice of {lemon} and cold water to a pouring cream.'),
  'yoghurt': (['natural-yoghurt 150g', 'fresh-mint 10g', 'lemon 1'], 'Stir chopped {fresh-mint} and {lemon} juice into {natural-yoghurt}.'),
  'sesame': (['soy-sauce 2tbsp', 'sesame-oil 1tbsp', 'rice-vinegar 1tbsp'], 'Whisk {soy-sauce}, {sesame-oil} and {rice-vinegar}.'),
}

SALADS = [
  ('greek', 'Greek salad', 'Greek', 'starter', ['tomato-medium 4', 'cucumber 1', 'red-onion 1', 'olives-pitted 60g', 'feta 200g', 'dried-oregano 1tsp'], 'lemon'),
  ('caprese', 'Tomato and mozzarella salad', 'Italian', 'starter', ['tomato-medium 4', 'mozzarella 2', 'fresh-basil 10g'], 'balsamic'),
  ('nicoise-nocook', 'Tuna, bean and tomato salad', 'French', 'main', ['tuna-tinned-in-spring-water 2', 'cannellini-beans-tinned 1', 'cherry-tomato 16', 'red-onion 1', 'cos-lettuce 150g'], 'mustard'),
  ('chickpea-herb', 'Chickpea, cucumber and herb salad', 'Middle Eastern', 'main', ['chickpeas-tinned 2', 'cucumber 1', 'cherry-tomato 16', 'fresh-parsley 20g', 'fresh-mint 10g', 'red-onion 1'], 'lemon'),
  ('thai-slaw', 'Thai crunchy slaw', 'Thai', 'side', ['red-cabbage 250g', 'carrot-medium 2', 'pepper-bell 1', 'spring-onion 4', 'fresh-coriander 10g', 'peanuts 40g'], 'lime-veg'),
  ('prawn-mango', 'King prawn, mango and avocado salad', 'Thai', 'starter', ['prawns-cooked 250g', 'mango 1', 'avocado 1', 'cos-lettuce 100g', 'fresh-coriander 10g'], 'lime-chilli'),
  ('crab-fennel', 'Crab, fennel and apple salad', 'British', 'starter', ['crab-white-meat 200g', 'fennel-bulb 1', 'apple-medium 1', 'watercress 50g'], 'lemon'),
  ('smoked-salmon-salad', 'Smoked salmon, cucumber and dill salad', 'British', 'starter', ['smoked-salmon 200g', 'cucumber 1', 'fresh-dill 10g', 'watercress 50g', 'capers 1tbsp'], 'lemon'),
  ('mackerel-beet', 'Smoked mackerel, beetroot and apple salad', 'British', 'main', ['smoked-mackerel 200g', 'beetroot 3', 'apple-medium 1', 'watercress 60g', 'horseradish-sauce 1tbsp'], 'mustard'),
  ('chicken-caesar-style', 'Chicken and cos salad with parmesan', 'American', 'main', ['chicken-breast-roast 300g', 'cos-lettuce 200g', 'parmesan 40g', 'mayonnaise 3tbsp', 'garlic-clove 1', 'lemon 1'], None),
  ('coronation-chicken-salad', 'Coronation chicken salad', 'British', 'main', ['chicken-breast-roast 300g', 'mayonnaise 3tbsp', 'natural-yoghurt 100g', 'curry-powder 2tsp', 'sultanas 40g', 'mango 1', 'cos-lettuce 150g'], None),
  ('ham-pea', 'Ham, pea shoot and pea salad', 'British', 'starter', ['ham-slice 6', 'peas-frozen 150g', 'watercress 60g', 'spring-onion 3'], 'mustard'),
  ('beetroot-goats', 'Beetroot, goats cheese and walnut salad', 'British', 'starter', ['beetroot 4', 'goats-cheese 120g', 'walnuts 50g', 'rocket 60g'], 'balsamic'),
  ('pear-rocket', 'Pear, rocket and parmesan salad', 'Italian', 'starter', ['pear 2', 'rocket 80g', 'parmesan 40g', 'walnuts 30g'], 'balsamic'),
  ('watermelon-cucumber-mint', 'Watermelon, cucumber and feta salad', 'Greek', 'starter', ['watermelon 600g', 'cucumber 1', 'feta 150g', 'fresh-mint 10g'], 'lemon'),
  ('orange-red-onion', 'Orange, red onion and olive salad', 'Spanish', 'side', ['orange 4', 'red-onion 1', 'olives-pitted 60g', 'fresh-parsley 10g'], 'balsamic'),
  ('carrot-orange-salad', 'Carrot, orange and cumin salad', 'Middle Eastern', 'side', ['carrot-large 4', 'orange 1', 'cumin-ground 1tsp', 'fresh-coriander 10g', 'raisins 30g'], 'lemon'),
  ('cucumber-sesame', 'Smashed cucumber with sesame', 'Chinese', 'side', ['cucumber 2', 'garlic-clove 1', 'chilli-flakes 0.5tsp', 'sesame-seeds 1tbsp'], 'sesame'),
  ('tomato-bread', 'Tomato and bread salad', 'Italian', 'main', ['tomato-medium 6', 'sourdough 4', 'cucumber 1', 'red-onion 1', 'fresh-basil 15g', 'capers 1tbsp'], 'balsamic'),
  ('avocado-tomato', 'Avocado, tomato and lime salad', 'Mexican', 'side', ['avocado 2', 'cherry-tomato 16', 'red-onion 1', 'fresh-coriander 10g', 'lime 1'], None),
  ('black-bean-corn-salad', 'Black bean, corn and pepper salad', 'Mexican', 'main', ['black-beans-tinned 2', 'sweetcorn-tinned 1', 'pepper-bell 1', 'red-onion 1', 'fresh-coriander 10g', 'avocado 1'], 'lime-veg'),
  ('fennel-orange', 'Fennel, orange and mint salad', 'Italian', 'side', ['fennel-bulb 2', 'orange 2', 'fresh-mint 10g', 'olives-pitted 40g'], 'lemon'),
  ('lentil-feta', 'Lentil, roast pepper and feta salad', 'Greek', 'main', ['lentils-tinned 2', 'pepper-bell 2', 'feta 150g', 'red-onion 1', 'fresh-parsley 15g'], 'mustard'),
  ('bean-tuna', 'White bean and tuna salad', 'Italian', 'main', ['cannellini-beans-tinned 2', 'tuna-tinned-in-spring-water 2', 'red-onion 1', 'fresh-parsley 15g'], 'lemon'),
  ('kale-apple', 'Kale, apple and seed salad', 'American', 'side', ['kale 150g', 'apple-medium 2', 'sunflower-seeds 3tbsp', 'dried-cranberries 40g'], 'mustard'),
  ('mango-chilli', 'Mango, chilli and lime salad', 'Thai', 'side', ['mango 2', 'chilli-fresh 1', 'fresh-mint 10g', 'red-onion 1'], 'lime-veg'),
  ('chicken-noodle-free', 'Shredded chicken and cabbage salad', 'Vietnamese', 'main', ['chicken-breast-roast 300g', 'cabbage-white 1', 'carrot-medium 2', 'fresh-mint 10g', 'fresh-coriander 10g', 'peanuts 40g'], 'lime-chilli'),
  ('tofu-sesame-salad', 'Sesame tofu and edamame salad', 'Japanese', 'main', ['tofu-silken 300g', 'edamame-frozen 150g', 'cucumber 1', 'spring-onion 3', 'sesame-seeds 1tbsp'], 'sesame'),
  ('burrata-tomato', 'Burrata, tomato and basil salad', 'Italian', 'starter', ['burrata 2', 'cherry-tomato 20', 'fresh-basil 10g'], 'balsamic'),
  ('prosciutto-fig', 'Prosciutto, fig and rocket salad', 'Italian', 'starter', ['prosciutto 8', 'figs-fresh 6', 'rocket 60g', 'mozzarella 1'], 'balsamic'),
  ('radish-pea', 'Radish, pea and mint salad', 'British', 'side', ['radish 16', 'peas-frozen 150g', 'fresh-mint 10g', 'spring-onion 3'], 'yoghurt'),
  ('chickpea-coronation', 'Coronation chickpea salad', 'British', 'main', ['chickpeas-tinned 2', 'natural-yoghurt 150g', 'curry-powder 2tsp', 'mango 1', 'spring-onion 3', 'cos-lettuce 100g'], None),
  ('waldorf', 'Waldorf salad', 'American', 'side', ['apple-medium 2', 'celery-stick 3', 'walnuts 50g', 'grapes 150g', 'mayonnaise 3tbsp', 'lemon 1'], None),
  ('tabbouleh-nocook', 'Cucumber, tomato and herb fattoush-style salad', 'Middle Eastern', 'side', ['tomato-medium 4', 'cucumber 1', 'radish 8', 'fresh-parsley 20g', 'fresh-mint 10g', 'sumac 1tsp', 'pitta-bread 2'], 'lemon'),
  ('panzanella-peach', 'Peach, mozzarella and mint salad', 'Italian', 'starter', ['peach 3', 'mozzarella 1', 'fresh-mint 10g', 'rocket 50g'], 'lemon'),
  ('egg-bean', 'Egg, bean and potato salad', 'British', 'main', ['eggs-boiled 4', 'cannellini-beans-tinned 1', 'cherry-tomato 12', 'cos-lettuce 100g', 'chives 10g'], 'mustard'),
]
for key, name, cui, course, ings, dk in SALADS:
  refs = refs_of(ings)
  di, ds = DRESS[dk] if dk else ([], '')
  all_i = list(ings)
  for d in di:
    if d.split()[0] not in refs:
      all_i.append(d)
  dref = refs_of(di)
  main = [r for r in refs if r not in dref]
  steps = [f'Slice, chop or tear {join(main[:3])} as needed.']
  if main[3:]:
    steps.append(f'Add {join(main[3:])}.')
  if ds:
    steps.append(ds)
    steps.append('Toss gently as you serve.')
  else:
    steps.append('Stir everything together gently.')
  if 'peas-frozen' in refs:
    steps.insert(0, 'Defrost {peas-frozen} in a sieve under cold running water.')
  if 'edamame-frozen' in refs:
    steps.insert(0, 'Defrost {edamame-frozen} in a sieve under cold running water.')
  b.R(f'salad-{key}', name, course, all_i, steps, serves=4, tier='budget', cuisine=cui)

DIPS = [
  ('hummus-classic', 'Classic hummus', 'Middle Eastern', ['chickpeas-tinned 1', 'tahini 3tbsp', 'lemon 1', 'garlic-clove 1', 'olive-oil 3tbsp', 'carrot-medium 3']),
  ('beetroot-dip', 'Beetroot and walnut dip', 'Middle Eastern', ['beetroot 3', 'walnuts 50g', 'greek-yoghurt 150g', 'garlic-clove 1', 'breadsticks 12']),
  ('tzatziki-dip', 'Tzatziki', 'Greek', ['cucumber 1', 'greek-yoghurt 300g', 'garlic-clove 1', 'fresh-mint 10g', 'pitta-bread 4']),
  ('guacamole-dip', 'Chunky guacamole', 'Mexican', ['avocado 3', 'lime 2', 'red-onion 1', 'chilli-fresh 1', 'fresh-coriander 10g', 'tortilla-chips 150g']),
  ('salsa-fresca', 'Fresh tomato salsa', 'Mexican', ['tomato-medium 4', 'red-onion 1', 'chilli-fresh 1', 'lime 1', 'fresh-coriander 10g', 'tortilla-chips 150g']),
  ('white-bean-dip', 'White bean and rosemary dip', 'Italian', ['cannellini-beans-tinned 1', 'lemon 1', 'garlic-clove 1', 'fresh-rosemary 1', 'olive-oil 4tbsp', 'breadsticks 12']),
  ('feta-whip', 'Whipped feta with honey', 'Greek', ['feta 200g', 'greek-yoghurt 100g', 'honey 1tbsp', 'olive-oil 2tbsp', 'cucumber 1']),
  ('pea-mint-dip', 'Pea, mint and feta dip', 'British', ['peas-frozen 300g', 'feta 100g', 'fresh-mint 10g', 'lemon 1', 'olive-oil 2tbsp', 'radish 12']),
  ('smoked-mackerel-dip', 'Smoked mackerel dip', 'British', ['smoked-mackerel 150g', 'cream-cheese 150g', 'lemon 1', 'horseradish-sauce 1tbsp', 'oatcakes 12']),
  ('red-pepper-dip', 'Red pepper and walnut dip', 'Middle Eastern', ['pepper-bell 2', 'walnuts 80g', 'pomegranate-molasses 1tbsp', 'cumin-ground 1tsp', 'olive-oil 3tbsp', 'breadsticks 12']),
  ('edamame-dip', 'Edamame and lime dip', 'Japanese', ['edamame-frozen 250g', 'lime 1', 'garlic-clove 1', 'olive-oil 3tbsp', 'carrot-medium 3']),
  ('herb-yoghurt-dip', 'Garlic and herb yoghurt dip', 'British', ['greek-yoghurt 300g', 'garlic-clove 1', 'chives 10g', 'fresh-parsley 10g', 'celery-stick 4']),
]
for key, name, cui, ings in DIPS:
  refs = refs_of(ings)
  dippers = refs[-1]
  inside = refs[:-1]
  steps = []
  if 'peas-frozen' in inside or 'edamame-frozen' in inside:
    f = 'peas-frozen' if 'peas-frozen' in inside else 'edamame-frozen'
    steps.append(f'Defrost {t(f)} in a sieve under cold running water.')
  steps += [f'Put {join(inside[:4])} in a blender.']
  if inside[4:]:
    steps.append(f'Add {join(inside[4:])}.')
  steps += ['Blend until smooth, or leave some texture.' if key not in ('guacamole-dip', 'salsa-fresca', 'tzatziki-dip') else 'Pulse to a chunky mix, or chop by hand.',
            f'Spoon into a bowl. Serve with {t(dippers)} cut for dipping.']
  b.R(f'dip-{key}', name, 'starter', ings, steps, serves=6, tier='budget', cuisine=cui)

SMOOTHIES = [
  ('strawberry-banana', 'Strawberry and banana smoothie', ['strawberries 200g', 'banana-medium 1', 'milk-semi-skimmed 300ml']),
  ('mango-lassi', 'Mango lassi', ['mango 1', 'natural-yoghurt 250g', 'milk-semi-skimmed 150ml', 'cardamom 2']),
  ('green', 'Green smoothie', ['spinach 50g', 'banana-medium 1', 'apple-medium 1', 'apple-juice 250ml']),
  ('berry-oat', 'Berry and oat smoothie', ['blueberries 100g', 'raspberries 100g', 'oats-rolled 30g', 'oat-milk 300ml']),
  ('peanut-banana', 'Peanut butter and banana smoothie', ['banana-medium 2', 'peanut-butter 2tbsp', 'milk-semi-skimmed 300ml']),
  ('tropical', 'Tropical smoothie', ['pineapple 1', 'mango 1', 'orange-juice 300ml']),
  ('chocolate-banana-shake', 'Chocolate banana shake', ['banana-medium 2', 'cocoa-powder 2tbsp', 'milk-whole 400ml', 'honey 1tbsp']),
  ('kiwi-apple', 'Kiwi, apple and lime smoothie', ['kiwi 3', 'apple-medium 1', 'lime 1', 'apple-juice 250ml']),
  ('raspberry-coconut', 'Raspberry and coconut smoothie', ['raspberries 200g', 'banana-medium 1', 'coconut-yoghurt 150g', 'oat-milk 200ml']),
  ('date-almond', 'Date and almond shake', ['dates-pitted 6', 'almond-milk 400ml', 'banana-medium 1', 'cinnamon-ground 0.25tsp']),
  ('cherry-vanilla', 'Cherry and vanilla smoothie', ['cherries 200g', 'greek-yoghurt 150g', 'milk-semi-skimmed 200ml', 'vanilla-extract 0.5tsp']),
  ('orange-carrot', 'Orange, carrot and ginger juice', ['orange 3', 'carrot-medium 2', 'ginger-fresh 1tsp', 'apple-juice 200ml']),
  ('blueberry-yoghurt', 'Blueberry yoghurt smoothie', ['blueberries 200g', 'natural-yoghurt 200g', 'honey 1tbsp', 'milk-semi-skimmed 150ml']),
  ('coffee-banana', 'Coffee and banana breakfast shake', ['banana-medium 1', 'coffee-instant 1tsp', 'milk-semi-skimmed 300ml', 'oats-rolled 20g']),
  ('pear-ginger', 'Pear and ginger smoothie', ['pear 2', 'ginger-fresh 1tsp', 'natural-yoghurt 150g', 'apple-juice 150ml']),
  ('watermelon-strawberry', 'Watermelon and strawberry cooler', ['watermelon 500g', 'strawberries 150g', 'lime 1']),
]
for key, name, ings in SMOOTHIES:
  refs = refs_of(ings)
  steps = [f'Prepare {join(refs[:2])}: peel, hull or chop as needed.',
           f'Put in a blender with {join(refs[2:])}.' if refs[2:] else 'Put in a blender.',
           'Add a handful of ice. Blend until smooth.',
           'Pour into glasses.']
  b.R(f'smoothie-{key}', name, 'drink', ings, steps, serves=2, tier='budget', cuisine='Drinks')

OATS = [
  ('berry', 'Berry overnight oats', ['raspberries 80g', 'blueberries 60g', 'honey 1tbsp']),
  ('apple-cinnamon', 'Apple and cinnamon overnight oats', ['apple-medium 1', 'cinnamon-ground 0.5tsp', 'maple-syrup 1tbsp']),
  ('chocolate-banana', 'Chocolate and banana overnight oats', ['banana-medium 1', 'cocoa-powder 1tbsp', 'maple-syrup 1tbsp']),
  ('mango-coconut', 'Mango and coconut overnight oats', ['mango 1', 'desiccated-coconut 2tbsp', 'lime 1']),
  ('peanut-jam', 'Peanut butter and jam overnight oats', ['peanut-butter 1tbsp', 'jam-strawberry 1tbsp']),
  ('pear-ginger', 'Pear and ginger overnight oats', ['pear 1', 'ginger-ground 0.5tsp', 'honey 1tbsp']),
  ('carrot-cake', 'Carrot cake overnight oats', ['carrot-medium 1', 'sultanas 20g', 'mixed-spice 0.5tsp', 'walnuts 20g']),
  ('cherry-almond', 'Cherry and almond overnight oats', ['cherries 100g', 'almonds 20g', 'almond-milk 50ml']),
]
for key, name, extra in OATS:
  ings = ['oats-rolled 80g', 'chia-seeds 1tbsp', 'milk-semi-skimmed 200ml', 'natural-yoghurt 100g'] + extra
  steps = ['Mix {oats-rolled}, {chia-seeds}, {milk-semi-skimmed} and {natural-yoghurt} in two jars.',
           'Cover. Chill overnight.',
           f'In the morning, top with {join(refs_of(extra))}, chopped or grated as needed.']
  b.R(f'oats-{key}', name, 'breakfast', ings, steps, serves=2, tier='budget', slot='breakfast', cuisine='British')

PUDS = [
  ('raspberry-fool', 'Raspberry fool', ['raspberries 300g', 'icing-sugar 3tbsp', 'double-cream 300ml'], ['Crush {raspberries} with {icing-sugar}.', 'Whip {double-cream} to soft peaks.', 'Ripple the fruit through. Spoon into glasses.']),
  ('mango-fool', 'Mango and lime fool', ['mango 2', 'lime 1', 'double-cream 200ml', 'greek-yoghurt 200g'], ['Blend {mango} with the juice of {lime}.', 'Whip {double-cream}. Fold in {greek-yoghurt}.', 'Ripple the mango through. Chill 30 minutes.']),
  ('quick-trifle', 'Quick berry trifle', ['sponge-fingers 12', 'orange-juice 100ml', 'raspberries 200g', 'custard-ready 500ml', 'double-cream 200ml'], ['Break {sponge-fingers} into a bowl. Pour over {orange-juice}.', 'Add {raspberries}. Pour over {custard-ready}.', 'Whip {double-cream}. Spread on top. Chill 1 hour.']),
  ('tiramisu', 'Tiramisu', ['coffee-instant 2tbsp', 'sponge-fingers 18', 'mascarpone 250g', 'double-cream 200ml', 'icing-sugar 3tbsp', 'cocoa-powder 1tbsp'], ['Stir {coffee-instant} into 250 ml cold water until dissolved.', 'Dip {sponge-fingers} in the coffee. Lay half in a dish.', 'Whip {mascarpone}, {double-cream} and {icing-sugar} until thick.', 'Layer the cream and the rest of the fingers.', 'Dust with {cocoa-powder}. Chill 4 hours.']),
  ('chia-coconut', 'Coconut chia pudding with mango', ['chia-seeds 4tbsp', 'coconut-milk-tinned 1', 'maple-syrup 2tbsp', 'mango 1'], ['Stir {chia-seeds} and {maple-syrup} into {coconut-milk-tinned}.', 'Chill 4 hours, until thick.', 'Top with diced {mango}.']),
  ('yoghurt-honey-pots', 'Greek yoghurt pots with honey and pistachios', ['greek-yoghurt 400g', 'honey 3tbsp', 'pistachios 40g', 'raspberries 100g'], ['Spoon {greek-yoghurt} into 4 glasses.', 'Drizzle with {honey}.', 'Top with chopped {pistachios} and {raspberries}.']),
  ('banana-split', 'Banana splits', ['banana-medium 4', 'ice-cream-vanilla 8', 'strawberries 100g', 'chocolate-spread 60g', 'sprinkles 2tbsp'], ['Split {banana-medium} lengthways.', 'Add scoops of {ice-cream-vanilla} and sliced {strawberries}.', 'Spoon over {chocolate-spread}. Shower with {sprinkles}.']),
  ('fruit-salad-mint', 'Fruit salad with mint and lime', ['pineapple 1', 'mango 1', 'kiwi 3', 'strawberries 200g', 'lime 1', 'fresh-mint 10g'], ['Peel and chop half of {pineapple}, {mango} and {kiwi}.', 'Halve {strawberries}.', 'Toss with the juice of {lime} and torn {fresh-mint}.']),
  ('eton-mess-raspberry', 'Raspberry and passion fruit mess', ['meringue-nests 6', 'double-cream 300ml', 'raspberries 200g', 'passion-fruit 3'], ['Whip {double-cream} to soft peaks.', 'Break in {meringue-nests}.', 'Fold in {raspberries}. Spoon over {passion-fruit} seeds.']),
  ('lemon-cheesecake-pots', 'Lemon cheesecake pots', ['digestive-biscuit 8', 'cream-cheese 300g', 'double-cream 150ml', 'icing-sugar 60g', 'lemon 2'], ['Crush {digestive-biscuit}. Divide between 6 glasses.', 'Beat {cream-cheese}, {double-cream}, {icing-sugar} and the zest and juice of {lemon} until thick.', 'Spoon over. Chill 1 hour.']),
  ('strawberry-cheesecake-pots', 'Strawberry cheesecake pots', ['digestive-biscuit 8', 'cream-cheese 300g', 'icing-sugar 60g', 'vanilla-extract 1tsp', 'strawberries 250g'], ['Crush {digestive-biscuit} into 6 glasses.', 'Beat {cream-cheese}, {icing-sugar} and {vanilla-extract}.', 'Spoon over. Top with sliced {strawberries}.']),
  ('chocolate-avocado-mousse', 'Chocolate avocado mousse', ['avocado 2', 'cocoa-powder 4tbsp', 'maple-syrup 4tbsp', 'oat-milk 4tbsp', 'raspberries 100g'], ['Blend {avocado}, {cocoa-powder}, {maple-syrup} and {oat-milk} until silky.', 'Spoon into 4 glasses. Chill 1 hour.', 'Top with {raspberries}.']),
  ('berries-cream', 'Summer berries with vanilla cream', ['strawberries 200g', 'raspberries 150g', 'blueberries 100g', 'double-cream 200ml', 'vanilla-extract 1tsp', 'icing-sugar 2tbsp'], ['Halve {strawberries}. Mix with {raspberries} and {blueberries}.', 'Whip {double-cream} with {vanilla-extract} and {icing-sugar}.', 'Serve the berries with the cream.']),
  ('affogato-free', 'Iced coffee sundae', ['coffee-instant 2tsp', 'ice-cream-vanilla 8', 'dark-chocolate 30g'], ['Stir {coffee-instant} into 100 ml cold water.', 'Put scoops of {ice-cream-vanilla} in 4 glasses.', 'Pour over the coffee. Grate over {dark-chocolate}.']),
  ('vegan-mango-mousse', 'Mango and coconut mousse', ['mango 2', 'coconut-yoghurt 300g', 'lime 1', 'desiccated-coconut 2tbsp'], ['Blend {mango} with the juice of {lime}.', 'Fold through {coconut-yoghurt}.', 'Spoon into glasses. Top with {desiccated-coconut}.']),
  ('orange-salad-pud', 'Oranges with pomegranate and orange blossom', ['orange 4', 'pomegranate-seeds 60g', 'orange-blossom-water 1tsp', 'pistachios 30g'], ['Cut the peel and pith off {orange}. Slice into rounds.', 'Scatter {pomegranate-seeds} and chopped {pistachios}.', 'Sprinkle with {orange-blossom-water}.']),
]
for key, name, ings, steps in PUDS:
  b.R(f'pud-{key}', name, 'pudding', ings, steps, serves=4, tier='budget', cuisine='British')

SANDWICHES = [
  ('egg-cress', 'Egg mayonnaise and cress sandwiches', ['eggs-boiled 4', 'mayonnaise 3tbsp', 'watercress 30g', 'bread-slice-medium 8']),
  ('ham-mustard', 'Ham and mustard sandwiches', ['ham-slice 8', 'mustard-dijon 2tsp', 'cos-lettuce 60g', 'bread-slice-medium 8', 'butter-unsalted 20g']),
  ('cheese-pickle', 'Cheese and pickle sandwiches', ['cheddar-cheese 150g', 'brown-sauce 60g', 'tomato-medium 2', 'bread-slice-medium 8']),
  ('tuna-sweetcorn-sw', 'Tuna and sweetcorn sandwiches', ['tuna-tinned-in-spring-water 2', 'sweetcorn-tinned 1', 'mayonnaise 3tbsp', 'bread-slice-medium 8']),
  ('chicken-avocado-sw', 'Chicken, avocado and lime wraps', ['chicken-breast-roast 250g', 'avocado 1', 'lime 1', 'cos-lettuce 60g', 'tortilla-wrap 4']),
  ('hummus-veg-wrap', 'Hummus and crunchy vegetable wraps', ['hummus 200g', 'carrot-medium 2', 'cucumber 1', 'pepper-bell 1', 'tortilla-wrap 4']),
  ('smoked-salmon-bagel', 'Smoked salmon and cream cheese bagels', ['bagel-plain 4', 'cream-cheese 150g', 'smoked-salmon 150g', 'lemon 1', 'fresh-dill 5g']),
  ('blt-nocook', 'Ham, lettuce and tomato sandwiches', ['ham-slice 6', 'cos-lettuce 60g', 'tomato-medium 2', 'mayonnaise 2tbsp', 'bread-slice-medium 8']),
  ('prawn-mayo-sw', 'Prawn mayonnaise sandwiches', ['prawns-cooked 200g', 'mayonnaise 3tbsp', 'lemon 1', 'cos-lettuce 60g', 'bread-slice-medium 8']),
  ('coronation-chicken-sw', 'Coronation chicken sandwiches', ['chicken-breast-roast 250g', 'mayonnaise 3tbsp', 'curry-powder 1tsp', 'sultanas 30g', 'bread-slice-medium 8']),
  ('falafel-wrap', 'Falafel and tahini wraps', ['falafel 12', 'tahini 3tbsp', 'lemon 1', 'cucumber 1', 'tomato-medium 2', 'tortilla-wrap 4']),
  ('mozzarella-tomato-ciabatta', 'Mozzarella, tomato and pesto rolls', ['bread-roll-white 4', 'mozzarella 2', 'tomato-medium 2', 'pesto 60g', 'rocket 30g']),
  ('chickpea-smash', 'Smashed chickpea and lemon sandwiches', ['chickpeas-tinned 1', 'mayonnaise 2tbsp', 'lemon 1', 'spring-onion 2', 'bread-slice-medium 8']),
  ('brie-cranberry', 'Brie and cranberry sandwiches', ['brie 150g', 'cranberry-sauce 4tbsp', 'rocket 30g', 'bread-slice-medium 8']),
  ('peanut-banana-sw', 'Peanut butter and banana sandwiches', ['peanut-butter 4tbsp', 'banana-medium 2', 'honey 1tbsp', 'wholemeal-bread-slice 8']),
  ('ploughmans-wrap', "Ploughman's wraps", ['cheddar-cheese 150g', 'apple-medium 1', 'brown-sauce 45g', 'cos-lettuce 60g', 'tortilla-wrap 4']),
  ('tofu-satay-wrap', 'Silken tofu and satay rainbow wraps', ['tofu-silken 200g', 'peanut-butter 3tbsp', 'soy-sauce 1tbsp', 'red-cabbage 100g', 'carrot-medium 2', 'tortilla-wrap 4']),
  ('mackerel-pitta', 'Smoked mackerel and beetroot pittas', ['smoked-mackerel 150g', 'beetroot 2', 'creme-fraiche 80ml', 'watercress 40g', 'pitta-bread 4']),
]
for key, name, ings in SANDWICHES:
  refs = refs_of(ings)
  bread = refs[-1]
  fill = refs[:-1]
  steps = [f'Mix, slice or mash {join(fill[:3])} as needed.']
  if fill[3:]:
    steps.append(f'Add {join(fill[3:])}.')
  steps.append(f'Fill {t(bread)}.')
  steps.append('Cut in half to serve, or wrap tightly to take out.')
  b.R(f'sw-{key}', name, 'lunch', ings, steps, serves=4, tier='budget', slot='lunch', cuisine='British')

BOARDS = [
  ('antipasti', 'Antipasti board', 'Italian', ['prosciutto 8', 'salami 12', 'mozzarella 1', 'olives-pitted 80g', 'sun-dried-tomatoes 60g', 'breadsticks 12']),
  ('ploughmans', "Ploughman's lunch", 'British', ['cheddar-cheese 200g', 'ham-slice 6', 'apple-medium 2', 'pickled-onions 8', 'brown-sauce 60g', 'sourdough 4']),
  ('mezze', 'Mezze board', 'Middle Eastern', ['hummus 200g', 'falafel 12', 'olives-pitted 80g', 'cucumber 1', 'tomato-medium 2', 'pitta-bread 4']),
  ('cheese-board', 'Cheese board', 'British', ['cheddar-cheese 150g', 'brie 150g', 'stilton 100g', 'grapes 200g', 'oatcakes 12']),
  ('crudites', 'Crudités with three dips', 'French', ['carrot-medium 3', 'cucumber 1', 'pepper-bell 2', 'radish 12', 'hummus 150g', 'tzatziki 150g']),
  ('vegan-mezze', 'Vegan mezze board', 'Middle Eastern', ['hummus 200g', 'falafel 12', 'olives-pitted 80g', 'carrot-medium 2', 'cherry-tomato 12', 'pitta-bread 4']),
]
for key, name, cui, ings in BOARDS:
  ings = [i for i in ings if not i.startswith('chutney')]
  refs = refs_of(ings)
  steps = [f'Slice or quarter {join([r for r in refs if r in ("mozzarella", "apple-medium", "cucumber", "tomato-medium", "carrot-medium", "pepper-bell", "radish", "cheddar-cheese", "brie", "stilton", "cherry-tomato")])} as needed.',
           f'Arrange everything on a large board: {join([r for r in refs if r not in ("mozzarella", "apple-medium", "cucumber", "tomato-medium", "carrot-medium", "pepper-bell", "radish", "cheddar-cheese", "brie", "stilton", "cherry-tomato")])}.',
           'Serve at room temperature. || Take cheese out of the fridge an hour before.']
  b.R(f'board-{key}', name, 'starter', ings, steps, serves=4, tier='everyday', cuisine=cui)

DRINKS = [
  ('cold-lemonade', 'Shake-up lemonade', ['lemon 4', 'sugar-caster 80g', 'sparkling-water 2'], 'Shake the juice of {lemon} with {sugar-caster} in a jar until dissolved. Pour over ice. Top up with {sparkling-water}.'),
  ('iced-coffee', 'Iced latte', ['coffee-instant 2tsp', 'milk-semi-skimmed 400ml', 'maple-syrup 1tbsp'], 'Stir {coffee-instant} into 4 tbsp cold water. Pour over ice with {milk-semi-skimmed} and {maple-syrup}.'),
  ('virgin-mary', 'Virgin Mary', ['passata 400g', 'lemon 1', 'worcestershire-sauce 1tsp', 'celery-stick 2'], 'Stir {passata} with the juice of {lemon}, {worcestershire-sauce} and 100 ml cold water. Pour over ice with {celery-stick}.'),
  ('cucumber-mint-water', 'Cucumber, lime and mint water', ['cucumber 1', 'lime 1', 'fresh-mint 10g', 'sparkling-water 2'], 'Slice {cucumber} and {lime}. Add to a jug with {fresh-mint} and ice. Top up with {sparkling-water}.'),
  ('apple-ginger-fizz', 'Apple and ginger fizz', ['apple-juice 500ml', 'ginger-ale 500ml', 'lime 1'], 'Mix {apple-juice} and {ginger-ale} over ice. Squeeze in {lime}.'),
  ('cranberry-spritz-soft', 'Cranberry and orange spritz', ['cranberry-juice 400ml', 'orange-juice 200ml', 'sparkling-water 1'], 'Mix {cranberry-juice} and {orange-juice} over ice. Top up with {sparkling-water}.'),
  ('gin-tonic', 'Gin and tonic with cucumber', ['spirit-40 100ml', 'tonic-water 600ml', 'cucumber 1'], 'Fill 4 glasses with ice and ribbons of {cucumber}. Add {spirit-40}. Top up with {tonic-water}.'),
  ('aperol-style-spritz', 'Bitter orange spritz', ['bitter-aperitivo 150ml', 'sparkling-wine 450ml', 'sparkling-water 1', 'orange 1'], 'Fill 6 glasses with ice. Add {bitter-aperitivo}, then {sparkling-wine}. Splash in {sparkling-water}. Add a slice of {orange}.'),
  ('vermouth-tonic', 'White port-style vermouth and tonic', ['vermouth 200ml', 'tonic-water 600ml', 'lemon 1'], 'Pour {vermouth} over ice. Top up with {tonic-water}. Add a slice of {lemon}.'),
  ('rum-punch-cold', 'Cold rum and pineapple punch', ['spirit-40 150ml', 'pineapple 1', 'orange-juice 400ml', 'lime 2'], 'Blend half of {pineapple}. Mix with {orange-juice}, {spirit-40} and the juice of {lime}. Serve over ice.'),
  ('white-wine-spritzer', 'White wine spritzer', ['wine-white 500ml', 'sparkling-water 1', 'lemon 1'], 'Half fill glasses with {wine-white} over ice. Top up with {sparkling-water}. Add a slice of {lemon}.'),
  ('shandy', 'Ginger shandy', ['beer-lager 2', 'ginger-beer 500ml', 'lime 1'], 'Pour {beer-lager} and {ginger-beer} half and half. Squeeze in {lime}.'),
]
for key, name, ings, step in DRINKS:
  b.R(f'drink-{key}', name, 'drink', ings, [step], serves=4, tier='budget', cuisine='Drinks',
      note='The spirit is gin or rum as named.' if 'spirit-40' in refs_of(ings) else None)

# ---- Phase 44 (second batch) ----
SALADS2 = [
  ('tuna-cannellini-red', 'Tuna, red onion and caper salad', 'Italian', 'main', ['tuna-tinned-in-spring-water 2', 'red-onion 1', 'capers 1tbsp', 'rocket 80g', 'cherry-tomato 12'], 'lemon'),
  ('chicken-mango-slaw', 'Chicken, mango and lime slaw', 'Thai', 'main', ['chicken-breast-roast 300g', 'mango 1', 'red-cabbage 200g', 'fresh-mint 10g', 'peanuts 40g'], 'lime-chilli'),
  ('apple-celery-stilton', 'Apple, celery and Stilton salad', 'British', 'starter', ['apple-medium 2', 'celery-stick 3', 'stilton 100g', 'walnuts 40g', 'watercress 50g'], 'mustard'),
  ('greek-chickpea', 'Greek chickpea salad', 'Greek', 'main', ['chickpeas-tinned 2', 'cucumber 1', 'tomato-medium 3', 'feta 150g', 'olives-pitted 50g', 'red-onion 1'], 'lemon'),
  ('carrot-tahini', 'Grated carrot and tahini salad', 'Middle Eastern', 'side', ['carrot-large 4', 'sesame-seeds 1tbsp', 'fresh-parsley 10g', 'raisins 30g'], 'tahini'),
  ('cabbage-apple-slaw', 'Red cabbage and apple slaw', 'British', 'side', ['red-cabbage 300g', 'apple-medium 2', 'spring-onion 3'], 'mustard'),
  ('bean-sprout-sesame', 'Beansprout and cucumber salad', 'Chinese', 'side', ['beansprouts 200g', 'cucumber 1', 'spring-onion 3', 'sesame-seeds 1tbsp'], 'sesame'),
  ('prawn-avocado-cos', 'Prawn and avocado cocktail salad', 'British', 'starter', ['prawns-cooked 250g', 'avocado 2', 'cos-lettuce 100g', 'mayonnaise 3tbsp', 'tomato-ketchup 1tbsp', 'lemon 1'], None),
  ('smoked-trout-free', 'Smoked salmon and new potato-free herb salad', 'British', 'starter', ['smoked-salmon 150g', 'watercress 60g', 'radish 8', 'fresh-dill 10g'], 'mustard'),
  ('feta-watermelon-olive', 'Tomato, peach and feta salad', 'Greek', 'starter', ['tomato-medium 3', 'peach 2', 'feta 120g', 'fresh-basil 10g'], 'balsamic'),
  ('mozzarella-melon', 'Melon, mozzarella and mint salad', 'Italian', 'starter', ['watermelon 400g', 'mozzarella 1', 'fresh-mint 10g', 'rocket 40g'], 'lemon'),
  ('mixed-bean', 'Three-bean salad', 'American', 'side', ['kidney-beans-tinned 1', 'cannellini-beans-tinned 1', 'chickpeas-tinned 1', 'red-onion 1', 'fresh-parsley 15g'], 'mustard'),
  ('cucumber-dill-yoghurt', 'Cucumber and dill salad', 'Eastern European', 'side', ['cucumber 2', 'fresh-dill 10g', 'red-onion 1'], 'yoghurt'),
  ('tomato-red-onion-sumac', 'Tomato, red onion and sumac salad', 'Middle Eastern', 'side', ['tomato-medium 6', 'red-onion 1', 'sumac 1tsp', 'fresh-parsley 10g'], 'lemon'),
  ('kale-caesar-style', 'Kale salad with parmesan and lemon', 'American', 'side', ['kale 150g', 'parmesan 40g', 'garlic-clove 1', 'sunflower-seeds 2tbsp'], 'lemon'),
  ('avocado-grapefruit', 'Avocado and grapefruit salad', 'American', 'starter', ['avocado 2', 'grapefruit 1', 'rocket 60g', 'pumpkin-seeds 2tbsp'], 'lemon'),
  ('peach-prosciutto', 'Peach, prosciutto and rocket salad', 'Italian', 'starter', ['peach 3', 'prosciutto 8', 'rocket 60g', 'mozzarella 1'], 'balsamic'),
  ('lentil-beet-goats', 'Lentil, beetroot and goats cheese salad', 'French', 'main', ['lentils-tinned 1', 'beetroot 3', 'goats-cheese 100g', 'rocket 50g', 'walnuts 30g'], 'mustard'),
  ('tofu-mango-slaw', 'Silken tofu, mango and herb salad', 'Vietnamese', 'main', ['tofu-silken 300g', 'mango 1', 'cucumber 1', 'fresh-mint 10g', 'fresh-coriander 10g', 'peanuts 30g'], 'lime-veg'),
  ('ham-apple-chicory', 'Ham, apple and chicory salad', 'French', 'starter', ['ham-slice 6', 'apple-medium 1', 'chicory 2', 'walnuts 30g'], 'mustard'),
  ('egg-cos-anchovy', 'Egg, cos and anchovy salad', 'French', 'starter', ['eggs-boiled 4', 'cos-lettuce 150g', 'anchovy-fillet 6', 'capers 1tbsp'], 'mustard'),
  ('quinoa-free-herb-bean', 'Edamame, pea and herb salad', 'Japanese', 'side', ['edamame-frozen 200g', 'peas-frozen 150g', 'fresh-mint 10g', 'spring-onion 3'], 'sesame'),
]
for key, name, cui, course, ings, dk in SALADS2:
  name = name.replace('new potato-free ', '')
  refs = refs_of(ings)
  di, ds = DRESS[dk] if dk else ([], '')
  all_i = list(ings) + [d for d in di if d.split()[0] not in refs]
  main = [r for r in refs if r not in refs_of(di)]
  steps = []
  for f in ('peas-frozen', 'edamame-frozen'):
    if f in refs:
      steps.append(f'Defrost {t(f)} in a sieve under cold running water.')
  steps.append(f'Slice, chop or tear {join(main[:3])} as needed.')
  if main[3:]:
    steps.append(f'Add {join(main[3:])}.')
  steps += [ds, 'Toss gently as you serve.'] if ds else ['Stir everything together gently.']
  b.R(f'salad-{key}', name, course, all_i, steps, serves=4, tier='budget', cuisine=cui)

SANDWICHES2 = [
  ('turkey-cranberry', 'Turkey, brie and cranberry wraps', ['turkey-crown 200g', 'brie 100g', 'cranberry-sauce 3tbsp', 'rocket 30g', 'tortilla-wrap 4']),
  ('chicken-pesto-roll', 'Chicken, pesto and tomato rolls', ['chicken-breast-roast 250g', 'pesto 60g', 'tomato-medium 2', 'rocket 30g', 'bread-roll-white 4']),
  ('avocado-chickpea-wrap', 'Avocado and chickpea wraps', ['avocado 2', 'chickpeas-tinned 1', 'lime 1', 'cos-lettuce 60g', 'tortilla-wrap 4']),
  ('cheese-apple', 'Cheddar and apple sandwiches', ['cheddar-cheese 150g', 'apple-medium 1', 'brown-sauce 45g', 'bread-slice-medium 8']),
  ('salmon-cucumber', 'Smoked salmon and cucumber sandwiches', ['smoked-salmon 150g', 'cucumber 1', 'cream-cheese 100g', 'wholemeal-bread-slice 8']),
  ('egg-bacon-free', 'Egg and watercress rolls', ['eggs-boiled 4', 'mayonnaise 3tbsp', 'watercress 40g', 'bread-roll-brown 4']),
  ('hummus-falafel-pitta', 'Falafel and hummus pittas', ['falafel 12', 'hummus 150g', 'cucumber 1', 'tomato-medium 2', 'pitta-bread 4']),
  ('ham-cheese-pickle', 'Ham, cheese and pickle rolls', ['ham-slice 6', 'cheddar-cheese 100g', 'brown-sauce 45g', 'bread-roll-white 4']),
  ('tuna-cucumber', 'Tuna and cucumber sandwiches', ['tuna-tinned-in-spring-water 2', 'mayonnaise 3tbsp', 'cucumber 1', 'bread-slice-medium 8']),
  ('mozzarella-pesto-wrap', 'Mozzarella, pesto and spinach wraps', ['mozzarella 2', 'pesto 60g', 'spinach 50g', 'tomato-medium 2', 'tortilla-wrap 4']),
  ('prawn-avocado-wrap', 'Prawn and avocado wraps', ['prawns-cooked 200g', 'avocado 1', 'mayonnaise 2tbsp', 'lime 1', 'tortilla-wrap 4']),
  ('cream-cheese-cucumber', 'Cream cheese and cucumber sandwiches', ['cream-cheese 150g', 'cucumber 1', 'fresh-dill 5g', 'bread-slice-medium 8']),
  ('banana-honey-bagel', 'Banana and honey bagels', ['bagel-plain 4', 'peanut-butter 4tbsp', 'banana-medium 2', 'honey 1tbsp']),
  ('pastrami-free-beef', 'Roast beef and horseradish sandwiches', ['beef-topside 200g', 'horseradish-sauce 2tbsp', 'rocket 30g', 'bread-slice-medium 8']),
]
for key, name, ings in SANDWICHES2:
  refs = refs_of(ings)
  bread, fill = refs[-1], refs[:-1]
  steps = [f'Mix, slice or mash {join(fill[:3])} as needed.']
  if fill[3:]:
    steps.append(f'Add {join(fill[3:])}.')
  steps += [f'Fill {t(bread)}.', 'Cut in half to serve, or wrap tightly to take out.']
  note = 'Use leftover cooked beef or turkey.' if key in ('turkey-cranberry', 'pastrami-free-beef') else None
  b.R(f'sw-{key}', name, 'lunch', ings, steps, serves=4, tier='budget', slot='lunch', cuisine='British', note=note)

SMOOTHIES2 = [
  ('peach-melba', 'Peach and raspberry smoothie', ['peach 2', 'raspberries 100g', 'natural-yoghurt 150g', 'milk-semi-skimmed 150ml']),
  ('pineapple-coconut', 'Pineapple and coconut smoothie', ['pineapple 1', 'banana-medium 1', 'coconut-yoghurt 150g', 'oat-milk 200ml']),
  ('spinach-mango', 'Spinach and mango smoothie', ['spinach 50g', 'mango 1', 'orange-juice 250ml']),
  ('blackberry-apple-sm', 'Blackberry and apple smoothie', ['blackberries 150g', 'apple-medium 1', 'apple-juice 250ml']),
  ('oat-date-shake', 'Oat, date and cinnamon shake', ['oats-rolled 30g', 'dates-pitted 4', 'milk-semi-skimmed 400ml', 'cinnamon-ground 0.25tsp']),
  ('strawberry-oat', 'Strawberry and oat breakfast smoothie', ['strawberries 200g', 'oats-rolled 30g', 'natural-yoghurt 150g', 'milk-semi-skimmed 200ml']),
  ('mango-passion', 'Mango and passion fruit smoothie', ['mango 1', 'passion-fruit 2', 'orange-juice 250ml']),
  ('cherry-chocolate', 'Cherry and chocolate shake', ['cherries 150g', 'cocoa-powder 1tbsp', 'milk-whole 350ml', 'honey 1tbsp']),
  ('kiwi-spinach', 'Kiwi, spinach and banana smoothie', ['kiwi 2', 'spinach 40g', 'banana-medium 1', 'apple-juice 250ml']),
  ('vegan-berry-banana', 'Berry and banana oat milk smoothie', ['blueberries 100g', 'strawberries 100g', 'banana-medium 1', 'oat-milk 300ml']),
]
for key, name, ings in SMOOTHIES2:
  refs = refs_of(ings)
  steps = [f'Prepare {join(refs[:2])}: peel, hull or chop as needed.', f'Put in a blender with {join(refs[2:])}.', 'Add a handful of ice. Blend until smooth.', 'Pour into glasses.']
  b.R(f'smoothie-{key}', name, 'drink', ings, steps, serves=2, tier='budget', cuisine='Drinks')

DRINKS2 = [
  ('virgin-mojito-nc', 'Lime and mint crush', ['lime 3', 'fresh-mint 15g', 'sugar-caster 3tbsp', 'sparkling-water 1'], 'Crush {lime} wedges with {fresh-mint} and {sugar-caster} in a jug. Add crushed ice. Top up with {sparkling-water}.'),
  ('pink-grapefruit-soda', 'Pink grapefruit soda', ['grapefruit 2', 'sugar-caster 2tbsp', 'sparkling-water 2'], 'Stir the juice of {grapefruit} with {sugar-caster} until dissolved. Pour over ice. Top up with {sparkling-water}.'),
  ('cold-brew-tea', 'Cold brew peach iced tea', ['tea-bags 4', 'water 1000ml', 'peach 2', 'honey 2tbsp'], 'Put {tea-bags} in {water} with sliced {peach} and {honey}. Chill overnight. Take out the bags.'),
  ('elderflower-cucumber', 'Elderflower and cucumber cooler', ['elderflower-cordial 60ml', 'cucumber 1', 'sparkling-water 2'], 'Ribbon {cucumber} into a jug with ice. Add {elderflower-cordial}. Top up with {sparkling-water}.'),
  ('orange-ginger-soda', 'Orange and ginger soda', ['orange-juice 400ml', 'ginger-beer 500ml', 'lime 1'], 'Mix {orange-juice} and {ginger-beer} over ice. Squeeze in {lime}.'),
  ('pomegranate-spritz-soft', 'Pomegranate and lime spritz', ['pomegranate-juice 300ml', 'lime 1', 'sparkling-water 2'], 'Pour {pomegranate-juice} over ice. Squeeze in {lime}. Top up with {sparkling-water}.'),
  ('frozen-lemonade', 'Frozen lemonade slush', ['lemon 3', 'sugar-caster 80g', 'water 300ml'], 'Blend the juice of {lemon}, {sugar-caster}, {water} and 2 handfuls of ice until slushy.'),
  ('rose-lemonade-spritz', 'Rosé lemonade spritz', ['wine-rose 500ml', 'lemonade 330ml', 'strawberries 100g'], 'Pour {wine-rose} over ice. Top up with {lemonade}. Add sliced {strawberries}.'),
  ('gin-elderflower', 'Gin, elderflower and cucumber', ['spirit-40 100ml', 'elderflower-cordial 40ml', 'cucumber 1', 'tonic-water 500ml'], 'Fill glasses with ice and {cucumber} ribbons. Add {spirit-40} and {elderflower-cordial}. Top up with {tonic-water}.'),
  ('cider-cooler', 'Cider and apple cooler', ['cider-dry 500ml', 'apple-juice 200ml', 'fresh-mint 5g'], 'Mix {cider-dry} and {apple-juice} over ice. Add {fresh-mint}.'),
  ('cuba-libre', 'Rum, cola and lime', ['spirit-40 100ml', 'cola 2', 'lime 2'], 'Fill glasses with ice. Add {spirit-40}. Top up with {cola}. Squeeze in {lime}.'),
  ('bellini-nocook', 'Raspberry sparkling wine', ['raspberries 100g', 'sparkling-wine 750ml'], 'Crush {raspberries}. Spoon into glasses. Top up slowly with {sparkling-wine}.'),
]
for key, name, ings, step in DRINKS2:
  b.R(f'drink-{key}', name, 'drink', ings, [step], serves=4, tier='budget', cuisine='Drinks',
      note='The spirit is gin or rum as named.' if 'spirit-40' in refs_of(ings) else None)

PUDS2 = [
  ('lemon-yoghurt-pots', 'Lemon curd yoghurt pots', ['greek-yoghurt 400g', 'lemon 1', 'honey 2tbsp', 'ginger-nut-biscuits 6'], ['Stir the zest and juice of {lemon} and {honey} into {greek-yoghurt}.', 'Spoon into glasses.', 'Crumble over {ginger-nut-biscuits}.']),
  ('chocolate-orange-pots-nc', 'Chocolate orange cream pots', ['double-cream 300ml', 'cocoa-powder 3tbsp', 'icing-sugar 3tbsp', 'orange 1'], ['Whip {double-cream} with {cocoa-powder}, {icing-sugar} and the zest of {orange}.', 'Spoon into glasses. Chill 30 minutes.']),
  ('strawberry-shortcake-free', 'Strawberries and cream with shortbread', ['strawberries 400g', 'double-cream 200ml', 'shortbread 8', 'icing-sugar 1tbsp'], ['Hull and halve {strawberries}.', 'Whip {double-cream} with {icing-sugar}.', 'Layer with crumbled {shortbread} in glasses.']),
  ('banoffee-pots', 'Banoffee pots', ['digestive-biscuit 8', 'dulce-de-leche 200g', 'banana-medium 2', 'double-cream 200ml', 'cocoa-powder 1tsp'], ['Crush {digestive-biscuit} into 4 glasses.', 'Spoon over {dulce-de-leche}. Add sliced {banana-medium}.', 'Top with whipped {double-cream}. Dust with {cocoa-powder}.']),
  ('pineapple-coconut-pud', 'Pineapple with coconut and lime', ['pineapple 1', 'coconut-yoghurt 300g', 'lime 1', 'desiccated-coconut 2tbsp'], ['Peel and slice {pineapple}.', 'Squeeze over {lime}.', 'Serve with {coconut-yoghurt}. Scatter {desiccated-coconut}.']),
  ('berry-chia', 'Berry chia jam pots', ['raspberries 200g', 'chia-seeds 2tbsp', 'maple-syrup 2tbsp', 'coconut-yoghurt 300g'], ['Crush {raspberries}. Stir in {chia-seeds} and {maple-syrup}. Leave 30 minutes to thicken.', 'Layer with {coconut-yoghurt} in glasses.']),
  ('cherry-yoghurt', 'Cherries with almond yoghurt', ['cherries 300g', 'greek-yoghurt 300g', 'honey 2tbsp', 'almonds 30g'], ['Stone and halve {cherries}.', 'Swirl {honey} through {greek-yoghurt}.', 'Top with the cherries and chopped {almonds}.']),
  ('mango-lime-sorbet-free', 'Mango and lime frozen yoghurt', ['mango 2', 'greek-yoghurt 300g', 'honey 2tbsp', 'lime 1'], ['Blend {mango}, {greek-yoghurt}, {honey} and the juice of {lime}.', 'Freeze in a shallow box 3 hours, forking every hour.']),
  ('cranachan', 'Cranachan', ['raspberries 250g', 'double-cream 300ml', 'honey 2tbsp', 'oats-rolled 40g', 'spirit-40 2tbsp'], ['Whip {double-cream} with {honey} and {spirit-40}.', 'Fold in {oats-rolled}.', 'Layer with {raspberries} in glasses.']),
  ('eton-mess-mango', 'Mango and passion fruit mess', ['meringue-nests 6', 'double-cream 300ml', 'mango 1', 'passion-fruit 3'], ['Whip {double-cream} to soft peaks.', 'Break in {meringue-nests}. Fold in diced {mango}.', 'Spoon over {passion-fruit} seeds.']),
]
for key, name, ings, steps in PUDS2:
  note = 'The spirit is whisky. Leave it out for children.' if 'spirit-40' in refs_of(ings) else None
  b.R(f'pud-{key}', name, 'pudding', ings, steps, serves=4, tier='budget', cuisine='British', note=note)

# ---- Phase 44 (third batch) ----
for key, name, ings, step in [
  ('strawberry-lemonade', 'Strawberry lemonade', ['strawberries 200g', 'lemon 3', 'sugar-caster 80g', 'sparkling-water 2'], 'Crush {strawberries} with {sugar-caster} and the juice of {lemon}. Sieve into a jug. Top up with {sparkling-water} and ice.'),
  ('mint-cucumber-lemonade', 'Cucumber and mint lemonade', ['cucumber 1', 'fresh-mint 10g', 'lemon 2', 'sugar-caster 60g', 'sparkling-water 2'], 'Blend {cucumber}, {fresh-mint}, the juice of {lemon} and {sugar-caster}. Sieve. Top up with {sparkling-water}.'),
  ('iced-mocha', 'Iced mocha', ['coffee-instant 2tsp', 'cocoa-powder 1tbsp', 'milk-semi-skimmed 400ml', 'maple-syrup 2tbsp'], 'Stir {coffee-instant} and {cocoa-powder} into 4 tbsp cold milk from {milk-semi-skimmed}. Add the rest with {maple-syrup}. Pour over ice.'),
  ('pineapple-ginger', 'Pineapple and ginger cooler', ['pineapple 1', 'ginger-fresh 1tsp', 'lime 1', 'sparkling-water 1'], 'Blend half of {pineapple} with {ginger-fresh} and the juice of {lime}. Sieve. Top up with {sparkling-water}.'),
  ('gin-grapefruit', 'Gin and pink grapefruit', ['spirit-40 100ml', 'grapefruit 1', 'tonic-water 500ml'], 'Fill glasses with ice and slices of {grapefruit}. Add {spirit-40}. Top up with {tonic-water}.'),
  ('sangria-blanca', 'White sangria', ['wine-white 750ml', 'apple-medium 1', 'orange 1', 'lemonade 330ml'], 'Slice {apple-medium} and {orange} into a jug. Add {wine-white}. Chill 1 hour. Top up with {lemonade} and ice.'),
]:
  b.R(f'drink-{key}', name, 'drink', ings, [step], serves=4, tier='budget', cuisine='Drinks', note='The spirit is gin.' if 'spirit-40' in refs_of(ings) else None)
for key, name, cui, course, ings, dk in [
  ('nectarine-burrata', 'Peach, burrata and basil salad', 'Italian', 'starter', ['peach 3', 'burrata 1', 'fresh-basil 10g'], 'balsamic'),
  ('crab-avocado-salad', 'Crab, avocado and grapefruit salad', 'American', 'starter', ['crab-white-meat 150g', 'avocado 1', 'grapefruit 1', 'rocket 40g'], 'lemon'),
  ('tuna-mango-salad', 'Tuna, mango and chilli salad', 'Thai', 'main', ['tuna-tinned-in-spring-water 2', 'mango 1', 'cucumber 1', 'fresh-coriander 10g'], 'lime-chilli'),
  ('apple-fennel-salad', 'Apple, fennel and walnut salad', 'British', 'side', ['apple-medium 2', 'fennel-bulb 1', 'walnuts 40g'], 'mustard'),
  ('carrot-raisin', 'Carrot, raisin and orange salad', 'British', 'side', ['carrot-large 4', 'raisins 40g', 'orange 1', 'sunflower-seeds 2tbsp'], 'lemon'),
  ('red-pepper-feta', 'Roasted-pepper-free red pepper, feta and olive salad', 'Greek', 'side', ['pepper-bell 3', 'feta 120g', 'olives-pitted 50g', 'fresh-parsley 10g'], 'lemon'),
  ('cos-pea-mint', 'Little gem, pea and mint salad', 'British', 'side', ['cos-lettuce 200g', 'peas-frozen 150g', 'fresh-mint 10g'], 'mustard'),
]:
  name = name.replace('Roasted-pepper-free red pepper', 'Red pepper')
  refs = refs_of(ings)
  di, ds = DRESS[dk]
  all_i = list(ings) + [d for d in di if d.split()[0] not in refs]
  main = [r for r in refs if r not in refs_of(di)]
  steps = (['Defrost {peas-frozen} in a sieve under cold running water.'] if 'peas-frozen' in refs else []) + [f'Slice, chop or tear {join(main)} as needed.', ds, 'Toss gently as you serve.']
  b.R(f'salad-{key}', name, course, all_i, steps, serves=4, tier='budget', cuisine=cui)
