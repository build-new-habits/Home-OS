// js/views/kitchenShop.js — 04 Oct 2026 v8
// v8: Add everything from the plan, and Clear the list (with a confirm and Undo).
// v7: a list in things you buy (lib/buyable.js): whole items, tins and
// bulbs, loose food rounded up, spoonfuls and staples under Check the
// cupboard. What you bought goes into the pantry, not the recipe fraction.
// Long-life food is not asked for a use-by.
// v6: grouped by kind, like the pantry; put away asks only for a use-by.
// v5: Bought everything — the whole list into the basket and pantry at once.
// v4: Share the list — the phone's share sheet, or copied.
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
import { listItems, setStatus, clearAll, restoreItems } from '../data/shopping.js';
import { buildWeekIntoList } from '../data/planShopping.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { shelfFor, loadShelfChoices } from '../data/foodShelves.js';
import { shelfLabel, shelfRank } from '../data/shelves.js';
import { restockFromPurchase, describeRestock, RESTOCK } from '../data/restock.js';
import { buyable } from '../lib/buyable.js';
import { listStock, findByFood, addStock, updateStock, todayIso, defaultShelfLife } from '../data/pantry.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';

const REFRESH_MS = 20000;

/** Aisle groups in walking order. */
export function groupByAisle(items) {
  // 4 Oct 2026: by kind (Fruit, Veg, Meat, Dairy…), the same groups as the
  // pantry, in roughly the order a supermarket is walked.
  const groups = new Map();
  for (const item of items) {
    const category = shelfFor(item.foods || {});
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()]
    .sort((a, b) => shelfRank(a[0]) - shelfRank(b[0]))
    .map(([category, lines]) => ({
      category,
      lines: lines.sort((x, y) => String(x.foods && x.foods.name).localeCompare(String(y.foods && y.foods.name)))
    }));
}

function nameOf(line) {
  return (line.foods && line.foods.name) || 'Something';
}

/** What to pick up for this line: see lib/buyable.js. */
export function buyOf(line) {
  return buyable(line, shelfFor((line && line.foods) || {}));
}

function amountOf(line) {
  const b = buyOf(line);
  return b.kind === 'check' ? '' : b.text;
}

/** The line as bought: the whole thing goes into the pantry, not the fraction. */
function asBought(line) {
  const b = buyOf(line);
  return { ...line, qty_needed: b.qty, unit: b.unit || line.unit };
}

/** Days a food keeps before the pantry starts asking; long-life is not asked for a date. */
const LONG_LIFE_DAYS = 90;

/**
 * The list as plain text, for sharing (3 Oct 2026): aisle headings in
 * walking order, one line each, amounts after the name. Only what is still
 * needed; the basket and the cupboard are not shopping.
 */
