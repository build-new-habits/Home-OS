// Tests/nutrition.mjs — 03 Oct 2026 v1
// Kitchen rebuild, K4. The nutrition engine against HAND calculations, and
// every shipped library recipe worked out end to end.
//
// Why a whole-library sweep: the recipe page, the plan and Today all show
// these numbers. One recipe with a typo'd ref or a quantity in the wrong
// unit would show a confident wrong figure on three screens. Cheaper to
// refuse it here.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO = process.env.GATE_REPO || '/tmp/gate-repo';
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};

let pass = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${name}  ${detail}`); }
}
function eq(name, actual, expected) {
  check(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const {
  REFERENCE_INTAKES, resolveTargets, percentOfTarget, libraryRows,
  recipeNutrition, dayNutrition, nutritionRows
} = await import(`${REPO}/js/data/nutrition.js`);
const { computeMacros } = await import(`${REPO}/js/data/meals.js`);

// ============ Fibre in computeMacros ============
console.log('\nFibre is optional');
const oats = { name: 'Oats', calories_per_100g: 375, protein_g: 11, fat_g: 8, carbs_g: 60, fibre_g: 9 };
const oatsNoFibre = { name: 'Oats', calories_per_100g: 375, protein_g: 11, fat_g: 8, carbs_g: 60 };
const withFibre = computeMacros([{ quantity_g: 50, foods: oats }], { serves: 1 });
eq('50 g oats at 9 g/100 g is 4.5 g fibre', withFibre.totals.fibre_g, 4.5);
const noFibre = computeMacros([{ quantity_g: 50, foods: oatsNoFibre }], { serves: 1 });
eq('a food without fibre is NOT an incomplete ingredient', noFibre.incompleteCount, 0);
eq('…but fibre is reported as not complete', noFibre.complete.fibre_g, false);
eq('…and the four core macros stay complete', noFibre.complete.calories, true);

// ============ Targets and percentages ============
console.log('\nTargets');
eq('UK energy reference intake', REFERENCE_INTAKES.calories, 2000);
eq('SACN fibre', REFERENCE_INTAKES.fibre_g, 30);
const t = resolveTargets({ calories: 2500, protein_g: 'lots', fat_g: -1, fibre_g: null });
eq('a valid override is used', t.calories, 2500);
eq('a non-number override falls back', t.protein_g, 50);
eq('a negative override falls back', t.fat_g, 70);
eq('a null override falls back', t.fibre_g, 30);
eq('no overrides at all is the defaults', resolveTargets(undefined).carbs_g, 260);
eq('1835 kcal is 92%', percentOfTarget(1835, 'calories'), 92);
eq('over 100% is reported, never clamped', percentOfTarget(90, 'protein_g'), 180);
eq('unknown value is null, not 0', percentOfTarget(null, 'fat_g'), null);
eq('zero is a real 0%', percentOfTarget(0, 'fat_g'), 0);

// ============ A recipe by hand ============
// 100 g oats (375 kcal, 9 fibre) + 300 ml milk at 1.03 g/ml (46 kcal/100 g,
// 0 fibre) + 1 banana item at 118 g (89 kcal/100 g, 2.6 fibre), serves 2.
// Energy: 375 + 309 g × 0.46 = 142.14 + 118 × 0.89 = 105.02 → 622.16 → /2 = 311.08
// Fibre:  9 + 0 + 3.068 = 12.068 → total rounds to 12.1 first → /2 = 6.05 → 6.1
console.log('\nA recipe worked by hand');
const ref = new Map([
  ['oats', { name: 'Oats', calories_per_100g: 375, protein_g: 11, fat_g: 8, carbs_g: 60, fibre_g: 9 }],
  ['milk', { name: 'Milk', calories_per_100g: 46, protein_g: 3.4, fat_g: 1.7, carbs_g: 4.8, fibre_g: 0, grams_per_ml: 1.03 }],
  ['banana', { name: 'Banana', calories_per_100g: 89, protein_g: 1.1, fat_g: 0.3, carbs_g: 22.8, fibre_g: 2.6, grams_per_item: 118 }]
]);
const recipe = { default_serves: 2, ingredients: [
  { ref: 'oats', quantity: 100, unit: 'g' },
  { ref: 'milk', quantity: 300, unit: 'ml' },
  { ref: 'banana', quantity: 1, unit: 'item' }
] };
const r = recipeNutrition(recipe, ref);
eq('energy per serving', r.perServing.calories, 311.1);
eq('fibre per serving (total rounded first, as computeMacros does)', r.perServing.fibre_g, 6.1);
eq('nothing incomplete', r.incompleteCount, 0);
const unknown = recipeNutrition({ default_serves: 1, ingredients: [{ ref: 'nope', quantity: 10, unit: 'g' }] }, ref);
eq('an unknown ref is counted incomplete, by name', unknown.incompleteNames[0], 'nope');
eq('rows keep the unit', libraryRows(recipe, ref)[1].unit, 'ml');

// ============ A day ============
console.log('\nA day');
const day = dayNutrition([
  { perServing: { calories: 311.1, carbs_g: 50, fat_g: 8, protein_g: 12, fibre_g: 6 } },
  { perServing: { calories: 500, carbs_g: 40, fat_g: 20, protein_g: 35, fibre_g: 5 }, portions: 2 },
  { perServing: { calories: 80, carbs_g: 20, fat_g: 0, protein_g: 0, fibre_g: 4 }, complete: { fibre_g: false } },
  null
]);
eq('energy adds up, with two portions counted twice', day.totals.calories, 1391.1);
eq('meals counted, nulls skipped', day.mealCount, 3);
eq('one unknown fibre makes the day "at least"', day.complete.fibre_g, false);
eq('…and leaves the others exact', day.complete.calories, true);
const rows = nutritionRows(day.totals, day.complete);
eq('five rows', rows.length, 5);
eq('energy rounds to whole kcal', rows[0].amount, 1391);
eq('energy percentage', rows[0].percent, 70);
eq('fibre row is marked at least', rows[4].atLeast, true);
eq('an empty day is zero, not unknown', dayNutrition([]).totals.protein_g, 0);
const noneKnown = nutritionRows({ calories: 500, carbs_g: 0, fat_g: 0, protein_g: 0, fibre_g: 0 }, { fibre_g: false });
eq('fibre with nothing counted is unknown, not "at least 0"', noneKnown[4].amount, null);
eq('…and has no percentage', noneKnown[4].percent, null);
eq('a real zero that is complete stays zero', noneKnown[2].amount, 0);

// ============ Recipe page helpers ============
console.log('\nRecipe page');
const { scaledAmount, cookingName, slugFromHash, mealIdFromHash, ownMealAsRecipe } = await import(`${REPO}/js/views/recipe.js`);
eq('grams scale', scaledAmount(100, 'g', 2), '200 g');
eq('large grams round to tens', scaledAmount(133, 'g', 1), '130 g');
eq('a kilo reads as kg', scaledAmount(800, 'g', 1.5), '1.2 kg');
eq('half an onion is a fraction', scaledAmount(1, 'item', 0.5), '½');
eq('two thirds of an egg rounds to a quarter step', scaledAmount(1, 'item', 2 / 3), '¾');
eq('never less than a quarter', scaledAmount(1, 'item', 0.1), '¼');
eq('a comma name turns round', cookingName('Oats, rolled'), 'Rolled oats');
eq('a plain name is left alone', cookingName('Honey'), 'Honey');
eq('the slug comes from the hash', slugFromHash('#/recipe?r=overnight-oats'), 'overnight-oats');
eq('no slug is empty, not undefined', slugFromHash('#/recipe'), '');

// Your own meals on the recipe page (#/recipe?m=<id>).
eq('a meal id comes from the hash', mealIdFromHash('#/recipe?m=3f2a-77b1'), '3f2a-77b1');
eq('no meal id is empty', mealIdFromHash('#/recipe?r=overnight-oats'), '');
{
  const meal = { id: 'm1', name: 'Our chilli', default_serves: 4, dietary_tags: ['gf'] };
  const rows = [
    { food_id: 1, quantity_g: 500, unit: 'g', foods: { name: 'Beef mince', calories_per_100g: 250, protein_g: 26, fat_g: 16, carbs_g: 0 } },
    { food_id: 2, quantity_g: 400, unit: 'g', option_group: 'a', is_selected: true, foods: { name: 'Kidney beans', calories_per_100g: 100, protein_g: 7, fat_g: 0.5, carbs_g: 15 } },
    { food_id: 3, quantity_g: 400, unit: 'g', option_group: 'a', is_selected: false, foods: { name: 'Black beans', calories_per_100g: 130, protein_g: 9, fat_g: 0.5, carbs_g: 20 } }
  ];
  const steps = [{ instruction: 'Brown the mince.', duration_min: 8 }];
  const { recipe, refMap } = ownMealAsRecipe(meal, rows, steps);
  eq('own meal keeps its name and serves', `${recipe.name}/${recipe.default_serves}`, 'Our chilli/4');
  eq('unchosen options are left out', recipe.ingredients.map((i) => i.name).join(','), 'Beef mince,Kidney beans');
  eq('steps carry over', recipe.steps.length, 1);
  const n = recipeNutrition(recipe, refMap);
  eq('own meal nutrition is worked out per serving', Math.round(n.perServing.calories), Math.round((1250 + 400) / 4));
  check('an own meal has no library slug', recipe.slug === null);
}

// ============ Swap ideas ============
console.log('\nSwap ideas');
const { ideasFor, SWAP_GROUPS } = await import(`${REPO}/js/data/swaps.js`);
const refDocS = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8'));
const refSlugs = new Set(refDocS.foods.map((f) => f.slug));
const unknownSwaps = SWAP_GROUPS.flatMap((g) => g.foods).filter((slug) => !refSlugs.has(slug));
check('every swap names a real reference food', unknownSwaps.length === 0, unknownSwaps.join(', '));
const fakeRef = new Map([['tofu-firm', { name: 'Tofu, firm' }], ['chicken-thigh-boneless', { name: 'Chicken thigh, boneless' }]]);
const fakeRecipes = [
  { slug: 'curry', name: 'Chicken curry', ingredients: [{ ref: 'chicken-thigh-boneless' }, { ref: 'onion-medium' }] },
  { slug: 'tofu-bowl', name: 'Tofu bowl', ingredients: [{ ref: 'tofu-firm' }] },
  { slug: 'cake', name: 'Cake', ingredients: [{ ref: 'flour-plain' }] }
];
const tofu = ideasFor('tofu-firm', fakeRecipes, fakeRef);
eq('a recipe that already uses it is a use', tofu.uses[0] && tofu.uses[0].slug, 'tofu-bowl');
eq('tofu can stand in for chicken in the curry', tofu.swaps[0] && tofu.swaps[0].recipe.slug, 'curry');
check('the tip names both foods in kitchen words', /firm tofu/.test(tofu.swaps[0].tip) && /chicken thigh/.test(tofu.swaps[0].tip), tofu.swaps[0].tip);
eq('an unrelated recipe is not suggested', tofu.swaps.length, 1);
eq('no slug, no ideas', ideasFor('', fakeRecipes).uses.length, 0);

// ============ What is in the cupboard ============
console.log('\nCoverage');
const { haveNames, coverage } = await import(`${REPO}/js/data/recipeCoverage.js`);
const stockRows = [
  { foods: { name: 'Oats, rolled' }, current_qty: null, level: null },
  { foods: { name: 'Milk, semi-skimmed' }, current_qty: 0 },
  { foods: { name: 'Honey' }, level: 'none', level_set_at: new Date().toISOString(), shelf_life_days: 365 }
];
const haveSet = haveNames(stockRows, new Date().toISOString());
const covRef = new Map([['oats-rolled', { name: 'Oats, rolled' }], ['milk-semi-skimmed', { name: 'Milk, semi-skimmed' }], ['honey', { name: 'Honey' }], ['water', { name: 'Water' }]]);
const cov = coverage({ ingredients: [{ ref: 'oats-rolled' }, { ref: 'milk-semi-skimmed' }, { ref: 'honey' }, { ref: 'water' }] }, haveSet, covRef);
eq('in the cupboard with no amount counts as had', cov.have.some((i) => i.ref === 'oats-rolled'), true);
eq('a quantity of zero is missing', cov.missing.some((i) => i.ref === 'milk-semi-skimmed'), true);
eq('a level of none is missing', cov.missing.some((i) => i.ref === 'honey'), true);
eq('water is never missing', cov.have.some((i) => i.ref === 'water'), true);
eq('total counts every line', cov.total, 4);
const sized = coverage({ ingredients: [{ ref: 'onion-large' }] }, haveNames([{ foods: { name: 'Onion, medium' } }]), new Map([['onion-large', { name: 'Onion, large' }]]));
eq('a medium onion does for a large one', sized.missing.length, 0);
const butter = coverage({ ingredients: [{ ref: 'butter-block' }] }, haveNames([{ foods: { name: 'Butter beans, tinned' } }]), new Map([['butter-block', { name: 'Butter, block' }]]));
eq('butter beans are not butter', butter.missing.length, 1);

// ============ What can I make tonight ============
console.log('\nWhat can I make tonight');
const { rankRecipes } = await import(`${REPO}/js/data/recipeCoverage.js`);
const rRef = new Map([['a', { name: 'A' }], ['b', { name: 'B' }], ['c', { name: 'C' }], ['d', { name: 'D' }]]);
const ranked = rankRecipes([
  { slug: 'two-missing', name: 'Two missing', ingredients: [{ ref: 'a' }, { ref: 'c' }, { ref: 'd' }] },
  { slug: 'none-missing', name: 'None missing', ingredients: [{ ref: 'a' }] },
  { slug: 'none-missing-soon', name: 'Uses soon', ingredients: [{ ref: 'b' }] },
  { slug: 'have-nothing', name: 'Have nothing', ingredients: [{ ref: 'c' }] }
], new Set(['a', 'b']), rRef, new Set(['b']));
eq('nothing to buy comes first, and using up breaks the tie', ranked[0].recipe.slug, 'none-missing-soon');
eq('…then the other complete one', ranked[1].recipe.slug, 'none-missing');
eq('a recipe you have nothing for is left out', ranked.some((r) => r.recipe.slug === 'have-nothing'), false);

// ============ Fill the open meals ============
console.log('\nFill the open meals');
const { proposeFills } = await import(`${REPO}/js/views/kitchenPlan.js`);
const fillMeals = [
  { id: 'oats', name: 'Oats', meal_type: 'breakfast' },
  { id: 'curry', name: 'Curry', default_slot: 'dinner', is_favourite: true },
  { id: 'pie', name: 'Pie', default_slot: 'dinner' }
];
const fills = proposeFills([{ day_of_week: 'mon', slot: 'dinner', meal_id: 'curry' }], fillMeals, 0);
eq('a planned slot is left alone', fills.some((f) => f.day === 'mon' && f.slot === 'dinner'), false);
eq('no meal is used twice in the week', new Set(fills.map((f) => f.meal.id)).size, fills.length);
eq('the favourite already planned is not repeated, so the pie fills a dinner', fills.find((f) => f.slot === 'dinner').meal.id, 'pie');
eq('from today on: nothing before the given day', proposeFills([], fillMeals, 6).every((f) => f.day === 'sun'), true);

// ============ Every shipped recipe ============
console.log('\nEvery shipped recipe');
const refDoc = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8'));
const refMap = new Map(refDoc.foods.map((f) => [f.slug, f]));
const dir = path.join(REPO, 'data/recipe_library');
let count = 0;
const problems = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'sources.json')) {
  const doc = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  const list = Array.isArray(doc) ? doc : doc.recipes;
  for (const rec of list) {
    count += 1;
    const n = recipeNutrition(rec, refMap);
    const incomplete = ['calories', 'carbs_g', 'fat_g', 'protein_g', 'fibre_g'].filter((k) => n.complete[k] === false);
    if (incomplete.length) problems.push(`${rec.slug}: cannot work out ${incomplete.join(', ')} (${n.incompleteNames.join(', ')})`);
    // A serving over 2000 kcal or under 5 kcal is a data error, not a meal.
    const kcal = n.perServing.calories;
    if (!(kcal >= 5 && kcal <= 2000)) problems.push(`${rec.slug}: ${kcal} kcal a serving is implausible`);
  }
}
check(`all ${count} shipped recipes have complete nutrition`, problems.length === 0, problems.slice(0, 8).join('; '));
check('the library is not empty', count > 100, `${count}`);

console.log('');
if (failures.length) {
  console.log(`NUTRITION GATE FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`NUTRITION GATE PASSED — ${pass} checks`);
