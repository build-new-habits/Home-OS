// Interaction trace.
//
// The render gate proves a view DRAWS. This proves it WORKS: every control
// is clicked or filled for real, and the resulting database call is
// captured and inspected — table, operation, and payload.
//
// What this catches that nothing else does:
//   * a button wired to nothing
//   * a handler that calls a function with the wrong argument shape
//   * a write that targets the wrong table or sends the wrong columns
//   * an optimistic UI that never actually issues its write
//   * a rollback that does not happen when the write fails
//
// What it CANNOT catch: anything requiring the real database, a real
// camera, or a real browser. It uses a recording stub.

import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';

const REPO = process.env.GATE_REPO || '/tmp/gate-repo';

const dom = new JSDOM('<!doctype html><html><body><main id="app-main"></main></body></html>', {
  url: 'https://example.github.io/Home-OS/#/meals', pretendToBeVisual: true
});
const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
global.CSS = window.CSS || { escape: (v) => String(v).replace(/([^\w-])/g, '\\$1') };
global.AbortController = window.AbortController;
global.AbortSignal = window.AbortSignal;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
// ---- The recipe library is FILES, not network -------------------------
// It used to throw for every URL, which meant the library panel and the
// meal picker both rendered "could not be loaded" and every assertion about
// them was really an assertion about an error message. The library ships as
// JSON in the repo, so the gate serves it off disk and leaves everything
// else — Open Food Facts, anything https — throwing as before.
global.fetch = async (url) => {
  const href = String(url && url.url ? url.url : url);
  if (href.startsWith('file://')) {
    const file = fileURLToPath(href);
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8');
      return { ok: true, status: 200, async json() { return JSON.parse(text); }, async text() { return text; } };
    }
    return { ok: false, status: 404, async json() { throw new Error('404'); }, async text() { return ''; } };
  }
  throw new Error('no network in the trace');
};
window.fetch = global.fetch;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.HTMLElement.prototype.scrollIntoView = () => {};

// ---- Recording stub -------------------------------------------------
// Records every operation, and can be told to fail the next write so the
// rollback path is exercised too.
const calls = [];
let failNextWrite = false;

// Writes resolve after a short delay. A zero-latency stub makes the
// optimistic window UNOBSERVABLE — the UI updates and is replaced by the
// server value within the same tick — so an optimistic-UI assertion would
// silently assert nothing. Real writes take time; the stub should too.
const WRITE_LATENCY_MS = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 'not' added 6 Sep 2026: the meal picker asks which library recipes are
// already yours with .not('library_ref', 'is', null), and a stub missing a
// method the app really uses does not fail an assertion — it throws, and the
// whole gate dies before it can report anything.
const CHAIN = ['select', 'eq', 'neq', 'not', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'order', 'limit', 'range', 'match'];

