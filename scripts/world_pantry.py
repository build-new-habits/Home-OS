#!/usr/bin/env python3
# scripts/world_pantry.py — 27 Nov 2026 v1
# Phase 38. The world pantry and Christmas ingredients in
# data/food_reference.json, and UK-style carbohydrate everywhere.
#
# Graeme, 27 Nov 2026: "All ingredients, including bottle green peppercorns,
# spices, kaffir lime leaves, pastes, etc need macros, so this needs updating
# as a rule. It needs to be reliable and consistent for world foods and more
# common foods."
#
# ---- Where every figure comes from ----
# Each entry below names its source, and that source is written into the
# food's `basis` so anyone can check it:
#   ('uk', name)     McCance and Widdowson CoFID 2019 (data/cofid.json), by
#                    exact name. The UK's own tables come first.
#   ('us', name)     USDA SR Legacy (data/usda.json), by exact name, when the
#                    UK tables lack the food.
#   ('label', ...)   typical UK supermarket label values per 100 g, for
#                    foods neither table has (lime leaves, galangal, star
#                    anise, sumac, shrimp paste, blinis...). No brands.
#   ('blend', ...)   a spice blend worked out from its parts (five-spice).
#
# ---- One carbohydrate, the UK way ----
# UK labels and CoFID count carbohydrate WITHOUT fibre. USDA counts it WITH
# fibre ("by difference"). Mixing the two made cinnamon 81 g carbohydrate
# per 100 g instead of 28, and chia seeds 42 instead of 8. Every USDA figure
# here has its fibre taken out, and older entries that had been copied from
# USDA unchanged are corrected (strict match on all five figures).
#
# Tests/pantry.mjs is the rule: every food has all five figures and a basis,
# figures cited from a table match that table, energy adds up, every library
# ingredient converts to grams, and world-food ingredient lines resolve.
#
# Run: python3 scripts/world_pantry.py   (idempotent: replaces its own slugs)

import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LABEL = 'Typical of UK supermarket labels per 100 g; brands vary.'

