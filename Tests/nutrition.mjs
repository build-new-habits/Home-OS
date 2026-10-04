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
eq('30 ml reads as spoons', scaledAmount(30, 'ml', 1), '2 tbsp');
eq('5 ml is a teaspoon', scaledAmount(5, 'ml', 1), '1 tsp');
eq('200 ml stays millilitres', scaledAmount(200, 'ml', 1), '200 ml');
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

// ---- Write your own recipe (data/ownRecipe.js) --------------------------
{
  const own = await import(`${REPO}/js/data/ownRecipe.js`);
  const p = (line) => own.parseIngredientLine(line);
  eq('pasted "200g rice"', JSON.stringify(p('200g rice')), JSON.stringify({ quantity: 200, unit: 'g', name: 'rice' }));
  eq('pasted "2 tbsp olive oil"', JSON.stringify(p('2 tbsp olive oil')), JSON.stringify({ quantity: 2, unit: 'tbsp', name: 'olive oil' }));
  eq('pasted "1.5 kg potatoes" becomes grams', p('1.5 kg potatoes').quantity, 1500);
  eq('pasted "3 eggs" is items', `${p('3 eggs').quantity} ${p('3 eggs').unit} ${p('3 eggs').name}`, '3 item eggs');
  eq('pasted "2 large onions" keeps the size in the name', p('2 large onions').name, 'large onions');
  eq('pasted "- a pinch of salt" has no amount', `${p('- a pinch of salt').quantity}|${p('- a pinch of salt').name}`, '|salt');
  eq('pasted "½ tsp cumin"', p('½ tsp cumin').quantity, 0.5);
  eq('pasted "400 ml of coconut milk" drops "of"', p('400 ml of coconut milk').name, 'coconut milk');
  check('a blank line is nothing', p('   ') === null);
  const method = own.parseMethod('1. Heat the oven.\n\nStep 2: Chop the onion.\n- Roast for 40 minutes.');
  eq('pasted method: one step per line, numbers gone', method.map((m) => m.instruction).join(' | '),
    'Heat the oven. | Chop the onion. | Roast for 40 minutes.');
  check('a long step gets a gentle hint', own.stepHint('word '.repeat(25)).length > 0);
  check('a short step gets none', own.stepHint('Chop the onion.') === '');

  const refFoods = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8')).foods;
  const index = own.buildNameIndex(refFoods, [{ id: 'u1', name: 'Gran’s chutney', calories_per_100g: 150, protein_g: 1, fat_g: 0, carbs_g: 36 }]);
  check('your own foods are suggested', index.names.includes('Gran’s chutney'));
  const anyRef = refFoods.find((f) => f.aliases && f.aliases.length);
  check('a reference alias resolves', own.resolveName(anyRef.aliases[0], index)?.ref === anyRef.slug);

  const draft = own.emptyDraft();
  check('an empty draft cannot be saved, and says why', own.validateDraft(draft).map((x) => x.field).join(',') === 'own-name,own-ing-name-0');
  draft.name = 'Chutney toast';
  draft.serves = 2;
  draft.ingredients = [
    own.newIngredient({ name: 'Gran’s chutney', quantity: 100, unit: 'g',
      swaps: [own.newSwap({ name: 'Mango chutney', quantity: '', unit: 'g', label: 'from the shop' })] }),
    own.newIngredient({ name: 'Salt', quantity: '', unit: 'item' })
  ];
  draft.steps = [own.newStep({ instruction: 'Spread it.', minutes: '' }), own.newStep({ instruction: '  ' })];
  eq('a complete draft has no problems', own.validateDraft(draft).length, 0);
  const specs = own.ingredientSpecs(draft);
  eq('a swap is written as an unchosen option', specs.map((x) => `${x.foodName}:${x.is_selected}:${x.option_group}`).join(','),
    'Gran’s chutney:true:Gran’s chutney,Mango chutney:false:Gran’s chutney,Salt:true:null');
  eq('a swap with no amount takes the main one’s', specs[1].quantity_g, 100);
  eq('a swap carries its reason with its name', specs[1].option_label, 'Mango chutney, from the shop');
  eq('blank steps are not saved', own.stepSpecs(draft).length, 1);
  eq('tablespoons are stored as millilitres', own.ingredientSpecs({ ingredients: [own.newIngredient({ name: 'Oil', quantity: 2, unit: 'tbsp' })] })[0].quantity_g, 30);

  const { recipe, refMap } = own.draftToRecipe(draft, index);
  const n = recipeNutrition(own.measuredOnly(recipe), refMap);
  eq('the preview counts your own food per serving', Math.round(n.perServing.calories), 75);
  eq('an ingredient with no amount is not "unknown"', own.unknownNutrition(draft, index).length, 0);
  draft.ingredients[0].quantity = 'lots';
  check('an amount that is not a number is a problem, linked to its field', own.validateDraft(draft).some((x) => x.field === 'own-ing-qty-0'));

  // Round trip: rows from the database back into a draft.
  const back = own.draftFromMeal(
    { id: 'm9', name: 'Chutney toast', default_serves: 2, meal_type: 'snack', dietary_tags: ['vegan'], method_note: 'Warm toast.' },
    [
      { quantity_g: 100, unit: 'g', option_group: 'Gran’s chutney', is_selected: true, foods: { name: 'Gran’s chutney' } },
      { quantity_g: 100, unit: 'g', option_group: 'Gran’s chutney', is_selected: false, option_label: 'Mango chutney, from the shop', foods: { name: 'Mango chutney' } },
      { quantity_g: 30, unit: 'ml', option_group: null, foods: { name: 'Olive oil' } }
    ],
    [{ step_number: 2, instruction: 'Eat.' }, { step_number: 1, instruction: 'Spread it.', duration_min: 2 }]
  );
  eq('round trip: swaps come back under their ingredient', `${back.ingredients[0].name}>${back.ingredients[0].swaps[0].name}/${back.ingredients[0].swaps[0].label}`,
    'Gran’s chutney>Mango chutney/from the shop');
  eq('round trip: 30 ml comes back as 2 tbsp', `${back.ingredients[1].quantity} ${back.ingredients[1].unit}`, '2 tbsp');
  eq('round trip: steps in order with timers', back.steps.map((x) => `${x.instruction}${x.minutes ? `(${x.minutes})` : ''}`).join(' '), 'Spread it.(2) Eat.');
  eq('round trip: kind, tags and tip', `${back.kind}/${back.tags.join()}/${back.note}`, 'snack/vegan/Warm toast.');
}

