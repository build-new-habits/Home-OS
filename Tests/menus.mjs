// Tests/menus.mjs — 27 Nov 2026 v4
// v4: the chefs' batch: 558 recipes, 130 menus; floors raised again; vermouth and bitter aperitivo count as drinks with alcohol.
// v3: the luxury batch: 279 recipes, 58 menus; floors doubled; sake counts as a drink with alcohol.
// v2: the second batch: 138 recipes, 29 menus; the floors rise with them.
// Gate 18. Phase 38. Christmas recipes and menus.
//
// Every menu is checked against the real library:
//   - every dish, side and drink it names is a library recipe
//   - the starter is a starter, the main a main, the pudding a pudding,
//     sides are marked side, and linked drinks are drinks
//   - every course has a soft pairing AND a pairing with alcohol, in words
//   - a vegan menu is vegan all through, a vegetarian one vegetarian, and a
//     meat, fish or shellfish menu has that in it
//   - no brand names in pairings (styles and regions only)
//   - the filters offer at least two menus for every diet
// And the Christmas file itself: the spread asked for (starters, mains,
// puddings; meat, fish, shellfish, vegetarian, vegan; soft and alcoholic
// drinks), and sides never offered as a meal on their own.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const read = async (rel) => JSON.parse(await readFile(path.join(REPO, rel), 'utf8'));
const index = await read('data/recipe_library/index.json');
const all = [];
for (const f of index.files) all.push(...((await read(f.path)).recipes || []));
const bySlug = new Map(all.map((r) => [r.slug, r]));
const xmas = (await read('data/recipe_library/christmas.json')).recipes;
const doc = await read('data/menus/christmas.json');

const menus = await import(pathToFileURL(path.join(REPO, 'js/data/menus.js')).href);
const lib = await import(pathToFileURL(path.join(REPO, 'js/data/recipeLibrary.js')).href);
const ideas = await import(pathToFileURL(path.join(REPO, 'js/data/weekIdeas.js')).href);
const { courseOf } = await import(pathToFileURL(path.join(REPO, 'js/data/courses.js')).href);

// ---- The Christmas recipes: the spread asked for --------------------------------
const count = (pred) => xmas.filter(pred).length;
const food = xmas.filter((r) => r.default_slot !== 'drink');
check('Christmas is in the library index', index.files.some((f) => f.cuisine === 'Christmas' && f.count === xmas.length));
check('at least 120 starters', count((r) => r.course === 'starter') >= 120);
check('at least 150 mains', count((r) => r.course === 'main') >= 150);
check('at least 120 puddings', count((r) => r.course === 'pudding') >= 120);
check('at least 60 sides', count((r) => r.side === true) >= 60);
const proteins = (r) => lib.proteinsOf(r);
check('meat dishes', food.filter((r) => proteins(r).includes('meat')).length >= 5);
check('fish dishes', food.filter((r) => r.ingredients.some((i) => /salmon|hake|cod|trout/.test(i.ref))).length >= 3);
check('shellfish dishes', food.filter((r) => r.ingredients.some((i) => /prawn|scallop|lobster|crab|mussel/.test(i.ref))).length >= 4);
check('vegetarian dishes', food.filter((r) => (r.dietary_tags || []).includes('vegetarian')).length >= 12);
check('vegan dishes', food.filter((r) => (r.dietary_tags || []).includes('vegan')).length >= 8);
const drinks = xmas.filter((r) => r.default_slot === 'drink');
const boozy = (r) => r.ingredients.some((i) => /^(wine-.*|sparkling-wine|cider-dry|spirit-40|orange-liqueur|port|sherry|beer-.*|sake|vermouth|bitter-aperitivo)$/.test(i.ref));
check('soft drinks', drinks.filter((r) => !boozy(r)).length >= 5);
check('drinks with alcohol', drinks.filter(boozy).length >= 4);

// Tags tell the truth: a vegetarian or vegan dish has no meat or fish in it.
for (const r of food) {
  const tags = r.dietary_tags || [];
  if (tags.includes('vegetarian') || tags.includes('vegan')) {
    check(`${r.slug} tagged vegetarian has no meat or fish`, proteins(r).length === 0, proteins(r).join(','));
  }
  if (tags.includes('vegan')) {
    const animal = r.ingredients.filter((i) => /^(egg-|milk-|double-cream|single-cream|butter-|cheddar|parmesan|feta|goats-cheese|stilton|creme-fraiche|soured-cream|honey|custard|mascarpone|gelatine)/.test(i.ref));
    check(`${r.slug} tagged vegan has no animal products`, animal.length === 0, animal.map((i) => i.ref).join(','));
  }
}

// Sides are never a meal idea on their own.
const candidates = ideas.candidatesFrom({ meals: [], recipes: xmas });
for (const c of candidates) {
  if (c.recipe && c.recipe.side) check(`${c.recipe.slug} is a side, not a main idea`, c.course === 'side', c.course);
}
check('a side added to My meals is still a side', ideas.candidatesFrom({
  meals: [{ id: 'm1', name: 'Crisp roast potatoes', library_ref: 'xmas-roast-potatoes' }], recipes: xmas
}).find((c) => c.key === 'meal:m1').course === 'side');

