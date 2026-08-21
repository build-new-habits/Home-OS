// Structural accessibility checks against the ACTUAL rendered meals DOM,
// not against the source. Catches the things a source read misses: an
// input whose label points at nothing, a th without scope, a button with
// no accessible name.
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || '/tmp/gate-repo';
const dom = new JSDOM('<!doctype html><html><body><main id="app-main"></main></body></html>', {
  url: 'https://example.github.io/Home-OS/#/meals', pretendToBeVisual: true
});
const { window } = dom;
global.window = window; global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
global.CSS = window.CSS || { escape: (v) => String(v).replace(/([^\w-])/g, '\\\\$1') };
global.AbortController = window.AbortController;
global.AbortSignal = window.AbortSignal;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.fetch = async () => { throw new Error('no network'); };
window.fetch = global.fetch;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const CHAIN = ['select','insert','update','delete','upsert','eq','neq','gt','gte','lt','lte','order','limit','range','match','is','in'];
function fixture(t) {
  if (t === 'foods') return [{ id:'food-1', name:'Rolled oats', barcode:'5000159407236', calories_per_100g:379, protein_g:13.2, fat_g:8.1, carbs_g:60.1, source:'openfoodfacts' },
                             { id:'food-2', name:'Home-made stock', barcode:null, calories_per_100g:null, protein_g:null, fat_g:null, carbs_g:null, source:'manual' }];
  if (t === 'meals') return [{ id:'meal-1', name:'Porridge', default_serves:2 }];
  if (t === 'meal_ingredients') return [{ id:'ing-1', meal_id:'meal-1', food_id:'food-1', quantity_g:80, foods:fixture('foods')[0] },
                                        { id:'ing-2', meal_id:'meal-1', food_id:'food-2', quantity_g:200, foods:fixture('foods')[1] }];
  if (t === 'weekly_meal_plan') return [{ id:'plan-1', day_of_week:'mon', slot:'breakfast', serves_override:3, meal_id:'meal-1', meals:{ id:'meal-1', name:'Porridge', default_serves:2 } }];
  return [];
}
function builder(t) { const st={}; const b={}; for (const m of CHAIN) b[m]=(...a)=>{ if(m==='select'&&a[1]&&a[1].head) st.head=true; return b; };
  b.single=()=>{st.single=true;return b;}; b.maybeSingle=b.single;
  b.then=(res)=>{ const rows=fixture(t); if(st.head) return Promise.resolve({count:rows.length,error:null}).then(res);
    return Promise.resolve({ data: st.single ? rows[0] : rows, error:null, count:rows.length }).then(res); };
  return b; }
globalThis.__HOME_OS_SUPABASE_STUB__ = { from: builder, auth: {} };

const mount = window.document.getElementById('app-main');
const mod = await import(pathToFileURL(path.join(REPO, 'js/views/meals.js')).href);
mod.render(mount, {});
await new Promise((r) => setTimeout(r, 80));

let pass = 0; const fails = [];
const check = (n, c, d='') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fails.push(`${n}${d?' — '+d:''}`); console.log(`  FAIL  ${n}  ${d}`); } };

// ---- Every form control has a real, resolvable label ----
const controls = [...mount.querySelectorAll('input, select, textarea')];
const unlabelled = controls.filter((c) => {
  if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
  if (!c.id) return true;
  return !mount.querySelector(`label[for="${CSS.escape(c.id)}"]`);
});
check(`all ${controls.length} form controls have a resolvable label`, unlabelled.length === 0,
  unlabelled.map((c) => c.id || c.type).join(', '));

// ---- No duplicate ids (a duplicate silently breaks label association) ----
const ids = [...mount.querySelectorAll('[id]')].map((n) => n.id);
const dupes = [...new Set(ids.filter((i, n) => ids.indexOf(i) !== n))];
check('no duplicate element ids', dupes.length === 0, dupes.join(', '));

