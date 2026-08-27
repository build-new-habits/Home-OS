// js/views/meals.js — 27 Aug 2026 v11
// v11: an ingredient can be created FROM the recipe. Writing a recipe is
// not the moment to go and maintain a food library — a name and a category
// is enough, macros are nullable, and the totals already say what is not
// counted yet.
// v10: a recipe says whether you have the ingredients. That was the whole
// point of keeping a pantry, and until now nothing asked it.
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
  // The library, its scanner and its offline queue live in views/foods.js.
  // Recipes need only the list, plus updateFood for the inline conversion
  // factor prompt — filling that in at the moment it is needed beats
  // sending the user to another page and back.
  listFoods, updateFood, createFood, isEdible, groupByCategory, FOOD_CATEGORIES
} from '../data/foods.js';
import {
  listMeals, listIngredients, groupByMeal, createMeal, updateMeal,
  countPlanEntries, countIngredients, deleteMeal,
  addIngredient, updateIngredient, removeIngredient,
  computeMacros, MACROS, INGREDIENT_UNITS, formatIngredientQuantity,
  MEAL_TYPES, mealTypeLabel, setFavourite
} from '../data/meals.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { listStock } from '../data/pantry.js';
import { stockForMeal, describeStockForMeal } from '../lib/shortfall.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { announce } from '../lib/a11y.js';

