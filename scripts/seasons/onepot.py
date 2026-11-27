# scripts/seasons/onepot.py — 27 Nov 2026 v1
# Phase 44. One pot on the hob: curries, pastas cooked in their sauce, and
# rice dishes where the rice cooks in the pan with everything else.
from build import Book
from gen import t, join, refs_of

b = Book('onepot', 'One pot', 'op')


def dd(ings):
  seen, out = set(), []
  for i in ings:
    r = i.split()[0]
    if r not in seen:
      seen.add(r); out.append(i)
  return out


# ---- Curries: protein x style ----
PRO = {
  'chicken': dict(name='chicken', ing='chicken-thigh-boneless 8', cut='Cut {p} into chunks.', add='Add {p}. Stir 3 minutes to seal.', mins=20, done='the chicken is cooked through'),
  'prawn': dict(name='king prawn', ing='king-prawns-raw 400g', late=True, mins=4, done='the prawns are pink'),
  'chickpea': dict(name='chickpea', ing='chickpeas-tinned 2', cut='Drain {p}.', add='Add {p}.', mins=15, done='the sauce is thick'),
  'paneer': dict(name='paneer', ing='paneer 1', cut='Cube {p}.', late=True, mins=5, done='the paneer is soft and hot'),
  'lentil': dict(name='red lentil', ing='lentils-red-dry 200g', add='Rinse and add {p} with 400 ml water.', mins=25, done='the lentils collapse'),
  'cauliflower': dict(name='cauliflower', ing='cauliflower-head 1', cut='Cut {p} into small florets.', add='Add {p}.', mins=15, done='the cauliflower is tender'),
  'egg': dict(name='egg', ing='egg-medium 8', late=True, mins=3, done='the eggs are hot through', cut='Boil {p} 8 minutes in a small pan. Cool, peel and halve.'),
  'aubergine': dict(name='aubergine', ing='aubergine 2', cut='Cut {p} into chunks.', add='Add {p}. Stir 3 minutes.', mins=20, done='the aubergine is soft'),
  'tofu': dict(name='tofu', ing='tofu-firm 1', cut='Press {p}. Cut into cubes.', late=True, mins=5, done='the tofu is hot through'),
  'squash': dict(name='squash and spinach', ing='butternut-squash 1', cut='Peel and dice half of {p}.', add='Add {p}.', mins=20, done='the squash is soft'),
}
CURRY = {
  'korma': dict(title='Mild coconut {p} korma', cuisine='Indian', paste=['curry-powder 2tbsp', 'garam-masala 1tsp'],
                liquid=['coconut-milk-tinned 1'], extra=['ground-almonds 40g'], fin=['fresh-coriander 10g'], fs='Scatter with {fresh-coriander}.'),
  'tikka': dict(title='{P} tikka masala', cuisine='Indian', paste=['garam-masala 2tbsp', 'smoked-paprika 1tsp', 'ginger-fresh 1tbsp'],
                liquid=['chopped-tomatoes-tinned 1'], extra=['double-cream 100ml'], fin=['fresh-coriander 10g'], fs='Stir in {double-cream}. Scatter with {fresh-coriander}.'),
  'green': dict(title='Thai green {p} curry', cuisine='Thai', paste=['thai-green-curry-paste 3tbsp'],
                liquid=['coconut-milk-tinned 1'], extra=['green-beans 150g'], fin=['lime 1', 'fresh-basil 10g'], fs='Squeeze in {lime}. Tear over {fresh-basil}.'),
  'red': dict(title='Thai red {p} curry with peppers', cuisine='Thai', paste=['thai-red-curry-paste 3tbsp'],
              liquid=['coconut-milk-tinned 1'], extra=['pepper-bell 2'], fin=['lime 1', 'fresh-coriander 10g'], fs='Squeeze in {lime}. Scatter with {fresh-coriander}.'),
  'massaman': dict(title='Massaman {p} curry with potatoes', cuisine='Thai', paste=['massaman-curry-paste 3tbsp'],
                   liquid=['coconut-milk-tinned 1'], extra=['potato-medium 2'], fin=['peanuts 40g'], fs='Scatter with chopped {peanuts}.'),
  'jalfrezi': dict(title='{P} jalfrezi', cuisine='Indian', paste=['curry-powder 2tbsp', 'chilli-fresh 2'],
                   liquid=['chopped-tomatoes-tinned 1'], extra=['pepper-bell 2'], fin=['fresh-coriander 10g'], fs='Scatter with {fresh-coriander}.'),
  'saag': dict(title='Saag {p} with spinach', cuisine='Indian', paste=['garam-masala 2tsp', 'cumin-ground 1tsp', 'ginger-fresh 1tbsp'],
               liquid=['chopped-tomatoes-tinned 1'], extra=['spinach 250g'], fin=['natural-yoghurt 100g'], fs='Swirl in {natural-yoghurt}.'),
  'dhansak': dict(title='{P} dhansak with lentils', cuisine='Indian', paste=['curry-powder 2tbsp', 'cumin-ground 1tsp'],
                  liquid=['chopped-tomatoes-tinned 1'], extra=['lentils-red-dry 100g', 'butternut-squash 1'], fin=['lemon 1', 'fresh-coriander 10g'], fs='Squeeze in {lemon}. Scatter with {fresh-coriander}.'),
  'srilankan': dict(title='Sri Lankan coconut {p} curry', cuisine='Sri Lankan', paste=['curry-powder 2tbsp', 'curry-leaves 10', 'cinnamon-stick 1'],
                    liquid=['coconut-milk-tinned 1'], extra=['tomato-medium 2'], fin=['lime 1'], fs='Squeeze in {lime}.'),
}
SKIP = {('paneer', 'green'), ('paneer', 'red'), ('paneer', 'massaman'), ('lentil', 'massaman'), ('lentil', 'green'), ('lentil', 'red'),
        ('lentil', 'jalfrezi'), ('squash', 'tikka'), ('egg', 'green'), ('egg', 'red'), ('egg', 'massaman'), ('tofu', 'korma'), ('tofu', 'tikka'), ('egg', 'jalfrezi'), ('lentil', 'dhansak'), ('squash', 'dhansak'), ('lentil', 'saag'), ('prawn', 'dhansak'), ('tofu', 'dhansak'), ('cauliflower', 'massaman'), ('prawn', 'korma')}

