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

const { computeMacros, toGrams, formatIngredientQuantity, isValidUnit } = await import(`${REPO}/js/data/meals.js`);
const { normaliseBarcode, barcodeCandidates } = await import(`${REPO}/js/lib/barcode.js`);
const { energyKcalPer100g, mapProductToFood, missingMacroFields, suggestCategory } = await import(`${REPO}/js/lib/openFoodFacts.js`);
const { describeDependents } = await import(`${REPO}/js/data/foods.js`);
const { listEvents, EVENT_TYPES, assertSupportedRule } = await import(`${REPO}/js/data/calendar.js`);
const { formatRange, nightsBetween, describeChildren } = await import(`${REPO}/js/data/holidays.js`);
const { expand } = await import(`${REPO}/js/lib/rrule.js`);
const { freshness, describeFreshness, useSoon, defaultShelfLife } = await import(`${REPO}/js/data/pantry.js`);
const { formatQuantity } = await import(`${REPO}/js/lib/units.js`);

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

// ============ Ingredient units (schema revision 4) ============
// Nutrition is per 100 GRAMS, so every quantity must reach grams first.
// A missing conversion factor makes the ingredient INCOMPLETE, never
// guessed: 1 ml of water is 1 g, oil is ~0.9, flour is neither.
console.log('\nIngredient units');

const milkMl = { name: 'Milk', calories_per_100g: 50, protein_g: 3.6, fat_g: 1.8, carbs_g: 4.8, grams_per_ml: 1.03 };
const eggs = { name: 'Egg', calories_per_100g: 143, protein_g: 12.6, fat_g: 9.5, carbs_g: 0.7, grams_per_item: 60 };
const noFactor = { name: 'Olive oil', calories_per_100g: 884, protein_g: 0, fat_g: 100, carbs_g: 0 };

eq('grams pass through untouched', toGrams(250, 'g', {}).grams, 250);
eq('an absent unit is treated as grams', toGrams(250, undefined, {}).grams, 250);
eq('millilitres convert by grams_per_ml', toGrams(200, 'ml', milkMl).grams, 206);
eq('items convert by grams_per_item', toGrams(2, 'item', eggs).grams, 120);
eq('ml with no factor refuses rather than assuming 1:1', toGrams(15, 'ml', noFactor).grams, null);
check('and says what is missing',
  /millilitre/.test(toGrams(15, 'ml', noFactor).reason), toGrams(15, 'ml', noFactor).reason);
eq('items with no factor refuse too', toGrams(2, 'item', noFactor).grams, null);
eq('an unknown unit refuses', toGrams(1, 'cups', milkMl).grams, null);
eq('a zero quantity refuses', toGrams(0, 'g', milkMl).grams, null);
check('the CHECK values are the accepted ones',
  isValidUnit('g') && isValidUnit('ml') && isValidUnit('item') && !isValidUnit('cups'));
eq('quantities format with their unit', formatIngredientQuantity(250, 'g'), '250 g');
eq('millilitres too', formatIngredientQuantity(500, 'ml'), '500 ml');
eq('items pluralise', formatIngredientQuantity(2, 'item'), '2 items');
eq('one item is singular', formatIngredientQuantity(1, 'item'), '1 item');

// Hand calculation across three units:
//   200 ml milk x 1.03 = 206 g -> 206/100 x 50   = 103.0 kcal
//   2 eggs x 60         = 120 g -> 120/100 x 143 = 171.6 kcal
//   15 ml oil, no factor        -> contributes NOTHING
const mixed = computeMacros([
  { quantity_g: 200, unit: 'ml', foods: milkMl },
  { quantity_g: 2, unit: 'item', foods: eggs },
  { quantity_g: 15, unit: 'ml', foods: noFactor }
], { serves: 2 });
eq('mixed units total matches the hand calculation', mixed.totals.calories, 274.6);
eq('the unconvertible ingredient is counted incomplete', mixed.incompleteCount, 1);
eq('and named', mixed.incompleteNames[0], 'Olive oil');
eq('with a reason the UI can show', mixed.unconvertible.length, 1);
check('the reason names the missing factor',
  /millilitre/.test(mixed.unconvertible[0].reason), mixed.unconvertible[0].reason);
