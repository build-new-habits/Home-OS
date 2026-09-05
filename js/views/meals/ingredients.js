// js/views/meals/ingredients.js — 01 Sep 2026 v1
// Worklist G1, fourth extraction. Ingredient rows, the add form, option
// groups, and the food picker.
//
// ---- The most entangled of the seven ----
// Macros read these rows. So does method.js, for {{ing:}} tokens. So does
// cookNow.js, for what you could make. That is precisely why the rows have
// ONE owner and everything else is handed them — three readers and two
// copies is how they drift.
//
// So this module does not fetch and does not cache. It is a set of
// builders: give it a row and the food list, get DOM back. The parent keeps
// the data because the parent is what four features share.

import { el, field, selectFrom } from '../../lib/dom.js';
import { slugifyFoodName } from '../../data/mealSteps.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
import { confirmDialog } from '../../components/confirmDialog.js';
import { ENTRY_UNITS, toStorage, formatPackQuantity } from '../../lib/units.js';
import { lookup, referencePatch } from '../../data/foodReference.js';
import { createFood, updateFood, isEdible, groupByCategory, FOOD_CATEGORIES } from '../../data/foods.js';
import {
  addIngredient, updateIngredient, removeIngredient,
  formatIngredientQuantity, INGREDIENT_UNITS,
  optionLabel, selectOption, addAlternative
} from '../../data/meals.js';

/**
 * @param {{
 *   foods: object[],
 *   signal: AbortSignal,
 *   isDestroyed: () => boolean,
 *   onChanged: () => Promise<void>
 * }} options
 */
