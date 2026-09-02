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
const { expand, describe, cadence } = await import(`${REPO}/js/lib/rrule.js`);
const { freshness, describeFreshness, useSoon, defaultShelfLife, needsAmount, defaultUnitFor } = await import(`${REPO}/js/data/pantry.js`);
const { parsePackSize } = await import(`${REPO}/js/lib/openFoodFacts.js`);
const { computeShortfall, describeShortfall, stockForMeal, describeStockForMeal } = await import(`${REPO}/js/lib/shortfall.js`);
const { formatQuantity, formatPackQuantity, pluraliseLabel, toStorage, toSpoons, ENTRY_UNITS } = await import(`${REPO}/js/lib/units.js`);
const { tokenise, similarity, buildClaimPatch, describeClaim, MAX_CANDIDATES } = await import(`${REPO}/js/data/foodClaim.js`);
const { describeRestock, RESTOCK } = await import(`${REPO}/js/data/restock.js`);
const { servingsFor, describeMember, ROLES } = await import(`${REPO}/js/data/household.js`);
const { referencePatch, hasMacros, describeOffer } = await import(`${REPO}/js/data/foodReference.js`);
const { checkStyle, resolveTokens, unresolvedTokens, slugifyFoodName, MAX_STEP_WORDS } = await import(`${REPO}/js/data/mealSteps.js`);
const refDoc = JSON.parse(await (await import('node:fs/promises')).readFile(`${REPO}/data/food_reference.json`, 'utf8'));

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

// ============ Bounded repeats ============
// These were CHARACTERISATION tests: they asserted that UNTIL and COUNT were
// silently ignored, so the trap was documented rather than rediscovered.
// rrule.js v2 honours both, so they are now correctness tests. An end date
// the app accepts and then ignores is worse than one it refuses.
console.log('\nrrule honours UNTIL and COUNT');

const bounded = expand('FREQ=DAILY;UNTIL=20260828', '2026-08-24', '2026-08-24', '2026-09-07');
eq('UNTIL stops the series — 5 dates, not 15', bounded.length, 5);
eq('and the last one is the UNTIL date itself (inclusive)', bounded[bounded.length - 1], '2026-08-28');
const counted = expand('FREQ=DAILY;COUNT=7', '2026-08-24', '2026-08-24', '2026-09-07');
eq('COUNT stops the series — 7 dates, not 15', counted.length, 7);

// The trap this replaces: COUNT must be counted from the RULE's start, not
// from the start of whatever window is being rendered. Otherwise a series
// that finished in August reappears the moment September is opened.
eq('a spent COUNT does not refill in a later window',
  expand('FREQ=DAILY;COUNT=7', '2026-08-24', '2026-09-01', '2026-09-07').length, 0);
eq('a window opening mid-series only gets what is left',
  expand('FREQ=DAILY;COUNT=7', '2026-08-24', '2026-08-28', '2026-09-07').length, 3);
eq('a window entirely after UNTIL is empty',
  expand('FREQ=DAILY;UNTIL=20260828', '2026-08-24', '2026-08-29', '2026-09-07').length, 0);
eq('UNTIL accepts the extended date form too',
  expand('FREQ=DAILY;UNTIL=2026-08-26', '2026-08-24', '2026-08-24', '2026-09-07').length, 3);

// An end that is honoured must also be SAID, or the preview lies.
check('describe states an UNTIL', /until 2026-12-25/.test(describe('FREQ=WEEKLY;BYDAY=MO;UNTIL=20261225')));
check('describe states a COUNT', /3 times/.test(describe('FREQ=DAILY;COUNT=3')));

// Nonsense must be refused, not absorbed.
let rejected = false;
try { expand('FREQ=DAILY;UNTIL=soon', '2026-08-24', '2026-08-24', '2026-09-07'); } catch { rejected = true; }
check('an unreadable UNTIL is refused rather than ignored', rejected);
let bothRefused = false;
try { expand('FREQ=DAILY;UNTIL=20260828;COUNT=3', '2026-08-24', '2026-08-24', '2026-09-07'); } catch { bothRefused = true; }
check('UNTIL and COUNT together are refused as ambiguous', bothRefused);