// ---- Every aria-describedby points at something that exists ----
const badDesc = [...mount.querySelectorAll('[aria-describedby]')]
  .flatMap((n) => n.getAttribute('aria-describedby').split(/\s+/))
  .filter((id) => id && !mount.querySelector(`#${CSS.escape(id)}`));
check('every aria-describedby target exists', badDesc.length === 0, badDesc.join(', '));

// ---- Every button has an accessible name ----
const buttons = [...mount.querySelectorAll('button')];
const nameless = buttons.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim()));
check(`all ${buttons.length} buttons have an accessible name`, nameless.length === 0);

// ---- The plan is a real table with scoped headers ----
const planTable = mount.querySelector('.plan-table');
check('the weekly plan is a real <table>', !!planTable && planTable.tagName === 'TABLE');
check('the plan table has a caption', !!planTable.querySelector('caption'));
const ths = [...planTable.querySelectorAll('th')];
check(`all ${ths.length} plan headers carry scope`, ths.every((t) => t.getAttribute('scope')));
check('slots are column headers', planTable.querySelectorAll('thead th[scope="col"]').length === 5);
check('all 7 days are row headers', planTable.querySelectorAll('tbody th[scope="row"]').length === 7);
check('the grid is 7 days x 4 slots', planTable.querySelectorAll('tbody tr').length === 7
  && planTable.querySelectorAll('tbody tr')[0].querySelectorAll('td').length === 4);

// ---- Cell buttons name day AND slot, not just "Add" ----
const addBtns = [...planTable.querySelectorAll('td button')].filter((b) => b.textContent.trim() === 'Add');
check('every cell has an Add button', addBtns.length === 28, `found ${addBtns.length}`);
check('Add buttons name both the day and the meal time',
  addBtns.every((b) => { const l = (b.getAttribute('aria-label') || '').toLowerCase();
    return l.includes('add a meal to') && /monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(l)
      && /breakfast|lunch|dinner|snack/.test(l); }));

// ---- The scroll region is reachable and named ----
const scroll = mount.querySelector('.plan-scroll');
check('the scrollable plan region is keyboard reachable', scroll && scroll.getAttribute('tabindex') === '0');
check('the scrollable plan region is named', scroll && !!scroll.getAttribute('aria-label'));

// ---- Macro figures carry units as text ----
const macroTable = mount.querySelector('.meal-card .data-table');
check('meal macros are a real table with a caption', !!macroTable && !!macroTable.querySelector('caption'));
const macroRowHeaders = [...macroTable.querySelectorAll('tbody th')];
check('each nutrient is a scoped row header', macroRowHeaders.length === 4 && macroRowHeaders.every((t) => t.getAttribute('scope') === 'row'));
const macroCells = [...macroTable.querySelectorAll('tbody td')].map((t) => t.textContent);
check('every macro figure states a unit or says it is not known',
  macroCells.every((t) => /\b(kcal|g)\b/.test(t) || t === 'not known'), macroCells.join(' | '));
// The fixture deliberately includes a food with no nutrition data.
check('the incomplete ingredient count is stated in words',
  /1 of 2 ingredients? (has|have) no nutrition data/.test(mount.textContent), '');
check('the incomplete ingredient is named', mount.textContent.includes('Home-made stock'));

// ---- No colour-only meaning: the empty cell says so in text ----
check('empty plan cells say "Nothing planned" in text',
  mount.querySelectorAll('.plan-empty').length === 27, `found ${mount.querySelectorAll('.plan-empty').length}`);

// ---- Headings are ordered ----
const levels = [...mount.querySelectorAll('h1,h2,h3')].map((h) => Number(h.tagName[1]));
let ordered = true;
for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) ordered = false;
check('heading levels never skip a level', ordered, levels.join(','));
check('exactly one h1', mount.querySelectorAll('h1').length === 1);

console.log('');
if (fails.length) { console.log(`A11Y STRUCTURE FAILED — ${fails.length}`); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log(`A11Y STRUCTURE PASSED — ${pass}/${pass} checks on the rendered DOM`);
