// Structural accessibility checks against the ACTUAL rendered meals DOM,
// not against the source. Catches the things a source read misses: an
// input whose label points at nothing, a th without scope, a button with
// no accessible name.
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

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
  if (t === 'pantry_stock') return [
    { id:'st-1', food_id:'food-1', default_location:'Kitchen cupboard', shelf_life_days:365,
      current_qty:500, unit:'g', last_restocked:'2026-08-01',
      foods:{ id:'food-1', name:'Rolled oats', category:'food_ambient', grams_per_ml:null, grams_per_item:25 } },
    { id:'st-2', food_id:'food-2', default_location:'Bathroom', shelf_life_days:5,
      current_qty:2, unit:'item', last_restocked:'2026-08-19',
      foods:{ id:'food-2', name:'Home-made stock', category:'personal', grams_per_ml:null, grams_per_item:null } },
    // A row whose amount was never recorded. NULL, not 0: 0 means "you have
    // none" to the shortfall, and a scanned shelf saved as 0 would be rebought.
    { id:'st-3', food_id:'food-3', default_location:'Kitchen cupboard', shelf_life_days:365,
      current_qty:null, unit:'item', last_restocked:'2026-08-26',
      foods:{ id:'food-3', name:'Harissa', category:'food_ambient', grams_per_ml:null, grams_per_item:null } }];
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

// ================= Phase 7: pantry =================
console.log('');
const panMount = window.document.createElement('main');
window.document.body.appendChild(panMount);
const panMod = await import(pathToFileURL(path.join(REPO, 'js/views/pantry.js')).href);
panMod.render(panMount, {});
await new Promise((r) => setTimeout(r, 90));

const panControls = [...panMount.querySelectorAll('input, select, textarea')];
const panUnlabelled = panControls.filter((c) => {
  if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
  if (!c.id) return true;
  return !panMount.querySelector(`label[for="${CSS.escape(c.id)}"]`);
});
check(`pantry: all ${panControls.length} controls have a resolvable label`,
  panUnlabelled.length === 0, panUnlabelled.map((c) => c.id || c.type).join(', '));

const panIds = [...panMount.querySelectorAll('[id]')].map((n) => n.id);
const panDupes = [...new Set(panIds.filter((i, n) => panIds.indexOf(i) !== n))];
check('pantry: no duplicate element ids', panDupes.length === 0, panDupes.join(', '));

const panButtons = [...panMount.querySelectorAll('button')];
check(`pantry: all ${panButtons.length} buttons have an accessible name`,
  panButtons.every((b) => b.getAttribute('aria-label') || b.textContent.trim()));

checkNumberInputs(panMount, 'pantry');

// ---- Scanning is offered, and is never the ONLY way in ----
const panScan = [...panMount.querySelectorAll('button')].find((b) => /Scan a barcode/.test(b.textContent));
check('pantry: a scan button is offered', !!panScan);
check('pantry: the manual add form exists regardless of the scanner',
  !!panMount.querySelector('#pantry-new-name') && !!panMount.querySelector('#pantry-food'));
const panScanNote = [...panMount.querySelectorAll('[role="status"]')]
  .filter((n) => n.getAttribute('aria-live') === 'polite');
check('pantry: scan feedback is announced politely', panScanNote.length > 0);

const panDesc = [...panMount.querySelectorAll('[aria-describedby]')]
  .flatMap((n) => n.getAttribute('aria-describedby').split(/\s+/))
  .filter((id) => id && !panMount.querySelector(`#${CSS.escape(id)}`));
check('pantry: every aria-describedby target exists', panDesc.length === 0, panDesc.join(', '));

// ---- A missing amount must be visible and fixable ----------------------
// Blank used to be written as 0, and 0 reads as "you have none", so a
// stocktake that skipped the amount would have been silently rebought.
check('pantry: rows with no amount are surfaced for fixing',
  /Needs an amount/.test(panMount.textContent));
