// js/views/pantry.js — 26 Aug 2026 v4
// v4: LOOKS AND DEPTH. v3 fixed the data and the scale problem but shipped a
// row that ran a name straight into its own status text, and hid the one
// thing worth opening an item for — its macros. Tapping a row now opens a
// slide-out sheet: the row stays one scannable line, the detail gets room to
// be read. Spacing, alignment and type weight are set deliberately rather
// than inherited from whatever the browser does with a <li>.
//
// v3: THE SCREEN HAD TO SURVIVE A REAL CUPBOARD. Seven items filled a phone
// screen and a third of one shelf produced them, so the flat list was never
// going to hold sixty. Three things changed:
//
//   1. A blank amount was being saved as 0, and 0 means "you have none" to
//      the shortfall — a scanned shelf would have gone straight back onto
//      the shopping list. The amount is now required, prefilled, and a
//      missing one is a visible state rather than a silent zero.
//   2. New rows start as 1 item, not 0 grams. You buy a JAR of harissa; the
//      pack size is already in the name.
//   3. The screen has three modes. Capture is for stocktaking, Browse is for
//      finding a cupboard, Search is for finding one thing. The default list
//      is never "everything".
//
// ---- Grouped by LOCATION first, category second ----
// Category exists for aisle order in the shop. Standing at a cupboard, the
// question is "what is in THIS cupboard", so location leads here and
// category orders what is inside it.
//
// ---- One row per item, actions behind a disclosure ----
// Four buttons on every card is 240 tap targets at sixty items. The row
// carries the name, the amount and — only when it matters — the freshness.
// The full accessible name stays on every control; only the visible text
// shortens, so nothing is lost to a screen reader.
//
// ---- Freshness is information, not a warning ----
// "Stocked 3 days ago — about 2 days left. Good one to use up." Never red,
// never an alarm. This is food you have, not a mistake you made
// (principle 1). "Freshness unknown" is a first-class, unembarrassing state.
//
// ---- Designed for STOCKTAKING, not for adding one thing ----
// The add form keeps its location and restock date between saves, because
// the next twelve things are in the same cupboard, bought the same day. Only
// the item and amount clear. A new thing can be created without leaving the
// screen. Shelf life is pre-filled from the category and stays editable — a
// visible default, never a silent one.

import {
  listStock, findByFood, addStock, updateStock, removeStock,
  STOCK_UNITS, defaultShelfLife, defaultUnitFor, needsAmount,
  freshness, describeFreshness, useSoon, todayIso
} from '../data/pantry.js';
import {
  listFoods, createFood, findByBarcode, FOOD_CATEGORIES, categoryLabel, groupByCategory
} from '../data/foods.js';
import { isScanSupported } from '../lib/barcode.js';
import { openScanner, describeScanFailure } from '../components/scannerDialog.js';
import { lookupBarcode } from '../lib/openFoodFacts.js';
import { formatQuantity } from '../lib/units.js';
import { isOffline } from '../lib/net.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { openDetailSheet, sheetFact } from '../components/detailSheet.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';

const UNPLACED = 'No location recorded';

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

/** "500 g" or, when nothing was recorded, a phrase that says so plainly. */
function describeAmount(row) {
  if (row.current_qty == null) return 'Amount not recorded';
  return formatQuantity(row.current_qty, row.unit);
}

