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
      current_qty:2, unit:'item', last_restocked:'2026-08-19', use_by:'2026-08-28',
      foods:{ id:'food-2', name:'Home-made stock', category:'personal', grams_per_ml:null, grams_per_item:null } },
    // A row whose amount was never recorded. NULL, not 0: 0 means "you have
    // none" to the shortfall, and a scanned shelf saved as 0 would be rebought.
    { id:'st-3', food_id:'food-3', default_location:'Kitchen cupboard', shelf_life_days:365,
      current_qty:null, unit:'item', last_restocked:'2026-08-26',
      foods:{ id:'food-3', name:'Harissa', category:'food_ambient', grams_per_ml:null, grams_per_item:null } }];
  if (t === 'shopping_list_items') return [
    // The same food twice — once generated, once a staple. Separate rows on
    // purpose: `source` is what makes regeneration safe.
    { id:'sh-1', food_id:'food-1', qty_needed:400, unit:'g', source:'meal_plan', status:'needed',
      foods:{ id:'food-1', name:'Rolled oats', category:'food_ambient' } },
    { id:'sh-2', food_id:'food-1', qty_needed:100, unit:'g', source:'usual', status:'needed',
      foods:{ id:'food-1', name:'Rolled oats', category:'food_ambient' } },
    { id:'sh-3', food_id:'food-2', qty_needed:1, unit:'item', source:'holiday', status:'bought',
      foods:{ id:'food-2', name:'Sun cream', category:'personal' } }];
  if (t === 'holidays') return [{ id:'hol-1', title:'Cornwall', start_date:'2026-09-05', end_date:'2026-09-12' }];
  if (t === 'holiday_checklist_items') return [
    { id:'chk-1', holiday_id:'hol-1', title:'Passports', status:'complete', kind:'pack' },
    { id:'chk-2', holiday_id:'hol-1', title:'Chargers', status:'pending', kind:'pack' },
    // Revision 6: same table, told apart by `kind`.
    { id:'chk-3', holiday_id:'hol-1', title:'Walk the coast path', status:'pending', kind:'do' }];
  if (t === 'holiday_purchase_items') return [{ id:'buy-1', holiday_id:'hol-1', title:'Sun cream', status:'pending', send_to_shopping:true }];
  if (t === 'calendar_events') return [
    { id:'ev-1', event_type:'work_location', source_id:null, title:'Office', start_date:'2026-08-24', recurrence_rule:'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH', location_label:'Head office' },
    // The recurrence ANCHOR for task-1. It lives only here, never on
    // chore_tasks — the Phase 4 debt the chores screen has to join across.
    { id:'ev-2', event_type:'chore', source_id:'task-1', title:'Clean the fridge', start_date:'2026-08-01', recurrence_rule:'FREQ=DAILY;INTERVAL=1', location_label:null }];
  if (t === 'chore_projects') return [
    { id:'proj-1', title:'Kitchen', colour:'#2f6f4f', sort_order:0 },
    { id:'proj-2', title:'Garden', colour:'#7a4f2f', sort_order:1 }];
  if (t === 'chore_tasks') return [
    // Repeating daily, anchored 1 Aug, so an occurrence is outstanding today.
    { id:'task-1', project_id:'proj-1', title:'Clean the fridge', details:'Take everything out first', is_repeatable:true, recurrence_rule:'FREQ=DAILY;INTERVAL=1', status:'pending', completed_at:null, created_at:'2026-08-01T00:00:00Z' },
    // Seasonal — quarterly — so the cadence filter has something to catch.
    { id:'task-2', project_id:'proj-1', title:'Descale the kettle', details:null, is_repeatable:true, recurrence_rule:'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1', status:'pending', completed_at:null, created_at:'2026-08-01T00:00:00Z' },
    // A one-off, which still uses chore_tasks.status.
    { id:'task-3', project_id:'proj-2', title:'Fix the gate', details:null, is_repeatable:false, recurrence_rule:null, status:'pending', completed_at:null, created_at:'2026-08-20T00:00:00Z' }];
  if (t === 'chore_task_completions') return [];
  return [];
}
// The stub HONOURS .eq() filters. It did not, and that mattered: the packing
// and to-do lists are the same table told apart by `kind`, so an unfiltered
// stub handed both lists every row and the gate counted five toggles where
// the app shows three. A stub that ignores the filter cannot tell a working
// split from a broken one.
function builder(t) { const st={eq:[]}; const b={};
  for (const m of CHAIN) b[m]=(...a)=>{ if(m==='select'&&a[1]&&a[1].head) st.head=true;
    if(m==='eq') st.eq.push([a[0],a[1]]); return b; };
  b.single=()=>{st.single=true;return b;}; b.maybeSingle=b.single;
  b.then=(res)=>{ let rows=fixture(t);
    for (const [col,val] of st.eq) {
      // Only filter on a column the fixture actually models; an unknown
      // column would silently empty every result.
      if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], col)) {
        rows = rows.filter((r) => String(r[col]) === String(val));
      }
    }
    if(st.head) return Promise.resolve({count:rows.length,error:null}).then(res);
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