// The critical one: it must not have silently contributed 15 g of oil.
check('an unconvertible ingredient contributes ZERO, not a guess',
  mixed.totals.fat_g === Math.round((200 * 1.03 / 100 * 1.8 + 120 / 100 * 9.5) * 10) / 10,
  String(mixed.totals.fat_g));

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

// ============ Category suggestion from a barcode ============
// A SUGGESTION, never a saved default. OFF's tags are community-maintained
// and inconsistent, and it barely covers non-food — so the view must make
// the user confirm. These assertions pin the mapping, not the policy.
console.log('\nCategory suggestion');

eq('beverages suggest drink', suggestCategory({ categories_tags: ['en:beverages'] }), 'drink');
eq('frozen wins over the food type it also carries',
  suggestCategory({ categories_tags: ['en:meals', 'en:frozen-foods'] }), 'food_frozen');
eq('dairy suggests fresh', suggestCategory({ categories_tags: ['en:dairies', 'en:milks'] }), 'food_fresh');
eq('tinned suggests cupboard', suggestCategory({ categories_tags: ['en:canned-foods'] }), 'food_ambient');
eq('shampoo suggests personal care', suggestCategory({ categories_tags: ['en:shampoos'] }), 'personal');
eq('an unrecognised tag suggests nothing', suggestCategory({ categories_tags: ['en:widgets'] }), null);
eq('no tags suggest nothing', suggestCategory({ categories_tags: [] }), null);
eq('a missing product suggests nothing', suggestCategory(null), null);

const scanned = mapProductToFood({
  product_name: 'Semi Skimmed Milk', brands: 'Tesco',
  categories_tags: ['en:dairies', 'en:milks'], nutriments: { 'energy-kcal_100g': 50 }
}, '5000000000000');
eq('a mapped product carries the suggestion', scanned.suggestedCategory, 'food_fresh');
check('and does NOT carry a ready-to-save category field',
  !('category' in scanned), JSON.stringify(Object.keys(scanned)));

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

// ============ Bounded ranges are not recurrence rules ============
// CHARACTERISATION TEST. These assert the engine's SURPRISING behaviour on
// purpose, so the trap is documented rather than rediscovered. rrule.js is
// write-once and cannot be fixed; the guard below is the protection.
console.log('\nrrule ignores UNTIL and COUNT (characterisation)');

const bounded = expand('FREQ=DAILY;UNTIL=20260828', '2026-08-24', '2026-08-24', '2026-09-07');
eq('UNTIL is IGNORED — 15 dates, not 5', bounded.length, 15);
const counted = expand('FREQ=DAILY;COUNT=7', '2026-08-24', '2026-08-24', '2026-09-07');
eq('COUNT is IGNORED — 15 dates, not 7', counted.length, 15);

console.log('\nassertSupportedRule guards the boundary');
check('a plain weekly rule is accepted',
  assertSupportedRule('FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH').ok === true);
check('a null rule is accepted (a one-off has no rule)', assertSupportedRule(null).ok === true);
check('UNTIL is refused', assertSupportedRule('FREQ=DAILY;UNTIL=20260828').ok === false);
check('COUNT is refused', assertSupportedRule('FREQ=DAILY;COUNT=7').ok === false);
check('lower case is refused too', assertSupportedRule('freq=daily;until=20260828').ok === false);
check('the refusal explains the consequence',
  /forever/.test(assertSupportedRule('FREQ=DAILY;COUNT=7').error.message));
// Phase 4's rules must survive the guard, or cleared code breaks.
for (const rule of ['FREQ=WEEKLY;INTERVAL=2;BYDAY=MO', 'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15', 'FREQ=DAILY;INTERVAL=3']) {
  check(`Phase 4 chores rule still accepted: ${rule}`, assertSupportedRule(rule).ok === true);
}

// ============ Holiday ranges ============
console.log('\nHoliday ranges');

eq('a range inside one month reads naturally', formatRange('2026-08-24', '2026-08-31'), '24 to 31 August 2026');
eq('a range across months spells both', formatRange('2026-08-30', '2026-09-02'), '30 August to 2 September 2026');
eq('a single day has no range', formatRange('2026-08-24', '2026-08-24'), '24 August 2026');
eq('days are inclusive of both ends', nightsBetween('2026-08-24', '2026-08-31'), 8);
eq('a one-day holiday is one day', nightsBetween('2026-08-24', '2026-08-24'), 1);
eq('a bad date gives null rather than NaN', nightsBetween('nonsense', '2026-08-31'), null);

