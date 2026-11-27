# scripts/seasons/traybakes.py — 27 Nov 2026 v1
# Phase 44. Traybakes: one roasting tin, a protein and a flavour.
# Proteins that take longer go in with the vegetables; quick ones (fish,
# halloumi, lamb chops) go in after the vegetables have a head start.
from build import Book
from gen import t, join, refs_of

b = Book('traybakes', 'Traybakes', 'tb')

PROTEINS = {
  'chicken': dict(name='chicken', ing='chicken-thigh-boneless 8', mins=35, quick=False, done='the chicken is golden and cooked through'),
  'sausage': dict(name='sausage', ing='sausage-pork 8', mins=35, quick=False, done='the sausages are browned and cooked through'),
  'salmon': dict(name='salmon', ing='salmon-fillet 4', mins=12, quick=True, done='the salmon flakes'),
  'cod': dict(name='cod', ing='cod-fillet 4', mins=12, quick=True, done='the fish flakes'),
  'halloumi': dict(name='halloumi', ing='halloumi 2', mins=15, quick=True, done='the halloumi is golden', cut='Slice'),
  'chickpea': dict(name='chickpea', ing='chickpeas-tinned 2', mins=30, quick=False, done='the chickpeas are crisp', cut='Drain'),
  'tofu': dict(name='tofu', ing='tofu-firm 1', mins=30, quick=False, done='the tofu is crisp at the edges', cut='Cube'),
  'lamb': dict(name='lamb chop', ing='lamb-chops 8', mins=15, quick=True, done='the chops are browned but pink inside'),
}

FLAVOURS = {
  'harissa': dict(title='Harissa {p} traybake with peppers and red onion', cuisine='Middle Eastern',
                  veg=['pepper-bell 2', 'red-onion 2', 'cherry-tomato 12'], season=['harissa-paste 3tbsp'],
                  finish=['lemon 1', 'fresh-mint 10g'], finish_step='Squeeze over {lemon}. Scatter with torn {fresh-mint}.'),
  'pesto': dict(title='Pesto {p} traybake with tomatoes and courgettes', cuisine='Italian',
                veg=['cherry-tomato 20', 'courgette 2', 'red-onion 1'], season=['pesto 90g'],
                finish=['fresh-basil 10g'], finish_step='Scatter with {fresh-basil}.'),
  'honey-mustard': dict(title='Honey mustard {p} traybake with new potatoes', cuisine='British',
                        veg=['new-potatoes 16', 'carrot-medium 4', 'red-onion 1'], season=['honey 2tbsp', 'wholegrain-mustard 2tbsp'],
                        finish=['fresh-parsley 10g'], finish_step='Scatter with chopped {fresh-parsley}.'),
  'smoky': dict(title='Smoky paprika {p} traybake with potatoes and peppers', cuisine='Spanish',
                veg=['potato-medium 4', 'pepper-bell 2', 'red-onion 1'], season=['smoked-paprika 2tsp', 'garlic-clove 4'],
                finish=['fresh-parsley 10g', 'lemon 1'], finish_step='Squeeze over {lemon}. Scatter with {fresh-parsley}.'),
  'thai': dict(title='Thai red {p} traybake with sweet potato', cuisine='Thai',
               veg=['sweet-potato 2', 'broccoli-head 1', 'red-onion 1'], season=['thai-red-curry-paste 2tbsp'],
               finish=['lime 1', 'fresh-coriander 10g'], finish_step='Squeeze over {lime}. Scatter with {fresh-coriander}.'),
  'greek': dict(title='Greek lemon and oregano {p} traybake', cuisine='Greek',
                veg=['potato-medium 4', 'red-onion 1', 'lemon 1'], season=['dried-oregano 2tsp', 'garlic-clove 4'],
                finish=['olives-pitted 60g'], finish_step='Scatter over {olives-pitted}.'),
  'miso': dict(title='Miso and sesame {p} traybake with aubergine', cuisine='Japanese',
               veg=['aubergine 1', 'broccoli-head 1', 'spring-onion 4'], season=['miso-paste 2tbsp', 'maple-syrup 1tbsp'],
               finish=['sesame-seeds 1tbsp'], finish_step='Scatter with {sesame-seeds}.'),
  'tandoori': dict(title='Tandoori {p} traybake with cauliflower', cuisine='Indian',
                   veg=['cauliflower-head 1', 'red-onion 2', 'cherry-tomato 12'], season=['garam-masala 2tsp', 'natural-yoghurt 100g', 'chilli-powder 1tsp'],
                   finish=['fresh-coriander 10g', 'lime 1'], finish_step='Squeeze over {lime}. Scatter with {fresh-coriander}.'),
  'balsamic': dict(title='Balsamic {p} traybake with red onion and squash', cuisine='Italian',
                   veg=['butternut-squash 1', 'red-onion 2', 'cherry-tomato 12'], season=['balsamic-vinegar 3tbsp', 'fresh-rosemary 2'],
                   finish=['rocket 60g'], finish_step='Scatter with {rocket}.'),
  'jerk': dict(title='Jerk {p} traybake with sweet potato and peppers', cuisine='Caribbean',
               veg=['sweet-potato 2', 'pepper-bell 2', 'red-onion 1'], season=['jerk-paste 3tbsp'],
               finish=['lime 1', 'spring-onion 3'], finish_step='Squeeze over {lime}. Scatter with sliced {spring-onion}.'),
}

SKIP = {('lamb', 'thai'), ('lamb', 'miso'), ('lamb', 'jerk'), ('cod', 'jerk'), ('halloumi', 'miso'), ('halloumi', 'thai'),
        ('sausage', 'miso'), ('sausage', 'thai'), ('sausage', 'tandoori'), ('tofu', 'balsamic'), ('cod', 'balsamic'), ('tofu', 'greek'), ('tofu', 'honey-mustard'), ('chickpea', 'miso')}

for pk, p in PROTEINS.items():
  for fk, f in FLAVOURS.items():
    if (pk, fk) in SKIP:
      continue
    pref = p['ing'].split()[0]
    veg = f['veg']
    vrefs = refs_of(veg)
    srefs = refs_of(f['season'])
    ings = veg + ['olive-oil 3tbsp'] + f['season'] + [p['ing']] + f['finish']
    seen, dedup = set(), []
    for i in ings:
      r = i.split()[0]
      if r in seen:
        continue
      seen.add(r)
      dedup.append(i)
    steps = ['Heat the oven to 200C.',
             f'Cut {join(vrefs)} into chunks.',
             f'Toss in a large roasting tin with {join(["olive-oil"] + [s for s in srefs if s not in vrefs])}.']
    prep = p.get('cut')
    if prep:
      steps.append(f'{prep} {t(pref)}.')
    if p['quick']:
      steps.append('Roast 20 minutes, until the vegetables start to colour.')
      steps.append(f'Add {t(pref)} to the tin. Roast {p["mins"]} minutes more, until {p["done"]}.')
    else:
      steps.append(f'Add {t(pref)}. Turn to coat.')
      steps.append(f'Roast {p["mins"]} minutes, turning once, until {p["done"]}.')
    steps.append(f['finish_step'])
    swaps = [('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')] if 'pesto' in srefs else []
    b.R(f'{fk}-{pk}', f['title'].format(p=p['name']), 'main', dedup, steps, serves=4, tier='everyday',
        cuisine=f['cuisine'], swaps=swaps, note='One tin, one wash-up.')
