// js/views/foods.js — 01 Sep 2026 v5
// The things you buy, as their own page.
//
// This was the bottom 600 lines of the Meals screen, which also held every
// recipe and — until today — the whole weekly plan. Three jobs on one page.
//
// `foods` is not a food list. It is "things you buy": nine categories
// covering food by storage state plus shampoo, light bulbs, pet food. That
// is why the ingredient picker filters by category and why a non-edible
// item says so on its card rather than being quietly hidden.
//
// ---- Everything here was learned from real use ----
// The barcode normalisation, the Open Food Facts lookup and its failure
// wording, the offline pending-food list, and the category sentinel that
// survives Android firing `change` on a dismissed select — all of it is
// MOVED here unchanged rather than retyped, because retyping loses exactly
// the details that took a device to find.

import {
  listFoods, listQueuedFoods, findByBarcode, createFood, updateFood,
  countFoodDependents, describeDependents, deleteFood,
  FOOD_CATEGORIES, isEdible, categoryLabel, groupByCategory
} from '../data/foods.js';
import { isScanSupported, normaliseBarcode } from '../lib/barcode.js';
import { openScanner as openScannerDialog } from '../components/scannerDialog.js';
import { lookupBarcode } from '../lib/openFoodFacts.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import {
  lookup, describeOffer, referencePatch, warmFoodReference,
  findBackfillable, describeBackfill
} from '../data/foodReference.js';

