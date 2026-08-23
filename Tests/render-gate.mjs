// Pre-commit render gate (standing rule 12).
// `node --check` proves syntax, not that a module runs — it passed a
// ReferenceError straight to production on 18 Aug. This executes each view
// top to bottom in jsdom against a stubbed Supabase client, which is what
// actually surfaces that class of bug.

import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || '/home/claude/repo';

const dom = new JSDOM('<!doctype html><html><body><main id="app-main"></main></body></html>', {
  url: 'https://example.github.io/Home-OS/#/meals',
  pretendToBeVisual: true
});

const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.CustomEvent = window.CustomEvent;
global.Event = window.Event;
global.AbortController = window.AbortController || AbortController;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.indexedDB = undefined;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

// --- Stubbed Supabase client -------------------------------------------
// A thenable query builder: every chained method returns itself, and
// awaiting it yields { data, error } exactly as supabase-js does (it
// RESOLVES on errors rather than rejecting — the trap this project has hit).
const CHAIN = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'order', 'limit', 'range', 'match', 'is', 'in', 'not', 'or', 'filter', 'contains', 'like', 'ilike'];

function fixtureFor(table) {
  switch (table) {
    case 'foods':
      return [
        { id: 'food-1', name: 'Rolled oats', barcode: '5000159407236', calories_per_100g: 379, protein_g: 13.2, fat_g: 8.1, carbs_g: 60.1, source: 'openfoodfacts', category: 'food_ambient' },
        { id: 'food-2', name: 'Home-made stock', barcode: null, calories_per_100g: null, protein_g: null, fat_g: null, carbs_g: null, source: 'manual', category: 'personal' }
      ];
    case 'meals':
      return [{ id: 'meal-1', name: 'Porridge', default_serves: 2 }];
    case 'meal_ingredients':
      return [
        { id: 'ing-1', meal_id: 'meal-1', food_id: 'food-1', quantity_g: 80, unit: 'g', foods: fixtureFor('foods')[0] },
        { id: 'ing-2', meal_id: 'meal-1', food_id: 'food-2', quantity_g: 200, unit: 'ml', foods: fixtureFor('foods')[1] }
      ];
    case 'holidays':
      return [{ id: 'hol-1', title: 'Cornwall', start_date: '2026-09-05', end_date: '2026-09-12' }];
    case 'holiday_checklist_items':
      return [
        { id: 'chk-1', holiday_id: 'hol-1', title: 'Passports', status: 'complete' },
        { id: 'chk-2', holiday_id: 'hol-1', title: 'Chargers', status: 'pending' }
      ];
    case 'holiday_purchase_items':
      return [{ id: 'buy-1', holiday_id: 'hol-1', title: 'Sun cream', status: 'pending', send_to_shopping: true }];
    case 'calendar_events':
      return [
        { id: 'ev-1', event_type: 'work_location', source_id: null, title: 'Office',
          start_date: '2026-08-24', recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH',
          location_label: 'Head office' },
        { id: 'ev-2', event_type: 'holiday', source_id: 'hol-1', title: 'Cornwall',
          start_date: '2026-09-05', recurrence_rule: null, location_label: null }
      ];
    case 'weekly_meal_plan':
      return [{
        id: 'plan-1', day_of_week: 'mon', slot: 'breakfast', serves_override: 3,
        meal_id: 'meal-1', meals: { id: 'meal-1', name: 'Porridge', default_serves: 2 }
      }];
    default:
      return [];
  }
}

function makeBuilder(table) {
  const state = { single: false, head: false };
  const builder = {};
  for (const m of CHAIN) {
    builder[m] = (...args) => {
      if (m === 'select' && args[1] && args[1].head) state.head = true;
      return builder;
    };
  }
  builder.single = () => { state.single = true; return builder; };
  builder.maybeSingle = () => { state.single = true; return builder; };
  builder.then = (resolve) => {
    const rows = fixtureFor(table);
    if (state.head) return Promise.resolve({ count: rows.length, error: null }).then(resolve);
    const data = state.single ? (rows[0] || { id: 'new-row', name: 'New', default_serves: 4, quantity_g: 1 }) : rows;
    return Promise.resolve({ data, error: null, count: rows.length }).then(resolve);
  };
  builder.catch = () => builder;
  builder.finally = (fn) => { fn && fn(); return builder; };
  return builder;
}

