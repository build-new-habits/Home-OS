#!/usr/bin/env python3
# scripts/recipe_photos.py — 27 Nov 2026 v3
# v3: Christmas first (Graeme, 27 Nov 2026), then everyday cooking, then the
# year. Each prompt sits alone in its own block, so it copies whole with
# nothing to add or trim; the save name sits above it.
# v2 (Phase 41): written for Microsoft Copilot. Every prompt carries the
# house style itself, because Copilot does not hold a style across messages.
# Prompts come in a fixed order (everyday food first, then what is in season,
# then the rest of the year, shop-bought last) and in numbered batches of 10,
# kept in Docs/Current/photo_batches.json so a batch means the same ten
# recipes next week. Photos can be named by slug, or by their number inside a
# folder named after the batch (batch-007/03.png): no slugs to type.
# Meat and fish words cover the whole library now (duck, venison, scallops...).
#
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

MEAT_FISH = re.compile(r'chicken|beef|lamb|pork|turkey|bacon|sausage|\bham\b|ham-|gammon|chorizo|pancetta|prosciutto|salami|nduja|duck|goose|venison|pheasant|quail|steak|mince|liver|chipolata|brisket|ribs|wings|chops|'
                       r'prawn|cod|salmon|sea-bass|sea-bream|tuna|sardine|anchov|mackerel|haddock|hake|monkfish|trout|turbot|halibut|crab|lobster|scallop|mussel|clam|oyster|langoustine|squid|caviar|scampi|fish')
PLANT = {'plant-sausages', 'plant-burger', 'plant-mince', 'plant-bacon', 'plant-chicken-pieces', 'plant-nuggets', 'plant-fillets-breaded', 'sausage-roll-plant'}


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
    meatless = not any(MEAT_FISH.search(i['ref']) and i['ref'] not in PLANT and not i['ref'].startswith('stock-') for i in r['ingredients'])
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


SEASON_ORDER = ['Christmas', 'Winter', 'Spring', 'Easter', 'Summer', 'BBQ', 'Outdoor cooking', 'Autumn', 'Halloween', 'Birthday']
COURSE_ORDER = {'main': 0, 'starter': 1, 'pudding': 2, 'side': 3, 'drink': 4}
BATCHES = os.path.join(REPO, 'Docs', 'Current', 'photo_batches.json')


def course_key(r):
    if r.get('default_slot') == 'drink':
        return 'drink'
    if r.get('side'):
        return 'side'
    return r.get('course') or 'main'


def priority(r):
    c = r.get('cuisine', '')
    if c == 'Grab and go':
        group = 99                      # shop-bought: last, and optional
    elif c == 'Christmas':
        group = 0                       # Christmas first
    elif c in SEASON_ORDER:
        group = 2 + SEASON_ORDER.index(c)
    else:
        group = 1                       # then everyday cooking
    return (group, COURSE_ORDER[course_key(r)], r['name'].lower())


def copilot_prompt(r, ref):
    return f"Create an image: {prompt_for(r, ref)} {HOUSE_STYLE}"


def write_prompts():
    ref = reference()
    have = json.load(open(MANIFEST))['images'] if os.path.exists(MANIFEST) else {}
    every = sorted(all_recipes(), key=priority)
    # Batches are fixed once made: a new recipe joins the end, never reshuffles.
    batches = json.load(open(BATCHES))['batches'] if os.path.exists(BATCHES) else []
    placed = {s for b in batches for s in b}
    extra = [r['slug'] for r in every if r['slug'] not in placed]
    for n in range(0, len(extra), 10):
        batches.append(extra[n:n + 10])
    json.dump({'note': 'Batch n is a folder batch-NNN of photos named 01 to 10. Do not reorder.', 'batches': batches},
              open(BATCHES, 'w'), indent=1)
    by = {r['slug']: r for r in every}
    todo = [r for r in every if r['slug'] not in have]
    out = ['# Recipe photo prompts for Copilot', '',
           f'{len(todo)} of {len(every)} recipes have no photo yet. Generated by `python3 scripts/recipe_photos.py prompts`.', '',
           'Order: Christmas first, then everyday cooking, then the rest of the year by season, shop-bought food last.', '',
           '## How to do a batch', '',
           '1. Open Copilot (the app or copilot.microsoft.com). Start a new chat for each batch.',
           '2. Copy one whole prompt block and send it as it is. Nothing to add at the start or the end.',
           '3. Look at it against the recipe. Reject it and ask again if it shows anything the recipe does not have, or meat or fish in a dish that has none.',
           '4. Save it as the name shown above its prompt, e.g. `batch-001/01.png`: a folder per batch, the number inside. A skipped one is fine: leave its number out.',
           '5. When a batch folder is done (or several), zip it and drop it into a Home OS chat. It is cropped to 4:3, resized, checked and committed.', '',
           'The house style is inside every prompt, so each one stands on its own.', '']
    for i, batch in enumerate(batches, start=1):
        rows = [(n, by[s]) for n, s in enumerate(batch, start=1) if s in by and s not in have]
        if not rows:
            continue
        first = by[batch[0]] if batch[0] in by else None
        c = (first.get('cuisine') if first else '') or ''
        label = 'Shop-bought' if c == 'Grab and go' else c if c in SEASON_ORDER else 'Everyday cooking'
        out.append(f'## Batch {i:03d}' + (f' · {label}' if label else ''))
        out.append('')
        for n, r in rows:
            out.append(f"**{i:03d}·{n:02d} {r['name']}** — save as `batch-{i:03d}/{n:02d}.png`")
            out.append('')
            out.append('```text')
            out.append(copilot_prompt(r, ref))
            out.append('```')
            out.append('')
    path = os.path.join(REPO, 'Docs', 'Current', 'PHOTO_PROMPTS.md')
    open(path, 'w').write('\n'.join(out))
    print(f'wrote {path}: {len(todo)} prompts in {len(batches)} batches')


def add_photos(folder):
    from PIL import Image
    ref = reference()
    recipes = {r['slug']: r for r in all_recipes()}
    doc = json.load(open(MANIFEST))
    os.makedirs(OUT_DIR, exist_ok=True)
    added, skipped = [], []
    m = re.search(r'batch-(\d+)', os.path.basename(os.path.normpath(folder)))
    batch = []
    if m and os.path.exists(BATCHES):
        all_b = json.load(open(BATCHES))['batches']
        k = int(m.group(1))
        batch = all_b[k - 1] if 0 < k <= len(all_b) else []
    for fname in sorted(os.listdir(folder)):
        slug, ext = os.path.splitext(fname)
        slug = slug.lower()
        if slug.isdigit() and batch:
            n = int(slug)
            slug = batch[n - 1] if 0 < n <= len(batch) else slug
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
