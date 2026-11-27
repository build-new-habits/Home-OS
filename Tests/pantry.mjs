// Tests/pantry.mjs — 27 Nov 2026 v1
// Gate 17. Phase 38. The macros rule.
//
// Graeme, 27 Nov 2026: "All ingredients, including bottle green peppercorns,
// spices, kaffir lime leaves, pastes, etc need macros, so this needs updating
// as a rule. It needs to be reliable and consistent for world foods and more
// common foods."
//
// The rule, checked on every food and every recipe, every run:
//   1. Every food (not household, toiletries or pet) has energy, protein,
//      fat, carbohydrate and fibre, all numbers, none negative.
//   2. Every food says where its figures come from (`basis`).
//   3. A figure cited from the UK or US tables matches that table row, with
//      carbohydrate UK-style (fibre not counted) for USDA rows.
//   4. Energy adds up: kcal is within reach of 4 protein + 9 fat + 3.75
//      carbohydrate + 2 fibre (+ 7 alcohol for drinks with alcohol).
//   5. No name or alias points at two foods.
//   6. Every library ingredient converts to grams: g, or ml/tsp/tbsp with a
//      density, or items with a weight. A figure per 100 g is no use for
//      "2 star anise" without the weight of a star.
//   7. Every library recipe's nutrition is complete: nothing left unknown.
//   8. World-food and everyday ingredient lines, typed as a cook writes them,
//      resolve to a food with figures and an amount in grams.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const read = async (rel) => JSON.parse(await readFile(path.join(REPO, rel), 'utf8'));
const reference = await read('data/food_reference.json');
const usda = await read('data/usda.json');
const cofid = await read('data/cofid.json');

const NOT_FOOD = new Set(['household', 'personal', 'pet', 'home']);
const FIVE = ['calories_per_100g', 'protein_g', 'fat_g', 'carbs_g', 'fibre_g'];
const foods = reference.foods.filter((f) => !NOT_FOOD.has(f.category));
const bySlug = new Map(reference.foods.map((f) => [f.slug, f]));

// ---- 1 and 2: five figures and a basis ------------------------------------
for (const f of foods) {
  for (const k of FIVE) {
    const v = f[k];
    check(`${f.slug} has ${k}`, typeof v === 'number' && Number.isFinite(v) && v >= 0, String(v));
  }
  check(`${f.slug} says where its figures come from`, typeof f.basis === 'string' && f.basis.trim().length > 10);
}

// ---- 3: cited figures match the table they cite ---------------------------
function rowFor(basis, prefix, rows) {
  if (!basis.startsWith(prefix)) return undefined;
  const rest = basis.slice(prefix.length);
  let best = null;
  for (const r of rows) if (rest.startsWith(r[1]) && (!best || r[1].length > best[1].length)) best = r;
  return best;
}
let cited = 0;
for (const f of foods) {
  const b = f.basis || '';
  for (const [prefix, rows, us] of [['CoFID 2019: ', cofid.foods, false], ['USDA SR Legacy: ', usda.foods, true]]) {
    const row = rowFor(b, prefix, rows);
    if (row === undefined) continue;
    cited += 1;
    check(`${f.slug} cites a row that exists`, Boolean(row), b);
    if (!row) continue;
    // Some CoFID-cited foods are a portion of a mixed dish and say so; those
    // stored the table figures unchanged, so the comparison holds for all.
    const [, , kcal, p, fat, carbs, fibre] = row;
    const fib = fibre ?? 0;
    const want = { calories_per_100g: kcal, protein_g: p ?? 0, fat_g: fat ?? 0, carbs_g: us ? Math.max(0, (carbs ?? 0) - fib) : (carbs ?? 0), fibre_g: fib };
    for (const k of FIVE) {
      const tol = k === 'calories_per_100g' ? 1 : 0.11;
      check(`${f.slug} ${k} matches ${prefix.trim()} ${row[1]}`, Math.abs(f[k] - want[k]) <= tol, `${f[k]} vs ${Math.round(want[k] * 10) / 10}`);
    }
  }
}
check('figures cited from the tables are being checked', cited >= 150, String(cited));

// ---- 4: energy adds up ------------------------------------------------------
const ALCOHOL = /\b(wine|beer|lager|cider|spirit|brandy|port|sherry|liqueur|gin|rum|vodka|whisky|prosecco|eggnog|vanilla extract)\b/i;
// Published figures that do not add up by the general factors, for a reason:
//   balsamic vinegar   acetic acid carries energy
//   baking powder      the table counts it this way
//   USDA spices, cocoa and herb blends: USDA energy uses specific factors and
//                      counts more of the fibre, so its kcal runs higher
const ENERGY_OK = new Set(['balsamic-vinegar', 'baking-powder', 'cocoa-powder', 'coriander-ground', 'turmeric-ground',
  'cayenne-pepper', 'cloves', 'allspice', 'five-spice', 'dried-mixed-herbs', 'fresh-rosemary', 'fresh-thyme']);
