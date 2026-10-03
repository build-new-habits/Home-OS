#!/usr/bin/env python3
# scripts/recipe_photos.py — 03 Oct 2026 v1
# Recipe photos for the library: prompts out, photos in.
#
#   python3 scripts/recipe_photos.py prompts
#       Writes Docs/Current/PHOTO_PROMPTS.md: the house style, then one
#       prompt per recipe built from what is actually in it, in batches of
#       ten for pasting into an image model.
#
#   python3 scripts/recipe_photos.py add <folder>
#       Takes images named <slug>.<ext> (png, jpg, webp), crops each to 4:3,
#       resizes to 800 x 600, saves assets/recipes/<slug>.webp, and records it
#       in data/recipe_images.json with draft alt text. Draft alt text is
#       checked against the photo by eye before committing.
#
# Why prompts are built from the ingredient list: an AI photo that shows
# prawns in a dish with no prawns is worse than no photo. The prompt names
# what is in the dish, and for vegetarian dishes says there is no meat or
# fish, so the picture cannot promise something the recipe does not have.

import json, sys, os, re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(REPO, 'data', 'recipe_library')
MANIFEST = os.path.join(REPO, 'data', 'recipe_images.json')
OUT_DIR = os.path.join(REPO, 'assets', 'recipes')

HOUSE_STYLE = (
    'Photograph, 4:3 landscape. A real home-cooked dish, generous but realistic portion, '
    'served on plain off-white stoneware on a pale oak table. Soft natural daylight from the left, '
    'gentle shadows, shot from about 45 degrees. Simple linen napkin at most. '
    'No hands, no people, no text, no logos, no brand packaging, no extra dishes in focus. '
    'Colours true to life, not oversaturated. Looks appetising and achievable at home.'
)

# Not worth naming in a picture: they are in the dish but not visible.
INVISIBLE = {
    'salt', 'black-pepper-ground', 'olive-oil', 'vegetable-oil', 'sesame-oil', 'water', 'stock-chicken',
    'stock-vegetable', 'stock-cube', 'sugar-caster', 'sugar-soft-brown', 'icing-sugar', 'flour-plain',
    'flour-self-raising', 'cornflour', 'baking-powder', 'bicarbonate-of-soda', 'vanilla-extract',
    'cumin-ground', 'coriander-ground', 'turmeric-ground', 'chilli-powder', 'cinnamon-ground', 'garam-masala',
    'curry-powder', 'dried-oregano', 'dried-thyme', 'paprika', 'bay-leaf', 'fish-sauce', 'soy-sauce',
    'worcestershire-sauce', 'white-wine-vinegar', 'balsamic-vinegar', 'rice-vinegar', 'honey', 'maple-syrup',
    'golden-syrup', 'garlic-clove', 'ginger-fresh', 'mustard-dijon', 'tomato-ketchup', 'lemon-juice',
    'curry-paste', 'thai-green-curry-paste', 'thai-red-curry-paste', 'massaman-curry-paste', 'miso-paste',
    'gochujang', 'tomato-purée', 'marmite', 'tea-bags', 'lemongrass',
}

MEAT_FISH = re.compile(r'chicken|beef|lamb|pork|turkey|bacon|sausage|ham|chorizo|prawn|cod|salmon|sea-bass|tuna|sardine|anchov|mackerel')


def reference():
    doc = json.load(open(os.path.join(REPO, 'data', 'food_reference.json')))
    return {f['slug']: f for f in doc['foods']}


DESCRIPTORS = re.compile(r'\b(dry|dried|tinned|frozen|medium|large|small|very large|skinless|boneless|concentrated|in spring water|block|slice|sliced loaf|head|rasher|fillet|pitted|ground|cooked)\b')


def plain_name(name):
    # "Rice, basmati, dry" -> "basmati rice"; "Chicken thigh, boneless" -> "chicken thigh"
    parts = [DESCRIPTORS.sub('', p).strip() for p in name.lower().split(',')]
    parts = [p for p in parts if p]
    if len(parts) >= 2:
        parts = parts[1:] + parts[:1]
    return re.sub(r'\s+', ' ', ' '.join(parts)).strip()


def all_recipes():
    index = json.load(open(os.path.join(LIB, 'index.json')))
    for f in index['files']:
        for r in json.load(open(os.path.join(REPO, f['path'])))['recipes']:
            yield r


