# scripts/seasons/roasts.py — 27 Nov 2026 v1
# Phase 44. Roasts: Sunday joints, whole roast fish, roast vegetables in
# every flavour, and roast fruit for pudding.
from build import Book
from gen import t, join, refs_of

b = Book('roasts', 'Roasts', 'rst')

# ---- Roast vegetables: veg x flavour ----
VEG = {
  'carrots': ('carrots', 'carrot-medium 10', 'Halve {v} lengthways.', 35),
  'parsnips': ('parsnips', 'parsnip 6', 'Quarter {v} lengthways.', 35),
  'potatoes': ('new potatoes', 'new-potatoes 24', 'Halve {v}.', 40),
  'cauliflower': ('cauliflower', 'cauliflower-head 1', 'Cut {v} into florets.', 25),
  'broccoli': ('broccoli', 'broccoli-head 2', 'Cut {v} into florets.', 15),
  'squash': ('squash', 'butternut-squash 1', 'Cut {v} into wedges. Scoop out the seeds.', 40),
  'beetroot': ('beetroot', 'beetroot-raw 6', 'Peel {v}. Cut into wedges.', 45),
  'sweet-potato': ('sweet potato', 'sweet-potato 4', 'Cut {v} into wedges.', 30),
  'sprouts': ('sprouts', 'brussels-sprouts 500g', 'Halve {v}.', 25),
  'fennel': ('fennel', 'fennel-bulb 2', 'Cut {v} into wedges.', 35),
  'peppers': ('peppers', 'pepper-bell 4', 'Cut {v} into wide strips.', 25),
  'tomatoes': ('vine tomatoes', 'tomato-medium 8', 'Halve {v}.', 30),
  'red-onions': ('red onions', 'red-onion 6', 'Cut {v} into wedges.', 35),
  'celeriac': ('celeriac', 'celeriac 700g', 'Peel {v}. Cut into chunks.', 40),
  'aubergine': ('aubergine', 'aubergine 2', 'Cut {v} into chunks.', 30),
  'leeks': ('leeks', 'leek 4', 'Cut {v} into short lengths.', 25),
  'swede': ('swede', 'swede 700g', 'Peel {v}. Cut into chunks.', 40),
}
FLAV = {
  'garlic-rosemary': ('Roast {v} with garlic and rosemary', 'British', ['garlic-clove 6', 'fresh-rosemary 2'], None),
  'cumin-honey': ('Honey and cumin roast {v}', 'Middle Eastern', ['cumin-ground 1tsp'], ('honey 2tbsp', 'Drizzle with {honey} for the last 10 minutes.')),
  'chilli-lime': ('Chilli and lime roast {v}', 'Mexican', ['chilli-flakes 0.5tsp'], ('lime 1', 'Squeeze over {lime}.')),
  'parmesan': ('Parmesan roast {v}', 'Italian', ['garlic-clove 2'], ('parmesan 40g', 'Grate over {parmesan} for the last 5 minutes.')),
  'zaatar': ("Za'atar roast {v} with lemon", 'Middle Eastern', ['zaatar 2tbsp'], ('lemon 1', 'Squeeze over {lemon}.')),
  'miso-maple': ('Miso and maple roast {v}', 'Japanese', ['miso-paste 1tbsp'], ('maple-syrup 2tbsp', 'Toss with {maple-syrup} for the last 10 minutes.')),
}
SKIP = {('tomatoes', 'cumin-honey'), ('tomatoes', 'miso-maple'), ('tomatoes', 'chilli-lime'), ('peppers', 'parmesan'), ('beetroot', 'parmesan'),
        ('fennel', 'chilli-lime'), ('fennel', 'miso-maple'), ('sprouts', 'zaatar'), ('broccoli', 'cumin-honey'), ('squash', 'parmesan'),
        ('peppers', 'miso-maple'), ('beetroot', 'chilli-lime'), ('potatoes', 'cumin-honey'), ('potatoes', 'miso-maple'), ('leeks', 'chilli-lime'), ('leeks', 'miso-maple'), ('celeriac', 'chilli-lime'), ('aubergine', 'cumin-honey'), ('swede', 'zaatar'), ('red-onions', 'parmesan')}
