// Phase 6 behavioural tests. These EXECUTE the code; they are not a
// syntax check. Run against the shadow repo so modules that import
// supabaseClient.js resolve without a network.

const REPO = process.env.GATE_REPO || '/tmp/gate-repo';

let pass = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

function eq(name, actual, expected) {
  check(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// MUST be set before the first import that pulls in supabaseClient.js: the
// shadow copy's stub reads this global at module-evaluation time, so setting
// it afterwards leaves `supabase` bound to undefined.
// data/calendar.js reaches the client on its happy path, so the last
// assertion below needs one. Minimal on purpose: the guard clauses are what
// is under test, not the query.
globalThis.__HOME_OS_SUPABASE_STUB__ = {
  from: () => {
    const b = {};
    for (const m of ['select', 'in', 'lte', 'eq', 'order']) b[m] = () => b;
    b.then = (res) => Promise.resolve({ data: [], error: null }).then(res);
    return b;
  }
};

const { computeMacros } = await import(`${REPO}/js/data/meals.js`);
const { normaliseBarcode, barcodeCandidates } = await import(`${REPO}/js/lib/barcode.js`);
const { energyKcalPer100g, mapProductToFood, missingMacroFields } = await import(`${REPO}/js/lib/openFoodFacts.js`);
const { describeDependents } = await import(`${REPO}/js/data/foods.js`);
const { listEvents, EVENT_TYPES } = await import(`${REPO}/js/data/calendar.js`);

// ============ Macros, against a hand calculation ============
console.log('\nMacros');

const oats = { name: 'Rolled oats', calories_per_100g: 379, protein_g: 13.2, fat_g: 8.1, carbs_g: 60.1 };
const stock = { name: 'Home-made stock', calories_per_100g: null, protein_g: null, fat_g: null, carbs_g: null };
const milk = { name: 'Semi-skimmed milk', calories_per_100g: 50, protein_g: 3.6, fat_g: 1.8, carbs_g: 4.8 };

// By hand: 80 g of oats at 379 kcal/100 g = 0.80 x 379 = 303.2 kcal.
// 200 g of milk at 50 kcal/100 g = 2.00 x 50 = 100 kcal. Total 403.2 kcal.
// Protein 0.80x13.2 = 10.56 plus 2.00x3.6 = 7.2 -> 17.76, shown as 17.8.
// Fat 0.80x8.1 = 6.48 plus 2.00x1.8 = 3.6 -> 10.08, shown as 10.1.
// Carbs 0.80x60.1 = 48.08 plus 2.00x4.8 = 9.6 -> 57.68, shown as 57.7.
const complete = computeMacros(
  [{ quantity_g: 80, foods: oats }, { quantity_g: 200, foods: milk }],
  { serves: 2 }
);
eq('calories total matches hand calculation', complete.totals.calories, 403.2);
eq('protein total matches hand calculation', complete.totals.protein_g, 17.8);
eq('fat total matches hand calculation', complete.totals.fat_g, 10.1);
eq('carbs total matches hand calculation', complete.totals.carbs_g, 57.7);
eq('per serving halves the total at serves 2', complete.perServing.calories, 201.6);
check('a fully-known meal reports every field complete',
  Object.values(complete.complete).every(Boolean));
eq('a fully-known meal reports nothing incomplete', complete.incompleteCount, 0);

// A null macro must be INCOMPLETE, not zero.
const partial = computeMacros(
  [{ quantity_g: 80, foods: oats }, { quantity_g: 200, foods: stock }],
  { serves: 2 }
);
eq('an unknown ingredient does not change the total', partial.totals.calories, 303.2);
eq('the incomplete ingredient is counted', partial.incompleteCount, 1);
eq('the incomplete ingredient is named', partial.incompleteNames[0], 'Home-made stock');
check('every field is flagged incomplete when one food knows nothing',
  Object.values(partial.complete).every((v) => v === false));

// Zero is a real measurement, not missing data.
const water = { name: 'Water', calories_per_100g: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
const zeroed = computeMacros([{ quantity_g: 500, foods: water }], { serves: 1 });
eq('zero is treated as known, not unknown', zeroed.incompleteCount, 0);
eq('zero contributes zero', zeroed.totals.calories, 0);
check('zero leaves the field complete', zeroed.complete.protein_g === true);

// serves_override changes per-serving figures only.
const oneServing = computeMacros([{ quantity_g: 80, foods: oats }], { serves: 1 });
const fourServings = computeMacros([{ quantity_g: 80, foods: oats }], { serves: 4 });
eq('the whole-meal total is unaffected by servings', oneServing.totals.calories, fourServings.totals.calories);
eq('per serving divides by the servings given', fourServings.perServing.calories, 75.8);

// Degenerate inputs must not throw.
eq('no ingredients gives a zero total', computeMacros([], { serves: 2 }).totals.calories, 0);
eq('undefined ingredients is survivable', computeMacros(undefined).ingredientCount, 0);
eq('serves of 0 falls back to 1 rather than dividing by zero',
  computeMacros([{ quantity_g: 100, foods: oats }], { serves: 0 }).perServing.calories, 379);

// ============ Barcode normalisation ============
console.log('\nBarcode normalisation');

eq('EAN-13 passes through', normaliseBarcode('5000159407236'), '5000159407236');
// This is the case the Node decode run exposed: a UPC-A symbol comes back
// as 12 digits from BOTH engines, but the databases key on the 13.
eq('UPC-A 12 digits gains the leading zero', normaliseBarcode('123456789050'), '0123456789050');
eq('GTIN-14 with a leading zero is trimmed to 13', normaliseBarcode('05000159407236'), '5000159407236');
eq('EAN-8 passes through', normaliseBarcode('40170725'), '40170725');
eq('spaces and hyphens are stripped', normaliseBarcode(' 5000-159 407236 '), '5000159407236');
eq('a wrong-length number is refused', normaliseBarcode('12345'), null);
eq('text is refused', normaliseBarcode('not a barcode'), null);
eq('null is refused', normaliseBarcode(null), null);
eq('an empty string is refused', normaliseBarcode(''), null);

const candidates = barcodeCandidates('123456789050');
check('candidates try the EAN-13 form first', candidates[0] === '0123456789050');
check('candidates keep the raw form as a fallback', candidates.includes('123456789050'));
eq('candidates do not repeat themselves', barcodeCandidates('5000159407236').length, 1);

// ============ Open Food Facts mapping ============
console.log('\nOpen Food Facts mapping');

eq('an explicit kcal figure is used as-is',
  energyKcalPer100g({ 'energy-kcal_100g': 379 }), 379);
// The trap: reading a bare energy value as kcal overstates by 4.184x.
eq('kilojoules are converted, not copied',
  energyKcalPer100g({ 'energy-kj_100g': 1590 }), 380.02);
eq('a bare energy value is assumed to be kJ, which is what OFF stores',
  energyKcalPer100g({ energy_100g: 1590 }), 380.02);
eq('a bare energy value stated as kcal is trusted',
  energyKcalPer100g({ energy_100g: 379, energy_unit: 'kcal' }), 379);
eq('no energy data gives null, not zero', energyKcalPer100g({}), null);
eq('kcal wins over kJ when both are present',
  energyKcalPer100g({ 'energy-kcal_100g': 379, 'energy-kj_100g': 9999 }), 379);

const mapped = mapProductToFood({
  product_name: 'Baked Beans',
  brands: 'Heinz',
  quantity: '415g',
  nutriments: { 'energy-kcal_100g': '78', proteins_100g: '4.7', fat_100g: '0.2', carbohydrates_100g: '12.9' }
}, '5000157024671');
eq('the brand is prefixed to the name', mapped.name.startsWith('Heinz Baked Beans'), true);
eq('the pack size is kept in the name', mapped.name.includes('(415g)'), true);
eq('string numbers are coerced', mapped.protein_g, 4.7);
eq('the source is recorded as openfoodfacts', mapped.source, 'openfoodfacts');
eq('the barcode is carried through', mapped.barcode, '5000157024671');

const noBrandDupe = mapProductToFood({ product_name: 'Heinz Baked Beans', brands: 'Heinz', nutriments: {} }, '1');
eq('a brand already in the name is not repeated', noBrandDupe.name, 'Heinz Baked Beans');

eq('a nameless product is refused rather than saved blank',
  mapProductToFood({ brands: 'Heinz', nutriments: {} }, '1'), null);
eq('a missing product object is refused', mapProductToFood(null, '1'), null);

const sparse = mapProductToFood({ product_name: 'Mystery jar', nutriments: { proteins_100g: 2 } }, '1');
eq('absent macros stay null, never zero', sparse.fat_g, null);
const missing = missingMacroFields(sparse);
check('missing fields are reported for honest UI copy',
  missing.includes('calories') && missing.includes('fat') && missing.includes('carbohydrate')
  && !missing.includes('protein'), JSON.stringify(missing));

// ============ Dependent descriptions ============
console.log('\nDelete confirmations');

eq('no dependents gives an empty description',
  describeDependents({ meal_ingredients: 0, pantry_stock: 0, shopping_list_items: 0, total: 0 }), '');
eq('one dependent reads naturally',
  describeDependents({ meal_ingredients: 3, pantry_stock: 0, shopping_list_items: 0, total: 3 }), '3 meals');
eq('a single dependent is singular',
  describeDependents({ meal_ingredients: 1, pantry_stock: 0, shopping_list_items: 0, total: 1 }), '1 meal');
// Counting only meals would have said "0 meals" then hit a raw FK error.
eq('non-meal dependents are named too',
  describeDependents({ meal_ingredients: 2, pantry_stock: 1, shopping_list_items: 1, total: 4 }),
  '2 meals, 1 pantry entry and 1 shopping list item');

// ============ calendar_events is shared: the filter is not optional ============
// Regression guard. listEvents() v1 returned EVERY event type, and
// views/chores.js rendered all of them as chores. Invisible while chores
// were the only writer; it would have started corrupting the chores
// calendar the moment Phase 8 wrote its first work_location row.
console.log('\ncalendar_events type filter');

const noFilter = await listEvents('2026-08-01', '2026-11-01');
check('listEvents refuses to run without eventTypes', noFilter.ok === false);
check('and says what the caller should pass',
  /eventTypes/.test(noFilter.error.message), noFilter.error && noFilter.error.message);

const emptyFilter = await listEvents('2026-08-01', '2026-11-01', { eventTypes: [] });
check('an empty eventTypes array is refused too', emptyFilter.ok === false);

const badFilter = await listEvents('2026-08-01', '2026-11-01', { eventTypes: ['chore', 'nonsense'] });
check('an unknown event type is refused', badFilter.ok === false);
check('the unknown type is named', /nonsense/.test(badFilter.error.message));

const good = await listEvents('2026-08-01', '2026-11-01', { eventTypes: ['chore'] });
check('a valid call succeeds', good.ok === true);

check('EVENT_TYPES matches the CHECK constraint exactly',
  JSON.stringify(EVENT_TYPES) === JSON.stringify(['chore', 'holiday', 'work_location', 'custom']),
  JSON.stringify(EVENT_TYPES));

console.log('');
if (failures.length) {
  console.log(`BEHAVIOUR TESTS FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`BEHAVIOUR TESTS PASSED — ${pass}/${pass} assertions`);
