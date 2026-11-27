# scripts/seasons/grill.py — 27 Nov 2026 v1
# Phase 44. Grilled: kebabs, fish, burgers, vegetables and fruit, on a
# barbecue, a griddle pan or under a hot grill. Every step says which works.
from build import Book
from gen import t, join, refs_of

b = Book('grill', 'Grilled', 'gr')
HEAT = 'Heat a griddle pan, the grill or the barbecue until very hot.'

PRO = {
  'chicken': ('chicken', 'chicken-thigh-boneless 8', 'Cut {p} into chunks.', 12, 'cooked through'),
  'lamb': ('lamb kofta', 'lamb-mince 500g', 'Mix {p} with a pinch of salt. Squeeze into 8 sausages round skewers.', 10, 'browned and cooked through'),
  'pork': ('pork', 'pork-tenderloin 500g', 'Cut {p} into chunks.', 12, 'no longer pink inside'),
  'prawn': ('king prawn', 'king-prawns-raw 400g', 'Pat {p} dry.', 4, 'pink all through'),
  'halloumi': ('halloumi', 'halloumi 2', 'Cut {p} into chunks.', 6, 'golden and striped'),
  'paneer': ('paneer', 'paneer 2', 'Cut {p} into chunks.', 8, 'charred at the edges'),
  'tofu': ('tofu', 'tofu-firm 2', 'Press {p}. Cut into chunks.', 10, 'charred and hot'),
  'beef': ('steak', 'beef-sirloin 3', 'Cut {p} into chunks.', 6, 'browned but pink inside'),
}
MARINADE = {
  'greek': ('Lemon and oregano {p} skewers', 'Greek', ['lemon 1', 'dried-oregano 2tsp', 'garlic-clove 2', 'olive-oil 3tbsp'], ['red-onion 1', 'pepper-bell 1'], ['tzatziki 200g'], 'Serve with {tzatziki}.'),
  'tikka': ('{P} tikka skewers', 'Indian', ['natural-yoghurt 150g', 'garam-masala 2tsp', 'chilli-powder 1tsp', 'ginger-fresh 1tbsp'], ['red-onion 1', 'pepper-bell 1'], ['lime 1', 'fresh-coriander 10g'], 'Squeeze over {lime}. Scatter {fresh-coriander}.'),
  'teriyaki': ('Teriyaki {p} skewers', 'Japanese', ['soy-sauce 4tbsp', 'honey 2tbsp', 'mirin 2tbsp', 'ginger-fresh 1tsp'], ['spring-onion 6'], ['sesame-seeds 1tbsp'], 'Scatter with {sesame-seeds}.'),
  'harissa': ('Harissa {p} skewers with yoghurt', 'Middle Eastern', ['harissa-paste 3tbsp', 'olive-oil 2tbsp', 'lemon 1'], ['courgette 1', 'red-onion 1'], ['greek-yoghurt 150g', 'fresh-mint 10g'], 'Serve with {greek-yoghurt} and {fresh-mint}.'),
  'chimichurri': ('{P} skewers with chimichurri', 'Argentinian', ['olive-oil 6tbsp', 'garlic-clove 2', 'white-wine-vinegar 2tbsp', 'chilli-flakes 0.5tsp'], ['pepper-bell 2'], ['fresh-parsley 30g', 'dried-oregano 1tsp'], 'Chop {fresh-parsley} with {dried-oregano}. Stir into the rest of the marinade. Spoon over.'),
  'satay': ('Satay {p} skewers', 'Indonesian', ['soy-sauce 2tbsp', 'curry-powder 1tsp', 'sugar-soft-brown 1tbsp'], ['red-onion 1'], ['peanut-butter 4tbsp', 'coconut-milk-tinned 1', 'lime 1'], 'Warm {peanut-butter} with half of {coconut-milk-tinned} and the juice of {lime}. Serve for dipping.'),
  'jerk': ('Jerk {p} skewers with pineapple', 'Caribbean', ['jerk-paste 3tbsp', 'lime 1', 'olive-oil 1tbsp'], ['pineapple 1', 'red-onion 1'], ['fresh-coriander 10g'], 'Scatter with {fresh-coriander}.'),
  'peri': ('Peri-peri {p} skewers', 'Portuguese', ['chilli-fresh 2', 'smoked-paprika 2tsp', 'lemon 1', 'olive-oil 3tbsp'], ['pepper-bell 2'], ['fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
}
SKIP = {('paneer', 'jerk'), ('paneer', 'peri'), ('lamb', 'jerk'), ('halloumi', 'tikka'), ('halloumi', 'teriyaki'), ('halloumi', 'satay'), ('paneer', 'greek'), ('paneer', 'teriyaki'), ('paneer', 'chimichurri'),
        ('lamb', 'teriyaki'), ('lamb', 'satay'), ('prawn', 'greek'), ('tofu', 'greek'), ('tofu', 'chimichurri'), ('beef', 'tikka')}
for pk, (pname, ping, prep, mins, done) in PRO.items():
  for mk, (title, cui, mar, veg, fin, fs) in MARINADE.items():
    if (pk, mk) in SKIP:
      continue
    pref = ping.split()[0]
    ings = [ping] + mar + veg + [f for f in fin if f.split()[0] not in refs_of(mar)]
    vref = refs_of(veg)
    steps = [prep.replace('{p}', t(pref))]
    steps.append(f'Mix {join(refs_of(mar))}. Coat the {pname}. Leave 20 minutes.' if mk != 'chimichurri' else
                 f'Mix {join(refs_of(mar))}. Coat the {pname} in half. Leave 20 minutes.')
    steps.append(f'Cut {join(vref)} into chunks. Thread onto skewers with the {pname}.')
    steps.append(HEAT)
    steps.append(f'Grill {mins} minutes, turning often, until {done}.')
    steps.append(fs)
    name = title.replace('{P}', pname.capitalize()).replace('{p}', pname)
    b.R(f'{mk}-{pk}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine=cui,
        note='Soak wooden skewers in water 30 minutes first so they do not burn.')

FISH = {
  'mackerel': ('mackerel', 'mackerel-fillet 4', 3, 1),
  'salmon': ('salmon', 'salmon-fillet 4', 4, 3),
  'seabass': ('sea bass', 'sea-bass-fillet 4', 3, 2),
  'tuna': ('tuna', 'tuna-steak 4', 2, 2),
  'bream': ('sea bream', 'sea-bream 4', 3, 2),
}
FFL = {
  'lemon-herb': ('Grilled {f} with lemon and herbs', 'Mediterranean', ['lemon 1', 'fresh-parsley 10g', 'olive-oil 2tbsp'], 'Squeeze over {lemon}. Scatter {fresh-parsley}.'),
  'harissa': ('Harissa grilled {f}', 'Middle Eastern', ['harissa-paste 2tbsp', 'olive-oil 1tbsp', 'lemon 1'], 'Squeeze over {lemon}.'),
  'chilli-lime': ('Grilled {f} with chilli and lime', 'Thai', ['chilli-fresh 1', 'lime 2', 'olive-oil 1tbsp', 'fresh-coriander 10g'], 'Squeeze over {lime}. Scatter chopped {chilli-fresh} and {fresh-coriander}.'),
  'miso': ('Miso-glazed grilled {f}', 'Japanese', ['miso-paste 2tbsp', 'honey 1tbsp', 'olive-oil 1tbsp', 'spring-onion 2'], 'Scatter with sliced {spring-onion}.'),
}
for fk, (fname, fing, a, bb) in FISH.items():
  for gk, (title, cui, ings, fs) in FFL.items():
    fref = fing.split()[0]
    all_i = [fing] + ings
    steps = [f'Brush {t(fref)} with {t("olive-oil")}.' if gk not in ('miso', 'harissa') else ('Mix {miso-paste}, {honey} and {olive-oil}. Brush over {' + fref + '}.' if gk == 'miso' else 'Mix {harissa-paste} and {olive-oil}. Brush over {' + fref + '}.'),
             HEAT,
             f'Grill skin side towards the heat {a} minutes.',
             f'Turn. Grill {bb} minutes more, until cooked as you like it.',
             fs]
    b.R(f'{gk}-{fk}', title.format(f=fname), 'main', all_i, steps, serves=4, tier='everyday' if fk != 'tuna' else 'special', cuisine=cui)

OTHERS = [
  ('lamb-burgers', 'Lamb burgers with feta and mint', 'main', 'Greek', ['lamb-mince 500g', 'cumin-ground 1tsp', 'fresh-mint 10g', 'burger-bun 4', 'feta 100g', 'cucumber 1'],
   ['Mix {lamb-mince} with {cumin-ground} and chopped {fresh-mint}. Shape into 4 burgers.', HEAT, 'Grill 4 minutes a side, until cooked through.', 'Toast {burger-bun} on the grill.', 'Fill with the burgers, crumbled {feta} and sliced {cucumber}.']),
  ('chicken-burgers', 'Grilled chicken burgers with avocado', 'main', 'American', ['chicken-breast-skinless 2', 'smoked-paprika 1tsp', 'olive-oil 1tbsp', 'burger-bun 4', 'avocado 1', 'lettuce-iceberg 100g', 'mayonnaise 2tbsp'],
   ['Halve {chicken-breast-skinless} through the middle to make 4 thin pieces.', 'Rub with {smoked-paprika} and {olive-oil}.', HEAT, 'Grill 4 minutes a side, until cooked through.', 'Fill {burger-bun} with chicken, sliced {avocado}, {lettuce-iceberg} and {mayonnaise}.']),
  ('pork-apple-burgers', 'Pork and apple burgers', 'main', 'British', ['pork-mince 500g', 'apple-medium 1', 'fresh-sage 4', 'burger-bun 4', 'wholegrain-mustard 2tbsp', 'rocket 40g'],
   ['Grate {apple-medium}. Chop {fresh-sage}. Mix into {pork-mince}. Shape into 4 burgers.', HEAT, 'Grill 5 minutes a side, until cooked through.', 'Toast {burger-bun}.', 'Fill with burgers, {wholegrain-mustard} and {rocket}.']),
  ('grilled-aubergine', 'Grilled aubergine with tahini and pomegranate', 'starter', 'Middle Eastern', ['aubergine 2', 'olive-oil 3tbsp', 'tahini 3tbsp', 'lemon 1', 'pomegranate-seeds 50g', 'fresh-mint 10g'],
   ['Slice {aubergine} into rounds. Brush with {olive-oil}.', HEAT, 'Grill 4 minutes a side, until soft and striped.', 'Whisk {tahini} with {lemon} juice and water to a drizzle.', 'Pour over. Scatter {pomegranate-seeds} and {fresh-mint}.']),
  ('grilled-peppers-feta', 'Grilled peppers with feta and basil', 'starter', 'Greek', ['pepper-bell 4', 'olive-oil 3tbsp', 'feta 150g', 'fresh-basil 10g', 'balsamic-vinegar 1tbsp'],
   ['Cut {pepper-bell} into wide strips.', 'Brush with 1 tbsp of {olive-oil}.', HEAT, 'Grill 4 minutes a side, until charred.', 'Crumble over {feta}. Add {fresh-basil}, the rest of the oil and {balsamic-vinegar}.']),
  ('grilled-portobello', 'Grilled portobello mushrooms with garlic', 'side', 'British', ['portobello-mushroom 4', 'olive-oil 3tbsp', 'garlic-clove 2', 'fresh-thyme 4'],
   ['Mix {olive-oil}, crushed {garlic-clove} and {fresh-thyme} leaves.', 'Brush over {portobello-mushroom}.', HEAT, 'Grill 5 minutes a side, until juicy.']),
  ('grilled-courgette-salad', 'Grilled courgette, lemon and ricotta salad', 'starter', 'Italian', ['courgette 3', 'olive-oil 3tbsp', 'ricotta 150g', 'lemon 1', 'fresh-mint 10g', 'chilli-flakes 0.25tsp'],
   ['Slice {courgette} lengthways. Brush with 1 tbsp of {olive-oil}.', HEAT, 'Grill 2 minutes a side, until striped.', 'Lay on a plate. Dot with {ricotta}.', 'Dress with the rest of the oil, {lemon}, {fresh-mint} and {chilli-flakes}.']),
  ('grilled-corn-lime', 'Grilled corn with lime and chilli', 'side', 'Mexican', ['corn-on-the-cob 4', 'olive-oil 1tbsp', 'lime 1', 'chilli-powder 0.5tsp'],
   ['Brush {corn-on-the-cob} with {olive-oil}.', HEAT, 'Grill 10 minutes, turning, until charred all over.', 'Squeeze over {lime}. Sprinkle {chilli-powder}.']),
  ('halloumi-watermelon', 'Grilled halloumi and watermelon salad', 'starter', 'Greek', ['halloumi 1', 'watermelon 400g', 'fresh-mint 10g', 'olive-oil 1tbsp', 'lime 1'],
   ['Slice {halloumi}.', HEAT, 'Grill 2 minutes a side, until golden.', 'Cube {watermelon}. Toss with {fresh-mint}, {olive-oil} and {lime} juice.', 'Top with the hot halloumi.']),
  ('grilled-sweet-potato', 'Grilled sweet potato with chilli and lime', 'side', 'Mexican', ['sweet-potato 3', 'olive-oil 2tbsp', 'chilli-flakes 0.5tsp', 'lime 1', 'fresh-coriander 10g'],
   ['Slice {sweet-potato} into rounds. Boil 5 minutes. Drain.', 'Toss with {olive-oil} and {chilli-flakes}.', HEAT, 'Grill 3 minutes a side, until charred.', 'Squeeze over {lime}. Scatter {fresh-coriander}.']),
  ('grilled-figs', 'Grilled figs with honey and yoghurt', 'pudding', 'Mediterranean', ['figs-fresh 8', 'honey 3tbsp', 'greek-yoghurt 200g', 'pistachios 30g'],
   ['Halve {figs-fresh}.', HEAT, 'Grill cut side down 3 minutes.', 'Drizzle with {honey}. Serve with {greek-yoghurt} and chopped {pistachios}.']),
  ('grilled-plums', 'Grilled plums with maple and coconut yoghurt', 'pudding', 'British', ['plums 8', 'maple-syrup 2tbsp', 'coconut-yoghurt 200g'],
   ['Halve and stone {plums}. Brush with {maple-syrup}.', HEAT, 'Grill cut side down 4 minutes, until soft.', 'Serve with {coconut-yoghurt}.']),
  ('grilled-bananas', 'Grilled bananas with toffee sauce', 'pudding', 'British', ['banana-medium 4', 'butter-unsalted 40g', 'sugar-soft-brown 40g', 'double-cream 80ml', 'ice-cream-vanilla 4'],
   ['Halve {banana-medium} lengthways in their skins.', HEAT, 'Grill cut side down 4 minutes.', 'Melt {butter-unsalted} and {sugar-soft-brown}. Bubble 2 minutes. Stir in {double-cream}.', 'Serve the bananas with the sauce and {ice-cream-vanilla}.']),
  ('grilled-apricots', 'Grilled peaches with almonds and cream', 'pudding', 'French', ['peach 4', 'sugar-caster 1tbsp', 'almonds 30g', 'creme-fraiche 150ml'],
   ['Halve and stone {peach}. Sprinkle the cut sides with {sugar-caster}.', HEAT, 'Grill cut side down 4 minutes, until caramelised.', 'Serve with {creme-fraiche} and chopped {almonds}.']),
]
for key, name, course, cui, ings, steps in OTHERS:
  b.R(key, name, course, ings, steps, serves=4, tier='everyday', cuisine=cui)

for key, name, course, cui, ings, steps in [
  ('grilled-halloumi-burger', 'Grilled halloumi burgers', 'main', 'Greek', ['halloumi 2', 'burger-bun 4', 'tomato-medium 2', 'rocket 40g', 'tzatziki 150g'],
   ['Slice {halloumi} into 4 thick slabs.', HEAT, 'Grill 2 minutes a side, until golden.', 'Toast {burger-bun}. Fill with halloumi, sliced {tomato-medium}, {rocket} and {tzatziki}.']),
  ('grilled-pineapple-salsa-chicken', 'Grilled chicken with pineapple salsa', 'main', 'Caribbean', ['chicken-breast-skinless 4', 'jerk-paste 2tbsp', 'pineapple 1', 'red-onion 1', 'lime 1', 'fresh-coriander 10g'],
   ['Rub {chicken-breast-skinless} with {jerk-paste}.', HEAT, 'Grill 6 minutes a side, until cooked through.', 'Dice a quarter of {pineapple} with {red-onion}, {lime} juice and {fresh-coriander}. Spoon over.']),
]:
  b.R(key, name, course, ings, steps, serves=4, tier='everyday', cuisine=cui)