export function createIngredientBuilders({ foods, signal, isDestroyed, onChanged }) {
  const destroyed = () => isDestroyed();

function numberInput(id, { min = '0', step = 'any' } = {}) {
  return el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
}

function restoreFocus(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.focus();
  if (typeof node.setSelectionRange === 'function' && node.type !== 'number') {
    const end = node.value.length;
    try { node.setSelectionRange(end, end); } catch { /* not all inputs allow it */ }
  }
}

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
      await onChanged();
      if (!destroyed()) await onChanged();
    }));
  }

  unitSelect.addEventListener('change', async () => {
    const result = await updateIngredient(row.id, { unit: unitSelect.value });
    if (destroyed()) return;
    if (!result.ok) {
      console.error('Failed to update an ingredient unit:', result.error);
      showToast((result.error && result.error.message) || "Couldn't change that unit — try again.");
      unitSelect.value = row.unit || 'g';
      return;
    }
    announce(`${name} now measured in ${result.data.unit}.`);
    await onChanged();
    if (!destroyed()) restoreFocus(`ingredient-unit-${row.id}`);
  }, { signal });

  qtyInput.addEventListener('change', async () => {
    const result = await updateIngredient(row.id, { quantity_g: qtyInput.value });
    if (destroyed()) return;
    if (!result.ok) {
      console.error('Failed to update an ingredient:', result.error);
      showToast((result.error && result.error.message) || "Couldn't change that quantity — try again.");
      qtyInput.value = String(row.quantity_g);
      return;
    }
    announce(`${name} set to ${formatIngredientQuantity(result.data.quantity_g, result.data.unit)}.`);
    // Same reasoning as the plan servings input: the re-render destroys
    // this field, so focus is put back on its replacement.
    await onChanged();
    if (!destroyed()) restoreFocus(`ingredient-qty-${row.id}`);
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
    if (destroyed()) return;
    if (!result.ok) {
      console.error('Failed to remove an ingredient:', result.error);
      showToast("Couldn't remove that ingredient — try again.");
      return;
    }
    announce(`${name} removed from ${meal.name}.`);
    await onChanged();
  }, { signal });
  item.appendChild(removeBtn);

  // ---- Worklist C2: offer yourself a choice ----
  // addAlternative() has existed since Phase 19 with no button, so option
  // groups could only be created by seed data or SQL. One action from the
  // row: no mode, no separate screen.
  const altBtn = el('button', { type: 'button', class: 'btn btn-small', text: 'Add an alternative' });
  altBtn.setAttribute('aria-label', `Add an alternative to ${name}`);
  altBtn.setAttribute('aria-expanded', 'false');

  const altForm = el('form', { class: 'alt-form' });
  altForm.hidden = true;
  const altPicker = foodPicker(`alt-food-${row.id}`, foods, { onlyEdible: true });
  const altQty = numberInput(`alt-qty-${row.id}`, { min: '0.1', step: 'any' });
  altQty.value = String(row.quantity_g);
  const altError = el('p', { class: 'field-error', role: 'alert' });
  altError.hidden = true;
  const altSave = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Add it' });
  const altCancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
  altCancel.addEventListener('click', () => {
    altForm.hidden = true;
    altBtn.setAttribute('aria-expanded', 'false');
    altBtn.focus();
  }, { signal });
  const altActions = el('div', { class: 'form-actions' });
  altActions.append(altSave, altCancel);
  altForm.append(
    el('p', { class: 'field-hint',
      text: `You will be able to switch between ${name.toLowerCase()} and this one, `
        + 'and the nutrition and shopping list follow whichever is chosen.' }),
    altPicker.wrapper,
    field('How much', altQty),
    altError, altActions
  );

  altBtn.addEventListener('click', () => {
    const open = altBtn.getAttribute('aria-expanded') === 'true';
    altBtn.setAttribute('aria-expanded', String(!open));
    altForm.hidden = open;
    if (!open) altPicker.select.focus();
  }, { signal });

  altForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    altError.hidden = true;
    if (!altPicker.select.value) {
      altError.textContent = 'Choose what the alternative is.';
      altError.hidden = false;
      return;
    }
    altSave.disabled = true;
    const result = await addAlternative(row, {
      food_id: altPicker.select.value,
      quantity_g: altQty.value,
      unit: row.unit
    });
    altSave.disabled = false;
    if (destroyed()) return;
    if (!result.ok) {
      altError.textContent = result.error.message;
      altError.hidden = false;
      return;
    }
    announce(`Alternative added. ${name} is still the one chosen.`);
    await onChanged();
  }, { signal });

  item.appendChild(altBtn);
  item.appendChild(altForm);

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
  // Phase 12: ENTRY_UNITS, not INGREDIENT_UNITS. Teaspoons and
  // tablespoons are offered here and converted to ml on the way in —
  // they are display units and schema.md §8 forbids storing them.
  const unitSelect = selectFrom(
    `add-ingredient-unit-${meal.id}`,
    ENTRY_UNITS.map((u) => ({ value: u.value, label: u.label }))
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
  // ---- Worklist C7: create it complete, not bare ----
  // Typing a food the app already knows about produced an empty row with
  // no macros and no pack size, and nothing said otherwise. The reference
  // file has had the answer since Phase 13.
  const newRefOffer = el('p', { class: 'field-hint', role: 'status' });
  newRefOffer.hidden = true;
  let newRefEntry = null;
  newNameInput.addEventListener('input', async () => {
    const entry = await lookup(newNameInput.value);
    if (destroyed()) return;
    newRefEntry = entry;
    newRefOffer.hidden = !entry;
    if (entry) {
      newRefOffer.textContent = `Known: ${entry.name}. It will be created with its `
        + 'weight and nutrition already filled in.';
      if (entry.category) newCategorySelect.value = entry.category;
    }
  }, { signal });

  newWrap.append(field('Name', newNameInput), newRefOffer,
    field('Kind of food', newCategorySelect), newHint);

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
    syncFactorPrompt();
    if (!open) newNameInput.focus();
  }, { signal });

  // ---- Phase 11: the conversion factor, asked for where it is needed ----
  // An ingredient measured in ml or items contributes NOTHING to the
  // macro totals unless its food carries grams_per_ml / grams_per_item.
  // That refusal to guess is correct and stays. But it meant a recipe of
  // "2 eggs, 200ml milk" reported almost nothing and never said why in a
  // place you could act on.
  //
  // So ask here, once, at the exact moment the gap is created. Optional:
  // skipping leaves today's correct-but-empty behaviour untouched.
  const factorWrap = el('div', { class: 'factor-prompt' });
  factorWrap.hidden = true;
  const factorInput = numberInput(`add-ingredient-factor-${meal.id}`, { min: '0.01', step: 'any' });
  const factorHint = el('p', {
    class: 'field-hint', id: `add-ingredient-factor-hint-${meal.id}`,
    text: 'Optional. Without it this ingredient is left out of the nutrition totals '
      + 'rather than counted as zero.'
  });
  factorInput.setAttribute('aria-describedby', factorHint.id);
  const factorField = field('Weight', factorInput, factorHint);
  factorWrap.appendChild(factorField);
  const factorLabel = factorField.querySelector('label');

  /**
   * Shows the prompt only when this specific food is missing the factor
   * this specific unit needs. Asking for a number the app already has
   * would be noise, and noise is how a useful prompt gets ignored.
   */
  function syncFactorPrompt() {
    // The stored unit, not the entry unit: tsp and tbsp are both ml, and
    // both need grams_per_ml.
    const entry = ENTRY_UNITS.find((u) => u.value === unitSelect.value);
    const unit = entry ? entry.store : unitSelect.value;
    const creating = newToggle.getAttribute('aria-expanded') === 'true';
    const food = creating ? null : foods.find((f) => f.id === foodSelect.value);

    if (unit === 'ml') {
      const known = food && food.grams_per_ml !== null && food.grams_per_ml !== undefined;
      factorWrap.hidden = Boolean(known);
      factorLabel.textContent = 'How much does 100 ml of this weigh, in grams?';
    } else if (unit === 'item') {
      const known = food && food.grams_per_item !== null && food.grams_per_item !== undefined;
      factorWrap.hidden = Boolean(known);
      factorLabel.textContent = 'How much does one of these weigh, in grams?';
    } else {
      factorWrap.hidden = true;
      factorInput.value = '';
    }
  }

  unitSelect.addEventListener('change', syncFactorPrompt, { signal });
  foodSelect.addEventListener('change', syncFactorPrompt, { signal });

  form.append(
    picker.wrapper,
    newToggle,
    newWrap,
    field('Quantity', qtyInput),
    field('Measured in', unitSelect),
    factorWrap,
    error,
    submit
  );

  syncFactorPrompt();

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
        // Worklist C7. Reference values fill blanks only — the same rule
        // as the Foods screen, so a food created here and one created
        // there come out identical.
        const refPatch = newRefEntry ? referencePatch(newRefEntry, {}) : {};
        const created = await createFood({
          name, category: newCategorySelect.value, source: 'manual', ...refPatch
        });
        submit.disabled = false;
        if (destroyed()) return;
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

    // ---- Phase 11: save the conversion factor, if one was offered ----
    // Written to the FOOD, so every other recipe using it benefits too.
    // Deliberately before the ingredient insert: getting the factor in
    // means the totals are right the first time the card renders.
    // A failure here is not fatal — you asked to add an ingredient, not
    // to maintain a food library, and the ingredient still goes in.
    if (!factorWrap.hidden && factorInput.value !== '') {
      const factor = Number(factorInput.value);
      if (Number.isFinite(factor) && factor > 0) {
        // Named factorKey, not `field`: `field()` is a helper used all
        // over this file and shadowing it inside a block is a trap.
        const entryUnit = ENTRY_UNITS.find((u) => u.value === unitSelect.value);
        const storedUnit = entryUnit ? entryUnit.store : unitSelect.value;
        const factorKey = storedUnit === 'ml' ? 'grams_per_ml' : 'grams_per_item';
        // grams_per_ml is stored per millilitre; the question asked for
        // 100 ml because that is the number people can actually estimate.
        const value = factorKey === 'grams_per_ml' ? factor / 100 : factor;
        const saved = await updateFood(foodId, { [factorKey]: value });
        if (destroyed()) return;
        if (!saved.ok) console.error('Could not save a conversion factor:', saved.error);
      }
    }

    // Spoons become millilitres here and nowhere else.
    const stored = toStorage(qtyInput.value, unitSelect.value);
    if (!stored) {
      error.textContent = 'Enter how much of it the recipe needs.';
      error.hidden = false;
      qtyInput.focus();
      return;
    }

    submit.disabled = true;
    const result = await addIngredient({
      meal_id: meal.id,
      food_id: foodId,
      quantity_g: stored.value,
      unit: stored.unit
    });
    submit.disabled = false;
    if (destroyed()) return;
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
      await onChanged();
    }
    await onChanged();
  }, { signal });

  return form;
}


