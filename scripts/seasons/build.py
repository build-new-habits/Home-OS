#!/usr/bin/env python3
# scripts/seasons/build.py — 27 Nov 2026 v1
# Phase 40. Seasons and occasions: recipes and menus written compactly, then
# expanded into the library's own JSON, checked as they are written.
#
# Graeme, 27 Nov 2026: "We need to have seasons. Summer, Spring, Winter,
# Autumn, Easter, Birthdays, Christmas, Halloween, BBQ, outdoor cooking. If
# we can have a thorough set of recipes and menus for these, that'd be
# insanely awesome."
#
# ---- How a recipe is written here ----
#   R('slug', 'Name', 'main', ['spaghetti-dry 300g', 'olive-oil 2tbsp', 'onion-medium 1'],
#     ['Put a large pan of water on a high heat.',
#      '## Sauce',                                   # a step group
#      'Fry {onion-medium} 8 minutes, until soft. || Low heat, so it sweetens.'])
#   - an ingredient is "ref amount": g, ml, tsp, tbsp (stored as ml, like
#     the rest of the library), or a bare number for items
#   - {ref} in a step becomes {{ing:ref}}, so the quantity shows in the step
#   - "text || note" puts the why in the note
#   - the first "N minutes" or "N hours" in a step becomes its timer
#   - dietary tags are worked out from the ingredients, never typed: a tag
#     that could be wrong is a claim about someone's food
#
# Everything is checked before anything is written: every ref is a food,
# every unit converts to grams, every token is an ingredient, every step is
# 20 words or fewer with no shame words, every menu names real recipes of
# the right course. A mistake stops the build with the recipe's name.
#
# Run: python3 scripts/seasons/make_all.py

import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = {f['slug']: f for f in json.load(open(os.path.join(ROOT, 'data', 'food_reference.json'), encoding='utf-8'))['foods']}
LICENCE = ('Original formulations written for Home-OS. Ingredient lists and functional method are facts and '
           'procedures; nothing is transcribed from any published source.')
BANNED = re.compile(r'\b(simply|just|obviously|quickly|easy|easily|merely|meanwhile)\b', re.I)

# ---- What a food is, for the tags ---------------------------------------------
MEAT = re.compile(r'\b(beef|lamb|pork|chicken|turkey|bacon|sausage|sausagemeat|ham|chorizo|duck|steak|gammon|mince|pancetta|chipolatas?|venison|livers?|goose|pheasant|ribs|brisket|prosciutto|salami|nduja|quail|wings|chops|shoulder)\b')
FISH = re.compile(r'\b(salmon|tuna|cod|haddock|prawn|prawns|anchovy|mackerel|sardines?|shrimp|squid|crab|hake|monkfish|trout|bass|bream|scallops?|lobster|mussels?|clams?|oysters?|langoustines?|plaice|sole|kippers?|halibut|turbot|caviar)\b')
NOT_VEG = {'worcestershire-sauce', 'fish-sauce', 'oyster-sauce', 'shrimp-paste', 'stock-chicken', 'duck-fat', 'marshmallows', 'gravy-granules', 'anchovy-fillet'}
PLANT = {'plant-sausages', 'plant-burger', 'plant-mince', 'plant-bacon', 'plant-chicken-pieces', 'plant-nuggets', 'plant-fillets-breaded', 'sausage-roll-plant', 'mushroom-chestnut', 'portobello-mushroom'}
DAIRY = {'milk-whole', 'milk-semi-skimmed', 'milk-skimmed', 'double-cream', 'single-cream', 'whipping-cream', 'butter-unsalted', 'butter-block',
         'cheddar-cheese', 'parmesan', 'pecorino', 'feta', 'halloumi', 'mozzarella', 'burrata', 'goats-cheese', 'stilton', 'brie', 'camembert',
         'gruyere', 'ricotta', 'mascarpone', 'paneer', 'cream-cheese', 'cottage-cheese', 'creme-fraiche', 'soured-cream', 'greek-yoghurt',
         'natural-yoghurt', 'labneh', 'custard-ready', 'ice-cream-vanilla', 'condensed-milk', 'dulce-de-leche', 'milk-chocolate-bar',
         'white-chocolate', 'brioche', 'pesto', 'naan-bread', 'hot-cross-bun', 'cake-sponge', 'shortbread', 'croissant', 'malted-milk-powder',
         'tzatziki', 'garlic-bread', 'halloumi-fries', 'mini-cheese', 'scone-fruit', 'pancakes-sweet', 'waffles', 'cheesecake', 'brownie', 'cookies',
         'burger-bun', 'digestive-biscuit', 'chocolate-digestive', 'hot-chocolate-powder', 'yorkshire-pudding', 'quiche-lorraine', 'pizza-cheese-tomato'}