/**
 * Dismiss any open slide-out panel before examining the next view.
 *
 * Panels are appended to document.body, so one left open by an earlier
 * block is what every later `.sheet[role="dialog"]` query finds — the
 * pantry's macro checks passed against the MEALS panel until this existed.
 */
async function closeAnySheet() {
  while (window.document.querySelector('.sheet[role="dialog"]')) {
    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  }
}

// ---- The recipe list is rows now, not a wall of cards -------------------
// A full card each — macro table, ingredient list, add form — was
// unreadable past about six recipes.
const recipeRows = [...mount.querySelectorAll('.recipe-row-open')];
check('recipes are one row each', recipeRows.length === 1);
check('a recipe row says what kind of meal it is',
  !!recipeRows[0] && /Unclassified|Breakfast|Lunch|Dinner|Snack|Drink/.test(recipeRows[0].textContent));
// The row answers "can I cook this?" without opening anything — the whole
// point of keeping a pantry, and until now nothing asked it.
check('a recipe row says how much of it is in the pantry',
  !!recipeRows[0] && /\d+ of \d+ in the pantry|no ingredients yet/.test(recipeRows[0].textContent),
  recipeRows[0] && recipeRows[0].textContent);

// The favourite star must speak its state; a filled glyph alone is colour-
// and-shape only, which is not enough (1.4.1).
const star = mount.querySelector('.favourite-toggle');
check('a recipe can be favourited', !!star);
check('the star reports its state in words',
  !!star && star.getAttribute('aria-pressed') === 'false'
  && /favourite/i.test(star.getAttribute('aria-label') || ''));

// The filter button must carry its count, or hidden state is silent.
const mealFilterBtn = [...mount.querySelectorAll('button')].find((b) => /^Filter/.test(b.textContent));
check('recipes can be filtered', !!mealFilterBtn);
check('with nothing filtered the button carries no count',
  !!mealFilterBtn && mealFilterBtn.textContent.trim() === 'Filter');

// Everything below lives inside the recipe panel now, so open it — the same
// journey a user makes.
if (recipeRows[0]) recipeRows[0].dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 60));
const mealSheet = window.document.querySelector('.sheet[role="dialog"]');
check('opening a recipe opens the panel', !!mealSheet);
const sheetScope = mealSheet || mount;

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
const picker = sheetScope.querySelector('.food-picker');
check('the ingredient picker has a type-ahead box', !!picker && !!picker.querySelector('input[type="search"]'));
check('the search box is labelled', !!picker && !!sheetScope.querySelector(`label[for="${CSS.escape(picker.querySelector('input[type="search"]').id)}"]`));
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

// ---- Every aria-describedby points at something that exists ----
const badDesc = [...mount.querySelectorAll('[aria-describedby]')]
  .flatMap((n) => n.getAttribute('aria-describedby').split(/\s+/))
  .filter((id) => id && !mount.querySelector(`#${CSS.escape(id)}`));
check('every aria-describedby target exists', badDesc.length === 0, badDesc.join(', '));

// ---- Every button has an accessible name ----
const buttons = [...mount.querySelectorAll('button')];
const nameless = buttons.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim()));
check(`all ${buttons.length} buttons have an accessible name`, nameless.length === 0);

// ---- The panel NAMES what is short ------------------------------------
// "Short of milk" saves a trip to the cupboard; "2 missing" does not.
check('the recipe panel names what is missing, not just a count',
  /in the pantry/.test(sheetScope.textContent), '');

// ---- Figures scale to how many you are cooking for ---------------------
// default_serves is what the recipe MAKES; this is how many you want this
// time. Rescaling here must never write back — that would re-serve the
// recipe everywhere it is planned.
const scaler = sheetScope.querySelector('.serves-scaler input');
check('a recipe can be shown for a different number of servings', !!scaler);
check('the servings box is labelled',
  !!scaler && !!sheetScope.querySelector(`label[for="${CSS.escape(scaler.id)}"]`));
if (scaler) {
  const before = sheetScope.querySelector('.data-table thead th:last-child').textContent;
  scaler.value = '8';
  scaler.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  const after = sheetScope.querySelector('.data-table thead th:last-child').textContent;
  check('changing it restates the per-serving column', before !== after && /8/.test(after), after);
}

