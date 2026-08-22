// js/views/holidays.js — 21 Aug 2026 v2
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
  listItems, addItem, setItemStatus, setSendToShopping, removeItem,
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

// Local element helper, defined here rather than copied in — the 18 Aug
// ReferenceError came from moving a helper without checking the destination.
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
  const holidayList = el('div', { class: 'card-list' });
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
  holidaySection.appendChild(addForm);

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

  function buildHolidayCard(holiday) {
    const { article, body, actions } = createCard({
      title: holiday.title, headingLevel: 3, className: 'holiday-card'
    });
    article.dataset.holidayId = holiday.id;

    const nights = nightsBetween(holiday.start_date, holiday.end_date);
    // The range is always readable as text, never a coloured bar alone.
    body.appendChild(el('p', {
      class: 'chip',
      text: `${formatRange(holiday.start_date, holiday.end_date)}${nights ? ` · ${nights} day${nights === 1 ? '' : 's'}` : ''}`
    }));

    const bundle = itemsByHoliday.get(holiday.id) || { checklist: [], purchase: [] };
    body.appendChild(buildItemGroup(holiday, 'checklist', 'Packing list', bundle.checklist));
    body.appendChild(buildItemGroup(holiday, 'purchase', 'Things to buy', bundle.purchase));

    const deleteBtn = el('button', { type: 'button', class: 'btn btn-danger' });
    deleteBtn.textContent = `Delete ${holiday.title}`;
    deleteBtn.addEventListener('click', () => onDeleteHoliday(holiday), { signal });
    actions.appendChild(deleteBtn);

    return article;
  }

  function statusOf(item) {
    // A queued tick has not reached the server, but from the user's point of
    // view it happened. Showing the stale server value would read as "my tap
    // didn't count" (principle 1) — the same reasoning as water's totals.
    return queuedStatuses.has(item.id) ? queuedStatuses.get(item.id) : item.status;
  }

  function buildItemGroup(holiday, kind, heading, items) {
    const wrap = el('div', { class: 'item-group' });
    wrap.appendChild(el('h4', { text: heading }));

    const done = items.filter((item) => statusOf(item) === 'complete').length;
    wrap.appendChild(el('p', {
      class: 'field-hint',
      // A fact, not a scoreboard. Nothing counts down at the user.
      text: items.length === 0
        ? 'Nothing on this list yet.'
        : `${done} of ${items.length} ${kind === 'checklist' ? 'packed' : 'bought'}`
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
    const verb = kind === 'checklist' ? 'Packed' : 'Bought';
    toggle.textContent = complete ? verb : 'To do';
    toggle.setAttribute('aria-label', `${item.title} — ${complete ? verb.toLowerCase() : 'to do'}`);

    toggle.addEventListener('click', async () => {
      const next = complete ? 'pending' : 'complete';
      // OPTIMISTIC: the tap counts now, the write happens behind it. The
      // button is never disabled — a disabled button defeats the one-tap
      // premise, and this happens while packing, often with no signal.
      queuedStatuses.set(item.id, next);
      renderHolidays();
      announce(`${item.title} — ${next === 'complete' ? verb.toLowerCase() : 'to do'}.`);

      const result = await setItemStatus(kind, item.id, next);
      if (destroyed) return;
      if (!result.ok) {
        // Only an outright failure rolls back, and it says so.
        queuedStatuses.delete(item.id);
        console.error('Failed to set a holiday item status:', result.error);
        showToast("That didn't save — tap it again.");
        renderHolidays();
        return;
      }
      if (!result.queued) queuedStatuses.delete(item.id);
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
      const note = el('span', { class: 'field-hint', text: '(saved now, list arrives with Phase 7)' });
      checkbox.addEventListener('change', async () => {
        const result = await setSendToShopping(item.id, checkbox.checked);
        if (destroyed) return;
        if (!result.ok) {
          checkbox.checked = !checkbox.checked;
          console.error('Failed to set send_to_shopping:', result.error);
          showToast("Couldn't change that — try again.");
          return;
        }
        announce(`${item.title} ${checkbox.checked ? 'marked for' : 'removed from'} the shopping list.`);
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
      holidayList.appendChild(el('p', { text: 'No holidays yet — add one below.' }));
      return;
    }
    for (const holiday of holidays) holidayList.appendChild(buildHolidayCard(holiday));
  }

  function renderWork() {
    workList.replaceChildren();
    if (workLocations.length === 0) {
      workList.appendChild(el('p', { text: 'No work patterns yet — add one below.' }));
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
      const [checklist, purchase] = await Promise.all([
        listItems(holiday.id, 'checklist'),
        listItems(holiday.id, 'purchase')
      ]);
      if (destroyed) return;
      if (!checklist.ok || !purchase.ok) {
        console.error('Failed to load holiday items:', checklist.error || purchase.error);
        continue;
      }
      next.set(holiday.id, { checklist: checklist.data, purchase: purchase.data });
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
