// Tests/shopSections.mjs — 25 Nov 2026 v1
// Gate 13. Phase 35: the shopping list by where things go, or aisle order.
//
// Arranging is built on each food's kind (data/shelves.js), so the checks
// are: every kind has a place; Fridge, Cupboard and Home show their kinds
// as sub-headings and nothing empty; aisle order is the shelves' walking
// order; everyday foods land where a person would put them away; the
// choice is remembered; the shared text follows the choice.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};
const store = new Map();
globalThis.localStorage = globalThis.localStorage || {
  getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k)
};

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const mod = await import(pathToFileURL(path.join(REPO, 'js/lib/shopSections.js')).href);
const shelves = await import(pathToFileURL(path.join(REPO, 'js/data/shelves.js')).href);

// 1. Every kind has a place, and no kind lands in Other unless it is other.
for (const { value } of shelves.SHELVES) {
  const place = mod.placeOf(value);
  check(`kind "${value}" has a place`, mod.PLACES.some((p) => p.value === place) && (value === 'other' || place !== 'other'), place);
}

// 2. Everyday foods, put away where a person would.
const foods = [
  ['Chicken breast, skinless', 'food_fresh', 'fridge', 'meat'],
  ['Beef mince, 5% fat', 'food_fresh', 'fridge', 'meat'],
  ['Salmon fillet', 'food_fresh', 'fridge', 'fish'],
  ['Milk, semi-skimmed', 'food_fresh', 'fridge', 'dairy'],
  ['Cheddar cheese', 'food_fresh', 'fridge', 'dairy'],
  ['Egg, medium', 'food_fresh', 'fridge', 'dairy'],
  ['Peas', 'food_frozen', 'freezer', 'frozen'],
  ['Apple, medium', 'food_fresh', 'fruit', 'fruit'],
  ['Banana, medium', 'food_fresh', 'fruit', 'fruit'],
  ['Carrot, medium', 'food_fresh', 'veg', 'veg'],
  ['Butternut squash', 'food_fresh', 'veg', 'veg'],
  ['Bread, white sliced loaf', 'food_fresh', 'bakery', 'bread'],
  ['Chopped tomatoes, tinned', 'food_ambient', 'cupboard', 'tinned'],
  ['Spaghetti, dry', 'food_ambient', 'cupboard', 'dried'],
  ['Flour, plain', 'food_ambient', 'cupboard', 'baking'],
  ['Cumin, ground', 'food_ambient', 'cupboard', 'spices'],
  ['Olive oil', 'food_ambient', 'cupboard', 'sauces'],
  ['Crisps', 'food_ambient', 'cupboard', 'snacks'],
  ['Orange juice', 'drink', 'drinks', 'drinks'],
  ['Washing up liquid', 'household', 'home', 'household'],
  ['Toothpaste', 'personal', 'home', 'personal'],
  ['Cat food', 'pet', 'home', 'pet']
];
for (const [name, category, place, kind] of foods) {
  const got = shelves.shelfOf({ name, category });
  check(`"${name}" is ${kind}`, got === kind, got);
  check(`"${name}" goes in ${place}`, mod.placeOf(got) === place, mod.placeOf(got));
}

// 3. Arranging.
const items = foods.map(([name, category], i) => ({ id: `i${i}`, status: 'needed', foods: { name, category } }));
const kindOf = (item) => shelves.shelfOf(item.foods);
const where = mod.arrange(items, kindOf, 'where');
check('where: Graeme\'s order, fridge first', where.map((g) => g.key).join(',') === 'fridge,freezer,fruit,veg,bakery,cupboard,drinks,home', where.map((g) => g.key).join(','));
const fridge = where.find((g) => g.key === 'fridge');
check('fridge has Meat, Fish, Dairy and eggs as sub-headings', fridge.subs.map((s) => s.label).join(' · ') === 'Meat · Fish · Dairy and eggs', fridge.subs.map((s) => s.label).join(' · '));
check('fridge lines are all its subs\' lines', fridge.lines.length === fridge.subs.reduce((n, s) => n + s.lines.length, 0));
check('cupboard has six kinds', where.find((g) => g.key === 'cupboard').subs.length === 6);
check('fruit has no sub-heading', where.find((g) => g.key === 'fruit').subs.length === 0);
const onlyMeat = mod.arrange(items.slice(0, 2), kindOf, 'where');
check('empty kinds are not shown', onlyMeat.length === 1 && onlyMeat[0].subs.length === 1, JSON.stringify(onlyMeat.map((g) => g.subs.map((s) => s.key))));
const aisle = mod.arrange(items, kindOf, 'aisle');
const ranks = aisle.map((g) => shelves.shelfRank(g.key));
check('aisle: the shelves\' walking order', ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), aisle.map((g) => g.key).join(','));
check('aisle: no sub-headings', aisle.every((g) => g.subs.length === 0));
check('lines in name order', mod.arrange([
  { foods: { name: 'Pear', category: 'food_fresh' } }, { foods: { name: 'Apple', category: 'food_fresh' } }
], kindOf, 'where')[0].lines.map((l) => l.foods.name).join() === 'Apple,Pear');

// 4. The choice is remembered.
check('default is Where it goes', mod.readSort() === 'where');
mod.saveSort('aisle');
check('Aisle order is remembered', mod.readSort() === 'aisle');
mod.saveSort('nonsense');
check('anything else falls back to Where it goes', mod.readSort() === 'where');

// 5. The shared list follows the choice.
const shop = await import(pathToFileURL(path.join(REPO, 'js/views/kitchenShop.js')).href);
const shared = [
  { status: 'needed', qty_needed: 1, unit: 'item', foods: { name: 'Salmon fillet', category: 'food_fresh' } },
  { status: 'needed', qty_needed: 1, unit: 'item', foods: { name: 'Apple, medium', category: 'food_fresh' } }
];
const whereText = shop.listAsText(shared, { sort: 'where' });
const aisleText = shop.listAsText(shared, { sort: 'aisle' });
check('shared text, where: Fridge › Fish before Fruit', /Fridge\n {2}Fish\n- Salmon fillet[\s\S]*Fruit\n- Apple/.test(whereText), whereText);
check('shared text, aisle: Fruit before Fish', /Fruit\n- Apple[\s\S]*Fish\n- Salmon/.test(aisleText), aisleText);

console.log(`  ${checks} checks`);
if (failures.length) { for (const f of failures) console.log(`  ✗ ${f}`); process.exit(1); }
console.log('  ✓ shop sections: places, sub-headings, both orders, remembered, shared');