console.log('\nCadence is derived from the rule, never stored');
// A cadence column would be a second source for a fact the rule already
// determines, and the two would drift the first time a rule was edited.
eq('daily', cadence('FREQ=DAILY'), 'daily');
eq('every 7 days is really weekly', cadence('FREQ=DAILY;INTERVAL=7'), 'weekly');
eq('weekly', cadence('FREQ=WEEKLY;BYDAY=MO'), 'weekly');
eq('every 4 weeks is really monthly', cadence('FREQ=WEEKLY;BYDAY=MO;INTERVAL=4'), 'monthly');
eq('monthly', cadence('FREQ=MONTHLY;BYMONTHDAY=1'), 'monthly');
eq('every 3 months is seasonal', cadence('FREQ=MONTHLY;BYMONTHDAY=1;INTERVAL=3'), 'seasonal');
eq('a task with no rule is a one-off', cadence(null), 'once');
eq('an unreadable rule is a one-off rather than a crash', cadence('FREQ=NONSENSE'), 'once');

console.log('\nassertSupportedRule defers to the engine');
check('a plain weekly rule is accepted',
  assertSupportedRule('FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH').ok === true);
check('a null rule is accepted (a one-off has no rule)', assertSupportedRule(null).ok === true);
// These two were refused while the engine ignored them. It does not now.
check('UNTIL is accepted now the engine honours it',
  assertSupportedRule('FREQ=DAILY;UNTIL=20260828').ok === true);
check('COUNT is accepted now the engine honours it',
  assertSupportedRule('FREQ=DAILY;COUNT=7').ok === true);
check('lower case is still refused', assertSupportedRule('freq=daily;until=20260828').ok === false);
check('a rule the engine cannot read is still refused',
  assertSupportedRule('FREQ=HOURLY').ok === false);
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
  /no date stocked/.test(freshness({ last_restocked: null, shelf_life_days: 5 }, '2026-08-21').reason));

// ---- A printed use-by beats a calculated one, and reads differently -----
// shelf_life_days is a guess: N days from whenever it was stocked. use_by
// is what the jar says. The wording must never let one pass for the other,
// because an estimate shown as a hard date gets trusted at the fridge.
eq('a use-by date wins over the shelf-life estimate',
  freshness({ use_by: '2026-08-24', last_restocked: '2026-08-01', shelf_life_days: 365 }, '2026-08-21').daysLeft, 3);
eq('and it is reported as coming from the label',
  freshness({ use_by: '2026-08-24', last_restocked: '2026-08-01', shelf_life_days: 365 }, '2026-08-21').source, 'label');
eq('with no use-by, the estimate is used and says so',
  freshness({ last_restocked: '2026-08-20', shelf_life_days: 5 }, '2026-08-21').source, 'estimate');
eq('a use-by in the past is PAST even with shelf life left',
  freshness({ use_by: '2026-08-19', last_restocked: '2026-08-01', shelf_life_days: 365 }, '2026-08-21').state, 'past');
eq('a use-by today is worth using up, not past',
  freshness({ use_by: '2026-08-21' }, '2026-08-21').state, 'soon');
check('a real date is stated WITHOUT the word "about"',
  !/about/i.test(describeFreshness(freshness({ use_by: '2026-09-03' }, '2026-08-21'))),
  describeFreshness(freshness({ use_by: '2026-09-03' }, '2026-08-21')));
check('an estimate KEEPS the word "about"',
  /about/i.test(describeFreshness(freshness({ last_restocked: '2026-08-20', shelf_life_days: 40 }, '2026-08-21'))));
check('a real date is written unambiguously, never 03/09',
  /3 September 2026/.test(describeFreshness(freshness({ use_by: '2026-09-03' }, '2026-08-21'))));

