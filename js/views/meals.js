// js/views/meals.js — 21 Aug 2026 v5
// v5: foods carry a CATEGORY, set here for the first time (revision 3 added
// the column; nothing wrote it, so every food was 'food_ambient' and the
// value was dead weight).
//
// Two consequences, both about scale. A real kitchen has hundreds of
// ingredients and a flat <select> of hundreds is unusable one-handed:
//   * The ingredient picker FILTERS to edible categories, so shower gel is
//     never offered mid-recipe. That is what the column is for.
//   * It has a type-ahead box and <optgroup> headings, because at that size
//     you know the name and want to type three letters, not navigate.
// v4: ingredient quantity inputs used min="0.1" with step="1". HTML
// validity requires (value - min) % step === 0, so that permitted ONLY
// 0.1, 1.1, 2.1 ... and the browser rejected 100 with "the two nearest
// valid values are 99.1 and 100.1". Every round number was unenterable.
// step is now "any". Found on a real device; see Tests/a11y.mjs, which now
// checks this because jsdom does not run constraint validation and the
// interaction trace bypasses it by setting values directly.
// v3 (schema revision 4): ingredients carry a unit (g/ml/item), and foods
// carry optional ml->g and item->g conversion factors. An ingredient whose
// unit cannot be converted is reported with WHY, not just as a gap.
// v2, pre-smoke-test: (a) a typed barcode that cannot be normalised is now
// reported instead of being silently dropped to null on save; (b) focus is
// restored after an inline quantity or servings edit, which previously
// re-rendered the list and dropped focus to <body>.
// Replaces the Phase 2 stub, whole. Three sections on one screen: the
// weekly plan, meals and their ingredients, and foods.
//
// ---- Accessibility decisions worth stating ----
// The weekly plan is a GRID OF RELATIONSHIPS — "porridge" means nothing
// without "Monday" and "breakfast" — so it is a real <table> with
// <th scope="col"> for slots and <th scope="row"> for days, not divs. Days
// are rows and slots are columns because five columns fit a phone and
// eight do not. The table sits in a labelled, focusable scroll region so it
// stays reachable by keyboard when it does overflow.
//
// The scanner is a camera viewfinder and therefore conveys nothing without
// sight. The <video> is aria-hidden and a role="status" line carries the
// whole state — scanning, found, not found, camera refused. Manual entry is
// reachable without touching the scanner at all.
//
// Macro figures always carry their unit in text. Nothing is colour-coded.
//
// ---- No-shame framing (principle 1) ----
// A meal with missing nutrition data is reported as a fact — "2 of 5
// ingredients have no nutrition data" — not as an error, and never in a
// warning colour. An empty plan cell reads "nothing planned", not as a gap
// someone has failed to fill.

import {
  listFoods, listQueuedFoods, findByBarcode, createFood, updateFood,
  countFoodDependents, describeDependents, deleteFood,
  FOOD_CATEGORIES, isEdible, categoryLabel, groupByCategory
} from '../data/foods.js';
import {
  listMeals, listIngredients, groupByMeal, createMeal, updateMeal,
  countPlanEntries, countIngredients, deleteMeal,
  addIngredient, updateIngredient, removeIngredient,
  computeMacros, MACROS, INGREDIENT_UNITS, formatIngredientQuantity
} from '../data/meals.js';
import {
  DAYS, SLOTS, listPlan, groupByCell, addPlanEntry, updatePlanEntry,
  removePlanEntry, servesFor
} from '../data/mealPlan.js';
import { scan, isScanSupported, normaliseBarcode } from '../lib/barcode.js';
import { lookupBarcode } from '../lib/openFoodFacts.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';

// Local element helper. Deliberately defined here rather than copied in from
// another view — the 18 Aug ReferenceError came from moving a helper between
// files without checking the destination defined it.
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  children.forEach((child) => node.appendChild(child));
  return node;
}

function field(labelText, inputEl, hintEl) {
  const wrap = el('div', { class: 'field' });
  const label = el('label', { for: inputEl.id, text: labelText });
  wrap.append(label, inputEl);
  if (hintEl) wrap.appendChild(hintEl);
  return wrap;
}

function numberInput(id, { min = '0', step = 'any' } = {}) {
  return el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
}

/**
 * A food picker that stays usable at hundreds of ingredients.
 *
 * A type-ahead box narrows the list, and options are grouped by category
 * with <optgroup> so the native picker shows headings. `onlyEdible` keeps
 * non-food out of recipes.
 *
 * Returns { wrapper, select, refresh } — refresh() rebuilds from a new food
 * list without losing the current selection or the typed filter.
 */