for pk, p in PRO.items():
  for ck, c in CURRY.items():
    if (pk, ck) in SKIP:
      continue
    pref = p['ing'].split()[0]
    ings = dd(['vegetable-oil 2tbsp', 'onion-medium 1', 'garlic-clove 3'] + c['paste'] + [p['ing']] + c['extra'] + c['liquid'] + c['fin']
              + (['naan-bread 4'] if c['cuisine'] == 'Indian' else []))
    pt = lambda s: s.replace('{p}', t(pref))
    steps = ['Put a large pan on a medium heat. Add {vegetable-oil}.',
             'Chop {onion-medium}. Fry 8 minutes, until soft and golden.',
             f'Add {t("garlic-clove")} and {join(refs_of(c["paste"]))}. Fry 1 minute, until fragrant.']
    if p.get('cut'):
      steps.append(pt(p['cut']))
    if not p.get('late'):
      steps.append(pt(p.get('add', 'Add {p}.')))
    xrefs = refs_of(c['extra'])
    xr = [x for x in xrefs if x not in ('double-cream',)]
    steps.append(f'Add {join(refs_of(c["liquid"]) + xr)}.' if xr else f'Add {join(refs_of(c["liquid"]))}.')
    if p.get('late'):
      steps.append('Simmer 12 minutes, until thickened.')
      steps.append(f'Add {t(pref)}. Simmer {p["mins"]} minutes, until {p["done"]}.')
    else:
      steps.append(f'Simmer {p["mins"]} minutes, stirring now and then, until {p["done"]}.')
    steps.append(c['fs'])
    if c['cuisine'] == 'Indian':
      steps.append('Warm {naan-bread} to serve.')
    name = c['title'].replace('{P}', p['name'].capitalize()).replace('{p}', p['name'])
    b.R(f'{ck}-{pk}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=c['cuisine'],
        note='All in one pan. Rice or bread on the side if you like.')