SPEC = [
  # ---------------- Meat and poultry ----------------
  dict(slug='turkey-crown', name='Turkey crown', category='food_fresh', aliases=['turkey', 'turkey breast joint', 'turkey crown joint', 'whole turkey'],
       src=('us', 'Turkey, all classes, breast, meat and skin, raw')),
  dict(slug='gammon-joint', name='Gammon joint', category='food_fresh', aliases=['gammon', 'ham joint', 'unsmoked gammon', 'smoked gammon'],
       src=('uk', 'Ham, gammon joint, raw')),
  dict(slug='beef-fillet', name='Beef fillet', category='food_fresh', aliases=['fillet steak', 'beef tenderloin', 'fillet of beef', 'tenderloin'],
       src=('uk', 'Beef, fillet steak, raw, lean and fat')),
  dict(slug='duck-leg', name='Duck leg', category='food_fresh', aliases=['duck legs', 'duck'], grams_per_item=200, item_label='leg',
       src=('us', 'Duck, domesticated, meat and skin, raw'), basis_extra='One leg is the meat and skin of a 300 g leg, about 200 g.'),
  dict(slug='chicken-livers', name='Chicken livers', category='food_fresh', aliases=['chicken liver', 'livers'],
       src=('uk', 'Liver, chicken, raw')),
  dict(slug='bacon-streaky-raw', name='Streaky bacon', category='food_fresh', aliases=['streaky bacon rashers', 'smoked streaky bacon'], grams_per_item=18, item_label='rasher',
       src=('uk', 'Bacon rashers, streaky, raw')),
  dict(slug='pancetta', name='Pancetta', category='food_fresh', aliases=['pancetta cubes', 'cubetti di pancetta', 'diced pancetta'],
       src=('label', 330, 17.0, 29.0, 0.5, 0.0, LABEL)),
  dict(slug='chipolatas', name='Chipolatas', category='food_fresh', aliases=['chipolata', 'cocktail sausages', 'pork chipolatas'], grams_per_item=22, item_label='chipolata',
       src=('uk', 'Sausages, pork, raw')),
  dict(slug='sausagemeat', name='Sausage meat', category='food_fresh', aliases=['sausagemeat', 'pork sausage meat'],
       src=('uk', 'Sausages, pork, raw')),
  dict(slug='venison-diced', name='Venison', category='food_fresh', aliases=['diced venison', 'venison steak'],
       src=('uk', 'Venison, meat only, raw')),
  dict(slug='lamb-leg', name='Leg of lamb', category='food_fresh', aliases=['lamb leg', 'lamb leg joint'],
       src=('us', 'Lamb, leg, shank half, separable lean only, trimmed to 1/4" fat, choice, raw')),

  # ---------------- Fish and shellfish ----------------
  dict(slug='hake-fillet', name='Hake fillet', category='food_fresh', aliases=['hake', 'white fish fillet'],
       src=('uk', 'Hake, flesh only, raw')),
  dict(slug='monkfish', name='Monkfish', category='food_fresh', aliases=['monkfish tail', 'monkfish fillet'],
       src=('uk', 'Monkfish, flesh only, raw')),
  dict(slug='trout-fillet', name='Trout fillet', category='food_fresh', aliases=['trout', 'rainbow trout'],
       src=('uk', 'Trout, rainbow, flesh only, raw')),
  dict(slug='king-prawns-raw', name='King prawns, raw', category='food_frozen', aliases=['raw king prawns', 'raw prawns', 'tiger prawns'], grams_per_item=15, item_label='prawn',
       src=('uk', 'Prawns, king, raw')),
  dict(slug='scallops', name='Scallops', category='food_fresh', aliases=['king scallops', 'scallop', 'scallops with roe'], grams_per_item=25, item_label='scallop',
       src=('us', 'Mollusks, scallop, mixed species, raw')),
  dict(slug='lobster-tail', name='Lobster tail', category='food_frozen', aliases=['lobster tails', 'lobster'], grams_per_item=140, item_label='tail',
       src=('us', 'Crustaceans, lobster, northern, raw'), basis_extra='One tail is about 140 g of meat.'),
  dict(slug='crab-white-meat', name='White crab meat', category='food_fresh', aliases=['crab meat', 'white crabmeat', 'crab'],
       src=('uk', 'Crab, white meat, purchased cooked')),
  dict(slug='mussels-cooked', name='Mussel meat, cooked', category='food_frozen', aliases=['mussels', 'cooked mussels', 'mussel meat'],
       src=('uk', 'Mussels, purchased cooked')),
  dict(slug='squid', name='Squid', category='food_fresh', aliases=['squid rings', 'calamari'],
       src=('uk', 'Squid, raw')),
  dict(slug='smoked-salmon-cold', name='Smoked salmon, cold-smoked', category='food_fresh', aliases=['scottish smoked salmon', 'smoked salmon slices', 'smoked salmon trimmings'],
       src=('uk', 'Salmon, smoked (cold-smoked)')),
  dict(slug='shrimp-paste', name='Shrimp paste', category='food_ambient', aliases=['belacan', 'blachan', 'kapi', 'terasi', 'trassi'], grams_per_ml=1.2,
       src=('label', 133, 20.0, 3.5, 7.0, 0.0, 'Typical of Thai and Malaysian shrimp-paste labels per 100 g; makers vary.')),

  # ---------------- Vegetables, fruit, herbs ----------------
  dict(slug='brussels-sprouts', name='Brussels sprouts', category='food_fresh', aliases=['sprouts', 'brussel sprouts'],
       src=('uk', 'Brussels sprouts, raw')),
  dict(slug='red-cabbage', name='Red cabbage', category='food_fresh', aliases=['red cabbage head'], grams_per_item=900, item_label='cabbage',
       src=('uk', 'Cabbage, red, raw')),
  dict(slug='celeriac', name='Celeriac', category='food_fresh', aliases=['celery root'],
       src=('uk', 'Celeriac, raw')),
  dict(slug='swede', name='Swede', category='food_fresh', aliases=['rutabaga'],
       src=('uk', 'Swede, flesh only, raw')),
  dict(slug='chestnuts-cooked', name='Chestnuts, cooked and peeled', category='food_ambient', aliases=['chestnuts', 'vacuum packed chestnuts', 'cooked chestnuts', 'whole chestnuts'],
       src=('label', 163, 2.4, 1.7, 33.0, 4.5, LABEL)),
  dict(slug='cranberries', name='Cranberries', category='food_fresh', aliases=['fresh cranberries', 'frozen cranberries'],
       src=('uk', 'Cranberries')),
  dict(slug='clementine', name='Clementine', category='food_fresh', aliases=['clementines', 'satsuma', 'satsumas', 'tangerine', 'easy peeler'], grams_per_item=60, item_label='clementine',
       src=('uk', 'Citrus fruit, soft/easy peelers, flesh only')),
  dict(slug='pomegranate-seeds', name='Pomegranate seeds', category='food_fresh', aliases=['pomegranate', 'pomegranate arils'],
       src=('uk', 'Pomegranate, flesh and pips'), fibre_note=True),
  dict(slug='cos-lettuce', name='Cos lettuce', category='food_fresh', aliases=['romaine', 'little gem', 'little gem lettuce', 'baby gem'],
       src=('us', 'Lettuce, cos or romaine, raw')),
  dict(slug='watercress', name='Watercress', category='food_fresh', aliases=['cress'],
       src=('uk', 'Watercress, raw')),
  dict(slug='rocket', name='Rocket', category='food_fresh', aliases=['arugula', 'wild rocket'],
       src=('uk', 'Rocket, raw')),
  dict(slug='galangal', name='Galangal', category='food_fresh', aliases=['galangal root', 'fresh galangal', 'blue ginger'], grams_per_ml=0.6,
       src=('label', 71, 1.0, 0.0, 15.0, 2.0, 'Typical of UK fresh and frozen galangal labels per 100 g.')),
  dict(slug='lime-leaves', name='Kaffir lime leaves', category='food_fresh', aliases=['kaffir lime leaf', 'makrut lime leaves', 'makrut lime leaf', 'lime leaves', 'lime leaf', 'thai lime leaves'], grams_per_item=0.5, item_label='leaf',
       src=('label', 71, 3.2, 2.3, 7.4, 4.0, 'Typical of UK fresh lime-leaf labels per 100 g. One leaf is about 0.5 g.')),
  dict(slug='curry-leaves', name='Curry leaves', category='food_fresh', aliases=['curry leaf', 'fresh curry leaves'], grams_per_item=0.2, item_label='leaf',
       src=('uk', 'Curry leaves, fresh'), fibre_note=True),
  dict(slug='fresh-sage', name='Fresh sage', category='food_fresh', aliases=['sage', 'sage leaves'], grams_per_item=0.5, item_label='leaf',
       src=('uk', 'Sage, fresh'), fibre_note=True),
  dict(slug='fresh-rosemary', name='Fresh rosemary', category='food_fresh', aliases=['rosemary', 'rosemary sprig', 'rosemary sprigs'], grams_per_item=1, item_label='sprig',
       src=('uk', 'Rosemary, fresh')),
  dict(slug='fresh-thyme', name='Fresh thyme', category='food_fresh', aliases=['thyme sprigs', 'thyme sprig', 'fresh thyme sprigs'], grams_per_item=0.5, item_label='sprig', grams_per_ml=0.25,
       src=('uk', 'Thyme, fresh')),
  dict(slug='fresh-dill', name='Fresh dill', category='food_fresh', aliases=['dill'], grams_per_ml=0.2,
       src=('uk', 'Dill, fresh')),
  dict(slug='chives', name='Chives', category='food_fresh', aliases=['fresh chives'], grams_per_ml=0.2,
       src=('uk', 'Chives, fresh')),
  dict(slug='fresh-tarragon', name='Fresh tarragon', category='food_fresh', aliases=['tarragon'], grams_per_ml=0.2,
       src=('uk', 'Tarragon, fresh'), fibre_note=True),
  dict(slug='lime-juice', name='Lime juice', category='food_fresh', aliases=['juice of a lime', 'fresh lime juice'], grams_per_ml=1.0,
       src=('us', 'Lime juice, raw')),
  dict(slug='horseradish-sauce', name='Horseradish sauce', category='food_ambient', aliases=['horseradish', 'creamed horseradish'], grams_per_ml=1.05,
       src=('uk', 'Horseradish sauce')),
  dict(slug='sun-dried-tomatoes', name='Sun-dried tomatoes in oil', category='food_ambient', aliases=['sundried tomatoes', 'sun dried tomatoes'],
       src=('us', 'Tomatoes, sun-dried, packed in oil, drained'), fibre_note=True),
  dict(slug='shiitake-dried', name='Dried mushrooms', category='food_ambient', aliases=['dried shiitake', 'dried porcini', 'porcini', 'dried wild mushrooms'],
       src=('us', 'Mushrooms, shiitake, dried'), basis_extra='Shiitake figures stand in for other dried mushrooms.'),

  # ---------------- Spices, whole and ground ----------------
  dict(slug='green-peppercorns-brine', name='Green peppercorns in brine', category='food_ambient', aliases=['green peppercorns', 'bottled green peppercorns', 'green peppercorns in brine drained'], grams_per_ml=0.6,
       src=('label', 76, 2.9, 1.5, 16.5, 2.0, 'Typical of UK and EU jar labels per 100 g drained. Fibre is not on most labels; 2 g is from a producer specification.')),
  dict(slug='black-peppercorns', name='Black peppercorns', category='food_ambient', aliases=['peppercorns', 'whole black peppercorns', 'mixed peppercorns'], grams_per_ml=0.55,
       src=('us', 'Spices, pepper, black')),
  dict(slug='white-pepper', name='White pepper', category='food_ambient', aliases=['ground white pepper'], grams_per_ml=0.5,
       src=('us', 'Spices, pepper, white'), fibre_note=True),
  dict(slug='cayenne-pepper', name='Cayenne pepper', category='food_ambient', aliases=['cayenne', 'ground cayenne'], grams_per_ml=0.5,
       src=('us', 'Spices, pepper, red or cayenne')),
  dict(slug='smoked-paprika', name='Smoked paprika', category='food_ambient', aliases=['pimenton', 'sweet smoked paprika'], grams_per_ml=0.45,
       src=('us', 'Spices, paprika')),
  dict(slug='cloves', name='Cloves', category='food_ambient', aliases=['whole cloves', 'ground cloves', 'clove'], grams_per_ml=0.45, grams_per_item=0.1, item_label='clove',
       src=('us', 'Spices, cloves, ground')),
  dict(slug='allspice', name='Allspice', category='food_ambient', aliases=['ground allspice', 'pimento', 'allspice berries'], grams_per_ml=0.4,
       src=('us', 'Spices, allspice, ground')),
  dict(slug='nutmeg', name='Nutmeg', category='food_ambient', aliases=['ground nutmeg', 'grated nutmeg', 'whole nutmeg'], grams_per_ml=0.45,
       src=('us', 'Spices, nutmeg, ground')),
  dict(slug='mace', name='Mace', category='food_ambient', aliases=['ground mace', 'blade mace'], grams_per_ml=0.35,
       src=('us', 'Spices, mace, ground')),
  dict(slug='cardamom', name='Cardamom', category='food_ambient', aliases=['cardamom pods', 'green cardamom', 'ground cardamom', 'cardamom pod'], grams_per_ml=0.4, grams_per_item=0.2, item_label='pod',
       src=('us', 'Spices, cardamom')),
  dict(slug='ginger-ground', name='Ground ginger', category='food_ambient', aliases=['ginger powder', 'dried ginger'], grams_per_ml=0.4,
       src=('us', 'Spices, ginger, ground')),
  dict(slug='star-anise', name='Star anise', category='food_ambient', aliases=['star anise pods', 'whole star anise', 'badian'], grams_per_item=0.6, item_label='pod',
       src=('label', 385, 17.6, 15.9, 35.6, 14.6, 'Typical of UK jar labels per 100 g. One whole star is about 0.6 g.')),
  dict(slug='cinnamon-stick', name='Cinnamon stick', category='food_ambient', aliases=['cinnamon sticks', 'cinnamon quill', 'cassia bark'], grams_per_item=3, item_label='stick',
       src=('us', 'Spices, cinnamon, ground'), basis_extra='The same spice as ground cinnamon. One stick is about 3 g.'),
  dict(slug='juniper-berries', name='Juniper berries', category='food_ambient', aliases=['juniper'], grams_per_item=0.1, item_label='berry', grams_per_ml=0.5,
       src=('label', 385, 19.8, 14.6, 37.3, 12.7, 'Typical of UK jar labels per 100 g.')),
  dict(slug='fennel-seeds', name='Fennel seeds', category='food_ambient', aliases=['fennel seed'], grams_per_ml=0.4,
       src=('us', 'Spices, fennel seed'), fibre_note=True),
  dict(slug='caraway-seeds', name='Caraway seeds', category='food_ambient', aliases=['caraway'], grams_per_ml=0.45,
       src=('us', 'Spices, caraway seed')),
  dict(slug='mustard-seeds', name='Mustard seeds', category='food_ambient', aliases=['black mustard seeds', 'yellow mustard seeds', 'brown mustard seeds'], grams_per_ml=0.65,
       src=('us', 'Spices, mustard seed, ground')),
  dict(slug='fenugreek-seeds', name='Fenugreek seeds', category='food_ambient', aliases=['fenugreek', 'methi seeds'], grams_per_ml=0.7,
       src=('us', 'Spices, fenugreek seed'), fibre_note=True),
  dict(slug='saffron', name='Saffron', category='food_ambient', aliases=['saffron strands', 'saffron threads', 'pinch of saffron'], grams_per_ml=0.15,
       src=('us', 'Spices, saffron'), fibre_note=True),
  dict(slug='sumac', name='Sumac', category='food_ambient', aliases=['ground sumac', 'sumak'], grams_per_ml=0.5,
       src=('label', 324, 3.8, 16.6, 17.6, 44.6, 'Typical of UK jar labels per 100 g.')),
  dict(slug='zaatar', name="Za'atar", category='food_ambient', aliases=['zaatar', 'zatar', 'zahtar'], grams_per_ml=0.45,
       src=('label', 427, 15.1, 31.6, 9.0, 23.2, 'Typical of UK jar labels per 100 g.')),
  dict(slug='ras-el-hanout', name='Ras el hanout', category='food_ambient', aliases=['ras el hanout spice', 'ras al hanout'], grams_per_ml=0.45,
       src=('label', 301, 8.4, 8.8, 35.1, 24.0, 'Typical of UK jar labels per 100 g.')),
  dict(slug='five-spice', name='Chinese five-spice', category='food_ambient', aliases=['five spice', 'chinese five spice', '5 spice', 'five-spice powder'], grams_per_ml=0.45,
       src=('blend', {'star-anise': 1, 'cinnamon-ground': 1, 'fennel-seeds': 1, 'cloves': 1, 'black-pepper-ground': 1},
            'Worked out from its usual equal parts of star anise, cinnamon, fennel seed, cloves and pepper.')),
  dict(slug='mixed-spice', name='Mixed spice', category='food_ambient', aliases=['ground mixed spice', 'pudding spice', 'pumpkin pie spice'], grams_per_ml=0.45,
       src=('us', 'Spices, pumpkin pie spice'), basis_extra='Pumpkin pie spice is the same blend: cinnamon, ginger, nutmeg and allspice.'),
  dict(slug='garlic-powder', name='Garlic powder', category='food_ambient', aliases=['garlic granules'], grams_per_ml=0.55,
       src=('us', 'Spices, garlic powder')),
  dict(slug='onion-powder', name='Onion powder', category='food_ambient', aliases=['onion granules'], grams_per_ml=0.5,
       src=('us', 'Spices, onion powder')),
  dict(slug='dried-sage', name='Dried sage', category='food_ambient', aliases=['rubbed sage', 'ground sage'], grams_per_ml=0.2,
       src=('us', 'Spices, sage, ground')),
  dict(slug='dried-rosemary', name='Dried rosemary', category='food_ambient', aliases=[], grams_per_ml=0.25,
       src=('us', 'Spices, rosemary, dried'), fibre_note=True),
  dict(slug='dried-mixed-herbs', name='Dried mixed herbs', category='food_ambient', aliases=['mixed herbs', 'herbes de provence', 'italian seasoning'], grams_per_ml=0.2,
       src=('blend', {'dried-thyme': 1, 'dried-oregano': 1, 'dried-sage': 1, 'dried-rosemary': 1},
            'Worked out from equal parts of thyme, oregano, sage and rosemary.')),

  # ---------------- Pastes, sauces, condiments (world) ----------------
  dict(slug='tamarind-pulp', name='Tamarind', category='food_ambient', aliases=['tamarind block', 'tamarind pulp', 'tamarind paste', 'tamarind concentrate'], grams_per_ml=1.2,
       src=('uk', 'Tamarind pulp, flesh only'), fibre_note=True),
  dict(slug='oyster-sauce', name='Oyster sauce', category='food_ambient', aliases=[], grams_per_ml=1.2,
       src=('us', 'Sauce, oyster, ready-to-serve')),
  dict(slug='hoisin-sauce', name='Hoisin sauce', category='food_ambient', aliases=['hoisin'], grams_per_ml=1.25,
       src=('us', 'Sauce, hoisin, ready-to-serve')),
  dict(slug='pomegranate-molasses', name='Pomegranate molasses', category='food_ambient', aliases=['pomegranate syrup'], grams_per_ml=1.35,
       src=('label', 316, 0.1, 0.5, 77.6, 0.5, 'Typical of UK bottle labels per 100 g.')),
  dict(slug='rose-water', name='Rose water', category='food_ambient', aliases=['rosewater', 'orange blossom water', 'orange flower water'], grams_per_ml=1.0,
       src=('label', 0, 0.0, 0.0, 0.0, 0.0, 'Distilled flower water: labels give no energy.')),
  dict(slug='nutritional-yeast', name='Nutritional yeast', category='food_ambient', aliases=['nutritional yeast flakes', 'yeast flakes', 'nooch'], grams_per_ml=0.3,
       src=('label', 349, 47.0, 5.0, 19.0, 20.0, LABEL)),
  dict(slug='palm-sugar', name='Palm sugar', category='food_ambient', aliases=['jaggery', 'coconut sugar', 'gula melaka'], grams_per_ml=0.85,
       src=('label', 383, 0.5, 0.1, 95.0, 0.0, LABEL)),
  dict(slug='rice-jasmine-dry', name='Jasmine rice', category='food_ambient', aliases=['thai jasmine rice', 'thai fragrant rice', 'jasmine rice dry', 'long grain rice'], grams_per_ml=0.85,
       src=('us', 'Rice, white, long-grain, regular, raw, unenriched')),
  dict(slug='gravy-granules', name='Gravy granules', category='food_ambient', aliases=['gravy powder', 'instant gravy'], grams_per_ml=0.6,
       src=('uk', 'Gravy instant granules')),
  dict(slug='cranberry-sauce', name='Cranberry sauce', category='food_ambient', aliases=['cranberry jelly'], grams_per_ml=1.3,
       src=('us', 'Cranberry sauce, canned, sweetened')),
  dict(slug='redcurrant-jelly', name='Redcurrant jelly', category='food_ambient', aliases=['red currant jelly'], grams_per_ml=1.35,
       src=('label', 258, 0.3, 0.1, 64.0, 0.4, LABEL)),

  # ---------------- Dairy and dairy-free ----------------
  dict(slug='creme-fraiche', name='Crème fraîche', category='food_fresh', aliases=['creme fraiche', 'full fat creme fraiche'], grams_per_ml=1.0,
       src=('uk', 'Creme fraiche, full fat')),
  dict(slug='soured-cream', name='Soured cream', category='food_fresh', aliases=['sour cream'], grams_per_ml=1.0,
       src=('label', 191, 2.7, 18.0, 4.3, 0.0, LABEL)),
  dict(slug='whipping-cream', name='Whipping cream', category='food_fresh', aliases=[], grams_per_ml=1.0,
       src=('uk', 'Cream, fresh, whipping')),
  dict(slug='mascarpone', name='Mascarpone', category='food_fresh', aliases=['mascarpone cheese'],
       src=('uk', 'Cheese, Mascarpone')),
  dict(slug='goats-cheese', name="Soft goats' cheese", category='food_fresh', aliases=['goats cheese', "goat's cheese", 'goat cheese', 'chevre'],
       src=('uk', 'Cheese, goats milk, full fat, soft, white rind')),
  dict(slug='stilton', name='Stilton', category='food_fresh', aliases=['blue stilton', 'blue cheese'],
       src=('uk', 'Cheese, Stilton, blue')),
  dict(slug='brie', name='Brie', category='food_fresh', aliases=['brie cheese'],
       src=('uk', 'Cheese, Brie, with outer rind removed')),
  dict(slug='camembert', name='Camembert', category='food_fresh', aliases=['whole camembert'],
       src=('uk', 'Cheese, Camembert')),
  dict(slug='gruyere', name='Gruyère', category='food_fresh', aliases=['gruyere', 'comte', 'emmental'],
       src=('uk', 'Cheese, Gruyere')),
  dict(slug='butter-unsalted', name='Unsalted butter', category='food_fresh', aliases=['butter unsalted'], grams_per_ml=0.96,
       src=('uk', 'Butter, unsalted')),
  dict(slug='soya-milk', name='Soya milk', category='food_fresh', aliases=['soy milk', 'unsweetened soya milk'], grams_per_ml=1.03,
       src=('uk', 'Milk, soya, non-dairy alternative to milk, unsweetened, fortified')),
  dict(slug='oat-cream', name='Oat cream', category='food_fresh', aliases=['oat single cream', 'dairy free cream', 'vegan cream'], grams_per_ml=1.0,
       src=('label', 150, 1.0, 13.0, 6.0, 0.8, LABEL)),
  dict(slug='soya-cream', name='Soya single cream', category='food_fresh', aliases=['soy cream', 'soya cream'], grams_per_ml=1.0,
       src=('label', 170, 2.6, 17.0, 1.6, 0.4, LABEL)),
  dict(slug='dairy-free-spread', name='Dairy-free spread', category='food_fresh', aliases=['vegan butter', 'plant butter', 'dairy free block', 'vegan block'], grams_per_ml=0.96,
       src=('label', 531, 0.5, 59.0, 0.5, 0.0, LABEL)),
  dict(slug='tofu-silken', name='Silken tofu', category='food_fresh', aliases=['silken tofu firm', 'soft tofu'],
       src=('us', 'MORI-NU, Tofu, silken, firm'), basis_extra='Silken tofu, firm.'),

  # ---------------- Baking and puddings ----------------
  dict(slug='suet-vegetable', name='Vegetable suet', category='food_ambient', aliases=['suet', 'shredded suet', 'beef suet'], grams_per_ml=0.5,
       src=('uk', 'Suet, vegetable, reduced fat'), basis_extra='The only vegetable suet in the UK tables.'),
  dict(slug='currants', name='Currants', category='food_ambient', aliases=['dried currants'], grams_per_ml=0.6,
       src=('us', 'Currants, zante, dried')),
  dict(slug='sultanas', name='Sultanas', category='food_ambient', aliases=['golden raisins'], grams_per_ml=0.6,
       src=('uk', 'Sultanas')),
  dict(slug='mixed-peel', name='Mixed peel', category='food_ambient', aliases=['candied peel', 'cut mixed peel'], grams_per_ml=0.6,
       src=('uk', 'Peel, mixed')),
  dict(slug='glace-cherries', name='Glacé cherries', category='food_ambient', aliases=['glace cherries', 'candied cherries'],
       src=('uk', 'Cherries, glace')),
  dict(slug='dried-cranberries', name='Dried cranberries', category='food_ambient', aliases=['craisins', 'sweetened dried cranberries'], grams_per_ml=0.55,
       src=('us', 'Cranberries, dried, sweetened (Includes foods for USDA\'s Food Distribution Program)')),
  dict(slug='dried-figs', name='Dried figs', category='food_ambient', aliases=['figs', 'ready to eat figs'],
       src=('uk', 'Figs, ready-to-eat, semi-dried')),
  dict(slug='prunes', name='Prunes', category='food_ambient', aliases=['pitted prunes', 'ready to eat prunes'],
       src=('uk', 'Prunes, flesh and skin')),
  dict(slug='mincemeat', name='Mincemeat', category='food_ambient', aliases=['mince pie filling', 'vegetarian mincemeat'], grams_per_ml=1.2,
       src=('uk', 'Mincemeat')),
  dict(slug='marzipan', name='Marzipan', category='food_ambient', aliases=['almond paste'],
       src=('uk', 'Marzipan, white and yellow, retail')),
  dict(slug='black-treacle', name='Black treacle', category='food_ambient', aliases=['treacle', 'molasses'], grams_per_ml=1.4,
       src=('uk', 'Treacle, black')),
  dict(slug='sugar-demerara', name='Demerara sugar', category='food_ambient', aliases=['demerara', 'raw cane sugar'], grams_per_ml=0.9,
       src=('uk', 'Sugar, Demerara')),
  dict(slug='sugar-muscovado', name='Dark muscovado sugar', category='food_ambient', aliases=['muscovado', 'dark brown sugar', 'dark muscovado', 'light muscovado'], grams_per_ml=0.8,
       src=('label', 379, 0.1, 0.0, 94.0, 0.0, LABEL)),
  dict(slug='ground-almonds', name='Ground almonds', category='food_ambient', aliases=['almond flour', 'flaked almonds', 'almond meal'], grams_per_ml=0.4,
       src=('uk', 'Almonds, flaked and ground')),
  dict(slug='pecans', name='Pecans', category='food_ambient', aliases=['pecan nuts', 'pecan halves'], grams_per_ml=0.45,
       src=('uk', 'Pecan nuts, kernel only')),
  dict(slug='hazelnuts', name='Hazelnuts', category='food_ambient', aliases=['blanched hazelnuts', 'cobnuts'], grams_per_ml=0.55,
       src=('uk', 'Hazelnuts, kernel only')),
  dict(slug='pistachios', name='Pistachios', category='food_ambient', aliases=['pistachio nuts', 'shelled pistachios'], grams_per_ml=0.5,
       src=('us', 'Nuts, pistachio nuts, raw')),
  dict(slug='brazil-nuts', name='Brazil nuts', category='food_ambient', aliases=['brazils'],
       src=('uk', 'Brazil nuts, kernel only')),
  dict(slug='pine-nuts', name='Pine nuts', category='food_ambient', aliases=['pine kernels', 'pignoli'], grams_per_ml=0.55,
       src=('uk', 'Pine nuts, kernel only')),
  dict(slug='dark-chocolate-70', name='Dark chocolate, 70%', category='food_ambient', aliases=['70% dark chocolate', 'plain chocolate 70', 'bitter chocolate', 'vegan dark chocolate'],
       src=('us', 'Chocolate, dark, 70-85% cacao solids')),
  dict(slug='white-chocolate', name='White chocolate', category='food_ambient', aliases=[],
       src=('uk', 'Chocolate, white'), fibre_note=True),
  dict(slug='custard-powder', name='Custard powder', category='food_ambient', aliases=[], grams_per_ml=0.55,
       src=('uk', 'Custard powder')),
  dict(slug='puff-pastry', name='Puff pastry', category='food_fresh', aliases=['ready rolled puff pastry', 'all butter puff pastry', 'puff pastry sheet'],
       src=('uk', 'Pastry, flaky/puff, retail, uncooked')),
  dict(slug='shortcrust-pastry', name='Shortcrust pastry', category='food_fresh', aliases=['ready rolled shortcrust pastry', 'sweet shortcrust pastry', 'shortcrust pastry block'],
       src=('label', 438, 5.8, 25.7, 44.3, 2.0, LABEL)),
  dict(slug='filo-pastry', name='Filo pastry', category='food_fresh', aliases=['phyllo', 'filo', 'filo sheets'], grams_per_item=25, item_label='sheet',
       src=('uk', 'Pastry, filo, retail, uncooked')),
  dict(slug='blinis', name='Blinis', category='food_ambient', aliases=['cocktail blinis', 'mini blinis', 'blini'], grams_per_item=8, item_label='blini',
       src=('label', 250, 7.0, 9.0, 34.0, 1.9, LABEL)),
  dict(slug='panko', name='Panko breadcrumbs', category='food_ambient', aliases=['panko', 'japanese breadcrumbs'], grams_per_ml=0.2,
       src=('label', 370, 11.0, 3.0, 74.0, 3.0, LABEL)),
  dict(slug='panettone', name='Panettone', category='food_ambient', aliases=['pandoro', 'italian christmas cake'],
       src=('label', 360, 7.2, 13.5, 52.0, 2.3, LABEL)),
  dict(slug='brioche', name='Brioche', category='food_ambient', aliases=['brioche loaf', 'brioche rolls'],
       src=('label', 360, 8.5, 13.0, 50.0, 2.0, LABEL)),
  dict(slug='sponge-fingers', name='Sponge fingers', category='food_ambient', aliases=['savoiardi', 'ladyfingers', 'trifle sponges'], grams_per_item=6, item_label='finger',
       src=('label', 390, 8.0, 4.0, 80.0, 1.0, LABEL)),
  dict(slug='stem-ginger', name='Stem ginger in syrup', category='food_ambient', aliases=['stem ginger', 'preserved ginger', 'crystallised ginger'], grams_per_item=12, item_label='ball',
       src=('label', 280, 0.3, 0.2, 69.0, 1.5, LABEL)),

  # ---------------- Christmas, second batch (27 Nov 2026) ----------------
  dict(slug='goose', name='Goose', category='food_fresh', aliases=['whole goose', 'goose crown'], grams_per_item=1800, item_label='goose',
       src=('uk', 'Goose, meat, raw, fat and skin'),
       basis_extra='One goose is a 4.5 kg oven-ready bird: about 1.8 kg of meat and skin once the bones and the fat that runs off are taken away.'),
  dict(slug='pheasant', name='Pheasant', category='food_fresh', aliases=['pheasant breasts', 'pheasant breast', 'brace of pheasant'],
       src=('us', 'Pheasant, raw, meat and skin')),
  dict(slug='beef-topside', name='Beef topside joint', category='food_fresh', aliases=['topside', 'roast beef joint', 'beef roasting joint', 'silverside'],
       src=('uk', 'Beef, topside, raw, lean and fat')),
  dict(slug='pork-belly', name='Pork belly', category='food_fresh', aliases=['pork belly joint', 'pork belly slices'],
       src=('uk', 'Pork, belly joint/slices, raw, lean and fat')),
  dict(slug='haddock-smoked', name='Smoked haddock', category='food_fresh', aliases=['undyed smoked haddock', 'smoked haddock fillet'],
       src=('us', 'Fish, haddock, smoked')),
  dict(slug='wild-rice', name='Wild rice', category='food_ambient', aliases=['wild rice dry', 'wild rice blend'], grams_per_ml=0.8,
       src=('uk', 'Rice, wild, raw')),
  dict(slug='ricotta', name='Ricotta', category='food_fresh', aliases=['ricotta cheese'],
       src=('uk', 'Cheese, Ricotta')),
  dict(slug='figs-fresh', name='Fresh figs', category='food_fresh', aliases=['fig', 'fresh fig'], grams_per_item=50, item_label='fig',
       src=('uk', 'Figs, whole green fruit, raw')),
  dict(slug='cherries', name='Cherries', category='food_fresh', aliases=['frozen cherries', 'pitted cherries', 'black cherries'],
       src=('uk', 'Cherries, flesh and skin, raw')),
  dict(slug='blackberries', name='Blackberries', category='food_fresh', aliases=['frozen blackberries', 'brambles'],
       src=('uk', 'Blackberries, raw')),
  dict(slug='fennel-bulb', name='Fennel bulb', category='food_fresh', aliases=['fennel', 'florence fennel'], grams_per_item=250, item_label='bulb',
       src=('uk', 'Fennel, Florence, raw')),
  dict(slug='chicory', name='Chicory', category='food_fresh', aliases=['endive', 'red chicory', 'witlof'], grams_per_item=120, item_label='head',
       src=('uk', 'Chicory, pale variety, raw')),
  dict(slug='ginger-nut-biscuits', name='Ginger nut biscuits', category='food_ambient', aliases=['ginger nuts', 'ginger biscuits', 'gingernuts'], grams_per_item=10, item_label='biscuit',
       src=('uk', 'Biscuits, ginger nuts')),
  dict(slug='condensed-milk', name='Condensed milk', category='food_ambient', aliases=['sweetened condensed milk'], grams_per_ml=1.3,
       src=('uk', 'Milk, condensed, whole, sweetened')),
  dict(slug='sourdough', name='Sourdough bread', category='food_fresh', aliases=['sourdough', 'french bread', 'crusty bread', 'ciabatta'], grams_per_item=40, item_label='slice',
       src=('us', 'Bread, french or vienna (includes sourdough)')),
  dict(slug='cavolo-nero', name='Cavolo nero', category='food_fresh', aliases=['black kale', 'tuscan kale', 'lacinato kale'],
       src=('uk', 'Curly kale, raw'), basis_extra='Curly kale figures stand in for cavolo nero.'),

  # ---------------- Drinks and alcohol ----------------
  # Coffee had no figures at all. Instant dissolves, so it is the powder;
  # ground coffee is what the grounds give the cup, the way tea bags are.
  dict(slug='coffee-instant', name='Coffee, instant', category='drink', aliases=['coffee', 'instant coffee', 'coffee granules'], grams_per_ml=0.4,
       src=('us', 'Beverages, coffee, instant, regular, powder'), basis_extra='Instant coffee dissolves, so the powder is what you drink: about 2 g, 7 kcal, a cup.'),
  dict(slug='coffee-ground', name='Coffee, ground', category='drink', aliases=['ground coffee', 'espresso', 'filter coffee'], grams_per_ml=0.35,
       src=('label', 40, 4.0, 0.0, 6.0, 0.0, 'As brewed: what 10 g of ground coffee gives a 200 ml cup (CoFID 2019 Coffee, infusion, average: 2 kcal per 100 ml), scaled to 100 g of coffee.')),
  dict(slug='port', name='Port', category='drink', aliases=['ruby port', 'tawny port'], grams_per_ml=1.02,
       src=('us', 'Alcoholic beverage, wine, dessert, sweet'), basis_extra='Sweet dessert wine stands in for port.'),
  dict(slug='sherry', name='Sherry', category='drink', aliases=['medium sherry', 'cream sherry', 'dry sherry', 'madeira', 'marsala'], grams_per_ml=1.0,
       src=('uk', 'Sherry, medium')),
  dict(slug='spirit-40', name='Brandy', category='drink', aliases=['brandy', 'cognac', 'rum', 'dark rum', 'spiced rum', 'whisky', 'whiskey', 'gin', 'vodka', 'calvados'], grams_per_ml=0.95,
       src=('uk', 'Spirits, 40% volume'), basis_extra='Any 40% spirit: brandy, rum, whisky, gin, vodka.'),
  dict(slug='orange-liqueur', name='Orange liqueur', category='drink', aliases=['triple sec', 'cointreau', 'grand marnier', 'amaretto', 'liqueur'], grams_per_ml=1.05,
       src=('uk', 'Liqueurs, high strength')),
  dict(slug='sparkling-wine', name='Sparkling wine', category='drink', aliases=['prosecco', 'cava', 'champagne', 'sparkling white wine'], grams_per_ml=0.99,
       src=('uk', 'Wine, white, sparkling')),
  dict(slug='cider-dry', name='Cider', category='drink', aliases=['dry cider', 'apple cider', 'medium cider'], grams_per_ml=1.0,
       src=('uk', 'Cider, dry')),
  dict(slug='ginger-ale', name='Ginger ale', category='drink', aliases=['dry ginger ale'], grams_per_ml=1.0,
       src=('us', 'Beverages, carbonated, ginger ale')),
  dict(slug='ginger-beer', name='Ginger beer', category='drink', aliases=['non alcoholic ginger beer', 'fiery ginger beer'], grams_per_ml=1.0,
       src=('label', 38, 0.0, 0.0, 9.4, 0.0, LABEL)),
  dict(slug='tonic-water', name='Tonic water', category='drink', aliases=['tonic', 'indian tonic water'], grams_per_ml=1.0,
       src=('uk', 'Tonic water')),
  dict(slug='cranberry-juice', name='Cranberry juice', category='drink', aliases=['cranberry juice drink'], grams_per_ml=1.0,
       src=('uk', 'Cranberry fruit juice drink'), fibre_note=True),
  dict(slug='pomegranate-juice', name='Pomegranate juice', category='drink', aliases=[], grams_per_ml=1.0,
       src=('us', 'Pomegranate juice, bottled')),
  dict(slug='grape-juice-red', name='Red grape juice', category='drink', aliases=['grape juice', 'red grape juice'], grams_per_ml=1.0,
       src=('uk', 'Grape juice, unsweetened')),
  dict(slug='elderflower-cordial', name='Elderflower cordial', category='drink', aliases=['elderflower', 'elderflower squash'], grams_per_ml=1.25,
       src=('label', 185, 0.0, 0.0, 46.0, 0.0, 'Worked out from UK cordial labels (17 to 18 kcal per 100 ml diluted 1:10 to 1:15), undiluted, per 100 g.')),
]