console.log('\nShortfall — the meal plan minus the pantry');
// Hand-calculated. Porridge serves 2: 100 g oats, 200 ml milk, 2 eggs.
const sfOats = { id: 'f1', name: 'Oats' };
const sfMilk = { id: 'f2', name: 'Milk', grams_per_ml: 1.03 };
const sfEggs = { id: 'f3', name: 'Eggs' };
const sfFoods = [sfOats, sfMilk, sfEggs];
const sfPlan = [{ meal_id: 'm1', serves_override: null, meals: { id: 'm1', name: 'Porridge', default_serves: 2 } }];
const sfIngredients = [
  { meal_id: 'm1', food_id: 'f1', quantity_g: 100, unit: 'g', foods: sfOats },
  { meal_id: 'm1', food_id: 'f2', quantity_g: 200, unit: 'ml', foods: sfMilk },
  { meal_id: 'm1', food_id: 'f3', quantity_g: 2, unit: 'item', foods: sfEggs }
];
const sf = (pantry, plan = sfPlan) => computeShortfall({
  plan, ingredients: sfIngredients, pantry, foods: sfFoods, todayISO: '2026-08-27'
});
const find = (result, name) => result.items.find((i) => i.food.name === name);

eq('an empty pantry needs all three', sf([]).items.length, 3);

// RULE 1: enough stock produces NO line. This is the difference between a
// shopping list and an inventory printout.
check('a food with enough stock does not appear at all',
  !find(sf([{ food_id: 'f1', current_qty: 500, unit: 'g', foods: sfOats }]), 'Oats'));

// RULE 2: no pantry row means zero, not unknown.
eq('a food with no pantry row is needed in full', find(sf([]), 'Oats').shortfall, 100);

eq('partial stock is subtracted',
  find(sf([{ food_id: 'f1', current_qty: 60, unit: 'g', foods: sfOats }]), 'Oats').shortfall, 40);

// RULE 3: NULL is "not recorded" and is NOT zero and NOT enough.
const unrecorded = find(sf([{ food_id: 'f1', current_qty: null, unit: 'g', foods: sfOats }]), 'Oats');
check('an unrecorded amount is listed but flagged as not comparable', !unrecorded.comparable);
check('and the line says why', /never recorded/.test(describeShortfall(unrecorded)));

// RULE 5: past its use-by is not stock — you cannot cook with it.
const expired = find(sf([{ food_id: 'f1', current_qty: 500, unit: 'g', use_by: '2026-08-20', foods: sfOats }]), 'Oats');
check('stock past its use-by is not counted', !!expired && expired.shortfall === 100);
check('and the line says it is out of date rather than pretending the cupboard is empty',
  /past its use-by/.test(describeShortfall(expired)));

// A serves_override scales the requirement.
eq('doubling the servings doubles what is needed',
  find(sf([], [{ meal_id: 'm1', serves_override: 4, meals: { id: 'm1', name: 'Porridge', default_serves: 2 } }]), 'Oats').shortfall, 200);

// THE POISON CASE: dividing by zero would make every figure Infinity.
const broken = sf([], [{ meal_id: 'm1', serves_override: null, meals: { id: 'm1', name: 'Broken', default_serves: 0 } }]);
eq('a meal with zero servings poisons nothing', broken.items.length, 0);
eq('and it is reported as skipped rather than dropped', broken.skipped.length, 1);

// Arithmetic in grams, shopping in the unit you buy in.
const milkShort = find(sf([{ food_id: 'f2', current_qty: 50, unit: 'ml', foods: sfMilk }]), 'Milk');
eq('milk is shopped for in millilitres, not grams', milkShort.unit, 'ml');
eq('and the shortfall is right', milkShort.shortfall, 150);
check('what you already hold is stated, not reported as none',
  /you have 50 ml/.test(describeShortfall(milkShort)), describeShortfall(milkShort));

// No conversion factor: list the full amount and SAY SO. Never guess.
const sfNoFactor = find(sf([{ food_id: 'f3', current_qty: 6, unit: 'item', foods: sfEggs }]), 'Eggs');
check('a unit that cannot be converted is flagged, never silently converted',
  !sfNoFactor || !sfNoFactor.comparable || sfNoFactor.unit === 'item');

