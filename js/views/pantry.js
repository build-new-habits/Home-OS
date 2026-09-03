// js/views/pantry.js — 01 Sep 2026 v13
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
  listStock, findByFood, addStock, updateStock, removeStock, LEVEL_LABELS,
  STOCK_UNITS, defaultShelfLife, defaultUnitFor, needsAmount,
  freshness, describeFreshness, useSoon, todayIso
} from '../data/pantry.js';
import {
  listFoods, createFood, findByBarcode, FOOD_CATEGORIES, categoryLabel, groupByCategory
} from '../data/foods.js';
import { isScanSupported } from '../lib/barcode.js';
import { openScanner, describeScanFailure } from '../components/scannerDialog.js';
import { lookupBarcode } from '../lib/openFoodFacts.js';
import { formatQuantity, formatPackQuantity, pluraliseLabel } from '../lib/units.js';
import { isOffline } from '../lib/net.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { openDetailSheet, sheetFact } from '../components/detailSheet.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { stateBadge, countChip } from '../lib/icons.js';
import { notify, useSoonMessage } from '../lib/notify.js';
import { getState } from '../lib/store.js';
import { findClaimCandidates, claimFood, describeClaim } from '../data/foodClaim.js';
import { claimDialog } from '../components/claimDialog.js';

import { el, field, selectFrom } from '../lib/dom.js';
const UNPLACED = 'No location recorded';

// Local element helper, defined here rather than copied in.
function numberInput(id, { min = '0', step = 'any' } = {}) {
  // step 'any' deliberately: min="0.1" with step="1" made every round number
  // unenterable in Phase 6 and shipped. See Tests/a11y.mjs.
  return el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
}

/**
 * "4 tins (1.6 kg)", "500 g", or a phrase saying nothing was recorded.
 *
 * Phase 12: takes the food so it can reach item_label and grams_per_item.
 * Without the food it degrades to "4 items", which is what it said before.
 */
function describeAmount(row, food = null) {
  if (row.current_qty == null) {
    // Phase 31. A rough level is a real answer and reads as one. Only
    // "nothing said" gets the old wording.
    const said = LEVEL_LABELS.find((l) => l.value === row.level);
    return said ? said.label : 'Amount not recorded';
  }
  return formatPackQuantity(row.current_qty, row.unit, food || row.foods || null);
}

/**
 * The word beside the number: "tins", "items", "g", "ml".
 *
 * Phase 12 defect, caught on a real screen: this hardcoded 'items', so a
 * food with item_label = 'tin' still had a form reading "Amount in items"
 * next to a list reading "4 tins". The label has to reach the FORM, not
 * just the summary line, or the two disagree in the same view.
 */