for (const f of foods) {
  if (ENERGY_OK.has(f.slug)) continue;
  const calc = 4 * f.protein_g + 9 * f.fat_g + 3.75 * f.carbs_g + 2 * f.fibre_g;
  const tol = Math.max(25, 0.15 * f.calories_per_100g);
  const words = `${f.name} ${(f.aliases || []).join(' ')}`;
  const ok = Math.abs(f.calories_per_100g - calc) <= tol || (ALCOHOL.test(words) && f.calories_per_100g > calc);
  check(`${f.slug} energy adds up`, ok, `${f.calories_per_100g} kcal stated, ${Math.round(calc)} from its figures`);
}

// ---- 5: one name, one food ----------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const owner = new Map();
for (const f of reference.foods) {
  for (const k of [f.name, ...(f.aliases || [])]) {
    const key = norm(k);
    const was = owner.get(key);
    check(`"${key}" names one food`, !was || was === f.slug, `${was} and ${f.slug}`);
    owner.set(key, f.slug);
  }
}

// ---- 6 and 7: every library ingredient converts; every recipe is complete ----
const { recipeNutrition } = await import(pathToFileURL(path.join(REPO, 'js/data/nutrition.js')).href);
const refMap = new Map(reference.foods.map((f) => [f.slug, f]));
const libDir = path.join(REPO, 'data', 'recipe_library');
let recipes = 0;
for (const file of (await readdir(libDir)).filter((n) => n.endsWith('.json') && n !== 'index.json')) {
  const doc = JSON.parse(await readFile(path.join(libDir, file), 'utf8'));
  for (const r of doc.recipes || []) {
    recipes += 1;
    for (const ing of r.ingredients || []) {
      const f = bySlug.get(ing.ref);
      if (!f) continue; // the library gate reports unknown refs
      const ok = ing.unit === 'g'
        || (['ml', 'tsp', 'tbsp'].includes(ing.unit) && Number(f.grams_per_ml) > 0)
        || (ing.unit === 'item' && Number(f.grams_per_item) > 0);
      check(`${file}:${r.slug} ${ing.ref} in ${ing.unit} converts to grams`, ok);
    }
    const n = recipeNutrition(r, refMap);
    const unknown = Object.entries(n.complete || {}).filter(([, v]) => v === false).map(([k]) => k);
    check(`${file}:${r.slug} nutrition is complete`, unknown.length === 0, unknown.join(','));
    check(`${file}:${r.slug} has energy per serving`, Number(n.perServing && n.perServing.calories) > 0
      || (r.ingredients || []).every((i) => (bySlug.get(i.ref) || {}).calories_per_100g === 0));
  }
}
check('the whole library was read', recipes >= 300, String(recipes));

