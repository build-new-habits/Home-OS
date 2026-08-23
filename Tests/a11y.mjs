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
  if (t === 'foods') return [{ id:'food-1', name:'Rolled oats', barcode:'5000159407236', calories_per_100g:379, protein_g:13.2, fat_g:8.1, carbs_g:60.1, source:'openfoodfacts', category:'food_ambient' },
                             { id:'food-2', name:'Home-made stock', barcode:null, calories_per_100g:null, protein_g:null, fat_g:null, carbs_g:null, source:'manual', category:'personal' }];
  if (t === 'meals') return [{ id:'meal-1', name:'Porridge', default_serves:2 }];
  if (t === 'meal_ingredients') return [{ id:'ing-1', meal_id:'meal-1', food_id:'food-1', quantity_g:80, unit:'g', foods:fixture('foods')[0] },
                                        { id:'ing-2', meal_id:'meal-1', food_id:'food-2', quantity_g:200, unit:'ml', foods:fixture('foods')[1] }];
  if (t === 'weekly_meal_plan') return [{ id:'plan-1', day_of_week:'mon', slot:'breakfast', serves_override:3, meal_id:'meal-1', meals:{ id:'meal-1', name:'Porridge', default_serves:2 } }];
  if (t === 'holidays') return [{ id:'hol-1', title:'Cornwall', start_date:'2026-09-05', end_date:'2026-09-12' }];
  if (t === 'holiday_checklist_items') return [
    { id:'chk-1', holiday_id:'hol-1', title:'Passports', status:'complete' },
    { id:'chk-2', holiday_id:'hol-1', title:'Chargers', status:'pending' }];
  if (t === 'holiday_purchase_items') return [{ id:'buy-1', holiday_id:'hol-1', title:'Sun cream', status:'pending', send_to_shopping:true }];
  if (t === 'calendar_events') return [{ id:'ev-1', event_type:'work_location', source_id:null, title:'Office', start_date:'2026-08-24', recurrence_rule:'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH', location_label:'Head office' }];
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


// ---- Number inputs must accept ordinary numbers ------------------------
// HTML constraint validation requires (value - min) % step === 0. So
// min="0.1" with step="1" permits ONLY 0.1, 1.1, 2.1 ... and a browser
// rejects 100 with "the two nearest valid values are 99.1 and 100.1".
// Every round number becomes unenterable.
//
// This shipped, and none of the other gates could catch it: jsdom does not
// run constraint validation, and the interaction trace sets values directly
// and calls submit(), bypassing it entirely. So it is checked structurally.
function checkNumberInputs(root, label) {
  const inputs = [...root.querySelectorAll('input[type="number"]')];
  const broken = [];
  for (const input of inputs) {
    const step = input.getAttribute('step');
    if (!step || step === 'any') continue;
    const stepNum = Number(step);
    if (!Number.isFinite(stepNum) || stepNum <= 0) { broken.push(`${input.id}: step="${step}"`); continue; }
    const min = Number(input.getAttribute('min') ?? 0);
    const base = Number.isFinite(min) ? min : 0;
    // Can the user type ANY ordinary round number?
    const candidates = [1, 2, 3, 5, 10, 25, 50, 100, 200, 250, 500, 1000];
    const usable = candidates.some((v) => {
      if (v < base) return false;
      const steps = (v - base) / stepNum;
      return Math.abs(steps - Math.round(steps)) < 1e-9;
    });
    if (!usable) broken.push(`${input.id || input.name}: min="${input.getAttribute('min')}" step="${step}"`);
  }
  check(`${label}: every number input accepts ordinary round numbers`,
    broken.length === 0, broken.join(' | '));
}

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

checkNumberInputs(mount, 'meals');

// ---- The ingredient picker must scale, and must exclude non-food --------
// A real kitchen has hundreds of ingredients; a flat <select> of hundreds is
// unusable one-handed. And the whole point of foods.category is that shower
// gel is never offered mid-recipe.
const picker = mount.querySelector('.food-picker');
check('the ingredient picker has a type-ahead box', !!picker && !!picker.querySelector('input[type="search"]'));
check('the search box is labelled', !!picker && !!mount.querySelector(`label[for="${CSS.escape(picker.querySelector('input[type="search"]').id)}"]`));
check('the match count is announced politely',
  !!picker && picker.querySelector('[role="status"]')
  && picker.querySelector('[role="status"]').getAttribute('aria-live') === 'polite');

const pickerSelect = picker && picker.querySelector('select');
const optgroups = pickerSelect ? [...pickerSelect.querySelectorAll('optgroup')] : [];
check('picker options are grouped under category headings', optgroups.length > 0,
  `${optgroups.length} groups`);
const pickerNames = pickerSelect ? [...pickerSelect.querySelectorAll('option')].map((o) => o.textContent) : [];
// The fixture's second food is category 'personal'.
check('a NON-FOOD is not offered as an ingredient',
  !pickerNames.includes('Home-made stock'), pickerNames.join(' | '));
check('an edible food IS offered', pickerNames.includes('Rolled oats'), pickerNames.join(' | '));