{
  const { editIdFromHash, describeIngredient } = await import(`${REPO}/js/views/recipeEditor.js`);
  eq('the editor reads which recipe to change', editIdFromHash('#/recipe-edit?m=ab-12'), 'ab-12');
  eq('a new recipe has no id', editIdFromHash('#/recipe-edit'), '');
  const own = await import(`${REPO}/js/data/ownRecipe.js`);
  const index = own.buildNameIndex(JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8')).foods, []);
  check('an unknown ingredient says it is new, without blame', /New to the app/.test(describeIngredient({ name: 'Zzyzx paste', unit: 'g' }, index)));
}

// ---- Leftovers (3 Oct 2026) ------------------------------------------------
{
  const plan = await import(`${REPO}/js/data/mealPlan.js`);
  const { computeShortfall } = await import(`${REPO}/js/lib/shortfall.js`);
  const t = plan.leftoverTargets([
    { day_of_week: 'tue', slot: 'lunch', meals: { name: 'Soup' } }
  ], { day_of_week: 'mon', slot: 'dinner' });
  eq('leftovers from Monday dinner start at Tuesday lunch', `${t[0].day} ${t[0].slot}`, 'tue lunch');
  check('a taken slot is offered, marked as not open', t[0].open === false && t[1].open === true);
  eq('only lunches and dinners, to the end of the week', t.length, 12);
  eq('Monday lunch leftovers can be Monday dinner', plan.leftoverTargets([], { day_of_week: 'mon', slot: 'lunch' })[0].slot, 'dinner');
  eq('Sunday dinner has nowhere left this week', plan.leftoverTargets([], { day_of_week: 'sun', slot: 'dinner' }).length, 0);
  check('a missing column is recognised by code', plan.isMissingColumn({ code: '42703', message: 'x' }));
  check('and by name', plan.isMissingColumn({ message: 'column weekly_meal_plan.is_leftover does not exist' }));
  check('an ordinary failure is not mistaken for it', !plan.isMissingColumn({ code: '42501', message: 'permission denied' }));
  check('isLeftover is strict', plan.isLeftover({ is_leftover: true }) && !plan.isLeftover({}) && !plan.isLeftover({ is_leftover: 'true' }));

  const food = { id: 'f1', name: 'Beef mince', calories_per_100g: 250, protein_g: 26, fat_g: 16, carbs_g: 0 };
  const ingredients = [{ meal_id: 'm1', food_id: 'f1', quantity_g: 500, unit: 'g', foods: food }];
  const cooked = { meal_id: 'm1', day_of_week: 'mon', slot: 'dinner', meals: { id: 'm1', name: 'Chilli', default_serves: 4 } };
  const leftover = { ...cooked, day_of_week: 'tue', slot: 'lunch', is_leftover: true, serves_override: 2 };
  const once = computeShortfall({ plan: [cooked], ingredients, pantry: [], foods: [food], todayISO: '2026-10-03' });
  const both = computeShortfall({ plan: [cooked, leftover], ingredients, pantry: [], foods: [food], todayISO: '2026-10-03' });
  eq('the cooked meal itself is on the list', once.items.length, 1);
  eq('leftovers add nothing to the shopping list', JSON.stringify(both.items.map((i) => [i.food && i.food.id, i.needed])),
    JSON.stringify(once.items.map((i) => [i.food && i.food.id, i.needed])));
  const { targetLabel } = await import(`${REPO}/js/components/leftoverSheet.js`);
  eq('a target reads as words', targetLabel({ day: 'wed', slot: 'lunch' }), 'Wednesday lunch');
}

// ---- Courses (3 Oct 2026) ------------------------------------------------
{
  const c = await import(`${REPO}/js/data/courses.js`);
  eq('no course reads as a main', c.courseOf({}), 'main');
  eq('an unknown course reads as a main', c.courseOf({ course: 'dessert' }), 'main');
  eq('dishes sort into eating order', c.sortByCourse([{ n: 'b', course: 'pudding' }, { n: 'm' }, { n: 's', course: 'starter' }]).map((x) => x.n).join(''), 'smb');
  check('a missing course column is recognised', c.isMissingColumnError({ code: '42703' }, 'course')
    && c.isMissingColumnError({ message: "Could not find the 'course' column of 'meals' in the schema cache" }, 'course')
    && !c.isMissingColumnError({ code: '23514', message: 'violates check constraint' }, 'course'));
  const lib = await import(`${REPO}/js/data/recipeLibrary.js`);
  const sample = [{ slug: 'a', course: 'pudding' }, { slug: 'b' }, { slug: 'c', course: 'starter' }];
  eq('the library filters by course', lib.filterRecipes(sample, { course: 'pudding' }).map((r) => r.slug).join(), 'a');
  eq('and "main" includes recipes with no course', lib.filterRecipes(sample, { course: 'main' }).map((r) => r.slug).join(), 'b');
  const own = await import(`${REPO}/js/data/ownRecipe.js`);
  eq('a new recipe is a main', own.emptyDraft().course, 'main');
  eq('a pudding comes back as a pudding', own.draftFromMeal({ id: 'x', name: 'Crumble', course: 'pudding' }, [], []).course, 'pudding');
}

// ---- Recipes kept on this phone (3 Oct 2026) ------------------------------
{
  const mem = new Map();
  const saved = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const lr = await import(`${REPO}/js/data/localRecipes.js`);
  const own = await import(`${REPO}/js/data/ownRecipe.js`);
  const refFoods = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8')).foods;
  const refMapAll = new Map(refFoods.map((f) => [f.slug, f]));
  const puttanesca = JSON.parse(readFileSync(path.join(REPO, 'data/recipe_library/italian.json'), 'utf8')).recipes.find((r) => r.slug === 'spaghetti-puttanesca');
  const draft = lr.draftFromLibrary(puttanesca, refMapAll);
  eq('a library copy keeps the name and serves', `${draft.name}/${draft.serves}`, 'Spaghetti puttanesca/4');
  eq('ingredients come over by name', draft.ingredients[0].name, 'Spaghetti, dry');
  eq('30 ml of oil comes back as 2 tbsp', `${draft.ingredients.find((i) => /olive oil/i.test(i.name)).quantity} tbsp`, '2 tbsp');
  check('step tokens are written out as words', !draft.steps.some((st) => /\{\{ing:/.test(st.instruction)) && /olive oil/.test(draft.steps[1].instruction), draft.steps[1].instruction);
  check('step notes are kept', draft.steps.some((st) => st.note));
  eq('it remembers where it came from', draft.fromSlug, 'spaghetti-puttanesca');
  eq('the copy has no problems', own.validateDraft(draft).length, 0);

  const first = lr.saveLocal(draft, new Date('2026-10-03T10:00:00Z'));
  check('it saves on the phone', first.ok && /^p/.test(first.id));
  eq('and lists there', lr.listLocal().map((r) => r.name).join(), 'Spaghetti puttanesca');
  const again = lr.saveLocal({ ...lr.getLocal(first.id).draft, name: 'Our puttanesca' }, new Date('2026-10-03T11:00:00Z'));
  check('saving again changes that recipe, not a second one', again.id === first.id && lr.listLocal().length === 1 && lr.listLocal()[0].name === 'Our puttanesca');
  const index = own.buildNameIndex(refFoods, []);
  const { recipe } = own.draftToRecipe(lr.getLocal(first.id).draft, index);
  check('a phone recipe has nutrition from its ingredients', own.unknownNutrition(lr.getLocal(first.id).draft, index).length === 0,
    own.unknownNutrition(lr.getLocal(first.id).draft, index).join());
  check('and carries the library swaps and tip', recipe.method_note && Array.isArray(recipe.swaps));

  const backup = lr.exportLocal();
  lr.deleteLocal(first.id);
  eq('delete removes it', lr.listLocal().length, 0);
  const restored = lr.importLocal(backup);
  check('a backup restores it', restored.ok && restored.added === 1 && lr.listLocal()[0].name === 'Our puttanesca');
  check('a file that is not a backup is refused', !lr.importLocal('{"hello":1}').ok && !lr.importLocal('not json').ok);
  eq('a phone recipe id comes from the hash', lr.localIdFromHash('#/recipe?l=pabc12'), 'pabc12');
  eq('a library copy is asked for by slug', lr.fromSlugFromHash('#/recipe-edit?from=lentil-ragu'), 'lentil-ragu');
  check('with no storage, saving says so rather than throwing', (() => { globalThis.localStorage = undefined; const r = lr.saveLocal(draft); return r.ok === false; })());
  globalThis.localStorage = saved;
}

// ---- Recipe photos (3 Oct 2026) -----------------------------------------
{
  const { imageMap } = await import(`${REPO}/js/data/recipeImages.js`);
  const m = imageMap({ images: {
    'lemon-posset': { src: 'assets/recipes/lemon-posset.webp', alt: 'Lemon posset in a small glass with raspberries', width: 800, height: 600 },
    'no-alt': { src: 'assets/recipes/no-alt.webp', alt: '  ' }
  } });
  check('a photo with alt text is used', m.has('lemon-posset') && /assets\/recipes\/lemon-posset\.webp$/.test(m.get('lemon-posset').src));
  check('a photo without alt text is not', !m.has('no-alt'));
  eq('an empty manifest is no photos, not an error', imageMap(null).size, 0);
}

// ---- Make it vegetarian / vegan (3 Oct 2026) ------------------------------
{
  const d = await import(`${REPO}/js/data/dietSwitch.js`);
  const refFoods = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8')).foods;
  const refMapAll = new Map(refFoods.map((f) => [f.slug, f]));
  const lib = (file) => JSON.parse(readFileSync(path.join(REPO, 'data/recipe_library', file), 'utf8')).recipes;
  const curry = lib('thai.json').find((r) => r.slug === 'thai-green-chicken-curry');
  eq('a chicken curry can be vegetarian and vegan', d.dietsFor(curry).join('|'), '|vegetarian|vegan');
  const veg = d.switchRecipe(curry, 'vegetarian', refMapAll).recipe;
  check('chicken becomes tofu, by weight', veg.ingredients.some((i) => i.ref === 'tofu-firm' && i.unit === 'g' && i.quantity === 405), JSON.stringify(veg.ingredients[0]));
  check('fish sauce becomes soy sauce', veg.ingredients.some((i) => i.ref === 'soy-sauce') && !veg.ingredients.some((i) => i.ref === 'fish-sauce'));
  check('the method says tofu, and its tokens follow', veg.steps.some((st) => /\{\{ing:tofu-firm\}\}/.test(st.instruction)) && !veg.steps.some((st) => /chicken/i.test(st.instruction)));
  check('the name follows too', /^Thai green tofu curry \(vegetarian\)$/.test(veg.name), veg.name);
  check('it is tagged vegetarian', veg.dietary_tags.includes('vegetarian'));
  check('soy sauce in place of fish sauce drops the gluten-free tag', !veg.dietary_tags.includes('gluten_free'));
  eq('it is its own recipe for your meals', veg.slug, 'thai-green-chicken-curry--vegetarian');
  check('coconut milk is not mistaken for milk', !veg.steps.some((st) => /coconut oat milk/.test(st.instruction)));
  const carbonara = lib('italian.json').find((r) => r.slug === 'carbonara');
  check('a dish built on eggs and cheese is not offered as vegan', carbonara && !d.dietsFor(carbonara).includes('vegan'));
  const already = lib('vegetarian.json')[0];
  check('a vegetarian recipe is not offered vegetarian again', !d.dietsFor(already).includes('vegetarian'));
  check('a diet not on offer gives nothing', d.switchRecipe(carbonara, 'vegan', refMapAll) === null);
  eq('the diet comes from the hash', d.dietFromHash('#/recipe?r=x&diet=vegan'), 'vegan');
  // Every switch in the library must still be fully counted for nutrition.
  let bad = [];
  for (const file of readdirSync(path.join(REPO, 'data/recipe_library')).filter((f) => f !== 'index.json')) {
    for (const r of lib(file)) {
      for (const diet of d.dietsFor(r).filter(Boolean)) {
        const sw = d.switchRecipe(r, diet, refMapAll).recipe;
        const n = recipeNutrition(sw, refMapAll);
        if (n.incompleteCount > 0) bad.push(`${r.slug}/${diet}`);
        if (sw.ingredients.some((i) => !refMapAll.has(i.ref))) bad.push(`${r.slug}/${diet}: unknown ref`);
      }
    }
  }
  check('every switched recipe is fully counted', bad.length === 0, bad.slice(0, 6).join(', '));
}

// ---- Sharing the list (3 Oct 2026) -----------------------------------------
{
  const { listAsText } = await import(`${REPO}/js/views/kitchenShop.js`);
  const text = listAsText([
    { status: 'needed', qty_needed: 2, unit: 'item', foods: { name: 'Onion', category: 'food_fresh', grams_per_item: 150, item_label: 'onion' } },
    { status: 'needed', qty_needed: null, foods: { name: 'Toilet roll', category: 'household' } },
    { status: 'bought', qty_needed: 1, unit: 'item', foods: { name: 'Milk', category: 'food_fresh' } },
    { status: 'have', foods: { name: 'Rice', category: 'food_ambient' } }
  ]);
  check('a shared list has a title and aisle headings', /^Shopping list\n\n/.test(text) && /Onion/.test(text), text);
  check('only what is still needed is shared', !/Milk|Rice/.test(text));
  check('a line with no amount has no brackets', /- Toilet roll$/m.test(text));
  eq('an empty list shares nothing', listAsText([{ status: 'bought', foods: { name: 'x' } }]), '');
}

// ---- Pantry levels need no amount (3 Oct 2026) ------------------------------
{
  const pantry = await import(`${REPO}/js/data/pantry.js`);
  const now = new Date().toISOString();
  const rows = [
    { id: 1, current_qty: null, level: 'plenty', level_set_at: now, foods: { name: 'Salt' } },
    { id: 2, current_qty: null, level: null, foods: { name: 'Rice' } },
    { id: 3, current_qty: 0, level: 'plenty', level_set_at: now, foods: { name: 'Flour' } }
  ];
  eq('a level with no amount is not "needs an amount"', pantry.needsAmount(rows, now).map((r) => r.id).join(), '2,3');
}

// ---- Everyday food names (3 Oct 2026) --------------------------------------
{
  const { everydayName } = await import(`${REPO}/js/lib/foodNames.js`);
  eq('"Rice, basmati, dry" reads as basmati rice', everydayName('Rice, basmati, dry'), 'Basmati rice');
  eq('"Flour, plain" reads as plain flour', everydayName('Flour, plain'), 'Plain flour');
  eq('"Black pepper, ground" reads as ground black pepper', everydayName('Black pepper, ground'), 'Ground black pepper');
  eq('a plain name is left alone', everydayName('Salt'), 'Salt');
  eq('"Chopped tomatoes, tinned" drops the state', everydayName('Chopped tomatoes, tinned'), 'Chopped tomatoes');
}

// ---- Counted things name themselves (3 Oct 2026) ----------------------------
{
  const { countedName, countText } = await import(`${REPO}/js/lib/foodNames.js`);
  const { formatRemaining, timerLabel } = await import(`${REPO}/js/components/cookMode.js`);
  eq('2 anchovy fillets', countedName(2, { name: 'Anchovy fillet', item_label: 'fillet' }).text, '2 anchovy fillets');
  eq('half a tin of chopped tomatoes', countedName(0.5, { name: 'Chopped tomatoes, tinned', item_label: 'tin' }).text, '½ tin of chopped tomatoes');
  eq('1½ garlic cloves', countedName(1.5, { name: 'Garlic clove', item_label: 'clove' }).text, '1½ garlic cloves');
  eq('3 medium eggs', countedName(3, { name: 'Egg, medium', item_label: 'egg' }).text, '3 medium eggs');
  eq('a count reads as a fraction', countText(2.5), '2½');
  eq('a timer reads minutes and seconds', formatRemaining(125000), '2:05');
  eq('a long timer reads hours', formatRemaining(3725000), '1:02:05');
  eq('a finished timer is 0:00, never negative', formatRemaining(-5000), '0:00');
  eq('a timer is named for its step group', timerLabel({ step_group: 'Sauce' }, 3), 'Sauce (step 4)');
}

// ---- Pantry by kind (04 Oct 2026) -------------------------------------
{
  const { shelfOf, shelfFromName, groupByShelf, referenceShelfIndex, shelfLabel } = await import(`${REPO}/js/data/shelves.js`);
  const cases = [
    ['White wine vinegar', 'sauces'], ['Smoked haddock', 'fish'], ['Chicken thighs', 'meat'],
    ['Coconut milk', 'tinned'], ['Milk, semi-skimmed', 'dairy'], ['Oat milk', 'drinks'],
    ['Peanut butter', 'tinned'], ['Butter, block', 'dairy'], ['Spaghetti, dry', 'dried'],
    ['Plain flour', 'baking'], ['Ground cumin', 'spices'], ['Lemon', 'fruit'], ['Onion, medium', 'veg'],
    ['Crisps', 'snacks'], ['Tea bags', 'drinks'], ['Toilet roll', 'household'], ['Lemon juice', 'sauces']
  ];
  for (const [name, want] of cases) eq(`${name} is ${want}`, shelfFromName(name), want);
  eq('frozen peas are frozen, not veg', shelfOf({ name: 'Peas', category: 'food_frozen' }), 'frozen');
  eq('a chosen shelf wins', shelfOf({ name: 'Peas', shelf: 'veg', category: 'food_frozen' }), 'veg');
  eq('an unknown thing is other', shelfOf({ name: 'Zzyzx', category: 'food_fresh' }), 'other');
  const idx = referenceShelfIndex([{ name: 'Oats, rolled', shelf: 'dried' }]);
  eq('the reference file is read, turned names too', shelfOf({ name: 'rolled oats' }, idx), 'dried');
  const groups = groupByShelf([{ foods: { name: 'Crisps' } }, { foods: { name: 'Apple' } }, { foods: { name: 'Cheddar cheese' } }]);
  eq('kinds come in shelf order', groups.map((g) => g.shelf).join(','), 'fruit,dairy,snacks');
  eq('kinds have everyday labels', shelfLabel('dairy'), 'Dairy and eggs');
}

// ---- Eaten tick (04 Oct 2026) -----------------------------------------
{
  const mem = new Map();
  const saved = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { isEaten, setEaten, eatenOf, pruneEaten } = await import(`${REPO}/js/data/eaten.js`);
  const now = Date.parse('2026-10-04T12:00:00Z');
  const pruned = pruneEaten({ a: '2026-10-03T08:00:00Z', b: '2026-08-01T08:00:00Z', c: 'nonsense' }, now);
  eq('old and broken ticks are forgotten', Object.keys(pruned).join(','), 'a');
  check('a row with eaten_at is eaten', isEaten({ id: 'x', eaten_at: '2026-10-04T08:00:00Z' }));
  const entry = { id: 'plan-9', meals: { name: 'Porridge' } };
  check('an unticked meal is not eaten', !isEaten(entry));
  const r = await setEaten(entry, true);
  check('before migration 026 the tick is kept on this phone', r.ok && r.where === 'phone');
  check('and reads back from the phone', isEaten({ id: 'plan-9' }));
  eq('eatenOf picks the ticked ones', eatenOf([{ id: 'plan-9' }, { id: 'plan-10' }]).length, 1);
  await setEaten(entry, false);
  check('unticking forgets it', !isEaten({ id: 'plan-9' }) && !isEaten(entry));
  globalThis.localStorage = saved;
}

console.log('');
if (failures.length) {
  console.log(`NUTRITION GATE FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`NUTRITION GATE PASSED — ${pass} checks`);
