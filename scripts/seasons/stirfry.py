# scripts/seasons/stirfry.py — 27 Nov 2026 v1
# Phase 44. Stir-fries: a hot wok, a protein, a sauce, noodles or rice.
from build import Book
from gen import t, join, refs_of

b = Book('stirfry', 'Stir-fries', 'sf')

PRO = {
  'chicken': ('chicken', 'chicken-breast-skinless 2', 'Slice {p} thinly.', 5),
  'beef': ('beef', 'beef-sirloin 2', 'Slice {p} thinly across the grain.', 2),
  'prawn': ('king prawn', 'king-prawns-raw 300g', 'Pat {p} dry.', 3),
  'tofu': ('tofu', 'tofu-firm 1', 'Press {p}. Cut into cubes.', 6),
  'pork': ('pork', 'pork-tenderloin 400g', 'Slice {p} thinly.', 4),
}
SAUCE = {
  'black-bean': ('{P} and pepper stir-fry with garlic and soy', 'Chinese', ['soy-sauce 3tbsp', 'garlic-clove 3', 'ginger-fresh 1tbsp'], ['pepper-bell 2', 'onion-medium 1'], 'egg-noodles-dry 250g'),
  'teriyaki': ('Teriyaki {p} stir-fry with broccoli', 'Japanese', ['soy-sauce 3tbsp', 'mirin 2tbsp', 'honey 1tbsp'], ['broccoli-head 1', 'spring-onion 4'], 'rice-white-cooked 2'),
  'sweet-chilli': ('Sweet chilli {p} stir-fry', 'Thai', ['sweet-chilli-sauce 4tbsp', 'lime 1', 'fish-sauce 1tbsp'], ['pepper-bell 1', 'sugar-snap-peas 150g'], 'rice-noodles-dry 200g'),
  'hoisin': ('Hoisin {p} with greens and noodles', 'Chinese', ['hoisin-sauce 4tbsp', 'soy-sauce 1tbsp', 'ginger-fresh 1tbsp'], ['pak-choi 2', 'beansprouts 150g'], 'egg-noodles-dry 250g'),
  'peanut': ('Peanut and lime {p} stir-fry', 'Thai', ['peanut-butter 3tbsp', 'soy-sauce 2tbsp', 'lime 1'], ['carrot-medium 2', 'red-cabbage 150g'], 'rice-noodles-dry 200g'),
}
SKIP = {('beef', 'peanut'), ('prawn', 'hoisin'), ('tofu', 'sweet-chilli')}
for pk, (pname, ping, prep, mins) in PRO.items():
  for sk, (title, cui, sauce, veg, carb) in SAUCE.items():
    if (pk, sk) in SKIP:
      continue
    pref = ping.split()[0]
    cref = carb.split()[0]
    sref = refs_of(sauce)
    if pk == 'tofu' and 'fish-sauce' in sref:
      continue
    ings = [ping, 'vegetable-oil 2tbsp'] + veg + sauce + [carb]
    steps = [prep.replace('{p}', t(pref)),
             f'Mix {join(sref)} with 3 tbsp water.',
             f'Get {t(cref)} ready: soak or heat as the packet says.',
             f'Heat {t("vegetable-oil")} in a wok on the highest heat until it shimmers.',
             f'Stir-fry {t(pref)} {mins} minutes, until browned. Lift out.',
             f'Stir-fry {join(refs_of(veg))} 3 minutes, until bright but crisp.',
             f'Return the {pname}. Add the sauce and {t(cref)}. Toss 1 minute until glossy.']
    name = title.replace('{P}', pname.capitalize()).replace('{p}', pname)
    b.R(f'{sk}-{pk}', name, 'main', ings, steps, serves=4, tier='budget', cuisine=cui,
        note='Have everything cut before the wok goes on. It moves fast.')