function unitWord(unit) {
  return unit === 'item' ? 'items' : unit;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  let stock = [];
  let foods = [];
  let mode = 'capture';
  let openLocation = null;
  const justAdded = [];  // stock ids added this session, newest first

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

  // ============== Amounts that were never recorded =====================
  // Shown first and only when there is something to fix. A row with no
  // amount cannot be diffed against a recipe, so without this the shopping
  // list quietly rebuys a cupboard you have already filled.

  const fixSection = el('section');
  fixSection.hidden = true;
  fixSection.appendChild(el('h2', { text: 'Needs an amount' }));
  fixSection.appendChild(el('p', {
    class: 'field-hint',
    text: 'The shopping list treats a missing amount as none, so these would be bought again. '
      + 'Set how much you have and they drop off this list.'
  }));
  const fixList = el('ul', { class: 'stock-rows' });
  fixSection.appendChild(fixList);

  function renderNeedsAmount() {
    const rows = needsAmount(stock);
    fixSection.hidden = rows.length === 0;
    fixList.replaceChildren();
    for (const row of rows) {
      const food = row.foods || {};
      const item = el('li', { class: 'stock-row stock-row-fix' });
      const text = el('span', { class: 'stock-row-text' });
      // Two lines, not two spans run together: the name is the heading of
      // this row and the state is its subtitle.
      text.append(
        el('span', { class: 'stock-row-name', text: food.name || 'Unknown' }),
        el('span', {
          class: 'stock-row-meta',
          text: row.current_qty == null
            ? 'Amount not recorded'
            : `Recorded as none — ${describeAmount(row)}`
        })
      );

      const input = numberInput(`fix-qty-${row.id}`, { min: '0', step: 'any' });
      input.value = row.current_qty == null ? '' : String(row.current_qty);
      const label = el('label', {
        for: input.id, class: 'visually-hidden',
        text: `How much ${food.name || 'this'} you have, in ${unitWord(row.unit)}`
      });
      const unitText = el('span', { class: 'ingredient-unit', text: unitWord(row.unit) });

      input.addEventListener('change', () => saveQuantity(row, input), { signal });

      item.append(text, el('span', { class: 'stock-qty-row' }, [label, input, unitText]));
      fixList.appendChild(item);
    }
  }

  async function saveQuantity(row, input) {
    const food = row.foods || {};
    const result = await updateStock(row.id, { current_qty: input.value });
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to update stock:', result.error);
      showToast((result.error && result.error.message) || "Couldn't save that — try again.");
      input.value = row.current_qty == null ? '' : String(row.current_qty);
      return;
    }
    announce(`${food.name || 'Item'} set to ${describeAmount(result.data)}.`);
    await loadStock();
  }

  // ======================= Worth using up ==============================
  // Rendered only when there IS something. A section that mostly says
  // "nothing to report" is a screenful of nothing on a phone.

  const useSoonSection = el('section');
  useSoonSection.hidden = true;
  useSoonSection.appendChild(el('h2', { text: 'Worth using up' }));
  const useSoonList = el('div', { class: 'card-list' });
  useSoonSection.appendChild(useSoonList);

  function renderUseSoon() {
    const soon = useSoon(stock);
    useSoonSection.hidden = soon.length === 0;
    useSoonList.replaceChildren();
    if (soon.length === 0) return;
    const list = el('ul', { class: 'use-soon-list' });
    for (const { row, freshness: fresh } of soon) {
      const food = row.foods || {};
      const item = el('li', { class: 'use-soon-item' });
      item.appendChild(el('span', { class: 'use-soon-name', text: food.name || 'Unknown' }));
      item.appendChild(el('span', {
        class: 'field-hint',
        text: `${describeAmount(row)} · ${describeFreshness(fresh)}`
      }));
      list.appendChild(item);
    }
    useSoonList.appendChild(list);
  }

  // ============================ Modes ==================================

  const modeGroup = el('div', { class: 'segmented', role: 'group' });
  modeGroup.setAttribute('aria-label', 'How to view the pantry');
  const MODES = [
    { value: 'capture', label: 'Add', hint: 'Add things to the pantry' },
    { value: 'browse', label: 'Browse', hint: 'Browse the pantry by where things live' },
    { value: 'search', label: 'Find', hint: 'Search everything in the pantry' }
  ];
  const modeButtons = new Map();
  for (const m of MODES) {
    const btn = el('button', { type: 'button', class: 'btn segmented-btn', text: m.label });
    btn.setAttribute('aria-label', m.hint);
    btn.setAttribute('aria-pressed', String(m === MODES[0]));
    btn.addEventListener('click', () => setMode(m.value), { signal });
    modeButtons.set(m.value, btn);
    modeGroup.appendChild(btn);
  }

  function setMode(next) {
    mode = next;
    for (const [value, btn] of modeButtons) btn.setAttribute('aria-pressed', String(value === next));
    capturePanel.hidden = next !== 'capture';
    browsePanel.hidden = next !== 'browse';
    searchPanel.hidden = next !== 'search';
    const chosen = MODES.find((m) => m.value === next);
    if (chosen) announce(`${chosen.label} mode.`);
    if (next === 'browse') renderBrowse();
    if (next === 'search') renderSearchResults();
  }

  // ==================== One row, actions on demand =====================

  function buildStockRow(row) {
    const food = row.foods || {};
    const fresh = freshness(row);
    const name = food.name || 'Unknown';

    const item = el('li', { class: 'stock-row' });
    item.dataset.stockId = row.id;

    // Freshness earns a place on the collapsed row only when it is close.
    // "about 365 days left" on sixty rows is noise, not information.
    const meta = [describeAmount(row)];
    if (fresh.state === 'soon' || fresh.state === 'past') meta.push(describeFreshness(fresh));

    const open = el('button', { type: 'button', class: 'stock-row-open' });
    const text = el('span', { class: 'stock-row-text' });
    text.append(
      el('span', { class: 'stock-row-name', text: name }),
      el('span', { class: 'stock-row-meta', text: meta.join(' · ') })
    );
    // A chevron is decoration; the accessible name says what the control does.
    const chevron = el('span', { class: 'stock-row-chevron', 'aria-hidden': 'true', text: '›' });
    open.append(text, chevron);
    open.setAttribute('aria-label', `${name}, ${meta.join(', ')}. Open details.`);
    open.addEventListener('click', () => openStockSheet(row, open), { signal });

    item.appendChild(open);
    return item;
  }

  /** Everything about one item, with room to actually read it. */
  function openStockSheet(row, returnFocusTo) {
    const food = row.foods || {};
    const name = food.name || 'Unknown';

    openDetailSheet({
      title: name,
      subtitle: categoryLabel(food.category || 'food_ambient'),
      returnFocusTo,
      build: (body, { close }) => {
        // ---- What you have -------------------------------------------
        const amountSection = el('section', { class: 'sheet-section' });
        amountSection.appendChild(el('h3', { class: 'sheet-section-title', text: 'What you have' }));

        const qtyInput = numberInput(`sheet-qty-${row.id}`, { min: '0', step: 'any' });
        qtyInput.value = row.current_qty == null ? '' : String(row.current_qty);
        const qtyLabel = el('label', {
          for: qtyInput.id, class: 'sheet-fact-label',
          text: `Amount in ${unitWord(row.unit)}`
        });
        const qtyRow = el('div', { class: 'sheet-fact' });
        qtyRow.append(qtyLabel, el('span', { class: 'stock-qty-row' }, [
          qtyInput, el('span', { class: 'ingredient-unit', text: unitWord(row.unit) })
        ]));
        qtyInput.addEventListener('change', () => saveQuantity(row, qtyInput), { signal });
        amountSection.appendChild(qtyRow);

        amountSection.appendChild(sheetFact('Where it lives', row.default_location || 'Not recorded'));
        amountSection.appendChild(sheetFact('Freshness', describeFreshness(freshness(row))));
        amountSection.appendChild(sheetFact('Usually keeps',
          row.shelf_life_days == null ? 'Not recorded' : `${row.shelf_life_days} days`));
        body.appendChild(amountSection);

        // ---- What it is ----------------------------------------------
        // The reason this sheet exists: the macros were captured by the
        // scan and then had nowhere to be read.
        const factsSection = el('section', { class: 'sheet-section' });
        factsSection.appendChild(el('h3', { class: 'sheet-section-title', text: 'Per 100 g' }));
        const macro = (value, unit) => (value == null || value === '' ? 'Not recorded' : `${value} ${unit}`);
        factsSection.append(
          sheetFact('Calories', macro(food.calories_per_100g, 'kcal')),
          sheetFact('Protein', macro(food.protein_g, 'g')),
          sheetFact('Fat', macro(food.fat_g, 'g')),
          sheetFact('Carbohydrate', macro(food.carbs_g, 'g'))
        );
        if (food.barcode) factsSection.appendChild(sheetFact('Barcode', food.barcode));
        if (food.calories_per_100g == null) {
          factsSection.appendChild(el('p', {
            class: 'field-hint',
            text: 'Nothing was recorded for this one. Adding it on the item in Meals '
              + 'lets it count towards a recipe.'
          }));
        }
        body.appendChild(factsSection);

        // ---- Actions --------------------------------------------------
        const actions = el('div', { class: 'sheet-actions' });

        // Restocking is a one-tap action: it is what you do when you get home.
        const restockBtn = el('button', { type: 'button', class: 'btn', text: 'Restocked today' });
        restockBtn.setAttribute('aria-label', `Mark ${name} as restocked today`);
        restockBtn.addEventListener('click', async () => {
          const result = await updateStock(row.id, { last_restocked: todayIso() });
          if (destroyed) return;
          if (!result.ok) {
            console.error('Failed to mark restocked:', result.error);
            showToast("Couldn't save that — try again.");
            return;
          }
          announce(`${name} marked as restocked today.`);
          close();
          await loadStock();
        }, { signal });
        actions.appendChild(restockBtn);

        const editWrap = el('div');
        const editBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', text: 'Edit details' });
        editBtn.setAttribute('aria-label', `Edit details for ${name}`);
        editBtn.addEventListener('click', () => {
          const isOpen = editBtn.getAttribute('aria-expanded') === 'true';
          if (isOpen) {
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

        const removeBtn = el('button', { type: 'button', class: 'btn btn-danger', text: 'Remove' });
        removeBtn.setAttribute('aria-label', `Remove ${name} from the pantry`);
        removeBtn.addEventListener('click', async () => {
          const confirmed = await confirmDialog({
            title: `Remove ${name} from the pantry?`,
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
          announce(`${name} removed from the pantry.`);
          close();
          await loadStock();
        }, { signal });
        actions.appendChild(removeBtn);

        body.append(actions, editWrap);
      }
    });
  }

  function buildStockEditForm(row, food, onDone) {
    const form = el('form');
    form.setAttribute('aria-label', `Details for ${food.name || 'this item'}`);
    const prefix = `stock-edit-${row.id}`;

    const unitSelect = selectFrom(`${prefix}-unit`, STOCK_UNITS);
    unitSelect.value = row.unit || 'item';
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

  // ========================= Browse by location ========================

  const browsePanel = el('section');
  browsePanel.hidden = true;
  browsePanel.appendChild(el('h2', { text: "What's in" }));
  const browseSummary = el('p', { class: 'field-hint', role: 'status' });
  browseSummary.setAttribute('aria-live', 'polite');
  browsePanel.appendChild(browseSummary);
  const browseList = el('div', { class: 'location-list' });
  browsePanel.appendChild(browseList);

  function locationsOf(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = row.default_location || UNPLACED;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function renderBrowse() {
    browseList.replaceChildren();
    if (stock.length === 0) {
      browseSummary.textContent = '';
      browseList.appendChild(el('p', {
        text: 'Nothing in the pantry yet. Use Add to capture what is in your cupboards — '
          + 'the shopping list uses it to work out what you actually need.'
      }));
      return;
    }
    const groups = locationsOf(stock);
    browseSummary.textContent =
      `${stock.length} item${stock.length === 1 ? '' : 's'} across ${groups.length} `
      + `place${groups.length === 1 ? '' : 's'}. Open one at a time.`;

    for (const [location, rows] of groups) {
      // One location's contents in the DOM at a time: sixty rows rendered at
      // once is what made the flat list unusable.
      const isOpen = openLocation === location;
      const heading = el('h3', { class: 'location-heading' });
      const toggle = el('button', { type: 'button', class: 'location-toggle' });
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = `${location} (${rows.length})`;
      toggle.setAttribute('aria-label',
        `${location}, ${rows.length} item${rows.length === 1 ? '' : 's'}`);
      heading.appendChild(toggle);
      browseList.appendChild(heading);

      const body = el('div', { class: 'location-body' });
      body.hidden = !isOpen;
      if (isOpen) body.appendChild(renderGroupedRows(rows));
      browseList.appendChild(body);

      toggle.addEventListener('click', () => {
        openLocation = isOpen ? null : location;
        renderBrowse();
        if (!destroyed && openLocation) {
          announce(`${location} open, ${rows.length} item${rows.length === 1 ? '' : 's'}.`);
        }
      }, { signal });
    }
  }

  /** Within a location, category orders what is inside it. */
  function renderGroupedRows(rows) {
    const wrap = el('div');
    const byCategory = groupByCategory(rows.map((row) => ({
      ...row,
      category: (row.foods && row.foods.category) || 'food_ambient'
    })));
    for (const group of byCategory) {
      wrap.appendChild(el('h4', { class: 'group-heading', text: `${group.label} (${group.foods.length})` }));
      const list = el('ul', { class: 'stock-rows' });
      for (const row of group.foods) list.appendChild(buildStockRow(row));
      wrap.appendChild(list);
    }
    return wrap;
  }

  // ============================== Find =================================

  const searchPanel = el('section');
  searchPanel.hidden = true;
  searchPanel.appendChild(el('h2', { text: 'Find something' }));

  const findInput = el('input', { id: 'pantry-find', type: 'search', autocomplete: 'off' });
  findInput.placeholder = 'Type part of a name';
  const findCategory = selectFrom('pantry-find-category',
    FOOD_CATEGORIES.map((c) => ({ value: c.value, label: c.label })), { includeBlank: 'Any kind' });
  const findLocation = selectFrom('pantry-find-location', [], { includeBlank: 'Anywhere' });
  const findCount = el('p', { class: 'field-hint', id: 'pantry-find-count', role: 'status' });
  findCount.setAttribute('aria-live', 'polite');
  findInput.setAttribute('aria-describedby', findCount.id);
  const findResults = el('ul', { class: 'stock-rows' });

  searchPanel.append(
    field('Search', findInput),
    field('Kind of thing', findCategory),
    field('Where it lives', findLocation),
    findCount,
    findResults
  );

  findInput.addEventListener('input', renderSearchResults, { signal });
  findCategory.addEventListener('change', renderSearchResults, { signal });
  findLocation.addEventListener('change', renderSearchResults, { signal });

  function rebuildLocationFilter() {
    const chosen = findLocation.value;
    const names = [...new Set(stock.map((row) => row.default_location || UNPLACED))].sort();
    findLocation.replaceChildren(el('option', { value: '', text: 'Anywhere' }));
    for (const name of names) {
      const option = el('option', { value: name, text: name });
      if (name === chosen) option.selected = true;
      findLocation.appendChild(option);
    }
  }

  function renderSearchResults() {
    const term = findInput.value.trim().toLowerCase();
    const category = findCategory.value;
    const location = findLocation.value;

    const matching = stock.filter((row) => {
      const food = row.foods || {};
      if (term && !(food.name || '').toLowerCase().includes(term)) return false;
      if (category && (food.category || 'food_ambient') !== category) return false;
      if (location && (row.default_location || UNPLACED) !== location) return false;
      return true;
    });

    findResults.replaceChildren();
    for (const row of matching) findResults.appendChild(buildStockRow(row));

    const filtered = term || category || location;
    findCount.textContent = matching.length === 0
      ? (stock.length === 0 ? 'The pantry is empty.' : 'Nothing matches those filters.')
      : `${matching.length} of ${stock.length} item${stock.length === 1 ? '' : 's'}`
        + `${filtered ? ' match' : ''}.`;
  }

  // ======================= Add to the pantry ===========================

  const capturePanel = el('section');
  capturePanel.appendChild(el('h2', { text: 'Add to the pantry' }));
  capturePanel.appendChild(el('p', {
    class: 'field-hint',
    text: 'Stocktaking a whole cupboard? Where it lives and the date stay put between saves, '
      + 'so you only change the item and the amount.'
  }));

  // Scanning first: it is the fast path for a shelf of packaged goods.
  const scanWrap = el('div', { class: 'scan-actions' });
  const scanBtn = el('button', {
    type: 'button', class: 'btn btn-primary btn-block', text: 'Scan a barcode'
  });
  const scanNote = el('p', { class: 'field-hint', role: 'status' });
  scanNote.setAttribute('aria-live', 'polite');
  scanNote.hidden = true;
  scanWrap.append(scanBtn, scanNote);
  if (!isScanSupported()) {
    scanBtn.hidden = true;
    scanNote.hidden = false;
    scanNote.textContent = 'This browser cannot use the camera, so add items with the form below.';
  }
  capturePanel.appendChild(scanWrap);

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
  // Held between a scan and the save that follows it, so a scanned item
  // keeps its barcode and macros and can be recognised next time.
  let scannedExtras = null;

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

  // REQUIRED, and prefilled with 1. A blank amount became 0, and 0 means
  // "you have none" to the shortfall — seven scanned jars would have been
  // rebought. Prefilling makes "required" cost nothing during a stocktake.
  const qtyInput = numberInput('pantry-qty', { min: '0', step: 'any' });
  qtyInput.value = '1';
  qtyInput.required = true;
  const qtyHint = el('p', {
    class: 'field-hint', id: 'pantry-qty-hint',
    text: 'One jar, one tin, one packet — count the things, not the grams inside them.'
  });
  qtyInput.setAttribute('aria-describedby', qtyHint.id);
  const unitSelect = selectFrom('pantry-unit', STOCK_UNITS);
  unitSelect.value = 'item';
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
    field('How much', qtyInput, qtyHint),
    field('Measured in', unitSelect),
    field('Where it lives', locationInput),
    field('Usually keeps (days)', shelfInput, shelfHint),
    field('Last restocked', restockedInput, restockedHint),
    addError, addSubmit
  );
  capturePanel.appendChild(addForm);

  // ---- Just added -------------------------------------------------------
  // During a stocktake the only list worth seeing is what you just entered,
  // so a double-scan is caught while you still remember doing it.
  const justAddedSection = el('div');
  justAddedSection.hidden = true;
  justAddedSection.appendChild(el('h3', { text: 'Just added' }));
  const justAddedList = el('ul', { class: 'stock-rows' });
  justAddedSection.appendChild(justAddedList);
  capturePanel.appendChild(justAddedSection);

  function renderJustAdded() {
    const rows = justAdded
      .map((id) => stock.find((row) => row.id === id))
      .filter(Boolean)
      .slice(0, 5);
    justAddedSection.hidden = rows.length === 0;
    justAddedList.replaceChildren();
    for (const row of rows) justAddedList.appendChild(buildStockRow(row));
  }

  // ---- Category confirmation after a scan -------------------------------
  // Same sentinel discipline as views/meals.js v7: a boolean flag was
  // defeated because Android's native select fires `change` on dismissal.
  // An empty value cannot be faked by a stray event.
  const CATEGORY_SENTINEL_ID = 'pantry-new-category-unchosen';

  function requireCategoryChoice(suggested) {
    clearCategorySentinel();
    const blank = el('option', {
      id: CATEGORY_SENTINEL_ID,
      value: '',
      text: suggested ? `Choose one — we guessed ${categoryLabel(suggested)}` : 'Choose one'
    });
    newCategorySelect.insertBefore(blank, newCategorySelect.firstChild);
    newCategorySelect.value = '';
    newCategorySelect.setAttribute('aria-invalid', 'true');
  }

  function clearCategorySentinel() {
    const existing = newCategorySelect.querySelector(`#${CATEGORY_SENTINEL_ID}`);
    if (existing) existing.remove();
    newCategorySelect.removeAttribute('aria-invalid');
  }

  newCategorySelect.addEventListener('change', () => {
    if (newCategorySelect.value) clearCategorySentinel();
  }, { signal });

  // ---- Scanning ---------------------------------------------------------

  let scanSession = null;

  scanBtn.addEventListener('click', async () => {
    if (scanSession) return;
    scanNote.hidden = true;
    scanSession = openScanner({ title: 'Scan into the pantry' });
    const outcome = await scanSession.result;
    scanSession = null;
    if (destroyed) return;
    await handleScan(outcome);
  }, { signal });

  async function handleScan(outcome) {
    if (!outcome.ok) {
      scanNote.hidden = false;
      scanNote.textContent = describeScanFailure(outcome.reason);
      return;
    }
    const { barcode } = outcome;
    scanNote.hidden = false;
    scanNote.textContent = `Barcode ${barcode} scanned. Looking it up.`;

    const existing = await findByBarcode(barcode);
    if (destroyed) return;

    if (existing.ok && existing.data && !existing.pending) {
      const food = existing.data;
      // Already stocked? Send them to the row rather than making a second
      // one — a duplicate splits the count and breaks the shortfall.
      const alreadyStocked = stock.find((row) => row.food_id === food.id);
      if (alreadyStocked) {
        if (!justAdded.includes(alreadyStocked.id)) justAdded.unshift(alreadyStocked.id);
        renderJustAdded();
        scanNote.textContent = `${food.name} is already in the pantry — opening it so you can change the amount.`;
        announce(scanNote.textContent);
        openStockSheet(alreadyStocked);
        return;
      }
      // Known but not stocked: preselect it and jump to the amount, which is
      // the only thing left to say.
      modeExisting.checked = true;
      syncMode();
      searchInput.value = '';
      rebuildFoodSelect();
      foodSelect.value = food.id;
      syncDefaults();
      scanNote.textContent = `${food.name} recognised. How many have you got?`;
      announce(scanNote.textContent);
      qtyInput.focus();
      qtyInput.select();
      return;
    }

    // Unknown barcode: fill what Open Food Facts knows and stop at the
    // category, which it cannot know.
    const lookup = await lookupBarcode(barcode);
    if (destroyed) return;

    modeNew.checked = true;
    syncMode();
    scannedExtras = { barcode };

    if (lookup.ok) {
      newNameInput.value = lookup.data.name || '';
      scannedExtras = {
        barcode,
        calories_per_100g: lookup.data.calories_per_100g,
        protein_g: lookup.data.protein_g,
        fat_g: lookup.data.fat_g,
        carbs_g: lookup.data.carbs_g
      };
      requireCategoryChoice(lookup.data.suggestedCategory);
      scanNote.textContent = lookup.data.suggestedCategory
        ? `Found: ${lookup.data.name}. From the barcode this looks like `
          + `${categoryLabel(lookup.data.suggestedCategory)} — pick it to confirm, or choose another.`
        : `Found: ${lookup.data.name}. Choose what kind of thing it is before saving.`;
    } else {
      newNameInput.value = '';
      requireCategoryChoice(null);
      const reasons = {
        'not-found': 'That barcode is not in Open Food Facts. Type the name and choose a category.',
        offline: 'You are offline, so the barcode could not be looked up. Type the name yourself.',
        timeout: 'Open Food Facts did not answer in time. Type the name yourself.',
        invalid: 'That barcode could not be read properly. Type the details in below.'
      };
      scanNote.textContent = reasons[lookup.reason] || 'Open Food Facts could not be reached. Type the name yourself.';
    }
    announce(scanNote.textContent);
    if (newNameInput.value) newCategorySelect.focus();
    else newNameInput.focus();
  }

  function syncMode() {
    const isNew = modeNew.checked;
    existingWrap.hidden = isNew;
    newWrap.hidden = !isNew;
    syncDefaults();
  }

  function chosenCategory() {
    if (modeNew.checked) return newCategorySelect.value;
    const food = foods.find((f) => f.id === foodSelect.value);
    return (food && food.category) || 'food_ambient';
  }

  function syncDefaults() {
    // VISIBLE defaults: they fill the boxes so the user sees and can change
    // them, rather than values written silently on save.
    const category = chosenCategory();
    if (shelfInput.dataset.touched !== 'true') {
      const days = defaultShelfLife(category);
      shelfInput.value = days == null ? '' : String(days);
    }
    if (unitSelect.dataset.touched !== 'true') {
      unitSelect.value = defaultUnitFor(category);
    }
  }

  shelfInput.addEventListener('input', () => { shelfInput.dataset.touched = 'true'; }, { signal });
  unitSelect.addEventListener('change', () => { unitSelect.dataset.touched = 'true'; }, { signal });
  modeExisting.addEventListener('change', syncMode, { signal });
  modeNew.addEventListener('change', syncMode, { signal });
  newCategorySelect.addEventListener('change', syncDefaults, { signal });
  foodSelect.addEventListener('change', syncDefaults, { signal });
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

    // Checked here as well as by the attribute: constraint validation is a
    // browser behaviour, and this path must not depend on it.
    if (qtyInput.value.trim() === '') {
      addError.textContent =
        'Say how much you have. A blank amount reads as "none", and the shopping list '
        + 'would buy it all over again.';
      addError.hidden = false;
      qtyInput.focus();
      return;
    }

    let foodId = foodSelect.value;
    let itemName = '';

    if (modeNew.checked) {
      if (!newCategorySelect.value) {
        addError.textContent =
          'Choose what kind of thing this is before saving. A scan cannot tell us, and it '
          + 'decides whether this can be a recipe ingredient.';
        addError.hidden = false;
        newCategorySelect.focus();
        return;
      }
      const name = newNameInput.value.trim();
      if (!name) {
        addError.textContent = 'Give it a name.';
        addError.hidden = false;
        newNameInput.focus();
        return;
      }
      addSubmit.disabled = true;
      const created = await createFood({
        name,
        category: newCategorySelect.value,
        source: scannedExtras ? 'openfoodfacts' : 'manual',
        barcode: scannedExtras ? scannedExtras.barcode : null,
        calories_per_100g: scannedExtras ? scannedExtras.calories_per_100g : null,
        protein_g: scannedExtras ? scannedExtras.protein_g : null,
        fat_g: scannedExtras ? scannedExtras.fat_g : null,
        carbs_g: scannedExtras ? scannedExtras.carbs_g : null
      });
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
    announce(`${itemName} added: ${describeAmount(result.data)}.`);
    justAdded.unshift(result.data.id);
    newNameInput.value = '';
    qtyInput.value = '1';
    scannedExtras = null;
    clearCategorySentinel();
    searchInput.value = '';
    shelfInput.dataset.touched = 'false';
    unitSelect.dataset.touched = 'false';
    await loadAll();
    if (destroyed) return;
    if (modeNew.checked) newNameInput.focus();
    else searchInput.focus();
  }, { signal });

  // ============================ Loading =======================

  function renderStock() {
    renderNeedsAmount();
    renderUseSoon();
    renderJustAdded();
    rebuildLocationFilter();
    if (mode === 'browse') renderBrowse();
    if (mode === 'search') renderSearchResults();
  }

  async function loadStock() {
    const result = await listStock();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load the pantry:', result.error);
      browseList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your pantry. Check your connection, then reload this page."
      }));
      return;
    }
    stock = result.data;
    renderStock();
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
    syncDefaults();
  }

  async function loadAll() {
    await loadFoodList();
    if (!destroyed) await loadStock();
  }

  mountEl.append(fixSection, useSoonSection, modeGroup, capturePanel, browsePanel, searchPanel);
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
    // Release the camera if the user navigates away mid-scan.
    if (scanSession) scanSession.abort();
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    controller.abort();
  };
}