function foodPicker(idPrefix, foods, { onlyEdible = true, blankLabel = 'Choose a food' } = {}) {
  const source = onlyEdible ? foods.filter(isEdible) : foods.slice();

  const filterInput = el('input', { id: `${idPrefix}-filter`, type: 'search', autocomplete: 'off' });
  filterInput.placeholder = 'Type to narrow the list';
  const select = el('select', { id: `${idPrefix}-select` });

  const count = el('p', { class: 'field-hint', id: `${idPrefix}-count`, role: 'status' });
  count.setAttribute('aria-live', 'polite');
  filterInput.setAttribute('aria-describedby', count.id);

  function build() {
    const term = filterInput.value.trim().toLowerCase();
    const chosen = select.value;
    const matching = term
      ? source.filter((f) => (f.name || '').toLowerCase().includes(term))
      : source;

    select.replaceChildren();
    select.appendChild(el('option', {
      value: '',
      text: source.length === 0 ? 'No foods yet' : (matching.length === 0 ? 'Nothing matches' : blankLabel)
    }));

    for (const group of groupByCategory(matching)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      for (const food of group.foods) {
        const option = el('option', { value: food.id, text: food.name });
        if (food.id === chosen) option.selected = true;
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }

    // Spoken, not just visual — the count is how a screen-reader user knows
    // the typed filter did anything at all.
    count.textContent = term
      ? `${matching.length} of ${source.length} foods match "${filterInput.value.trim()}".`
      : `${source.length} food${source.length === 1 ? '' : 's'}.`;
  }

  filterInput.addEventListener('input', build);
  build();

  const wrapper = el('div', { class: 'food-picker' });
  wrapper.append(
    field('Search foods', filterInput),
    count,
    field('Food', select)
  );
  return { wrapper, select, refresh: build };
}

function selectFrom(id, options, { includeBlank = null } = {}) {
  const select = el('select', { id });
  if (includeBlank !== null) {
    select.appendChild(el('option', { value: '', text: includeBlank }));
  }
  for (const option of options) {
    select.appendChild(el('option', { value: option.value, text: option.label }));
  }
  return select;
}

/**
 * Puts focus back on a control after a re-render has replaced it.
 * Ids are stable across renders, so the replacement is findable; the caret
 * is sent to the end so the user can keep typing.
 */
function restoreFocus(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.focus();
  if (typeof node.setSelectionRange === 'function' && node.type !== 'number') {
    const end = node.value.length;
    try { node.setSelectionRange(end, end); } catch { /* not all inputs allow it */ }
  }
}

/** "12.5 g" / "340 kcal" / "not known" — the unit is always in the text. */
function formatMacro(value, unit, known) {
  if (!known) return 'not known';
  return `${Math.round(Number(value) * 10) / 10} ${unit}`;
}

function labelForDay(value) {
  const found = DAYS.find((day) => day.value === value);
  return found ? found.label : value;
}

function labelForSlot(value) {
  const found = SLOTS.find((slot) => slot.value === value);
  return found ? found.label : value;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  // The scan currently running, so cleanup can release the camera.
  let scanController = null;
  let cameraRefused = false;

  let foods = [];
  let pendingFoods = [];
  let meals = [];
  let ingredientsByMeal = new Map();
  let planByCell = new Map();

  mountEl.appendChild(el('h1', { text: 'Meals' }));

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  mountEl.appendChild(offlineNote);

  function paintOfflineNote() {
    const off = isOffline();
    offlineNote.hidden = !off;
    if (off) {
      offlineNote.textContent =
        'You are offline. Foods you add will be saved on this device and uploaded later. '
        + 'Meals and the weekly plan need a connection, so those are paused for now.';
    }
  }

  // ================= Section: the weekly plan =================

  const planSection = el('section');
  planSection.appendChild(el('h2', { text: 'This week' }));
  planSection.appendChild(el('p', {
    class: 'field-hint',
    text: 'The same plan repeats each week until you change it. Days run down, meal times run across.'
  }));

  // A focusable, labelled scroll region: when the table is wider than the
  // screen it must still be reachable and scrollable from the keyboard.
  const planScroll = el('div', {
    class: 'plan-scroll',
    role: 'region',
    'aria-label': 'Weekly meal plan, scrollable',
    tabindex: '0'
  });
  const planTable = el('table', { class: 'plan-table' });
  planScroll.appendChild(planTable);
  planSection.appendChild(planScroll);

  const planFormWrap = el('div');
  planSection.appendChild(planFormWrap);

  function buildPlanTable() {
    planTable.replaceChildren();
    planTable.appendChild(el('caption', {
      class: 'sr-only',
      text: 'Weekly meal plan. Each row is a day of the week, each column a meal time.'
    }));

    const thead = el('thead');
    const headRow = el('tr');
    // The corner cell heads the row-header column, so it is a real header.
    headRow.appendChild(el('th', { scope: 'col', text: 'Day' }));
    for (const slot of SLOTS) {
      headRow.appendChild(el('th', { scope: 'col', text: slot.label }));
    }
    thead.appendChild(headRow);
    planTable.appendChild(thead);

    const tbody = el('tbody');
    for (const day of DAYS) {
      const row = el('tr');
      row.appendChild(el('th', { scope: 'row', text: day.label }));
      for (const slot of SLOTS) {
        row.appendChild(buildPlanCell(day, slot));
      }
      tbody.appendChild(row);
    }
    planTable.appendChild(tbody);
  }

  function buildPlanCell(day, slot) {
    const cell = el('td');
    const entries = planByCell.get(`${day.value}:${slot.value}`) || [];

    if (entries.length === 0) {
      // Stated as a fact, not as a gap someone failed to fill.
      cell.appendChild(el('p', { class: 'plan-empty', text: 'Nothing planned' }));
    } else {
      const list = el('ul', { class: 'plan-entries' });
      for (const entry of entries) {
        list.appendChild(buildPlanEntry(entry, day, slot));
      }
      cell.appendChild(list);
    }

    const addBtn = el('button', { type: 'button', class: 'btn btn-small', text: 'Add' });
    addBtn.setAttribute('aria-label', `Add a meal to ${day.label} ${slot.label.toLowerCase()}`);
    addBtn.addEventListener('click', () => {
      planDaySelect.value = day.value;
      planSlotSelect.value = slot.value;
      planMealSelect.focus();
      announce(`Adding a meal to ${day.label} ${slot.label.toLowerCase()}. Choose a meal below.`);
    }, { signal });
    cell.appendChild(addBtn);

    return cell;
  }

  function buildPlanEntry(entry, day, slot) {
    const item = el('li', { class: 'plan-entry' });
    const meal = entry.meals || entry.meal || {};
    const mealName = meal.name || 'Meal';
    const serves = servesFor(entry);
    const overridden = entry.serves_override !== null && entry.serves_override !== undefined;

    item.appendChild(el('span', { class: 'plan-entry-name', text: mealName }));
    item.appendChild(el('span', {
      class: 'plan-entry-serves',
      text: `Serves ${serves}${overridden ? ' (this one only)' : ''}`
    }));

    const servesInput = el('input', {
      id: `plan-serves-${entry.id}`,
      type: 'number',
      min: '1',
      step: '1',
      inputmode: 'numeric',
      class: 'plan-serves-input'
    });
    servesInput.value = overridden ? String(entry.serves_override) : '';
    servesInput.placeholder = String(meal.default_serves || 1);
    const servesLabel = el('label', {
      for: servesInput.id,
      class: 'sr-only',
      text: `Servings for ${mealName} on ${day.label} ${slot.label.toLowerCase()}. `
        + `Leave blank to use the meal's usual ${meal.default_serves || 1}.`
    });
    item.append(servesLabel, servesInput);

    servesInput.addEventListener('change', async () => {
      // serves_override is per-entry and must never touch meals.default_serves.
      const result = await updatePlanEntry(entry.id, { serves_override: servesInput.value });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update servings:', result.error);
        showToast("Couldn't change the servings — check your connection and try again.");
        return;
      }
      announce(`Servings updated for ${mealName}.`);
      // loadPlan() rebuilds the whole table, destroying the input the user
      // is standing in and dropping focus to <body>. Ids are stable, so put
      // focus back where it was (WCAG 3.2.2 — a change of setting must not
      // disorientate).
      await loadPlan();
      if (!destroyed) restoreFocus(`plan-serves-${entry.id}`);
    }, { signal });

    const removeBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Remove' });
    removeBtn.setAttribute(
      'aria-label',
      `Remove ${mealName} from ${day.label} ${slot.label.toLowerCase()}`
    );
    removeBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${mealName}?`,
        message: `This takes it off ${day.label} ${slot.label.toLowerCase()}. The meal itself is kept.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removePlanEntry(entry.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove a plan entry:', result.error);
        showToast("Couldn't remove that — check your connection and try again.");
        return;
      }
      announce(`${mealName} removed from ${day.label} ${slot.label.toLowerCase()}.`);
      await loadPlan();
    }, { signal });
    item.appendChild(removeBtn);

    return item;
  }

  // ---- Add-to-plan form ----
  // One form under the table rather than 28 inline ones. Day and slot are
  // <select> because both columns carry CHECK constraints (standing rule 1).
  const planForm = el('form');
  planForm.setAttribute('aria-label', 'Add a meal to the weekly plan');

  const planDaySelect = selectFrom('plan-day', DAYS.map((day) => ({ value: day.value, label: day.label })));
  const planSlotSelect = selectFrom('plan-slot', SLOTS.map((slot) => ({ value: slot.value, label: slot.label })));
  const planMealSelect = selectFrom('plan-meal', [], { includeBlank: 'Choose a meal' });
  const planServesInput = numberInput('plan-serves-new', { min: '1', step: '1' });
  const planServesHint = el('p', {
    class: 'field-hint',
    id: 'plan-serves-new-hint',
    text: "Leave blank to use the meal's usual servings."
  });
  planServesInput.setAttribute('aria-describedby', 'plan-serves-new-hint');

  const planError = el('p', { class: 'field-error', id: 'plan-error', role: 'alert' });
  planError.hidden = true;

  const planSubmit = el('button', {
    type: 'submit', class: 'btn btn-primary btn-block', text: 'Add to plan'
  });

  planForm.append(
    el('h3', { text: 'Add a meal to the plan' }),
    field('Day', planDaySelect),
    field('Meal time', planSlotSelect),
    field('Meal', planMealSelect),
    field('Servings for this one time (optional)', planServesInput, planServesHint),
    planError,
    planSubmit
  );
  planFormWrap.appendChild(planForm);

  planForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    planError.hidden = true;
    if (!planMealSelect.value) {
      planError.textContent =
        'Choose a meal to add. If the list is empty, add a meal further down this page first.';
      planError.hidden = false;
      planMealSelect.focus();
      return;
    }
    const mealName = planMealSelect.options[planMealSelect.selectedIndex].textContent;
    planSubmit.disabled = true;
    const result = await addPlanEntry({
      meal_id: planMealSelect.value,
      day_of_week: planDaySelect.value,
      slot: planSlotSelect.value,
      serves_override: planServesInput.value
    });
    planSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to add a plan entry:', result.error);
      planError.textContent = isOffline()
        ? 'The weekly plan needs a connection. This will work once you are back online.'
        : "Couldn't add that to the plan — try again.";
      planError.hidden = false;
      return;
    }
    announce(`${mealName} added to ${labelForDay(planDaySelect.value)} `
      + `${labelForSlot(planSlotSelect.value).toLowerCase()}.`);
    planServesInput.value = '';
    await loadPlan();
  }, { signal });

  // ================= Section: meals =================

  const mealsSection = el('section');
  mealsSection.appendChild(el('h2', { text: 'Meals' }));
  const mealsList = el('div', { class: 'card-list' });
  mealsSection.appendChild(mealsList);

  const addMealForm = el('form');
  addMealForm.setAttribute('aria-label', 'Add a meal');
  const mealNameInput = el('input', { id: 'new-meal-name', type: 'text' });
  mealNameInput.required = true;
  const mealServesInput = numberInput('new-meal-serves', { min: '1', step: '1' });
  mealServesInput.value = '4';
  mealServesInput.required = true;
  const mealFormError = el('p', { class: 'field-error', id: 'new-meal-error', role: 'alert' });
  mealFormError.hidden = true;
  const mealSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Add meal' });

  addMealForm.append(
    el('h3', { text: 'Add a meal' }),
    field('Meal name', mealNameInput),
    field('Usually serves', mealServesInput),
    mealFormError,
    mealSubmit
  );
  mealsSection.appendChild(addMealForm);

  addMealForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    mealFormError.hidden = true;
    if (!mealNameInput.value.trim()) {
      mealFormError.textContent = 'Give the meal a name.';
      mealFormError.hidden = false;
      mealNameInput.focus();
      return;
    }
    mealSubmit.disabled = true;
    const result = await createMeal({
      name: mealNameInput.value,
      default_serves: mealServesInput.value
    });
    mealSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to create a meal:', result.error);
      mealFormError.textContent = isOffline()
        ? 'Meals need a connection to save. This will work once you are back online.'
        : (result.error && result.error.message) || "Couldn't save that meal — try again.";
      mealFormError.hidden = false;
      return;
    }
    addMealForm.reset();
    mealServesInput.value = '4';
    announce(`${result.data.name} added.`);
    await loadMeals();
  }, { signal });

  function buildMealCard(meal) {
    const { article, body, actions } = createCard({
      title: meal.name, headingLevel: 3, className: 'meal-card'
    });
    article.dataset.mealId = meal.id;

    const rows = ingredientsByMeal.get(meal.id) || [];
    const macros = computeMacros(rows, { serves: meal.default_serves });

    body.appendChild(el('p', {
      class: 'chip',
      text: `Serves ${meal.default_serves} · ${rows.length} ingredient${rows.length === 1 ? '' : 's'}`
    }));

    // ---- Macros, as a real table with units in the text ----
    const macroTable = el('table', { class: 'data-table' });
    macroTable.appendChild(el('caption', {
      text: `Nutrition for ${meal.name}, whole meal and per serving`
    }));
    const macroHead = el('thead');
    const macroHeadRow = el('tr');
    macroHeadRow.append(
      el('th', { scope: 'col', text: 'Nutrient' }),
      el('th', { scope: 'col', text: 'Whole meal' }),
      el('th', { scope: 'col', text: `Per serving (of ${macros.serves})` })
    );
    macroHead.appendChild(macroHeadRow);
    macroTable.appendChild(macroHead);

    const macroBody = el('tbody');
    for (const macro of MACROS) {
      const tr = el('tr');
      tr.append(
        el('th', { scope: 'row', text: macro.label }),
        el('td', { text: formatMacro(macros.totals[macro.key], macro.unit, macros.complete[macro.key]) }),
        el('td', { text: formatMacro(macros.perServing[macro.key], macro.unit, macros.complete[macro.key]) })
      );
      macroBody.appendChild(tr);
    }
    macroTable.appendChild(macroBody);
    body.appendChild(macroTable);

    // Incomplete is stated plainly. A missing macro is never rounded to zero.
    if (rows.length === 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'No ingredients yet, so there is nothing to add up.'
      }));
    } else if (macros.incompleteCount > 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: `${macros.incompleteCount} of ${macros.ingredientCount} ingredient`
          + `${macros.ingredientCount === 1 ? '' : 's'} `
          + `${macros.incompleteCount === 1 ? 'is' : 'are'} not counted here `
          + `(${macros.incompleteNames.join(', ')}), so these figures are incomplete rather than final.`
      }));
      // Say WHAT to fill in, not just that something is missing.
      for (const gap of macros.unconvertible) {
        body.appendChild(el('p', {
          class: 'field-hint',
          text: `${gap.name} is measured in ${gap.unit === 'item' ? 'items' : gap.unit}, but `
            + `${gap.reason}. Add it on that food to include it in these totals.`
        }));
      }
    }

    if (rows.length > 0) {
      const list = el('ul', { class: 'ingredient-list' });
      for (const row of rows) list.appendChild(buildIngredientRow(meal, row));
      body.appendChild(list);
    }

    body.appendChild(buildAddIngredientForm(meal));

    const editWrap = el('div');
    body.appendChild(editWrap);

    const editBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false' });
    editBtn.textContent = `Edit ${meal.name}`;
    editBtn.addEventListener('click', () => {
      const open = editBtn.getAttribute('aria-expanded') === 'true';
      if (open) {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${meal.name}`;
        return;
      }
      editWrap.replaceChildren(buildMealEditForm(meal, () => {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${meal.name}`;
      }));
      editBtn.setAttribute('aria-expanded', 'true');
      editBtn.textContent = `Close the edit form for ${meal.name}`;
    }, { signal });
    actions.appendChild(editBtn);

    const deleteBtn = el('button', { type: 'button', class: 'btn btn-danger' });
    deleteBtn.textContent = `Delete ${meal.name}`;
    deleteBtn.addEventListener('click', () => onDeleteMeal(meal), { signal });
    actions.appendChild(deleteBtn);

    return article;
  }

  function buildIngredientRow(meal, row) {
    const item = el('li', { class: 'ingredient-row' });
    const food = row.foods || {};
    const name = food.name || 'Unknown food';

    item.appendChild(el('span', { class: 'ingredient-name', text: name }));

    const qtyInput = numberInput(`ingredient-qty-${row.id}`, { min: '0.1', step: 'any' });
    qtyInput.value = String(row.quantity_g);
    const qtyLabel = el('label', {
      for: qtyInput.id,
      class: 'sr-only',
      text: `Quantity of ${name} in ${meal.name}`
    });
    const unitSelect = selectFrom(
      `ingredient-unit-${row.id}`,
      INGREDIENT_UNITS.map((u) => ({ value: u.value, label: u.short }))
    );
    unitSelect.value = row.unit || 'g';
    unitSelect.className = 'ingredient-unit-select';
    const unitLabel = el('label', {
      for: unitSelect.id,
      class: 'sr-only',
      text: `Unit for ${name} in ${meal.name}`
    });
    item.append(qtyLabel, qtyInput, unitLabel, unitSelect);

    unitSelect.addEventListener('change', async () => {
      const result = await updateIngredient(row.id, { unit: unitSelect.value });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update an ingredient unit:', result.error);
        showToast((result.error && result.error.message) || "Couldn't change that unit — try again.");
        unitSelect.value = row.unit || 'g';
        return;
      }
      announce(`${name} now measured in ${result.data.unit}.`);
      await loadMeals();
      if (!destroyed) restoreFocus(`ingredient-unit-${row.id}`);
    }, { signal });

    qtyInput.addEventListener('change', async () => {
      const result = await updateIngredient(row.id, { quantity_g: qtyInput.value });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update an ingredient:', result.error);
        showToast((result.error && result.error.message) || "Couldn't change that quantity — try again.");
        qtyInput.value = String(row.quantity_g);
        return;
      }
      announce(`${name} set to ${formatIngredientQuantity(result.data.quantity_g, result.data.unit)}.`);
      // Same reasoning as the plan servings input: the re-render destroys
      // this field, so focus is put back on its replacement.
      await loadMeals();
      if (!destroyed) restoreFocus(`ingredient-qty-${row.id}`);
    }, { signal });

    const removeBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Remove' });
    removeBtn.setAttribute('aria-label', `Remove ${name} from ${meal.name}`);
    removeBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${name}?`,
        message: `This takes it out of ${meal.name}. The food itself is kept.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removeIngredient(row.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove an ingredient:', result.error);
        showToast("Couldn't remove that ingredient — try again.");
        return;
      }
      announce(`${name} removed from ${meal.name}.`);
      await loadMeals();
    }, { signal });
    item.appendChild(removeBtn);

    return item;
  }

  function buildAddIngredientForm(meal) {
    const form = el('form', { class: 'add-ingredient' });
    form.setAttribute('aria-label', `Add an ingredient to ${meal.name}`);

    // Synced foods only: a food still in the offline queue has no real id,
    // so meal_ingredients.food_id could not point at it. Filtered to edible
    // categories, grouped, and searchable — see foodPicker().
    const picker = foodPicker(`add-ingredient-${meal.id}`, foods, { onlyEdible: true });
    const foodSelect = picker.select;
    const qtyInput = numberInput(`add-ingredient-qty-${meal.id}`, { min: '0.1', step: 'any' });
    // A CHECK-constrained column, so a constrained control, never free text
    // (standing rule 1).
    const unitSelect = selectFrom(
      `add-ingredient-unit-${meal.id}`,
      INGREDIENT_UNITS.map((u) => ({ value: u.value, label: u.label }))
    );
    const error = el('p', { class: 'field-error', id: `add-ingredient-error-${meal.id}`, role: 'alert' });
    error.hidden = true;
    const submit = el('button', { type: 'submit', class: 'btn', text: 'Add ingredient' });

    form.append(
      picker.wrapper,
      field('Quantity', qtyInput),
      field('Measured in', unitSelect),
      error,
      submit
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      if (!foodSelect.value) {
        const edibleCount = foods.filter(isEdible).length;
        error.textContent = edibleCount === 0
          ? 'No foods to add yet. Add one further down this page, and give it a food category.'
          : 'Choose a food to add.';
        error.hidden = false;
        foodSelect.focus();
        return;
      }
      const foodName = foodSelect.options[foodSelect.selectedIndex].textContent;
      submit.disabled = true;
      const result = await addIngredient({
        meal_id: meal.id,
        food_id: foodSelect.value,
        quantity_g: qtyInput.value,
        unit: unitSelect.value
      });
      submit.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to add an ingredient:', result.error);
        error.textContent = isOffline()
          ? 'Ingredients need a connection to save. This will work once you are back online.'
          : (result.error && result.error.message) || "Couldn't add that ingredient — try again.";
        error.hidden = false;
        return;
      }
      announce(`${foodName} added to ${meal.name}.`);
      await loadMeals();
    }, { signal });

    return form;
  }

  function buildMealEditForm(meal, onDone) {
    const form = el('form');
    form.setAttribute('aria-label', `Edit ${meal.name}`);
    const nameInput = el('input', { id: `edit-meal-name-${meal.id}`, type: 'text' });
    nameInput.value = meal.name;
    const servesInput = numberInput(`edit-meal-serves-${meal.id}`, { min: '1', step: '1' });
    servesInput.value = String(meal.default_serves);
    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;

    const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save changes' });
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
    cancel.addEventListener('click', () => onDone(), { signal });

    form.append(
      field('Meal name', nameInput),
      field('Usually serves', servesInput),
      error,
      el('div', { class: 'card-actions' }, [save, cancel])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      save.disabled = true;
      const result = await updateMeal(meal.id, {
        name: nameInput.value,
        default_serves: servesInput.value
      });
      save.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update a meal:', result.error);
        error.textContent = (result.error && result.error.message) || "Couldn't save those changes — try again.";
        error.hidden = false;
        return;
      }
      announce(`${result.data.name} updated.`);
      onDone();
      await loadMeals();
    }, { signal });

    return form;
  }

  async function onDeleteMeal(meal) {
    const [planCount, ingredientCount] = await Promise.all([
      countPlanEntries(meal.id),
      countIngredients(meal.id)
    ]);
    if (destroyed) return;
    if (!planCount.ok || !ingredientCount.ok) {
      console.error('Failed to count what depends on a meal:', planCount.error || ingredientCount.error);
      showToast("Couldn't check what this meal is used in — try again.");
      return;
    }

    // weekly_meal_plan.meal_id is ON DELETE RESTRICT, so the database will
    // refuse. The count is reported BEFORE the attempt rather than as a raw
    // foreign-key error afterwards (schema.md §2).
    if (planCount.data > 0) {
      await confirmDialog({
        title: `${meal.name} is in the weekly plan`,
        message: `It is planned ${planCount.data} time${planCount.data === 1 ? '' : 's'} this week. `
          + 'Take it off the plan first, then it can be deleted.',
        confirmLabel: 'OK',
        cancelLabel: 'Close'
      });
      return;
    }

    // meal_ingredients CASCADE with the meal, so the confirm names what else goes.
    const cascadeNote = ingredientCount.data > 0
      ? ` This also removes its ${ingredientCount.data} ingredient`
        + `${ingredientCount.data === 1 ? '' : 's'} (the foods themselves are kept).`
      : '';
    const confirmed = await confirmDialog({
      title: `Delete ${meal.name}?`,
      message: `This can't be undone.${cascadeNote}`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!confirmed || destroyed) return;

    const result = await deleteMeal(meal.id);
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to delete a meal:', result.error);
      showToast("Couldn't delete that meal — check your connection and try again.");
      return;
    }
    announce(`${meal.name} deleted.`);
    await loadMeals();
    if (!destroyed) await loadPlan();
  }

  // ================= Section: foods =================

  const foodsSection = el('section');
  foodsSection.appendChild(el('h2', { text: 'Foods' }));

  const scanWrap = el('div', { class: 'scan-actions' });
  const scanBtn = el('button', {
    type: 'button', class: 'btn btn-primary btn-block', text: 'Scan a barcode'
  });
  const scanNote = el('p', { class: 'field-hint' });
  scanNote.hidden = true;
  scanWrap.append(scanBtn, scanNote);
  if (!isScanSupported()) {
    scanBtn.hidden = true;
    scanNote.hidden = false;
    scanNote.textContent = 'This browser cannot use the camera, so add foods with the form below.';
  }
  foodsSection.appendChild(scanWrap);

  const foodsList = el('div', { class: 'card-list' });
  foodsSection.appendChild(foodsList);

  const pendingWrap = el('div');
  foodsSection.appendChild(pendingWrap);

  // ---- Manual food form, always reachable without scanning ----
  const foodDetails = el('details', { class: 'food-form' });
  foodDetails.appendChild(el('summary', { text: 'Add a food by hand' }));
  const foodForm = el('form');
  foodForm.setAttribute('aria-label', 'Add a food');

  const foodNameInput = el('input', { id: 'new-food-name', type: 'text' });
  const foodBarcodeInput = el('input', { id: 'new-food-barcode', type: 'text', inputmode: 'numeric' });
  const foodBarcodeHint = el('p', {
    class: 'field-hint', id: 'new-food-barcode-hint', text: 'Optional. Filled in for you after a scan.'
  });
  foodBarcodeInput.setAttribute('aria-describedby', 'new-food-barcode-hint');

  // A CHECK-constrained column, so a constrained control (standing rule 1).
  // Placed high: it decides whether this thing can ever be an ingredient.
  const foodCategorySelect = selectFrom(
    'new-food-category',
    FOOD_CATEGORIES.map((c) => ({ value: c.value, label: c.hint ? `${c.label} — ${c.hint}` : c.label }))
  );
  foodCategorySelect.value = 'food_ambient';
  const foodCategoryHint = el('p', {
    class: 'field-hint', id: 'new-food-category-hint',
    text: 'Only food and drink can be added to a recipe. Everything else is for the shopping list.'
  });
  foodCategorySelect.setAttribute('aria-describedby', 'new-food-category-hint');

  const macroFieldset = el('fieldset');
  macroFieldset.appendChild(el('legend', { text: 'Nutrition per 100 g (optional)' }));
  macroFieldset.appendChild(el('p', {
    class: 'field-hint',
    text: 'Leave anything you do not know blank. A blank stays blank — it is never counted as zero.'
  }));
  const caloriesInput = numberInput('new-food-calories');
  const proteinInput = numberInput('new-food-protein');
  const fatInput = numberInput('new-food-fat');
  const carbsInput = numberInput('new-food-carbs');
  macroFieldset.append(
    field('Calories (kcal)', caloriesInput),
    field('Protein (g)', proteinInput),
    field('Fat (g)', fatInput),
    field('Carbohydrate (g)', carbsInput)
  );

  // Optional conversion factors. Without these an ingredient measured in ml
  // or items cannot reach the per-100 g nutrition figures, so its macros are
  // reported as incomplete rather than guessed.
  const convertFieldset = el('fieldset');
  convertFieldset.appendChild(el('legend', { text: 'Measuring it another way (optional)' }));
  convertFieldset.appendChild(el('p', {
    class: 'field-hint',
    text: 'Only needed if you use this in a recipe by volume or by count. '
      + 'Leave blank if you always weigh it.'
  }));
  const perMlInput = numberInput('new-food-per-ml');
  const perItemInput = numberInput('new-food-per-item');
  const perMlHint = el('p', {
    class: 'field-hint', id: 'new-food-per-ml-hint',
    text: 'Milk is about 1.03, oil about 0.92, water is 1.'
  });
  perMlInput.setAttribute('aria-describedby', 'new-food-per-ml-hint');
  const perItemHint = el('p', {
    class: 'field-hint', id: 'new-food-per-item-hint',
    text: 'One egg is about 60 g, one onion about 150 g.'
  });
  perItemInput.setAttribute('aria-describedby', 'new-food-per-item-hint');
  convertFieldset.append(
    field('Grams per millilitre', perMlInput, perMlHint),
    field('Grams per item', perItemInput, perItemHint)
  );

  const foodSourceNote = el('p', { class: 'field-hint' });
  foodSourceNote.hidden = true;
  let pendingSource = 'manual';

  const foodError = el('p', { class: 'field-error', id: 'new-food-error', role: 'alert' });
  foodError.hidden = true;
  const foodSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Save food' });

  foodForm.append(
    field('Food name', foodNameInput),
    field('Barcode', foodBarcodeInput, foodBarcodeHint),
    field('What kind of thing is it?', foodCategorySelect, foodCategoryHint),
    macroFieldset,
    convertFieldset,
    foodSourceNote,
    foodError,
    foodSubmit
  );
  foodDetails.appendChild(foodForm);
  foodsSection.appendChild(foodDetails);

  function resetFoodForm() {
    foodForm.reset();
    foodCategorySelect.value = 'food_ambient';
    pendingSource = 'manual';
    foodSourceNote.hidden = true;
    foodSourceNote.textContent = '';
    foodError.hidden = true;
  }

  /** Opens the manual form with whatever the scan and lookup managed to find. */
  function prefillFoodForm({ barcode = '', food = null, note = '' } = {}) {
    foodDetails.open = true;
    foodBarcodeInput.value = barcode;
    foodNameInput.value = food ? (food.name || '') : '';
    caloriesInput.value = food && food.calories_per_100g != null ? food.calories_per_100g : '';
    proteinInput.value = food && food.protein_g != null ? food.protein_g : '';
    fatInput.value = food && food.fat_g != null ? food.fat_g : '';
    carbsInput.value = food && food.carbs_g != null ? food.carbs_g : '';
    perMlInput.value = food && food.grams_per_ml != null ? food.grams_per_ml : '';
    perItemInput.value = food && food.grams_per_item != null ? food.grams_per_item : '';
    foodCategorySelect.value = (food && food.category) || 'food_ambient';
    pendingSource = food && food.source === 'openfoodfacts' ? 'openfoodfacts' : 'manual';

    if (note) {
      foodSourceNote.textContent = note;
      foodSourceNote.hidden = false;
      announce(note);
    } else {
      foodSourceNote.hidden = true;
    }
    foodNameInput.focus();
  }

  foodForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    foodError.hidden = true;
    if (!foodNameInput.value.trim()) {
      foodError.textContent = 'Give the food a name.';
      foodError.hidden = false;
      foodNameInput.focus();
      return;
    }
    // createFood() stores an unusable barcode as null, because an empty
    // string would be a distinct value and would break barcode matching.
    // That is right for the database and WRONG to do silently: typing a
    // barcode and watching it disappear on save is a silent failure
    // (standing rule 8). Caught here so the user is told instead.
    const typedBarcode = foodBarcodeInput.value.trim();
    if (typedBarcode && !normaliseBarcode(typedBarcode)) {
      foodError.textContent =
        'That barcode does not look right, so it has not been saved. '
        + 'Product barcodes are 8, 12 or 13 digits — check it, or clear the '
        + 'box to save this food without one.';
      foodError.hidden = false;
      foodBarcodeInput.focus();
      return;
    }
    foodSubmit.disabled = true;
    const result = await createFood({
      name: foodNameInput.value,
      barcode: foodBarcodeInput.value,
      category: foodCategorySelect.value,
      calories_per_100g: caloriesInput.value,
      protein_g: proteinInput.value,
      fat_g: fatInput.value,
      carbs_g: carbsInput.value,
      grams_per_ml: perMlInput.value,
      grams_per_item: perItemInput.value,
      source: pendingSource
    });
    foodSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to save a food:', result.error);
      foodError.textContent = (result.error && result.error.message) || "Couldn't save that food — try again.";
      foodError.hidden = false;
      return;
    }
    const savedName = result.data.name;
    resetFoodForm();
    if (result.queued) {
      showToast("Saved on this device — it will upload when you're back online, "
        + 'and can be used in a meal once it has.');
      announce(`${savedName} saved on this device.`);
    } else {
      announce(`${savedName} saved.`);
    }
    await loadFoods();
  }, { signal });

  function buildFoodCard(food) {
    const { article, body, actions } = createCard({
      // h4: the card sits under a category h3, which sits under the
      // "Foods" h2. A sibling h3 would misdescribe the nesting.
      title: food.name, headingLevel: 4, className: 'food-card'
    });
    article.dataset.foodId = food.id;

    if (food.barcode) {
      body.appendChild(el('p', { class: 'field-hint', text: `Barcode ${food.barcode}` }));
    }
    body.appendChild(el('p', {
      class: 'chip',
      text: `${categoryLabel(food.category)} · ${food.source === 'openfoodfacts' ? 'From Open Food Facts' : 'Added by hand'}`
    }));
    if (!isEdible(food)) {
      // Stated plainly rather than left to be discovered by its absence.
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'Not food, so it will not be offered as a recipe ingredient.'
      }));
    }

    const macroList = el('ul', { class: 'macro-list' });
    const perHundred = [
      { label: 'Calories', value: food.calories_per_100g, unit: 'kcal' },
      { label: 'Protein', value: food.protein_g, unit: 'g' },
      { label: 'Fat', value: food.fat_g, unit: 'g' },
      { label: 'Carbohydrate', value: food.carbs_g, unit: 'g' }
    ];
    for (const macro of perHundred) {
      const known = macro.value !== null && macro.value !== undefined;
      macroList.appendChild(el('li', {
        text: `${macro.label} per 100 g: ${known ? `${macro.value} ${macro.unit}` : 'not known'}`
      }));
    }
    body.appendChild(macroList);

    const conversions = [];
    if (food.grams_per_ml != null) conversions.push(`1 ml weighs ${food.grams_per_ml} g`);
    if (food.grams_per_item != null) conversions.push(`1 item weighs ${food.grams_per_item} g`);
    if (conversions.length > 0) {
      body.appendChild(el('p', { class: 'field-hint', text: conversions.join(' · ') }));
    }

    const editWrap = el('div');
    body.appendChild(editWrap);

    const editBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false' });
    editBtn.textContent = `Edit ${food.name}`;
    editBtn.addEventListener('click', () => {
      const open = editBtn.getAttribute('aria-expanded') === 'true';
      if (open) {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${food.name}`;
        return;
      }
      editWrap.replaceChildren(buildFoodEditForm(food, () => {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${food.name}`;
      }));
      editBtn.setAttribute('aria-expanded', 'true');
      editBtn.textContent = `Close the edit form for ${food.name}`;
    }, { signal });
    actions.appendChild(editBtn);

    const deleteBtn = el('button', { type: 'button', class: 'btn btn-danger' });
    deleteBtn.textContent = `Delete ${food.name}`;
    deleteBtn.addEventListener('click', () => onDeleteFood(food), { signal });
    actions.appendChild(deleteBtn);

    return article;
  }

  function buildFoodEditForm(food, onDone) {
    const form = el('form');
    form.setAttribute('aria-label', `Edit ${food.name}`);
    const prefix = `edit-food-${food.id}`;

    const nameInput = el('input', { id: `${prefix}-name`, type: 'text' });
    nameInput.value = food.name;
    const barcodeInput = el('input', { id: `${prefix}-barcode`, type: 'text', inputmode: 'numeric' });
    barcodeInput.value = food.barcode || '';

    const categorySelect = selectFrom(
      `${prefix}-category`,
      FOOD_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
    );
    categorySelect.value = food.category || 'food_ambient';

    const set = el('fieldset');
    set.appendChild(el('legend', { text: 'Nutrition per 100 g' }));
    const cal = numberInput(`${prefix}-calories`);
    const pro = numberInput(`${prefix}-protein`);
    const fat = numberInput(`${prefix}-fat`);
    const carb = numberInput(`${prefix}-carbs`);
    cal.value = food.calories_per_100g != null ? food.calories_per_100g : '';
    pro.value = food.protein_g != null ? food.protein_g : '';
    fat.value = food.fat_g != null ? food.fat_g : '';
    carb.value = food.carbs_g != null ? food.carbs_g : '';
    set.append(
      field('Calories (kcal)', cal),
      field('Protein (g)', pro),
      field('Fat (g)', fat),
      field('Carbohydrate (g)', carb)
    );

    const convSet = el('fieldset');
    convSet.appendChild(el('legend', { text: 'Measuring it another way (optional)' }));
    const perMl = numberInput(`${prefix}-per-ml`);
    const perItem = numberInput(`${prefix}-per-item`);
    perMl.value = food.grams_per_ml != null ? food.grams_per_ml : '';
    perItem.value = food.grams_per_item != null ? food.grams_per_item : '';
    convSet.append(
      field('Grams per millilitre', perMl),
      field('Grams per item', perItem)
    );

    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;
    const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save changes' });
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
    cancel.addEventListener('click', () => onDone(), { signal });

    form.append(
      field('Food name', nameInput),
      field('Barcode', barcodeInput),
      field('What kind of thing is it?', categorySelect),
      set,
      convSet,
      error,
      el('div', { class: 'card-actions' }, [save, cancel])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      const typed = barcodeInput.value.trim();
      if (typed && !normaliseBarcode(typed)) {
        error.textContent =
          'That barcode does not look right, so nothing has been changed. '
          + 'Product barcodes are 8, 12 or 13 digits — check it, or clear '
          + 'the box to save without one.';
        error.hidden = false;
        barcodeInput.focus();
        return;
      }
      save.disabled = true;
      const result = await updateFood(food.id, {
        name: nameInput.value,
        barcode: barcodeInput.value,
        category: categorySelect.value,
        calories_per_100g: cal.value,
        protein_g: pro.value,
        fat_g: fat.value,
        carbs_g: carb.value,
        grams_per_ml: perMl.value,
        grams_per_item: perItem.value
      });
      save.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update a food:', result.error);
        error.textContent = (result.error && result.error.message) || "Couldn't save those changes — try again.";
        error.hidden = false;
        return;
      }
      announce(`${result.data.name} updated.`);
      onDone();
      await loadFoods();
      if (!destroyed) await loadMeals();
    }, { signal });

    return form;
  }

  async function onDeleteFood(food) {
    const counts = await countFoodDependents(food.id);
    if (destroyed) return;
    if (!counts.ok) {
      console.error('Failed to count what depends on a food:', counts.error);
      showToast("Couldn't check what this food is used in — try again.");
      return;
    }
    if (counts.data.total > 0) {
      // All three of these relationships are ON DELETE RESTRICT, so the
      // database refuses regardless — say what is in the way, first.
      await confirmDialog({
        title: `${food.name} is still in use`,
        message: `It is used in ${describeDependents(counts.data)}. `
          + 'Remove it from those first, then it can be deleted.',
        confirmLabel: 'OK',
        cancelLabel: 'Close'
      });
      return;
    }
    const confirmed = await confirmDialog({
      title: `Delete ${food.name}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!confirmed || destroyed) return;
    const result = await deleteFood(food.id);
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to delete a food:', result.error);
      showToast("Couldn't delete that food — check your connection and try again.");
      return;
    }
    announce(`${food.name} deleted.`);
    await loadFoods();
  }

  // ================= Scanner =================

  /**
   * The viewfinder. The <video> is aria-hidden because it conveys nothing
   * without sight; the status line beneath it carries the entire state.
   */
  function openScanner() {
    const previouslyFocused = document.activeElement;
    const localController = new AbortController();
    scanController = localController;

    const backdrop = el('div', { class: 'dialog-backdrop' });
    const dialog = el('div', {
      class: 'dialog scanner-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'scanner-title',
      'aria-describedby': 'scanner-status'
    });

    const title = el('h2', { id: 'scanner-title', text: 'Scan a barcode' });
    const video = el('video', { class: 'scanner-video', 'aria-hidden': 'true' });
    video.setAttribute('playsinline', '');
    video.muted = true;

    const status = el('p', { class: 'scanner-status', id: 'scanner-status', role: 'status' });
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Starting the camera.';

    const cancelBtn = el('button', { type: 'button', class: 'btn btn-block', text: 'Cancel' });

    dialog.append(title, video, status, el('div', { class: 'dialog-actions' }, [cancelBtn]));
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        localController.abort();
        return;
      }
      if (event.key === 'Tab') {
        // Cancel is the only control in here, so focus simply stays on it.
        event.preventDefault();
        cancelBtn.focus();
      }
    }

    function closeScanner() {
      document.removeEventListener('keydown', onKeydown, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    }

    cancelBtn.addEventListener('click', () => localController.abort());
    document.addEventListener('keydown', onKeydown, true);
    cancelBtn.focus();

    scan({
      videoEl: video,
      signal: localController.signal,
      onStatus: (text) => { status.textContent = text; }
    }).then(async (result) => {
      closeScanner();
      scanController = null;
      if (destroyed) return;
      await handleScanResult(result);
    }).catch((err) => {
      // scan() is written never to reject; this is belt and braces so a
      // future change cannot leave the dialog stuck on screen.
      console.error('Scanner failed unexpectedly:', err);
      closeScanner();
      scanController = null;
      if (!destroyed) {
        prefillFoodForm({ note: 'The scanner could not start. You can add the food by hand here.' });
      }
    });
  }

  async function handleScanResult(result) {
    if (!result.ok) {
      if (result.reason === 'cancelled') {
        announce('Scanning cancelled.');
        return;
      }
      if (result.reason === 'permission-denied') {
        // A refusal is a normal answer. No scolding, and nothing here asks
        // again — the button is left for the user to press if they choose.
        cameraRefused = true;
        scanBtn.textContent = 'Try the camera again';
        scanNote.hidden = false;
        scanNote.textContent =
          'The camera is switched off for this site. You can turn it back on in your browser settings, '
          + 'or add foods by hand — the form below does everything the scanner does.';
        prefillFoodForm({ note: 'Adding a food by hand.' });
        return;
      }
      prefillFoodForm({
        note: result.reason === 'no-camera'
          ? 'No camera was available, so here is the form instead.'
          : 'The scanner could not run, so here is the form instead.'
      });
      return;
    }

    const { barcode } = result;

    // Duplicate check BEFORE any insert. foods.barcode has no unique
    // constraint, so this is the only thing between a second scan of the
    // same tin and a second row.
    const existing = await findByBarcode(barcode);
    if (destroyed) return;
    if (existing.ok && existing.data) {
      const where = existing.pending ? ' It is still waiting to upload from this device.' : '';
      const useIt = await confirmDialog({
        title: 'You already have this one',
        message: `Barcode ${barcode} is saved as "${existing.data.name}".${where} `
          + 'Use that, or add a separate entry for it?',
        confirmLabel: 'Use the saved one',
        cancelLabel: 'Add a separate entry'
      });
      if (destroyed) return;
      if (useIt) {
        announce(`Using the food you already have: ${existing.data.name}.`);
        const heading = foodsList.querySelector(`[data-food-id="${existing.data.id}"] .card-title`);
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus();
        }
        return;
      }
      // Chose a separate entry — fall through to the lookup.
    }

    announce(`Barcode ${barcode} scanned. Looking it up.`);
    const lookup = await lookupBarcode(barcode);
    if (destroyed) return;

    if (lookup.ok) {
      const missing = lookup.missing || [];
      prefillFoodForm({
        barcode,
        food: lookup.data,
        note: missing.length === 0
          ? 'Found on Open Food Facts with full nutrition data. Check it over, then save.'
          : `Found on Open Food Facts, but it has no ${missing.join(', ')} figure. `
            + 'Fill in what you know and leave the rest blank.'
      });
      return;
    }

    const reasons = {
      'not-found': 'That barcode is not in Open Food Facts, so here it is ready for you to fill in.',
      offline: 'You are offline, so the barcode could not be looked up. Fill this in and it will save on this device.',
      timeout: 'Open Food Facts did not answer in time. Fill this in yourself, or scan again later.',
      error: 'Open Food Facts could not be reached. Fill this in yourself, or scan again later.',
      invalid: 'That barcode could not be read properly. Type the details in below.'
    };
    prefillFoodForm({ barcode, note: reasons[lookup.reason] || reasons.error });
  }

  scanBtn.addEventListener('click', () => {
    if (scanController) return; // already scanning
    if (cameraRefused) {
      // A deliberate second press is honoured; nothing prompts unasked.
      cameraRefused = false;
      scanBtn.textContent = 'Scan a barcode';
      scanNote.hidden = true;
    }
    openScanner();
  }, { signal });

  // ================= Loading =================

  function repopulateMealSelect() {
    const chosen = planMealSelect.value;
    planMealSelect.replaceChildren();
    planMealSelect.appendChild(el('option', {
      value: '', text: meals.length === 0 ? 'No meals yet' : 'Choose a meal'
    }));
    for (const meal of meals) {
      const option = el('option', { value: meal.id, text: meal.name });
      if (meal.id === chosen) option.selected = true;
      planMealSelect.appendChild(option);
    }
  }

  function renderMeals() {
    mealsList.replaceChildren();
    if (meals.length === 0) {
      mealsList.appendChild(el('p', { text: 'No meals yet — add one below.' }));
      return;
    }
    for (const meal of meals) mealsList.appendChild(buildMealCard(meal));
  }

  function renderPendingFoods() {
    pendingWrap.replaceChildren();
    if (pendingFoods.length === 0) return;
    const { article, body } = createCard({
      title: `Waiting to upload (${pendingFoods.length})`, headingLevel: 3
    });
    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'These are saved on this device and will upload when you are back online. '
        + 'They can be added to a meal once they have.'
    }));
    const list = el('ul', { class: 'card-list' });
    for (const food of pendingFoods) list.appendChild(el('li', { text: food.name }));
    body.appendChild(list);
    pendingWrap.appendChild(article);
  }

  async function loadFoods() {
    const [result, queued] = await Promise.all([listFoods(), listQueuedFoods()]);
    if (destroyed) return;
    pendingFoods = queued;

    if (!result.ok) {
      console.error('Failed to load foods:', result.error);
      foodsList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your foods. Check your connection, then reload this page."
      }));
    } else {
      foods = result.data;
      foodsList.replaceChildren();
      if (foods.length === 0) {
        foodsList.appendChild(el('p', { text: 'No foods yet. Scan a barcode, or add one by hand below.' }));
      } else {
        // Grouped under real headings so a long list stays navigable by
        // heading rather than by scrolling.
        for (const group of groupByCategory(foods)) {
          const heading = el('h3', { class: 'group-heading' });
          heading.textContent = `${group.label} (${group.foods.length})`;
          foodsList.appendChild(heading);
          for (const food of group.foods) foodsList.appendChild(buildFoodCard(food));
        }
      }
    }

    renderPendingFoods();
    // Ingredient pickers list synced foods only, so they need rebuilding.
    renderMeals();
  }

  async function loadMeals() {
    const [mealResult, ingredientResult] = await Promise.all([listMeals(), listIngredients()]);
    if (destroyed) return;
    if (!mealResult.ok) {
      console.error('Failed to load meals:', mealResult.error);
      mealsList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your meals. Check your connection, then reload this page."
      }));
      return;
    }
    meals = mealResult.data;
    if (ingredientResult.ok) {
      ingredientsByMeal = groupByMeal(ingredientResult.data);
    } else {
      console.error('Failed to load ingredients:', ingredientResult.error);
      ingredientsByMeal = new Map();
    }
    repopulateMealSelect();
    renderMeals();
  }

  async function loadPlan() {
    const result = await listPlan();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load the meal plan:', result.error);
      planByCell = new Map();
      buildPlanTable();
      showToast("Couldn't load the weekly plan — check your connection and try again.");
      return;
    }
    planByCell = groupByCell(result.data);
    buildPlanTable();
  }

  mountEl.append(planSection, mealsSection, foodsSection);

  buildPlanTable();
  paintOfflineNote();

  function onConnectionChange() {
    if (!destroyed) paintOfflineNote();
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  // Reconnection: data/foods.js flushes its queue on the same event, so give
  // it a moment to settle before re-reading, otherwise a just-synced food
  // still shows under "waiting to upload".
  let reconcileTimer = null;
  function onOnline() {
    clearTimeout(reconcileTimer);
    reconcileTimer = setTimeout(() => {
      if (!destroyed) loadFoods();
    }, 1200);
  }
  window.addEventListener('online', onOnline);

  (async () => {
    await loadFoods();
    if (destroyed) return;
    await loadMeals();
    if (destroyed) return;
    await loadPlan();
  })();

  return () => {
    destroyed = true;
    clearTimeout(reconcileTimer);
    // Release the camera even if the user navigates away mid-scan.
    if (scanController) scanController.abort();
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    window.removeEventListener('online', onOnline);
    controller.abort();
  };
}
