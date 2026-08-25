// js/views/pantry.js — 21 Aug 2026 v1
// Replaces the Phase 2 stub, whole.
//
// ---- Designed for STOCKTAKING, not for adding one thing ----
// The first real use of this screen is capturing a cupboard: dozens of items
// in one sitting, one-handed, standing up. That shapes everything here.
//
//   * The add form does NOT reset its location or restock date after a save,
//     because the next twelve things are in the same cupboard, bought the
//     same day. Only the item and quantity clear. Re-typing "Kitchen
//     cupboard" sixty times is the friction that stops a stocktake finishing.
//   * A new thing can be created WITHOUT leaving this screen. Bouncing to
//     Meals to add a food, then back, would make capture unusable.
//   * Shelf life is pre-filled from the category and stays editable — a
//     visible default, never a silent one.
//
// ---- Freshness is information, not a warning ----
// "Stocked 3 days ago — about 2 days left. Good one to use up." Never red,
// never an alarm. This is food you have, not a mistake you made
// (principle 1). "Freshness unknown" is a first-class, unembarrassing state.

import {
  listStock, findByFood, addStock, updateStock, removeStock,
  STOCK_UNITS, defaultShelfLife, freshness, describeFreshness, useSoon, todayIso
} from '../data/pantry.js';
import {
  listFoods, createFood, FOOD_CATEGORIES, categoryLabel, groupByCategory
} from '../data/foods.js';
import { formatQuantity } from '../lib/units.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';

// Local element helper, defined here rather than copied in.
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
  wrap.append(el('label', { for: inputEl.id, text: labelText }), inputEl);
  if (hintEl) wrap.appendChild(hintEl);
  return wrap;
}

function numberInput(id, { min = '0', step = 'any' } = {}) {
  // step 'any' deliberately: min="0.1" with step="1" made every round number
  // unenterable in Phase 6 and shipped. See Tests/a11y.mjs.
  return el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
}