# Aliases that would now point two ways: the new, more exact food keeps them.
ALIAS_DROPS = {
    'raisins': ['sultanas'],
    'breadcrumbs-dried': ['panko'],
    'paprika': ['smoked paprika'],
    'bacon-streaky-grilled': ['streaky bacon', 'smoked streaky bacon'],
}

# Older entries whose USDA carbohydrate included fibre but which a strict
# five-figure match cannot find (their fibre came from a newer table).
LEGACY_TOTAL_CARBS = ['sweetcorn-tinned', 'raisins', 'honey', 'lemon-juice', 'coconut-cream', 'jam-strawberry',
                      'cocoa-powder', 'dark-chocolate', 'curry-powder', 'tofu-firm', 'peas-frozen', 'turmeric-ground']

# Spoon measures for older foods that had none: a figure per 100 g is no use
# for "1 tbsp cocoa" without the weight of a spoonful (g per ml).
DENSITY_ADD = {
    'cocoa-powder': 0.42, 'icing-sugar': 0.56, 'sugar-caster': 0.85, 'sugar-soft-brown': 0.9,
    'flour-plain': 0.55, 'flour-self-raising': 0.55, 'flour-strong-white-bread': 0.55, 'cornflour': 0.55,
    'oats-rolled': 0.35, 'breadcrumbs-dried': 0.45, 'desiccated-coconut': 0.35, 'chia-seeds': 0.65,
    'sesame-seeds': 0.6, 'sunflower-seeds': 0.55, 'pumpkin-seeds': 0.55, 'ground-almonds': 0.4,
    'couscous-dry': 0.75, 'rice-basmati-dry': 0.85, 'rice-arborio-dry': 0.85, 'lentils-red-dry': 0.8,
    'quinoa-dry': 0.75, 'parmesan': 0.45, 'cheddar-cheese': 0.45, 'raisins': 0.6, 'sweet-chilli-sauce': 1.3,
    'fresh-parsley': 0.2, 'fresh-coriander': 0.2, 'fresh-basil': 0.2, 'fresh-mint': 0.2, 'ginger-fresh': 0.6,
    'spinach': 0.1, 'peas-frozen': 0.6, 'capers': 0.6, 'olives-pitted': 0.6, 'walnuts': 0.45, 'almonds': 0.6, 'cashews': 0.55, 'custard-ready': 1.05, 'cream-cheese': 1.0, 'chopped-tomatoes-tinned': 1.05,
}