def vessel(r):
    slot, course, name = r.get('default_slot'), r.get('course'), r['name'].lower()
    if slot == 'drink':
        return 'in a clear glass or a mug, as suits the drink'
    if 'soup' in name or 'dhal' in name or 'stew' in name or 'curry' in name:
        return 'in a wide shallow bowl'
    if course == 'pudding':
        return 'in a small bowl or on a small plate, as a pudding'
    if course == 'starter':
        return 'as a starter on a small plate'
    if slot == 'snack':
        return 'on a small plate or board'
    if slot == 'breakfast':
        return 'on a plate or in a bowl, as breakfast'
    return 'on a dinner plate or in a wide bowl'


def visible(r, ref):
    names = []
    for i in r['ingredients']:
        if i['ref'] in INVISIBLE:
            continue
        entry = ref.get(i['ref'])
        n = plain_name(entry['name']) if entry else i['ref'].replace('-', ' ')
        if n not in names:
            names.append(n)
    return names


def prompt_for(r, ref):
    names = visible(r, ref)
    meatless = not any(MEAT_FISH.search(i['ref']) for i in r['ingredients'])
    lines = [f"{r['name']}, served {vessel(r)}."]
    if names:
        lines.append(f"Made with: {', '.join(names)}.")
    lines.append('Show the finished dish, ready to eat. No garnish or ingredient that is not in this list.')
    if meatless:
        lines.append('There is no meat or fish anywhere in the picture.')
    return ' '.join(lines)


def alt_for(r, ref):
    names = visible(r, ref)[:4]
    return f"{r['name']}, {vessel(r).replace('as a starter ', '').replace(', as a pudding', '').replace(', as breakfast', '')}" + (f", with {', '.join(names)}." if names else '.')


def write_prompts():
    ref = reference()
    have = json.load(open(MANIFEST))['images'] if os.path.exists(MANIFEST) else {}
    todo = [r for r in all_recipes() if r['slug'] not in have]
    out = ['# Recipe photo prompts', '', f'{len(todo)} recipes without a photo. Generated by `scripts/recipe_photos.py prompts`.', '',
           '## House style (paste once at the start of a session)', '', HOUSE_STYLE, '',
           '## How to use', '',
           '1. Start a new image chat. Paste the house style.',
           '2. Paste one recipe line at a time. Ask for 4:3 landscape.',
           '3. Save each image named exactly as its slug, e.g. `spaghetti-puttanesca.png`.',
           '4. Reject any image that shows something the recipe does not contain.',
           '5. Drop a batch into the chat; it is processed and checked against the recipe.', '']
    for n in range(0, len(todo), 10):
        out.append(f'## Batch {n // 10 + 1}')
        out.append('')
        for r in todo[n:n + 10]:
            out.append(f"- **{r['slug']}** — {prompt_for(r, ref)}")
        out.append('')
    path = os.path.join(REPO, 'Docs', 'Current', 'PHOTO_PROMPTS.md')
    open(path, 'w').write('\n'.join(out))
    print(f'wrote {path}: {len(todo)} prompts')


def add_photos(folder):
    from PIL import Image
    ref = reference()
    recipes = {r['slug']: r for r in all_recipes()}
    doc = json.load(open(MANIFEST))
    os.makedirs(OUT_DIR, exist_ok=True)
    added, skipped = [], []
    for fname in sorted(os.listdir(folder)):
        slug, ext = os.path.splitext(fname)
        slug = slug.lower()
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        if slug not in recipes:
            skipped.append(fname)
            continue
        im = Image.open(os.path.join(folder, fname)).convert('RGB')
        w, h = im.size
        target = 4 / 3
        if w / h > target:
            nw = int(h * target); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = int(w / target); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im = im.resize((800, 600), Image.LANCZOS)
        out = os.path.join(OUT_DIR, f'{slug}.webp')
        im.save(out, 'WEBP', quality=78, method=6)
        doc['images'][slug] = {'src': f'assets/recipes/{slug}.webp', 'alt': alt_for(recipes[slug], ref), 'width': 800, 'height': 600}
        added.append((slug, os.path.getsize(out) // 1024))
    json.dump(doc, open(MANIFEST, 'w'), indent=1, ensure_ascii=False)
    open(MANIFEST, 'a').write('\n')
    for slug, kb in added:
        print(f'added {slug} ({kb} KB)')
    for f in skipped:
        print(f'skipped {f}: no recipe with that slug')


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'prompts':
        write_prompts()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'add':
        add_photos(sys.argv[2])
    else:
        print(__doc__ or 'usage: recipe_photos.py prompts | add <folder>')