for vk, (vname, ving, prep, mins) in VEG.items():
  for fk, (title, cui, season, fin) in FLAV.items():
    if (vk, fk) in SKIP:
      continue
    vref = ving.split()[0]
    ings = [ving, 'olive-oil 3tbsp'] + season + ([fin[0]] if fin else [])
    steps = ['Heat the oven to 200C.',
             prep.replace('{v}', t(vref)),
             f'Toss in a roasting tin with {t("olive-oil")} and {join(refs_of(season))}.',
             f'Roast {mins} minutes, turning once, until tender and browned at the edges.']
    if fin:
      steps.append(fin[1])
    b.R(f'{fk}-{vk}', title.format(v=vname), 'side', ings, steps, serves=4, tier='budget', cuisine=cui)

# ---- Joints and whole birds ----
JOINTS = [
  ('lemon-thyme-chicken', 'Roast chicken with lemon and thyme', 'British', ['chicken-whole 1500g', 'lemon 1', 'fresh-thyme 6', 'butter-unsalted 30g', 'garlic-clove 4'], '200C', '1 hour 20 minutes', 'the juices run clear', 15),
  ('harissa-chicken', 'Harissa roast chicken', 'Middle Eastern', ['chicken-whole 1500g', 'harissa-paste 3tbsp', 'lemon 1', 'olive-oil 2tbsp', 'red-onion 2'], '200C', '1 hour 20 minutes', 'the juices run clear', 15),
  ('pork-crackling', 'Roast pork shoulder with crackling', 'British', ['pork-shoulder 2000g', 'salt 2tsp', 'fennel-seeds 1tsp', 'onion-large 2', 'apple-medium 2'], '220C then 170C', '3 hours', 'the meat is tender and the skin crackles', 20),
  ('beef-topside', 'Roast beef topside with mustard', 'British', ['beef-topside 1500g', 'mustard-dijon 2tbsp', 'olive-oil 1tbsp', 'onion-large 2', 'fresh-thyme 4'], '220C then 180C', '1 hour', 'it is pink in the middle', 20),
  ('lamb-shoulder-style', 'Slow-roast lamb with garlic and anchovy', 'British', ['lamb-leg 1800g', 'garlic-clove 6', 'anchovy-fillet 6', 'fresh-rosemary 3', 'olive-oil 2tbsp'], '160C', '4 hours', 'it falls from the bone', 20),
  ('gammon-honey', 'Honey and orange roast gammon', 'British', ['gammon-joint 1500g', 'honey 3tbsp', 'orange 1', 'mustard-dijon 1tbsp', 'cloves 16'], '180C', '1 hour 30 minutes', 'the glaze is sticky', 15),
  ('pork-belly-fennel', 'Slow-roast pork belly with fennel', 'Italian', ['pork-belly 1500g', 'fennel-seeds 2tsp', 'salt 2tsp', 'fennel-bulb 2', 'garlic-clove 4'], '160C', '3 hours', 'the meat is meltingly tender', 15),
  ('chicken-tarragon-leeks', 'Pot-roast chicken with leeks and tarragon', 'French', ['chicken-whole 1500g', 'leek 3', 'wine-white 200ml', 'fresh-tarragon 10g', 'butter-unsalted 30g'], '190C', '1 hour 30 minutes', 'the juices run clear', 10),
  ('duck-legs-orange', 'Roast duck legs with orange', 'French', ['duck-leg 4', 'orange 2', 'star-anise 2', 'honey 2tbsp', 'salt 1tsp'], '180C', '1 hour 30 minutes', 'the skin is crisp and the meat tender', 5),
  ('turkey-thigh-sage', 'Roast turkey with sage and onion', 'British', ['turkey-crown 2000g', 'butter-unsalted 50g', 'fresh-sage 8', 'onion-large 2', 'lemon 1'], '190C', '1 hour 40 minutes', 'the juices run clear', 30),
]
for key, name, cui, ings, temp, time, done, rest in JOINTS:
  refs = refs_of(ings)
  meat = refs[0]
  rub = refs[1:3]
  under = [r for r in refs[3:]]
  steps = [f'Heat the oven to {temp.split(" ")[0]}.',
           f'Pat {t(meat)} dry. Rub with {join(rub)}.',
           f'Sit on {join(under)} in a roasting tin.' if under else 'Sit in a roasting tin.',
           *([f'Roast 30 minutes. Turn the oven down to {temp.split("then ")[1]}.', f'Roast for the rest of {time}, until {done}.'] if 'then' in temp else [f'Roast {time}, until {done}.']),
           f'Rest under foil {rest} minutes before carving. || Resting lets the juices settle back in.']
  b.R(f'joint-{key}', name, 'main', ings, steps, serves=6, tier='special', cuisine=cui)