eq('no children gives an empty description',
  describeChildren({ checklist: 0, purchases: 0, total: 0 }), '');
eq('both child kinds are named',
  describeChildren({ checklist: 8, purchases: 5, total: 13 }), '8 checklist items and 5 things to buy');
eq('singulars are singular',
  describeChildren({ checklist: 1, purchases: 0, total: 1 }), '1 checklist item');

// ============ Pantry freshness (Phase 7) ============
// Pure, and tested against FIXED dates rather than whatever today is.
// last_restocked + shelf_life_days -- never updated_at, which moves when a
// row is edited for any reason and would silently reset freshness.
console.log('\nPantry freshness');

eq('well within shelf life is fresh',
  freshness({ last_restocked: '2026-08-20', shelf_life_days: 5 }, '2026-08-21').state, 'fresh');
eq('near the end is worth using up',
  freshness({ last_restocked: '2026-08-18', shelf_life_days: 5 }, '2026-08-21').state, 'soon');
eq('past its time says so',
  freshness({ last_restocked: '2026-08-10', shelf_life_days: 5 }, '2026-08-21').state, 'past');
eq('no restock date is UNKNOWN, not fresh',
  freshness({ last_restocked: null, shelf_life_days: 5 }, '2026-08-21').state, 'unknown');
eq('no shelf life is UNKNOWN, not fresh',
  freshness({ last_restocked: '2026-08-20', shelf_life_days: null }, '2026-08-21').state, 'unknown');
check('unknown says WHICH piece is missing',
  /date not recorded/.test(freshness({ last_restocked: null, shelf_life_days: 5 }, '2026-08-21').reason));
eq('days left is exact',
  freshness({ last_restocked: '2026-08-18', shelf_life_days: 5 }, '2026-08-21').daysLeft, 2);
// A long shelf life needs a proportionally longer warning than two days.
eq('a tin gets a proportional warning window, not a fixed one',
  freshness({ last_restocked: '2026-01-01', shelf_life_days: 365 }, '2026-11-01').state, 'soon');

check('the description is neutral, never alarming',
  !/expired|warning|bad|throw/i.test(
    describeFreshness(freshness({ last_restocked: '2026-08-10', shelf_life_days: 5 }, '2026-08-21'))),
  describeFreshness(freshness({ last_restocked: '2026-08-10', shelf_life_days: 5 }, '2026-08-21')));

const soonList = useSoon([
  { id: 'a', last_restocked: '2026-08-20', shelf_life_days: 5 },
  { id: 'b', last_restocked: '2026-08-18', shelf_life_days: 5 },
  { id: 'c', last_restocked: '2026-08-10', shelf_life_days: 5 },
  { id: 'd', last_restocked: null, shelf_life_days: null }
], '2026-08-21');
eq('only soon and past appear in the use-up list', soonList.length, 2);
eq('most urgent first', soonList[0].row.id, 'c');
check('an unknown row is NOT listed as needing using up',
  !soonList.some((e) => e.row.id === 'd'));

eq('fresh food gets a short default shelf life', defaultShelfLife('food_fresh'), 5);
eq('cupboard food gets a long one', defaultShelfLife('food_ambient'), 365);
eq('things that do not expire get no default', defaultShelfLife('home'), null);
eq('an unknown category gets no default', defaultShelfLife('nonsense'), null);

console.log('\nQuantity formatting');
eq('grams below a kilo stay grams', formatQuantity(250, 'g'), '250 g');
eq('grams above a kilo become kg', formatQuantity(2400, 'g'), '2.4 kg');
eq('millilitres above a litre become litres', formatQuantity(1500, 'ml'), '1.5 l');
eq('one item is singular', formatQuantity(1, 'item'), '1 item');
eq('items pluralise', formatQuantity(3, 'item'), '3 items');
check('a unit is ALWAYS present', /[a-z]/.test(formatQuantity(500, 'g')));

console.log('');
if (failures.length) {
  console.log(`BEHAVIOUR TESTS FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`BEHAVIOUR TESTS PASSED — ${pass}/${pass} assertions`);