// ---- The food list is grouped so it stays navigable at scale ----
const groupHeadings = [...mount.querySelectorAll('.group-heading')];
check('the food list is grouped under category headings', groupHeadings.length > 0);
check('each group heading states its count',
  groupHeadings.every((h) => /\(\d+\)/.test(h.textContent)),
  groupHeadings.map((h) => h.textContent).join(' | '));
// ---- The missing conversion factor is offered where it is needed --------
// The fixture's second ingredient is 200 ml of a food with no grams_per_ml.
const prompt = mount.querySelector('.factor-prompt');
check('a missing conversion factor is offered inline on the row', !!prompt);
check('the prompt says which food and which unit',
  !!prompt && /Home-made stock/.test(prompt.textContent) && /millilitre/.test(prompt.textContent),
  prompt ? prompt.textContent.slice(0, 90) : '');
check('the prompt input is labelled',
  !!prompt && !!mount.querySelector(`label[for="${CSS.escape(prompt.querySelector('input').id)}"]`));
check('the prompt offers a worked example rather than assuming knowledge',
  !!prompt && /about 1.03|about 60 g/.test(prompt.textContent));

check('a non-food food card says it will not be offered as an ingredient',
  /will not be offered as a recipe ingredient/.test(mount.textContent));

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
  /1 of 2 ingredients? (is|are) not counted here/.test(mount.textContent), '');
// The fixture's second ingredient is 200 ml of a food with no grams_per_ml,
// so the view must say WHAT to fill in, not merely that something is amiss.
check('an unconvertible unit is explained, not just flagged',
  /no weight per millilitre is recorded/.test(mount.textContent), '');
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

// ================= Phase 8: holidays & work =================
// A second view, rendered into its own mount, checked the same way.
console.log('');
const holMount = window.document.createElement('main');
window.document.body.appendChild(holMount);
const holMod = await import(pathToFileURL(path.join(REPO, 'js/views/holidays.js')).href);
holMod.render(holMount, {});
await new Promise((r) => setTimeout(r, 80));

const holControls = [...holMount.querySelectorAll('input, select, textarea')];
const holUnlabelled = holControls.filter((c) => {
  if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
  if (!c.id) return true;
  return !holMount.querySelector(`label[for="${CSS.escape(c.id)}"]`);
});
check(`holidays: all ${holControls.length} controls have a resolvable label`,
  holUnlabelled.length === 0, holUnlabelled.map((c) => c.id || c.type).join(', '));

const holIds = [...holMount.querySelectorAll('[id]')].map((n) => n.id);
const holDupes = [...new Set(holIds.filter((i, n) => holIds.indexOf(i) !== n))];
check('holidays: no duplicate element ids', holDupes.length === 0, holDupes.join(', '));

const holButtons = [...holMount.querySelectorAll('button')];
check(`holidays: all ${holButtons.length} buttons have an accessible name`,
  holButtons.every((b) => b.getAttribute('aria-label') || b.textContent.trim()));

// State must be carried by aria-pressed AND by words, never colour alone.
const toggles = [...holMount.querySelectorAll('.check-toggle')];
check('holidays: item toggles exist', toggles.length === 3, `found ${toggles.length}`);
check('holidays: every toggle reports pressed state',
  toggles.every((t) => ['true', 'false'].includes(t.getAttribute('aria-pressed'))));
check('holidays: toggle state is readable as a word',
  toggles.every((t) => /Packed|Bought|To do/.test(t.textContent)),
  toggles.map((t) => t.textContent).join(' | '));
check('holidays: the completed item is marked pressed',
  toggles.some((t) => t.getAttribute('aria-pressed') === 'true'));

// The date range must be text, not a bar.
check('holidays: the date range is readable text',
  /5 to 12 September 2026/.test(holMount.textContent), '');

// The recurrence pattern must be described in words.
check('holidays: the work pattern is described in words, not an RRULE',
  !/FREQ=/.test(holMount.textContent), 'a raw RRULE string leaked into the page');

// No end-date field: rrule.js would silently ignore it.
const dateInputs = [...holMount.querySelectorAll('input[type="date"]')].map((i) => i.id);
check('holidays: the work form offers no end date',
  !dateInputs.some((id) => /work-end/.test(id)), dateInputs.join(', '));

checkNumberInputs(holMount, 'holidays');

const holLevels = [...holMount.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
let holOrdered = true;
for (let i = 1; i < holLevels.length; i++) if (holLevels[i] - holLevels[i - 1] > 1) holOrdered = false;
check('holidays: heading levels never skip', holOrdered, holLevels.join(','));
check('holidays: exactly one h1', holMount.querySelectorAll('h1').length === 1);
check('holidays: the weekday chooser is a labelled fieldset',
  !!holMount.querySelector('fieldset.weekday-set legend'));

console.log('');
if (fails.length) { console.log(`A11Y STRUCTURE FAILED — ${fails.length}`); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log(`A11Y STRUCTURE PASSED — ${pass}/${pass} checks on the rendered DOM (meals + holidays)`);