// ---- Macro figures carry units as text ----
const macroTable = sheetScope.querySelector('.data-table');
check('meal macros are a real table with a caption', !!macroTable && !!macroTable.querySelector('caption'));
const macroRowHeaders = [...macroTable.querySelectorAll('tbody th')];
check('each nutrient is a scoped row header', macroRowHeaders.length === 4 && macroRowHeaders.every((t) => t.getAttribute('scope') === 'row'));
const macroCells = [...macroTable.querySelectorAll('tbody td')].map((t) => t.textContent);
check('every macro figure states a unit or says it is not known',
  macroCells.every((t) => /\b(kcal|g)\b/.test(t) || t === 'not known'), macroCells.join(' | '));
// The fixture deliberately includes a food with no nutrition data.
check('the incomplete ingredient count is stated in words',
  /1 of 2 ingredients? (is|are) not counted here/.test(sheetScope.textContent), '');
// The fixture's second ingredient is 200 ml of a food with no grams_per_ml,
// so the view must say WHAT to fill in, not merely that something is amiss.
check('an unconvertible unit is explained, not just flagged',
  /no weight per millilitre is recorded/.test(sheetScope.textContent), '');
check('the incomplete ingredient is named', sheetScope.textContent.includes('Home-made stock'));

// ---- Headings are ordered ----
const levels = [...mount.querySelectorAll('h1,h2,h3')].map((h) => Number(h.tagName[1]));
let ordered = true;
for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) ordered = false;
check('heading levels never skip a level', ordered, levels.join(','));
check('exactly one h1', mount.querySelectorAll('h1').length === 1);

// ================= Shopping list =================
// Used in a shop: no signal, one hand, moving.
await closeAnySheet();
const shopMount = window.document.createElement('main');
window.document.body.appendChild(shopMount);
const shopMod = await import(pathToFileURL(path.join(REPO, 'js/views/shopping.js')).href);
shopMod.render(shopMount, {});
await new Promise((r) => setTimeout(r, 80));

// AISLE ORDER, never alphabetical. Cupboard food before toiletries.
const shopHeadings = [...shopMount.querySelectorAll('.group-heading')].map((h) => h.textContent);
check('shopping: the list is grouped into aisles', shopHeadings.length === 2, shopHeadings.join(' | '));
check('shopping: aisle order puts food before toiletries',
  /Cupboard|food/i.test(shopHeadings[0] || ''), shopHeadings.join(' | '));
check('shopping: each aisle heading carries its count',
  shopHeadings.every((h) => /\(\d+\)/.test(h)), shopHeadings.join(' | '));

// One food, one entry, even though it arrived as two rows.
const entries = [...shopMount.querySelectorAll('.shopping-entry')];
check('shopping: one food is one entry', entries.length === 2, `found ${entries.length}`);
const oatEntry = entries.find((e) => /Rolled oats/.test(e.textContent));
check('shopping: a food arriving twice shows its name once',
  !!oatEntry && oatEntry.querySelectorAll('.shopping-entry-name').length === 1);
check('shopping: with a line for each source', !!oatEntry
  && oatEntry.querySelectorAll('.shopping-line').length === 2);
check('shopping: and each line SAYS where it came from',
  !!oatEntry && /weekly plan/.test(oatEntry.textContent) && /staple/.test(oatEntry.textContent),
  'two rows for one food read as a bug unless the reason is stated');
// Matching units may be totalled. Grams must never be added to items.
check('shopping: matching units are totalled',
  !!oatEntry && /500 g/.test(oatEntry.textContent), oatEntry && oatEntry.textContent);

// Every quantity carries its unit as text — never a bare number.
const shopLines = [...shopMount.querySelectorAll('.shopping-line-text')];
// Read per-span, not per-block: textContent concatenates the amount and the
// source with no separator, which is a fact about textContent rather than
// about the rendering. The layout puts them on separate lines.
check('shopping: every amount states its unit',
  shopLines.every((l) => /^\s*\d+(\.\d+)?\s*(g|ml|items?)\b/.test(l.firstChild.textContent)
    || /Amount not set/.test(l.firstChild.textContent)),
  shopLines.map((l) => l.firstChild.textContent).join(' | '));
check('shopping: the amount and its source are separate elements',
  shopLines.every((l) => l.children.length >= 1),
  'run together, they read as "400 gfrom your weekly plan"');