NOT_VEGAN = DAIRY | {'egg-small', 'egg-medium', 'egg-large', 'egg-very-large', 'egg-white', 'egg-yolk', 'eggs-boiled', 'eggs-fried', 'eggs-scrambled',
                     'honey', 'meringue-nests', 'mayonnaise', 'mayonnaise-light', 'garlic-mayo', 'tartare-sauce', 'salad-cream', 'sponge-fingers',
                     'peri-mayo', 'sriracha-mayo', 'coleslaw', 'blinis', 'quiche-lorraine'}
GLUTEN = {'flour-plain', 'flour-self-raising', 'flour-strong-white-bread', 'bread-white-sliced-loaf', 'bread-slice-medium', 'wholemeal-bread-slice',
          'sourdough', 'burger-bun', 'bread-roll-white', 'bread-roll-brown', 'pitta-bread', 'tortilla-wrap', 'naan-bread', 'chapati', 'couscous-dry',
          'bulgur', 'freekeh', 'pearl-barley', 'spaghetti-dry', 'penne-dry', 'pasta-cooked', 'egg-noodles-dry', 'puff-pastry', 'filo-pastry',
          'shortcrust-pastry', 'breadcrumbs-dried', 'panko', 'soy-sauce', 'hoisin-sauce', 'oyster-sauce', 'beer-lager', 'stock-cube',
          'gravy-granules', 'digestive-biscuit', 'chocolate-digestive', 'ginger-nut-biscuits', 'shortbread', 'sponge-fingers', 'cake-sponge',
          'brioche', 'croissant', 'hot-cross-bun', 'oats-rolled', 'malted-milk-powder', 'worcestershire-sauce', 'sausage-pork', 'sausages-pork-grilled',
          'chipolatas', 'sausagemeat', 'plant-sausages', 'hot-dog-sausage', 'blinis', 'yorkshire-pudding', 'cookies', 'brownie', 'wheat-biscuits',
          'cornflakes', 'gochujang', 'miso-paste', 'pizza-cheese-tomato', 'english-muffin', 'crumpet', 'bagel-plain', 'garlic-bread', 'scone-fruit',
          'pancakes-sweet', 'waffles', 'cheesecake', 'plant-burger', 'plant-nuggets', 'sausage-roll-plant', 'beef-burger', 'breadsticks', 'pretzels',
          'cream-crackers', 'oatcakes', 'naan-bread', 'tortilla-chips', 'falafel', 'yorkshire-pudding', 'stuffing-made', 'cereal-bar', 'flapjack',
          'muesli', 'raisin-and-oat-granola', 'plant-bacon', 'plant-chicken-pieces', 'plant-mince', 'plant-fillets-breaded', 'quorn-pieces'}


def ref_words(ref):
    return re.sub(r'[^a-z]+', ' ', ref.lower())


