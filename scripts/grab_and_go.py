#!/usr/bin/env python3
# scripts/grab_and_go.py — 04 Oct 2026 v1
# v1: builds data/recipe_library/grab_and_go.json, the "Grab and go" group.
#
# Graeme, 4 Oct 2026: "add to recipes all the common sandwiches, wraps,
# samosas, pasties and salads you would get from sandwich shops or cafés ...
# also a mini deep-dish cheese pizza."
#
# Each is one bought item, so it can go on the plan and the shopping list
# like any recipe and count towards the day's nutrition. The food figures
# live in data/food_reference.json (scripts/everyday_foods.py): generic,
# typical UK label averages or CoFID 2019, no shop or brand names.
# Run: python3 scripts/grab_and_go.py   (rewrites the file and the index count)

import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'data', 'recipe_library')
OUT = os.path.join(LIB, 'grab_and_go.json')
INDEX = os.path.join(LIB, 'index.json')

V, VG = 'vegetarian', 'vegan'

# recipe name, food ref, how many, how to serve it, dietary tags
ITEMS = [
    # Sandwiches
    ('Chicken and bacon sandwich', 'sandwich-chicken-bacon', 1, 'cold', []),
    ('Chicken salad sandwich', 'sandwich-chicken-salad', 1, 'cold', []),
    ('Chicken and sweetcorn sandwich', 'sandwich-chicken-sweetcorn', 1, 'cold', []),
    ('Chicken and stuffing sandwich', 'sandwich-chicken-stuffing', 1, 'cold', []),
    ('Coronation chicken sandwich', 'sandwich-coronation-chicken', 1, 'cold', []),
    ('Chicken and avocado sandwich', 'sandwich-chicken-avocado', 1, 'cold', []),
    ('Chicken club sandwich', 'sandwich-chicken-club', 1, 'cold', []),
    ('All-day breakfast sandwich', 'sandwich-all-day-breakfast', 1, 'cold', []),
    ('BLT sandwich', 'sandwich-blt', 1, 'cold', []),
    ('Ham and cheese sandwich', 'sandwich-ham-cheese', 1, 'cold', []),
    ('Ham and mustard sandwich', 'sandwich-ham-mustard', 1, 'cold', []),
    ('Ham salad sandwich', 'sandwich-ham-salad', 1, 'cold', []),
    ('Cheese and pickle sandwich', 'sandwich-cheese-pickle', 1, 'cold', [V]),
    ('Cheese and onion sandwich', 'sandwich-cheese-onion', 1, 'cold', [V]),
    ('Cheese and tomato sandwich', 'sandwich-cheese-tomato', 1, 'cold', [V]),
    ('Egg and cress sandwich', 'sandwich-egg-cress', 1, 'cold', [V]),
    ('Egg and bacon sandwich', 'sandwich-egg-bacon', 1, 'cold', []),
    ('Tuna mayo sandwich', 'sandwich-tuna-mayo', 1, 'cold', []),
    ('Tuna and cucumber sandwich', 'sandwich-tuna-cucumber', 1, 'cold', []),
    ('Prawn mayonnaise sandwich', 'sandwich-prawn-mayo', 1, 'cold', []),
    ('Smoked salmon and cream cheese sandwich', 'sandwich-salmon-cream-cheese', 1, 'cold', []),
    ('Beef and horseradish sandwich', 'sandwich-beef-horseradish', 1, 'cold', []),
    ('Falafel and hummus sandwich', 'sandwich-falafel-hummus', 1, 'cold', [V, VG]),
    # Baguettes, bagels, rolls and croissants
    ('Ham and cheese baguette', 'baguette-ham-cheese', 1, 'cold', []),
    ('Brie and tomato baguette', 'baguette-brie-tomato', 1, 'cold', [V]),
    ('Chicken and bacon baguette', 'baguette-chicken-bacon', 1, 'cold', []),
    ('Smoked salmon and cream cheese bagel', 'bagel-salmon-cream-cheese', 1, 'cold', []),
    ('Bacon roll', 'bacon-roll', 1, 'warm', []),
    ('Sausage bap', 'sausage-bap', 1, 'warm', []),
    ('Ham and cheese croissant', 'croissant-ham-cheese', 1, 'warm', []),
    # Toasties and paninis
    ('Ham and cheese toastie', 'toastie-ham-cheese', 1, 'toast', []),
    ('Cheese toastie', 'toastie-cheese', 1, 'toast', [V]),
    ('Mozzarella and tomato panini', 'panini-mozzarella-tomato', 1, 'toast', [V]),
    ('Chicken and pesto panini', 'panini-chicken-pesto', 1, 'toast', []),
    ('Tuna melt panini', 'panini-tuna-melt', 1, 'toast', []),
    # Wraps
    ('Chicken Caesar wrap', 'wrap-chicken-caesar', 1, 'cold', []),
    ('Chicken tikka wrap', 'wrap-chicken-tikka', 1, 'cold', []),
    ('Southern fried chicken wrap', 'wrap-southern-fried-chicken', 1, 'cold', []),
    ('Chicken fajita wrap', 'wrap-chicken-fajita', 1, 'cold', []),
    ('Hoisin duck wrap', 'wrap-hoisin-duck', 1, 'cold', []),
    ('Falafel and hummus wrap', 'wrap-falafel-hummus', 1, 'cold', [V, VG]),
    ('Halloumi wrap', 'wrap-halloumi', 1, 'cold', [V]),
    ('Spicy bean wrap', 'wrap-spicy-bean', 1, 'cold', [V]),
    ('Plant-based chicken wrap', 'wrap-plant-chicken', 1, 'cold', [V]),
    # Samosas, pasties, bakes and pies
    ('Vegetable samosas', 'samosa-vegetable', 2, 'bakery', [V]),
    ('Meat samosas', 'samosa-meat', 2, 'bakery', []),
    ('Cornish pasty', 'cornish-pasty', 1, 'bakery', []),
    ('Cheese and onion pasty', 'pasty-cheese-onion', 1, 'bakery', [V]),
    ('Vegetable pasty', 'pasty-vegetable', 1, 'bakery', [V]),
    ('Steak bake', 'steak-bake', 1, 'bakery', []),
    ('Chicken bake', 'chicken-bake', 1, 'bakery', []),
    ('Sausage, bean and cheese melt', 'sausage-bean-cheese-melt', 1, 'bakery', []),
    ('Sausage roll', 'sausage-roll', 1, 'bakery', []),
    ('Plant-based sausage roll', 'sausage-roll-plant', 1, 'bakery', [V, VG]),
    ('Scotch egg', 'scotch-egg', 1, 'cold', []),
    ('Mini pork pies', 'mini-pork-pie', 2, 'cold', []),
    # Salads and pots
    ('Chicken Caesar salad', 'salad-chicken-caesar', 1, 'cold', []),
    ('Chicken and bacon pasta salad', 'salad-chicken-bacon-pasta', 1, 'cold', []),
    ('Tuna and sweetcorn pasta salad', 'salad-tuna-sweetcorn-pasta', 1, 'cold', []),
    ('Tomato and mozzarella pasta salad', 'salad-tomato-mozzarella-pasta', 1, 'cold', [V]),
    ('Falafel and couscous salad', 'salad-falafel-couscous', 1, 'cold', [V]),
    ('Greek salad', 'salad-greek', 1, 'cold', [V]),
    ('Chicken and grain salad', 'salad-chicken-grain', 1, 'cold', []),
    ('Roasted vegetable and grain salad', 'salad-roast-veg-grain', 1, 'cold', [V]),
    ('Chicken noodle salad', 'salad-chicken-noodle', 1, 'cold', []),
    ('Prawn layered salad', 'salad-prawn-layered', 1, 'cold', []),
    ('Sushi selection', 'sushi-selection', 1, 'cold', []),
    # Frozen
    ('Mini deep-dish cheese pizza', 'pizza-mini-deep-cheese', 1, 'pizza', [V]),
]