// Status is a word and aria-pressed, never a colour.
const shopToggle = shopMount.querySelector('.check-toggle');
check('shopping: items can be ticked off', !!shopToggle);
check('shopping: the tick states its status in words',
  !!shopToggle && /Still to get|Already have|Bought/.test(shopToggle.textContent));
check('shopping: and reports it to assistive tech',
  !!shopToggle && shopToggle.getAttribute('aria-pressed') !== null);
check('shopping: the tick says what the next tap will do',
  !!shopToggle && /Tap for/.test(shopToggle.getAttribute('aria-label') || ''));
check('shopping: the tick is never disabled',
  !!shopToggle && shopToggle.disabled === false,
  'a dead control in a shop reads as a crash');

check('shopping: exactly one h1', shopMount.querySelectorAll('h1').length === 1);
const shopLevels = [...shopMount.querySelectorAll('h1,h2,h3')].map((h) => Number(h.tagName[1]));
let shopOrdered = true;
for (let i = 1; i < shopLevels.length; i++) if (shopLevels[i] - shopLevels[i - 1] > 1) shopOrdered = false;
check('shopping: heading levels never skip', shopOrdered, shopLevels.join(','));

// ================= Things you buy =================
await closeAnySheet();
const foodMount = window.document.createElement('main');
window.document.body.appendChild(foodMount);
const foodMod = await import(pathToFileURL(path.join(REPO, 'js/views/foods.js')).href);
foodMod.render(foodMount, {});
await new Promise((r) => setTimeout(r, 80));

// A long library stays navigable by heading rather than by scrolling.
const groupHeadings = [...foodMount.querySelectorAll('.group-heading')];
check('the food list is grouped under category headings', groupHeadings.length > 0);
check('each group heading states its count',
  groupHeadings.every((h) => /\(\d+\)/.test(h.textContent)),
  groupHeadings.map((h) => h.textContent).join(' | '));
// ---- The missing conversion factor is offered where it is needed --------
// The fixture's second ingredient is 200 ml of a food with no grams_per_ml.
const prompt = sheetScope.querySelector('.factor-prompt');
check('a missing conversion factor is offered inline on the row', !!prompt);
check('the prompt says which food and which unit',
  !!prompt && /Home-made stock/.test(prompt.textContent) && /millilitre/.test(prompt.textContent),
  prompt ? prompt.textContent.slice(0, 90) : '');
check('the prompt input is labelled',
  !!prompt && !!sheetScope.querySelector(`label[for="${CSS.escape(prompt.querySelector('input').id)}"]`));
check('the prompt offers a worked example rather than assuming knowledge',
  !!prompt && /about 1.03|about 60 g/.test(prompt.textContent));

check('a non-food food card says it will not be offered as an ingredient',
  /will not be offered as a recipe ingredient/.test(foodMount.textContent));

// ---- No duplicate ids (a duplicate silently breaks label association) ----
const ids = [...foodMount.querySelectorAll('[id]')].map((n) => n.id);
const dupes = [...new Set(ids.filter((i, n) => ids.indexOf(i) !== n))];
check('no duplicate element ids', dupes.length === 0, dupes.join(', '));
check('foods: exactly one h1', foodMount.querySelectorAll('h1').length === 1);
check('foods: the manual add form exists regardless of the scanner',
  !!foodMount.querySelector('.food-form'),
  'a browser without a camera must still be able to add something');

// ================= Phase 8: holidays & work =================
await closeAnySheet();
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

// ---- A holiday is a row that opens a panel ----------------------------
// Two holidays, each carrying two whole checklists, filled a phone screen.
const holRows = [...holMount.querySelectorAll('.recipe-row-open')];
check('holidays: each holiday is one row', holRows.length === 1);
check('holidays: the row says the dates and what is outstanding',
  !!holRows[0] && /\d{4}/.test(holRows[0].textContent)
  && /outstanding|to sort/.test(holRows[0].textContent));
check('holidays: no checklist items render while the row is shut',
  holMount.querySelectorAll('.check-toggle').length === 0,
  'the whole point of the row is that the lists are behind it');

if (holRows[0]) holRows[0].dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 60));
const holSheet = window.document.querySelector('.sheet[role="dialog"]');
check('holidays: opening a holiday opens the panel', !!holSheet);
const holScope = holSheet || holMount;

// THREE lists, each its own sub-card with its own count and add box.
const groupTitles = [...holScope.querySelectorAll('.item-group-title')].map((h) => h.textContent);
check('holidays: there are three lists', groupTitles.length === 3, groupTitles.join(' | '));
check('holidays: buy, pack and do are all offered',
  /buy/i.test(groupTitles.join(' ')) && /pack/i.test(groupTitles.join(' '))
  && /do/i.test(groupTitles.join(' ')), groupTitles.join(' | '));
