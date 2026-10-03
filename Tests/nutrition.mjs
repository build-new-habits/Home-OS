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

// ============ Recipe page helpers ============
console.log('\nRecipe page');
const { scaledAmount, cookingName, slugFromHash } = await import(`${REPO}/js/views/recipe.js`);
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
