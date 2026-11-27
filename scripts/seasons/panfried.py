# scripts/seasons/panfried.py — 27 Nov 2026 v1
# Phase 44. Pan-fried: a frying pan does the cooking. Fish fillets and
# steaks with a pan sauce, fritters and cakes, omelettes and pancakes.
from build import Book
from gen import t, join, refs_of

b = Book('panfried', 'Pan-fried', 'pf')

FISH = {
  'salmon': ('salmon', 'salmon-fillet 4', 4, 3),
  'cod': ('cod', 'cod-fillet 4', 4, 3),
  'seabass': ('sea bass', 'sea-bass-fillet 4', 3, 1),
  'hake': ('hake', 'hake-fillet 600g', 4, 2),
  'mackerel': ('mackerel', 'mackerel-fillet 4', 3, 1),
  'trout': ('trout', 'trout-fillet 520g', 3, 2),
  'bream': ('sea bream', 'sea-bream 4', 3, 1),
}
FSAUCE = {
  'caper-butter': ('Pan-fried {f} with lemon and caper butter', 'French', ['butter-unsalted 50g', 'capers 2tbsp', 'lemon 1', 'fresh-parsley 10g'],
                   'Add {butter-unsalted} to the pan. Let it foam. Add {capers}, the juice of {lemon} and {fresh-parsley}.'),
  'salsa-verde': ('Crisp-skinned {f} with salsa verde', 'Italian', ['fresh-parsley 20g', 'fresh-mint 10g', 'capers 1tbsp', 'olive-oil 5tbsp', 'lemon 1'],
                  'Chop {fresh-parsley}, {fresh-mint} and {capers}. Mix with {olive-oil} and {lemon} juice. Spoon over.'),
  'chilli-garlic': ('Pan-fried {f} with chilli, garlic and lime', 'Thai', ['garlic-clove 2', 'chilli-fresh 1', 'lime 1', 'fresh-coriander 10g'],
                    'Add sliced {garlic-clove} and {chilli-fresh} to the pan 1 minute. Squeeze in {lime}. Scatter {fresh-coriander}.'),
  'tomato-olive': ('Pan-fried {f} with warm tomato and olive dressing', 'Mediterranean', ['cherry-tomato 16', 'olives-pitted 50g', 'garlic-clove 1', 'fresh-basil 10g'],
                   'Add halved {cherry-tomato}, {olives-pitted} and {garlic-clove} to the pan. Warm 3 minutes. Add {fresh-basil}.'),
}
for fk, (fname, fing, skin, flesh) in FISH.items():
  for sk, (title, cui, sauce, sstep) in FSAUCE.items():
    fref = fing.split()[0]
    fry = 'vegetable-oil' if sk == 'salsa-verde' else 'olive-oil'
    ings = [fing, f'{fry} 1tbsp'] + sauce
    steps = [f'Pat {t(fref)} dry. Season with salt.',
             f'Put a frying pan on a medium-high heat. Add {t(fry)}.',
             f'Fry skin side down {skin} minutes, pressing gently, until the skin is crisp.',
             f'Turn. Cook {flesh} minutes more, until the fish flakes. Lift onto plates.',
             sstep.replace('{olive-oil}', '{olive-oil}')]
    b.R(f'{sk}-{fk}', title.format(f=fname), 'main', ings, steps, serves=4, tier='everyday', cuisine=cui,
        note='Leave the fish alone while the skin crisps. It lets go of the pan when it is ready.')