check('holidays: each list has its own add box',
  holScope.querySelectorAll('form.add-item').length === 3);
// "done" means something different on each list and must say so.
check('holidays: each list counts in its own words',
  /packed|bought|done|Nothing on this list/.test(holScope.textContent));

// State must be carried by aria-pressed AND by words, never colour alone.
const toggles = [...holScope.querySelectorAll('.check-toggle')];
// 2 to pack, 1 to do, 1 to buy. Counting them proves the `kind` split
// actually splits — before the stub honoured .eq() this read 5, with both
// checklist lists showing every row.
check('holidays: every item across all three lists has a toggle',
  toggles.length === 4, `found ${toggles.length}`);
const doGroup = [...holScope.querySelectorAll('.item-group')]
  .find((g) => /do/i.test((g.querySelector('.item-group-title') || {}).textContent || ''));
check('holidays: the to-do list holds only to-dos',
  !!doGroup && doGroup.querySelectorAll('.check-toggle').length === 1
  && /coast path/i.test(doGroup.textContent),
  'a packing item leaking in here means the kind filter is not applied');
check('holidays: every toggle reports pressed state',
  toggles.every((t) => ['true', 'false'].includes(t.getAttribute('aria-pressed'))));
check('holidays: toggle state is readable as a word',
  toggles.every((t) => /Packed|Bought|To do/.test(t.textContent)),
  toggles.map((t) => t.textContent).join(' | '));
check('holidays: the completed item is marked pressed',
  toggles.some((t) => t.getAttribute('aria-pressed') === 'true'));

// The date range must be text, not a bar.
check('holidays: the date range is readable text',
  /5 to 12 September 2026/.test(holScope.textContent), '');

// The recurrence pattern must be described in words.
check('holidays: the work pattern is described in words, not an RRULE',
  !/FREQ=/.test(holScope.textContent), 'a raw RRULE string leaked into the page');

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
await closeAnySheet();
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

// ---- One screen since Phase 23 -----------------------------------------
// Quantities and freshness used to live behind a "Browse" mode, so these
// assertions had to walk there like a user did. Locations now render
// directly, so they do not.
// ---- The use-by date is a picker, not a typed string --------------------
// A typed date is ambiguous (03/09 is March in half the world) and is work.
// type="date" opens the native calendar and the OS handles the format.
const useByField = panMount.querySelector('#pantry-use-by');
check('pantry: a use-by date can be recorded', !!useByField);
check('pantry: it is a date picker, not a text box',
  !!useByField && useByField.type === 'date');
check('pantry: the use-by field is labelled',
  !!useByField && !!panMount.querySelector(`label[for="${CSS.escape(useByField.id)}"]`));
check('pantry: leaving it blank is explained, not left to guesswork',
  /estimate/i.test(panMount.textContent));

// ---- Phase 23: one screen, no mode switcher ----
// Looking for something is not a mode. These replace the old "a browse mode
// is offered" check, which asserted the design that was the problem.
check('pantry: there is no mode switcher',
  panMount.querySelector('.segmented') === null,
  'search was a mode you had to know existed');
check('pantry: search is visible without switching to it',
  (() => {
    const find = panMount.querySelector('#pantry-find');
    if (!find) return false;
    // Visible means no hidden ancestor, not merely present in the DOM.
    for (let n = find; n && n !== panMount; n = n.parentElement) {
      if (n.hidden) return false;
    }
    return true;
  })());
check('pantry: the search input is labelled',
  !!panMount.querySelector('label[for="pantry-find"]'));
check('pantry: adding stock is behind one button, not the default view',
  (() => {
    const toggle = panMount.querySelector('.add-stock-toggle');
    return !!toggle && toggle.getAttribute('aria-expanded') === 'false';
  })());
check('pantry: locations are browsable without switching to them',
  panMount.querySelectorAll('.location-toggle').length > 0);
// Unplaced items are a to-do, not a dustbin, so they sort first rather
// than alphabetically to the bottom where nobody scrolls.
check('pantry: unplaced items sort first, not last',
  (() => {
    const toggles = [...panMount.querySelectorAll('.location-toggle')];
    const unplacedIndex = toggles.findIndex((t) => /not put away|no place set/i.test(t.textContent));
    return unplacedIndex === -1 || unplacedIndex === 0;
  })());

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
// Both wordings count — the fixture now has one row with a real use-by and
// one relying on the shelf-life estimate.
check('pantry: freshness is stated in words',
  /Stocked .* days? ago|Stocked today|Use by \d|Freshness unknown/.test(panMount.textContent), '');