// Local element helper. Deliberately defined here rather than copied in from
// another view — the 18 Aug ReferenceError came from moving a helper between
// files without checking the destination defined it.
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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
  let pantry = [];
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

  /** Stock lines to repaint when the servings change. */
  const stockRepaints = [];

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

    if (rows.length > 0) {
      // Named, not counted. "Short of milk" saves a trip to the cupboard;
      // "2 missing" does not.
      const stockLine = el('p', { class: 'field-hint' });
      const paintStock = () => {
        stockLine.textContent = describeStockForMeal(stockForMeal({
          ingredients: rows, pantry, foods,
          serves, defaultServes: meal.default_serves, todayISO: todayIso()
        }));
      };
      paintStock();
      body.appendChild(stockLine);
      stockRepaints.push(paintStock);
    }

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
      // Cooking for more people changes what you are short of, so the stock
      // line has to move with it.
      for (const repaint of stockRepaints) repaint();
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

    // ---- Something not on the list yet ----
    // Writing a recipe is not the moment to go and maintain a food library.
    // A name and a category is enough to be a real ingredient: macros are
    // nullable, the totals already say "N of M not counted here", and they
    // start counting the moment the numbers are filled in.
    const newWrap = el('div');
    newWrap.hidden = true;
    const newNameInput = el('input', { id: `new-ingredient-name-${meal.id}`, type: 'text' });
    // Edible categories only — this is being added AS an ingredient, so
    // offering shampoo would be nonsense. Still a visible choice, never
    // silent: storage state decides shelf life later.
    const newCategorySelect = selectFrom(
      `new-ingredient-category-${meal.id}`,
      FOOD_CATEGORIES.filter((c) => isEdible({ category: c.value }))
        .map((c) => ({ value: c.value, label: c.label }))
    );
    const newHint = el('p', {
      class: 'field-hint', id: `new-ingredient-hint-${meal.id}`,
      text: 'Just a name is enough. It goes on the shopping list if it is not in the pantry, '
        + 'and the recipe says its nutrition is not counted yet — add the numbers whenever you like.'
    });
    newNameInput.setAttribute('aria-describedby', newHint.id);
    newWrap.append(field('Name', newNameInput), field('Kind of food', newCategorySelect), newHint);

    const newToggle = el('button', {
      type: 'button', class: 'btn btn-small', 'aria-expanded': 'false',
      text: 'It is not on the list yet'
    });
    newToggle.addEventListener('click', () => {
      const open = newToggle.getAttribute('aria-expanded') === 'true';
      newToggle.setAttribute('aria-expanded', String(!open));
      newWrap.hidden = open;
      picker.wrapper.hidden = !open;
      newToggle.textContent = open ? 'It is not on the list yet' : 'Choose from the list instead';
      if (!open) newNameInput.focus();
    }, { signal });

    form.append(
      picker.wrapper,
      newToggle,
      newWrap,
      field('Quantity', qtyInput),
      field('Measured in', unitSelect),
      error,
      submit
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;

      const creatingNew = newToggle.getAttribute('aria-expanded') === 'true';
      let foodId = foodSelect.value;
      let foodName = '';

      if (creatingNew) {
        const name = newNameInput.value.trim();
        if (!name) {
          error.textContent = 'Give the ingredient a name.';
          error.hidden = false;
          newNameInput.focus();
          return;
        }
        // Match before creating, or every recipe adds another "Onion".
        const existing = foods.find(
          (food) => String(food.name || '').trim().toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          foodId = existing.id;
          foodName = existing.name;
        } else {
          submit.disabled = true;
          const created = await createFood({
            name, category: newCategorySelect.value, source: 'manual'
          });
          submit.disabled = false;
          if (destroyed) return;
          if (!created.ok || created.queued) {
            error.textContent = created.queued
              ? 'That saved on this device, but a recipe ingredient needs it saved online first.'
              : (created.error && created.error.message) || "Couldn't create that ingredient.";
            error.hidden = false;
            return;
          }
          foodId = created.data.id;
          foodName = created.data.name;
        }
      } else {
        if (!foodSelect.value) {
          const edibleCount = foods.filter(isEdible).length;
          error.textContent = edibleCount === 0
            ? 'Nothing to choose yet — use "It is not on the list yet" to add one here.'
            : 'Choose a food to add.';
          error.hidden = false;
          foodSelect.focus();
          return;
        }
        foodName = foodSelect.options[foodSelect.selectedIndex].textContent;
      }

      submit.disabled = true;
      const result = await addIngredient({
        meal_id: meal.id,
        food_id: foodId,
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
      if (creatingNew) {
        newNameInput.value = '';
        // Back to the list: the thing just created is now ON it, and
        // leaving the form in "create" mode invites a duplicate next time.
        newToggle.setAttribute('aria-expanded', 'false');
        newWrap.hidden = true;
        picker.wrapper.hidden = false;
        newToggle.textContent = 'It is not on the list yet';
        await loadFoods();
      }
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
    if (rows.length === 0) {
      bits.push('no ingredients yet');
    } else {
      const stock = stockForMeal({
        ingredients: rows, pantry, foods,
        serves: meal.default_serves, defaultServes: meal.default_serves,
        todayISO: todayIso()
      });
      // The one fact worth knowing before you commit to cooking it.
      bits.push(`${stock.inStock} of ${stock.total} in the pantry`);
    }
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

  /**
   * Foods, for the ingredient picker only.
   *
   * The library and its scanner live in views/foods.js now. This view still
   * needs the LIST, because an ingredient has to point at a real food.
   * Queued (offline) foods are deliberately excluded: they have no id yet,
   * so an ingredient could not reference one.
   */
  async function loadFoods() {
    // The pantry is fetched alongside, so a recipe can answer "do I have
    // this?" without a request per recipe.
    const [result, stock] = await Promise.all([listFoods(), listStock()]);
    if (destroyed) return;
    pantry = stock.ok ? stock.data : [];
    if (!stock.ok) console.error('Failed to load the pantry for stock checks:', stock.error);
    if (!result.ok) {
      console.error('Failed to load foods:', result.error);
      foods = [];
      renderMeals();
      return;
    }
    foods = result.data;
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

  // A pointer, not a duplicate: the library lives on its own page, and the
  // ingredient picker below is the only place recipes need it.
  const foodsLink = el('p');
  foodsLink.appendChild(el('a', {
    class: 'card-link', href: '#/foods',
    text: 'Manage the things you buy'
  }));
  mealsSection.appendChild(foodsLink);

  mountEl.append(mealsSection);

  paintOfflineNote();

  function onConnectionChange() {
    if (!destroyed) paintOfflineNote();
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  // Reconnection: data/foods.js flushes its queue on the same event, so give
  // it a moment to settle before re-reading, otherwise a food that has just
  // synced is still missing from the ingredient picker.
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