# ---- Pasta cooked in its sauce ----
PASTA = [
  ('tomato-basil', 'One-pot tomato and basil pasta', 'Italian', ['penne-dry 400g', 'chopped-tomatoes-tinned 2', 'garlic-clove 3', 'olive-oil 2tbsp', 'fresh-basil 15g', 'parmesan 40g'], 'Tear in {fresh-basil}. Top with grated {parmesan}.'),
  ('creamy-mushroom', 'One-pot creamy mushroom pasta', 'Italian', ['penne-dry 400g', 'mushroom-chestnut 16', 'garlic-clove 3', 'olive-oil 2tbsp', 'stock-vegetable 900ml', 'creme-fraiche 150ml', 'fresh-thyme 4'], 'Stir in {creme-fraiche} and {fresh-thyme} leaves.'),
  ('sausage-fennel', 'One-pot sausage, fennel and tomato pasta', 'Italian', ['sausage-pork 6', 'fennel-seeds 1tsp', 'penne-dry 400g', 'passata 500g', 'olive-oil 1tbsp', 'chilli-flakes 0.5tsp', 'parmesan 30g'], 'Top with grated {parmesan}.'),
  ('lemon-spinach', 'One-pot lemon, spinach and ricotta pasta', 'Italian', ['penne-dry 400g', 'garlic-clove 2', 'olive-oil 2tbsp', 'stock-vegetable 900ml', 'spinach 150g', 'ricotta 200g', 'lemon 1'], 'Stir in {spinach}, {ricotta} and the zest and juice of {lemon}.'),
  ('tuna-sweetcorn', 'One-pot tuna and sweetcorn pasta', 'British', ['penne-dry 400g', 'passata 500g', 'tuna-tinned-in-spring-water 2', 'sweetcorn-tinned 1', 'cheddar-cheese 80g'], 'Stir in drained {tuna-tinned-in-spring-water} and {sweetcorn-tinned}. Top with grated {cheddar-cheese}.'),
  ('pea-bacon', 'One-pot pea and bacon pasta', 'British', ['bacon-rasher-back 6', 'olive-oil 1tbsp', 'penne-dry 400g', 'stock-chicken 900ml', 'peas-frozen 200g', 'creme-fraiche 100ml'], 'Stir in {peas-frozen} for the last 3 minutes, then {creme-fraiche}.'),
  ('arrabbiata', 'One-pot penne arrabbiata', 'Italian', ['olive-oil 3tbsp', 'garlic-clove 4', 'chilli-flakes 1tsp', 'penne-dry 400g', 'chopped-tomatoes-tinned 2', 'fresh-parsley 15g'], 'Scatter with chopped {fresh-parsley}.'),
  ('broccoli-anchovy', 'One-pot broccoli, anchovy and chilli pasta', 'Italian', ['olive-oil 3tbsp', 'anchovy-fillet 6', 'garlic-clove 3', 'chilli-flakes 0.5tsp', 'penne-dry 400g', 'stock-vegetable 900ml', 'broccoli-head 1', 'lemon 1'], 'Squeeze over {lemon}.'),
  ('chorizo-pepper', 'One-pot chorizo and pepper pasta', 'Spanish', ['chorizo 120g', 'pepper-bell 2', 'penne-dry 400g', 'passata 500g', 'smoked-paprika 1tsp', 'fresh-parsley 10g'], 'Scatter with {fresh-parsley}.'),
  ('aubergine-feta', 'One-pot aubergine, tomato and feta pasta', 'Greek', ['olive-oil 3tbsp', 'aubergine 1', 'garlic-clove 2', 'penne-dry 400g', 'chopped-tomatoes-tinned 2', 'dried-oregano 1tsp', 'feta 150g'], 'Crumble over {feta}.'),
]
for key, name, cui, ings, fin in PASTA:
  refs = refs_of(ings)
  first = [r for r in refs if r in ('olive-oil', 'sausage-pork', 'bacon-rasher-back', 'chorizo', 'anchovy-fillet')]
  liquid = [r for r in refs if r in ('chopped-tomatoes-tinned', 'passata', 'stock-vegetable', 'stock-chicken')]
  veg = [r for r in refs if r in ('garlic-clove', 'mushroom-chestnut', 'aubergine', 'pepper-bell', 'fennel-seeds', 'chilli-flakes')]
  steps = ['Put a large, deep pan on a medium heat.']
  if first:
    steps.append(f'Add {join(first)}. Fry 4 minutes' + (', breaking the sausage out of its skins.' if 'sausage-pork' in refs else '.'))
  if veg:
    steps.append(f'Add {join(veg)}. Fry 4 minutes, until soft.')
  steps.append(f'Add {t("penne-dry")}, {join(liquid)} and 600 ml water.' if 'stock-vegetable' not in liquid and 'stock-chicken' not in liquid else f'Add {t("penne-dry")} and {join(liquid)}.')
  steps.append('Simmer 12 minutes, stirring often, until the pasta is tender and the sauce thick.')
  steps.append(fin)
  b.R(f'pasta-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui,
      note='The pasta cooks in the sauce, so its starch thickens it. Stir so it does not stick.')

