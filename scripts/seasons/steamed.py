# scripts/seasons/steamed.py — 27 Nov 2026 v1
# Phase 44. Steamed: fish and vegetables over simmering water, and the
# great British steamed puddings.
from build import Book
from gen import t, join, refs_of

b = Book('steamed', 'Steamed', 'st')
STEAMER = 'Set a steamer, or a colander covered with a lid, over a pan of simmering water.'

FISH = [
  ('seabass-ginger', 'Steamed sea bass with ginger and spring onion', 'Chinese', ['sea-bass-fillet 4', 'ginger-fresh 1tbsp', 'spring-onion 4', 'soy-sauce 3tbsp', 'sesame-oil 1tbsp'], 8),
  ('cod-lemongrass', 'Steamed cod with lemongrass and lime', 'Thai', ['cod-fillet 4', 'lemongrass 2', 'lime 2', 'chilli-fresh 1', 'fresh-coriander 10g'], 10),
  ('salmon-miso', 'Steamed salmon with miso and greens', 'Japanese', ['salmon-fillet 4', 'miso-paste 2tbsp', 'pak-choi 2', 'sesame-seeds 1tbsp'], 10),
  ('hake-herbs', 'Steamed hake with lemon and herbs', 'British', ['hake-fillet 600g', 'lemon 1', 'fresh-parsley 10g', 'fresh-dill 10g', 'olive-oil 2tbsp'], 10),
  ('prawn-dumpling-free', 'Steamed king prawns with chilli and garlic', 'Chinese', ['king-prawns-raw 400g', 'garlic-clove 3', 'chilli-fresh 1', 'soy-sauce 2tbsp', 'spring-onion 3'], 5),
  ('trout-fennel', 'Steamed trout with fennel and orange', 'French', ['trout-fillet 520g', 'fennel-bulb 1', 'orange 1', 'olive-oil 1tbsp'], 8),
  ('mussels-steamed', 'Steamed mussels with lemongrass and coconut', 'Thai', ['mussels-cooked 1000g', 'lemongrass 2', 'coconut-milk-tinned 1', 'lime 1', 'fresh-coriander 10g'], 5),
  ('tofu-ginger', 'Steamed silken tofu with ginger and soy', 'Chinese', ['tofu-silken 400g', 'ginger-fresh 1tbsp', 'soy-sauce 3tbsp', 'spring-onion 3', 'chilli-flakes 0.5tsp'], 8),
]
for key, name, cui, ings, mins in FISH:
  refs = refs_of(ings)
  main, rest = refs[0], refs[1:]
  steps = [STEAMER,
           f'Lay {t(main)} on a heatproof plate that fits inside.',
           f'Scatter over {join(rest[:3])}, sliced as needed.',
           f'Steam {mins} minutes, until cooked through.']
  if rest[3:]:
    steps.append(f'Finish with {join(rest[3:])}.')
  b.R(f'fish-{key}', name, 'main', ings, steps, serves=4, tier='everyday', cuisine=cui)

VEG = [
  ('greens-garlic', 'Steamed greens with garlic oil', ['broccoli-head 1', 'green-beans 200g', 'spring-greens 200g', 'olive-oil 2tbsp', 'garlic-clove 2']),
  ('carrots-honey', 'Steamed carrots with honey and thyme', ['carrot-medium 8', 'honey 1tbsp', 'butter-unsalted 20g', 'fresh-thyme 3']),
  ('new-potatoes-mint', 'Steamed new potatoes with mint butter', ['new-potatoes 24', 'butter-unsalted 30g', 'fresh-mint 10g']),
  ('pak-choi-oyster', 'Steamed pak choi with soy and sesame', ['pak-choi 4', 'soy-sauce 2tbsp', 'sesame-oil 1tsp', 'sesame-seeds 1tsp']),
  ('asparagus-lemon', 'Steamed asparagus with lemon butter', ['asparagus 20', 'butter-unsalted 30g', 'lemon 1']),
  ('cauliflower-turmeric', 'Steamed cauliflower with turmeric butter', ['cauliflower-head 1', 'butter-unsalted 30g', 'turmeric-ground 0.5tsp', 'fresh-coriander 10g']),
]
for key, name, ings in VEG:
  refs = refs_of(ings)
  veg = [r for r in refs if r in ('broccoli-head', 'green-beans', 'spring-greens', 'carrot-medium', 'new-potatoes', 'pak-choi', 'asparagus', 'cauliflower-head')]
  rest = [r for r in refs if r not in veg]
  steps = [STEAMER, f'Add {join(veg)}, cut as needed.', 'Steam 6 minutes, until bright and tender. Potatoes need 15.',
           f'Toss with {join(rest)}.']
  b.R(f'veg-{key}', name, 'side', ings, steps, serves=4, tier='budget', cuisine='British')

PUDS = [
  ('treacle-sponge', 'Steamed golden syrup sponge', ['golden-syrup 4tbsp', 'butter-unsalted 125g', 'sugar-caster 125g', 'egg-medium 2', 'flour-self-raising 175g', 'milk-whole 3tbsp']),
  ('jam-sponge', 'Steamed jam sponge', ['jam-strawberry 4tbsp', 'butter-unsalted 125g', 'sugar-caster 125g', 'egg-medium 2', 'flour-self-raising 175g', 'milk-whole 3tbsp']),
  ('chocolate-sponge', 'Steamed chocolate sponge with chocolate sauce', ['dark-chocolate 100g', 'butter-unsalted 125g', 'sugar-caster 125g', 'egg-medium 2', 'flour-self-raising 150g', 'cocoa-powder 25g']),
  ('ginger-sponge', 'Steamed ginger sponge', ['stem-ginger 3', 'golden-syrup 3tbsp', 'butter-unsalted 125g', 'sugar-soft-brown 125g', 'egg-medium 2', 'flour-self-raising 175g']),
  ('lemon-sponge', 'Steamed lemon curd sponge', ['lemon 2', 'butter-unsalted 125g', 'sugar-caster 125g', 'egg-medium 2', 'flour-self-raising 175g', 'milk-whole 3tbsp']),
  ('spotted-dick', 'Spotted dick', ['flour-self-raising 225g', 'suet-vegetable 100g', 'sugar-caster 75g', 'currants 150g', 'milk-whole 150ml', 'lemon 1']),
]
for key, name, ings in PUDS:
  refs = refs_of(ings)
  top = refs[0]
  if key == 'spotted-dick':
    steps = ['Mix {flour-self-raising}, {suet-vegetable}, {sugar-caster}, {currants} and the zest of {lemon}.',
             'Stir in {milk-whole} to a soft dough. Shape into a log.',
             'Wrap loosely in baking paper, then foil, with a pleat for it to rise.',
             STEAMER,
             'Steam 1 hour 30 minutes, topping up the water.']
  else:
    batter = [r for r in refs[1:]]
    steps = ['Butter a 1 litre pudding basin.',
             f'Put {t(top)} in the bottom, chopped or zested as needed.',
             f'Beat {join(batter[:3])} until pale. Fold in {join(batter[3:])}.',
             'Spoon into the basin. Cover with baking paper and foil, pleated to let it rise.',
             STEAMER,
             'Steam 1 hour 30 minutes, topping up the water, until risen and springy.']
  b.R(f'pud-{key}', name, 'pudding', ings, steps, serves=6, tier='budget', cuisine='British',
      note='Keep the water simmering, never boiling dry.')