NOTE = 'Bought ready made. The figures are typical of UK labels, so yours may differ a little.'


def steps(kind, ref):
    t = '{{ing:%s}}' % ref
    if kind == 'cold':
        return [{'instruction': f'Keep {t} in the fridge until you eat it.'},
                {'instruction': 'Eat it by the date on the pack.'}]
    if kind == 'warm':
        return [{'instruction': f'Eat {t} warm, as bought.'},
                {'instruction': 'If it has cooled, warm it in the oven at 180C for 8 minutes.', 'duration_min': 8}]
    if kind == 'bakery':
        return [{'instruction': f'Eat {t} cold, or warm it through.'},
                {'instruction': 'To warm it, heat the oven to 180C.'},
                {'instruction': 'Bake on a tray for 10 minutes, until hot in the middle.', 'duration_min': 10}]
    if kind == 'toast':
        return [{'instruction': 'Heat a dry frying pan over a medium heat.'},
                {'instruction': f'Toast {t} for 3 minutes on each side, until the cheese melts.', 'duration_min': 6},
                {'instruction': 'Leave it 1 minute before cutting. The filling is very hot.', 'duration_min': 1}]
    if kind == 'pizza':
        return [{'instruction': 'Heat the oven to 200C.'},
                {'instruction': f'Bake {t} from frozen on a tray for 17 minutes, until bubbling.', 'duration_min': 17},
                {'instruction': 'Leave it 2 minutes before eating. The cheese is very hot.', 'duration_min': 2}]
    raise ValueError(kind)


def slugify(name):
    return 'bought-' + ''.join(c if c.isalnum() else '-' for c in name.lower()).strip('-').replace('--', '-')


def main():
    ref = {f['slug'] for f in json.load(open(os.path.join(ROOT, 'data', 'food_reference.json')))['foods']}
    recipes = []
    for name, food, qty, kind, tags in ITEMS:
        assert food in ref, food
        recipes.append({
            'slug': slugify(name), 'name': name, 'cuisine': 'Grab and go',
            'budget_tier': 'everyday', 'default_slot': 'lunch', 'default_serves': 1,
            'dietary_tags': tags + (['dairy_free'] if VG in tags else []),
            'method_note': ('Frozen. ' if kind == 'pizza' else '') + NOTE,
            'ingredients': [{'ref': food, 'quantity': qty, 'unit': 'item'}],
            'steps': steps(kind, food),
        })
    doc = {
        'version': 1, 'updated': '2026-10-04', 'cuisine': 'Grab and go',
        'licence': 'Original entries written for Home-OS. Generic shop-bought foods; no shop, brand or product is named or copied.',
        'recipes': recipes,
    }
    json.dump(doc, open(OUT, 'w'), indent=1, ensure_ascii=False)
    open(OUT, 'a').write('\n')
    index = json.load(open(INDEX))
    files = [f for f in index['files'] if not f['path'].endswith('grab_and_go.json')]
    files.append({'cuisine': 'Grab and go', 'path': 'data/recipe_library/grab_and_go.json', 'count': len(recipes)})
    index['files'] = sorted(files, key=lambda f: f['cuisine'])
    index['updated'] = '2026-10-04'
    json.dump(index, open(INDEX, 'w'), indent=1, ensure_ascii=False)
    open(INDEX, 'a').write('\n')
    print(len(recipes), 'recipes')


if __name__ == '__main__':
    main()
