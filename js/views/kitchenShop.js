// js/views/kitchenShop.js — 03 Oct 2026 v3
// v3: a blank use-by says what the pantry will estimate instead.
// v2: put away from the basket: where it lives and its use-by, saved to
// the pantry as you type, so nothing has to be scanned in again.
// Kitchen rebuild K8. The shopping list for the kitchen app, as in the
// approved mockup: tick things into the basket, say "have it" for what is
// already in the cupboard, and finish with Done shopping.
//
// shopping.js hands over to this in kitchen-only mode and keeps its own
// screen for the full app.
//
// ---- What each control does to the data ----
// Every state is a real shopping_list_items.status, so a second phone in
// the same household sees it on its next refresh. Nothing here is
// device-only.
//
//   Tick        needed -> bought, and the item goes into the pantry
//               (restockFromPurchase, Phase 11) unless the write was queued
//               offline. Unticking puts it back to needed; the pantry is not
//               reduced, because you did buy it.
//   Have it     needed -> have. Shown under "Already in the cupboard".
//   Need it     have -> needed.
//   Done shopping   folds the basket away and says what went in. It does
//               not delete anything: bought lines are replaced the next
//               time the plan rebuilds the list, as they always were.
//
// ---- One-handed, in a shop ----
// Controls are never disabled mid-write (a dead control reads as a crash),
// every target is at least 44 px, and the tap counts before the network
// answers.
//
// ---- Two phones ----
// There is no realtime channel in this app. The list re-reads when the
// screen comes back into view and every 20 seconds while it is showing,
// which is fast enough for two people in two aisles.

import { el } from '../lib/dom.js';
import { listItems, setStatus, aisleRank } from '../data/shopping.js';
import { categoryLabel } from '../data/foods.js';
import { restockFromPurchase, describeRestock, RESTOCK } from '../data/restock.js';
import { formatPackQuantity } from '../lib/units.js';
import { listStock, findByFood, addStock, updateStock, todayIso, defaultShelfLife } from '../data/pantry.js';
import { COMMON_PLACES } from '../components/itemSheet.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';

const REFRESH_MS = 20000;