// ---- The menus -------------------------------------------------------------------
const BRANDS = /\b(cointreau|grand marnier|baileys|bailey's|tia maria|disaronno|smirnoff|gordon'?s|tanqueray|bombay|hendrick'?s|jack daniel'?s|bacardi|captain morgan|moet|möet|veuve|bollinger|taittinger|lanson|prosecco doc brand|ribena|robinsons|bottlegreen|belvoir|fever-?tree|schweppes|coca-?cola|pepsi|innocent|tropicana|ocean spray)\b/i;
const SHAME = /\b(simply|just|obviously|quickly|easy|easily|merely|guilt|cheat|naughty|sinful)\b/i;

const list = doc.menus || [];
check('at least 110 menus', list.length >= 110, String(list.length));
const seen = new Set();
for (const m of list) {
  const id = `menu ${m.slug}`;
  check(`${id} has a unique slug`, Boolean(m.slug) && !seen.has(m.slug));
  seen.add(m.slug);
  check(`${id} has a name and summary`, Boolean(m.name) && Boolean(m.summary));
  check(`${id} diet is a filter`, menus.DIETS.some((d) => d.value && d.value === m.diet), m.diet);
  check(`${id} serves a sensible number`, Number.isInteger(m.serves) && m.serves >= 1 && m.serves <= 12);
  check(`${id} words carry no shame`, !SHAME.test(`${m.name} ${m.summary} ${m.note || ''}`));
  const order = (m.courses || []).map((c) => c.course);
  check(`${id} runs starter, main, pudding`, order.join(',') === 'starter,main,pudding', order.join(','));

  for (const c of m.courses || []) {
    const cid = `${id} ${c.course}`;
    const dish = bySlug.get(c.recipe);
    check(`${cid} dish ${c.recipe} is in the library`, Boolean(dish));
    if (dish) check(`${cid} dish is a ${c.course}`, courseOf(dish) === c.course && !dish.side, `${courseOf(dish)}${dish.side ? ' side' : ''}`);
    for (const s of c.sides || []) {
      const side = bySlug.get(s);
      check(`${cid} side ${s} is in the library`, Boolean(side));
      if (side) check(`${cid} side ${s} is marked side`, side.side === true);
    }
    for (const kind of ['soft', 'alcoholic']) {
      const p = c.pairing && c.pairing[kind];
      check(`${cid} has a ${kind} pairing in words`, Boolean(p && typeof p.text === 'string' && p.text.trim().length > 3));
      if (!p) continue;
      check(`${cid} ${kind} pairing names no brand`, !BRANDS.test(p.text), p.text);
      if (p.recipe) {
        const r = bySlug.get(p.recipe);
        check(`${cid} ${kind} drink ${p.recipe} is in the library`, Boolean(r));
        if (r) {
          check(`${cid} ${kind} drink is a drink`, r.default_slot === 'drink');
          check(`${cid} ${kind} drink is ${kind === 'soft' ? 'soft' : 'alcoholic'}`, kind === 'soft' ? !boozy(r) : boozy(r));
        }
      }
    }
    const resolved = menus.resolveCourse(c, bySlug);
    check(`${cid} resolves to a link`, resolved.href === `#/recipe?r=${encodeURIComponent(c.recipe)}`);
  }

  // The diet on the label is the diet of the food.
  const suits = menus.menuSuits(m, bySlug);
  const foodSlugs = menus.menuSlugs(m, { drinks: false });
  const has = (k) => foodSlugs.some((s) => bySlug.get(s) && proteins(bySlug.get(s)).includes(k));
  const shell = foodSlugs.some((s) => (bySlug.get(s) || { ingredients: [] }).ingredients.some((i) => /prawn|scallop|lobster|crab|mussel/.test(i.ref)));
  if (m.diet === 'vegan') check(`${id} is vegan all through`, suits.includes('vegan'), suits.join(','));
  if (m.diet === 'vegetarian') check(`${id} is vegetarian all through`, suits.includes('vegetarian'), suits.join(','));
  if (m.diet === 'meat') check(`${id} has meat in it`, has('meat'));
  if (m.diet === 'fish') check(`${id} has fish in it`, has('fish'));
  if (m.diet === 'shellfish') check(`${id} has shellfish in it`, shell);
  if (m.diet === 'vegan' || m.diet === 'vegetarian') check(`${id} has no meat or fish`, !has('meat') && !has('fish'));
  if (m.diet === 'vegan') check(`${id} says to check wine labels`, /vegan/i.test(m.note || ''));
}
for (const d of menus.DIETS.filter((x) => x.value)) {
  check(`at least two ${d.label.toLowerCase()} menus`, menus.filterMenus(list, d.value).length >= 2);
}
check('All shows every menu', menus.filterMenus(list, '').length === list.length);
check('menu links carry the occasion', menus.menuHref('a b') === '#/menu?o=christmas&m=a%20b');
check('menuSlugs lists food before drinks, once each',
  JSON.stringify(menus.menuSlugs({ courses: [{ recipe: 'a', sides: ['b', 'a'], pairing: { soft: { recipe: 'd' }, alcoholic: { text: 'x' } } }] }))
  === JSON.stringify(['a', 'b', 'd']));
check('a soft pairing is offered for drivers and children', /soft/i.test(doc.drinks_note || ''));

if (failures.length) {
  console.log(`MENUS GATE FAILED — ${failures.length} of ${checks} checks`);
  for (const f of failures.slice(0, 60)) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`MENUS GATE PASSED — ${xmas.length} Christmas recipes, ${list.length} menus, ${checks} checks`);