check('pantry: a missing amount says so rather than showing a bare 0',
  /Amount not recorded/.test(panMount.textContent));

// ---- The default view is never "everything" ----------------------------
// Seven items filled a phone screen. Quantities and freshness therefore live
// behind Browse, so the assertions have to walk there like a user does.
const panBrowseBtn = [...panMount.querySelectorAll('button')]
  .find((b) => b.getAttribute('aria-label') === 'Browse the pantry by where things live');
check('pantry: a browse mode is offered', !!panBrowseBtn);
if (panBrowseBtn) panBrowseBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));

// Named explicitly rather than taking the first: locations sort
// alphabetically, and the row under test lives in the kitchen.
const panLocationToggle = [...panMount.querySelectorAll('.location-toggle')]
  .find((b) => /Kitchen cupboard/.test(b.textContent));
check('pantry: browse groups by where things live', !!panLocationToggle,
  'locations collapse so sixty rows never render at once');
check('pantry: a location is collapsed until it is opened',
  panLocationToggle && panLocationToggle.getAttribute('aria-expanded') === 'false');
if (panLocationToggle) panLocationToggle.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));

// Quantities must carry their unit as text, never a bare number.
check('pantry: quantities are shown with a unit',
  /500 g|0.5 kg/.test(panMount.textContent), '');
// Freshness in words, and "unknown" must be an unembarrassed state.
check('pantry: freshness is stated in words',
  /Stocked .* days ago|Freshness unknown/.test(panMount.textContent), '');

// ---- Opening an item must actually show what is known about it ---------
// The macros are captured by the scan and then had nowhere to be read. A row
// that cannot be opened makes the app a worse record than the jar's label.
const panRowOpen = panMount.querySelector('.stock-row-open');
check('pantry: a row can be opened', !!panRowOpen);
if (panRowOpen) panRowOpen.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));

const sheet = window.document.querySelector('.sheet[role="dialog"]');
check('pantry: opening a row opens a labelled dialog',
  !!sheet && sheet.getAttribute('aria-modal') === 'true'
  && !!window.document.getElementById(sheet.getAttribute('aria-labelledby')));
check('pantry: the sheet shows the macros', !!sheet && /Per 100 g/.test(sheet.textContent));
check('pantry: a missing macro says so rather than showing blank',
  !!sheet && /Not recorded/.test(sheet.textContent));
check('pantry: the sheet keeps a text-labelled way out',
  !!sheet && [...sheet.querySelectorAll('button')].some((b) => /Close/.test(b.textContent)));
check('pantry: focus moves into the sheet on open',
  !!sheet && sheet.contains(window.document.activeElement));

// Escape must work, and focus must come back to where it started (3.2.1).
window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('pantry: escape closes the sheet', !window.document.querySelector('.sheet[role="dialog"]'));
check('pantry: focus returns to the row that opened it',
  window.document.activeElement === panRowOpen);