console.log('\nCan I cook this? — per-recipe stock');
const smStock = (pantry, serves = 2) => stockForMeal({
  ingredients: sfIngredients, pantry, foods: sfFoods,
  serves, defaultServes: 2, todayISO: '2026-08-27'
});
eq('an empty pantry has none of it', smStock([]).inStock, 0);
eq('and names every missing ingredient', smStock([]).missing.length, 3);
eq('enough of one ingredient counts it',
  smStock([{ food_id: 'f1', current_qty: 500, unit: 'g', foods: sfOats }]).inStock, 1);
eq('not enough of one does NOT count it',
  smStock([{ food_id: 'f1', current_qty: 10, unit: 'g', foods: sfOats }]).inStock, 0);
// Cooking for more people changes the answer — that is the point of scaling.
eq('doubling the servings can turn "have it" into "short"',
  smStock([{ food_id: 'f1', current_qty: 150, unit: 'g', foods: sfOats }], 4).inStock, 0);
// Same rules as the shortfall, answered per recipe.
eq('stock past its use-by is not counted as had',
  smStock([{ food_id: 'f1', current_qty: 500, unit: 'g', use_by: '2026-08-01', foods: sfOats }]).expiring.length, 1);
eq('an unrecorded amount is "cannot be counted", not "missing"',
  smStock([{ food_id: 'f1', current_qty: null, unit: 'g', foods: sfOats }]).unknown.length, 1);
check('the line NAMES what is short rather than only counting it',
  /short of/.test(describeStockForMeal(smStock([]))), describeStockForMeal(smStock([])));

console.log('\nPack size is read from the label, or refused');
// A wrong pack size becomes the amount you are recorded as having, and the
// shopping list then buys the wrong quantity. Refusing beats guessing.
eq('grams', parsePackSize('330g').amount, 330);
eq('millilitres, with the estimate mark', parsePackSize('150 ml e').unit, 'ml');
eq('litres become millilitres', parsePackSize('1L').amount, 1000);
eq('kilos become grams', parsePackSize('0,5 kg').amount, 500);
eq('centilitres become millilitres', parsePackSize('75cl').amount, 750);
eq('a multipack is REFUSED, not multiplied', parsePackSize('4 x 125g'), null);
eq('two numbers is refused — which one is the size?', parsePackSize('330g (drained 240g)'), null);
eq('"1 pack" is not a measurement', parsePackSize('1 pack'), null);
eq('nothing at all is refused', parsePackSize(''), null);
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

console.log('\nA missing amount is not zero');
// This shipped: "How much" was left blank on seven scanned jars and every one
// was stored as 0. To the shortfall, 0 and "no pantry row" mean the same
// thing — you have none — so a captured shelf would have been rebought in
// full. NULL is a third state and has to survive as one.
const noneRecorded = { id: 'a', current_qty: null, unit: 'item' };
const explicitZero = { id: 'b', current_qty: 0, unit: 'item' };
const hasSome = { id: 'c', current_qty: 2, unit: 'item' };
eq('a null amount is flagged as needing one', needsAmount([noneRecorded]).length, 1);
eq('a zero amount is flagged too — it may be the old bug', needsAmount([explicitZero]).length, 1);
eq('a real amount is not flagged', needsAmount([hasSome]).length, 0);
eq('only the incomplete rows come back', needsAmount([noneRecorded, explicitZero, hasSome]).length, 2);
eq('an empty pantry flags nothing', needsAmount([]).length, 0);
check('null is not silently read as zero', needsAmount([noneRecorded])[0].current_qty === null);

console.log('\nNew stock starts in the unit you buy it in');
// You buy a JAR of harissa, not 180 grams of it — the pack size is already
// in the name. Loose fresh food is the exception worth weighing.
eq('a cupboard item starts as items', defaultUnitFor('food_ambient'), 'item');
eq('a household item starts as items', defaultUnitFor('household'), 'item');
eq('fresh food starts in grams', defaultUnitFor('food_fresh'), 'g');
eq('an unknown category still gets a usable unit', defaultUnitFor('nonsense'), 'item');