# ---- Whole roast fish ----
FISHR = [
  ('bream-lemon', 'Whole roast sea bream with lemon and fennel', ['sea-bream 2', 'lemon 1', 'fennel-bulb 1', 'olive-oil 2tbsp', 'fresh-dill 10g'], 20),
  ('salmon-side-pesto', 'Roast side of salmon with pesto crust', ['salmon-fillet 6', 'pesto 90g', 'breadcrumbs-dried 40g', 'lemon 1'], 15),
  ('cod-chorizo', 'Roast cod with chorizo and butter beans', ['cod-fillet 4', 'chorizo 80g', 'butter-beans-tinned 1', 'cherry-tomato 16', 'olive-oil 1tbsp'], 15),
  ('hake-potatoes', 'Roast hake on lemon potatoes', ['potato-medium 4', 'olive-oil 3tbsp', 'lemon 1', 'hake-fillet 600g', 'capers 1tbsp'], 15),
  ('monkfish-pancetta', 'Roast monkfish wrapped in pancetta', ['monkfish 600g', 'pancetta 80g', 'fresh-sage 6', 'olive-oil 1tbsp', 'lemon 1'], 18),
  ('trout-almonds-roast', 'Roast trout with almonds and herbs', ['trout-fillet 520g', 'almonds 40g', 'butter-unsalted 30g', 'fresh-parsley 10g', 'lemon 1'], 12),
]
for key, name, ings, mins in FISHR:
  refs = refs_of(ings)
  fish = [r for r in refs if r in ('sea-bream', 'salmon-fillet', 'cod-fillet', 'hake-fillet', 'monkfish', 'trout-fillet')][0]
  rest = [r for r in refs if r != fish]
  steps = ['Heat the oven to 200C.']
  if 'potato-medium' in refs:
    steps += ['Slice {potato-medium} thinly. Toss with {olive-oil} in a roasting tin.', 'Roast 25 minutes, until starting to crisp.']
    rest = [r for r in rest if r not in ('potato-medium', 'olive-oil')]
  steps.append(f'Lay {t(fish)} in a roasting tin. Add {join(rest)}.')
  steps.append(f'Roast {mins} minutes, until the fish flakes.')
  b.R(f'fish-{key}', name, 'main', ings, steps, serves=4, tier='special', cuisine='Mediterranean')

# ---- Roast fruit ----
FRUIT = [
  ('rhubarb-orange', 'Roast rhubarb with orange and ginger', ['rhubarb 500g', 'orange 1', 'sugar-caster 60g', 'ginger-ground 0.5tsp', 'greek-yoghurt 300g'], 15),
  ('pears-honey', 'Honey-roast pears with walnuts', ['pear 4', 'honey 3tbsp', 'walnuts 40g', 'creme-fraiche 150ml'], 25),
  ('figs-port', 'Roast figs with port', ['figs-fresh 8', 'port 80ml', 'honey 2tbsp', 'mascarpone 150g'], 15),
  ('strawberries-balsamic', 'Roast strawberries with balsamic and black pepper', ['strawberries 400g', 'balsamic-vinegar 2tbsp', 'sugar-caster 2tbsp', 'black-pepper-ground 0.25tsp', 'ice-cream-vanilla 4'], 12),
  ('apples-cinnamon', 'Roast apples with cinnamon and maple', ['apple-medium 4', 'maple-syrup 3tbsp', 'cinnamon-ground 1tsp', 'coconut-yoghurt 300g'], 25),
  ('peaches-vanilla', 'Vanilla roast peaches', ['peach 4', 'sugar-caster 2tbsp', 'vanilla-extract 1tsp', 'double-cream 150ml'], 15),
  ('pineapple-rum', 'Roast pineapple with lime and coconut', ['pineapple 1', 'sugar-soft-brown 3tbsp', 'lime 1', 'coconut-yoghurt 300g'], 25),
  ('grapes-ricotta', 'Roast grapes with ricotta and honey', ['grapes 400g', 'olive-oil 1tbsp', 'ricotta 250g', 'honey 2tbsp'], 15),
]
for key, name, ings, mins in FRUIT:
  refs = refs_of(ings)
  fruit, others = refs[0], refs[1:-1]
  serve = refs[-1]
  steps = ['Heat the oven to 200C.',
           f'Cut {t(fruit)} as needed. Lay in a roasting tin.',
           f'Add {join(others)}.',
           f'Roast {mins} minutes, until soft and syrupy.',
           f'Serve warm with {t(serve)}.']
  b.R(f'fruit-{key}', name, 'pudding', ings, steps, serves=4, tier='budget', cuisine='British')