MEAT = {
  'steak': ('steak', 'beef-sirloin 4', 'Fry 3 minutes a side for medium-rare, turning once.', 5),
  'pork': ('pork chops', 'pork-chops 4', 'Fry 5 minutes a side, until no longer pink in the middle.', 3),
  'lamb': ('lamb chops', 'lamb-chops 8', 'Fry 3 minutes a side, until browned but pink inside.', 3),
  'chicken': ('chicken breast', 'chicken-breast-skinless 4', 'Fry 6 minutes a side, until cooked through.', 3),
  'duck': ('duck breast', 'duck-breast 2', 'Start skin side down in a cold pan. Fry 8 minutes, then 3 minutes on the other side.', 5),
}
MSAUCE = {
  'peppercorn': ('{m} with green peppercorn sauce', 'French', ['shallot 1', 'green-peppercorns-brine 1tbsp', 'double-cream 150ml'],
                 'Fry chopped {shallot} in the pan 2 minutes. Add {green-peppercorns-brine} and {double-cream}. Bubble 2 minutes.'),
  'mushroom': ('{m} with mushroom and thyme sauce', 'British', ['mushroom-chestnut 10', 'fresh-thyme 4', 'creme-fraiche 100ml'],
               'Fry sliced {mushroom-chestnut} in the pan 4 minutes. Add {fresh-thyme} and {creme-fraiche}. Bubble 1 minute.'),
  'garlic-butter': ('{m} with garlic and herb butter', 'French', ['butter-unsalted 50g', 'garlic-clove 2', 'fresh-parsley 10g'],
                    'Add {butter-unsalted} and crushed {garlic-clove} to the pan. Spoon over the meat. Scatter {fresh-parsley}.'),
  'mustard-cream': ('{m} with mustard cream sauce', 'French', ['wholegrain-mustard 1tbsp', 'double-cream 150ml', 'chives 10g'],
                    'Add {wholegrain-mustard} and {double-cream} to the pan. Bubble 2 minutes. Snip in {chives}.'),
}
for mk, (mname, ming, cook, rest) in MEAT.items():
  for sk, (title, cui, sauce, sstep) in MSAUCE.items():
    if (mk, sk) in {('duck', 'mustard-cream')}:
      continue
    mref = ming.split()[0]
    ings = [ming, 'olive-oil 1tbsp', 'salt 1tsp'] + sauce
    steps = [f'Season {t(mref)} with {t("salt")}.',
             f'Put a frying pan on a high heat. Add {t("olive-oil")}.',
             cook,
             f'Rest on a warm plate {rest} minutes.',
             sstep,
             'Spoon the sauce over to serve.']
    name = title.format(m=mname.capitalize())
    b.R(f'{sk}-{mk}', name, 'main', ings, steps, serves=4 if mk != 'duck' else 2, tier='special' if mk in ('steak', 'duck') else 'everyday', cuisine=cui)