console.log('\nQuantity formatting');
eq('grams below a kilo stay grams', formatQuantity(250, 'g'), '250 g');
eq('grams above a kilo become kg', formatQuantity(2400, 'g'), '2.4 kg');
eq('millilitres above a litre become litres', formatQuantity(1500, 'ml'), '1.5 l');
eq('one item is singular', formatQuantity(1, 'item'), '1 item');
eq('items pluralise', formatQuantity(3, 'item'), '3 items');
check('a unit is ALWAYS present', /[a-z]/.test(formatQuantity(500, 'g')));

// ============ Phase 11: claiming a scan into an existing food ============
console.log('\nClaim ranking');

// The food you typed is nearly always shorter than the name on the packet.
// Scoring against the smaller token set is what stops that being punished.
check('a typed name matches a longer packet name',
  similarity('Chorizo', 'Unearthed Spanish Cooking Chorizo Ring') === 1);
check('an unrelated food scores nothing',
  similarity('Chorizo', 'Semi Skimmed Milk') === 0);
check('the supermarket name alone is not a match',
  similarity('Tesco Chopped Tomatoes', 'Tesco Semi Skimmed Milk') === 0,
  'stopwords must strip the retailer');
check('a partial match scores between the two',
  similarity('Chopped tomatoes', 'Napolina Chopped Tomatoes Tin') === 1);
check('short filler words are dropped', !tokenise('Tin of the Best Ham').includes('the'));
check('an empty name cannot match anything', similarity('', 'Chorizo') === 0);
eq('the list stays short enough to glance at', MAX_CANDIDATES, 5);

console.log('\nClaim merges, and never overwrites');

const typedFood = {
  id: 'f1', name: 'Chorizo', barcode: null,
  calories_per_100g: null, protein_g: null, fat_g: null, carbs_g: null,
  grams_per_item: null, grams_per_ml: null
};
const scan = {
  barcode: '5012345678900', source: 'openfoodfacts',
  calories_per_100g: 455, protein_g: 24.1, fat_g: 38.2, carbs_g: 1.9
};
const filled = buildClaimPatch(typedFood, scan);
eq('the barcode is attached', filled.barcode, '5012345678900');
eq('calories are filled in', filled.calories_per_100g, 455);
eq('the source becomes Open Food Facts', filled.source, 'openfoodfacts');

// The failure this guards against: Open Food Facts has gaps, and a merge
// that wrote null over a real figure would make scanning something you
// learn to avoid.
const partlyKnown = { ...typedFood, protein_g: 25, calories_per_100g: 450 };
const gapped = buildClaimPatch(partlyKnown, {
  barcode: '5012345678900', source: 'openfoodfacts',
  calories_per_100g: null, protein_g: undefined, fat_g: 38.2, carbs_g: 1.9
});
check('an existing figure is never overwritten', gapped.protein_g === undefined);
check('a null from the scan does not clear a real value', gapped.calories_per_100g === undefined);
eq('a genuinely missing figure is still filled', gapped.fat_g, 38.2);

const barcodeOnly = buildClaimPatch(typedFood, { barcode: '5012345678900', source: 'openfoodfacts' });
eq('a barcode-only scan still attaches the barcode', barcodeOnly.barcode, '5012345678900');
check('but does not claim Open Food Facts as a source', barcodeOnly.source === undefined,
  'source must only change when data actually arrived');

const packSized = buildClaimPatch(typedFood, { barcode: '5012345678900', grams_per_item: 400 });
eq('a pack size lands as grams per item', packSized.grams_per_item, 400);
check('a negative figure is rejected outright',
  buildClaimPatch(typedFood, { barcode: '5012345678900', protein_g: -3 }).protein_g === undefined);

check('the claim is described in plain words',
  describeClaim({ name: 'Chorizo' }, ['calories_per_100g', 'protein_g']).includes('Chorizo'));
check('a barcode-only claim says the nutrition is unchanged',
  describeClaim({ name: 'Chorizo' }, []).includes('unchanged'));

console.log('\nBought means it is in the cupboard');