function unitWord(unit, food = null) {
  if (unit !== 'item') return unit;
  return pluraliseLabel(food && food.item_label, 2);
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  let stock = [];
  let foods = [];
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
            : `Recorded as none — ${describeAmount(row, row.foods)}`
        })
      );

      const input = numberInput(`fix-qty-${row.id}`, { min: '0', step: 'any' });
      input.value = row.current_qty == null ? '' : String(row.current_qty);
      const label = el('label', {
        for: input.id, class: 'visually-hidden',
        text: `How much ${food.name || 'this'} you have, in ${unitWord(row.unit, row.foods)}`
      });
      const unitText = el('span', { class: 'ingredient-unit', text: unitWord(row.unit, row.foods) });

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

  /**
   * Phase 32. Tells you once a day about anything going off.
   *
   * Fired from the pantry screen rather than a background job: this is a
   * PWA with no server-side scheduler, so the honest version happens when
   * the app is open. Better a reminder that arrives when you look than a
   * switch that never does anything.
   */
  function maybeNotifyUseSoon(soon) {
    if (soon.length === 0) return;
    const prefs = (getState().settings || {}).notification_prefs || {};
    const message = useSoonMessage(soon.map(({ row }) => (row.foods || {})));
    if (!message) return;
    notify({
      key: 'use-soon',
      title: message.title,
      body: message.body,
      prefs,
      prefKey: 'use_soon',
      todayISO: todayIso()
    });
  }

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
      item.appendChild(el('span', { class: 'field-hint', text: describeAmount(row, row.foods) }));
      // Phase 26: the state gets a shape and a colour as well as its words.
      // These four states have existed in the data since Phase 7 and have
      // never been anything but a sentence you had to read.
      item.appendChild(stateBadge(fresh.state, describeFreshness(fresh)));
      list.appendChild(item);
    }
    useSoonList.appendChild(list);
    maybeNotifyUseSoon(soon);
  }

  // ============================ Modes ==================================

  // ---- Phase 23: the mode switcher is gone ----
  // The pantry used to open in "Add" mode behind a three-way segmented
  // control, so the default screen was a form for adding stock — when most
  // visits are "have I got X". Worse, search was a MODE you had to switch
  // to, which means you had to know it was there.
  //
  // Looking for something is not a mode. It is what you came for. So search
  // is pinned at the top, always, and Add is one button.

  const addToggle = el('button', {
    type: 'button', class: 'btn add-stock-toggle', text: 'Add something to the pantry'
  });
  addToggle.setAttribute('aria-expanded', 'false');
  addToggle.addEventListener('click', () => {
    const open = addToggle.getAttribute('aria-expanded') === 'true';
    addToggle.setAttribute('aria-expanded', String(!open));
    capturePanel.hidden = open;
    if (!open) {
      announce('Add to the pantry.');
      const first = capturePanel.querySelector('input, select, button');
      if (first) first.focus();
    }
  }, { signal });

  // ==================== One row, actions on demand =====================

  /** Places already in use, so putting something away is a tap not a form. */
  function knownLocations() {
    const seen = new Set();
    for (const row of stock) {
      if (row.default_location) seen.add(row.default_location);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }

  function buildStockRow(row, { unplaced = false } = {}) {
    const food = row.foods || {};
    const fresh = freshness(row);
    const name = food.name || 'Unknown';

    const item = el('li', { class: 'stock-row' });
    item.dataset.stockId = row.id;

    // Freshness earns a place on the collapsed row only when it is close.
    // "about 365 days left" on sixty rows is noise, not information.
    const meta = [describeAmount(row, row.foods)];
    // Left out of the joined meta line so it can render as a badge below.

    const open = el('button', { type: 'button', class: 'stock-row-open' });
    const text = el('span', { class: 'stock-row-text' });
    text.append(
      el('span', { class: 'stock-row-name', text: name }),
      el('span', { class: 'stock-row-meta', text: meta.join(' · ') })
    );
    // Freshness earns a place on the collapsed row only when it is close.
    // "about 365 days left" on sixty rows is noise, not information — so
    // the badge appears for soon and past, and nothing else.
    if (fresh.state === 'soon' || fresh.state === 'past') {
      text.appendChild(stateBadge(fresh.state, describeFreshness(fresh)));
    }
    // A chevron is decoration; the accessible name says what the control does.
    const chevron = el('span', { class: 'stock-row-chevron', 'aria-hidden': 'true', text: '›' });
    open.append(text, chevron);
    open.setAttribute('aria-label', `${name}, ${meta.join(', ')}. Open details.`);
    open.addEventListener('click', () => openStockSheet(row, open), { signal });

    item.appendChild(open);

    // ---- Phase 31: one tap, no counting ----
    // The entire point. A control behind a sheet behind a row is three
    // taps, and three taps is why the cupboard drifts.
    const levelRow = el('div', { class: 'level-buttons' });
    levelRow.setAttribute('role', 'group');
    levelRow.setAttribute('aria-label', `How much ${name} is left`);
    for (const option of LEVEL_LABELS) {
      const btn = el('button', {
        type: 'button',
        class: `btn btn-small level-btn${row.level === option.value ? ' level-btn-on' : ''}`,
        text: option.label
      });
      // Pressed state, not just a colour — the current answer has to be
      // readable without seeing it (WCAG 4.1.2).
      btn.setAttribute('aria-pressed', String(row.level === option.value));
      btn.setAttribute('aria-label', `${name}: ${option.label.toLowerCase()}`);
      btn.addEventListener('click', async () => {
        // Tapping the current answer clears it back to "nothing said",
        // which is the only way to undo a mis-tap without a dialog.
        const next = row.level === option.value ? null : option.value;
        btn.disabled = true;
        const result = await updateStock(row.id, { level: next });
        btn.disabled = false;
        if (destroyed) return;
        if (!result.ok) { showToast('That could not be saved.'); return; }
        announce(next ? `${name}: ${option.label.toLowerCase()}.` : `${name}: nothing recorded.`);
        await loadStock();
      }, { signal });
      levelRow.appendChild(btn);
    }
    // Only offered when there is no number. A number is a better answer and
    // showing both would ask the same question twice.
    if (row.current_qty == null) item.appendChild(levelRow);

    // Phase 23. One tap to put it away, from the places you already use.
    // No form, no sheet — a form here is why "No location recorded" stayed
    // full for weeks.
    if (unplaced) {
      const places = knownLocations();
      if (places.length > 0) {
        const row2 = el('div', { class: 'place-buttons' });
        for (const place of places.slice(0, 4)) {
          const btn = el('button', { type: 'button', class: 'btn btn-small', text: place });
          btn.setAttribute('aria-label', `Put ${name} in ${place}`);
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            const result = await updateStock(row.id, { default_location: place });
            btn.disabled = false;
            if (destroyed) return;
            if (!result.ok) { showToast('That could not be saved.'); return; }
            announce(`${name} put in ${place}.`);
            await loadStock();
          }, { signal });
          row2.appendChild(btn);
        }
        item.appendChild(row2);
      }
    }

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
          text: `Amount in ${unitWord(row.unit, row.foods)}`
        });
        const qtyRow = el('div', { class: 'sheet-fact' });
        qtyRow.append(qtyLabel, el('span', { class: 'stock-qty-row' }, [
          qtyInput, el('span', { class: 'ingredient-unit', text: unitWord(row.unit, row.foods) })
        ]));
        qtyInput.addEventListener('change', () => saveQuantity(row, qtyInput), { signal });
        amountSection.appendChild(qtyRow);

        amountSection.appendChild(sheetFact('Where it lives', row.default_location || 'Not recorded'));
        amountSection.appendChild(sheetFact('Freshness', describeFreshness(freshness(row))));
        amountSection.appendChild(sheetFact('Use by',
          row.use_by ? row.use_by : 'Not recorded — estimated from shelf life'));
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
          // Phase 28. Undo instead of a confirm. A confirm asks you to
          // predict your own mistake before making it; undo lets you notice
          // it afterwards, which is how mistakes actually get noticed.
          const snapshot = {
            food_id: row.food_id,
            current_qty: row.current_qty,
            unit: row.unit,
            default_location: row.default_location,
            shelf_life_days: row.shelf_life_days,
            last_restocked: row.last_restocked,
            use_by: row.use_by
          };
          const result = await removeStock(row.id);
          if (destroyed) return;
          if (!result.ok) {
            console.error('Failed to remove stock:', result.error);
            showToast("Couldn't remove that — try again.");
            return;
          }
          close();
          await loadStock();
          if (destroyed) return;
          showToast(`${name} removed from the pantry.`, {
            undo: async () => {
              const back = await addStock(snapshot);
              if (destroyed) return;
              if (!back.ok) { showToast("That couldn't be put back."); return; }
              announce(`${name} put back in the pantry.`);
              await loadStock();
            }
          });
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
    const useByEdit = el('input', { id: `${prefix}-use-by`, type: 'date' });
    useByEdit.value = row.use_by || '';
    const useByEditHint = el('p', {
      class: 'field-hint', id: `${prefix}-use-by-hint`,
      text: 'Blank means the app estimates from the shelf life instead.'
    });
    useByEdit.setAttribute('aria-describedby', useByEditHint.id);

    const shelfInput = numberInput(`${prefix}-shelf`, { min: '1', step: '1' });
    shelfInput.value = row.shelf_life_days != null ? String(row.shelf_life_days) : '';
    const restockedInput = el('input', { id: `${prefix}-restocked`, type: 'date' });
    restockedInput.value = row.last_restocked || '';
    const restockedHint = el('p', {
      class: 'field-hint', id: `${prefix}-restocked-hint`,
      text: 'Leave blank if you do not know — the app will say so rather than guess.'
    });
    restockedInput.setAttribute('aria-describedby', restockedHint.id);

    // Phase 25. Opt-in, always. Blank means never remind — an app that
    // decides on its own that you need shampoo is an app that adds noise.
    const reorderInput = numberInput(`${prefix}-reorder`, { min: '0', step: 'any' });
    reorderInput.value = row.reorder_at != null ? String(row.reorder_at) : '';
    const reorderHint = el('p', {
      class: 'field-hint', id: `${prefix}-reorder-hint`,
      text: 'Optional. Put it back on the shopping list when you are down to this many. '
        + 'Leave blank and it will never remind you.'
    });
    reorderInput.setAttribute('aria-describedby', reorderHint.id);

    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;
    const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save' });
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
    cancel.addEventListener('click', () => onDone(), { signal });

    form.append(
      field('Measured in', unitSelect),
      field('Where it lives', locationInput),
      field('Use by', useByEdit, useByEditHint),
      field('Usually keeps (days)', shelfInput),
      field('Last restocked', restockedInput, restockedHint),
      field('Remind me at', reorderInput, reorderHint),
      error,
      el('div', { class: 'card-actions' }, [save, cancel])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      save.disabled = true;
      if (useByEdit.value && restockedInput.value && useByEdit.value < restockedInput.value) {
        error.textContent =
          'That use-by date is before the day you bought it. Check the date, or clear it.';
        error.hidden = false;
        save.disabled = false;
        useByEdit.focus();
        return;
      }
      const result = await updateStock(row.id, {
        unit: unitSelect.value,
        default_location: locationInput.value,
        shelf_life_days: shelfInput.value,
        last_restocked: restockedInput.value,
        use_by: useByEdit.value,
        reorder_at: reorderInput.value
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
  browsePanel.hidden = false;
  browsePanel.appendChild(el('h2', { text: "What's in" }));
  const browseSummary = el('p', { class: 'field-hint', role: 'status' });
  browseSummary.setAttribute('aria-live', 'polite');
  browsePanel.appendChild(browseSummary);
  const browseList = el('div', { class: 'location-list' });
  browsePanel.appendChild(browseList);

  /**
   * Groups by location, with unplaced items FIRST.
   *
   * Phase 23. Until locations are set, every item falls into "No location
   * recorded" — which for a new pantry is everything, so it read as one
   * enormous list sorted to the bottom alphabetically. Sorting it to the
   * top and naming it as a to-do turns a dustbin into a task.
   */
  function locationsOf(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = row.default_location || UNPLACED;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    const groups = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const unplaced = groups.filter(([name]) => name === UNPLACED);
    const placed = groups.filter(([name]) => name !== UNPLACED);
    return [...unplaced, ...placed];
  }

  /** What to call a group. Unplaced items are a to-do, so they say so. */
  function locationHeading(location, count) {
    if (location !== UNPLACED) return location;
    return count > 5 ? 'Not put away yet' : 'No place set';
  }

  function renderBrowse() {
    browseList.replaceChildren();
    if (stock.length === 0) {
      browseSummary.textContent = '';
      // A real empty state: what this screen is for, and the ONE next
      // action. Not an empty list under a form.
      browseList.appendChild(el('p', {
        class: 'empty-state',
        text: 'Nothing in your pantry yet. Scan or add a few things you already have, '
          + 'and your shopping list will stop asking you to buy them again.'
      }));
      const startBtn = el('button', {
        type: 'button', class: 'btn btn-primary', text: 'Add the first thing'
      });
      startBtn.addEventListener('click', () => {
        addToggle.setAttribute('aria-expanded', 'true');
        capturePanel.hidden = false;
        const first = capturePanel.querySelector('input, select, button');
        if (first) first.focus();
      }, { signal });
      browseList.appendChild(startBtn);
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
      const headingText = locationHeading(location, rows.length);
      toggle.textContent = `${headingText} (${rows.length})`;
      toggle.setAttribute('aria-label',
        `${headingText}, ${rows.length} item${rows.length === 1 ? '' : 's'}`);
      heading.appendChild(toggle);
      browseList.appendChild(heading);

      const body = el('div', { class: 'location-body' });
      body.hidden = !isOpen;
      if (isOpen) body.appendChild(renderGroupedRows(rows, { unplaced: location === UNPLACED }));
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
  function renderGroupedRows(rows, { unplaced = false } = {}) {
    const wrap = el('div');

    // Phase 23. Naming a to-do and then making it a form is how a to-do
    // stops getting done. One tap, from the places you already use.
    if (unplaced) {
      const known = knownLocations();
      if (known.length > 0) {
        wrap.appendChild(el('p', {
          class: 'field-hint',
          text: 'Tap a place to put something away. You can always change it later.'
        }));
      }
    }
    const byCategory = groupByCategory(rows.map((row) => ({
      ...row,
      category: (row.foods && row.foods.category) || 'food_ambient'
    })));
    for (const group of byCategory) {
      wrap.appendChild(el('h4', { class: 'group-heading', text: `${group.label} (${group.foods.length})` }));
      const list = el('ul', { class: 'stock-rows' });
      for (const row of group.foods) list.appendChild(buildStockRow(row, { unplaced }));
      wrap.appendChild(list);
    }
    return wrap;
  }

  // ============================== Find =================================

  const searchPanel = el('section');
  searchPanel.hidden = false;
  searchPanel.className = 'pantry-search-panel';
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
  // The real date, off the label. type="date" opens the native calendar on
  // Android — no typing, and the OS handles the format so 03/09 can never
  // be read as March.
  const useByInput = el('input', { id: 'pantry-use-by', type: 'date' });
  const useByHint = el('p', {
    class: 'field-hint', id: 'pantry-use-by-hint',
    text: 'Off the label, if it has one. Leave it blank and the app falls back to '
      + 'an estimate from the shelf life below — and says that it is an estimate.'
  });
  useByInput.setAttribute('aria-describedby', useByHint.id);

  const shelfInput = numberInput('pantry-shelf', { min: '1', step: '1' });
  const shelfHint = el('p', {
    class: 'field-hint', id: 'pantry-shelf-hint',
    text: 'Only used when there is no use-by date above. Filled in from the kind of '
      + 'thing it is; change it if you know better, or clear it.'
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
    field('Use by', useByInput, useByHint),
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

    // ---- Phase 11: claim before create ----
    // Before making a new row, ask whether this barcode belongs to a food
    // you were already expecting. Getting this wrong is what produced two
    // rows for one sausage and left every recipe pointed at the empty one.
    const claimed = await offerClaim(barcode, lookup);
    if (destroyed || claimed) return;

    modeNew.checked = true;
    syncMode();
    scannedExtras = { barcode };

    if (lookup.ok) {
      newNameInput.value = lookup.data.name || '';
      // Pack size, when Open Food Facts stated one unambiguously. Prefilled
      // VISIBLY so a bad read is correctable; when it cannot be parsed the
      // form stays on "1 item", which is always true of a jar even when its
      // size is unknown.
      applyPackSize(lookup.data.packSize);
      scannedExtras = {
        barcode,
        calories_per_100g: lookup.data.calories_per_100g,
        protein_g: lookup.data.protein_g,
        fat_g: lookup.data.fat_g,
        carbs_g: lookup.data.carbs_g
      };
      requireCategoryChoice(lookup.data.suggestedCategory);
      const sized = lookup.data.packSize
        ? ` Pack size read as ${lookup.data.packSize.amount} ${lookup.data.packSize.unit} — change it if that is wrong.`
        : '';
      scanNote.textContent = (lookup.data.suggestedCategory
        ? `Found: ${lookup.data.name}. From the barcode this looks like `
          + `${categoryLabel(lookup.data.suggestedCategory)} — pick it to confirm, or choose another.`
        : `Found: ${lookup.data.name}. Choose what kind of thing it is before saving.`) + sized;
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

  /**
   * Phase 11. Offers the unbarcoded foods this scan might belong to, and
   * merges into the chosen one.
   *
   * Returns true when the scan was absorbed by an existing food, meaning
   * the caller must NOT fall through to the create-new form.
   *
   * Every failure path here returns false. A candidate lookup that breaks
   * must never block you from adding your shopping — the claim step is an
   * accelerator sitting in front of a route that already worked.
   */
  async function offerClaim(barcode, lookup) {
    const productName = lookup.ok ? (lookup.data.name || '') : '';

    const found = await findClaimCandidates({ productName });
    if (destroyed) return false;
    if (!found.ok || found.data.length === 0) return false;

    const choice = await claimDialog({
      productName,
      barcode,
      candidates: found.data
    });
    if (destroyed) return false;
    if (choice.action !== 'claim') return false;

    const scanned = { barcode, source: 'openfoodfacts' };
    if (lookup.ok) {
      scanned.calories_per_100g = lookup.data.calories_per_100g;
      scanned.protein_g = lookup.data.protein_g;
      scanned.fat_g = lookup.data.fat_g;
      scanned.carbs_g = lookup.data.carbs_g;
      // A pack size read from the barcode is exactly grams_per_item, and it
      // is the number that makes "1 tin" mean 400g later on.
      const pack = lookup.data.packSize;
      if (pack && pack.unit === 'g' && Number(pack.amount) > 0) {
        scanned.grams_per_item = Number(pack.amount);
      }
    }

    const merged = await claimFood(choice.food.id, scanned);
    if (destroyed) return false;

    if (!merged.ok) {
      scanNote.textContent = 'That could not be saved just now. You can still add it below.';
      announce(scanNote.textContent);
      return false;
    }

    await loadAll();
    if (destroyed) return true;

    scanNote.textContent = describeClaim(merged.data, merged.filled);
    announce(scanNote.textContent);

    // The food is now known, so finish the job you actually came to do:
    // put it in the cupboard. Either open the row you already had, or
    // preselect it and ask for the amount.
    const alreadyStocked = stock.find((row) => row.food_id === merged.data.id);
    if (alreadyStocked) {
      if (!justAdded.includes(alreadyStocked.id)) justAdded.unshift(alreadyStocked.id);
      renderJustAdded();
      openStockSheet(alreadyStocked);
      return true;
    }

    modeExisting.checked = true;
    syncMode();
    searchInput.value = '';
    rebuildFoodSelect();
    foodSelect.value = merged.data.id;
    syncDefaults();
    qtyInput.focus();
    qtyInput.select();
    return true;
  }

  /** Prefill the amount from a parsed pack size, or leave the default alone. */
  function applyPackSize(pack) {
    if (!pack || !pack.amount || !pack.unit) return;
    qtyInput.value = String(pack.amount);
    unitSelect.value = pack.unit;
    // Marked as touched so syncDefaults() does not overwrite the unit when
    // the category is chosen a moment later.
    unitSelect.dataset.touched = 'true';
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

    // A use-by earlier than the restock date is a typo, and the database
    // CHECK would refuse it as an opaque error. Caught here with words.
    if (useByInput.value && restockedInput.value && useByInput.value < restockedInput.value) {
      addError.textContent =
        'That use-by date is before the day you bought it. Check the date, or clear it.';
      addError.hidden = false;
      useByInput.focus();
      return;
    }

    const result = await addStock({
      food_id: foodId,
      current_qty: qtyInput.value,
      unit: unitSelect.value,
      default_location: locationInput.value,
      shelf_life_days: shelfInput.value,
      last_restocked: restockedInput.value,
      use_by: useByInput.value
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
    // Cleared between saves, unlike location and restock date: every jar has
    // its own use-by, and carrying the last one over would silently stamp
    // the wrong date on the next twelve things.
    useByInput.value = '';
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
    renderBrowse();
    renderSearchResults();
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

  // Order: what needs fixing, then search, then what is about to go off,
  // then where things live, then Add. Search sits above everything you
  // would otherwise scroll through.
  mountEl.append(fixSection, searchPanel, useSoonSection, browsePanel, addToggle, capturePanel);
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