// The distinction is the point: a guess must not read like a printed date.
check('pantry: a printed use-by is stated as a date, with no "about"',
  /Use by \d+ \w+ \d{4} — \d+ days? left\./.test(panMount.textContent)
  || /Use by \d+ \w+ \d{4} — that/.test(panMount.textContent),
  'an estimate shown as a hard date gets trusted at the fridge');

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
await closeAnySheet();
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

// ---- Sections appear only when they have something to say --------------
// Six cards each reporting their own emptiness is worse than no cards.
const dueSection = [...dashMount.querySelectorAll('.today-card')]
  .find((c) => /Chores due today/.test(c.textContent));
check('dashboard: chores due today are surfaced', !!dueSection && !dueSection.hidden,
  'the fixture has a daily chore anchored before today and no completion');
check('dashboard: a due chore names its project, not just its title',
  !!dueSection && /Kitchen/.test(dueSection.textContent));

// Ticking here writes a completion for TODAY, never chore_tasks.status.
const dueTick = dueSection && dueSection.querySelector('.check-toggle');
check('dashboard: a due chore can be ticked from here', !!dueTick);
check('dashboard: the tick states what it is and that it is not done',
  !!dueTick && /due today, not done/.test(dueTick.getAttribute('aria-label') || ''));

const eatingSection = [...dashMount.querySelectorAll('.today-card')]
  .find((c) => /Eating today/.test(c.textContent));
// The fixture plans Porridge on MONDAY only, so this section is present or
// absent depending on the day the gate runs. Either is correct; what must
// never happen is a visible card with nothing in it.
const emptyCards = [...dashMount.querySelectorAll('.today-card')]
  .filter((c) => !c.hidden && c.querySelectorAll('li, p, a').length === 0);
check('dashboard: no visible card is empty', emptyCards.length === 0,
  `${emptyCards.length} empty card(s) on screen`);
void eatingSection;

check('dashboard: every heading level is used in order',
  (() => {
    const levels = [...dashMount.querySelectorAll('h1,h2,h3')].map((h) => Number(h.tagName[1]));
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) return false;
    return true;
  })());

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
  ...navMod.KITCHEN_PAGES.map((i) => i.path),
  navMod.PRIMARY_ACTION.path
]);
const orphans = routesMod.routes.map((r) => r.path).filter((p) => !reachable.has(p));
check('every route is reachable from the nav bar or a hub',
  orphans.length === 0, orphans.length ? `orphaned: ${orphans.join(', ')}` : '');
check('dashboard: exactly one h1', dashMount.querySelectorAll('h1').length === 1);

// ================= Kitchen hub =================
await closeAnySheet();
console.log('');
const kitMount = window.document.createElement('main');
window.document.body.appendChild(kitMount);
const kitMod = await import(pathToFileURL(path.join(REPO, 'js/views/kitchen.js')).href);
kitMod.render(kitMount, {});
await new Promise((r) => setTimeout(r, 60));