def tags_for(refs):
    flav = lambda r: r.startswith('stock-') or r == 'fish-sauce'
    meaty = any((MEAT.search(ref_words(r)) or FISH.search(ref_words(r))) and r not in PLANT and not flav(r) for r in refs)
    veg = not meaty and not any(r in NOT_VEG for r in refs)
    out = []
    if veg:
        out.append('vegetarian')
        if not any(r in NOT_VEGAN for r in refs):
            out.append('vegan')
    if not any(r in GLUTEN for r in refs):
        out.append('gluten_free')
    if not any(r in DAIRY for r in refs):
        out.append('dairy_free')
    return out


def proteins(refs):
    out = set()
    for r in refs:
        if r.startswith('stock-') or r in ('fish-sauce', 'oyster-sauce') or r in PLANT:
            continue
        if MEAT.search(ref_words(r)):
            out.add('meat')
        if FISH.search(ref_words(r)):
            out.add('fish')
    return out


SHELL = re.compile(r'prawn|scallop|lobster|crab|mussel|clam|oyster|langoustine|squid')

# ---- Recipes --------------------------------------------------------------------

AMOUNT = re.compile(r'^([0-9]*\.?[0-9]+)(g|ml|tsp|tbsp|kg|l)?$')


class BuildError(Exception):
    pass


def parse_ing(text, rid):
    parts = text.split()
    if len(parts) != 2:
        raise BuildError(f'{rid}: ingredient "{text}" should be "ref amount"')
    ref, amt = parts
    m = AMOUNT.match(amt)
    if not m:
        raise BuildError(f'{rid}: amount "{amt}" in "{text}"')
    qty, unit = float(m.group(1)), m.group(2) or 'item'
    if unit == 'tsp':
        qty, unit = qty * 5, 'ml'
    elif unit == 'tbsp':
        qty, unit = qty * 15, 'ml'
    elif unit == 'kg':
        qty, unit = qty * 1000, 'g'
    elif unit == 'l':
        qty, unit = qty * 1000, 'ml'
    food = REF.get(ref)
    if not food:
        raise BuildError(f'{rid}: "{ref}" is not a food in food_reference.json')
    if unit == 'ml' and not food.get('grams_per_ml'):
        raise BuildError(f'{rid}: {ref} has no spoon weight, use g')
    if unit == 'item' and not food.get('grams_per_item'):
        raise BuildError(f'{rid}: {ref} has no item weight, use g')
    qty = int(qty) if qty == int(qty) else round(qty, 1)
    return {'ref': ref, 'quantity': qty, 'unit': unit}


DURATION = re.compile(r'\b(\d+)\s*(minutes?|mins?|hours?)\b', re.I)


def parse_steps(lines, refs, rid):
    steps, group = [], None
    for line in lines:
        if line.startswith('## '):
            group = line[3:].strip()
            continue
        text, _, note = line.partition('||')
        text, note = text.strip(), note.strip()
        for m in re.finditer(r'\{([a-z0-9-]+)\}', text):
            if m.group(1) not in refs:
                raise BuildError(f'{rid}: step token {{{m.group(1)}}} is not an ingredient: "{text}"')
        words = len(re.sub(r'\{[a-z0-9-]+\}', 'x', text).split())
        if words > 20:
            raise BuildError(f'{rid}: step over 20 words ({words}): "{text}"')
        for t in (text, note):
            if BANNED.search(t):
                raise BuildError(f'{rid}: banned word in "{t}"')
        step = {'instruction': re.sub(r'\{([a-z0-9-]+)\}', r'{{ing:\1}}', text)}
        if note:
            step['note'] = note
        d = DURATION.search(text)
        if d:
            n = int(d.group(1)) * (60 if d.group(2).lower().startswith('hour') else 1)
            if 1 <= n <= 1440:
                step['duration_min'] = n
        if group:
            step['step_group'] = group
        steps.append(step)
    tokens = sum(len(re.findall(r'\{\{ing:', s['instruction'])) for s in steps)
    if len(refs) >= 3 and tokens < 2:
        raise BuildError(f'{rid}: restate quantities in the steps ({tokens} tokens)')
    if not steps:
        raise BuildError(f'{rid}: no steps')
    return steps


