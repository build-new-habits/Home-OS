// js/views/holidays.js — 01 Sep 2026 v4
// v3: same treatment as everywhere else.
//
//   * A holiday is one compact row, opened in the slide-out panel. Full
//     cards carrying two whole checklists each meant two holidays filled a
//     phone screen.
//   * THREE lists inside, not two: things to buy, things to pack, and —
//     new — things to DO there. Each is its own sub-card with its own
//     count and its own add box.
//
// `do` and `pack` are the same table told apart by `kind` (revision 6).
// Buying stays separate because it carries send_to_shopping, which bridges
// into the shopping list.
//
// ---- A missing migration degrades honestly ----
// Without revision 6 the to-do query fails. The other two lists still work
// and the panel SAYS the third is unavailable, rather than showing an empty
// list that reads as "nothing to do".
// Replaces the Phase 2 stub, whole. Two sections: holidays (with checklist
// and purchase items) and the work-location calendar.
//
// ---- Why work location lives here ----
// routes.js is write-once and there is no work-location route, so the
// second half of Phase 8 has to share this view. The <h1> says "Holidays &
// work"; the nav still says "Holidays" because that label comes from
// routes.js. Recorded in the handoff so it is not read as a bug.
//
// ---- No-shame framing (principle 1) ----
// An unticked packing item is not a failure. Items read "To do" / "Packed",
// never red, and nothing counts down at the user. The summary is a plain
// fact — "3 of 8 packed" — in the same register as the water tracker.
//
// ---- Bounded ranges are never recurrence rules ----
// lib/rrule.js silently ignores UNTIL and COUNT, so a holiday is NOT a
// daily rule with an end. The holiday's calendar row marks its start and
// carries a null rule; the span comes from the holidays table. Work-
// location patterns are open-ended by design and the form says so rather
// than offering an end date that would be ignored.

import {
  listHolidays, createHoliday, updateHoliday, deleteHoliday,
  countHolidayChildren, describeChildren,
  listItems, addItem, setItemStatus, setSendToShopping, removeItem, ITEM_KINDS,
  pendingItemStatuses, formatRange, nightsBetween
} from '../data/holidays.js';
import {
  listWorkLocations, createWorkLocation, removeWorkLocation,
  upsertHolidayEvent, removeHolidayEvent, assertSupportedRule
} from '../data/calendar.js';
import { expand, describe } from '../lib/rrule.js';
import { isOffline } from '../lib/net.js';
import { createCard } from '../components/card.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { listFoods, createFood, FOOD_CATEGORIES, categoryLabel } from '../data/foods.js';
import { addItem as addShoppingItem, findHolidayItem, removeHolidayItem } from '../data/shopping.js';