const panLevels = [...panMount.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
let panOrdered = true;
for (let i = 1; i < panLevels.length; i++) if (panLevels[i] - panLevels[i - 1] > 1) panOrdered = false;
check('pantry: heading levels never skip', panOrdered, panLevels.join(','));
check('pantry: exactly one h1', panMount.querySelectorAll('h1').length === 1);

// ================= Dashboard =================
// The water control here is load-bearing: it is the whole justification for
// putting Water behind the Health hub. If it disappears, the most frequent
// action in the app quietly becomes three taps deep.
console.log('');
const dashMount = window.document.createElement('main');
window.document.body.appendChild(dashMount);
const dashMod = await import(pathToFileURL(path.join(REPO, 'js/views/dashboard.js')).href);
dashMod.render(dashMount, {});
await new Promise((r) => setTimeout(r, 60));

const waterBtn = [...dashMount.querySelectorAll('button')]
  .find((b) => /glass/i.test(b.getAttribute('aria-label') || b.textContent));
check('dashboard: water can be logged in one tap', !!waterBtn,
  'Health hub only works if logging stays on the dashboard');
check('dashboard: the water button says the amount, not just "add"',
  !!waterBtn && /\d/.test(waterBtn.getAttribute('aria-label') || ''));
check('dashboard: the running total is announced politely',
  !!dashMount.querySelector('[role="status"][aria-live="polite"]'));

// Tapping must move the count immediately and must not disable the control.
if (waterBtn) waterBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('dashboard: the button is never disabled mid-write',
  !!waterBtn && waterBtn.disabled === false,
  'a dead control reads as a crash on a tap-heavy action');

// The bottom-bar four must not be duplicated in the list below.
const dashHrefs = [...dashMount.querySelectorAll('.hub-link')]
  .map((a) => a.getAttribute('href'));
check('dashboard: no duplicate links to what is already in the nav bar',
  !dashHrefs.some((h) => ['#/chores', '#/calendar', '#/health', '#/dashboard'].includes(h)),
  dashHrefs.join(' '));
check('dashboard: no duplicate links to what is behind Health',
  !dashHrefs.some((h) => ['#/water', '#/weight', '#/exercises'].includes(h)),
  dashHrefs.join(' '));
check('dashboard: what is left is still reachable from here',
  ['#/holidays', '#/settings'].every((h) => dashHrefs.includes(h)));

// ---- No route may become an orphan -------------------------------------
// Consolidating into hubs is how a page quietly stops being reachable at
// all: it is removed from the dashboard and nobody adds it to the hub. This
// asserts the whole route table is reachable from SOMEWHERE, so the next
// consolidation cannot strand a page.
const navMod = await import(pathToFileURL(path.join(REPO, 'js/navConfig.js')).href);
const routesMod = await import(pathToFileURL(path.join(REPO, 'js/routes.js')).href);
const reachable = new Set([
  ...navMod.NAV_ITEMS.map((i) => i.path),
  ...navMod.DASHBOARD_LINKS.map((i) => i.path),
  ...navMod.HEALTH_PAGES.map((i) => i.path),
  ...navMod.KITCHEN_PAGES.map((i) => i.path)
]);
const orphans = routesMod.routes.map((r) => r.path).filter((p) => !reachable.has(p));
check('every route is reachable from the nav bar or a hub',
  orphans.length === 0, orphans.length ? `orphaned: ${orphans.join(', ')}` : '');
check('dashboard: exactly one h1', dashMount.querySelectorAll('h1').length === 1);

// ================= Kitchen hub =================
console.log('');
const kitMount = window.document.createElement('main');
window.document.body.appendChild(kitMount);
const kitMod = await import(pathToFileURL(path.join(REPO, 'js/views/kitchen.js')).href);
kitMod.render(kitMount, {});
await new Promise((r) => setTimeout(r, 60));

const kitLinks = [...kitMount.querySelectorAll('.hub-link')];
check('kitchen: the hub links to all three pages', kitLinks.length === 3);
check('kitchen: links point at real routes',
  kitLinks.every((a) => /^#\/(meals|pantry|shopping)$/.test(a.getAttribute('href') || '')));
check('kitchen: shopping comes first — it is what you open in a shop',
  (kitLinks[0] || {}).getAttribute && kitLinks[0].getAttribute('href') === '#/shopping');
check('kitchen: every link has an accessible name',
  kitLinks.every((a) => (a.getAttribute('aria-label') || a.textContent.trim()).length > 0));
check('kitchen: exactly one h1', kitMount.querySelectorAll('h1').length === 1);

// ================= Calendar =================
console.log('');
const calMount = window.document.createElement('main');
window.document.body.appendChild(calMount);
const calMod = await import(pathToFileURL(path.join(REPO, 'js/views/calendar.js')).href);
calMod.render(calMount, {});
await new Promise((r) => setTimeout(r, 90));

// A month is tabular data and has to be announced as such, or a screen
// reader reads a wall of bare numbers.
const calTable = calMount.querySelector('table');
check('calendar: the month is a real table', !!calTable);
const calHeaders = [...calMount.querySelectorAll('th')];
check('calendar: every day column header has scope', calHeaders.length === 7
  && calHeaders.every((th) => th.getAttribute('scope') === 'col'));
check('calendar: day names are available in full, not just abbreviated',
  /Wednesday/.test(calMount.textContent));

const calDays = [...calMount.querySelectorAll('.calendar-day')];
check('calendar: dates are buttons, not just text', calDays.length > 27);
check('calendar: every date carries its own full label',
  calDays.every((b) => /\d{1,2} \w+ \d{4}/.test(b.getAttribute('aria-label') || '')),
  'a bare "26" says nothing about whether the day is busy');
check('calendar: a date says whether anything is on it',
  calDays.some((b) => /nothing on|item/.test(b.getAttribute('aria-label') || '')));
const calToday = calMount.querySelector('.calendar-day.is-today');
check('calendar: today is marked with aria-current, not just a colour',
  !calToday || calToday.getAttribute('aria-current') === 'date');

// Tapping a date opens the day rather than navigating away from the month.
if (calDays[0]) calDays[0].dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
const calSheet = window.document.querySelector('.sheet[role="dialog"]');
check('calendar: tapping a date opens the day in the sheet', !!calSheet);
check('calendar: the day sheet is titled with the date',
  !!calSheet && /\d{1,2} \w+ \d{4}/.test(calSheet.textContent));
if (calSheet) {
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
}
check('calendar: the grid survives closing the day',
  !!calMount.querySelector('.calendar-day'));

const calLevels = [...calMount.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
let calOrdered = true;
for (let i = 1; i < calLevels.length; i++) if (calLevels[i] - calLevels[i - 1] > 1) calOrdered = false;
check('calendar: heading levels never skip', calOrdered, calLevels.join(','));
check('calendar: exactly one h1', calMount.querySelectorAll('h1').length === 1);

// ================= Health hub =================
console.log('');
const hubMount = window.document.createElement('main');
window.document.body.appendChild(hubMount);
const hubMod = await import(pathToFileURL(path.join(REPO, 'js/views/health.js')).href);
hubMod.render(hubMount, {});
await new Promise((r) => setTimeout(r, 60));

const hubLinks = [...hubMount.querySelectorAll('.hub-link')];
check('health: the hub links to all three pages', hubLinks.length === 3);
check('health: every link has an accessible name',
  hubLinks.every((a) => (a.getAttribute('aria-label') || a.textContent.trim()).length > 0));
check('health: links point at real routes',
  hubLinks.every((a) => /^#\/(exercises|weight|water)$/.test(a.getAttribute('href') || '')));
check('health: exactly one h1', hubMount.querySelectorAll('h1').length === 1);

// ---- The hidden attribute must not be defeated by the cascade ----------
// `el.hidden = true` is the app's only mechanism for conditional fields, and
// the UA sheet's [hidden] { display: none } loses to ANY author rule that
// sets display on the same element. `.field { display: flex }` did exactly
// that: "Day of month" stayed on screen under FREQ=DAILY while the DOM
// reported it hidden. jsdom does not compute the cascade, so no rendered-DOM
// assertion can see this — it is checked structurally on the stylesheet.
{
  const baseCss = fs.readFileSync(path.join(REPO, 'css/base.css'), 'utf8');
  const hasGlobalRule = /\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/.test(baseCss);
  check('css: [hidden] is enforced globally with !important', hasGlobalRule,
    'without it, any display rule silently un-hides a hidden element');
}

console.log('');
if (fails.length) { console.log(`A11Y STRUCTURE FAILED — ${fails.length}`); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log(`A11Y STRUCTURE PASSED — ${pass}/${pass} checks on the rendered DOM (dashboard, meals, holidays, pantry, calendar, health, kitchen)`);