const kitLinks = [...kitMount.querySelectorAll('.hub-link')];
check('kitchen: the hub links to every kitchen page', kitLinks.length === 5);
check('kitchen: links point at real routes',
  kitLinks.every((a) => /^#\/(meals|pantry|shopping|meal-plan|foods)$/.test(a.getAttribute('href') || '')));
check('kitchen: shopping comes first — it is what you open in a shop',
  (kitLinks[0] || {}).getAttribute && kitLinks[0].getAttribute('href') === '#/shopping');
check('kitchen: every link has an accessible name',
  kitLinks.every((a) => (a.getAttribute('aria-label') || a.textContent.trim()).length > 0));
check('kitchen: exactly one h1', kitMount.querySelectorAll('h1').length === 1);

// ================= Weekly plan =================
await closeAnySheet();
// Moved off the Meals screen onto its own page. These checks moved with it:
// a check that silently stops covering the thing it names is worse than no
// check, and this one failed loudly the moment the table left, which is
// exactly what it should do.
console.log('');
const planMount = window.document.createElement('main');
window.document.body.appendChild(planMount);
const planMod = await import(pathToFileURL(path.join(REPO, 'js/views/mealPlan.js')).href);
planMod.render(planMount, {});
await new Promise((r) => setTimeout(r, 80));

const planTable = planMount.querySelector('.plan-table');
check('the weekly plan is a real <table>', !!planTable && planTable.tagName === 'TABLE');
check('the plan table has a caption', !!planTable && !!planTable.querySelector('caption'));
const planThs = planTable ? [...planTable.querySelectorAll('th')] : [];
check(`all ${planThs.length} plan headers carry scope`, planThs.every((t) => t.getAttribute('scope')));
check('slots are column headers',
  !!planTable && planTable.querySelectorAll('thead th[scope="col"]').length === 5);
check('all 7 days are row headers',
  !!planTable && planTable.querySelectorAll('tbody th[scope="row"]').length === 7);
check('the grid is 7 days x 4 slots', !!planTable
  && planTable.querySelectorAll('tbody tr').length === 7
  && planTable.querySelectorAll('tbody tr')[0].querySelectorAll('td').length === 4);

const planAddBtns = planTable
  ? [...planTable.querySelectorAll('td button')].filter((b) => b.textContent.trim() === 'Add')
  : [];
check('every cell has an Add button', planAddBtns.length === 28, `found ${planAddBtns.length}`);
check('Add buttons name both the day and the meal time',
  planAddBtns.every((b) => { const l = (b.getAttribute('aria-label') || '').toLowerCase();
    return l.includes('add a meal to') && /monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(l)
      && /breakfast|lunch|dinner|snack/.test(l); }));

// A per-entry servings box must never read as the recipe's own default.
const overrideInput = planMount.querySelector('.plan-serves-input');
check('a planned meal can be re-served for this time only', !!overrideInput);
check('the servings box says it applies to this day and meal time',
  !!overrideInput && /on \w+day/i.test(
    (planMount.querySelector(`label[for="${overrideInput.id}"]`) || {}).textContent || ''));
// No colour-only meaning: an empty cell says so in words. The fixture
// plans one meal, so 27 of the 28 cells are empty.
check('empty plan cells say "Nothing planned" in text',
  planMount.querySelectorAll('.plan-empty').length === 27,
  `found ${planMount.querySelectorAll('.plan-empty').length}`);

check('weekly plan: exactly one h1', planMount.querySelectorAll('h1').length === 1);

// ================= Chores =================
await closeAnySheet();
console.log('');
const choMount = window.document.createElement('main');
window.document.body.appendChild(choMount);
const choMod = await import(pathToFileURL(path.join(REPO, 'js/views/chores.js')).href);
choMod.render(choMount, {});
await new Promise((r) => setTimeout(r, 120));

// Projects collapse. A hundred tasks in one list is the thing this replaces.
const choToggles = [...choMount.querySelectorAll('.project-toggle')];
check('chores: projects are collapsible', choToggles.length === 2);
check('chores: a project is collapsed until opened',
  choToggles.every((b) => b.getAttribute('aria-expanded') === 'false'));
check('chores: a project says how much is to do, not just its name',
  choToggles.some((b) => /to do/.test(b.getAttribute('aria-label') || '')));
check('chores: no task rows are rendered while every project is shut',
  choMount.querySelectorAll('.task-row').length === 0);

// The filter button must SAY how many filters are on, or hidden state is
// silent and a task looks like it has vanished.
const choFilterBtn = [...choMount.querySelectorAll('button')]
  .find((b) => /^Filter/.test(b.textContent));
check('chores: a filter control exists', !!choFilterBtn);
check('chores: with nothing filtered the button carries no count',
  !!choFilterBtn && choFilterBtn.textContent.trim() === 'Filter');

if (choToggles[0]) choToggles[0].dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 40));
const choRows = [...choMount.querySelectorAll('.task-row')];
check('chores: opening a project reveals its tasks', choRows.length === 2);
check('chores: only the open project renders rows',
  !choMount.textContent.includes('Fix the gate'));

// Cadence is derived from the rule and shown, so a filter by it makes sense.
check('chores: a task row states how often it repeats',
  /Daily/.test(choMount.textContent) && /Seasonally/.test(choMount.textContent));
check('chores: a task row states when it is due',
  /Due today|Was due|Next /.test(choMount.textContent));

// The tick is per OCCURRENCE. Its label has to name the date, or a repeating
// chore's "done" is ambiguous about what exactly was done.
const choTick = choMount.querySelector('.task-row .check-toggle');
check('chores: each row has a tick', !!choTick);
check('chores: the tick names the date it applies to',
  !!choTick && /\d{4}-\d{2}-\d{2}/.test(choTick.getAttribute('aria-label') || ''),
  'a repeating chore marked "done" must say done WHEN');
check('chores: the tick reports its state, not just its colour',
  !!choTick && choTick.getAttribute('aria-pressed') === 'false');

// Opening a task uses the same panel as everything else.
const choOpen = choMount.querySelector('.task-row-open');
if (choOpen) choOpen.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 30));
const choSheet = window.document.querySelector('.sheet[role="dialog"]');
check('chores: opening a task opens the panel', !!choSheet);
check('chores: the panel states the repeat in words',
  !!choSheet && /Every day/.test(choSheet.textContent));