// ---- 8: ingredient lines as a cook writes them ----------------------------------
const own = await import(pathToFileURL(path.join(REPO, 'js/data/ownRecipe.js')).href);
const index = own.buildNameIndex(reference.foods, []);
const LINES = [
  // South-east Asian
  '4 kaffir lime leaves, shredded', '2 makrut lime leaves', '20g galangal, sliced', '1 lemongrass stalk', '2 stalks lemongrass',
  '1 tsp shrimp paste', '1 tbsp fish sauce', '2 tbsp Thai green curry paste', '1 tbsp red curry paste', '10g palm sugar',
  '1 tbsp oyster sauce', '2 tbsp hoisin sauce', '1 tbsp tamarind paste', '400ml coconut milk', '300g jasmine rice',
  '2 tbsp gochujang', '1 tbsp miso paste', '1 tsp Chinese five spice', '2 tbsp soy sauce', '1 tsp sesame oil',
  // South Asian and Middle Eastern
  '10 curry leaves', '1 tsp mustard seeds', '1 tsp fenugreek seeds', '4 cardamom pods', '1 tsp garam masala',
  '1 tsp ground turmeric', '1 tsp ground cumin', '1 tsp sumac', "1 tbsp za'atar", '2 tsp ras el hanout',
  '1 tbsp pomegranate molasses', '1 tsp rose water', '1 tbsp harissa paste', '2 tbsp tahini', 'a pinch of saffron',
  // Peppers and whole spices
  '1 tbsp green peppercorns in brine, drained', '2 tbsp green peppercorns', '1 tsp black peppercorns', '1/2 tsp white pepper',
  '1/4 tsp cayenne pepper', '1 tsp smoked paprika', '2 star anise', '1 cinnamon stick', '6 cloves', '1 tsp ground allspice',
  '1/2 tsp ground nutmeg', '1 tsp ground ginger', '6 juniper berries', '1 tsp fennel seeds', '2 tsp mixed spice',
  '1 tsp dried mixed herbs', '1 tsp garlic powder', '2 bay leaves',
  // Christmas
  '2.5kg turkey crown', '2kg gammon joint', '1.2kg beef fillet', '4 duck legs', '16 chipolatas', '8 rashers streaky bacon',
  '80g pancetta', '400g chicken livers', '12 scallops', '4 lobster tails', '250g white crab meat', '400g raw king prawns',
  '200g smoked salmon', '24 blinis', '750g Brussels sprouts', '1 red cabbage', '180g cooked chestnuts', '300g cranberries',
  '4 clementines', '80g pomegranate seeds', '150ml crème fraîche', '150g goats cheese', '120g Stilton', '100g vegetable suet',
  '100g currants', '150g sultanas', '50g mixed peel', '400g mincemeat', '125g dark muscovado sugar', '1 tbsp black treacle',
  '320g puff pastry', '18 sponge fingers', '400g panettone', '100ml port', '4 tbsp brandy', '50ml gin', '750ml prosecco',
  '200ml oat cream', '350g silken tofu', '30g nutritional yeast', '60g panko breadcrumbs', '1 tbsp cranberry sauce',
  // Everyday
  '2 onions, finely chopped', '3 garlic cloves, crushed', '400g tin chopped tomatoes', '2 tbsp olive oil', '200g basmati rice',
  '1 large egg', '250ml milk', '100g cheddar, grated', '1 tsp salt', '300g spaghetti', '2 carrots, diced', '1 lemon'
];
let resolved = 0;
for (const line of LINES) {
  const parsed = own.parseIngredientLine(line);
  const hit = parsed && own.resolveName(parsed.name, index);
  const entry = hit && hit.entry;
  const hasFigures = Boolean(entry) && FIVE.every((k) => typeof entry[k] === 'number');
  check(`"${line}" finds a food`, Boolean(entry), parsed ? `read as "${parsed.name}"` : 'not read');
  if (!entry) continue;
  check(`"${line}" → ${entry.slug} has all five figures`, hasFigures);
  const q = Number(parsed.quantity);
  if (Number.isFinite(q) && q > 0) {
    const grams = parsed.unit === 'g'
      || (['ml', 'tsp', 'tbsp'].includes(parsed.unit) && Number(entry.grams_per_ml) > 0)
      || (parsed.unit === 'item' && Number(entry.grams_per_item) > 0);
    check(`"${line}" → ${entry.slug} converts to grams (${parsed.unit})`, grams);
  }
  if (hasFigures) resolved += 1;
}
check('every ingredient line resolved', resolved === LINES.length, `${resolved} of ${LINES.length}`);

// ---- One carbohydrate in every table, and old foods brought up to date ----------
const cof = await import(pathToFileURL(path.join(REPO, 'js/data/cofid.js')).href);
const cinnamonUS = cof.indexFoods(usda.foods.filter((r) => r[1] === 'Spices, cinnamon, ground'), 'us')[0];
check('US table search gives carbohydrate without fibre', cinnamonUS && Math.abs(cinnamonUS.carbs_g - 27.5) < 0.11, String(cinnamonUS && cinnamonUS.carbs_g));
const broccoliUK = cof.indexFoods(cofid.foods.filter((r) => r[1] === 'Broccoli, green, raw'), 'uk')[0];
check('UK table search is unchanged', broccoliUK && broccoliUK.carbs_g === 3.2, String(broccoliUK && broccoliUK.carbs_g));
check('ukCarbs leaves a missing figure missing', cof.ukCarbs(null, 3, 'us') === null);
check('ukCarbs never goes below zero', cof.ukCarbs(2, 5, 'us') === 0);

globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// The reference is fetched by URL in the app; here it is the file on disk.
globalThis.fetch = async (url) => {
  const p = decodeURIComponent(new URL(url).pathname);
  const at = p.lastIndexOf('/data/');
  const text = await readFile(path.join(REPO, p.slice(at + 1)), 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text) };
};
const repair = await import(pathToFileURL(path.join(REPO, 'js/data/nutritionRepair.js')).href);
const cin = bySlug.get('cinnamon-ground');
const stale = { id: 'f1', name: 'Cinnamon', source: 'reference', calories_per_100g: 247, protein_g: 4, fat_g: 1.2, carbs_g: 81 };
const patchCin = repair.referenceRefresh(stale, cin);
check('a reference food with old carbohydrate is refreshed', patchCin && patchCin.carbs_g === cin.carbs_g && patchCin.source === 'reference');
check('a reference food that agrees is left alone', repair.referenceRefresh({ ...stale, carbs_g: cin.carbs_g }, cin) === null);
const viaName = await repair.matchFood(stale, []);
check('a saved food is matched back to its reference by name, without the tables', viaName && viaName.via === 'reference' && viaName.figures.carbs_g === cin.carbs_g);
check('the refresh runs once per reference version', repair.REFERENCE_VERSION === reference.version, `${repair.REFERENCE_VERSION} vs ${reference.version}`);

if (failures.length) {
  console.log(`PANTRY GATE FAILED — ${failures.length} of ${checks} checks`);
  for (const f of failures.slice(0, 80)) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`PANTRY GATE PASSED — ${foods.length} foods, ${recipes} recipes, ${LINES.length} ingredient lines, ${checks} checks`);