export function listAsText(items, { title = 'Shopping list' } = {}) {
  const needed = (items || []).filter((i) => i.status === 'needed');
  if (needed.length === 0) return '';
  const lines = [title];
  const toCheck = needed.filter((i) => buyOf(i).kind === 'check');
  for (const group of groupByAisle(needed.filter((i) => buyOf(i).kind !== 'check'))) {
    lines.push('', shelfLabel(group.category));
    for (const line of group.lines) {
      const amount = amountOf(line);
      lines.push(`- ${nameOf(line)}${amount ? ` (${amount})` : ''}`);
    }
  }
  if (toCheck.length) {
    lines.push('', 'Check the cupboard first');
    for (const line of toCheck) lines.push(`- ${nameOf(line)}`);
  }
  return lines.join('\n');
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

  const cupboard = el('details', { class: 'shop-fold' });
  const cupboardSummary = el('summary');
  cupboard.appendChild(cupboardSummary);
  const cupboardList = el('ul', { class: 'shop-fold-list' });
  cupboard.appendChild(cupboardList);
  mountEl.appendChild(cupboard);

  const actions = el('div', { class: 'shop-actions' });
  const doneBtn = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Done shopping' });
  const addLink = el('a', { class: 'btn btn-block', href: '#/shopping-add', text: 'Add something to the list' });
  // 3 Oct 2026: send the list anywhere — a partner, WhatsApp, Notes, or
  // pasted into a supermarket's own list. The phone's share sheet where
  // there is one; copied to the clipboard where there is not.
  const shareBtn = el('button', { type: 'button', class: 'btn btn-block', text: 'Share the list' });
  shareBtn.addEventListener('click', async () => {
    const text = listAsText(items);
    if (!text) { showToast('Nothing left to buy, so nothing to share.'); return; }
    try {
      if ('share' in navigator) {
        await navigator.share({ title: 'Shopping list', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      const words = 'List copied. Paste it wherever you need it.';
      showToast(words);
      announce(words);
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error && error.name === 'AbortError') return;
      showToast('The list could not be shared from here. Try again.');
    }
  }, { signal });
  // 3 Oct 2026: a delivery arrived, or one big shop. Every line still on
  // the list goes in the basket and the pantry at once, rather than forty
  // ticks. Each can still be unticked.
  const allBtn = el('button', { type: 'button', class: 'btn btn-block', text: 'Bought everything' });
  allBtn.addEventListener('click', async () => {
    const needed = items.filter((i) => i.status === 'needed');
    if (!needed.length) return;
    for (const line of needed) line.status = 'bought';
    paint();
    let failed = 0;
    for (const line of needed) {
      const result = await setStatus(line.id, 'bought');
      if (destroyed) return;
      if (!result.ok) { line.status = 'needed'; failed += 1; continue; }
      if (!result.queued) await restockFromPurchase(asBought(line), line.foods || {});
      if (destroyed) return;
    }
    paint();
    const words = failed
      ? `${needed.length - failed} in the basket and the pantry. ${failed} did not save; they are still on the list.`
      : `All ${needed.length} in the basket and the pantry.`;
    status.textContent = words;
    showToast(words);
  }, { signal });
  // ---- From the plan, and clearing (4 Oct 2026) ----
  // "I need a clear all for the shopping list. Then add all ingredients
  // from the plan." Add from the plan rebuilds the plan's part of the list
  // for your food week (and the next one on its last day); things you
  // added by hand and things in the basket stay.
  const fromPlanBtn = el('button', { type: 'button', class: 'btn btn-block shop-from-plan', text: 'Add everything from the plan' });
  fromPlanBtn.addEventListener('click', async () => {
    fromPlanBtn.disabled = true;
    fromPlanBtn.textContent = 'Working out what the plan needs…';
    const result = await buildWeekIntoList('this');
    fromPlanBtn.disabled = false;
    fromPlanBtn.textContent = 'Add everything from the plan';
    if (destroyed) return;
    if (!result.ok) { showToast('The plan could not be read. Check your connection and try again.'); return; }
    const n = (result.data.items || []).filter((i) => i.shortfall > 0).length;
    const words = n
      ? `${n} thing${n === 1 ? '' : 's'} from your plan on the list. What the pantry already has is left off.`
      : 'Nothing to add: the pantry covers everything planned, or nothing is planned yet.';
    status.textContent = words;
    showToast(words);
    await load();
  }, { signal });

  const clearBtn = el('button', { type: 'button', class: 'btn btn-block btn-quiet shop-clear', text: 'Clear the list' });
  clearBtn.addEventListener('click', async () => {
    if (!items.length) { showToast('The list is already clear.'); return; }
    const sure = await confirmDialog({
      title: 'Clear the shopping list?',
      message: `All ${items.length} go: what is still to buy, the basket, and anything you added yourself. Nothing in the pantry changes. You can undo straight afterwards.`,
      confirmLabel: 'Clear the list',
      cancelLabel: 'Keep it'
    });
    if (!sure || destroyed) return;
    const result = await clearAll();
    if (destroyed) return;
    if (!result.ok) { showToast('Not everything could be cleared. Check your connection and try again.'); await load(); return; }
    const removed = result.data;
    items = [];
    paint();
    const words = `The list is clear (${removed.length} removed).`;
    status.textContent = words;
    showToast(words, {
      undo: async () => {
        const back = await restoreItems(removed);
        if (destroyed) return;
        showToast(back.ok ? 'The list is back.' : 'It could not be put back. Use Add everything from the plan.');
        await load();
      }
    });
    fromPlanBtn.focus();
  }, { signal });

  actions.append(doneBtn, allBtn, fromPlanBtn, shareBtn, addLink, clearBtn);
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
    const toCheck = needed.filter((i) => buyOf(i).kind === 'check');
    const toBuy = needed.filter((i) => buyOf(i).kind !== 'check');

    summary.textContent = total === 0
      ? 'Nothing to buy.'
      : `${toBuy.length} to buy${toCheck.length ? `, ${toCheck.length} to check` : ''}, ${bought.length} in the basket`;
    progressFill.style.width = total ? `${Math.round((bought.length / total) * 100)}%` : '0%';
    allBtn.hidden = needed.length < 2;

    listWrap.replaceChildren();
    if (needed.length === 0) {
      const empty = el('div', { class: 'shop-empty' });
      empty.appendChild(el('p', { class: 'shop-empty-title', text: total === 0 ? 'The list is clear.' : 'Everything is in the basket.' }));
      empty.appendChild(el('p', { class: 'field-hint', text: total === 0
        ? 'Plan some meals and what they need appears here on its own.'
        : 'Tap Done shopping when you are finished.' }));
      listWrap.appendChild(empty);
    }
    for (const group of groupByAisle(toBuy)) {
      const section = el('section', { class: 'shop-group', 'aria-labelledby': `aisle-${group.category}` });
      section.appendChild(el('h2', { id: `aisle-${group.category}`, class: 'shop-aisle', text: shelfLabel(group.category) }));
      const ul = el('ul', { class: 'shop-lines' });
      for (const line of group.lines) ul.appendChild(neededRow(line));
      section.appendChild(ul);
      listWrap.appendChild(section);
    }
    // Spoonfuls and staples: a question about the cupboard, not a quantity.
    if (toCheck.length) {
      const section = el('section', { class: 'shop-group shop-check-group', 'aria-labelledby': 'aisle-check' });
      section.appendChild(el('h2', { id: 'aisle-check', class: 'shop-aisle', text: 'Check the cupboard' }));
      section.appendChild(el('p', { class: 'field-hint shop-check-hint', text: 'Small amounts of things most kitchens keep. Have it if there is some; tick it if you buy one.' }));
      const ul = el('ul', { class: 'shop-lines' });
      for (const line of toCheck.sort((x, y) => nameOf(x).localeCompare(nameOf(y)))) ul.appendChild(neededRow(line));
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
    const b = buyOf(line);
    if (b.kind !== 'check' && b.text) label.appendChild(el('span', { class: 'shop-amount', text: b.text }));
    if (b.detail) label.appendChild(el('span', { class: 'shop-amount-detail', text: b.detail }));
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

    // ---- Put it away (3 Oct 2026; 4 Oct: kind, not place) ----
    // Use-by right here in the basket, saved to the pantry on change. Where
    // it lives is no longer asked: "Is location important? I think not."
    // What KIND of thing it is files itself (data/shelves.js), and says so.
    const stock = stockByFood.get(line.food_id) || null;
    const fields = el('div', { class: 'shop-putaway-fields' });
    const dateId = `useby-${line.id}`;
    const useBy = el('input', { type: 'date', id: dateId });
    useBy.value = (stock && stock.use_by) || '';
    const saved = el('span', { class: 'shop-putaway-saved', 'aria-live': 'polite' });
    const kind = el('p', { class: 'shop-putaway-kind', text: `Goes in the pantry under ${shelfLabel(shelfFor(line.foods || {}))}.` });
    const dateWrap = el('div', { class: 'shop-putaway-field' });
    dateWrap.append(el('label', { for: dateId, text: 'Use by (optional)' }), useBy);
    // Leaving it blank is fine: the pantry estimates from how long this kind
    // of food keeps. Say what that estimate is, so blank is a choice.
    const keeps = defaultShelfLife(line.foods && line.foods.category);
    // v7: tins, spices, oils and dried food keep for months. Asking for a
    // date on chilli powder is work for nothing; say it keeps instead.
    const longLife = (keeps && keeps >= LONG_LIFE_DAYS && !useBy.value) || buyOf(line).kind === 'check';
    if (longLife) {
      fields.append(el('p', { class: 'shop-putaway-kind', text: `Goes in the pantry under ${shelfLabel(shelfFor(line.foods || {}))}. Keeps for months, so no date needed.` }));
      li.appendChild(fields);
      return li;
    }
    if (!useBy.value && keeps) {
      const est = new Date(Date.now() + keeps * 86400000)
        .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const hintId = `useby-hint-${line.id}`;
      dateWrap.appendChild(el('span', { id: hintId, class: 'shop-putaway-hint', text: `Blank: about ${est}` }));
      useBy.setAttribute('aria-describedby', hintId);
    }
    fields.append(kind, dateWrap, saved);
    li.appendChild(fields);

    const save = async () => {
      saved.textContent = 'Saving…';
      const result = await putAway(line, { use_by: useBy.value || null });
      if (destroyed) return;
      saved.textContent = result.ok ? `Saved` : 'Not saved. Try again.';
    };
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
      current_qty: asBought(line).qty_needed == null ? null : Number(asBought(line).qty_needed),
      last_restocked: todayIso(),
      shelf_life_days: defaultShelfLife(line.foods && line.foods.category),
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
      const done = await restockFromPurchase(asBought(line), line.foods || {});
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
    }
    await loadShelfChoices();
    if (destroyed) return;
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