if (choSheet) {
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
}

const choLevels = [...choMount.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
let choOrdered = true;
for (let i = 1; i < choLevels.length; i++) if (choLevels[i] - choLevels[i - 1] > 1) choOrdered = false;
check('chores: heading levels never skip', choOrdered, choLevels.join(','));
check('chores: exactly one h1', choMount.querySelectorAll('h1').length === 1);

// ================= Calendar =================
await closeAnySheet();
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
await closeAnySheet();
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

// ---- Phase 24: plan the week -------------------------------------------
// A guided flow is exactly where structure goes wrong: a heading that does
// not move, a Back button that traps you, a position nobody announces.
{
  const mod = await import(pathToFileURL(path.join(REPO, 'js/views/planWeek.js')).href);
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const teardown = mod.render(mount);
  await new Promise((r) => setTimeout(r, 30));

  check('plan-week: exactly one h1', mount.querySelectorAll('h1').length === 1);
  check('plan-week: the heading is focusable so focus can move to it on each step',
    mount.querySelector('h1').getAttribute('tabindex') === '-1');
  check('plan-week: position is stated in words',
    /step \d+ of \d+/i.test(mount.textContent));
  // A filling bar would be a guilt machine; position is a fact.
  check('plan-week: no progress bar element',
    mount.querySelector('progress, [role="progressbar"]') === null);
  check('plan-week: Back exists and is disabled on the first step',
    [...mount.querySelectorAll('button')].some((b) => b.textContent === 'Back' && b.disabled));
  check('plan-week: every step is skippable',
    [...mount.querySelectorAll('button')].some((b) => /skip/i.test(b.textContent)));
  // Leaving must not read as discarding: everything is written as it happens.
  check('plan-week: leaving is offered as a normal option, not a cancel',
    [...mount.querySelectorAll('button')].some((b) => /finish later/i.test(b.textContent))
    && ![...mount.querySelectorAll('button')].some((b) => /^cancel$/i.test(b.textContent)));

  if (typeof teardown === 'function') teardown();
  mount.remove();
}

// ---- Phase 26: icons and state badges ----------------------------------
// Moved here from the behaviour gate, which runs in plain node: these need
// a document. The rule that matters is WCAG 1.4.1 — meaning must never be
// carried by colour alone.
{
  const { icon, iconNames, stateBadge, countChip } = await import(`${REPO}/js/lib/icons.js`);

  check('icons: every named icon builds', iconNames().every((n) => icon(n) !== null));
  check('icons: an unknown name returns null rather than a broken box',
    icon('nope') === null);
  check('icons: an unlabelled icon is hidden from assistive tech',
    icon('scan').getAttribute('aria-hidden') === 'true');
  check('icons: a labelled icon is exposed as an image with a title',
    icon('scan', { label: 'Scan a barcode' }).getAttribute('role') === 'img'
    && icon('scan', { label: 'Scan a barcode' }).querySelector('title').textContent === 'Scan a barcode');
  check('icons: never focusable', icon('add').getAttribute('focusable') === 'false');

  // The four freshness states must be distinguishable in greyscale, which
  // is the real test of 1.4.1. Different colour is not enough.
  const shapes = ['fresh', 'soon', 'past', 'unknown'].map((n) => icon(n).innerHTML);
  check('icons: every freshness state is a DIFFERENT shape',
    new Set(shapes).size === 4,
    'colour alone fails WCAG 1.4.1');

  const badge = stateBadge('soon', 'Use within 3 days');
  check('state badge: carries its state class', badge.classList.contains('state-soon'));
  check('state badge: contains a shape', badge.querySelector('svg') !== null);
  check('state badge: contains the words too',
    badge.textContent.includes('Use within 3 days'),
    'shape alone is a puzzle; words alone is what we had');
  check('state badge: an unrecognised state falls back rather than vanishing',
    stateBadge('nonsense', 'Not recorded').classList.contains('state-unknown'));

  const chip = countChip(12, 'items not put away');
  check('count chip: shows the number', chip.textContent === '12');
  check('count chip: reads properly aloud',
    chip.getAttribute('aria-label') === '12 items not put away');
}

console.log('');

if (fails.length) { console.log(`A11Y STRUCTURE FAILED — ${fails.length}`); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log(`A11Y STRUCTURE PASSED — ${pass}/${pass} checks on the rendered DOM (dashboard, meals, foods, shopping, holidays, pantry, chores, calendar, health, kitchen)`);
