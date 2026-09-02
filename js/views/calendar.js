// js/views/calendar.js — 01 Sep 2026 v2
// The calendar as its own page.
//
// It used to sit at the bottom of the chores screen, below a form and a
// list of every task. That was tolerable with four chores and unusable at a
// hundred, and it was also wrong in principle: the calendar shows chores,
// holidays and where you are working — three phases' worth of data — so
// belonging to any one of them was an accident of build order.
//
// ---- A month grid is a table, and it is announced as one ----
// Dates sit in a real <table> with scope="col" day headers, so a screen
// reader says "Wednesday, 26" rather than reading a wall of numbers. Each
// date is a <button> carrying its own full label including what is on it,
// because "26" alone tells you nothing about whether the day is busy.
//
// ---- Tapping a date opens the day, it does not navigate ----
// A day's items appear in the slide-out sheet: the grid stays put, so you
// keep your place in the month. Selecting a date never moves focus away
// from the grid on its own.
//
// ---- Completion is per OCCURRENCE ----
// Ticking a chore here writes a chore_task_completions row for that date
// (schema revision 5). It does NOT touch chore_tasks.status, which would
// mark the whole series done forever.

import { listEvents } from '../data/calendar.js';
import { listTasks, listProjects } from '../data/chores.js';
import { listBetween, completionKeys, isDone, markDone, markNotDone, flushQueued }
  from '../data/completions.js';
import { expand, describe } from '../lib/rrule.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { showToast } from '../components/toast.js';
import { isOffline } from '../lib/net.js';
import { announce } from '../lib/a11y.js';