import { el, field } from '../lib/dom.js';
// Local element helper, defined here rather than copied in — the 18 Aug
// ReferenceError came from moving a helper without checking the destination.
const WEEKDAYS = [
  { code: 'MO', label: 'Monday' }, { code: 'TU', label: 'Tuesday' },
  { code: 'WE', label: 'Wednesday' }, { code: 'TH', label: 'Thursday' },
  { code: 'FR', label: 'Friday' }, { code: 'SA', label: 'Saturday' },
  { code: 'SU', label: 'Sunday' }
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  let holidays = [];
  let itemsByHoliday = new Map();
  let queuedStatuses = new Map();
  let workLocations = [];

  mountEl.appendChild(el('h1', { text: 'Holidays & work' }));

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  mountEl.appendChild(offlineNote);

  function paintOfflineNote() {
    const off = isOffline();
    offlineNote.hidden = !off;
    if (off) {
      offlineNote.textContent =
        'You are offline. Ticking things off still works and will upload later. '
        + 'Adding or removing a holiday needs a connection.';
    }
  }

  // ============================ Holidays ============================

  const holidaySection = el('section');
  holidaySection.appendChild(el('h2', { text: 'Holidays' }));
  const holidaySummary = el('p', { class: 'field-hint', role: 'status' });
  holidaySummary.setAttribute('aria-live', 'polite');
  holidaySection.appendChild(holidaySummary);
  const holidayList = el('ul', { class: 'recipe-rows' });
  holidaySection.appendChild(holidayList);

  const addForm = el('form');
  addForm.setAttribute('aria-label', 'Add a holiday');
  const titleInput = el('input', { id: 'new-holiday-title', type: 'text' });
  const startInput = el('input', { id: 'new-holiday-start', type: 'date' });
  const endInput = el('input', { id: 'new-holiday-end', type: 'date' });
  const addError = el('p', { class: 'field-error', role: 'alert' });
  addError.hidden = true;
  const addSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Add holiday' });

  addForm.append(
    el('h3', { text: 'Add a holiday' }),
    field('Name', titleInput),
    field('First day', startInput),
    field('Last day', endInput),
    addError,
    addSubmit
  );
  const addToggle = el('button', {
    type: 'button', class: 'btn', text: 'Add a holiday', 'aria-expanded': 'false'
  });
  const addWrap = el('div');
  addWrap.hidden = true;
  addWrap.appendChild(addForm);
  addToggle.addEventListener('click', () => {
    const open = addToggle.getAttribute('aria-expanded') === 'true';
    addToggle.setAttribute('aria-expanded', String(!open));
    addWrap.hidden = open;
  }, { signal });
  holidaySection.append(addToggle, addWrap);

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    addError.hidden = true;
    addSubmit.disabled = true;
    const result = await createHoliday({
      title: titleInput.value,
      start_date: startInput.value,
      end_date: endInput.value
    });
    addSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      addError.textContent = isOffline()
        ? 'Adding a holiday needs a connection. This will work once you are back online.'
        : (result.error && result.error.message) || "Couldn't save that holiday — try again.";
      addError.hidden = false;
      return;
    }
    // Project onto the calendar. A soft pointer, so this is our job, and a
    // failure here must be said out loud rather than swallowed.
    const projected = await upsertHolidayEvent({
      holidayId: result.data.id,
      title: result.data.title,
      startDate: result.data.start_date
    });
    if (!projected.ok) {
      console.error('Holiday saved but not added to the calendar:', projected.error);
      showToast('Holiday saved, but it could not be added to the calendar. Editing it will try again.');
    }
    addForm.reset();
    announce(`${result.data.title} added, ${formatRange(result.data.start_date, result.data.end_date)}.`);
    await loadHolidays();
  }, { signal });

  /** One line per holiday. Everything else is behind it. */
  function buildHolidayRow(holiday) {
    const item = el('li', { class: 'recipe-row' });
    item.dataset.holidayId = holiday.id;

    const nights = nightsBetween(holiday.start_date, holiday.end_date);
    const bundle = itemsByHoliday.get(holiday.id) || { purchase: [], pack: [], do: [] };
    const outstanding = ['purchase', 'pack', 'do'].reduce((sum, kind) =>
      sum + (bundle[kind] || []).filter((row) => statusOf(row) !== 'complete').length, 0);

    // The range is always readable as text, never a coloured bar alone.
    const meta = [`${formatRange(holiday.start_date, holiday.end_date)}`];
    if (nights) meta.push(`${nights} day${nights === 1 ? '' : 's'}`);
    meta.push(outstanding === 0 ? 'nothing outstanding' : `${outstanding} still to sort`);

    const open = el('button', { type: 'button', class: 'recipe-row-open' });
    const text = el('span', { class: 'recipe-row-text' });
    text.append(
      el('span', { class: 'recipe-row-name', text: holiday.title }),
      el('span', { class: 'recipe-row-meta', text: meta.join(' · ') })
    );
    open.append(text, el('span', { class: 'stock-row-chevron', 'aria-hidden': 'true', text: '›' }));
    open.setAttribute('aria-label', `${holiday.title}, ${meta.join(', ')}. Open holiday.`);
    open.addEventListener('click', () => openHolidaySheet(holiday, open), { signal });

    item.appendChild(open);
    return item;
  }

  /**
   * A holiday's three lists, in the panel.
   *
   * Buy / pack / do are separate sub-cards rather than one long list: they
   * are done at different times — buying before you go, packing the night
   * before, doing while you are there — and merging them would mean
   * scrolling past a fortnight of activities to find the passports.
   */
  function openHolidaySheet(holiday, returnFocusTo) {
    const nights = nightsBetween(holiday.start_date, holiday.end_date);
    const bundle = itemsByHoliday.get(holiday.id) || { purchase: [], pack: [], do: [] };

    openDetailSheet({
      title: holiday.title,
      subtitle: `${formatRange(holiday.start_date, holiday.end_date)}`
        + `${nights ? ` · ${nights} day${nights === 1 ? '' : 's'}` : ''}`,
      returnFocusTo,
      build: (body) => {
        for (const kind of ITEM_KINDS) {
          const section = el('section', { class: 'sheet-section item-group-card' });
          section.appendChild(buildItemGroup(holiday, kind.value, kind.label, bundle[kind.value] || []));
          body.appendChild(section);
        }

        if (bundle.todoUnavailable) {
          // Said plainly rather than showing an empty list that looks like
          // there is nothing to do.
          body.appendChild(el('p', {
            class: 'field-error',
            text: 'The things-to-do list is not available yet — database migration 006 '
              + 'has not been run. The other two lists are unaffected.'
          }));
        }

        const actions = el('div', { class: 'sheet-actions' });
        const deleteBtn = el('button', { type: 'button', class: 'btn btn-danger' });
        deleteBtn.textContent = `Delete ${holiday.title}`;
        deleteBtn.addEventListener('click', () => onDeleteHoliday(holiday), { signal });
        actions.appendChild(deleteBtn);
        body.appendChild(actions);
      }
    });
  }

  function statusOf(item) {
    // A queued tick has not reached the server, but from the user's point of
    // view it happened. Showing the stale server value would read as "my tap
    // didn't count" (principle 1) — the same reasoning as water's totals.
    return queuedStatuses.has(item.id) ? queuedStatuses.get(item.id) : item.status;
  }

  /** What "done" means for each list, in the user's words. */
  const DONE_WORD = { purchase: 'bought', pack: 'packed', do: 'done' };

  function buildItemGroup(holiday, kind, heading, items) {
    const wrap = el('div', { class: 'item-group' });
    wrap.appendChild(el('h3', { class: 'item-group-title', text: heading }));

    const done = items.filter((item) => statusOf(item) === 'complete').length;
    wrap.appendChild(el('p', {
      class: 'field-hint',
      // A fact, not a scoreboard. Nothing counts down at the user.
      text: items.length === 0
        ? 'Nothing on this list yet.'
        // A fact, never a scoreboard counting down at you.
        : `${done} of ${items.length} ${DONE_WORD[kind] || 'done'}`
    }));

    if (items.length > 0) {
      const list = el('ul', { class: 'check-list' });
      for (const item of items) list.appendChild(buildItemRow(holiday, kind, item));
      wrap.appendChild(list);
    }

    const form = el('form', { class: 'add-item' });
    form.setAttribute('aria-label', `Add to ${heading.toLowerCase()} for ${holiday.title}`);
    const input = el('input', { id: `add-${kind}-${holiday.id}`, type: 'text' });
    const submit = el('button', { type: 'submit', class: 'btn', text: 'Add' });
    const error = el('p', { class: 'field-error', role: 'alert' });
    error.hidden = true;
    form.append(field(`Add an item`, input), error, submit);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      if (!input.value.trim()) {
        error.textContent = 'Type something to add.';
        error.hidden = false;
        input.focus();
        return;
      }
      submit.disabled = true;
      const result = await addItem(kind, { holiday_id: holiday.id, title: input.value });
      submit.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        error.textContent = isOffline()
          ? 'Adding items needs a connection. Ticking existing ones still works.'
          : (result.error && result.error.message) || "Couldn't add that — try again.";
        error.hidden = false;
        return;
      }
      announce(`${result.data.title} added to ${heading.toLowerCase()}.`);
      await loadItems();
      if (!destroyed) restoreFocus(`add-${kind}-${holiday.id}`);
    }, { signal });

    wrap.appendChild(form);
    return wrap;
  }

  // ================= The holiday -> shopping bridge =================
  //
  // Phase 8 stored send_to_shopping and deliberately consumed nothing. This
  // completes it.
  //
  // MATCH BEFORE CREATING. Without this, every holiday adds another "Sun
  // cream" to the foods library and the shopping list slowly fills with
  // near-duplicates. Matching is case-insensitive and trimmed, because
  // "Sun cream", "sun cream " and "Sun Cream" are one thing.
  //
  // ASK FOR A CATEGORY when creating. Defaulting to food_ambient would put
  // sun cream in the recipe ingredient picker, which is the exact failure
  // `category` exists to prevent.

  async function sendToShoppingList(item, checkbox) {
    const wanted = String(item.title || '').trim();
    if (!wanted) return;

    const foodResult = await listFoods();
    if (destroyed) return;
    if (!foodResult.ok) {
      console.error('Could not read the items library:', foodResult.error);
      showToast("Saved, but couldn't reach your items list to add it to shopping.");
      return;
    }
    const match = (foodResult.data || []).find(
      (food) => String(food.name || '').trim().toLowerCase() === wanted.toLowerCase()
    );

    if (match) {
      await placeOnList(match, item);
      return;
    }

    // Unknown thing: ask what it is before creating it.
    openDetailSheet({
      title: `What kind of thing is "${wanted}"?`,
      subtitle: 'It needs a category before it can go on the shopping list.',
      returnFocusTo: checkbox,
      build: (body, { close }) => {
        body.appendChild(el('p', {
          class: 'field-hint',
          text: 'This decides which aisle it appears under, and whether it can be used as a '
            + 'recipe ingredient. Sun cream is Toiletries, not food.'
        }));

        const select = el('select', { id: `holiday-category-${item.id}` });
        select.appendChild(el('option', { value: '', text: 'Choose one' }));
        for (const category of FOOD_CATEGORIES) {
          select.appendChild(el('option', { value: category.value, text: category.label }));
        }
        const label = el('label', { for: select.id, text: 'Kind of thing' });
        const wrap = el('div', { class: 'field' });
        wrap.append(label, select);
        body.appendChild(wrap);

        const error = el('p', { class: 'field-error', role: 'alert' });
        error.hidden = true;
        body.appendChild(error);

        const save = el('button', { type: 'button', class: 'btn btn-primary', text: 'Add to the list' });
        save.addEventListener('click', async () => {
          if (!select.value) {
            error.textContent = 'Choose what kind of thing it is first.';
            error.hidden = false;
            select.focus();
            return;
          }
          save.disabled = true;
          const created = await createFood({ name: wanted, category: select.value, source: 'manual' });
          save.disabled = false;
          if (destroyed) return;
          if (!created.ok || created.queued) {
            error.textContent = created.queued
              ? 'That saved on this device, but the shopping list needs a connection.'
              : (created.error && created.error.message) || "Couldn't create that item.";
            error.hidden = false;
            return;
          }
          close();
          await placeOnList(created.data, item);
        }, { signal });
        body.appendChild(save);

        const cancel = el('button', { type: 'button', class: 'btn', text: 'Not now' });
        cancel.addEventListener('click', () => {
          // The tick stays saved — it is a fact about the holiday. Only the
          // list entry is deferred, and the message says so.
          close();
          showToast(`"${wanted}" is still marked for shopping. Tick it again to choose a category.`);
        }, { signal });
        body.appendChild(cancel);
      }
    });
  }

  async function placeOnList(food, item) {
    const existing = await findHolidayItem(food.id);
    if (destroyed) return;
    if (existing.ok && existing.data) {
      // Already there. Re-ticking must not stack a second identical line.
      announce(`${item.title} is already on the shopping list.`);
      return;
    }
    // One of it, counted as an item: a holiday purchase is "buy sun cream",
    // not a weight.
    const added = await addShoppingItem({
      food_id: food.id, qty_needed: 1, unit: 'item', source: 'holiday'
    });
    if (destroyed) return;
    if (!added.ok) {
      console.error('Failed to add a holiday item to the shopping list:', added.error);
      showToast(`Saved, but "${item.title}" could not be added to the shopping list.`);
      return;
    }
    announce(`${item.title} added to the shopping list as ${categoryLabel(food.category)}.`);
  }

  async function unsendFromShoppingList(item) {
    const wanted = String(item.title || '').trim().toLowerCase();
    const foodResult = await listFoods();
    if (destroyed || !foodResult.ok) return;
    const match = (foodResult.data || []).find(
      (food) => String(food.name || '').trim().toLowerCase() === wanted
    );
    if (!match) return;
    const removed = await removeHolidayItem(match.id);
    if (destroyed) return;
    if (!removed.ok) {
      console.error('Failed to remove a holiday item from the shopping list:', removed.error);
      showToast("Unticked, but it could not be taken off the shopping list.");
      return;
    }
    announce(`${item.title} taken off the shopping list.`);
  }

  /** One place that decides how a toggle looks, so panel and row agree. */
  function paintToggle(btn, item, status, verb) {
    const done = status === 'complete';
    btn.classList.toggle('is-complete', done);
    btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    btn.textContent = done ? verb : 'To do';
    btn.setAttribute('aria-label', `${item.title} — ${done ? verb.toLowerCase() : 'to do'}`);
  }

  function buildItemRow(holiday, kind, item) {
    const row = el('li', { class: 'check-row' });
    const current = statusOf(item);
    const complete = current === 'complete';

    // aria-pressed carries the state, and the label carries it in words too
    // — never colour alone.
    const toggle = el('button', {
      type: 'button',
      class: `btn check-toggle${complete ? ' is-complete' : ''}`,
      'aria-pressed': complete ? 'true' : 'false'
    });
    const verb = { purchase: 'Bought', pack: 'Packed', do: 'Done' }[kind] || 'Done';
    toggle.textContent = complete ? verb : 'To do';
    toggle.setAttribute('aria-label', `${item.title} — ${complete ? verb.toLowerCase() : 'to do'}`);

    // The panel keeps its DOM between ticks, so a value captured when the
    // row was BUILT goes stale after the first one — the second tap would
    // compute the same "next" again and roll back to the wrong label. The
    // displayed state is tracked here instead.
    let displayed = current;

    toggle.addEventListener('click', async () => {
      const wasShowing = displayed;
      const next = displayed === 'complete' ? 'pending' : 'complete';
      // OPTIMISTIC: the tap counts now, the write happens behind it. The
      // button is never disabled — a disabled button defeats the one-tap
      // premise, and this happens while packing, often with no signal.
      queuedStatuses.set(item.id, next);
      displayed = next;
      // Repaint THIS button directly. renderHolidays() rebuilds the rows
      // behind the panel, not the panel itself, so without this the tick
      // showed nothing until the panel was closed and reopened — which
      // reads exactly like a tap that did not count.
      paintToggle(toggle, item, next, verb);
      renderHolidays();
      announce(`${item.title} — ${next === 'complete' ? verb.toLowerCase() : 'to do'}.`);

      const result = await setItemStatus(kind, item.id, next);
      if (destroyed) return;
      if (!result.ok) {
        // Only an outright failure rolls back, and it says so.
        queuedStatuses.delete(item.id);
        displayed = wasShowing;
        paintToggle(toggle, item, wasShowing, verb);
        console.error('Failed to set a holiday item status:', result.error);
        showToast("That didn't save — tap it again.");
        renderHolidays();
        return;
      }
      if (!result.queued) {
        queuedStatuses.delete(item.id);
        // Keep the snapshot honest, or a re-render behind the panel would
        // repaint this row from a status the server has already changed.
        item.status = next;
      }
      await loadItems();
      if (!destroyed) restoreFocus(`item-toggle-${item.id}`);
    }, { signal });
    toggle.id = `item-toggle-${item.id}`;
    row.appendChild(toggle);

    row.appendChild(el('span', { class: 'check-title', text: item.title }));

    if (kind === 'purchase') {
      const shopId = `send-shopping-${item.id}`;
      const checkbox = el('input', { id: shopId, type: 'checkbox' });
      checkbox.checked = Boolean(item.send_to_shopping);
      const label = el('label', { for: shopId, text: 'Add to shopping list' });
      const note = el('span', { class: 'field-hint', text: 'It appears under "for a holiday"' });
      checkbox.addEventListener('change', async () => {
        const result = await setSendToShopping(item.id, checkbox.checked);
        if (destroyed) return;
        if (!result.ok) {
          checkbox.checked = !checkbox.checked;
          console.error('Failed to set send_to_shopping:', result.error);
          showToast("Couldn't change that — try again.");
          return;
        }
        // The flag was stored from Phase 8 onwards and nothing consumed it.
        // This is the bridge: the tick now actually puts it on the list.
        if (checkbox.checked) await sendToShoppingList(item, checkbox);
        else await unsendFromShoppingList(item);
      }, { signal });
      row.append(el('span', { class: 'send-shopping' }, [checkbox, label, note]));
    }

    const remove = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Remove' });
    remove.setAttribute('aria-label', `Remove ${item.title} from ${holiday.title}`);
    remove.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${item.title}?`,
        message: 'This takes it off the list.',
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removeItem(kind, item.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove a holiday item:', result.error);
        showToast("Couldn't remove that — try again.");
        return;
      }
      announce(`${item.title} removed.`);
      await loadItems();
    }, { signal });
    row.appendChild(remove);

    return row;
  }

  async function onDeleteHoliday(holiday) {
    const counts = await countHolidayChildren(holiday.id);
    if (destroyed) return;
    if (!counts.ok) {
      console.error('Failed to count holiday children:', counts.error);
      showToast("Couldn't check what belongs to this holiday — try again.");
      return;
    }
    // Both child tables CASCADE, so these rows go rather than block. The
    // wording is "will also be deleted", not "must be removed first".
    const summary = describeChildren(counts.data);
    const confirmed = await confirmDialog({
      title: `Delete ${holiday.title}?`,
      message: summary
        ? `This also deletes ${summary}. It can't be undone.`
        : "This can't be undone.",
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!confirmed || destroyed) return;

    const result = await deleteHoliday(holiday.id);
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to delete a holiday:', result.error);
      showToast("Couldn't delete that holiday — check your connection and try again.");
      return;
    }
    // source_id is a soft pointer, not a FK — nothing cascades this, so an
    // orphan would sit on the calendar pointing at a holiday that is gone.
    const cleaned = await removeHolidayEvent(holiday.id);
    if (!cleaned.ok) {
      console.error('Holiday deleted but its calendar entry remains:', cleaned.error);
      showToast('Holiday deleted, but its calendar entry could not be removed.');
    }
    announce(`${holiday.title} deleted.`);
    await loadHolidays();
  }

  // ========================= Work location =========================

  const workSection = el('section');
  workSection.appendChild(el('h2', { text: 'Where I am working' }));
  workSection.appendChild(el('p', {
    class: 'field-hint',
    text: 'Set a pattern once and it shows for the next three months.'
  }));
  const workList = el('div', { class: 'card-list' });
  workSection.appendChild(workList);

  const workForm = el('form');
  workForm.setAttribute('aria-label', 'Add a work location pattern');
  const workTitle = el('input', { id: 'work-title', type: 'text' });
  const workPlace = el('input', { id: 'work-place', type: 'text' });
  const workStart = el('input', { id: 'work-start', type: 'date' });
  workStart.value = todayIso();

  const workFreq = el('select', { id: 'work-freq' });
  for (const option of [
    { value: 'WEEKLY', label: 'Every week, on chosen days' },
    { value: 'DAILY', label: 'Every day' },
    { value: 'NONE', label: 'Just the one day' }
  ]) {
    workFreq.appendChild(el('option', { value: option.value, text: option.label }));
  }

  const dayFieldset = el('fieldset', { class: 'weekday-set' });
  dayFieldset.appendChild(el('legend', { text: 'Which days' }));
  const dayBoxes = WEEKDAYS.map((day) => {
    const id = `work-day-${day.code}`;
    const box = el('input', { id, type: 'checkbox', value: day.code });
    const wrap = el('div', { class: 'radio-row' }, [box, el('label', { for: id, text: day.label })]);
    dayFieldset.appendChild(wrap);
    return box;
  });

  // No end date is offered. lib/rrule.js ignores UNTIL and COUNT, so a
  // field here would look like it worked and quietly do nothing.
  const workHint = el('p', {
    class: 'field-hint',
    id: 'work-open-ended',
    text: 'Patterns carry on until you remove them — there is no end date.'
  });

  const previewRegion = el('div', { class: 'preview', role: 'status' });
  previewRegion.setAttribute('aria-live', 'polite');
  const workError = el('p', { class: 'field-error', role: 'alert' });
  workError.hidden = true;
  const workSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Save pattern' });

  workForm.append(
    el('h3', { text: 'Add a pattern' }),
    field('Name', workTitle),
    field('Place', workPlace),
    field('Starting from', workStart),
    field('Repeat', workFreq),
    dayFieldset,
    workHint,
    previewRegion,
    workError,
    workSubmit
  );
  workSection.appendChild(workForm);

  function buildRule() {
    if (workFreq.value === 'NONE') return null;
    if (workFreq.value === 'DAILY') return 'FREQ=DAILY;INTERVAL=1';
    const days = dayBoxes.filter((box) => box.checked).map((box) => box.value);
    if (days.length === 0) return null;
    return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${days.join(',')}`;
  }

  function syncDayVisibility() {
    dayFieldset.hidden = workFreq.value !== 'WEEKLY';
    updatePreview();
  }

  function updatePreview() {
    previewRegion.replaceChildren();
    const start = workStart.value;
    if (!start) return;
    const rule = buildRule();
    if (!rule) {
      previewRegion.appendChild(el('p', {
        text: workFreq.value === 'WEEKLY'
          ? 'Choose at least one day to see when this lands.'
          : `Just ${start}.`
      }));
      return;
    }
    // Principle 4: recurrence is verified against a 3-month window at
    // creation time, not assumed to work because the rule looks right.
    let dates = [];
    try {
      dates = expand(rule, start, start, addMonthsIso(start, 3));
    } catch (err) {
      console.error('Could not preview the pattern:', err);
      previewRegion.appendChild(el('p', { text: 'That pattern could not be worked out.' }));
      return;
    }
    previewRegion.appendChild(el('p', { text: describe(rule) }));
    previewRegion.appendChild(el('p', {
      class: 'field-hint',
      text: `${dates.length} day${dates.length === 1 ? '' : 's'} in the next three months. `
        + `First few: ${dates.slice(0, 4).join(', ')}${dates.length > 4 ? '…' : ''}`
    }));
  }

  workFreq.addEventListener('change', syncDayVisibility, { signal });
  workStart.addEventListener('change', updatePreview, { signal });
  for (const box of dayBoxes) box.addEventListener('change', updatePreview, { signal });

  workForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    workError.hidden = true;
    const rule = buildRule();
    // Belt and braces: the form cannot produce UNTIL or COUNT, but the
    // guard is cheap and the failure it prevents is invisible for a fortnight.
    const guard = assertSupportedRule(rule);
    if (!guard.ok) {
      workError.textContent = guard.error.message;
      workError.hidden = false;
      return;
    }
    if (workFreq.value === 'WEEKLY' && !rule) {
      workError.textContent = 'Choose at least one day of the week.';
      workError.hidden = false;
      dayBoxes[0].focus();
      return;
    }
    workSubmit.disabled = true;
    const result = await createWorkLocation({
      title: workTitle.value,
      locationLabel: workPlace.value,
      startDate: workStart.value,
      recurrenceRule: rule
    });
    workSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      workError.textContent = isOffline()
        ? 'Saving a pattern needs a connection. This will work once you are back online.'
        : (result.error && result.error.message) || "Couldn't save that pattern — try again.";
      workError.hidden = false;
      return;
    }
    announce(`${result.data.title} saved.`);
    workForm.reset();
    workStart.value = todayIso();
    syncDayVisibility();
    await loadWork();
  }, { signal });

  function buildWorkCard(event) {
    const { article, body, actions } = createCard({
      title: event.title, headingLevel: 3, className: 'work-card'
    });
    if (event.location_label) {
      body.appendChild(el('p', { class: 'chip', text: event.location_label }));
    }
    // The pattern is described in words, so the rule is legible without
    // anyone decoding an RRULE string.
    let summary = `Just ${event.start_date}`;
    if (event.recurrence_rule) {
      try {
        summary = describe(event.recurrence_rule);
      } catch (err) {
        console.error('Could not describe a work pattern:', err);
        summary = 'Repeats — pattern could not be read.';
      }
    }
    body.appendChild(el('p', { text: summary }));
    body.appendChild(el('p', { class: 'field-hint', text: `From ${event.start_date}` }));

    const remove = el('button', { type: 'button', class: 'btn btn-danger' });
    remove.textContent = `Remove ${event.title}`;
    remove.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${event.title}?`,
        message: 'This takes the pattern off your calendar.',
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removeWorkLocation(event.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove a work pattern:', result.error);
        showToast("Couldn't remove that — try again.");
        return;
      }
      announce(`${event.title} removed.`);
      await loadWork();
    }, { signal });
    actions.appendChild(remove);
    return article;
  }

  // ============================ Loading ============================

  function restoreFocus(id) {
    const node = document.getElementById(id);
    if (node) node.focus();
  }

  function renderHolidays() {
    holidayList.replaceChildren();
    if (holidays.length === 0) {
      holidayList.appendChild(el('li', {
        class: 'recipe-row',
        text: 'Holidays you add appear on the calendar, with a checklist and a '
          + 'shopping list of their own.'
      }));
      holidaySummary.textContent = '';
      return;
    }
    for (const holiday of holidays) holidayList.appendChild(buildHolidayRow(holiday));

    const outstanding = holidays.reduce((sum, holiday) => {
      const bundle = itemsByHoliday.get(holiday.id) || {};
      return sum + ['purchase', 'pack', 'do'].reduce((inner, kind) =>
        inner + (bundle[kind] || []).filter((row) => statusOf(row) !== 'complete').length, 0);
    }, 0);
    holidaySummary.textContent = outstanding === 0
      ? `${holidays.length} holiday${holidays.length === 1 ? '' : 's'}, nothing outstanding.`
      : `${holidays.length} holiday${holidays.length === 1 ? '' : 's'}, `
        + `${outstanding} thing${outstanding === 1 ? '' : 's'} still to sort.`;
  }

  function renderWork() {
    workList.replaceChildren();
    if (workLocations.length === 0) {
      workList.appendChild(el('p', {
        class: 'empty-state',
        text: 'A work pattern fills your calendar in automatically — set one up below.'
      }));
      return;
    }
    for (const event of workLocations) workList.appendChild(buildWorkCard(event));
  }

  async function loadHolidays() {
    const result = await listHolidays();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load holidays:', result.error);
      holidayList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your holidays. Check your connection, then reload this page."
      }));
      return;
    }
    holidays = result.data;
    renderHolidays();
    await loadItems();
  }

  async function loadItems() {
    if (holidays.length === 0) {
      itemsByHoliday = new Map();
      queuedStatuses = await pendingItemStatuses();
      renderHolidays();
      return;
    }
    const next = new Map();
    for (const holiday of holidays) {
      const [purchase, pack, todo] = await Promise.all([
        listItems(holiday.id, 'purchase'),
        listItems(holiday.id, 'pack'),
        listItems(holiday.id, 'do')
      ]);
      if (destroyed) return;
      if (!purchase.ok || !pack.ok) {
        console.error('Failed to load holiday items:', purchase.error || pack.error);
        continue;
      }
      // `do` is the only list that needs revision 6. If that migration has
      // not run the query fails, and the honest response is an empty list
      // plus a note — not a broken page and not a silent nothing.
      next.set(holiday.id, {
        purchase: purchase.data,
        pack: pack.data,
        do: todo.ok ? todo.data : [],
        todoUnavailable: !todo.ok
      });
      if (!todo.ok) console.error('Things-to-do list unavailable:', todo.error);
    }
    itemsByHoliday = next;
    queuedStatuses = await pendingItemStatuses();
    if (destroyed) return;
    renderHolidays();
  }

  async function loadWork() {
    const result = await listWorkLocations();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load work patterns:', result.error);
      workList.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load your work patterns. Check your connection, then reload this page."
      }));
      return;
    }
    workLocations = result.data;
    renderWork();
  }

  mountEl.append(holidaySection, workSection);
  syncDayVisibility();
  paintOfflineNote();

  function onConnectionChange() {
    if (!destroyed) paintOfflineNote();
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  // data/holidays.js flushes its queue on the same event, so give it a
  // moment before re-reading or a just-synced tick still shows as pending.
  let reconcileTimer = null;
  function onOnline() {
    clearTimeout(reconcileTimer);
    reconcileTimer = setTimeout(() => { if (!destroyed) loadItems(); }, 1200);
  }
  window.addEventListener('online', onOnline);

  (async () => {
    await loadHolidays();
    if (destroyed) return;
    await loadWork();
  })();

  return () => {
    destroyed = true;
    clearTimeout(reconcileTimer);
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    window.removeEventListener('online', onOnline);
    controller.abort();
  };
}