class Book:
    """One occasion: its recipes and its menus."""

    def __init__(self, key, cuisine, prefix):
        self.key, self.cuisine, self.prefix = key, cuisine, prefix
        self.recipes, self.menus = [], []

    def R(self, slug, name, course, ings, steps, serves=4, tier='everyday', slot=None, swaps=(), note=None, drop=(), cuisine=None):
        slug = f'{self.prefix}-{slug}'
        parsed = [parse_ing(i, slug) for i in ings]
        refs = [i['ref'] for i in parsed]
        if len(set(refs)) != len(refs):
            raise BuildError(f'{slug}: an ingredient is listed twice')
        if any(x['name'] == name for x in self.recipes):
            raise BuildError(f'{slug}: name "{name}" used twice in {self.key}')
        r = {'slug': slug, 'name': name, 'cuisine': cuisine or self.cuisine, 'budget_tier': tier,
             'default_slot': slot or ('drink' if course == 'drink' else 'dinner'), 'default_serves': serves,
             'dietary_tags': [t for t in tags_for(refs) if t not in drop]}
        if note:
            if BANNED.search(note):
                raise BuildError(f'{slug}: banned word in note')
            r['method_note'] = note
        if course in ('starter', 'main', 'pudding'):
            r['course'] = course
        elif course == 'side':
            r['side'] = True
        elif course not in ('drink', 'snack', 'breakfast', 'lunch'):
            raise BuildError(f'{slug}: course {course}')
        r['ingredients'] = parsed
        r['steps'] = parse_steps(steps, set(refs), slug)
        swaps = list(swaps)
        if 'vegetarian' in r['dietary_tags']:
            for hard in ('parmesan', 'pecorino'):
                if hard in refs and not any(hard in a.lower() for a, _ in swaps):
                    swaps.append((hard, f'A vegetarian hard cheese: most {hard} is made with animal rennet'))
        if 'vegan' in r['dietary_tags'] and any(x in refs for x in ('wine-red', 'wine-white', 'wine-rose', 'sparkling-wine', 'beer-lager', 'cider-dry')) \
                and not any('label' in t for _, t in swaps):
            swaps.append(('wine, beer or cider', 'Check the label says vegan if you need it to be'))
        if swaps:
            r['swaps'] = [{'instead': a, 'text': b} for a, b in swaps]
        if not (1 <= serves <= 12) or tier not in ('budget', 'everyday', 'special'):
            raise BuildError(f'{slug}: serves or tier')
        self.recipes.append(r)
        return slug

    def M(self, slug, name, diet, serves, summary, starter, main, pudding, note=None):
        """starter/pudding: (recipe, soft, alcoholic); main: (recipe, soft, alcoholic, [sides]).
        A pairing is words, or (words, drink slug)."""
        def pair(p):
            return {'text': p[0], 'recipe': p[1]} if isinstance(p, tuple) else {'text': p}
        courses = []
        for course, spec in (('starter', starter), ('main', main), ('pudding', pudding)):
            c = {'course': course, 'recipe': spec[0], 'pairing': {'soft': pair(spec[1]), 'alcoholic': pair(spec[2])}}
            if course == 'main' and len(spec) > 3 and spec[3]:
                c['sides'] = list(spec[3])
            courses.append(c)
        m = {'slug': slug, 'name': name, 'diet': diet, 'serves': serves, 'summary': summary, 'courses': courses}
        if diet == 'vegan':
            note = ((note + ' ') if note else '') + 'Check wine and beer labels say vegan; some are fined with animal products.'
        if note:
            m['note'] = note
        self.menus.append(m)


# ---- Writing, with the whole library in view ----------------------------------

BOOZE = re.compile(r'^(wine-.*|sparkling-wine|cider-dry|spirit-40|orange-liqueur|port|sherry|beer-.*|sake|vermouth|bitter-aperitivo)$')