# ---- Rice in the pan ----
RICE = [
  ('jambalaya', 'Chicken and pepper jambalaya', 'American', ['olive-oil 2tbsp', 'chicken-thigh-boneless 6', 'onion-medium 1', 'pepper-bell 2', 'celery-stick 2', 'smoked-paprika 2tsp', 'rice-basmati-dry 300g', 'chopped-tomatoes-tinned 1', 'stock-chicken 700ml', 'spring-onion 3']),
  ('prawn-pilaf', 'King prawn and pea pilaf', 'Middle Eastern', ['olive-oil 2tbsp', 'onion-medium 1', 'cumin-ground 1tsp', 'rice-basmati-dry 300g', 'stock-vegetable 700ml', 'king-prawns-raw 300g', 'peas-frozen 150g', 'lemon 1']),
  ('mushroom-pilau', 'Mushroom pilau rice', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'mushroom-chestnut 12', 'garam-masala 1tsp', 'cardamom 4', 'rice-basmati-dry 300g', 'stock-vegetable 700ml', 'fresh-coriander 10g']),
  ('spanish-veg-rice', 'Spanish vegetable rice', 'Spanish', ['olive-oil 3tbsp', 'onion-medium 1', 'pepper-bell 2', 'courgette 1', 'smoked-paprika 2tsp', 'saffron 0.25tsp', 'rice-arborio-dry 300g', 'stock-vegetable 900ml', 'peas-frozen 100g', 'lemon 1']),
  ('chicken-chorizo-rice', 'Chicken and chorizo rice', 'Spanish', ['chorizo 100g', 'chicken-thigh-boneless 6', 'onion-medium 1', 'pepper-bell 1', 'smoked-paprika 1tsp', 'rice-basmati-dry 300g', 'chopped-tomatoes-tinned 1', 'stock-chicken 700ml', 'fresh-parsley 10g']),
  ('egg-curry-rice', 'Spiced egg and tomato rice', 'Indian', ['vegetable-oil 2tbsp', 'onion-medium 1', 'curry-powder 2tsp', 'rice-basmati-dry 300g', 'chopped-tomatoes-tinned 1', 'stock-vegetable 600ml', 'egg-medium 4', 'fresh-coriander 10g']),
  ('black-bean-rice', 'Black bean and corn rice', 'Mexican', ['olive-oil 2tbsp', 'onion-medium 1', 'cumin-ground 1tsp', 'rice-basmati-dry 300g', 'stock-vegetable 700ml', 'black-beans-tinned 1', 'sweetcorn-tinned 1', 'lime 1', 'fresh-coriander 10g']),
  ('lemon-chicken-rice', 'Lemon and herb chicken rice', 'Greek', ['olive-oil 2tbsp', 'chicken-thigh-boneless 6', 'onion-medium 1', 'garlic-clove 2', 'dried-oregano 1tsp', 'rice-basmati-dry 300g', 'stock-chicken 700ml', 'lemon 1', 'fresh-parsley 15g']),
]
for key, name, cui, ings in RICE:
  refs = refs_of(ings)
  meat = [r for r in refs if r in ('chicken-thigh-boneless', 'chorizo')]
  base = [r for r in refs if r in ('onion-medium', 'pepper-bell', 'celery-stick', 'mushroom-chestnut', 'courgette', 'garlic-clove')]
  spice = [r for r in refs if r in ('smoked-paprika', 'cumin-ground', 'garam-masala', 'cardamom', 'saffron', 'curry-powder', 'dried-oregano')]
  oil = [r for r in refs if r in ('olive-oil', 'vegetable-oil')]
  rice = [r for r in refs if r.startswith('rice-')][0]
  liquid = [r for r in refs if r in ('chopped-tomatoes-tinned', 'stock-chicken', 'stock-vegetable')]
  late = [r for r in refs if r in ('king-prawns-raw', 'peas-frozen', 'black-beans-tinned', 'sweetcorn-tinned', 'egg-medium')]
  fin = [r for r in refs if r in ('lemon', 'lime', 'fresh-coriander', 'fresh-parsley', 'spring-onion')]
  steps = ['Put a large, deep pan with a lid on a medium heat.']
  if oil:
    steps.append(f'Add {join(oil)}.')
  if meat:
    steps.append(f'Cut {join(meat)} into chunks. Brown 6 minutes.')
  steps.append(f'Add {join(base)}. Fry 8 minutes, until soft.')
  steps.append(f'Stir in {join(spice)} and {t(rice)} for 1 minute.')
  steps.append(f'Add {join(liquid)}. Cover. Simmer 12 minutes.')
  if 'egg-medium' in late:
    steps.append('Make 4 dips in the rice. Crack in {egg-medium}. Cover. Cook 5 minutes, until the whites set.')
    late = [x for x in late if x != 'egg-medium']
  if late:
    steps.append(f'Stir in {join(late)}. Cover. Cook 5 minutes, until hot through and the rice is tender.')
  steps.append(f'Rest 5 minutes off the heat. Finish with {join(fin)}.')
  b.R(f'rice-{key}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui,
      note='Keep the lid on while it simmers; the steam cooks the rice.')