const supabaseStub = {
  from: (table) => makeBuilder(table),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getUser: async () => ({ data: { user: { id: 'u1' } }, error: null })
  }
};

// The stub is injected by swapping js/supabaseClient.js in a shadow copy of
// the repo (see run-gate.sh) rather than by monkey-patching the loader, so
// every view imports it through its real import path and nothing about the
// module graph is faked.
globalThis.__HOME_OS_SUPABASE_STUB__ = supabaseStub;

// jsdom has no camera and no network; make both fail the way a browser would.
global.fetch = async () => { throw new Error('no network in the gate'); };
window.fetch = global.fetch;

// --- Run every view ----------------------------------------------------
// Route views: must export render(mountEl) and produce an <h1>, because
// router.js focuses that heading after every render.
const VIEWS = [
  'dashboard', 'exercises', 'chores', 'weight', 'water',
  'meals', 'pantry', 'shopping', 'holidays', 'settings'
];

// signin.js is NOT a route — app.js mounts it directly — so it exports
// builders rather than render(). It is still executed here: the 18 Aug
// ReferenceError was in exactly this kind of non-route code path.
const BUILDER_MODULES = [
  { file: 'signin', builders: ['buildSignInView', 'buildSetPasswordView'] }
];

const errors = [];
process.on('unhandledRejection', (err) => {
  errors.push(`UNHANDLED REJECTION: ${err && err.message}`);
  console.log('  UNHANDLED REJECTION:', err && err.message);
});
const originalError = console.error;

for (const name of VIEWS) {
  const file = path.join(REPO, 'js/views', `${name}.js`);
  const url = pathToFileURL(file).href + `?t=${Date.now()}`;
  const mount = window.document.createElement('main');
  window.document.body.appendChild(mount);
  try {
    const mod = await import(url);
    if (typeof mod.render !== 'function') {
      errors.push(`${name}.js: no render() export`);
      continue;
    }
    const cleanup = mod.render(mount, {});
    // Let the load() IIFEs settle so async paths execute too.
    await new Promise((r) => setTimeout(r, 60));
    const nodes = mount.querySelectorAll('*').length;
    const h1 = mount.querySelector('h1');
    if (!h1) errors.push(`${name}.js: rendered no <h1> (router focuses it on every route change)`);
    if (typeof cleanup === 'function') cleanup();
    console.log(`  PASS  ${name.padEnd(10)} ${String(nodes).padStart(4)} nodes  h1="${h1 ? h1.textContent : '-'}"`);
  } catch (err) {
    errors.push(`${name}.js: ${err && err.constructor ? err.constructor.name : 'Error'}: ${err && err.message}`);
    console.log(`  FAIL  ${name}`);
    originalError(err);
  } finally {
    mount.remove();
  }
}

for (const { file, builders } of BUILDER_MODULES) {
  const url = pathToFileURL(path.join(REPO, 'js/views', `${file}.js`)).href + `?t=${Date.now()}`;
  try {
    const mod = await import(url);
    for (const name of builders) {
      if (typeof mod[name] !== 'function') { errors.push(`${file}.js: no ${name}() export`); continue; }
      // These builders paint straight into document.body and return
      // nothing — app.js mounts them, not the router. So the assertion is
      // "did it produce a screen", not "did it return a node".
      mod[name]();
      const nodes = window.document.body.querySelectorAll('*').length;
      const h1 = window.document.body.querySelector('h1');
      console.log(`  PASS  ${(file + '.' + name).padEnd(28)} ${String(nodes).padStart(4)} nodes  h1="${h1 ? h1.textContent : '-'}"`);
      if (!h1) errors.push(`${file}.js: ${name}() rendered no <h1>`);
    }
  } catch (err) {
    errors.push(`${file}.js: ${err && err.constructor ? err.constructor.name : 'Error'}: ${err && err.message}`);
    console.log(`  FAIL  ${file}`);
    originalError(err);
  }
}

console.log('');
if (errors.length) {
  console.log('RENDER GATE FAILED:');
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log(`RENDER GATE PASSED — ${VIEWS.length} route views + signin builders executed in jsdom, no runtime errors`);