/** Aisle groups in walking order. */
export function groupByAisle(items) {
  const groups = new Map();
  for (const item of items) {
    const category = (item.foods && item.foods.category) || 'other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()]
    .sort((a, b) => aisleRank(a[0]) - aisleRank(b[0]))
    .map(([category, lines]) => ({
      category,
      lines: lines.sort((x, y) => String(x.foods && x.foods.name).localeCompare(String(y.foods && y.foods.name)))
    }));
}

function nameOf(line) {
  return (line.foods && line.foods.name) || 'Something';
}

function amountOf(line) {
  if (line.qty_needed === null || line.qty_needed === undefined) return '';
  return formatPackQuantity(line.qty_needed, line.unit, line.foods || null);
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;
  let items = [];
  // Open by default: the basket is where things get put away.
  let basketOpen = true;
  let timer = null;
  // Pantry rows by food, so the put-away fields start from where a thing
  // already lives. Read once per load.
  let stockByFood = new Map();

  const header = el('header', { class: 'shop-header' });
  header.appendChild(el('h1', { class: 'shop-title', text: 'Shopping' }));
  const summary = el('p', { class: 'shop-summary', text: 'Loading the list…' });
  header.appendChild(summary);
  const progress = el('div', { class: 'shop-progress', 'aria-hidden': 'true' });
  const progressFill = el('span', { class: 'shop-progress-fill' });
  progress.appendChild(progressFill);
  header.appendChild(progress);
  mountEl.appendChild(header);

  const status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  mountEl.appendChild(status);

  const listWrap = el('div', { class: 'shop-groups' });
  mountEl.appendChild(listWrap);

  const basket = el('details', { class: 'shop-fold shop-basket' });
  const basketSummary = el('summary');
  basket.appendChild(basketSummary);
  const basketList = el('ul', { class: 'shop-fold-list' });
  basket.appendChild(basketList);
  basket.addEventListener('toggle', () => { basketOpen = basket.open; }, { signal });
  mountEl.appendChild(basket);
  const placeList = el('datalist', { id: 'shop-places' });
  mountEl.appendChild(placeList);

  const cupboard = el('details', { class: 'shop-fold' });
  const cupboardSummary = el('summary');
  cupboard.appendChild(cupboardSummary);
  const cupboardList = el('ul', { class: 'shop-fold-list' });
  cupboard.appendChild(cupboardList);
  mountEl.appendChild(cupboard);

  const actions = el('div', { class: 'shop-actions' });
  const doneBtn = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Done shopping' });
  const addLink = el('a', { class: 'btn btn-block', href: '#/shopping-add', text: 'Add something to the list' });
  actions.append(doneBtn, addLink);
  mountEl.appendChild(actions);

  const buildLink = el('p', { class: 'shop-build' });
  buildLink.appendChild(document.createTextNode('The list follows your plan. '));
  buildLink.appendChild(el('a', { href: '#/plan-this-week', text: 'Change the plan' }));
  mountEl.appendChild(buildLink);

  // ------------------------------------------------------------- paint
  function paint() {
    const needed = items.filter((i) => i.status === 'needed');
    const bought = items.filter((i) => i.status === 'bought');
    const have = items.filter((i) => i.status === 'have');
    const total = needed.length + bought.length;

    summary.textContent = total === 0
      ? 'Nothing to buy.'
      : `${needed.length} to buy, ${bought.length} in the basket`;
    progressFill.style.width = total ? `${Math.round((bought.length / total) * 100)}%` : '0%';

    listWrap.replaceChildren();
    if (needed.length === 0) {
      const empty = el('div', { class: 'shop-empty' });
      empty.appendChild(el('p', { class: 'shop-empty-title', text: total === 0 ? 'The list is clear.' : 'Everything is in the basket.' }));
      empty.appendChild(el('p', { class: 'field-hint', text: total === 0
        ? 'Plan some meals and what they need appears here on its own.'
        : 'Tap Done shopping when you are finished.' }));
      listWrap.appendChild(empty);
    }
    for (const group of groupByAisle(needed)) {
      const section = el('section', { class: 'shop-group', 'aria-labelledby': `aisle-${group.category}` });
      section.appendChild(el('h2', { id: `aisle-${group.category}`, class: 'shop-aisle', text: categoryLabel(group.category) }));
      const ul = el('ul', { class: 'shop-lines' });
      for (const line of group.lines) ul.appendChild(neededRow(line));
      section.appendChild(ul);
      listWrap.appendChild(section);
    }

    basket.hidden = bought.length === 0;
    basketSummary.textContent = `In the basket: put it away (${bought.length})`;
    basket.open = basketOpen;
    basketList.replaceChildren(...bought.map(basketRow));

    cupboard.hidden = have.length === 0;
    cupboardSummary.textContent = `Already in the cupboard (${have.length})`;
    cupboardList.replaceChildren(...have.map(haveRow));

    doneBtn.hidden = bought.length === 0;
  }

  function neededRow(line) {
    const li = el('li', { class: 'shop-line' });
    const id = `shop-${line.id}`;
    const box = el('input', { type: 'checkbox', id, class: 'shop-check' });
    const label = el('label', { for: id, class: 'shop-label' });
    label.appendChild(el('span', { class: 'shop-name', text: nameOf(line) }));
    const amount = amountOf(line);
    if (amount) label.appendChild(el('span', { class: 'shop-amount', text: amount }));
    box.addEventListener('change', () => { if (box.checked) change(line, 'bought'); }, { signal });
    const have = el('button', { type: 'button', class: 'btn btn-small shop-have', text: 'Have it' });
    have.setAttribute('aria-label', `I already have ${nameOf(line).toLowerCase()}`);
    have.addEventListener('click', () => change(line, 'have'), { signal });
    li.append(box, label, have);
    return li;
  }

  function basketRow(line) {
    const li = el('li', { class: 'shop-putaway' });
    const top = el('div', { class: 'shop-fold-line' });
    const id = `shop-${line.id}`;
    const box = el('input', { type: 'checkbox', id, class: 'shop-check' });
    box.checked = true;
    const label = el('label', { for: id, class: 'shop-label shop-label-done' });
    label.appendChild(el('span', { class: 'shop-name', text: nameOf(line) }));
    box.addEventListener('change', () => { if (!box.checked) change(line, 'needed'); }, { signal });
    top.append(box, label);
    li.appendChild(top);

    // ---- Put it away (3 Oct 2026) ----
    // Where it lives and its use-by, right here in the basket. Saved to the
    // pantry on change, so unpacking the bags is filling in two fields, not
    // finding each thing again behind the pantry's doors.
    const stock = stockByFood.get(line.food_id) || null;
    const fields = el('div', { class: 'shop-putaway-fields' });
    const placeId = `place-${line.id}`;
    const dateId = `useby-${line.id}`;
    const place = el('input', { type: 'text', id: placeId, list: 'shop-places', autocomplete: 'off' });
    place.value = (stock && stock.default_location) || '';
    const useBy = el('input', { type: 'date', id: dateId });
    useBy.value = (stock && stock.use_by) || '';
    const saved = el('span', { class: 'shop-putaway-saved', 'aria-live': 'polite' });
    const placeWrap = el('div', { class: 'shop-putaway-field' });
    placeWrap.append(el('label', { for: placeId, text: 'Where it goes' }), place);
    const dateWrap = el('div', { class: 'shop-putaway-field' });
    dateWrap.append(el('label', { for: dateId, text: 'Use by' }), useBy);
    // Leaving it blank is fine: the pantry estimates from how long this kind
    // of food keeps. Say what that estimate is, so blank is a choice.
    const keeps = defaultShelfLife(line.foods && line.foods.category);
    if (!useBy.value && keeps) {
      const est = new Date(Date.now() + keeps * 86400000)
        .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const hintId = `useby-hint-${line.id}`;
      dateWrap.appendChild(el('span', { id: hintId, class: 'shop-putaway-hint', text: `Blank: about ${est}` }));
      useBy.setAttribute('aria-describedby', hintId);
    }
    fields.append(placeWrap, dateWrap, saved);
    li.appendChild(fields);

    const save = async () => {
      saved.textContent = 'Saving…';
      const result = await putAway(line, { default_location: place.value, use_by: useBy.value || null });
      if (destroyed) return;
      saved.textContent = result.ok ? `Saved` : 'Not saved. Try again.';
    };
    place.addEventListener('change', save, { signal });
    useBy.addEventListener('change', save, { signal });
    return li;
  }

  /** Write where a bought thing lives, creating its pantry row if needed. */
  async function putAway(line, patch) {
    const found = await findByFood(line.food_id);
    if (!found.ok) return found;
    if (found.data) {
      const updated = await updateStock(found.data.id, patch);
      if (updated.ok) stockByFood.set(line.food_id, updated.data);
      return updated;
    }
    const unit = ['g', 'ml', 'item'].includes(line.unit) ? line.unit : 'item';
    const created = await addStock({
      food_id: line.food_id,
      unit,
      current_qty: line.qty_needed == null ? null : Number(line.qty_needed),
      last_restocked: todayIso(),
      shelf_life_days: defaultShelfLife(line.foods && line.foods.category),
      default_location: patch.default_location,
      use_by: patch.use_by
    });
    if (created.ok) stockByFood.set(line.food_id, created.data);
    return created;
  }

  function haveRow(line) {
    const li = el('li', { class: 'shop-fold-line' });
    li.appendChild(el('span', { class: 'shop-name', text: nameOf(line) }));
    const need = el('button', { type: 'button', class: 'btn btn-small', text: 'Need it' });
    need.setAttribute('aria-label', `Put ${nameOf(line).toLowerCase()} back on the list`);
    need.addEventListener('click', () => change(line, 'needed'), { signal });
    li.appendChild(need);
    return li;
  }

  // ------------------------------------------------------------- writes
  const WORDS = {
    bought: (n) => `${n} in the basket.`,
    have: (n) => `${n} moved to already in the cupboard.`,
    needed: (n) => `${n} back on the list.`
  };

  async function change(line, next) {
    const before = line.status;
    line.status = next;
    paint();
    const message = WORDS[next](nameOf(line));
    status.textContent = message;
    announce(message);
    focusAfterChange();

    const result = await setStatus(line.id, next);
    if (destroyed) return;
    if (!result.ok) {
      line.status = before;
      paint();
      showToast('That did not save. Tap it again.');
      return;
    }
    if (result.queued) announce('Saved on this phone. It will sync when you are back online.');

    // Bought means it is in the cupboard (Phase 11). Never for a queued
    // write: stock for a purchase the server has not heard of yet.
    if (next === 'bought' && before !== 'bought' && !result.queued) {
      const done = await restockFromPurchase(line, line.foods || {});
      if (destroyed) return;
      if (!done.ok) {
        showToast(`${nameOf(line)} is in the basket, but the pantry did not update.`);
      } else if (done.outcome === RESTOCK.UNIT_MISMATCH) {
        const words = describeRestock(done.outcome, { foodName: nameOf(line), listUnit: line.unit, stockUnit: done.data ? done.data.unit : null });
        showToast(words);
      }
    }
  }

  // After a row moves, focus stays somewhere sensible: the first thing
  // still to buy, or the heading when nothing is left.
  function focusAfterChange() {
    const nextBox = listWrap.querySelector('.shop-check');
    if (nextBox) nextBox.focus();
    else {
      const h = mountEl.querySelector('.shop-title');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
    }
  }

  doneBtn.addEventListener('click', () => {
    const bought = items.filter((i) => i.status === 'bought').length;
    basketOpen = false;
    paint();
    const message = `Done. ${bought} thing${bought === 1 ? '' : 's'} went into the pantry.`;
    status.textContent = message;
    showToast(message);
  }, { signal });

  // ------------------------------------------------------------- reads
  async function load() {
    const result = await listItems();
    if (destroyed) return;
    if (!result.ok) {
      summary.textContent = 'The list could not be loaded. Check your connection.';
      return;
    }
    items = result.data || [];
    const stock = await listStock();
    if (destroyed) return;
    if (stock.ok) {
      stockByFood = new Map((stock.data || []).map((r) => [r.food_id, r]));
      placeList.replaceChildren(...[...new Set([...(stock.data || []).map((r) => r.default_location).filter(Boolean), ...COMMON_PLACES])]
        .map((p) => el('option', { value: p })));
    }
    // Never repaint under someone typing where a thing goes: the refresh
    // would wipe what they are typing. The next refresh picks it up.
    if (basket.contains(document.activeElement)) return;
    paint();
  }

  function startRefresh() {
    stopRefresh();
    timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
  }
  function stopRefresh() { if (timer) { clearInterval(timer); timer = null; } }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') load();
  }, { signal });

  load();
  startRefresh();

  return () => {
    destroyed = true;
    stopRefresh();
    controller.abort();
  };
}