def check_menus(book, by_slug):
    for m in book.menus:
        mid = f'menu {m["slug"]}'
        food = []
        for c in m['courses']:
            r = by_slug.get(c['recipe'])
            if not r:
                raise BuildError(f'{mid}: {c["recipe"]} is not in the library')
            if r.get('course', 'main') != c['course'] or r.get('side'):
                raise BuildError(f'{mid}: {c["recipe"]} is not a {c["course"]}')
            food.append(r)
            for s in c.get('sides', []):
                sr = by_slug.get(s)
                if not sr or not sr.get('side'):
                    raise BuildError(f'{mid}: side {s} missing or not marked side')
                food.append(sr)
            for kind in ('soft', 'alcoholic'):
                p = c['pairing'][kind]
                if p.get('recipe'):
                    d = by_slug.get(p['recipe'])
                    if not d or d['default_slot'] != 'drink':
                        raise BuildError(f'{mid}: drink {p["recipe"]} missing')
                    boozy = any(BOOZE.match(i['ref']) for i in d['ingredients'])
                    if boozy != (kind == 'alcoholic'):
                        raise BuildError(f'{mid}: {p["recipe"]} is the wrong kind for {kind}')
        tags = [set(r.get('dietary_tags', [])) for r in food]
        prot = set().union(*[proteins([i['ref'] for i in r['ingredients']]) for r in food])
        shell = any(SHELL.search(i['ref']) for r in food for i in r['ingredients'])
        d = m['diet']
        ok = {'vegan': all('vegan' in t for t in tags),
              'vegetarian': all('vegetarian' in t for t in tags),
              'meat': 'meat' in prot, 'fish': 'fish' in prot, 'shellfish': shell}[d]
        if not ok:
            raise BuildError(f'{mid}: labelled {d} but the food is not')


def write_all(books):
    lib_dir = os.path.join(ROOT, 'data', 'recipe_library')
    index_path = os.path.join(lib_dir, 'index.json')
    index = json.load(open(index_path, encoding='utf-8'))
    by_slug = {}
    for f in index['files']:
        if any(f['path'].endswith(f'/{b.key}.json') for b in books):
            continue
        for r in json.load(open(os.path.join(ROOT, f['path']), encoding='utf-8'))['recipes']:
            by_slug[r['slug']] = r
    for b in books:
        for r in b.recipes:
            if r['slug'] in by_slug:
                raise BuildError(f'{r["slug"]}: slug used twice')
            by_slug[r['slug']] = r
    for b in books:
        check_menus(b, by_slug)
    files = [f for f in index['files'] if not any(f['path'].endswith(f'/{b.key}.json') for b in books)]
    for b in books:
        path = f'data/recipe_library/{b.key}.json'
        doc = {'version': 1, 'updated': '2026-11-27', 'cuisine': b.cuisine, 'licence': LICENCE, 'recipes': b.recipes}
        with open(os.path.join(ROOT, path), 'w', encoding='utf-8') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
        files.append({'cuisine': b.cuisine, 'path': path, 'count': len(b.recipes)})
        if not b.menus:
            continue  # a recipe book with no menus (Microwave) writes no menus file
        mdoc = {'version': 1, 'updated': '2026-11-27', 'occasion': b.cuisine,
                'note': f'Complete {b.cuisine.lower()} menus. Each course is paired with a soft drink and a drink with alcohol; wines are named by style or region, never by brand.',
                'drinks_note': 'Every course has a soft pairing too, for drivers, children and anyone not drinking.',
                'menus': b.menus}
        with open(os.path.join(ROOT, 'data', 'menus', f'{b.key}.json'), 'w', encoding='utf-8') as fh:
            json.dump(mdoc, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    index['files'] = sorted(files, key=lambda f: f['cuisine'])
    index['updated'] = '2026-11-27'
    with open(index_path, 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    for b in books:
        print(f'{b.cuisine}: {len(b.recipes)} recipes, {len(b.menus)} menus')