LEGACY_BASIS = 'Published average from the original reference set (USDA or McCance and Widdowson).'
USDA_FIXED = 'Published average (USDA SR Legacy). Carbohydrate given UK-style, without fibre.'
NOT_FOOD = {'household', 'personal', 'pet', 'home'}


def r1(x):
    return round(float(x) + 1e-9, 1)


def norm(s):
    import re
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', str(s).lower())).strip()


def figures(spec, made, usda, cofid):
    src = spec['src']; kind = src[0]
    if kind == 'label':
        _, kcal, p, f, cb, fib, basis = src
        return dict(calories_per_100g=kcal, protein_g=p, fat_g=f, carbs_g=cb, fibre_g=fib), basis
    if kind == 'blend':
        parts, basis = src[1], src[2]
        tot = sum(parts.values())
        out = dict(calories_per_100g=0, protein_g=0, fat_g=0, carbs_g=0, fibre_g=0)
        for slug, n in parts.items():
            e = made.get(slug)
            assert e, f'blend part {slug} missing'
            for k in out:
                out[k] += e[k] * n / tot
        return {k: (round(v) if k == 'calories_per_100g' else r1(v)) for k, v in out.items()}, basis
    table = usda if kind == 'us' else cofid
    row = table.get(src[1])
    assert row, f'{spec["slug"]}: no row {src[1]!r}'
    _, name, kcal, p, f, cb, fib = row[:7]
    note = []
    if spec.get('basis_extra'):
        note.append(spec['basis_extra'])
    if fib is None:
        fib = 0.0
        note.append('No fibre figure is published; counted as 0.')
    cb = cb or 0.0
    if kind == 'us':
        cb = max(0.0, cb - fib)
        basis = f'USDA SR Legacy: {name}. Carbohydrate given UK-style, without fibre.'
    else:
        basis = f'CoFID 2019: {name}.'
    if note:
        basis += ' ' + ' '.join(note)
    return dict(calories_per_100g=round(kcal), protein_g=r1(p or 0), fat_g=r1(f or 0), carbs_g=r1(cb), fibre_g=r1(fib)), basis