function buildOptionGroupRow(meal, entry) {
  const item = el('li', { class: 'ingredient-row option-group-row' });

  const text = el('div', { class: 'ingredient-text' });
  text.appendChild(el('span', { class: 'option-group-name', text: entry.name }));
  text.appendChild(el('span', {
    class: 'ingredient-detail',
    text: entry.selected
      ? `${formatIngredientQuantity(entry.selected)} ${optionLabel(entry.selected)}`
      : 'Nothing chosen'
  }));
  item.appendChild(text);

  const select = el('select', { id: `option-${meal.id}-${slugifyFoodName(entry.name)}` });
  select.className = 'option-select';
  for (const option of entry.options) {
    const food = option.foods || {};
    const kcal = food.calories_per_100g;
    const suffix = kcal === null || kcal === undefined ? '' : ` — ${Math.round(kcal)} kcal/100 g`;
    const opt = el('option', {
      value: option.id,
      text: `${optionLabel(option)}${suffix}`
    });
    if (entry.selected && option.id === entry.selected.id) opt.selected = true;
    select.appendChild(opt);
  }
  const label = el('label', { for: select.id, class: 'sr-only', text: `Choose the ${entry.name}` });

  select.addEventListener('change', async () => {
    select.disabled = true;
    const result = await selectOption(meal.id, entry.name, select.value);
    select.disabled = false;
    if (destroyed()) return;
    if (!result.ok) {
      showToast('That swap could not be saved.');
      return;
    }
    announce(`${entry.name} changed to ${optionLabel(result.data)}.`);
    await onChanged();
  }, { signal });

  const control = el('div', { class: 'option-control' });
  control.append(label, select);
  item.appendChild(control);

  // ---- Worklist C3: what an option is called ----
  // option_label has been read everywhere since Phase 19 and could only
  // be set by seed data or SQL. It exists because a food name is often
  // too literal for a choice list: "Cottage cheese, plain" is a food,
  // "Cottage cheese" is an option.
  if (entry.selected) {
    const rename = el('input', {
      id: `option-label-${entry.selected.id}`, type: 'text', maxlength: '60'
    });
    rename.value = entry.selected.option_label || '';
    rename.placeholder = (entry.selected.foods || {}).name || '';
    const renameHint = el('p', {
      class: 'field-hint', id: `option-label-hint-${entry.selected.id}`,
      text: 'Optional. Leave blank to use the food\'s own name.'
    });
    rename.setAttribute('aria-describedby', renameHint.id);
    rename.addEventListener('change', async () => {
      const result = await updateIngredient(entry.selected.id, {
        option_label: rename.value.trim() || null
      });
      if (destroyed()) return;
      if (!result.ok) { showToast('That name could not be saved.'); return; }
      announce('Renamed.');
      await onChanged();
    }, { signal });

    const renameWrap = el('details', { class: 'option-rename' });
    renameWrap.appendChild(el('summary', { text: 'Rename this option' }));
    renameWrap.appendChild(field('Called', rename, renameHint));
    item.appendChild(renameWrap);
  }

  return item;
}


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
    if (destroyed()) return;
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


  return {
    buildIngredientRow,
    buildAddIngredientForm,
    buildOptionGroupRow
  };
}