// Units disagreeing is the corruption case: 4 items added to 1600 grams is
// silently wrong and only surfaces weeks later as a nonsense list.
const mismatch = describeRestock(RESTOCK.UNIT_MISMATCH, {
  foodName: 'Chopped tomatoes', listUnit: 'item', stockUnit: 'g'
});
check('a unit mismatch names both units', mismatch.includes('item') && mismatch.includes('g'));
check('and says the pantry was left alone', /left alone/.test(mismatch));
check('an increase reads as a fact, not a congratulation',
  !/well done|great|nice/i.test(describeRestock(RESTOCK.INCREASED, { foodName: 'Rice' })));
check('a missing amount still says the date was recorded',
  describeRestock(RESTOCK.NO_AMOUNT, { foodName: 'Rice' }).includes('restocked'));
check('every outcome produces a sentence',
  Object.values(RESTOCK).every((o) => typeof describeRestock(o, { foodName: 'X' }) === 'string'
    && describeRestock(o, { foodName: 'X' }).length > 0));

console.log('');

// ============ Phase 18: households ============
console.log('\nServings across a household');

// Cooking slightly too much is a leftover. Cooking slightly too little is
// someone going without. The rounding is asymmetric on purpose.
const adult = { portion_factor: 1, role: 'adult', dietary_tags: [] };
const child = { portion_factor: 0.6, role: 'child', dietary_tags: [] };

eq('two adults need two servings', servingsFor([adult, adult]), 2);
eq('two adults and a child round UP, never down', servingsFor([adult, adult, child]), 3);
eq('one adult and one child land on a half', servingsFor([adult, child]), 2);
eq('a lone child still gets a whole serving', servingsFor([child]), 1);
eq('nobody named means cook for one, not for nobody', servingsFor([]), 1);
check('a missing portion_factor is treated as a full adult',
  servingsFor([{ }, { }]) === 2, 'a null must never silently shrink the shop');

console.log('\nDescribing a member');
check('a member with no sign-in says so',
  describeMember({ display_name: 'Sam', role: 'child', portion_factor: 0.6, user_id: null,
    dietary_tags: [] }).includes('No sign-in'));
check('a non-standard portion is spelled out, not left as a bare number',
  describeMember({ display_name: 'Sam', role: 'child', portion_factor: 0.6, user_id: null,
    dietary_tags: [] }).includes('adult portion'));
check('a full portion is not mentioned at all',
  !describeMember({ display_name: 'A', role: 'adult', portion_factor: 1, user_id: 'u1',
    dietary_tags: [] }).includes('portion'),
  'stating the default is noise');
check('dietary tags are named in plain words',
  describeMember({ display_name: 'A', role: 'adult', portion_factor: 1, user_id: 'u1',
    dietary_tags: ['vegetarian'] }).includes('Vegetarian'));
check('the three roles are exactly owner, adult, child',
  ROLES.map((r) => r.value).join(',') === 'owner,adult,child');

console.log('');

// ============ Phase 12: pack labels and household measures ============
console.log('\nPack labels');

const tin = { item_label: 'tin', grams_per_item: 400 };

eq('four tins say tins, and say what they weigh',
  formatPackQuantity(4, 'item', tin), '4 tins (1.6 kg)');
eq('one tin is singular', formatPackQuantity(1, 'item', tin), '1 tin (400 g)');
eq('no label falls back to the old wording',
  formatPackQuantity(4, 'item', {}), '4 items');
// The bracket is DERIVED. Without a weight there is nothing honest to put
// in it, and an invented total gets trusted standing in an aisle.
eq('an unknown item weight omits the total, never guesses it',
  formatPackQuantity(4, 'item', { item_label: 'jar' }), '4 jars');
eq('irregular plurals are looked up, not inferred',
  pluraliseLabel('loaf', 2), 'loaves');
eq('a label already plural is left alone', pluraliseLabel('greens', 3), 'greens');
eq('one of anything stays singular', pluraliseLabel('slice', 1), 'slice');
eq('a blank label still produces a word', pluraliseLabel('', 3), 'items');

console.log('\nTeaspoons and tablespoons are display units');