# ---- Fritters, cakes, omelettes, pancakes ----
OTHERS = [
  ('sweetcorn-fritters', 'Sweetcorn fritters with avocado salsa', 'main', 'Mexican', ['sweetcorn-tinned 1', 'flour-self-raising 100g', 'egg-medium 2', 'milk-whole 100ml', 'spring-onion 3', 'vegetable-oil 3tbsp', 'avocado 1', 'lime 1'],
   ['Whisk {flour-self-raising}, {egg-medium} and {milk-whole} to a thick batter.', 'Stir in drained {sweetcorn-tinned} and sliced {spring-onion}.', 'Put a frying pan on a medium heat. Add {vegetable-oil}.', 'Fry spoonfuls 3 minutes a side, until golden.', 'Dice {avocado} with the juice of {lime}. Spoon on top.']),
  ('pea-feta-fritters', 'Pea and feta fritters', 'starter', 'Greek', ['peas-frozen 250g', 'feta 100g', 'flour-self-raising 80g', 'egg-medium 2', 'fresh-mint 10g', 'olive-oil 3tbsp'],
   ['Defrost {peas-frozen}. Crush lightly.', 'Mix with crumbled {feta}, {flour-self-raising}, {egg-medium} and chopped {fresh-mint}.', 'Put a frying pan on a medium heat. Add {olive-oil}.', 'Fry spoonfuls 3 minutes a side, until golden.']),
  ('rosti', 'Potato rösti with fried eggs', 'breakfast', 'Swiss', ['potato-large 3', 'onion-medium 1', 'butter-unsalted 40g', 'egg-medium 4'],
   ['Grate {potato-large} and {onion-medium}. Squeeze out the water in a clean tea towel.', 'Melt half of {butter-unsalted} in a frying pan.', 'Press in the potato. Fry 10 minutes, until golden underneath.', 'Slide onto a plate. Flip back into the pan. Fry 10 minutes more.', 'Fry {egg-medium} in the rest of the butter. Serve on the rösti.']),
  ('salmon-fishcakes', 'Salmon and dill fishcakes', 'main', 'British', ['mashed-potato 400g', 'salmon-fillet 2', 'fresh-dill 10g', 'lemon 1', 'flour-plain 3tbsp', 'vegetable-oil 3tbsp'],
   ['Poach {salmon-fillet} in a little water in a frying pan 8 minutes. Flake.', 'Mix with cold {mashed-potato}, chopped {fresh-dill} and the zest of {lemon}.', 'Shape into 8 cakes. Dust with {flour-plain}.', 'Wipe the pan. Fry the cakes in {vegetable-oil} 4 minutes a side, until golden.']),
  ('crab-cakes', 'Crab and spring onion cakes', 'starter', 'American', ['crab-white-meat 200g', 'breadcrumbs-dried 60g', 'egg-medium 1', 'mayonnaise 2tbsp', 'spring-onion 3', 'vegetable-oil 3tbsp', 'lemon 1'],
   ['Mix {crab-white-meat}, {breadcrumbs-dried}, {egg-medium}, {mayonnaise} and sliced {spring-onion}.', 'Shape into 8 small cakes. Chill 20 minutes.', 'Put a frying pan on a medium heat. Add {vegetable-oil}.', 'Fry 3 minutes a side, until golden.', 'Serve with wedges of {lemon}.']),
  ('cheese-ham-omelette', 'Ham and cheese omelette', 'breakfast', 'French', ['egg-medium 3', 'butter-unsalted 10g', 'ham-slice 2', 'cheddar-cheese 40g'],
   ['Beat {egg-medium} with a pinch of salt.', 'Melt {butter-unsalted} in a small frying pan on a medium heat.', 'Pour in the eggs. Stir gently 30 seconds, then leave 1 minute to set.', 'Scatter torn {ham-slice} and grated {cheddar-cheese} over half.', 'Fold over. Slide onto a plate.']),
  ('mushroom-omelette', 'Mushroom and herb omelette', 'breakfast', 'French', ['butter-unsalted 15g', 'mushroom-chestnut 4', 'egg-medium 3', 'chives 5g'],
   ['Slice {mushroom-chestnut}. Fry in half of {butter-unsalted} 4 minutes in a small frying pan. Tip out.', 'Melt the rest of the butter. Pour in beaten {egg-medium}.', 'Stir 30 seconds, then leave 1 minute to set.', 'Add the mushrooms and snipped {chives}. Fold over.']),
  ('spinach-feta-omelette', 'Spinach and feta omelette', 'breakfast', 'Greek', ['olive-oil 1tbsp', 'spinach 50g', 'egg-medium 3', 'feta 40g'],
   ['Wilt {spinach} in {olive-oil} in a small frying pan 1 minute.', 'Pour in beaten {egg-medium}. Stir 30 seconds, then leave 1 minute.', 'Crumble over {feta}. Fold over.']),
  ('tortilla', 'Spanish tortilla', 'main', 'Spanish', ['olive-oil 6tbsp', 'potato-medium 4', 'onion-medium 1', 'egg-medium 6'],
   ['Slice {potato-medium} and {onion-medium} thinly.', 'Cook gently in {olive-oil} in a frying pan 20 minutes, until soft, not brown.', 'Drain off most of the oil. Mix the potatoes into beaten {egg-medium}.', 'Pour back into the pan. Cook 6 minutes on a low heat, until the edges set.', 'Flip onto a plate. Slide back in. Cook 4 minutes more.']),
  ('pancakes-lemon', 'Crêpes with lemon and sugar', 'pudding', 'British', ['flour-plain 100g', 'egg-medium 2', 'milk-whole 300ml', 'butter-unsalted 20g', 'lemon 2', 'sugar-caster 4tbsp'],
   ['Whisk {flour-plain}, {egg-medium} and {milk-whole} to a smooth batter.', 'Melt a little {butter-unsalted} in a frying pan on a medium-high heat.', 'Pour in a thin layer. Tilt to cover. Cook 1 minute, until golden underneath.', 'Flip. Cook 30 seconds.', 'Squeeze over {lemon}. Sprinkle with {sugar-caster}. Roll up.']),
  ('pancakes-american', 'Fluffy American pancakes', 'breakfast', 'American', ['flour-self-raising 200g', 'baking-powder 1tsp', 'egg-medium 1', 'milk-whole 250ml', 'butter-unsalted 20g', 'maple-syrup 4tbsp', 'blueberries 100g'],
   ['Whisk {flour-self-raising}, {baking-powder}, {egg-medium} and {milk-whole} to a thick batter.', 'Melt a little {butter-unsalted} in a frying pan on a medium heat.', 'Pour in small rounds. Cook 2 minutes, until bubbles pop on top.', 'Flip. Cook 1 minute.', 'Serve with {maple-syrup} and {blueberries}.']),
  ('vegan-pancakes', 'Vegan banana pancakes', 'breakfast', 'American', ['flour-self-raising 150g', 'banana-medium 1', 'oat-milk 200ml', 'vegetable-oil 2tbsp', 'maple-syrup 3tbsp', 'strawberries 150g'],
   ['Mash {banana-medium}. Whisk with {oat-milk} and {flour-self-raising}.', 'Put a frying pan on a medium heat. Add a little {vegetable-oil}.', 'Pour in small rounds. Cook 2 minutes, until bubbles show.', 'Flip. Cook 1 minute.', 'Serve with {maple-syrup} and sliced {strawberries}.']),
  ('quesadilla-chicken', 'Chicken and pepper quesadillas', 'main', 'Mexican', ['chicken-breast-roast 200g', 'pepper-bell 1', 'cheddar-cheese 150g', 'tortilla-wrap 8', 'salsa-dip 150g'],
   ['Shred {chicken-breast-roast}. Slice {pepper-bell} thinly.', 'Lay on 4 of {tortilla-wrap} with grated {cheddar-cheese}. Top with the other wraps.', 'Cook in a dry frying pan 3 minutes a side, until crisp and melted.', 'Cut into wedges. Serve with {salsa-dip}.']),
  ('halloumi-pitta', 'Crispy halloumi pittas', 'lunch', 'Greek', ['halloumi 1', 'olive-oil 1tbsp', 'pitta-bread 4', 'tomato-medium 2', 'cucumber 1', 'tzatziki 150g'],
   ['Slice {halloumi}.', 'Fry in {olive-oil} in a frying pan 2 minutes a side, until golden.', 'Warm {pitta-bread} in the pan.', 'Fill with halloumi, sliced {tomato-medium}, {cucumber} and {tzatziki}.']),
  ('falafel-patties', 'Pan-fried chickpea and herb patties', 'main', 'Middle Eastern', ['chickpeas-tinned 2', 'onion-medium 1', 'garlic-clove 2', 'cumin-ground 2tsp', 'fresh-parsley 20g', 'flour-plain 3tbsp', 'olive-oil 4tbsp', 'tahini 3tbsp', 'lemon 1'],
   ['Blend drained {chickpeas-tinned}, {onion-medium}, {garlic-clove}, {cumin-ground} and {fresh-parsley} to a rough paste.', 'Stir in {flour-plain}. Shape into 12 patties.', 'Fry in {olive-oil} in a frying pan 3 minutes a side, until crisp.', 'Whisk {tahini} with the juice of {lemon} and a splash of water. Drizzle over.']),
  ('egg-fried-bread', 'French toast with berries', 'breakfast', 'French', ['egg-medium 2', 'milk-whole 100ml', 'cinnamon-ground 0.5tsp', 'bread-slice-medium 4', 'butter-unsalted 20g', 'raspberries 100g', 'maple-syrup 2tbsp'],
   ['Whisk {egg-medium}, {milk-whole} and {cinnamon-ground} in a wide dish.', 'Soak {bread-slice-medium} 20 seconds a side.', 'Fry in {butter-unsalted} in a frying pan 2 minutes a side, until golden.', 'Top with {raspberries} and {maple-syrup}.']),
]
for key, name, course, cui, ings, steps in OTHERS:
  slot = course if course in ('breakfast', 'lunch') else None
  b.R(key, name, course if course not in ('lunch',) else 'lunch', ings, steps, serves=4, tier='budget', cuisine=cui, slot=slot)
