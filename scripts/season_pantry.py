#!/usr/bin/env python3
# scripts/season_pantry.py — 27 Nov 2026 v1
# Phase 40. Foods the seasons and occasions need that the pantry lacked:
# corn on the cob, ribs, wings and chops for the barbecue; asparagus, new
# potatoes and broad beans for spring; peaches and watermelon for summer;
# pumpkin and cooking apples for autumn and Halloween; marshmallows and
# sprinkles for campfires and birthdays.
#
# Same rule as scripts/world_pantry.py, whose figures() this reuses: CoFID
# 2019 first, USDA SR Legacy second (fibre taken out of carbohydrate),
# typical UK label values third, no brands. Every entry names its basis.
#
# Run: python3 scripts/season_pantry.py   (idempotent: replaces its own slugs)

import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from world_pantry import figures  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABEL = 'Typical of UK supermarket labels per 100 g; brands vary.'

SPEC = [
  # ---- Barbecue and outdoor ----
  dict(slug='corn-on-the-cob', name='Corn on the cob', category='food_fresh', aliases=['corn cobs', 'sweetcorn cobs', 'corn on the cob', 'corn cob'],
       grams_per_item=150, item_label='cob', src=('us', 'Corn, sweet, yellow, raw'), basis_extra='One cob is about 150 g of kernels.'),
  dict(slug='pork-ribs', name='Pork spare ribs', category='food_fresh', aliases=['spare ribs', 'pork ribs', 'baby back ribs', 'rack of ribs'],
       src=('us', 'Pork, fresh, spareribs, separable lean and fat, raw'), basis_extra='Weighed as meat off the bone, about 60% of the rack.'),
  dict(slug='chicken-wings', name='Chicken wings', category='food_fresh', aliases=['chicken wing', 'wings'], grams_per_item=90, item_label='wing',
       src=('uk', 'Chicken, wing quarter, raw, meat and skin')),
  dict(slug='chicken-whole', name='Whole chicken', category='food_fresh', aliases=['whole chicken', 'spatchcock chicken', 'roasting chicken'],
       src=('uk', 'Chicken, whole, raw, meat and skin'), basis_extra='Weighed as meat and skin, about two thirds of the bird.'),
  dict(slug='lamb-chops', name='Lamb loin chops', category='food_fresh', aliases=['lamb chops', 'lamb chop'], grams_per_item=90, item_label='chop',
       src=('uk', 'Lamb, loin chops, raw, lean and fat')),
  dict(slug='pork-chops', name='Pork loin chops', category='food_fresh', aliases=['pork chops', 'pork chop'], grams_per_item=170, item_label='chop',
       src=('uk', 'Pork, loin chops, raw, lean and fat')),
  dict(slug='pork-shoulder', name='Pork shoulder', category='food_fresh', aliases=['pork shoulder joint', 'pork butt', 'pulled pork shoulder'],
       src=('us', 'Pork, fresh, shoulder, whole, separable lean and fat, raw')),
  dict(slug='beef-brisket', name='Beef brisket', category='food_fresh', aliases=['brisket', 'brisket joint'],
       src=('uk', 'Beef, brisket, raw, lean and fat')),
  dict(slug='marshmallows', name='Marshmallows', category='food_ambient', aliases=['marshmallow', 'mini marshmallows'], grams_per_item=7, item_label='marshmallow',
       src=('uk', 'Marshmallows')),

  # ---- Spring ----
  dict(slug='asparagus', name='Asparagus', category='food_fresh', aliases=['asparagus spears', 'asparagus tips'], grams_per_item=20, item_label='spear',
       src=('uk', 'Asparagus, raw')),
  dict(slug='new-potatoes', name='New potatoes', category='food_fresh', aliases=['new potatoes', 'salad potatoes', 'baby potatoes', 'jersey royals'], grams_per_item=40, item_label='potato',
       src=('uk', 'Potatoes, new and salad, flesh only, raw')),
  dict(slug='broad-beans', name='Broad beans', category='food_frozen', aliases=['broad beans', 'fava beans'], grams_per_ml=0.6,
       src=('uk', 'Beans, broad, whole, raw')),
  dict(slug='spring-greens', name='Spring greens', category='food_fresh', aliases=['spring cabbage', 'greens'],
       src=('uk', 'Spring greens, raw')),
  dict(slug='gooseberries', name='Gooseberries', category='food_fresh', aliases=['gooseberry', 'cooking gooseberries'],
       src=('uk', 'Gooseberries, cooking, raw')),

  # ---- Summer ----
  dict(slug='peach', name='Peach', category='food_fresh', aliases=['peaches', 'nectarine', 'nectarines'], grams_per_item=150, item_label='peach',
       src=('uk', 'Peaches, raw, flesh and skin')),
  dict(slug='watermelon', name='Watermelon', category='food_fresh', aliases=['water melon'],
       src=('us', 'Watermelon, raw')),
  dict(slug='wine-rose', name='Rosé wine', category='drink', aliases=['rose wine', 'rosé', 'rose'], grams_per_ml=1.0,
       src=('uk', 'Wine, rose, medium')),
  dict(slug='meringue-nests', name='Meringue nests', category='food_ambient', aliases=['meringue', 'meringues', 'meringue nest'], grams_per_item=13, item_label='nest',
       src=('uk', 'Meringue, homemade')),

  # ---- Autumn and Halloween ----
  dict(slug='pumpkin', name='Pumpkin', category='food_fresh', aliases=['pumpkin flesh', 'carving pumpkin', 'crown prince squash'],
       src=('uk', 'Pumpkin, flesh only, raw')),
  dict(slug='apple-cooking', name='Cooking apple', category='food_fresh', aliases=['cooking apples', 'bramley apple', 'bramley apples', 'bramleys'], grams_per_item=220, item_label='apple',
       src=('uk', 'Apples, cooking, raw, flesh only, peeled')),
  dict(slug='sprinkles', name='Sprinkles', category='food_ambient', aliases=['hundreds and thousands', 'sugar sprinkles', 'cake sprinkles'], grams_per_ml=0.8,
       src=('label', 395, 0.5, 1.5, 93.0, 0.0, LABEL)),
]


def main():
    ref_path = os.path.join(ROOT, 'data', 'food_reference.json')
    doc = json.load(open(ref_path, encoding='utf-8'))
    usda = {r[1]: r for r in json.load(open(os.path.join(ROOT, 'data', 'usda.json'), encoding='utf-8'))['foods']}
    cofid = {r[1]: r for r in json.load(open(os.path.join(ROOT, 'data', 'cofid.json'), encoding='utf-8'))['foods']}
    foods = doc['foods']
    by = {f['slug']: f for f in foods}
    made = dict(by)
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
    note = doc.get('note', '')
    v6 = " v6 (27 Nov 2026): seasons and occasions foods (barbecue cuts, spring and summer produce, pumpkin, marshmallows, sprinkles)."
    if 'v6 (27 Nov 2026)' not in note:
        doc['note'] = note + v6
    # The version stays 5: no existing food changed, so saved foods need no refresh.
    with open(ref_path, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(f'{len(SPEC)} season foods; {len(foods)} in all')


if __name__ == '__main__':
    main()