eq('two tablespoons are stored as thirty millilitres',
  JSON.stringify(toStorage(2, 'tbsp')), '{"value":30,"unit":"ml"}');
eq('two teaspoons are stored as ten millilitres',
  JSON.stringify(toStorage(2, 'tsp')), '{"value":10,"unit":"ml"}');
eq('grams pass through untouched',
  JSON.stringify(toStorage(250, 'g')), '{"value":250,"unit":"g"}');
check('a non-number is refused rather than stored as NaN', toStorage('abc', 'g') === null);
check('no entry unit is ever stored as itself',
  ENTRY_UNITS.every((u) => ['g', 'ml', 'item'].includes(u.store)),
  'schema.md forbids storing display units');

eq('thirty millilitres reads back as two tablespoons',
  formatPackQuantity(30, 'ml'), '2 tbsp');
eq('ten millilitres reads back as two teaspoons',
  formatPackQuantity(10, 'ml'), '2 tsp');
// A conversion producing a fraction nobody would measure is a worse label
// than the number it replaced.
eq('two hundred millilitres of milk stays millilitres',
  formatPackQuantity(200, 'ml'), '200 ml');
check('a non-multiple is not forced into spoons', toSpoons(23) === null);
check('nothing at or above the ceiling becomes spoons', toSpoons(60) === null);

// Regression, found on a real pantry screen 01 Sep: the form label said
// "Amount in items" while the list above it said "4 tins". The label has to
// reach the form, not only the summary line.
eq('the unit word beside an input uses the label too',
  pluraliseLabel('tin', 2), 'tins');

check('the original two-argument call still works',
  formatQuantity(2400, 'g') === '2.4 kg', 'three views still call it');

console.log('');

// ============ Phase 13: reference food data ============
console.log('\nThe reference file itself');

check('the file parses and has entries', Array.isArray(refDoc.foods) && refDoc.foods.length > 150);
check('every entry has a slug and a name',
  refDoc.foods.every((f) => f.slug && f.name));
check('slugs are unique',
  new Set(refDoc.foods.map((f) => f.slug)).size === refDoc.foods.length);
// An alias matching two foods would make the app pick one silently. It
// must pick neither, so the collision has to be designed out of the data.
const aliasIndex = new Map();
let collisions = 0;
for (const f of refDoc.foods) {
  for (const a of f.aliases || []) {
    const k = a.toLowerCase();
    if (aliasIndex.has(k)) collisions += 1;
    aliasIndex.set(k, f.slug);
  }
}
eq('no alias points at two different foods', collisions, 0);
check('an item weight always comes with a word for the item',
  refDoc.foods.every((f) => f.grams_per_item === undefined || f.item_label !== undefined));
check('macros are all-or-nothing per entry',
  refDoc.foods.every((f) => f.calories_per_100g === undefined
    || (f.protein_g !== undefined && f.fat_g !== undefined && f.carbs_g !== undefined)),
  'a half-filled entry would report a false total');
check('non-food entries carry no calories',
  refDoc.foods.filter((f) => ['household', 'personal', 'home', 'pet'].includes(f.category))
    .every((f) => f.calories_per_100g === undefined));

console.log('\nReference values fill blanks only');

const eggEntry = {
  slug: 'egg-medium', name: 'Egg, medium', category: 'food_fresh',
  grams_per_item: 58, item_label: 'egg',
  calories_per_100g: 143, protein_g: 12.6, fat_g: 9.5, carbs_g: 0.7
};

const onEmpty = referencePatch(eggEntry, {});
eq('an empty food gets the calories', onEmpty.calories_per_100g, 143);
eq('and the item weight', onEmpty.grams_per_item, 58);
eq('and the word for one of them', onEmpty.item_label, 'egg');
eq('and is marked as an estimate', onEmpty.source, 'reference');

// A published average must never overwrite a figure read off a real packet.
const onScanned = referencePatch(eggEntry, { calories_per_100g: 139, protein_g: 12 });
check('a scanned calorie figure survives', onScanned.calories_per_100g === undefined);
check('a scanned protein figure survives', onScanned.protein_g === undefined);
eq('but a genuinely empty field is still filled', onScanned.fat_g, 9.5);
check('an empty string counts as empty, not as data',
  referencePatch(eggEntry, { calories_per_100g: '' }).calories_per_100g === 143);

