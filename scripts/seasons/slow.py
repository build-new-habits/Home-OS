# scripts/seasons/slow.py — 27 Nov 2026 v1
# Phase 44. Slow-cooked casseroles: one casserole, a low oven, hours of
# nothing to do. Browned first, then left alone.
from build import Book
from gen import t, join, refs_of

b = Book('slow', 'Slow-cooked', 'slow')

MEATS = {
  'beef': dict(name='beef', ing='beef-braising 900g', hours='3 hours', done='the beef falls apart', flour=True),
  'lamb': dict(name='lamb', ing='lamb-leg 900g', hours='2 hours 30 minutes', done='the lamb is meltingly tender', flour=True),
  'pork': dict(name='pork', ing='pork-shoulder 1000g', hours='3 hours', done='the pork pulls apart', flour=True),
  'chicken': dict(name='chicken', ing='chicken-thigh-boneless 10', hours='2 hours', done='the chicken is very tender', flour=False),
  'bean': dict(name='bean', ing='butter-beans-tinned 3', hours='2 hours', done='the sauce is thick and rich', flour=False, veg=True),
}

STYLES = {
  'red-wine': dict(title='Slow-cooked {p} in red wine with mushrooms', cuisine='French',
                   base=['onion-medium 2', 'carrot-medium 3', 'mushroom-chestnut 12'], liquid=['wine-red 300ml', 'stock-cube 1'],
                   herbs=['bay-leaf 2', 'fresh-thyme 4'], finish=['fresh-parsley 15g'], fin='Scatter with chopped {fresh-parsley}.'),
  'cider': dict(title='Slow-cooked {p} with cider and mustard', cuisine='British',
                base=['onion-medium 2', 'carrot-medium 2', 'apple-medium 2'], liquid=['cider-dry 400ml', 'stock-cube 1'],
                herbs=['fresh-sage 6', 'bay-leaf 2'], finish=['wholegrain-mustard 2tbsp', 'creme-fraiche 100ml'], fin='Stir in {wholegrain-mustard} and {creme-fraiche}.'),
  'moroccan': dict(title='Slow-cooked Moroccan {p} with apricots', cuisine='Middle Eastern',
                   base=['onion-medium 2', 'butternut-squash 1', 'dried-apricots 120g'], liquid=['chopped-tomatoes-tinned 1', 'stock-cube 1'],
                   herbs=['ras-el-hanout 2tbsp', 'cinnamon-stick 1'], finish=['fresh-coriander 15g', 'lemon 1'], fin='Squeeze in {lemon}. Scatter with {fresh-coriander}.'),
  'chilli': dict(title='Slow-cooked {p} chilli with black beans', cuisine='Mexican',
                 base=['onion-medium 2', 'pepper-bell 2', 'black-beans-tinned 1'], liquid=['chopped-tomatoes-tinned 2', 'stock-cube 1'],
                 herbs=['cumin-ground 2tsp', 'smoked-paprika 2tsp', 'chilli-powder 1tsp'], finish=['lime 1', 'fresh-coriander 15g'], fin='Squeeze in {lime}. Scatter with {fresh-coriander}.'),
  'italian': dict(title='Slow-cooked Italian {p} with tomato and rosemary', cuisine='Italian',
                  base=['onion-medium 2', 'celery-stick 2', 'carrot-medium 2'], liquid=['passata 500g', 'wine-white 200ml'],
                  herbs=['fresh-rosemary 2', 'garlic-clove 4'], finish=['fresh-basil 10g'], fin='Tear over {fresh-basil}.'),
  'greek': dict(title='Slow-cooked Greek {p} stifado', cuisine='Greek',
                base=['shallot 12', 'garlic-clove 4'], liquid=['chopped-tomatoes-tinned 1', 'wine-red 200ml'],
                herbs=['cinnamon-stick 1', 'bay-leaf 2', 'allspice 0.5tsp'], finish=['fresh-parsley 15g'], fin='Scatter with chopped {fresh-parsley}.'),
  'goulash': dict(title='Slow-cooked {p} goulash', cuisine='Hungarian',
                  base=['onion-large 2', 'pepper-bell 2', 'potato-medium 3'], liquid=['chopped-tomatoes-tinned 1', 'stock-cube 1'],
                  herbs=['paprika 2tbsp', 'caraway-seeds 1tsp'], finish=['soured-cream 150ml'], fin='Serve with a spoon of {soured-cream} on each.'),
  'bbq': dict(title='Slow-cooked barbecue {p} with smoky beans', cuisine='American',
              base=['onion-large 2', 'garlic-clove 4'], liquid=['passata 400g', 'cannellini-beans-tinned 1'],
              herbs=['smoked-paprika 2tbsp', 'sugar-soft-brown 2tbsp', 'mustard-dijon 1tbsp'], finish=['spring-onion 4'], fin='Scatter with sliced {spring-onion}.'),
  'curry': dict(title='Slow-cooked {p} curry with spinach', cuisine='Indian',
                base=['onion-large 2', 'garlic-clove 4', 'ginger-fresh 1tbsp'], liquid=['chopped-tomatoes-tinned 1', 'coconut-milk-tinned 1'],
                herbs=['garam-masala 2tbsp', 'turmeric-ground 1tsp'], finish=['spinach 150g', 'fresh-coriander 10g'], fin='Stir in {spinach} until wilted. Scatter with {fresh-coriander}.'),
}

SKIP = {('lamb', 'bbq'), ('bean', 'cider'), ('chicken', 'greek'), ('pork', 'greek'), ('bean', 'greek')}

for mk, m in MEATS.items():
  for sk, s in STYLES.items():
    if (mk, sk) in SKIP:
      continue
    pref = m['ing'].split()[0]
    ings = [m['ing']] + (['flour-plain 2tbsp'] if m['flour'] else []) + ['olive-oil 2tbsp'] + s['base'] + s['herbs'] + s['liquid'] + s['finish']
    seen, dd = set(), []
    for i in ings:
      r = i.split()[0]
      if r not in seen:
        seen.add(r); dd.append(i)
    steps = ['Heat the oven to 150C.']
    if m.get('veg'):
      steps.append(f'Warm {t("olive-oil")} in a casserole on a medium heat.')
    else:
      steps.append(f'Cut {t(pref)} into large chunks.' + (f' Toss in {t("flour-plain")}.' if m['flour'] else ''))
      steps.append(f'Brown in {t("olive-oil")} in a casserole, in batches. Lift out. || Browning in batches stops the meat stewing grey.')
    steps.append(f'Add {join(refs_of(s["base"]))}. Fry 8 minutes, until soft.')
    steps.append(f'Stir in {join(refs_of(s["herbs"]))}.')
    liq = refs_of(s['liquid'])
    stock = 'stock-cube' in liq
    ltext = join([x for x in liq if x != 'stock-cube']) + (f', then {t("stock-cube")} crumbled into 300 ml water' if stock else '')
    steps.append(f'Add {ltext}.')
    if m.get('veg'):
      steps.append(f'Drain {t(pref)}. Add to the casserole. Cover.')
    else:
      steps.append('Return the meat. Cover with a lid.')
    steps.append(f'Cook in the oven {m["hours"]}, until {m["done"]}.')
    steps.append(s['fin'])
    b.R(f'{sk}-{mk}', s['title'].format(p=m['name']), 'main', dd, steps, serves=6, tier='everyday', cuisine=s['cuisine'],
        note='Better the next day. It freezes well.')