import { el, field, selectFrom } from '../lib/dom.js';
function numberInput(id, { min = '0', step = 'any' } = {}) {
  // step 'any' deliberately: min="0.1" with step="1" made every round number
  // unenterable, and that shipped once already.
  return el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  // Fetch the reference file in the background: by the time anyone has
  // typed three letters it is already parsed and indexed.
  warmFoodReference();

  let foods = [];
  let pendingFoods = [];
  // Held so the camera can be released if the user navigates away mid-scan.
  let scanController = null;

  mountEl.appendChild(el('h1', { text: 'Things you buy' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Food, and everything else that ends up in the trolley — cleaning things, '
      + 'toiletries, pet food. Recipes only offer the edible ones.'
  }));


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

  // ---- Worklist B2: fill in what we already know ----
  // Offered above the list, only when there is something to fill. A
  // permanent button for a job with nothing to do is clutter.
  const backfillBox = el('div', { class: 'backfill-offer' });
  backfillBox.hidden = true;
  foodsSection.appendChild(backfillBox);

  const foodsList = el('div', { class: 'card-list' });
  foodsSection.appendChild(foodsList);

  async function renderBackfillOffer() {
    const candidates = await findBackfillable(foods);
    if (destroyed) return;
    backfillBox.replaceChildren();
    backfillBox.hidden = candidates.length === 0;
    if (candidates.length === 0) return;

    backfillBox.appendChild(el('p', {
      text: `${candidates.length} of your foods can be filled in from what the app `
        + 'already knows — pack sizes, what one of them is called, nutrition.'
    }));
    backfillBox.appendChild(el('p', {
      class: 'field-hint',
      // Says the safe thing plainly, because "update my food data" sounds
      // like it might overwrite something you typed.
      text: 'This only fills in blanks. Anything you have already entered is left alone.'
    }));

    const list = el('ul', { class: 'plain-list' });
    for (const row of candidates.slice(0, 5)) {
      list.appendChild(el('li', {
        class: 'field-hint',
        text: `${row.food.name} — ${describeBackfill(row.patch).toLowerCase()}`
      }));
    }
    if (candidates.length > 5) {
      list.appendChild(el('li', { class: 'field-hint', text: `…and ${candidates.length - 5} more.` }));
    }
    backfillBox.appendChild(list);

    const go = el('button', {
      type: 'button', class: 'btn btn-primary',
      text: `Fill in ${candidates.length} food${candidates.length === 1 ? '' : 's'}`
    });
    go.addEventListener('click', async () => {
      go.disabled = true;
      go.textContent = 'Filling in…';
      let done = 0;
      for (const row of candidates) {
        const result = await updateFood(row.food.id, row.patch);
        if (result.ok) done += 1;
      }
      if (destroyed) return;
      showToast(`${done} food${done === 1 ? '' : 's'} filled in. Your shopping list can say tins now.`);
      announce(`${done} foods filled in.`);
      await loadFoods();
    }, { signal });
    backfillBox.appendChild(go);
  }

  const pendingWrap = el('div');
  foodsSection.appendChild(pendingWrap);

  // ---- Manual food form, always reachable without scanning ----
  const foodDetails = el('details', { class: 'food-form' });
  foodDetails.appendChild(el('summary', { text: 'Add a food by hand' }));
  const foodForm = el('form');
  foodForm.setAttribute('aria-label', 'Add a food');

  const foodNameInput = el('input', { id: 'new-food-name', type: 'text' });

  // ---- Phase 13: typical values, offered but never applied on their own ----
  // A published average is a good guess and still a guess, so it goes in
  // only on a tap. The offer is a live region so it is announced when it
  // appears, rather than being a visual-only nudge.
  const referenceOffer = el('div', { class: 'reference-offer' });
  referenceOffer.setAttribute('role', 'status');
  referenceOffer.hidden = true;
  let referenceMatch = null;
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

  // Phase 12: the WORD for one of them. Without it the pantry says
  // "4 item", which reads as broken, and a recipe cannot say "1 tin".
  const labelInput = el('input', { id: 'new-food-item-label', type: 'text', maxlength: '30' });
  const labelHint = el('p', {
    class: 'field-hint', id: 'new-food-item-label-hint',
    text: 'Singular, as in one tin, one egg, one slice. Leave blank and it just says "item".'
  });
  labelInput.setAttribute('aria-describedby', 'new-food-item-label-hint');

  convertFieldset.append(
    field('Grams per millilitre', perMlInput, perMlHint),
    field('Grams per item', perItemInput, perItemHint),
    field('One of these is called a', labelInput, labelHint)
  );

  /**
   * Looks the typed name up and offers to fill the blanks.
   *
   * Only ever fills fields that are EMPTY, and only on the button. If the
   * user has typed their own calories, a reference average must not quietly
   * replace them.
   */
  async function syncReferenceOffer() {
    const entry = await lookup(foodNameInput.value);
    if (destroyed) return;
    referenceMatch = entry;

    if (!entry) {
      referenceOffer.hidden = true;
      referenceOffer.replaceChildren();
      return;
    }

    referenceOffer.replaceChildren();
    referenceOffer.appendChild(el('p', {
      class: 'field-hint', text: describeOffer(entry)
    }));
    const apply = el('button', {
      type: 'button', class: 'btn btn-small', text: `Use typical values`
    });
    apply.addEventListener('click', () => {
      const patch = referencePatch(referenceMatch, {
        calories_per_100g: caloriesInput.value,
        protein_g: proteinInput.value,
        fat_g: fatInput.value,
        carbs_g: carbsInput.value,
        grams_per_ml: perMlInput.value,
        grams_per_item: perItemInput.value,
        item_label: labelInput.value,
        category: foodCategorySelect.value
      });
      if (patch.calories_per_100g !== undefined) caloriesInput.value = patch.calories_per_100g;
      if (patch.protein_g !== undefined) proteinInput.value = patch.protein_g;
      if (patch.fat_g !== undefined) fatInput.value = patch.fat_g;
      if (patch.carbs_g !== undefined) carbsInput.value = patch.carbs_g;
      if (patch.grams_per_ml !== undefined) perMlInput.value = patch.grams_per_ml;
      if (patch.grams_per_item !== undefined) perItemInput.value = patch.grams_per_item;
      if (patch.item_label !== undefined) labelInput.value = patch.item_label;
      if (patch.category !== undefined && !foodCategorySelect.value) {
        foodCategorySelect.value = patch.category;
      }
      if (patch.source) pendingSource = patch.source;
      referenceOffer.hidden = true;
      announce(`Typical values filled in for ${referenceMatch.name}. Change any of them.`);
    }, { signal });
    referenceOffer.appendChild(apply);
    referenceOffer.hidden = false;
  }

  foodNameInput.addEventListener('input', syncReferenceOffer, { signal });

  const foodSourceNote = el('p', { class: 'field-hint' });
  foodSourceNote.hidden = true;
  let pendingSource = 'manual';

  const foodError = el('p', { class: 'field-error', id: 'new-food-error', role: 'alert' });
  foodError.hidden = true;
  const foodSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Save food' });

  foodForm.append(
    field('Food name', foodNameInput),
    referenceOffer,
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
    labelInput.value = food && food.item_label ? food.item_label : '';
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
      item_label: labelInput.value,
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
    if (food.grams_per_item != null) {
      conversions.push(`1 ${food.item_label || 'item'} weighs ${food.grams_per_item} g`);
    }
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
    const label = el('input', { id: `${prefix}-item-label`, type: 'text', maxlength: '30' });
    label.value = food.item_label || '';
    const labelEditHint = el('p', {
      class: 'field-hint', id: `${prefix}-item-label-hint`,
      text: 'Singular: tin, egg, slice. Blank just says "item".'
    });
    label.setAttribute('aria-describedby', `${prefix}-item-label-hint`);
    // Worklist D1. Typed once, reused on every future list. Optional, and
    // the hint says what it is for so it does not read as bookkeeping.
    const price = numberInput(`${prefix}-price`, { min: '0', step: '0.01' });
    price.value = food.typical_price != null ? String(food.typical_price) : '';
    const priceHint = el('p', {
      class: 'field-hint', id: `${prefix}-price-hint`,
      text: 'Optional. What you usually pay for one. Your shopping list uses it '
        + 'to add up roughly what a shop will come to.'
    });
    price.setAttribute('aria-describedby', priceHint.id);

    convSet.append(
      field('Grams per millilitre', perMl),
      field('Grams per item', perItem),
      field('One of these is called a', label, labelEditHint),
      field('Usual price', price, priceHint)
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
        grams_per_item: perItem.value,
        item_label: label.value,
        typical_price: price.value
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
        renderBackfillOffer();
      }
    }

    renderPendingFoods();
  }

  mountEl.appendChild(foodsSection);

  loadFoods();

  return () => {
    destroyed = true;
    // Release the camera even if the user navigates away mid-scan.
    if (scanController) scanController.abort();
    controller.abort();
  };
}