// Copying a category says nothing about where numbers came from.
const labelOnly = { slug: 'x', name: 'Toilet roll', category: 'household', item_label: 'roll' };
check('a non-food entry does not claim a nutrition source',
  referencePatch(labelOnly, {}).source === undefined);
check('hasMacros is false for a non-food', hasMacros(labelOnly) === false);

check('the offer says the values are averages',
  /average|typical/i.test(describeOffer(eggEntry)));
check('the offer says how to replace them',
  /scan/i.test(describeOffer(eggEntry)));

console.log('');

// ============ Phase 15: method steps ============
console.log('\nStep style checks (advisory, never blocking)');

eq('a short single-action step is clean',
  checkStyle('Add the 400 g tin of chopped tomatoes.').length, 0);
check('two actions joined by "and" are flagged',
  checkStyle('Chop the onion and fry it in oil').some((i) => i.rule === 1));
check('"meanwhile" is flagged',
  checkStyle('Meanwhile cook the spaghetti').some((i) => i.rule === 2));
check('an over-long step is flagged',
  checkStyle('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone')
    .some((i) => i.rule === 6));
eq('the ceiling is twenty words', MAX_STEP_WORDS, 20);
// Rule 11: these all tell someone that struggling is their fault.
for (const word of ['simply', 'just', 'obviously', 'quickly', 'easy']) {
  check(`"${word}" is flagged as shaming`,
    checkStyle(`${word} stir the sauce`).some((i) => i.rule === 11));
}
check('the checker returns issues, never throws on empty input',
  Array.isArray(checkStyle('')));

console.log('\nIngredient tokens');

const stepIngredients = [
  { quantity_g: 400, unit: 'g', foods: { name: 'Chopped tomatoes', item_label: 'tin', grams_per_item: 400 } },
  { quantity_g: 2, unit: 'item', foods: { name: 'Egg, medium', item_label: 'egg', grams_per_item: 58 } }
];

eq('a token becomes a real quantity and name',
  resolveTokens('Add the {{ing:chopped-tomatoes}}.', stepIngredients, 1),
  'Add the 400 g chopped tomatoes.');
// The label is already the noun. "2 eggs" is the whole phrase; appending
// the food name gives "2 eggs (116 g) egg, medium", which is unreadable.
eq('an item label stands alone as the phrase',
  resolveTokens('Crack in {{ing:egg-medium}}.', stepIngredients, 1),
  'Crack in 2 eggs.');
eq('and scales without picking up the gram total',
  resolveTokens('Crack in {{ing:egg-medium}}.', stepIngredients, 2),
  'Crack in 4 eggs.');
eq('scaling a recipe scales the step text too',
  resolveTokens('Add the {{ing:chopped-tomatoes}}.', stepIngredients, 2),
  'Add the 800 g chopped tomatoes.');

// Showing {{ing:butter}} to someone mid-cook is worse than showing "butter".
eq('an unknown token degrades to a plain name, never to braces',
  resolveTokens('Melt the {{ing:butter}}.', stepIngredients, 1),
  'Melt the butter.');
check('no raw braces ever survive rendering',
  !resolveTokens('{{ing:nope}} and {{ing:chopped-tomatoes}}', stepIngredients, 1).includes('{{'));
eq('the editor can name what did not resolve',
  unresolvedTokens('Melt the {{ing:butter}}.', stepIngredients).join(','), 'butter');
eq('a resolvable token is not reported as missing',
  unresolvedTokens('{{ing:chopped-tomatoes}}', stepIngredients).length, 0);
eq('slugs are stable across punctuation and case',
  slugifyFoodName('Egg, medium'), 'egg-medium');

console.log('');

if (failures.length) {
  console.log(`BEHAVIOUR TESTS FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`BEHAVIOUR TESTS PASSED — ${pass}/${pass} assertions`);
