// js/views/meals.js — 26 Aug 2026 v9
// v9: RECIPES, and only recipes.
//
//   * The weekly-plan code is deleted. It lives in views/mealPlan.js.
//   * Recipes are one compact row each, opened in the slide-out panel with
//     their ingredients inside. A wall of full cards, each with a macro
//     table and an ingredient list, was unreadable past about six recipes.
//   * Favourites, so the ten things you actually cook are reachable.
//   * breakfast / lunch / dinner / snack / drink, filtered from the panel.
//   * Macros scale to a chosen number of servings, not just the recipe's
//     own default.
//
// The foods library is still in this file and comes out next; it is a
// separate concern with its own scanner and offline queue.
//
// ---- The weekly plan moved out (26 Aug 2026) ----
// It lives in views/mealPlan.js and its own route. This file no longer
// mounts or loads it. The plan-building functions below are DEAD CODE for
// exactly one commit — they come out with the recipe-card rework, which
// restructures this file anyway. Deleting 250 interleaved lines by hand in
// the same change that adds new behaviour is how a file gets corrupted;
// separating the two keeps each step verifiable.
// v8: the scanner dialog moved to components/scannerDialog.js so the pantry
// can scan a shelf too. Behaviour here is unchanged; only the dialog's
// construction left this file.
// v7: TWO fixes from real-device testing.
//
// 1. The scan's "confirm the category" block was a mutable flag cleared by
//    any `change` event. Android's native select fires `change` on dismissal
//    even when the same option is re-selected, so merely OPENING the
//    dropdown to look at it defeated the guard. Replaced with a sentinel:
//    after a scan a blank "Choose one" option is inserted and selected, so
//    the select genuinely HAS NO VALUE. `required` then does the work, and
//    no stray event can satisfy it. State you can see beats a flag you
//    cannot.
//
// 2. Category option labels carried their hint text inline ("Fresh food —
//    fruit, veg, meat, fish, dairy, bakery"). On a narrow Android picker
//    those wrap and cram together. Labels are now just the category name;
//    the hints live in the field hint below, where they have room.
// v6: after a SCAN the category is deliberately left UNCHOSEN.
//
// Open Food Facts gives macros but not a Home-OS category, and defaulting
// silently to 'food_ambient' would put scanned shampoo in the ingredient
// picker — the exact failure that column exists to prevent, discovered only
// mid-recipe. A wrong default is worse than no default, because nobody
// checks a field that already looks filled in. So a scan pre-selects OFF's
// suggestion where there is one, marks it as a guess, and refuses to save
// until the user has confirmed. One tap, on a form they are already reading.
//
// Also: picking millilitres or items for an ingredient whose food has no
// conversion factor now offers to fill it in there and then, rather than
// only reporting the gap after the totals come out wrong.
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
  computeMacros, MACROS, INGREDIENT_UNITS, formatIngredientQuantity,
  MEAL_TYPES, mealTypeLabel, setFavourite
} from '../data/meals.js';
import { isScanSupported, normaliseBarcode } from '../lib/barcode.js';
import { openScanner as openScannerDialog } from '../components/scannerDialog.js';
import { lookupBarcode } from '../lib/openFoodFacts.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { openDetailSheet } from '../components/detailSheet.js';
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

  // ================= Section: meals =================

  const mealsSection = el('section');
  mealsSection.appendChild(el('h2', { text: 'Meals' }));

  // ---- Filter ----
  // In the panel, not on the screen. The COUNT on the button is what keeps
  // hidden state from being silent — a filtered list that looks unfiltered
  // is how you conclude a recipe has vanished.
  const mealFilterRow = el('div', { class: 'filter-row' });
  const mealFilterBtn = el('button', { type: 'button', class: 'btn' });
  const mealFilterSummary = el('p', { class: 'field-hint', role: 'status' });
  mealFilterSummary.setAttribute('aria-live', 'polite');
  mealFilterRow.append(mealFilterBtn, mealFilterSummary);
  mealsSection.appendChild(mealFilterRow);
  mealFilterBtn.addEventListener('click', () => openMealFilterSheet(mealFilterBtn), { signal });

  const mealsList = el('ul', { class: 'recipe-rows' });
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

  // A <select>, never free text: meal_type carries a CHECK constraint, and
  // a rejected value comes back as an opaque database error.
  const mealTypeSelect = selectFrom('new-meal-type',
    MEAL_TYPES.map((t) => ({ value: t.value, label: t.label })),
    { includeBlank: 'Not said yet' });
  const mealTypeHint = el('p', {
    class: 'field-hint', id: 'new-meal-type-hint',
    text: 'What the recipe IS, not when you happen to eat it. Leave blank if unsure — '
      + 'half-filled labels filter worse than none.'
  });
  mealTypeSelect.setAttribute('aria-describedby', mealTypeHint.id);

  addMealForm.append(
    el('h3', { text: 'Add a meal' }),
    field('Meal name', mealNameInput),
    field('Usually serves', mealServesInput),
    field('Kind of meal', mealTypeSelect, mealTypeHint),
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
      default_serves: mealServesInput.value,
      meal_type: mealTypeSelect.value || null
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
    mealTypeSelect.value = '';
    announce(`${result.data.name} added.`);
    await loadMeals();
  }, { signal });

  function buildMealCard(meal) {
    const { article, body, actions } = createCard({
      title: meal.name, headingLevel: 3, className: 'meal-card'
    });
    article.dataset.mealId = meal.id;

    const rows = ingredientsByMeal.get(meal.id) || [];
    // How many you are cooking THIS time. Starts at the recipe's own
    // default and never writes back to it — that is a different fact.
    let serves = servesChoice.get(meal.id) || meal.default_serves;
    let macros = computeMacros(rows, { serves });

    body.appendChild(el('p', {
      class: 'chip',
      text: `Usually serves ${meal.default_serves} · ${rows.length} ingredient${rows.length === 1 ? '' : 's'}`
    }));

    // ---- How many are you cooking for? ----
    // The recipe's own default_serves is what it MAKES. This is how many you
    // want this time, and it only rescales the figures below — it never
    // writes back, because that would re-serve the recipe everywhere it is
    // planned.
    const scaler = el('div', { class: 'serves-scaler' });
    const scalerInput = numberInput(`serves-scale-${meal.id}`, { min: '1', step: '1' });
    scalerInput.value = String(serves);
    const scalerLabel = el('label', { for: scalerInput.id, text: 'Show figures for' });
    const scalerUnit = el('span', { class: 'field-hint', text: 'servings' });
    const scalerReset = el('button', {
      type: 'button', class: 'btn btn-small',
      text: `Back to ${meal.default_serves}`
    });
    scalerReset.setAttribute('aria-label', `Show figures for the usual ${meal.default_serves} servings`);
    scaler.append(scalerLabel, scalerInput, scalerUnit, scalerReset);
    body.appendChild(scaler);

    // ---- Macros, as a real table with units in the text ----
    const macroTable = el('table', { class: 'data-table' });
    macroTable.appendChild(el('caption', {
      text: `Nutrition for ${meal.name}, whole meal and per serving`
    }));
    const macroHead = el('thead');
    const macroHeadRow = el('tr');
    const perServingHead = el('th', { scope: 'col', text: `Per serving (of ${macros.serves})` });
    macroHeadRow.append(
      el('th', { scope: 'col', text: 'Nutrient' }),
      el('th', { scope: 'col', text: 'Whole meal' }),
      perServingHead
    );
    macroHead.appendChild(macroHeadRow);
    macroTable.appendChild(macroHead);

    const macroBody = el('tbody');
    const macroCells = new Map();
    for (const macro of MACROS) {
      const tr = el('tr');
      const total = el('td', {
        text: formatMacro(macros.totals[macro.key], macro.unit, macros.complete[macro.key])
      });
      const each = el('td', {
        text: formatMacro(macros.perServing[macro.key], macro.unit, macros.complete[macro.key])
      });
      tr.append(el('th', { scope: 'row', text: macro.label }), total, each);
      macroCells.set(macro.key, { total, each });
      macroBody.appendChild(tr);
    }
    macroTable.appendChild(macroBody);
    body.appendChild(macroTable);

    function repaintMacros() {
      macros = computeMacros(rows, { serves });
      perServingHead.textContent = `Per serving (of ${macros.serves})`;
      for (const macro of MACROS) {
        const cells = macroCells.get(macro.key);
        if (!cells) continue;
        cells.total.textContent =
          formatMacro(macros.totals[macro.key], macro.unit, macros.complete[macro.key]);
        cells.each.textContent =
          formatMacro(macros.perServing[macro.key], macro.unit, macros.complete[macro.key]);
      }
    }

    function setServes(next) {
      const value = Number(next);
      if (!Number.isInteger(value) || value < 1) {
        // Refuse rather than silently substitute: dividing by a bad number
        // would produce confident, wrong figures.
        scalerInput.value = String(serves);
        showToast('Servings must be a whole number, 1 or more.');
        return;
      }
      serves = value;
      servesChoice.set(meal.id, value);
      scalerInput.value = String(value);
      repaintMacros();
      announce(`Showing figures for ${value} serving${value === 1 ? '' : 's'}.`);
    }

    scalerInput.addEventListener('change', () => setServes(scalerInput.value), { signal });
    scalerReset.addEventListener('click', () => setServes(meal.default_serves), { signal });

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

  /**
   * Offers the missing conversion factor inline, at the moment it is needed.
   *
   * Reporting "no weight per millilitre is recorded" after the totals come
   * out wrong is honest but useless — the user is looking at a recipe, not a
   * food record, and would have to navigate away and come back. This puts
   * the one number they need in front of them where they are.
   */
  function buildFactorPrompt(food, unit, onFilled) {
    const wrap = el('div', { class: 'factor-prompt' });
    const isMl = unit === 'ml';
    const fieldName = isMl ? 'grams_per_ml' : 'grams_per_item';
    const idBase = `factor-${fieldName}-${food.id}`;

    wrap.appendChild(el('p', {
      text: `${food.name} has no weight per ${isMl ? 'millilitre' : 'item'} recorded, `
        + 'so it cannot be counted in the nutrition totals yet.'
    }));

    const input = numberInput(idBase, { min: '0.01', step: 'any' });
    const hint = el('p', {
      class: 'field-hint', id: `${idBase}-hint`,
      text: isMl
        ? 'Milk is about 1.03, oil about 0.92, water is 1.'
        : 'One egg is about 60 g, one onion about 150 g.'
    });
    input.setAttribute('aria-describedby', hint.id);

    const save = el('button', { type: 'button', class: 'btn', text: 'Save and include it' });
    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;

    save.addEventListener('click', async () => {
      error.hidden = true;
      const value = Number(input.value);
      if (!Number.isFinite(value) || value <= 0) {
        error.textContent = 'Enter a weight in grams, greater than zero.';
        error.hidden = false;
        input.focus();
        return;
      }
      save.disabled = true;
      const result = await updateFood(food.id, { [fieldName]: value });
      save.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to save a conversion factor:', result.error);
        error.textContent = (result.error && result.error.message) || "Couldn't save that — try again.";
        error.hidden = false;
        return;
      }
      announce(`${food.name} saved: 1 ${isMl ? 'millilitre' : 'item'} weighs ${value} grams. Totals updated.`);
      onFilled();
    }, { signal });

    wrap.append(
      field(`Grams per ${isMl ? 'millilitre' : 'item'}`, input, hint),
      error,
      save
    );
    return wrap;
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

    // The factor is missing exactly when the unit needs one and the food
    // has none. Offer it here rather than only naming the gap in the totals.
    const unitNow = row.unit || 'g';
    const needsFactor =
      (unitNow === 'ml' && food.grams_per_ml == null)
      || (unitNow === 'item' && food.grams_per_item == null);
    if (needsFactor && food.id) {
      item.appendChild(buildFactorPrompt(food, unitNow, async () => {
        await loadFoods();
        if (!destroyed) await loadMeals();
      }));
    }

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

    const typeSelect = selectFrom(`edit-meal-type-${meal.id}`,
      MEAL_TYPES.map((t) => ({ value: t.value, label: t.label })),
      { includeBlank: 'Not said yet' });
    typeSelect.value = meal.meal_type || '';

    form.append(
      field('Meal name', nameInput),
      field('Usually serves', servesInput),
      field('Kind of meal', typeSelect),
      error,
      el('div', { class: 'card-actions' }, [save, cancel])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      save.disabled = true;
      const result = await updateMeal(meal.id, {
        name: nameInput.value,
        default_serves: servesInput.value,
        meal_type: typeSelect.value || null
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
  // Short labels only. The hints are long and belong below, not inside
  // option text where a narrow native picker wraps and crams them.
  const foodCategorySelect = selectFrom(
    'new-food-category',
    FOOD_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
  );
  foodCategorySelect.required = true;
  foodCategorySelect.value = 'food_ambient';
  const CATEGORY_HELP =
    'Only food and drink can be added to a recipe. Everything else is for the shopping list. '
    + 'Fresh is fruit, veg, meat, fish, dairy and bakery; Cupboard is dried, tinned, jarred and packets; '
    + 'Household is cleaning and paper goods; Home is bulbs, batteries, equipment and stationery.';
  const foodCategoryHint = el('p', {
    class: 'field-hint', id: 'new-food-category-hint', text: CATEGORY_HELP
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

  const CATEGORY_SENTINEL_ID = 'new-food-category-unchosen';

  /**
   * Forces a deliberate category choice by giving the select NO VALUE.
   *
   * The previous version used a boolean cleared by any `change` event.
   * Android's native select fires `change` on dismissal even when the same
   * option is re-selected, so opening the dropdown to look at it satisfied
   * the guard. A sentinel option cannot be defeated that way: until the
   * user picks something real, `select.value` is empty and the submit
   * handler simply has nothing to save.
   */
  function requireCategoryChoice(suggested) {
    clearCategorySentinel();
    const blank = el('option', {
      id: CATEGORY_SENTINEL_ID,
      value: '',
      text: suggested ? `Choose one — we guessed ${categoryLabel(suggested)}` : 'Choose one'
    });
    foodCategorySelect.insertBefore(blank, foodCategorySelect.firstChild);
    foodCategorySelect.value = '';
    foodCategorySelect.setAttribute('aria-invalid', 'true');
  }

  function clearCategorySentinel() {
    const existing = foodCategorySelect.querySelector(`#${CATEGORY_SENTINEL_ID}`);
    if (existing) existing.remove();
    foodCategorySelect.removeAttribute('aria-invalid');
  }

  function resetFoodForm() {
    foodForm.reset();
    clearCategorySentinel();
    foodCategorySelect.value = 'food_ambient';
    foodCategoryHint.textContent = CATEGORY_HELP;
    pendingSource = 'manual';
    foodSourceNote.hidden = true;
    foodSourceNote.textContent = '';
    foodError.hidden = true;
  }

  /**
   * Opens the manual form with whatever the scan and lookup managed to find.
   *
   * @param {boolean} fromScan when true the category must be CONFIRMED before
   *        saving — Open Food Facts does not supply one, and a silent
   *        'food_ambient' would put shampoo in the ingredient picker.
   */
  function prefillFoodForm({ barcode = '', food = null, note = '', fromScan = false } = {}) {
    foodDetails.open = true;
    foodBarcodeInput.value = barcode;
    foodNameInput.value = food ? (food.name || '') : '';
    caloriesInput.value = food && food.calories_per_100g != null ? food.calories_per_100g : '';
    proteinInput.value = food && food.protein_g != null ? food.protein_g : '';
    fatInput.value = food && food.fat_g != null ? food.fat_g : '';
    carbsInput.value = food && food.carbs_g != null ? food.carbs_g : '';
    perMlInput.value = food && food.grams_per_ml != null ? food.grams_per_ml : '';
    perItemInput.value = food && food.grams_per_item != null ? food.grams_per_item : '';
    const suggestion = food && food.suggestedCategory;
    if (fromScan) {
      // A scan cannot know the category, and a filled-looking field does not
      // get checked. So it is left genuinely empty until chosen.
      requireCategoryChoice(suggestion);
      foodCategoryHint.textContent = suggestion
        ? `From the barcode this looks like ${categoryLabel(suggestion)}, but a scan cannot be sure. `
          + `Pick it from the list to confirm, or choose another. ${CATEGORY_HELP}`
        : `The barcode did not say what kind of thing this is. ${CATEGORY_HELP}`;
    } else {
      clearCategorySentinel();
      foodCategorySelect.value = (food && food.category) || 'food_ambient';
      foodCategoryHint.textContent = CATEGORY_HELP;
    }
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

  foodCategorySelect.addEventListener('change', () => {
    // A real choice removes the sentinel for good. Re-selecting the blank
    // is impossible once it is gone, which is the point.
    if (foodCategorySelect.value) clearCategorySentinel();
  }, { signal });

  foodForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    foodError.hidden = true;
    if (!foodCategorySelect.value) {
      foodError.textContent =
        'Choose what kind of thing this is before saving. A scan cannot tell us, and it '
        + 'decides whether this shows up as a recipe ingredient.';
      foodError.hidden = false;
      foodCategorySelect.focus();
      return;
    }
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
    categorySelect.required = true;

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
    // The dialog itself now lives in components/scannerDialog.js so the
    // pantry can scan too. This view keeps only what it does with a result.
    const session = openScannerDialog({ title: 'Scan a barcode' });
    scanController = session;
    session.result.then(async (result) => {
      scanController = null;
      if (destroyed) return;
      await handleScanResult(result);
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
        fromScan: true,
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
    prefillFoodForm({ barcode, fromScan: true, note: reasons[lookup.reason] || reasons.error });
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

  // ================= Recipes: rows, filters, favourites =================

  /** Servings chosen for a recipe in this session, keyed by meal id. */
  const servesChoice = new Map();

  const mealFilters = { types: new Set(), favouritesOnly: false, term: '' };

  function activeMealFilterCount() {
    return mealFilters.types.size
      + (mealFilters.favouritesOnly ? 1 : 0)
      + (mealFilters.term ? 1 : 0);
  }

  function paintMealFilterButton() {
    const count = activeMealFilterCount();
    mealFilterBtn.textContent = count === 0 ? 'Filter' : `Filter (${count})`;
    mealFilterBtn.setAttribute('aria-label', count === 0
      ? 'Filter recipes'
      : `Filter recipes, ${count} filter${count === 1 ? '' : 's'} on`);
  }

  function openMealFilterSheet(returnFocusTo) {
    openDetailSheet({
      title: 'Filter recipes',
      subtitle: 'Nothing is deleted — this only changes what is shown.',
      returnFocusTo,
      build: (body, { close }) => {
        const search = el('input', { id: 'meal-filter-search', type: 'search', autocomplete: 'off' });
        search.value = mealFilters.term;
        search.placeholder = 'Type part of a name';
        search.addEventListener('input', () => {
          mealFilters.term = search.value.trim();
          paintMealFilterButton();
          renderMeals();
        }, { signal });
        body.appendChild(field('Search by name', search));

        const favRow = el('div', { class: 'field field-checkbox' });
        const favCb = el('input', { id: 'meal-filter-fav', type: 'checkbox' });
        favCb.checked = mealFilters.favouritesOnly;
        const favLabel = el('label', { for: favCb.id, text: 'Favourites only' });
        favCb.addEventListener('change', () => {
          mealFilters.favouritesOnly = favCb.checked;
          paintMealFilterButton();
          renderMeals();
        }, { signal });
        favRow.append(favCb, favLabel);
        body.appendChild(favRow);

        const typeSet = el('fieldset');
        typeSet.appendChild(el('legend', { text: 'Kind of meal' }));
        // "Unclassified" is offered as a filter of its own: it is a real
        // state, and being able to find what still needs labelling is how a
        // half-filled classification gets finished.
        const options = [...MEAL_TYPES, { value: '', label: 'Unclassified' }];
        for (const option of options) {
          const row = el('div', { class: 'field field-checkbox' });
          const cb = el('input', { id: `meal-filter-type-${option.value || 'none'}`, type: 'checkbox' });
          cb.checked = mealFilters.types.has(option.value);
          const label = el('label', { for: cb.id, text: option.label });
          cb.addEventListener('change', () => {
            if (cb.checked) mealFilters.types.add(option.value);
            else mealFilters.types.delete(option.value);
            paintMealFilterButton();
            renderMeals();
          }, { signal });
          row.append(cb, label);
          typeSet.appendChild(row);
        }
        body.appendChild(typeSet);

        const clear = el('button', { type: 'button', class: 'btn', text: 'Clear all filters' });
        clear.addEventListener('click', () => {
          mealFilters.types.clear();
          mealFilters.favouritesOnly = false;
          mealFilters.term = '';
          paintMealFilterButton();
          renderMeals();
          announce('Filters cleared.');
          close();
        }, { signal });
        body.appendChild(clear);
      }
    });
  }

  function mealPasses(meal) {
    if (mealFilters.favouritesOnly && !meal.is_favourite) return false;
    if (mealFilters.types.size > 0 && !mealFilters.types.has(meal.meal_type || '')) return false;
    if (mealFilters.term && !(meal.name || '').toLowerCase().includes(mealFilters.term.toLowerCase())) {
      return false;
    }
    return true;
  }

  function renderMeals() {
    mealsList.replaceChildren();
    paintMealFilterButton();

    if (meals.length === 0) {
      mealsList.appendChild(el('li', { class: 'recipe-row', text: 'No recipes yet — add one below.' }));
      mealFilterSummary.textContent = '';
      return;
    }

    // Favourites first, then alphabetical. Being quick to reach is the whole
    // point of marking one.
    const visible = meals.filter(mealPasses).sort((a, b) => {
      if (!!b.is_favourite !== !!a.is_favourite) return b.is_favourite ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (visible.length === 0) {
      mealsList.appendChild(el('li', {
        class: 'recipe-row',
        text: 'Nothing matches the current filters.'
      }));
    }

    for (const meal of visible) mealsList.appendChild(buildRecipeRow(meal));

    mealFilterSummary.textContent = activeMealFilterCount() > 0
      ? `${visible.length} of ${meals.length} recipe${meals.length === 1 ? '' : 's'} shown.`
      : `${meals.length} recipe${meals.length === 1 ? '' : 's'}.`;
  }

  /** One line per recipe: name, kind, ingredient count, and a star. */
  function buildRecipeRow(meal) {
    const rows = ingredientsByMeal.get(meal.id) || [];
    const item = el('li', { class: 'recipe-row' });

    const open = el('button', { type: 'button', class: 'recipe-row-open' });
    const text = el('span', { class: 'recipe-row-text' });
    text.appendChild(el('span', { class: 'recipe-row-name', text: meal.name }));
    const bits = [mealTypeLabel(meal.meal_type), `serves ${meal.default_serves}`];
    bits.push(rows.length === 0
      ? 'no ingredients yet'
      : `${rows.length} ingredient${rows.length === 1 ? '' : 's'}`);
    text.appendChild(el('span', { class: 'recipe-row-meta', text: bits.join(' · ') }));
    open.append(text, el('span', { class: 'stock-row-chevron', 'aria-hidden': 'true', text: '›' }));
    open.setAttribute('aria-label', `${meal.name}, ${bits.join(', ')}. Open recipe.`);
    open.addEventListener('click', () => openMealSheet(meal, open), { signal });

    // The star is a toggle with a spoken state, never a colour on its own.
    const star = el('button', { type: 'button', class: 'btn favourite-toggle' });
    paintStar(star, meal);
    star.addEventListener('click', () => toggleFavourite(meal, star), { signal });

    item.append(open, star);
    return item;
  }

  function paintStar(btn, meal) {
    const on = !!meal.is_favourite;
    btn.textContent = on ? '★' : '☆';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on
      ? `${meal.name} is a favourite. Remove it from favourites.`
      : `Make ${meal.name} a favourite.`);
  }

  async function toggleFavourite(meal, btn) {
    const next = !meal.is_favourite;
    // Optimistic: a star tap is trivial and should feel instant. Rolled back
    // only if the write outright fails.
    meal.is_favourite = next;
    paintStar(btn, meal);

    const result = await setFavourite(meal.id, next);
    if (destroyed) return;
    if (!result.ok) {
      meal.is_favourite = !next;
      paintStar(btn, meal);
      console.error('Failed to change a favourite:', result.error);
      showToast("Couldn't save that — try again.");
      return;
    }
    announce(next ? `${meal.name} added to favourites.` : `${meal.name} removed from favourites.`);
    renderMeals();
  }

  /** The whole recipe — macros, ingredients, edit, delete — in the panel. */
  function openMealSheet(meal, returnFocusTo) {
    openDetailSheet({
      title: meal.name,
      subtitle: `${mealTypeLabel(meal.meal_type)} · serves ${meal.default_serves}`,
      returnFocusTo,
      build: (body) => {
        body.appendChild(buildMealCard(meal));
      }
    });
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
    renderMeals();
  }

  mountEl.append(mealsSection, foodsSection);

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
