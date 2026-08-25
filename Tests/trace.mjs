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
import { pathToFileURL } from 'node:url';

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
global.fetch = async () => { throw new Error('no network in the trace'); };
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

const CHAIN = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'order', 'limit', 'range', 'match'];

function fixture(t) {
  if (t === 'foods') return [
    { id: 'food-1', name: 'Rolled oats', barcode: '5000159407236', calories_per_100g: 379, protein_g: 13.2, fat_g: 8.1, carbs_g: 60.1, source: 'openfoodfacts', category: 'food_ambient' },
    { id: 'food-2', name: 'Home-made stock', barcode: null, calories_per_100g: null, protein_g: null, fat_g: null, carbs_g: null, source: 'manual', category: 'personal' }];
  if (t === 'meals') return [{ id: 'meal-1', name: 'Porridge', default_serves: 2 }];
  if (t === 'meal_ingredients') return [
    { id: 'ing-1', meal_id: 'meal-1', food_id: 'food-1', quantity_g: 80, unit: 'g', foods: fixture('foods')[0] }];
  if (t === 'weekly_meal_plan') return [{ id: 'plan-1', day_of_week: 'mon', slot: 'breakfast', serves_override: 3, meal_id: 'meal-1', meals: { id: 'meal-1', name: 'Porridge', default_serves: 2 } }];
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

// --- every button and input is wired ---
const mealButtons = [...mealsMount.querySelectorAll('button')];
const mealForms = [...mealsMount.querySelectorAll('form')];
check(`meals: ${mealButtons.length} buttons and ${mealForms.length} forms rendered`,
  mealButtons.length > 0 && mealForms.length > 0);

// --- add a meal ---
clearCalls();
setValue(mealsMount.querySelector('#new-meal-name'), 'Trace stew');
setValue(mealsMount.querySelector('#new-meal-serves'), '3');
submit(mealsMount.querySelector('#new-meal-name').closest('form'));
await settle();
let w = lastWrite();
check('add meal issues an insert on `meals`', w && w.table === 'meals' && w.op === 'insert', JSON.stringify(w));
check('add meal sends name and default_serves only',
  w && JSON.stringify(Object.keys(w.payload).sort()) === '["default_serves","name"]', JSON.stringify(w && w.payload));
check('default_serves is sent as a NUMBER, not a string',
  w && typeof w.payload.default_serves === 'number', typeof (w && w.payload.default_serves));
check('no user_id is ever sent (RLS supplies it)', !w || !('user_id' in w.payload));

// --- add a meal with a blank name is refused before any write ---
clearCalls();
setValue(mealsMount.querySelector('#new-meal-name'), '   ');
submit(mealsMount.querySelector('#new-meal-name').closest('form'));
await settle();
check('a blank meal name issues NO write', writes().length === 0, JSON.stringify(writes()));
check('and shows an error the user can read',
  !mealsMount.querySelector('#new-meal-error').hidden);

// --- add to plan, blank meal, refused ---
clearCalls();
const planForm = mealsMount.querySelector('#plan-meal').closest('form');
setValue(mealsMount.querySelector('#plan-meal'), '');
submit(planForm);
await settle();
check('adding to the plan with no meal chosen issues NO write', writes().length === 0);
check('and explains what to do', !mealsMount.querySelector('#plan-error').hidden);

// --- add to plan properly ---
clearCalls();
setValue(mealsMount.querySelector('#plan-day'), 'thu');
setValue(mealsMount.querySelector('#plan-slot'), 'dinner');
setValue(mealsMount.querySelector('#plan-meal'), 'meal-1');
setValue(mealsMount.querySelector('#plan-serves-new'), '5');
submit(planForm);
await settle();
w = writes().find((c) => c.table === 'weekly_meal_plan' && c.op === 'insert');
check('add to plan inserts into `weekly_meal_plan`', !!w, JSON.stringify(writes()));
check('the chosen day and slot are what get sent',
  w && w.payload.day_of_week === 'thu' && w.payload.slot === 'dinner', JSON.stringify(w && w.payload));
check('serves_override is sent as a number', w && w.payload.serves_override === 5);

// --- a plan cell Add button targets the right cell ---
const cellBtn = [...mealsMount.querySelectorAll('.plan-table td button')]
  .find((b) => (b.getAttribute('aria-label') || '').includes('Wednesday lunch'));
check('a plan cell Add button exists for Wednesday lunch', !!cellBtn);
if (cellBtn) {
  click(cellBtn);
  await settle(20);
  check('pressing it preselects that day and slot in the form',
    mealsMount.querySelector('#plan-day').value === 'wed'
    && mealsMount.querySelector('#plan-slot').value === 'lunch',
    `${mealsMount.querySelector('#plan-day').value}/${mealsMount.querySelector('#plan-slot').value}`);
}

// --- barcode validation stops a silent null ---
clearCalls();
mealsMount.querySelector('#new-food-name').value = 'Trace food';
mealsMount.querySelector('#new-food-barcode').value = '12345';
submit(mealsMount.querySelector('#new-food-name').closest('form'));
await settle();
check('an unusable typed barcode issues NO write', writes().length === 0, JSON.stringify(writes()));
check('and says so rather than dropping it silently',
  !mealsMount.querySelector('#new-food-error').hidden
  && /barcode/i.test(mealsMount.querySelector('#new-food-error').textContent));

// --- a valid food saves, normalised ---
clearCalls();
mealsMount.querySelector('#new-food-name').value = 'Trace food';
mealsMount.querySelector('#new-food-barcode').value = '123456789050'; // UPC-A, 12 digits
setValue(mealsMount.querySelector('#new-food-calories'), '250');
submit(mealsMount.querySelector('#new-food-name').closest('form'));
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
const foodFormEl = mealsMount.querySelector('#new-food-name').closest('form');
const catSelect = mealsMount.querySelector('#new-food-category');
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

  mealsMount.querySelector('#new-food-name').value = 'Scanned shampoo';
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
const foodDelete = [...mealsMount.querySelectorAll('.food-card button')]
  .find((b) => /^Delete /.test(b.textContent));
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

cleanupMeals();
await settle(20);
mealsMount.replaceChildren();

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
clearCalls();
const toggle = holMount.querySelector('.check-toggle');
const beforeLabel = toggle.textContent;
const beforePressed = toggle.getAttribute('aria-pressed');
click(toggle);
await settle(10); // inside the write window, which is 40ms in this stub
const midToggle = holMount.querySelector('.check-toggle');
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
const toggle2 = holMount.querySelector('.check-toggle');
const labelBefore = toggle2.textContent;
failNextWrite = true;
click(toggle2);
await settle(200);
const after = holMount.querySelector('.check-toggle');
check('a FAILED tick rolls the UI back rather than lying',
  after.textContent === labelBefore, `${labelBefore} -> ${after.textContent}`);

// --- work location: weekly pattern ---
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
clearCalls();
const shopBox = holMount.querySelector('.send-shopping input[type="checkbox"]');
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
const holDelete = [...holMount.querySelectorAll('.holiday-card button')]
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

console.log('');
if (fails.length) {
  console.log(`INTERACTION TRACE FAILED — ${fails.length} of ${pass + fails.length}`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`INTERACTION TRACE PASSED — ${pass}/${pass} interactions, every write inspected`);