import { el } from '../lib/dom.js';
const DAY_HEADERS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' }
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function isoOf(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Monday-first index (0-6) of the 1st of the month. */
function leadingBlanks(year, monthIndex) {
  const day = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0 = Sunday
  return day === 0 ? 6 : day - 1;
}

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()];
  return `${weekday} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth();

  let events = [];        // calendar_events rows for the visible month
  let tasks = new Map();  // task id -> chore_tasks row
  let projects = new Map();
  let done = new Set();   // "taskId|date"

  mountEl.appendChild(el('h1', { text: 'Calendar' }));

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  mountEl.appendChild(offlineNote);

  function paintOfflineNote() {
    const off = isOffline();
    offlineNote.hidden = !off;
    if (off) {
      offlineNote.textContent =
        'You are offline. Ticking things off still works — it saves here and syncs when you are back.';
    }
  }

  // ---- Month controls -------------------------------------------------
  const controls = el('div', { class: 'calendar-controls' });
  const prevBtn = el('button', { type: 'button', class: 'btn', text: 'Previous' });
  const nextBtn = el('button', { type: 'button', class: 'btn', text: 'Next' });
  const monthLabel = el('h2', { class: 'calendar-month', role: 'status' });
  monthLabel.setAttribute('aria-live', 'polite');
  prevBtn.setAttribute('aria-label', 'Previous month');
  nextBtn.setAttribute('aria-label', 'Next month');
  controls.append(prevBtn, monthLabel, nextBtn);
  mountEl.appendChild(controls);

  prevBtn.addEventListener('click', () => shiftMonth(-1), { signal });
  nextBtn.addEventListener('click', () => shiftMonth(1), { signal });

  function shiftMonth(delta) {
    monthIndex += delta;
    if (monthIndex < 0) { monthIndex = 11; year -= 1; }
    if (monthIndex > 11) { monthIndex = 0; year += 1; }
    load();
  }

  const gridWrap = el('div', { class: 'calendar-wrap' });
  mountEl.appendChild(gridWrap);

  const summary = el('p', { class: 'field-hint' });
  mountEl.appendChild(summary);

  // ---- What is on a given day ----------------------------------------

  /**
   * Every item falling on one date, already resolved to something showable.
   * A recurring source is ONE row expanded here — never one row per
   * occurrence, per the calendar convention frozen in Phase 4.
   */
  function itemsOn(iso) {
    const out = [];
    for (const event of events) {
      let hits = false;
      if (event.recurrence_rule) {
        try {
          hits = expand(event.recurrence_rule, event.start_date, iso, iso).length > 0;
        } catch (err) {
          // A rule this engine cannot read must not take the month down.
          console.error('Skipping an unreadable recurrence rule:', event.recurrence_rule, err);
          hits = false;
        }
      } else {
        hits = event.start_date === iso;
      }
      if (!hits) continue;

      const task = event.source_id ? tasks.get(event.source_id) : null;
      const project = task ? projects.get(task.project_id) : null;
      out.push({
        event,
        task,
        project,
        title: event.title,
        type: event.event_type,
        rule: event.recurrence_rule,
        done: task ? isDone(done, task.id, iso) : false
      });
    }
    return out;
  }

  function renderGrid() {
    monthLabel.textContent = `${MONTH_NAMES[monthIndex]} ${year}`;
    gridWrap.replaceChildren();

    const table = el('table', { class: 'calendar-table' });
    table.setAttribute('aria-label', `${MONTH_NAMES[monthIndex]} ${year}`);

    const thead = el('thead');
    const headRow = el('tr');
    for (const day of DAY_HEADERS) {
      const th = el('th', { scope: 'col' });
      // Abbreviated visually, said in full to a screen reader.
      th.appendChild(el('span', { 'aria-hidden': 'true', text: day.short }));
      th.appendChild(el('span', { class: 'visually-hidden', text: day.full }));
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    const total = daysInMonth(year, monthIndex);
    const blanks = leadingBlanks(year, monthIndex);
    const today = todayIso();

    let row = el('tr');
    for (let i = 0; i < blanks; i++) row.appendChild(el('td', { class: 'calendar-empty' }));

    let busyDays = 0;
    for (let day = 1; day <= total; day++) {
      if (row.children.length === 7) { tbody.appendChild(row); row = el('tr'); }
      const iso = isoOf(year, monthIndex, day);
      const items = itemsOn(iso);
      const outstanding = items.filter((item) => !item.done).length;
      if (items.length > 0) busyDays += 1;

      const cell = el('td');
      const btn = el('button', { type: 'button', class: 'calendar-day' });
      if (iso === today) {
        btn.classList.add('is-today');
        btn.setAttribute('aria-current', 'date');
      }
      btn.appendChild(el('span', { class: 'calendar-day-number', text: String(day) }));

      // A count, not a coloured dot: the number is the information, and it
      // survives being read aloud (1.4.1 — never colour alone).
      if (items.length > 0) {
        btn.appendChild(el('span', { class: 'calendar-day-count', 'aria-hidden': 'true', text: String(items.length) }));
      }

      const label = items.length === 0
        ? `${longDate(iso)}, nothing on`
        : `${longDate(iso)}, ${items.length} item${items.length === 1 ? '' : 's'}`
          + `${outstanding === 0 ? ', all done' : `, ${outstanding} still to do`}`;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', () => openDay(iso, btn), { signal });

      cell.appendChild(btn);
      row.appendChild(cell);
    }
    while (row.children.length < 7) row.appendChild(el('td', { class: 'calendar-empty' }));
    tbody.appendChild(row);
    table.appendChild(tbody);
    gridWrap.appendChild(table);

    summary.textContent = busyDays === 0
      ? 'Nothing on this month. Chores, holidays and work days appear here as you add them.'
      : `${busyDays} day${busyDays === 1 ? '' : 's'} with something on. Tap a date to see it.`;
  }

  // ---- One day, in the sheet -----------------------------------------

  function openDay(iso, returnFocusTo) {
    const items = itemsOn(iso);

    openDetailSheet({
      title: longDate(iso),
      subtitle: items.length === 0
        ? 'Nothing on'
        : `${items.length} item${items.length === 1 ? '' : 's'}`,
      returnFocusTo,
      build: (body, { close }) => {
        if (items.length === 0) {
          body.appendChild(el('p', { text: 'Nothing is scheduled for this day.' }));
          return;
        }

        const list = el('ul', { class: 'day-items' });
        for (const item of items) {
          const li = el('li', { class: 'day-item' });

          const text = el('div', { class: 'day-item-text' });
          text.appendChild(el('span', { class: 'day-item-title', text: item.title }));

          const bits = [];
          if (item.project) bits.push(item.project.title);
          if (item.rule) {
            try {
              bits.push(describe(item.rule));
            } catch {
              bits.push('Repeats');
            }
          }
          if (item.type === 'holiday') bits.push('Holiday');
          if (item.type === 'work_location') {
            bits.push(item.event.location_label || 'Work location');
          }
          if (bits.length > 0) {
            text.appendChild(el('span', { class: 'day-item-meta', text: bits.join(' · ') }));
          }
          li.appendChild(text);

          // Only chores can be ticked. A holiday is not a task.
          if (item.task) {
            const toggle = el('button', { type: 'button', class: 'btn check-toggle' });
            const paint = (isComplete) => {
              toggle.textContent = isComplete ? 'Done' : 'Mark done';
              toggle.setAttribute('aria-pressed', String(isComplete));
              toggle.setAttribute('aria-label',
                `${item.title} on ${longDate(iso)}, ${isComplete ? 'done' : 'not done'}`);
            };
            paint(item.done);

            toggle.addEventListener('click', async () => {
              const wasDone = toggle.getAttribute('aria-pressed') === 'true';
              // Optimistic: the tap counts immediately and the write happens
              // behind it. The button is never disabled — a chore gets ticked
              // standing in a doorway, and a dead control reads as a crash.
              paint(!wasDone);
              if (wasDone) done.delete(`${item.task.id}|${iso}`);
              else done.add(`${item.task.id}|${iso}`);
              renderGrid();

              const result = wasDone
                ? await markNotDone(item.task.id, iso)
                : await markDone(item.task.id, iso);
              if (destroyed) return;

              if (!result.ok) {
                // Roll the UI back rather than lying about what was saved.
                paint(wasDone);
                if (wasDone) done.add(`${item.task.id}|${iso}`);
                else done.delete(`${item.task.id}|${iso}`);
                renderGrid();
                console.error('Failed to change a completion:', result.error);
                showToast("Couldn't save that — try again.");
                return;
              }
              if (result.queued) {
                announce(`${item.title} marked done on this device. It will sync when you are back online.`);
              } else {
                announce(`${item.title} ${wasDone ? 'marked not done' : 'marked done'}.`);
              }
            }, { signal });

            li.appendChild(toggle);
          }

          list.appendChild(li);
        }
        body.appendChild(list);
      }
    });
  }

  // ---- Loading --------------------------------------------------------

  async function load() {
    const total = daysInMonth(year, monthIndex);
    const startISO = isoOf(year, monthIndex, 1);
    const endISO = isoOf(year, monthIndex, total);

    const [eventResult, taskResult, projectResult, doneResult] = await Promise.all([
      listEvents(startISO, endISO, { eventTypes: ['chore', 'holiday', 'work_location', 'custom'] }),
      listTasks(),
      listProjects(),
      listBetween(startISO, endISO)
    ]);
    if (destroyed) return;

    if (!eventResult.ok) {
      console.error('Failed to load the calendar:', eventResult.error);
      gridWrap.replaceChildren(el('p', {
        class: 'view-status',
        text: "Couldn't load the calendar. Check your connection, then reload this page."
      }));
      return;
    }
    events = eventResult.data;
    tasks = new Map((taskResult.ok ? taskResult.data : []).map((t) => [t.id, t]));
    projects = new Map((projectResult.ok ? projectResult.data : []).map((p) => [p.id, p]));

    if (!doneResult.ok) {
      // The month is still worth showing without completions; it just cannot
      // say what has been done, so it must not pretend otherwise.
      console.error('Failed to load completions:', doneResult.error);
      done = new Set();
    } else {
      done = completionKeys(doneResult.data);
    }

    renderGrid();
  }

  paintOfflineNote();

  function onConnectionChange() {
    if (destroyed) return;
    paintOfflineNote();
    if (!isOffline()) {
      flushQueued()
        .then(() => { if (!destroyed) load(); })
        .catch((err) => console.error('Could not replay queued completions:', err));
    }
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  load();

  return () => {
    destroyed = true;
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    controller.abort();
  };
}