function selectFrom(id, options, { includeBlank = null } = {}) {
  const select = el('select', { id });
  if (includeBlank !== null) select.appendChild(el('option', { value: '', text: includeBlank }));
  for (const option of options) {
    select.appendChild(el('option', { value: option.value, text: option.label }));
  }
  return select;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  let stock = [];
  let foods = [];

  mountEl.appendChild(el('h1', { text: 'Pantry' }));

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  mountEl.appendChild(offlineNote);

  function paintOfflineNote() {
    const off = isOffline();
    offlineNote.hidden = !off;
    if (off) {
      offlineNote.textContent =
        'You are offline. The pantry needs a connection to save, so changes are paused until you are back.';
    }
  }

  // ======================= Use these up =======================

  const useSoonSection = el('section');
  useSoonSection.appendChild(el('h2', { text: 'Worth using up' }));
  const useSoonList = el('div', { class: 'card-list' });
  useSoonSection.appendChild(useSoonList);

  function renderUseSoon() {
    useSoonList.replaceChildren();
    const soon = useSoon(stock);
    if (soon.length === 0) {
      useSoonList.appendChild(el('p', {
        text: 'Nothing needs using up. Anything without a stocked date or shelf life is not counted here.'
      }));
      return;
    }
    const list = el('ul', { class: 'use-soon-list' });
    for (const { row, freshness: fresh } of soon) {
      const food = row.foods || {};
      const item = el('li', { class: 'use-soon-item' });
      item.appendChild(el('span', { class: 'use-soon-name', text: food.name || 'Unknown' }));
      item.appendChild(el('span', {
        class: 'field-hint',
        text: `${formatQuantity(row.current_qty, row.unit)} · ${describeFreshness(fresh)}`
      }));
      list.appendChild(item);
    }
    useSoonList.appendChild(list);
  }

  // ======================= What's in ==========================

  const stockSection = el('section');
  stockSection.appendChild(el('h2', { text: "What's in" }));
  const stockList = el('div', { class: 'card-list' });
  stockSection.appendChild(stockList);

  function buildStockCard(row) {
    const food = row.foods || {};
    const { article, body, actions } = createCard({
      title: food.name || 'Unknown', headingLevel: 4, className: 'stock-card'
    });
    article.dataset.stockId = row.id;

    body.appendChild(el('p', {
      class: 'chip',
      text: `${formatQuantity(row.current_qty, row.unit)}${row.default_location ? ` · ${row.default_location}` : ''}`
    }));
    // Words, never a colour alone.
    body.appendChild(el('p', { class: 'field-hint', text: describeFreshness(freshness(row)) }));

    // Quantity is the thing that changes most, so it is editable in place
    // rather than behind an edit form.
    const qtyInput = numberInput(`stock-qty-${row.id}`, { min: '0', step: 'any' });
    qtyInput.value = String(row.current_qty ?? 0);
    const qtyLabel = el('label', {
      for: qtyInput.id, class: 'sr-only',
      text: `How much ${food.name || 'this'} you have, in ${row.unit === 'item' ? 'items' : row.unit}`
    });
    const qtyRow = el('div', { class: 'stock-qty-row' });
    qtyRow.append(qtyLabel, qtyInput, el('span', { class: 'ingredient-unit', text: row.unit === 'item' ? 'items' : row.unit }));
    body.appendChild(qtyRow);

    qtyInput.addEventListener('change', async () => {
      const result = await updateStock(row.id, { current_qty: qtyInput.value });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update stock:', result.error);
        showToast((result.error && result.error.message) || "Couldn't save that — try again.");
        qtyInput.value = String(row.current_qty ?? 0);
        return;
      }
      announce(`${food.name || 'Item'} set to ${formatQuantity(result.data.current_qty, result.data.unit)}.`);
      await loadStock();
      if (!destroyed) {
        const again = document.getElementById(`stock-qty-${row.id}`);
        if (again) again.focus();
      }
    }, { signal });

    // Restocking is a one-tap action: it is what you do when you get home.
    const restockBtn = el('button', { type: 'button', class: 'btn' });
    restockBtn.textContent = 'Restocked today';
    restockBtn.setAttribute('aria-label', `Mark ${food.name || 'this'} as restocked today`);
    restockBtn.addEventListener('click', async () => {
      const result = await updateStock(row.id, { last_restocked: todayIso() });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to mark restocked:', result.error);
        showToast("Couldn't save that — try again.");
        return;
      }
      announce(`${food.name || 'Item'} marked as restocked today.`);
      await loadStock();
    }, { signal });
    actions.appendChild(restockBtn);

    const editWrap = el('div');
    body.appendChild(editWrap);
    const editBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false' });
    editBtn.textContent = 'Details';
    editBtn.setAttribute('aria-label', `Details for ${food.name || 'this item'}`);
    editBtn.addEventListener('click', () => {
      const open = editBtn.getAttribute('aria-expanded') === 'true';
      if (open) {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      editWrap.replaceChildren(buildStockEditForm(row, food, () => {
        editWrap.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
      }));
      editBtn.setAttribute('aria-expanded', 'true');
    }, { signal });
    actions.appendChild(editBtn);

    const removeBtn = el('button', { type: 'button', class: 'btn btn-danger' });
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', `Remove ${food.name || 'this'} from the pantry`);
    removeBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${food.name || 'this'} from the pantry?`,
        message: 'The item itself is kept, so you can add it back later.',
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removeStock(row.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove stock:', result.error);
        showToast("Couldn't remove that — try again.");
        return;
      }
      announce(`${food.name || 'Item'} removed from the pantry.`);
      await loadStock();
    }, { signal });
    actions.appendChild(removeBtn);

    return article;
  }

  function buildStockEditForm(row, food, onDone) {
    const form = el('form');
    form.setAttribute('aria-label', `Details for ${food.name || 'this item'}`);
    const prefix = `stock-edit-${row.id}`;

    const unitSelect = selectFrom(`${prefix}-unit`, STOCK_UNITS);
    unitSelect.value = row.unit || 'g';
    const locationInput = el('input', { id: `${prefix}-location`, type: 'text' });
    locationInput.value = row.default_location || '';
    const shelfInput = numberInput(`${prefix}-shelf`, { min: '1', step: '1' });
    shelfInput.value = row.shelf_life_days != null ? String(row.shelf_life_days) : '';
    const restockedInput = el('input', { id: `${prefix}-restocked`, type: 'date' });
    restockedInput.value = row.last_restocked || '';
    const restockedHint = el('p', {
      class: 'field-hint', id: `${prefix}-restocked-hint`,
      text: 'Leave blank if you do not know — the app will say so rather than guess.'
    });
    restockedInput.setAttribute('aria-describedby', restockedHint.id);

    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;
    const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save' });
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
    cancel.addEventListener('click', () => onDone(), { signal });

    form.append(
      field('Measured in', unitSelect),
      field('Where it lives', locationInput),
      field('Usually keeps (days)', shelfInput),
      field('Last restocked', restockedInput, restockedHint),
      error,
      el('div', { class: 'card-actions' }, [save, cancel])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      save.disabled = true;
      const result = await updateStock(row.id, {
        unit: unitSelect.value,
        default_location: locationInput.value,
        shelf_life_days: shelfInput.value,
        last_restocked: restockedInput.value
      });
      save.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to save stock details:', result.error);
        error.textContent = isOffline()
          ? 'The pantry needs a connection to save. This will work once you are back online.'
          : (result.error && result.error.message) || "Couldn't save that — try again.";
        error.hidden = false;
        return;
      }
      announce(`${food.name || 'Item'} updated.`);
      onDone();
      await loadStock();
    }, { signal });

    return form;
  }

  // ======================= Add to the pantry ==================

  const addSection = el('section');
  addSection.appendChild(el('h2', { text: 'Add to the pantry' }));
  addSection.appendChild(el('p', {
    class: 'field-hint',
    text: 'Stocktaking a whole cupboard? Where it lives and the date stay put between saves, '
      + 'so you only change the item and the amount.'
  }));

  const addForm = el('form');
  addForm.setAttribute('aria-label', 'Add something to the pantry');

  // --- pick an existing thing, or make a new one, without leaving ---
  const modeFieldset = el('fieldset', { class: 'unit-choice' });
  modeFieldset.appendChild(el('legend', { text: 'What are you adding?' }));
  const modeExisting = el('input', { id: 'pantry-mode-existing', type: 'radio', name: 'pantry-mode', value: 'existing' });
  modeExisting.checked = true;
  const modeNew = el('input', { id: 'pantry-mode-new', type: 'radio', name: 'pantry-mode', value: 'new' });
  modeFieldset.append(
    el('div', { class: 'radio-row' }, [modeExisting, el('label', { for: 'pantry-mode-existing', text: 'Something already on my list' })]),
    el('div', { class: 'radio-row' }, [modeNew, el('label', { for: 'pantry-mode-new', text: 'Something new' })])
  );

  // Existing: searchable, grouped, ALL categories (the pantry holds bulbs too).
  const searchInput = el('input', { id: 'pantry-search', type: 'search', autocomplete: 'off' });
  searchInput.placeholder = 'Type to narrow the list';
  const foodSelect = el('select', { id: 'pantry-food' });
  const searchCount = el('p', { class: 'field-hint', id: 'pantry-search-count', role: 'status' });
  searchCount.setAttribute('aria-live', 'polite');
  searchInput.setAttribute('aria-describedby', searchCount.id);
  const existingWrap = el('div');
  existingWrap.append(field('Search', searchInput), searchCount, field('Item', foodSelect));

  // New: name + category, created here so a stocktake never leaves the page.
  const newNameInput = el('input', { id: 'pantry-new-name', type: 'text' });
  const newCategorySelect = selectFrom('pantry-new-category',
    FOOD_CATEGORIES.map((c) => ({ value: c.value, label: c.label })));
  newCategorySelect.value = 'food_ambient';
  const newWrap = el('div');
  newWrap.append(
    field('Name', newNameInput),
    field('What kind of thing is it?', newCategorySelect)
  );
  newWrap.hidden = true;

  const qtyInput = numberInput('pantry-qty', { min: '0', step: 'any' });
  const unitSelect = selectFrom('pantry-unit', STOCK_UNITS);
  const locationInput = el('input', { id: 'pantry-location', type: 'text' });
  locationInput.placeholder = 'Kitchen cupboard';
  const shelfInput = numberInput('pantry-shelf', { min: '1', step: '1' });
  const shelfHint = el('p', {
    class: 'field-hint', id: 'pantry-shelf-hint',
    text: 'Filled in from the kind of thing it is. Change it if you know better, or clear it.'
  });
  shelfInput.setAttribute('aria-describedby', shelfHint.id);
  const restockedInput = el('input', { id: 'pantry-restocked', type: 'date' });
  restockedInput.value = todayIso();
  const restockedHint = el('p', {
    class: 'field-hint', id: 'pantry-restocked-hint',
    text: 'Clear this if you do not know when you bought it.'
  });
  restockedInput.setAttribute('aria-describedby', restockedHint.id);

  const addError = el('p', { class: 'field-error', role: 'alert' });
  addError.hidden = true;
  const addSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Add to pantry' });

  addForm.append(
    modeFieldset, existingWrap, newWrap,
    field('How much', qtyInput),
    field('Measured in', unitSelect),
    field('Where it lives', locationInput),
    field('Usually keeps (days)', shelfInput, shelfHint),
    field('Last restocked', restockedInput, restockedHint),
    addError, addSubmit
  );
  addSection.appendChild(addForm);

  function syncMode() {
    const isNew = modeNew.checked;
    existingWrap.hidden = isNew;
    newWrap.hidden = !isNew;
    syncShelfDefault();
  }

  function chosenCategory() {
    if (modeNew.checked) return newCategorySelect.value;
    const food = foods.find((f) => f.id === foodSelect.value);
    return (food && food.category) || 'food_ambient';
  }

  function syncShelfDefault() {
    // A VISIBLE default: it fills the box so the user sees and can change it,
    // rather than a value written silently on save.
    if (shelfInput.dataset.touched === 'true') return;
    const days = defaultShelfLife(chosenCategory());
    shelfInput.value = days == null ? '' : String(days);
  }

  shelfInput.addEventListener('input', () => { shelfInput.dataset.touched = 'true'; }, { signal });
  modeExisting.addEventListener('change', syncMode, { signal });
  modeNew.addEventListener('change', syncMode, { signal });
  newCategorySelect.addEventListener('change', syncShelfDefault, { signal });
  foodSelect.addEventListener('change', syncShelfDefault, { signal });
  searchInput.addEventListener('input', rebuildFoodSelect, { signal });

  function rebuildFoodSelect() {
    const term = searchInput.value.trim().toLowerCase();
    const chosen = foodSelect.value;
    // Foods already in the pantry are excluded: a second row for the same
    // thing splits the count and makes the shortfall wrong.
    const stocked = new Set(stock.map((row) => row.food_id));
    const available = foods.filter((f) => !stocked.has(f.id));
    const matching = term ? available.filter((f) => (f.name || '').toLowerCase().includes(term)) : available;

    foodSelect.replaceChildren();
    foodSelect.appendChild(el('option', {
      value: '',
      text: available.length === 0
        ? 'Everything on your list is already in the pantry'
        : (matching.length === 0 ? 'Nothing matches' : 'Choose an item')
    }));
    for (const group of groupByCategory(matching)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      for (const food of group.foods) {
        const option = el('option', { value: food.id, text: food.name });
        if (food.id === chosen) option.selected = true;
        optgroup.appendChild(option);
      }
      foodSelect.appendChild(optgroup);
    }
    searchCount.textContent = term
      ? `${matching.length} of ${available.length} match "${searchInput.value.trim()}".`
      : `${available.length} item${available.length === 1 ? '' : 's'} not yet in the pantry.`;
  }

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    addError.hidden = true;

    let foodId = foodSelect.value;
    let itemName = '';

    if (modeNew.checked) {
      const name = newNameInput.value.trim();
      if (!name) {
        addError.textContent = 'Give it a name.';
        addError.hidden = false;
        newNameInput.focus();
        return;
      }
      addSubmit.disabled = true;
      const created = await createFood({ name, category: newCategorySelect.value, source: 'manual' });
      if (destroyed) return;
      if (!created.ok || created.queued) {
        addSubmit.disabled = false;
        addError.textContent = created.queued
          ? 'That saved on this device, but the pantry needs a connection. Try again once you are back online.'
          : (created.error && created.error.message) || "Couldn't save that — try again.";
        addError.hidden = false;
        return;
      }
      foodId = created.data.id;
      itemName = created.data.name;
    } else {
      if (!foodId) {
        addError.textContent = 'Choose an item, or switch to "Something new".';
        addError.hidden = false;
        foodSelect.focus();
        return;
      }
      const food = foods.find((f) => f.id === foodId);
      itemName = (food && food.name) || 'Item';
      // Guard against a second row for the same thing even if the filtered
      // list is stale: a duplicate splits the count and breaks the shortfall.
      const existing = await findByFood(foodId);
      if (destroyed) return;
      if (existing.ok && existing.data) {
        addError.textContent = `${itemName} is already in the pantry. Change its amount there instead.`;
        addError.hidden = false;
        return;
      }
      addSubmit.disabled = true;
    }

    const result = await addStock({
      food_id: foodId,
      current_qty: qtyInput.value,
      unit: unitSelect.value,
      default_location: locationInput.value,
      shelf_life_days: shelfInput.value,
      last_restocked: restockedInput.value
    });
    addSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to add stock:', result.error);
      addError.textContent = isOffline()
        ? 'The pantry needs a connection to save. This will work once you are back online.'
        : (result.error && result.error.message) || "Couldn't add that — try again.";
      addError.hidden = false;
      return;
    }

    // Deliberately NOT a full reset. Location and date persist because the
    // next twelve things are in the same cupboard, bought the same day.
    // Re-typing them is what stops a stocktake finishing.
    announce(`${itemName} added: ${formatQuantity(result.data.current_qty, result.data.unit)}.`);
    newNameInput.value = '';
    qtyInput.value = '';
    searchInput.value = '';
    shelfInput.dataset.touched = 'false';
    await loadAll();
    if (destroyed) return;
    if (modeNew.checked) newNameInput.focus();
    else searchInput.focus();
  }, { signal });

  // ============================ Loading =======================

  function renderStock() {
    stockList.replaceChildren();
    if (stock.length === 0) {
      stockList.appendChild(el('p', {
        text: 'Nothing in the pantry yet. Add what is in your cupboards below — '
          + 'the shopping list uses it to work out what you actually need.'
      }));
      return;
    }
    // Grouped by category so a full cupboard stays navigable by heading.
    const byCategory = groupByCategory(stock.map((row) => ({
      ...row,
      category: (row.foods && row.foods.category) || 'food_ambient'
    })));
    for (const group of byCategory) {
      const heading = el('h3', { class: 'group-heading' });
      heading.textContent = `${group.label} (${group.foods.length})`;
      stockList.appendChild(heading);
      for (const row of group.foods) stockList.appendChild(buildStockCard(row));
    }
  }

  async function loadStock() {
    const result = await listStock();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load the pantry:', result.error);
      stockList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your pantry. Check your connection, then reload this page."
      }));
      return;
    }
    stock = result.data;
    renderStock();
    renderUseSoon();
    rebuildFoodSelect();
  }

  async function loadFoodList() {
    const result = await listFoods();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load items:', result.error);
      return;
    }
    foods = result.data;
    rebuildFoodSelect();
    syncShelfDefault();
  }

  async function loadAll() {
    await loadFoodList();
    if (!destroyed) await loadStock();
  }

  mountEl.append(useSoonSection, stockSection, addSection);
  syncMode();
  paintOfflineNote();

  function onConnectionChange() {
    if (!destroyed) paintOfflineNote();
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  loadAll();

  return () => {
    destroyed = true;
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    controller.abort();
  };
}