function fixture(t) {
  if (t === 'foods') return [
    { id: 'food-1', name: 'Rolled oats', barcode: '5000159407236', calories_per_100g: 379, protein_g: 13.2, fat_g: 8.1, carbs_g: 60.1, source: 'openfoodfacts', category: 'food_ambient' },
    { id: 'food-2', name: 'Home-made stock', barcode: null, calories_per_100g: null, protein_g: null, fat_g: null, carbs_g: null, source: 'manual', category: 'personal' }];
  // meal-2 is the subtle case: a library recipe already imported, whose
  // heart was set in the LIBRARY table and never in meals.is_favourite.
  // Read only one of the two and it disappears from your favourites.
  if (t === 'meals') return [
    { id: 'meal-1', name: 'Porridge', default_serves: 2 },
    { id: 'meal-2', name: 'Banana pancakes', default_serves: 2,
      library_ref: 'banana-pancakes', is_favourite: false }];
  // One favourited library recipe, with a note. A real slug from
  // data/recipe_library/breakfast.json — a made-up one would filter to
  // nothing and the assertions below would pass by accident.
  if (t === 'recipe_library_notes') return [
    { id: 'note-1', recipe_slug: 'overnight-oats', is_favourite: true,
      note: 'Topped with frozen fruit', updated_at: '2026-09-09T06:00:00Z' },
    { id: 'note-2', recipe_slug: 'banana-pancakes', is_favourite: true,
      note: null, updated_at: '2026-09-09T06:00:00Z' }];
  if (t === 'meal_ingredients') return [
    { id: 'ing-1', meal_id: 'meal-1', food_id: 'food-1', quantity_g: 80, unit: 'g', foods: fixture('foods')[0] }];
  if (t === 'weekly_meal_plan') return [{ id: 'plan-1', day_of_week: 'mon', slot: 'breakfast', serves_override: 3, meal_id: 'meal-1', meals: { id: 'meal-1', name: 'Porridge', default_serves: 2 } }];
  if (t === 'pantry_stock') return [
    { id:'st-1', food_id:'food-1', default_location:'Kitchen cupboard', shelf_life_days:365,
      current_qty:500, unit:'g', last_restocked:'2026-08-01',
      foods:{ id:'food-1', name:'Rolled oats', category:'food_ambient', grams_per_ml:null, grams_per_item:25 } },
    { id:'st-2', food_id:'food-2', default_location:'Bathroom', shelf_life_days:5,
      current_qty:2, unit:'item', last_restocked:'2026-08-19',
      foods:{ id:'food-2', name:'Home-made stock', category:'personal', grams_per_ml:null, grams_per_item:null } }];
  if (t === 'holidays') return [{ id: 'hol-1', title: 'Cornwall', start_date: '2026-09-05', end_date: '2026-09-12' }];
  if (t === 'holiday_checklist_items') return [
    { id: 'chk-1', holiday_id: 'hol-1', title: 'Passports', status: 'complete' },
    { id: 'chk-2', holiday_id: 'hol-1', title: 'Chargers', status: 'pending' }];
  if (t === 'holiday_purchase_items') return [{ id: 'buy-1', holiday_id: 'hol-1', title: 'Sun cream', status: 'pending', send_to_shopping: false }];
  if (t === 'calendar_events') return [{ id: 'ev-1', event_type: 'work_location', source_id: null, title: 'Office', start_date: '2026-08-24', recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH', location_label: 'Head office' }];
  return [];
}

function builder(table) {
  const state = { op: 'select', payload: null, filters: {}, single: false, head: false };
  const b = {};
  for (const m of CHAIN) {
    b[m] = (...args) => {
      if (m === 'select' && args[1] && args[1].head) state.head = true;
      if (m === 'eq') state.filters[args[0]] = args[1];
      return b;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete']) {
    b[m] = (payload) => { state.op = m; state.payload = payload ?? null; return b; };
  }
  b.single = () => { state.single = true; return b; };
  b.maybeSingle = b.single;
  b.then = (resolve) => {
    calls.push({ table, op: state.op, payload: state.payload, filters: { ...state.filters } });
    const isWrite = state.op !== 'select';
    const settleWith = async (value) => {
      if (isWrite) await sleep(WRITE_LATENCY_MS);
      return value;
    };
    if (failNextWrite && isWrite) {
      failNextWrite = false;
      return settleWith({ data: null, error: { message: 'simulated write failure' } }).then(resolve);
    }
    const rows = fixture(table);
    if (state.head) return Promise.resolve({ count: rows.length, error: null }).then(resolve);
    const echo = state.payload && !Array.isArray(state.payload)
      ? { id: 'new-row', ...state.payload }
      : (rows[0] || { id: 'new-row' });
    const data = state.single ? echo : rows;
    return settleWith({ data, error: null, count: rows.length }).then(resolve);
  };
  return b;
}

globalThis.__HOME_OS_SUPABASE_STUB__ = { from: builder, auth: {} };

// ---- Harness --------------------------------------------------------
let pass = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fails.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${name}  ${detail}`); }
}
const settle = (ms = 90) => new Promise((r) => setTimeout(r, ms));

function writes() { return calls.filter((c) => c.op !== 'select'); }
function lastWrite() { return writes()[writes().length - 1]; }
function clearCalls() { calls.length = 0; }

function click(node) {
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function setValue(node, value) {
  node.value = value;
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
  node.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function submit(form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}
// confirmDialog renders into document.body and resolves on a button click.
// confirmDialog renders role="alertdialog" (NOT "dialog") and appends
// CANCEL first, CONFIRM second — checked against the component rather than
// guessed, because guessing it the other way round silently clicked Cancel
// and made two delete assertions look like app bugs.
async function answerDialog(which = 'confirm') {
  await settle(30);
  const dialogs = [...window.document.body.querySelectorAll('[role="alertdialog"], [role="dialog"]')];
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return false;
  const buttons = [...dialog.querySelectorAll('button')];
  if (buttons.length === 0) return false;
  const target = which === 'confirm'
    ? (dialog.querySelector('button.btn-danger') || buttons[buttons.length - 1])
    : buttons[0];
  click(target);
  await settle(40);
  return true;
}

/** True if a confirm dialog is currently on screen. */
function dialogOpen() {
  return !!window.document.body.querySelector('[role="alertdialog"], [role="dialog"]');
}

// =====================================================================
// MEALS
// =====================================================================
console.log('\nMeals view — every control');

const mealsMount = window.document.getElementById('app-main');
const meals = await import(pathToFileURL(path.join(REPO, 'js/views/meals.js')).href);
const cleanupMeals = meals.render(mealsMount, {});
await settle(120);

// P5, 7 Sep 2026: adding a meal moved to its own route, so the meals list
// legitimately renders no form. The form is exercised on the page that now
// holds it — a second mount below — rather than the assertion being
// loosened to accept either.
const mealButtons = [...mealsMount.querySelectorAll('button')];
check(`meals: ${mealButtons.length} buttons rendered`, mealButtons.length > 0);

const mealAddMount = window.document.createElement('main');
window.document.body.appendChild(mealAddMount);
const cleanupMealAdd = meals.render(mealAddMount, { section: 'add' });
await settle(80);
check('meals-add: the add form is on its own page',
  !!mealAddMount.querySelector('#new-meal-name'));

// --- add a meal ---
clearCalls();
setValue(mealAddMount.querySelector('#new-meal-name'), 'Trace stew');
setValue(mealAddMount.querySelector('#new-meal-serves'), '3');
submit(mealAddMount.querySelector('#new-meal-name').closest('form'));
await settle();
let w = lastWrite();
check('add meal issues an insert on `meals`', w && w.table === 'meals' && w.op === 'insert', JSON.stringify(w));
// Revision 5 added meal_type and is_favourite, so the insert legitimately
// carries four columns. The assertion still pins the SET exactly — an
// unexpected extra column is how a stray field reaches the database.
check('add meal sends exactly the four columns it should',
  w && JSON.stringify(Object.keys(w.payload).sort())
    === '["default_serves","is_favourite","meal_type","name"]', JSON.stringify(w && w.payload));
check('an unclassified meal sends NULL, not a guessed type',
  w && w.payload.meal_type === null, JSON.stringify(w && w.payload.meal_type));
check('a new meal is not silently a favourite', w && w.payload.is_favourite === false);
check('default_serves is sent as a NUMBER, not a string',
  w && typeof w.payload.default_serves === 'number', typeof (w && w.payload.default_serves));
check('no user_id is ever sent (RLS supplies it)', !w || !('user_id' in w.payload));

// --- add a meal with a blank name is refused before any write ---
clearCalls();
setValue(mealAddMount.querySelector('#new-meal-name'), '   ');
submit(mealAddMount.querySelector('#new-meal-name').closest('form'));
await settle();
check('a blank meal name issues NO write', writes().length === 0, JSON.stringify(writes()));
check('and shows an error the user can read',
  !mealAddMount.querySelector('#new-meal-error').hidden);

// --- an ingredient can be created FROM the recipe ---
// Writing a recipe is not the moment to go and maintain a food library.
// A name and a category is enough: macros are nullable and the totals
// already say what is not counted yet.
clearCalls();
// The ingredient form lives inside the recipe panel, so open a recipe —
// the same journey a user makes.
const recipeOpen = mealsMount.querySelector('.recipe-row-open');
check('a recipe can be opened', !!recipeOpen);
if (recipeOpen) click(recipeOpen);
await settle(80);
const recipePanel = window.document.querySelector('.sheet[role="dialog"]') || mealsMount;

const newToggle = [...recipePanel.querySelectorAll('button')]
  .find((b) => /not on the list yet/.test(b.textContent));
check('a recipe offers to create an unknown ingredient', !!newToggle);
if (newToggle) {
  click(newToggle);
  await settle(20);
  const newName = recipePanel.querySelector('[id^="new-ingredient-name-"]');
  check('the new-ingredient name field appears', !!newName);
  if (newName) {
    setValue(newName, 'Harissa paste');
    // Held so the rebuild can be detected by node identity below.
    const cardBefore = recipePanel.querySelector('.meal-card');
    const qty = recipePanel.querySelector('[id^="add-ingredient-qty-"]');
    if (qty) setValue(qty, '30');
    submit(newName.closest('form'));
    await settle(120);

    const foodWrite = writes().find((c) => c.table === 'foods' && c.op === 'insert');
    check('it creates the food', !!foodWrite, JSON.stringify(writes()));
    check('with no macros — they are filled in whenever, not now',
      foodWrite && foodWrite.payload.calories_per_100g == null,
      JSON.stringify(foodWrite && foodWrite.payload));
    check('and an EDIBLE category, since it is being used as an ingredient',
      foodWrite && /^food_/.test(foodWrite.payload.category || ''),
      JSON.stringify(foodWrite && foodWrite.payload.category));
    check('no user_id is ever sent (RLS supplies it)',
      !foodWrite || !('user_id' in foodWrite.payload));

    const ingWrite = writes().find((c) => c.table === 'meal_ingredients' && c.op === 'insert');
    check('and links it to the recipe in the same action', !!ingWrite,
      'otherwise the user has created a food and still has no ingredient');

    // THE REGRESSION THIS GUARDS: the panel keeps its own DOM, so
    // re-rendering the rows behind it changed nothing visible. The
    // ingredient was saved and the screen did not move — indistinguishable
    // from a button that does not work. Every gate passed while it was
    // broken, which is why this one exists.
    await settle(60);
    const panelNow = window.document.querySelector('.sheet[role="dialog"]');
    check('the panel is still open after adding', !!panelNow);
    // Node IDENTITY, not content: the stub returns fixed fixture rows, so a
    // newly added name can never show up here however correct the code is.
    // What IS observable — and what was broken — is whether the panel's
    // contents were rebuilt at all, or only the rows behind it.
    const cardAfter = panelNow && panelNow.querySelector('.meal-card');
    check('and the panel itself is rebuilt, not just the rows behind it',
      !!cardAfter && cardAfter !== cardBefore,
      'otherwise a saved change is invisible until the panel is closed and reopened');
  }
}
// Leave no panel open for the blocks that follow.
while (window.document.querySelector('.sheet[role="dialog"]')) {
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle(20);
}

cleanupMeals();
await settle(20);
mealsMount.replaceChildren();

// =====================================================================
// THINGS YOU BUY (the foods library, now its own view)
// =====================================================================
// These traces MOVED with the code rather than being deleted. They cover
// the barcode normalisation, the category sentinel that survives Android
// firing `change` on a dismissed select, and the three-table restrict count
// before a delete — all found on a real device, none of them re-derivable
// from reading the source.
console.log('\nThings you buy — every control');

const foodsMount = window.document.createElement('main');
window.document.body.appendChild(foodsMount);
const foodsView = await import(pathToFileURL(path.join(REPO, 'js/views/foods.js')).href);
const cleanupFoods = foodsView.render(foodsMount, {});
await settle(120);

// --- barcode validation stops a silent null ---
clearCalls();
foodsMount.querySelector('#new-food-name').value = 'Trace food';
foodsMount.querySelector('#new-food-barcode').value = '12345';
submit(foodsMount.querySelector('#new-food-name').closest('form'));
await settle();
check('an unusable typed barcode issues NO write', writes().length === 0, JSON.stringify(writes()));
check('and says so rather than dropping it silently',
  !foodsMount.querySelector('#new-food-error').hidden
  && /barcode/i.test(foodsMount.querySelector('#new-food-error').textContent));

// --- a valid food saves, normalised ---
clearCalls();
foodsMount.querySelector('#new-food-name').value = 'Trace food';
foodsMount.querySelector('#new-food-barcode').value = '123456789050'; // UPC-A, 12 digits
setValue(foodsMount.querySelector('#new-food-calories'), '250');
submit(foodsMount.querySelector('#new-food-name').closest('form'));
await settle();
w = writes().find((c) => c.table === 'foods' && c.op === 'insert');
check('saving a food inserts into `foods`', !!w, JSON.stringify(writes()));
check('the UPC-A barcode is stored in its 13-digit EAN form',
  w && w.payload.barcode === '0123456789050', w && w.payload.barcode);
check('a blank macro is sent as NULL, never 0',
  w && w.payload.protein_g === null, JSON.stringify(w && w.payload));
check('a filled macro is sent as a number', w && w.payload.calories_per_100g === 250);

// --- a scan must not be able to save an unconfirmed category ---
// Previously a boolean flag, cleared by any `change` event -- and Android's
// native select fires `change` on dismissal, so merely OPENING the dropdown
// satisfied it. Now a sentinel option leaves the select genuinely empty.
clearCalls();
const foodFormEl = foodsMount.querySelector('#new-food-name').closest('form');
const catSelect = foodsMount.querySelector('#new-food-category');
check('the food form has a category control', !!catSelect);

if (catSelect) {
  // Reproduce the scan state: a blank sentinel inserted and selected.
  const sentinel = window.document.createElement('option');
  sentinel.id = 'new-food-category-unchosen';
  sentinel.value = '';
  sentinel.textContent = 'Choose one — we guessed Drinks';
  catSelect.insertBefore(sentinel, catSelect.firstChild);
  catSelect.value = '';
  catSelect.setAttribute('aria-invalid', 'true');

  check('after a scan the category has NO value', catSelect.value === '');

  // THE REGRESSION: opening and dismissing the native picker fires change.
  catSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await settle(20);
  check('a stray change event does NOT satisfy the requirement',
    catSelect.value === '', `value became "${catSelect.value}"`);

  foodsMount.querySelector('#new-food-name').value = 'Scanned shampoo';
  submit(foodFormEl);
  await settle();
  check('saving with no category chosen issues NO write',
    !writes().some((c) => c.table === 'foods'), JSON.stringify(writes()));

  // A real choice permits it.
  setValue(catSelect, 'personal');
  await settle();
  submit(foodFormEl);
  await settle();
  const w2 = writes().find((c) => c.table === 'foods' && c.op === 'insert');
  check('choosing a category permits the save', !!w2, JSON.stringify(writes()));
  check('and the CHOSEN category is what gets written',
    w2 && w2.payload.category === 'personal', JSON.stringify(w2 && w2.payload));
  check('a non-food is never written as food_ambient by accident',
    !w2 || w2.payload.category !== 'food_ambient');
}

// --- delete a food that is in use: counts first, then refuses ---
clearCalls();
// The visible label is now just "Delete" — food rows collapsed on 5 Sep
// 2026 and the buttons stopped repeating the food's name on screen. The
// name still has to be in the ACCESSIBLE name, out of context, which is
// the thing actually worth asserting here.
const foodDelete = [...foodsMount.querySelectorAll('.food-card button')]
  .find((b) => /^Delete /.test(b.getAttribute('aria-label') || b.textContent));
check('a food card has a delete button', !!foodDelete);
if (foodDelete) {
  click(foodDelete);
  await settle(60);
  const counted = calls.filter((c) => c.op === 'select'
    && ['meal_ingredients', 'pantry_stock', 'shopping_list_items'].includes(c.table));
  check('deleting a food counts ALL THREE restrict tables first',
    new Set(counted.map((c) => c.table)).size === 3,
    [...new Set(counted.map((c) => c.table))].join(','));
  check('and issues no delete while dependents exist',
    !writes().some((c) => c.op === 'delete'), JSON.stringify(writes()));
  check('a confirm dialog is actually on screen', dialogOpen());
  check('the dialog can be dismissed', await answerDialog('cancel'));
}

cleanupFoods();
await settle(20);
foodsMount.replaceChildren();

// =====================================================================
// HOLIDAYS
// =====================================================================
console.log('\nHolidays view — every control');

const holMount = window.document.createElement('main');
window.document.body.appendChild(holMount);
const holidays = await import(pathToFileURL(path.join(REPO, 'js/views/holidays.js')).href);
const cleanupHol = holidays.render(holMount, {});
await settle(140);

// --- backwards date range refused before any write ---
clearCalls();
setValue(holMount.querySelector('#new-holiday-title'), 'Backwards');
setValue(holMount.querySelector('#new-holiday-start'), '2026-09-12');
setValue(holMount.querySelector('#new-holiday-end'), '2026-09-05');
submit(holMount.querySelector('#new-holiday-title').closest('form'));
await settle();
check('a holiday ending before it starts issues NO write', writes().length === 0, JSON.stringify(writes()));

// --- a valid holiday writes, and projects onto the calendar ---
clearCalls();
setValue(holMount.querySelector('#new-holiday-title'), 'Trace trip');
setValue(holMount.querySelector('#new-holiday-start'), '2026-10-01');
setValue(holMount.querySelector('#new-holiday-end'), '2026-10-08');
submit(holMount.querySelector('#new-holiday-title').closest('form'));
await settle(120);
const holInsert = writes().find((c) => c.table === 'holidays' && c.op === 'insert');
check('a valid holiday inserts into `holidays`', !!holInsert, JSON.stringify(writes()));
check('with both dates', holInsert && holInsert.payload.start_date === '2026-10-01'
  && holInsert.payload.end_date === '2026-10-08');
const evWrite = writes().find((c) => c.table === 'calendar_events' && c.op !== 'delete');
check('and is projected onto calendar_events', !!evWrite, JSON.stringify(writes()));
check('the projection is event_type holiday', evWrite && evWrite.payload.event_type === 'holiday');
// THE trap: a bounded range must never become a recurrence rule.
check('the projection has a NULL recurrence rule (UNTIL/COUNT are ignored by rrule)',
  evWrite && evWrite.payload.recurrence_rule === null,
  JSON.stringify(evWrite && evWrite.payload.recurrence_rule));

// --- optimistic tick: UI updates first, write follows ---
// The lists live in the panel now, so open a holiday first — the same
// journey a user makes.
const holRowOpen = holMount.querySelector('.recipe-row-open');
check('a holiday can be opened', !!holRowOpen);
if (holRowOpen) click(holRowOpen);
await settle(60);
const holPanel = window.document.querySelector('.sheet[role="dialog"]');
check('opening a holiday reveals its lists', !!holPanel);
const holCtx = holPanel || holMount;

clearCalls();
const toggle = holCtx.querySelector('.check-toggle');
const beforeLabel = toggle.textContent;
const beforePressed = toggle.getAttribute('aria-pressed');
click(toggle);
await settle(10); // inside the write window, which is 40ms in this stub
const midToggle = holCtx.querySelector('.check-toggle');
check('a tick changes the UI immediately, before the write resolves',
  midToggle.textContent !== beforeLabel || midToggle.getAttribute('aria-pressed') !== beforePressed,
  `${beforeLabel}/${beforePressed} -> ${midToggle.textContent}/${midToggle.getAttribute('aria-pressed')}`);
check('and the button is NOT disabled while saving', !midToggle.disabled);
await settle(120);
const tickWrite = writes().find((c) => c.table.startsWith('holiday_') && c.op === 'update');
check('the tick does issue an update behind the UI', !!tickWrite, JSON.stringify(writes()));
check('and sends a status the CHECK constraint allows',
  tickWrite && ['pending', 'complete'].includes(tickWrite.payload.status),
  JSON.stringify(tickWrite && tickWrite.payload));

// --- rollback when the write fails ---
clearCalls();
const toggle2 = holCtx.querySelector('.check-toggle');
const labelBefore = toggle2.textContent;
failNextWrite = true;
click(toggle2);
await settle(200);
const after = holCtx.querySelector('.check-toggle');
check('a FAILED tick rolls the UI back rather than lying',
  after.textContent === labelBefore, `${labelBefore} -> ${after.textContent}`);

// --- work location: weekly pattern ---
// The work form is on the PAGE, not in the holiday panel. Close the panel
// first, or a stray dialog sits over the controls being clicked.
while (window.document.querySelector('.sheet[role="dialog"]')) {
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle(20);
}
clearCalls();
setValue(holMount.querySelector('#work-title'), 'Office');
setValue(holMount.querySelector('#work-place'), 'Head office');
setValue(holMount.querySelector('#work-start'), '2026-09-01');
setValue(holMount.querySelector('#work-freq'), 'WEEKLY');
const tue = holMount.querySelector('#work-day-TU');
tue.checked = true;
tue.dispatchEvent(new window.Event('change', { bubbles: true }));
await settle(20);
check('choosing a day previews the pattern in words',
  /Tue|week/i.test(holMount.querySelector('.preview').textContent),
  holMount.querySelector('.preview').textContent.slice(0, 60));
submit(holMount.querySelector('#work-title').closest('form'));
await settle(120);
const workWrite = writes().find((c) => c.table === 'calendar_events' && c.op === 'insert');
check('saving a work pattern inserts into calendar_events', !!workWrite, JSON.stringify(writes()));
check('with event_type work_location', workWrite && workWrite.payload.event_type === 'work_location');
check('and a rule the engine can actually honour',
  workWrite && /^FREQ=WEEKLY/.test(workWrite.payload.recurrence_rule)
  && !/UNTIL|COUNT/.test(workWrite.payload.recurrence_rule),
  workWrite && workWrite.payload.recurrence_rule);

// --- weekly with no day chosen is refused ---
clearCalls();
tue.checked = false;
tue.dispatchEvent(new window.Event('change', { bubbles: true }));
setValue(holMount.querySelector('#work-title'), 'Nowhere');
submit(holMount.querySelector('#work-title').closest('form'));
await settle();
check('a weekly pattern with no days issues NO write', writes().length === 0, JSON.stringify(writes()));

// --- send_to_shopping stores the flag and nothing else ---
// These two live in the holiday panel, so reopen it — the work block above
// deliberately closed it.
const holRow2 = holMount.querySelector('.recipe-row-open');
if (holRow2) click(holRow2);
await settle(60);
const holCtx2 = window.document.querySelector('.sheet[role="dialog"]') || holMount;

clearCalls();
const shopBox = holCtx2.querySelector('.send-shopping input[type="checkbox"]');
check('the purchase item offers a send-to-shopping control', !!shopBox);
if (shopBox) {
  shopBox.checked = true;
  shopBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  await settle(120);
  const flagWrite = writes().find((c) => c.table === 'holiday_purchase_items' && c.op === 'update');
  check('ticking it updates holiday_purchase_items', !!flagWrite, JSON.stringify(writes()));
  check('and sets send_to_shopping true', flagWrite && flagWrite.payload.send_to_shopping === true);
  // Phase 7 owns the bridge; Phase 8 must not write the other table.
  check('it does NOT write shopping_list_items (that bridge is Phase 7)',
    !writes().some((c) => c.table === 'shopping_list_items'), JSON.stringify(writes()));
}

// --- deleting a holiday cleans up its soft-pointer calendar row ---
clearCalls();
const holDelete = [...holCtx2.querySelectorAll('button')]
  .find((b) => /^Delete /.test(b.textContent));
check('a holiday card has a delete button', !!holDelete);
if (holDelete) {
  click(holDelete);
  await settle(60);
  const counts = calls.filter((c) => c.op === 'select'
    && ['holiday_checklist_items', 'holiday_purchase_items'].includes(c.table));
  check('deleting counts both cascading child tables first',
    new Set(counts.map((c) => c.table)).size === 2,
    [...new Set(counts.map((c) => c.table))].join(','));
  check('a confirm dialog is actually on screen', dialogOpen());
  check('the dialog confirm button can be pressed', await answerDialog('confirm'));
  await settle(220);
  check('the holiday row is deleted',
    writes().some((c) => c.table === 'holidays' && c.op === 'delete'), JSON.stringify(writes()));
  // source_id is NOT a foreign key — nothing cascades this.
  check('and its calendar_events row is deleted explicitly (soft pointer)',
    writes().some((c) => c.table === 'calendar_events' && c.op === 'delete'), JSON.stringify(writes()));
}

cleanupHol();
await settle(20);

// --- cleanup really detaches ---
clearCalls();
window.dispatchEvent(new window.Event('online'));
await settle(60);
check('after cleanup, a connectivity event triggers no further reads',
  calls.length === 0, `${calls.length} call(s) after teardown`);


// ================= Weekly plan =================
// These interactions moved with the view. The gate failed loudly when the
// form left this page, which is the behaviour worth keeping: a trace that
// quietly stops covering a write is worse than no trace.
const planMount = window.document.createElement('main');
window.document.body.appendChild(planMount);
const mealPlanView = await import(pathToFileURL(path.join(REPO, 'js/views/mealPlan.js')).href);
const cleanupPlan = mealPlanView.render(planMount, { section: 'week' });
await settle(80);

// --- the Add button in a table cell must actually set the form up ---
// It shipped doing nothing at all on 6 Sep 2026: it focused the meal
// <select>, which had just become hidden and unfocusable, and it set the
// slot by assigning .value — which fires no change event, so the picker
// went on offering the previous meal time.
//
// Both faults are invisible to every other assertion here, because the
// button issues no write. What it does is arrange the form, so that is
// what gets checked.
{
  const cellAdd = [...planMount.querySelectorAll('button')]
    .find((b) => /^Add a meal to /.test(b.getAttribute('aria-label') || ''));
  check('a plan cell offers an Add button', !!cellAdd);
  if (cellAdd) {
    const wanted = (cellAdd.getAttribute('aria-label') || '').toLowerCase();
    // Start from a DIFFERENT meal time than the button names, or the
    // assertion below can pass without the button having done anything.
    // First written pre-setting 'breakfast' and then pressing a breakfast
    // cell, which proved only that breakfast equals breakfast.
    const other = wanted.includes('breakfast') ? 'dinner' : 'breakfast';
    setValue(planMount.querySelector('#plan-slot'), other);
    cellAdd.dispatchEvent(new window.Event('click', { bubbles: true }));
    await settle();

    // Since 6 Sep 2026 this opens the Choose a meal screen rather than
    // arranging a form in place. Two things must be true: it goes there,
    // and it takes the day and slot with it. Arriving at a chooser that has
    // forgotten which meal it is choosing for is the failure to guard.
    check('pressing Add opens the choosing screen',
      window.location.hash === '#/plan-choose',
      `hash was ${window.location.hash}`);

    // Read through the module, not through sessionStorage directly: the
    // draft falls back to memory where storage is unavailable, and a test
    // that only knows about one of the two would pass or fail for reasons
    // that have nothing to do with the button.
    const draftMod = await import(pathToFileURL(path.join(REPO, 'js/lib/planDraft.js')).href);
    const draft = draftMod.readDraft();
    check('pressing Add carries the day to the choosing screen',
      !!draft.day && wanted.includes(draft.day === 'thu' ? 'thursday' : draft.day),
      JSON.stringify(draft));
    check('pressing Add carries the meal time to the choosing screen',
      !!draft.slot && wanted.includes(draft.slot),
      JSON.stringify(draft));
    // 10 Sep 2026. The third thing that has to travel: which page is
    // waiting for the answer. Without it the chooser guesses, and between
    // 7 and 10 Sep it guessed the hub — a page with no form, which read the
    // choice and cleared it.
    check('pressing Add carries the page to come back to',
      draft.origin === 'week', JSON.stringify(draft));
  }
}

// --- add to plan, blank meal, refused ---
clearCalls();
const planForm = planMount.querySelector('#plan-meal').closest('form');
setValue(planMount.querySelector('#plan-meal'), '');
submit(planForm);
await settle();
check('adding to the plan with no meal chosen issues NO write', writes().length === 0);
check('and explains what to do', !planMount.querySelector('#plan-error').hidden);

// --- add to plan properly ---
clearCalls();
setValue(planMount.querySelector('#plan-day'), 'thu');
setValue(planMount.querySelector('#plan-slot'), 'dinner');

// 6 Sep 2026: choosing happens on its own screen, so this walks the real
// round trip — open the chooser, pick something, come back — rather than
// setting a <select> value no person can set.
//
// 10 Sep 2026: through the FORM'S OWN Choose button, which is what the rest
// of this block is about. A choice that began at a cell finishes by itself
// now and never reaches this form — that path is traced separately, at the
// foot of this file.
const formChoose = planMount.querySelector('.choose-meal-btn');
check('the form offers its own way into the chooser', !!formChoose);
if (formChoose) click(formChoose);
await settle(40);
{
  const d = (await import(pathToFileURL(path.join(REPO, 'js/lib/planDraft.js')).href)).readDraft();
  check('a choice begun at the form is marked as the form\'s',
    d.intent === 'form', JSON.stringify(d));
}

const chooseMount = window.document.createElement('main');
window.document.body.appendChild(chooseMount);
const chooseView = await import(pathToFileURL(path.join(REPO, 'js/views/planChoose.js')).href);
const cleanupChoose = chooseView.render(chooseMount, {});
await settle(80);

const pickable = [...chooseMount.querySelectorAll('.meal-picker__pick')];
check('the choosing screen offers something to choose', pickable.length > 0);
if (pickable.length) pickable[0].dispatchEvent(new window.Event('click', { bubbles: true }));
await settle();
if (typeof cleanupChoose === 'function') cleanupChoose();
chooseMount.remove();

const draftMod2 = await import(pathToFileURL(path.join(REPO, 'js/lib/planDraft.js')).href);
const afterChoice = draftMod2.readDraft();
check('choosing records the meal for the form to pick up', !!afterChoice.mealId,
  JSON.stringify(afterChoice));

// ---- FOLLOW THE APP, DO NOT ASSUME IT ------------------------------
// This block used to re-render section 'week' by hand and then assert the
// choice was there. That is why the gate stayed green for three days while
// the feature was broken on the device: it tested the page the test
// believed you land on, not the page the app actually sends you to.
//
// So the destination is read off the hash the app just set.
const landedOn = window.location.hash.replace('#/', '');
check('choosing sends you back to the page that asked',
  landedOn === 'plan-this-week', `landed on ${landedOn || '(nothing)'}`);
check('choosing never sends you to the plan hub',
  landedOn !== 'meal-plan',
  'the hub has no add form — a choice delivered there is a choice thrown away');

// And the hub, if it is ever rendered while a choice is in flight, must
// leave that choice alone. It has nowhere to put one.
{
  const hubMount = window.document.createElement('main');
  window.document.body.appendChild(hubMount);
  const cleanupHub = mealPlanView.render(hubMount, { section: 'hub' });
  await settle(60);
  const stillThere = draftMod2.readDraft();
  check('the plan hub does not swallow a meal chosen for a week page',
    stillThere.mealId === afterChoice.mealId,
    JSON.stringify(stillThere));
  if (typeof cleanupHub === 'function') cleanupHub();
  hubMount.remove();
}

// Back to the plan: the form must come up already knowing what was chosen.
const SECTION_FOR_PATH = { 'plan-today': 'today', 'plan-this-week': 'week', 'plan-next-week': 'next' };
if (typeof cleanupPlan === 'function') cleanupPlan();
planMount.replaceChildren();
const cleanupPlan2 = mealPlanView.render(planMount, { section: SECTION_FOR_PATH[landedOn] || 'hub' });
await settle(80);
check('returning to the plan shows the chosen meal',
  /Chosen: /.test(planMount.textContent),
  'the round trip must not lose the choice');

const planForm2 = planMount.querySelector('#plan-meal').closest('form');
clearCalls();
setValue(planMount.querySelector('#plan-day'), 'thu');
setValue(planMount.querySelector('#plan-slot'), 'dinner');
setValue(planMount.querySelector('#plan-serves-new'), '5');
submit(planForm2);
await settle();
w = writes().find((c) => c.table === 'weekly_meal_plan' && c.op === 'insert');
check('add to plan inserts into `weekly_meal_plan`', !!w, JSON.stringify(writes()));
check('the chosen day and slot are what get sent',
  w && w.payload.day_of_week === 'thu' && w.payload.slot === 'dinner', JSON.stringify(w && w.payload));
check('serves_override is sent as a number', w && w.payload.serves_override === 5);
// serves_override is per ENTRY. Touching meals.default_serves here would
// silently re-serve every other week the recipe appears in.
check('changing a planned serving never writes to `meals`',
  !writes().some((c) => c.table === 'meals'), JSON.stringify(writes()));

// --- moving a planned meal to another day and week ---
// Added 8 Sep 2026 with the Move control. Until then the only way to move a
// meal was remove-and-re-add, which loses the servings override and who it
// was for — so a move MUST be one update, not a delete and an insert.
{
  const moveBtn = [...planMount.querySelectorAll('button')]
    .find((b) => /^Move /.test(b.getAttribute('aria-label') || ''));
  check('a planned meal can be moved', !!moveBtn);

  if (moveBtn) {
    moveBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    await settle();

    // The sheet that contains the move controls, not merely the first one
    // on the page: an earlier trace leaves a pantry sheet open, and
    // querySelector found that instead — reporting the move sheet as
    // present while reading a completely different dialog.
    const sheet = [...window.document.querySelectorAll('.sheet')]
      .find((node) => node.querySelector('#move-week'));
    check('moving opens a sheet with somewhere to move to', !!sheet);

    if (sheet) {
      setValue(sheet.querySelector('#move-week'), '2026-09-14');
      setValue(sheet.querySelector('#move-day'), 'fri');
      setValue(sheet.querySelector('#move-slot'), 'lunch');

      clearCalls();
      const go = [...sheet.querySelectorAll('button')]
        .find((b) => /move it/i.test(b.textContent));
      check('the sheet offers a way to confirm', !!go);
      if (go) go.dispatchEvent(new window.Event('click', { bubbles: true }));
      await settle();

      const w = writes().find((c) => c.table === 'weekly_meal_plan');
      check('moving updates rather than deleting and re-inserting',
        !!w && w.op === 'update',
        JSON.stringify(writes()));
      check('the move carries the week, the day and the meal time',
        !!w && w.payload && w.payload.week_start === '2026-09-14'
        && w.payload.day_of_week === 'fri' && w.payload.slot === 'lunch',
        JSON.stringify(w && w.payload));
      check('and nothing was deleted',
        !writes().some((c) => c.op === 'delete'),
        JSON.stringify(writes()));
    }
  }
}

// --- a plan cell Add button targets the right cell ---
// P7: cells became slot rows inside a card per day.
const cellBtn = [...planMount.querySelectorAll('.plan-slot button')]
  .find((b) => (b.getAttribute('aria-label') || '').includes('Wednesday lunch'));
check('a plan cell Add button exists for Wednesday lunch', !!cellBtn);
if (cellBtn) {
  click(cellBtn);
  await settle(20);
  check('pressing it preselects that day and slot in the form',
    planMount.querySelector('#plan-day').value === 'wed'
    && planMount.querySelector('#plan-slot').value === 'lunch',
    `${planMount.querySelector('#plan-day').value}/${planMount.querySelector('#plan-slot').value}`);
}
if (typeof cleanupPlan === 'function') cleanupPlan();

// =====================================================================
// RECIPE LIBRARY — favourites have somewhere to show up
// =====================================================================
// 10 Sep 2026. Revision 25 shipped a heart and a note box with no filter
// and no marker, so a favourite was a tap that went nowhere. These check
// the way OUT of a favourite, not the way in.
console.log('\nRecipe library — favourites');
{
  const libMount = window.document.createElement('main');
  window.document.body.appendChild(libMount);
  const libView = await import(pathToFileURL(path.join(REPO, 'js/views/library.js')).href);
  const cleanupLib = libView.render(libMount);
  await settle(200);

  const rows = [...libMount.querySelectorAll('.library-row')];
  check('the library actually lists recipes in the gate', rows.length > 10,
    `${rows.length} rows`);

  const favChip = [...libMount.querySelectorAll('.library-chips .chip-toggle')][0];
  check('the library offers a favourites filter', !!favChip);
  check('and says how many there are', favChip && /\(2\)/.test(favChip.textContent),
    favChip && favChip.textContent);
  check('a favourited recipe is marked in the list',
    /♥ Favourite/.test(libMount.textContent));
  check('and your own note is on the row, not one tap away',
    /Topped with frozen fruit/.test(libMount.textContent));

  if (favChip) {
    click(favChip);
    await settle(40);
    const narrowed = [...libMount.querySelectorAll('.library-row')];
    check('pressing it narrows the list to the favourites',
      narrowed.length === 2, `${narrowed.length} rows left`);
    const narrowedText = narrowed.map((n) => n.textContent).join(' | ');
    check('and what is left is what was favourited',
      /Overnight oats/.test(narrowedText) && /Banana pancakes/.test(narrowedText),
      narrowedText.slice(0, 80));
    check('the chip reports itself pressed',
      favChip.getAttribute('aria-pressed') === 'true');
  }

  if (typeof cleanupLib === 'function') cleanupLib();
  libMount.remove();
}

// =====================================================================
// CHOOSING A MEAL — favourites, from both sources at once
// =====================================================================
// 10 Sep 2026. Device test: "no way to find favourites for meal choices".
// The hard part is that a favourite lives in one of two tables depending on
// whether you have imported the recipe yet, so a chip that reads only one
// of them looks like it works and hides half the answer.
console.log('\nChoosing a meal — favourites');
{
  const pickMount = window.document.createElement('main');
  window.document.body.appendChild(pickMount);
  const chooseView2 = await import(pathToFileURL(path.join(REPO, 'js/views/planChoose.js')).href);
  const cleanupPick = chooseView2.render(pickMount);
  await settle(220);

  // The chooser opens filtered to the meal time it was called for, which is
  // dinner by the time this block runs. Widened deliberately: the favourite
  // in the fixture is a breakfast, and a check that quietly relied on the
  // slot filter would be testing the slot filter.
  setValue(pickMount.querySelector('#meal-picker-slot'), '');
  await settle(40);

  const chips = [...pickMount.querySelectorAll('.meal-picker__chips .chip-toggle')];
  const pickFav = chips.find((c) => /^Favourites/.test(c.textContent));
  check('the chooser offers a favourites filter', !!pickFav);
  // Two, from two different tables: one library recipe not yet imported,
  // one already imported and hearted in the library rather than in meals.
  check('and counts favourites from BOTH tables',
    pickFav && /\(2\)/.test(pickFav.textContent), pickFav && pickFav.textContent);
  check('a favourite is marked in the list of things to choose from',
    /♥ Favourite/.test(pickMount.textContent));

  if (pickFav) {
    click(pickFav);
    await settle(60);
    const left = [...pickMount.querySelectorAll('.meal-picker__pick')];
    check('pressing it narrows the choices to favourites',
      left.length === 2, `${left.length} left`);
    const leftText = left.map((n) => n.textContent).join(' | ');
    check('the library favourite is there', /Overnight oats/.test(leftText), leftText.slice(0, 80));
    check('and so is the one you already imported and hearted in the library',
      /Banana pancakes/.test(leftText), leftText.slice(0, 80));
    // Switched on with nothing behind it, the way out must stay pressable.
    check('the filter can always be switched off again', !pickFav.disabled);
  }

  // "Breakfast · Breakfast · serves 2" was true twice over and useless the
  // second time: the breakfast file records its cuisine as "Breakfast".
  check('a library row never prints its meal time twice',
    !/Breakfast · Breakfast/.test(pickMount.textContent));

  if (typeof cleanupPick === 'function') cleanupPick();
  pickMount.remove();
}

// =====================================================================
// TODAY -> CHOOSE -> TODAY, the way the Kitchen actually goes
// =====================================================================
// Device test, 10 Sep 2026 (second pass): Kitchen -> Today's meals -> Add
// breakfast -> filter to favourites -> pick -> "it doesn't go into my meal
// selector". The week page was proved above; this is the OTHER door, and
// the Kitchen card points at it.
console.log('\nToday -> choose -> today');
{
  const todayMount = window.document.createElement('main');
  window.document.body.appendChild(todayMount);
  const cleanupToday = mealPlanView.render(todayMount, { section: 'today' });
  await settle(160);

  const addBtn = [...todayMount.querySelectorAll('button')]
    .find((b) => /^Add a meal to .*breakfast$/i.test(b.getAttribute('aria-label') || ''));
  let todayDay = '';
  check('today offers an Add for breakfast', !!addBtn,
    [...todayMount.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join(' / '));
  if (addBtn) {
    click(addBtn);
    await settle(40);
    const d = (await import(pathToFileURL(path.join(REPO, 'js/lib/planDraft.js')).href)).readDraft();
    check('today tells the chooser to come back to today', d.origin === 'today', JSON.stringify(d));
    check('and that the errand began at a cell, not at the form',
      d.intent === 'cell', JSON.stringify(d));
    todayDay = d.day;

    const cm = window.document.createElement('main');
    window.document.body.appendChild(cm);
    const cv = await import(pathToFileURL(path.join(REPO, 'js/views/planChoose.js')).href);
    const cc = cv.render(cm);
    await settle(220);

    const fav = [...cm.querySelectorAll('.meal-picker__chips .chip-toggle')]
      .find((c) => /^Favourites/.test(c.textContent));
    if (fav && !fav.disabled) { click(fav); await settle(60); }
    const picks = [...cm.querySelectorAll('.meal-picker__pick')];
    check('a favourite is offered for today\'s breakfast', picks.length > 0,
      `${picks.length} offered`);
    if (picks.length) { click(picks[0]); await settle(80); }
    if (typeof cc === 'function') cc();
    cm.remove();

    check('choosing from today comes back to today',
      window.location.hash === '#/plan-today', window.location.hash);

    if (typeof cleanupToday === 'function') cleanupToday();
    todayMount.replaceChildren();
    clearCalls();
    const cleanupToday2 = mealPlanView.render(todayMount, { section: 'today' });
    await settle(220);

    // ---- The errand FINISHES ------------------------------------------
    // Pressing Add on a cell states the day and the slot; choosing states
    // the meal. Parking all three in a form and waiting for a submit button
    // below the fold is a third action for one errand, and the device test
    // of 10 Sep found it exactly there.
    const planned = writes().find((c) => c.table === 'weekly_meal_plan' && c.op === 'insert');
    check('choosing from a cell writes the meal into the plan by itself',
      !!planned, JSON.stringify(writes()));
    check('and into the cell that was pressed',
      planned && planned.payload.day_of_week === todayDay && planned.payload.slot === 'breakfast',
      JSON.stringify(planned && planned.payload));
    check('the form is left empty rather than holding a choice already saved',
      /No meal chosen yet/.test(todayMount.textContent));
    if (typeof cleanupToday2 === 'function') cleanupToday2();
  }
  todayMount.remove();
}

// ---- The report goes LAST ----
// It used to sit above the weekly-plan block, which meant those checks ran
// after the gate had already declared itself passed: a failure there would
// have printed FAIL and still exited 0.
console.log('');
if (fails.length) {
  console.log(`INTERACTION TRACE FAILED — ${fails.length} of ${pass + fails.length}`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`INTERACTION TRACE PASSED — ${pass}/${pass} interactions, every write inspected`);