def main():
    ref_path = os.path.join(ROOT, 'data', 'food_reference.json')
    doc = json.load(open(ref_path, encoding='utf-8'))
    usda_rows = json.load(open(os.path.join(ROOT, 'data', 'usda.json'), encoding='utf-8'))['foods']
    usda = {r[1]: r for r in usda_rows}
    cofid = {r[1]: r for r in json.load(open(os.path.join(ROOT, 'data', 'cofid.json'), encoding='utf-8'))['foods']}
    foods = doc['foods']
    by = {f['slug']: f for f in foods}
    made = dict(by)
    ours = set()
    for spec in SPEC:
        fig, basis = figures(spec, made, usda, cofid)
        entry = dict(slug=spec['slug'], name=spec['name'], category=spec['category'], aliases=spec.get('aliases', []))
        for k in ('grams_per_item', 'item_label', 'grams_per_ml'):
            if k in spec:
                entry[k] = spec[k]
        entry.update(fig)
        entry['basis'] = basis
        made[spec['slug']] = entry
        if spec['slug'] in by:
            foods[foods.index(by[spec['slug']])] = entry
        else:
            foods.append(entry)
        ours.add(spec['slug'])

    for f in foods:
        if f['slug'] in ALIAS_DROPS:
            f['aliases'] = [a for a in f.get('aliases', []) if norm(a) not in ALIAS_DROPS[f['slug']]]

    # UK-style carbohydrate for older entries copied from USDA.
    for f in foods:
        if f['slug'] in ours or f.get('calories_per_100g') is None or f.get('basis'):
            continue
        hit = f['slug'] in LEGACY_TOTAL_CARBS
        if not hit and f.get('fibre_g'):
            for row in usda_rows:
                _, name, kcal, p, fa, cb, fib = row[:7]
                if None in (kcal, p, fa, cb, fib) or fib <= 0.3:
                    continue
                if abs(f['calories_per_100g'] - kcal) <= 1.5 and abs(f['protein_g'] - p) <= 0.15 \
                   and abs(f['fat_g'] - fa) <= 0.15 and abs(f['carbs_g'] - cb) <= 0.6 and abs(f['fibre_g'] - fib) <= 0.3:
                    hit = True
                    break
        if hit:
            f['carbs_g'] = r1(max(0.0, f['carbs_g'] - (f.get('fibre_g') or 0)))
            f['basis'] = USDA_FIXED

    for f in foods:
        if f['slug'] in DENSITY_ADD and not f.get('grams_per_ml'):
            f['grams_per_ml'] = DENSITY_ADD[f['slug']]

    # Every food says where its figures come from.
    for f in foods:
        if f.get('category') in NOT_FOOD or f.get('calories_per_100g') is None:
            continue
        if not f.get('basis'):
            f['basis'] = LEGACY_BASIS

    doc['version'] = 5
    doc['updated'] = '2026-11-27'
    v4 = (" v4 (4 Oct 2026): everyday shop-bought and takeaway foods, generic, from CoFID 2019 (OGL v3.0) "
          "where it has them; portion_g is a typical adult portion.")
    note = doc['note']
    while note.count(v4) > 1:
        note = note.replace(v4, '', 1)
    v5 = (" v5 (27 Nov 2026): world pantry and Christmas ingredients; every food carries all five figures and a "
          "basis; carbohydrate is UK-style everywhere (fibre not counted), so USDA figures have fibre taken out.")
    if 'v5 (27 Nov 2026)' not in note:
        note += v5
    doc['note'] = note
    with open(ref_path, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(f'{len(ours)} world pantry foods; {len(foods)} in all')


if __name__ == '__main__':
    main()
