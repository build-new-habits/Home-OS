// js/views/chores.js — 26 Aug 2026 v4
// v4: THE FLAT LIST DOES NOT SCALE, AND NEITHER DID COMPLETION.
//
//   1. A hundred tasks in one list is unreadable. Projects are cards you
//      open, one at a time, with their tasks inside. The default view is
//      never everything.
//   2. Filtering by cadence — daily / weekly / monthly / seasonally — lives
//      in the slide-out panel, not as a permanent bar. The button carries
//      the active filter count, so hidden state is never silent: a filtered
//      list that looks unfiltered is how you conclude a task has vanished.
//   3. Ticking a REPEATING chore completes THIS OCCURRENCE, not the task.
//      chore_tasks.status marked a series done forever — tolerable with four
//      chores, fatal the moment anything asks what is due today. One-off
//      tasks still use status, because for them the task IS the occurrence.
//   4. Repeats can now END, because rrule.js v2 honours UNTIL. v1 accepted
//      an end date and then ignored it, so this control could not honestly
//      exist before now.
//
// The calendar section is gone — it is its own page. It shows chores,
// holidays and work location, so living at the bottom of this screen was an
// accident of build order.
//

// v3: loadCalendar() now asks listEvents() for chore events only. See
// data/calendar.js v2 — the unfiltered call was latent until Phase 8 and
// would have rendered work-location and holiday events as chores.
// Replaces the Phase 2 stub. Projects, tasks — now including edit — with
// the 3-month recurrence confirmation (principle 4), and a calendar
// (principles 1, 2, 3, 9, 10).
//
// v2: adds task editing (title/details/project/recurrence), which v1
// shipped without — flagged as an open gap in the Phase 4 handoff and
// closed here. The add form and each task's inline edit form now share
// one recurrence-builder factory (createRecurrenceBuilder) instead of
// duplicating the fieldset — this is the only structural change from v1.
import {
  listProjects, createProject, countTasksInProject, deleteProject,
  listTasks, createTask, updateTask, completeTask, uncompleteTask, deleteTask
} from '../data/chores.js';
import { upsertTaskEvent, removeTaskEvent, findEventByTaskId, listEvents } from '../data/calendar.js';
import { expand, describe, cadence, CADENCES } from '../lib/rrule.js';
import { createCard } from '../components/card.js';
import { showCompletionStamp, hideCompletionStamp } from '../components/completionStamp.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { listBetween, completionKeys, isDone, markDone, markNotDone }
  from '../data/completions.js';

const WEEKDAYS = [
  { code: 'MO', label: 'Monday' }, { code: 'TU', label: 'Tuesday' }, { code: 'WE', label: 'Wednesday' },
  { code: 'TH', label: 'Thursday' }, { code: 'FR', label: 'Friday' }, { code: 'SA', label: 'Saturday' },
  { code: 'SU', label: 'Sunday' }
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

function fieldWrap(labelEl, inputEl, extraEl) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.append(labelEl, inputEl);
  if (extraEl) wrap.appendChild(extraEl);
  return wrap;
}

function labeledInput(id, labelText, type = 'text') {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  return { label, input };
}

// Loose parse of a rule string for prefilling the edit form only — not
// used for expansion or validation (that's rrule.js's job, always).
function parseRuleForPrefill(rule) {
  const parts = (rule || '').split(';').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k) acc[k] = v;
    return acc;
  }, {});
  return {
    freq: parts.FREQ || 'DAILY',
    interval: parts.INTERVAL ? Number(parts.INTERVAL) : 1,
    byday: parts.BYDAY ? parts.BYDAY.split(',') : [],
    bymonthday: parts.BYMONTHDAY ? Number(parts.BYMONTHDAY) : null,
    // Read back as YYYY-MM-DD for a date input; written as YYYYMMDD.
    until: parts.UNTIL
      ? String(parts.UNTIL).replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3')
      : null
  };
}

/**
 * Builds the recurrence fieldset (start date, frequency, interval,
 * weekday/month-day pickers, and the 3-month preview/confirmation gate).
 * Shared by the add-task form and every task's inline edit form so the
 * trust-critical confirmation logic exists in exactly one place.
 */
function createRecurrenceBuilder(idPrefix, signal) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Repeats';
  fieldset.appendChild(legend);

  const startF = labeledInput(`${idPrefix}-start`, 'Starts on', 'date');
  startF.input.value = todayIso();
  startF.input.required = true;
  fieldset.appendChild(fieldWrap(startF.label, startF.input));

  const freqLabel = document.createElement('label');
  freqLabel.htmlFor = `${idPrefix}-freq`;
  freqLabel.textContent = 'Frequency';
  const freqSelect = document.createElement('select');
  freqSelect.id = `${idPrefix}-freq`;
  for (const [value, text] of [['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']]) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    freqSelect.appendChild(opt);
  }
  fieldset.appendChild(fieldWrap(freqLabel, freqSelect));

  const intervalF = labeledInput(`${idPrefix}-interval`, 'Every (number of days/weeks/months)', 'number');
  intervalF.input.min = '1';
  intervalF.input.value = '1';
  intervalF.input.required = true;
  fieldset.appendChild(fieldWrap(intervalF.label, intervalF.input));

  const weekdayFieldset = document.createElement('fieldset');
  const weekdayLegend = document.createElement('legend');
  weekdayLegend.textContent = 'On these days';
  weekdayFieldset.appendChild(weekdayLegend);
  const weekdayCheckboxes = new Map();
  for (const { code, label } of WEEKDAYS) {
    const row = document.createElement('div');
    row.className = 'field field-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `${idPrefix}-byday-${code}`;
    cb.value = code;
    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;
    lbl.textContent = label;
    row.append(cb, lbl);
    weekdayFieldset.appendChild(row);
    weekdayCheckboxes.set(code, cb);
  }
  fieldset.appendChild(weekdayFieldset);

  const monthDayLabel = document.createElement('label');
  monthDayLabel.htmlFor = `${idPrefix}-monthday`;
  monthDayLabel.textContent = 'Day of month';
  const monthDaySelect = document.createElement('select');
  monthDaySelect.id = `${idPrefix}-monthday`;
  for (let d = 1; d <= 28; d++) {
    const opt = document.createElement('option');
    opt.value = String(d);
    opt.textContent = String(d);
    monthDaySelect.appendChild(opt);
  }
  const monthDayField = fieldWrap(monthDayLabel, monthDaySelect);
  fieldset.appendChild(monthDayField);

  const monthDayHint = document.createElement('p');
  monthDayHint.className = 'field-hint';
  monthDayHint.textContent = 'Days 29–31 are not supported yet, to avoid short-month edge cases.';
  fieldset.appendChild(monthDayHint);

  // ---- Ends ----
  // Stored as UNTIL on the rule itself, never as a separate column: one
  // source for when a repeat stops.
  const endsLabel = document.createElement('label');
  endsLabel.htmlFor = `${idPrefix}-ends`;
  endsLabel.textContent = 'Ends';
  const endsSelect = document.createElement('select');
  endsSelect.id = `${idPrefix}-ends`;
  for (const [value, text] of [['never', 'Never'], ['on', 'On a date']]) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    endsSelect.appendChild(opt);
  }
  fieldset.appendChild(fieldWrap(endsLabel, endsSelect));

  const untilF = labeledInput(`${idPrefix}-until`, 'Last day it can happen', 'date');
  const untilField = fieldWrap(untilF.label, untilF.input);
  fieldset.appendChild(untilField);

  function updateEndsVisibility() {
    untilField.hidden = endsSelect.value !== 'on';
    untilF.input.required = endsSelect.value === 'on';
  }

  function updateFreqVisibility() {
    const freq = freqSelect.value;
    weekdayFieldset.hidden = freq !== 'WEEKLY';
    monthDayField.hidden = freq !== 'MONTHLY';
    monthDayHint.hidden = freq !== 'MONTHLY';
  }
  freqSelect.addEventListener('change', () => { updateFreqVisibility(); clearPreview(); }, { signal });
  updateFreqVisibility();
  endsSelect.addEventListener('change', () => { updateEndsVisibility(); clearPreview(); }, { signal });
  untilF.input.addEventListener('change', clearPreview, { signal });
  updateEndsVisibility();

  const previewRegion = document.createElement('div');
  previewRegion.className = 'recurrence-preview';
  previewRegion.setAttribute('aria-live', 'polite');

  const previewBtn = document.createElement('button');
  previewBtn.type = 'button';
  previewBtn.className = 'btn';
  previewBtn.textContent = 'Show upcoming dates';
  fieldset.appendChild(previewBtn);
  fieldset.appendChild(previewRegion);

  let confirmedRule = null;
  let lastBuiltStart = null;

  function clearPreview() {
    previewRegion.replaceChildren();
    confirmedRule = null;
  }

  /** ';UNTIL=YYYYMMDD', '' for never, or null when the input is unusable. */
  function endingSuffix() {
    if (endsSelect.value !== 'on') return '';
    const value = untilF.input.value;
    if (!value) {
      showToast('Pick the last day it can happen, or set Ends to Never.');
      return null;
    }
    if (value < startF.input.value) {
      // Saving this would produce zero occurrences, which looks exactly like
      // a save that did nothing — the hardest kind of bug to report.
      showToast('The end date is before the start date, so it would never happen.');
      return null;
    }
    return `;UNTIL=${value.replace(/-/g, '')}`;
  }

  function buildRuleFromForm() {
    const freq = freqSelect.value;
    const interval = Number(intervalF.input.value) || 1;
    const ending = endingSuffix();
    if (ending === null) return null;
    if (freq === 'WEEKLY') {
      const days = [...weekdayCheckboxes.entries()].filter(([, cb]) => cb.checked).map(([code]) => code);
      if (days.length === 0) {
        showToast('Pick at least one day of the week.');
        return null;
      }
      return `FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${days.join(',')}${ending}`;
    }
    if (freq === 'MONTHLY') {
      return `FREQ=MONTHLY;INTERVAL=${interval};BYMONTHDAY=${monthDaySelect.value}${ending}`;
    }
    return `FREQ=DAILY;INTERVAL=${interval}${ending}`;
  }

  function showPreview(rule, startDate) {
    previewRegion.replaceChildren();
    let dates;
    try {
      const windowEnd = addMonthsIso(startDate, 3);
      dates = expand(rule, startDate, startDate, windowEnd);
    } catch (err) {
      console.error('Recurrence rule error:', err);
      showToast("That repeat pattern isn't valid — check the details above.");
      confirmedRule = null;
      return;
    }
    const summary = document.createElement('p');
    summary.textContent = describe(rule);
    const count = document.createElement('p');
    // The window is three months, but a bounded rule may stop inside it —
    // saying "over the next 3 months" would then misdescribe the list.
    const bounded = /UNTIL=/.test(rule);
    if (bounded && dates.length === 0) {
      count.textContent = 'This would never happen — the end date is before the first occurrence.';
    } else if (bounded) {
      count.textContent = `${dates.length} occurrence${dates.length === 1 ? '' : 's'}, then it stops:`;
    } else {
      count.textContent = `${dates.length} occurrence${dates.length === 1 ? '' : 's'} over the next 3 months:`;
    }
    const list = document.createElement('ul');
    list.className = 'preview-dates';
    for (const iso of dates.slice(0, 20)) {
      const li = document.createElement('li');
      li.textContent = iso;
      list.appendChild(li);
    }
    if (dates.length > 20) {
      const more = document.createElement('li');
      more.textContent = `…and ${dates.length - 20} more`;
      list.appendChild(more);
    }
    previewRegion.append(summary, count, list);
    confirmedRule = rule;
    lastBuiltStart = startDate;
    announce(`Showing ${dates.length} upcoming dates`);
  }

  previewBtn.addEventListener('click', () => {
    const rule = buildRuleFromForm();
    if (!rule) return;
    showPreview(rule, startF.input.value);
  }, { signal });

  return {
    fieldset,
    startInput: startF.input,
    /** Returns the confirmed rule only if it still matches the current start date; otherwise null, forcing a fresh preview. */
    getConfirmedRule() {
      if (!confirmedRule) return null;
      if (lastBuiltStart !== startF.input.value) return null;
      return confirmedRule;
    },
    buildRuleFromForm,
    showPreview,
    clearPreview,
    reset() {
      startF.input.value = todayIso();
      freqSelect.value = 'DAILY';
      intervalF.input.value = '1';
      for (const cb of weekdayCheckboxes.values()) cb.checked = false;
      monthDaySelect.value = '1';
      endsSelect.value = 'never';
      untilF.input.value = '';
      updateFreqVisibility();
      updateEndsVisibility();
      clearPreview();
    },
    setInitial({ recurrenceRule, startDate }) {
      if (startDate) startF.input.value = startDate;
      if (!recurrenceRule) return;
      const parsed = parseRuleForPrefill(recurrenceRule);
      freqSelect.value = parsed.freq;
      intervalF.input.value = String(parsed.interval || 1);
      for (const [code, cb] of weekdayCheckboxes.entries()) {
        cb.checked = parsed.byday.includes(code);
      }
      if (parsed.bymonthday) monthDaySelect.value = String(parsed.bymonthday);
      endsSelect.value = parsed.until ? 'on' : 'never';
      untilF.input.value = parsed.until || '';
      updateFreqVisibility();
      updateEndsVisibility();
      clearPreview();
    }
  };
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;

  let projects = [];
  let projectSelectEl;
  let tasks = [];
  let doneKeys = new Set();
  let eventStartById = new Map();
  let openProjectId = null;

  // Empty cadences means "all". An empty set reading as "show nothing" would
  // make the screen look broken on first open.
  const filters = { cadences: new Set(), hideDone: false };

  const h1 = document.createElement('h1');
  h1.textContent = 'Chores';
  h1.tabIndex = -1;
  mountEl.appendChild(h1);
  h1.focus();

  // ---------------- Filter ----------------
  // In the panel, not on the screen: a filter bar is permanent clutter for
  // an occasional action. The COUNT on the button is what keeps hidden state
  // from being silent.
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';

  const filterBtn = document.createElement('button');
  filterBtn.type = 'button';
  filterBtn.className = 'btn';
  filterRow.appendChild(filterBtn);

  const filterSummary = document.createElement('p');
  filterSummary.className = 'field-hint';
  filterSummary.setAttribute('role', 'status');
  filterSummary.setAttribute('aria-live', 'polite');
  filterRow.appendChild(filterSummary);
  mountEl.appendChild(filterRow);

  function activeFilterCount() {
    return filters.cadences.size + (filters.hideDone ? 1 : 0);
  }

  function paintFilterButton() {
    const count = activeFilterCount();
    filterBtn.textContent = count === 0 ? 'Filter' : `Filter (${count})`;
    filterBtn.setAttribute('aria-label', count === 0
      ? 'Filter chores'
      : `Filter chores, ${count} filter${count === 1 ? '' : 's'} on`);
  }

  function openFilterSheet(returnFocusTo) {
    openDetailSheet({
      title: 'Filter chores',
      subtitle: 'Nothing is deleted — this only changes what is shown.',
      returnFocusTo,
      build: (body, { close }) => {
        const cadenceSet = document.createElement('fieldset');
        const cadenceLegend = document.createElement('legend');
        cadenceLegend.textContent = 'How often';
        cadenceSet.appendChild(cadenceLegend);

        for (const option of CADENCES) {
          const row = document.createElement('div');
          row.className = 'field field-checkbox';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.id = `filter-cadence-${option.value}`;
          cb.checked = filters.cadences.has(option.value);
          const label = document.createElement('label');
          label.htmlFor = cb.id;
          label.textContent = option.label;
          cb.addEventListener('change', () => {
            if (cb.checked) filters.cadences.add(option.value);
            else filters.cadences.delete(option.value);
            paintFilterButton();
            renderProjects();
          }, { signal });
          row.append(cb, label);
          cadenceSet.appendChild(row);
        }
        body.appendChild(cadenceSet);

        const doneRow = document.createElement('div');
        doneRow.className = 'field field-checkbox';
        const doneCb = document.createElement('input');
        doneCb.type = 'checkbox';
        doneCb.id = 'filter-hide-done';
        doneCb.checked = filters.hideDone;
        const doneLabel = document.createElement('label');
        doneLabel.htmlFor = doneCb.id;
        doneLabel.textContent = 'Hide anything already done';
        doneCb.addEventListener('change', () => {
          filters.hideDone = doneCb.checked;
          paintFilterButton();
          renderProjects();
        }, { signal });
        doneRow.append(doneCb, doneLabel);
        body.appendChild(doneRow);

        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'btn';
        clear.textContent = 'Clear all filters';
        clear.addEventListener('click', () => {
          filters.cadences.clear();
          filters.hideDone = false;
          paintFilterButton();
          renderProjects();
          announce('Filters cleared.');
          close();
        }, { signal });
        body.appendChild(clear);
      }
    });
  }

  filterBtn.addEventListener('click', () => openFilterSheet(filterBtn), { signal });
  paintFilterButton();

  // ---------------- Projects ----------------
  const projectsSection = document.createElement('section');
  const projectsHeading = document.createElement('h2');
  projectsHeading.textContent = 'Projects';
  const projectsList = document.createElement('div');
  projectsList.className = 'project-list';
  projectsSection.append(projectsHeading, projectsList);

  const addProjectToggle = document.createElement('button');
  addProjectToggle.type = 'button';
  addProjectToggle.className = 'btn';
  addProjectToggle.textContent = 'Add a project';
  addProjectToggle.setAttribute('aria-expanded', 'false');
  const addProjectBody = document.createElement('div');
  addProjectBody.hidden = true;
  const { form: addProjectForm } = buildAddProjectForm();
  addProjectBody.appendChild(addProjectForm);
  addProjectToggle.addEventListener('click', () => {
    const open = addProjectToggle.getAttribute('aria-expanded') === 'true';
    addProjectToggle.setAttribute('aria-expanded', String(!open));
    addProjectBody.hidden = open;
  }, { signal });
  projectsSection.append(addProjectToggle, addProjectBody);

  // Built ONCE and moved into whichever project is open, so the recurrence
  // builder — and the confirmation gate inside it — exists exactly once.
  const { form: addTaskForm } = buildAddTaskForm();
  const addTaskWrap = document.createElement('div');
  const addTaskToggle = document.createElement('button');
  addTaskToggle.type = 'button';
  addTaskToggle.className = 'btn';
  addTaskToggle.textContent = 'Add a task';
  addTaskToggle.setAttribute('aria-expanded', 'false');
  const addTaskBody = document.createElement('div');
  addTaskBody.hidden = true;
  addTaskBody.appendChild(addTaskForm);
  addTaskToggle.addEventListener('click', () => {
    const open = addTaskToggle.getAttribute('aria-expanded') === 'true';
    addTaskToggle.setAttribute('aria-expanded', String(!open));
    addTaskBody.hidden = open;
  }, { signal });
  addTaskWrap.append(addTaskToggle, addTaskBody);

  mountEl.append(projectsSection);

  // ================= Projects =================

  function buildAddProjectForm() {
    const form = document.createElement('form');
    form.setAttribute('aria-label', 'Add a project');

    const titleF = labeledInput('new-project-title', 'Project title');
    titleF.input.required = true;

    const colourF = labeledInput('new-project-colour', 'Colour', 'color');
    colourF.input.value = '#2f6f4f';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary btn-block';
    submitBtn.textContent = 'Add project';

    form.append(fieldWrap(titleF.label, titleF.input), fieldWrap(colourF.label, colourF.input), submitBtn);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!titleF.input.value.trim()) {
        titleF.input.focus();
        return;
      }
      submitBtn.disabled = true;
      const result = await createProject({
        title: titleF.input.value.trim(),
        colour: colourF.input.value,
        sort_order: projects.length
      });
      submitBtn.disabled = false;
      if (!result.ok) {
        console.error('Failed to create project:', result.error);
        showToast("Couldn't create that project — check your connection and try again.");
        return;
      }
      form.reset();
      colourF.input.value = '#2f6f4f';
      announce(`${result.data.title} project added`);
      await loadProjects();
      populateProjectSelect(projectSelectEl);
    }, { signal });

    return { form };
  }

  /**
   * The delete control, lifted out of the old project card.
   *
   * The RESTRICT confirm is the load-bearing part: a project with tasks
   * cannot be deleted, and the dialog says how many and what to do about it
   * rather than just refusing.
   */
  function buildProjectDeleteButton(project) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = `Delete ${project.title}`;
    deleteBtn.addEventListener('click', async () => {
      const countResult = await countTasksInProject(project.id);
      if (!countResult.ok) {
        console.error('Failed to count tasks:', countResult.error);
        showToast("Couldn't check this project's tasks — try again.");
        return;
      }
      const count = countResult.data;
      const blocked = count > 0;
      const message = blocked
        ? `This project has ${count} task${count === 1 ? '' : 's'}. Move or delete ${count === 1 ? 'it' : 'them'} first — a project with tasks can't be deleted.`
        : `Delete "${project.title}"? This can't be undone.`;
      const confirmed = await confirmDialog({
        title: blocked ? `Can't delete ${project.title}` : `Delete ${project.title}?`,
        message,
        confirmLabel: blocked ? 'OK' : 'Delete',
        cancelLabel: blocked ? 'Close' : 'Cancel'
      });
      if (blocked || !confirmed) return;
      const result = await deleteProject(project.id);
      if (!result.ok) {
        console.error('Failed to delete project:', result.error);
        showToast("Couldn't delete that project — check your connection and try again.");
        return;
      }
      announce(`${project.title} deleted`);
      openProjectId = null;
      await loadProjects();
      populateProjectSelect(projectSelectEl);
    }, { signal });
    return deleteBtn;
  }

  // ================= What is due, and has it been done =================

  /**
   * The occurrence a repeating task is currently ASKING about: the earliest
   * date that is due and not yet completed, over a window of three months
   * back and three forward.
   *
   * Looking BACK matters. A weekly chore missed on Monday is still the
   * outstanding one on Wednesday; showing next Monday instead would quietly
   * forgive it, and a list that silently forgives things stops being worth
   * trusting.
   */
  function currentOccurrence(task, startDate) {
    if (!task.is_repeatable || !task.recurrence_rule) return null;
    const today = todayIso();
    let dates;
    try {
      dates = expand(task.recurrence_rule, startDate, addMonthsIso(today, -3), addMonthsIso(today, 3));
    } catch (err) {
      // One unreadable rule must not take the whole screen down.
      console.error('Unreadable recurrence rule on task', task.id, err);
      return null;
    }
    const outstanding = dates.filter((iso) => iso <= today && !isDone(doneKeys, task.id, iso));
    if (outstanding.length > 0) {
      return { date: outstanding[0], overdue: outstanding[0] < today, done: false };
    }
    const upcoming = dates.find((iso) => iso > today);
    if (upcoming) return { date: upcoming, overdue: false, done: false };
    if (dates.includes(today) && isDone(doneKeys, task.id, today)) {
      return { date: today, overdue: false, done: true };
    }
    return null;
  }

  /** How a task reads on one line, and whether it still counts as to-do. */
  function taskState(task) {
    const startDate = eventStartById.get(task.id)
      || (task.created_at ? task.created_at.slice(0, 10) : todayIso());

    if (!task.is_repeatable || !task.recurrence_rule) {
      const done = task.status === 'complete';
      return { cadence: 'once', done, label: done ? 'Done' : 'To do', occurrence: null, finished: false };
    }

    const occ = currentOccurrence(task, startDate);
    const word = cadence(task.recurrence_rule);
    if (!occ) {
      // A bounded rule that has run out. Said plainly, rather than left
      // looking permanently outstanding.
      return { cadence: word, done: true, label: 'Finished — no more dates', occurrence: null, finished: true };
    }
    if (occ.done) return { cadence: word, done: true, label: 'Done today', occurrence: occ, finished: false };
    const label = occ.date === todayIso()
      ? 'Due today'
      : (occ.overdue ? `Was due ${occ.date}` : `Next ${occ.date}`);
    return { cadence: word, done: false, label, occurrence: occ, finished: false };
  }

  function passesFilters(task) {
    const state = taskState(task);
    if (filters.cadences.size > 0 && !filters.cadences.has(state.cadence)) return false;
    if (filters.hideDone && state.done) return false;
    return true;
  }

  // ================= Project accordion =================

  function renderProjects() {
    projectsList.replaceChildren();

    const tasksByProject = new Map();
    for (const task of tasks) {
      if (!tasksByProject.has(task.project_id)) tasksByProject.set(task.project_id, []);
      tasksByProject.get(task.project_id).push(task);
    }

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects yet. Add one to start grouping chores — Kitchen, Garden, Car.';
      projectsList.appendChild(empty);
      filterSummary.textContent = '';
      return;
    }

    let shown = 0;
    let outstanding = 0;

    for (const project of projects) {
      const all = tasksByProject.get(project.id) || [];
      const visible = all.filter(passesFilters);
      const due = visible.filter((t) => !taskState(t).done).length;
      shown += visible.length;
      outstanding += due;

      const isOpen = openProjectId === project.id;

      const heading = document.createElement('h3');
      heading.className = 'project-heading';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'project-toggle';
      toggle.setAttribute('aria-expanded', String(isOpen));

      const swatch = document.createElement('span');
      swatch.className = 'colour-swatch';
      swatch.style.backgroundColor = project.colour;
      swatch.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'project-text';
      const name = document.createElement('span');
      name.className = 'project-name';
      name.textContent = project.title;
      const meta = document.createElement('span');
      meta.className = 'project-meta';
      // The COUNT carries the meaning. The colour is decoration and is never
      // the only thing saying anything (1.4.1).
      meta.textContent = all.length === 0
        ? 'No tasks yet'
        : `${due} to do · ${visible.length}${visible.length === all.length ? '' : ` of ${all.length}`} shown`;
      text.append(name, meta);

      toggle.append(swatch, text);
      toggle.setAttribute('aria-label', `${project.title}, ${meta.textContent}`);
      heading.appendChild(toggle);
      projectsList.appendChild(heading);

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'project-body';
      bodyWrap.hidden = !isOpen;

      if (isOpen) {
        // One project's tasks in the DOM at a time. A hundred rows rendered
        // at once is the problem this screen exists to solve.
        if (visible.length === 0) {
          const none = document.createElement('p');
          none.className = 'field-hint';
          none.textContent = all.length === 0
            ? 'Nothing in this project yet.'
            : 'Nothing here matches the current filters.';
          bodyWrap.appendChild(none);
        } else {
          const list = document.createElement('ul');
          list.className = 'task-rows';
          for (const task of visible) list.appendChild(buildTaskRow(task, project));
          bodyWrap.appendChild(list);
        }
        if (projectSelectEl) populateProjectSelect(projectSelectEl, project.id);
        bodyWrap.appendChild(addTaskWrap);

        const projectActions = document.createElement('div');
        projectActions.className = 'card-actions';
        projectActions.appendChild(buildProjectDeleteButton(project));
        bodyWrap.appendChild(projectActions);
      }
      projectsList.appendChild(bodyWrap);

      toggle.addEventListener('click', () => {
        openProjectId = isOpen ? null : project.id;
        renderProjects();
        if (openProjectId) announce(`${project.title} open.`);
      }, { signal });
    }

    filterSummary.textContent = activeFilterCount() > 0
      ? `${shown} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} shown, ${outstanding} still to do.`
      : `${tasks.length} task${tasks.length === 1 ? '' : 's'}, ${outstanding} still to do.`;
  }

  /** One line per task. Everything else lives behind it. */
  function buildTaskRow(task, project) {
    const state = taskState(task);
    const item = document.createElement('li');
    item.className = 'task-row';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'task-row-open';

    const text = document.createElement('span');
    text.className = 'task-row-text';
    const title = document.createElement('span');
    title.className = 'task-row-title';
    title.textContent = task.title;
    const meta = document.createElement('span');
    meta.className = 'task-row-meta';
    const cadenceLabel = (CADENCES.find((c) => c.value === state.cadence) || {}).label || '';
    meta.textContent = [cadenceLabel, state.label].filter(Boolean).join(' · ');
    text.append(title, meta);

    const chevron = document.createElement('span');
    chevron.className = 'stock-row-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '›';

    open.append(text, chevron);
    open.setAttribute('aria-label', `${task.title}, ${meta.textContent}. Open details.`);
    open.addEventListener('click', () => openTaskSheet(task, project, open), { signal });

    const tick = document.createElement('button');
    tick.type = 'button';
    tick.className = 'btn check-toggle';
    paintTick(tick, task, state);
    tick.addEventListener('click', () => toggleTask(task, tick), { signal });

    item.append(open, tick);
    return item;
  }

  function paintTick(btn, task, state) {
    btn.textContent = state.done ? 'Done' : 'Mark done';
    btn.setAttribute('aria-pressed', String(state.done));
    btn.setAttribute('aria-label',
      `${task.title}${state.occurrence ? ` on ${state.occurrence.date}` : ''}, `
      + `${state.done ? 'done' : 'not done'}`);
    // The ONE case where a disabled control is honest: there is no
    // occurrence left to tick.
    btn.disabled = state.finished;
  }

  /**
   * Ticking a REPEATING task completes this occurrence, never the series.
   * A one-off has no occurrence, so for it the task IS the thing completed.
   */
  async function toggleTask(task, btn) {
    const before = taskState(task);
    if (before.finished) return;

    if (!task.is_repeatable) {
      const result = before.done ? await uncompleteTask(task.id) : await completeTask(task.id);
      if (!result.ok) {
        console.error('Failed to change a task:', result.error);
        showToast("Couldn't save that — try again.");
        return;
      }
      if (!before.done) showCompletionStamp(btn);
      await loadTasks();
      return;
    }

    if (!before.occurrence) return;
    const iso = before.occurrence.date;
    const key = `${task.id}|${iso}`;

    // Optimistic: the tap counts immediately and the write happens behind
    // it. The button is never disabled — this gets tapped in a doorway, and
    // a dead control reads as a crash.
    if (before.done) doneKeys.delete(key); else doneKeys.add(key);
    renderProjects();
    if (!before.done) showCompletionStamp(btn);

    const result = before.done ? await markNotDone(task.id, iso) : await markDone(task.id, iso);
    if (!result.ok) {
      // Roll back rather than lie about what was saved.
      if (before.done) doneKeys.add(key); else doneKeys.delete(key);
      renderProjects();
      console.error('Failed to change a completion:', result.error);
      showToast("Couldn't save that — try again.");
      return;
    }
    if (result.queued) {
      announce(`${task.title} marked done on this device. It will sync when you are back online.`);
    }
  }

  /** The full task — details, edit, delete — in the panel. */
  function openTaskSheet(task, project, returnFocusTo) {
    const state = taskState(task);
    openDetailSheet({
      title: task.title,
      subtitle: project ? project.title : '',
      returnFocusTo,
      build: (body) => {
        if (task.details) {
          const detail = document.createElement('p');
          detail.textContent = task.details;
          body.appendChild(detail);
        }

        const facts = document.createElement('div');
        facts.className = 'sheet-section';
        const addFact = (label, value) => {
          const row = document.createElement('div');
          row.className = 'sheet-fact';
          const dt = document.createElement('span');
          dt.className = 'sheet-fact-label';
          dt.textContent = label;
          const dd = document.createElement('span');
          dd.className = 'sheet-fact-value';
          dd.textContent = value;
          row.append(dt, dd);
          facts.appendChild(row);
        };
        addFact('Status', state.label);
        if (task.is_repeatable && task.recurrence_rule) {
          let described = task.recurrence_rule;
          try {
            described = describe(task.recurrence_rule);
          } catch {
            // An unreadable rule is shown raw rather than hidden — the user
            // needs to see something is wrong with it.
          }
          addFact('Repeats', described);
          const anchor = eventStartById.get(task.id);
          if (anchor) addFact('Started', anchor);
        } else {
          addFact('Repeats', 'One-off');
        }
        body.appendChild(facts);

        body.appendChild(buildTaskCard(task, project));
      }
    });
  }

  async function loadProjects() {
    const result = await listProjects();
    if (!result.ok) {
      console.error('Failed to load projects:', result.error);
      showToast("Couldn't load projects — check your connection and try again.");
      return;
    }
    projects = result.data;
    renderProjects();
  }

  function populateProjectSelect(selectEl, selectedId) {
    selectEl.replaceChildren();
    for (const project of projects) {
      const opt = document.createElement('option');
      opt.value = project.id;
      opt.textContent = project.title;
      if (selectedId && project.id === selectedId) opt.selected = true;
      selectEl.appendChild(opt);
    }
  }

  // ================= Tasks =================

  function buildAddTaskForm() {
    const form = document.createElement('form');
    form.setAttribute('aria-label', 'Add a task');

    const titleF = labeledInput('new-task-title', 'Title');
    titleF.input.required = true;

    const projectLabel = document.createElement('label');
    projectLabel.htmlFor = 'new-task-project';
    projectLabel.textContent = 'Project';
    projectSelectEl = document.createElement('select');
    projectSelectEl.id = 'new-task-project';
    projectSelectEl.required = true;

    const detailsLabel = document.createElement('label');
    detailsLabel.htmlFor = 'new-task-details';
    detailsLabel.textContent = 'Details (optional)';
    const detailsInput = document.createElement('textarea');
    detailsInput.id = 'new-task-details';

    const repeatRow = document.createElement('div');
    repeatRow.className = 'field field-checkbox';
    const repeatCheckbox = document.createElement('input');
    repeatCheckbox.type = 'checkbox';
    repeatCheckbox.id = 'new-task-repeat';
    const repeatLabel = document.createElement('label');
    repeatLabel.htmlFor = 'new-task-repeat';
    repeatLabel.textContent = 'This task repeats';
    repeatRow.append(repeatCheckbox, repeatLabel);

    const recurrence = createRecurrenceBuilder('new-task', signal);
    recurrence.fieldset.hidden = true;

    repeatCheckbox.addEventListener('change', () => {
      recurrence.fieldset.hidden = !repeatCheckbox.checked;
      recurrence.clearPreview();
    }, { signal });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary btn-block';
    submitBtn.textContent = 'Add task';

    form.append(
      fieldWrap(titleF.label, titleF.input),
      fieldWrap(projectLabel, projectSelectEl),
      fieldWrap(detailsLabel, detailsInput),
      repeatRow,
      recurrence.fieldset,
      submitBtn
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!titleF.input.value.trim()) {
        titleF.input.focus();
        return;
      }
      if (!projectSelectEl.value) {
        showToast('Add a project first, then pick one for this task.');
        return;
      }
      const isRepeatable = repeatCheckbox.checked;
      let rule = null;
      if (isRepeatable) {
        rule = recurrence.getConfirmedRule() || recurrence.buildRuleFromForm();
        if (!rule) return;
        if (!recurrence.getConfirmedRule()) {
          // Force the confirmation step — the user must see the real
          // upcoming dates before the save is finalised (principle 4).
          recurrence.showPreview(rule, recurrence.startInput.value);
          showToast('Review the upcoming dates below, then press Add task again to confirm.');
          return;
        }
      }

      submitBtn.disabled = true;
      const taskResult = await createTask({
        project_id: projectSelectEl.value,
        title: titleF.input.value.trim(),
        details: detailsInput.value.trim() || null,
        is_repeatable: isRepeatable,
        recurrence_rule: rule
      });
      if (!taskResult.ok) {
        submitBtn.disabled = false;
        console.error('Failed to create task:', taskResult.error);
        showToast("Couldn't create that task — check your connection and try again.");
        return;
      }

      if (isRepeatable && !taskResult.queued) {
        const eventResult = await upsertTaskEvent({
          taskId: taskResult.data.id,
          title: taskResult.data.title,
          isRepeatable: true,
          recurrenceRule: rule,
          startDate: recurrence.startInput.value
        });
        if (!eventResult.ok) {
          console.error('Failed to write calendar event:', eventResult.error);
          showToast('Task saved, but the calendar entry failed — try reopening this task.');
        }
      }

      submitBtn.disabled = false;
      form.reset();
      recurrence.reset();
      recurrence.fieldset.hidden = true;
      announce(`${taskResult.data.title} added${taskResult.queued ? ', saved offline' : ''}`);
      if (taskResult.queued) {
        showToast(isRepeatable
          ? "Saved offline — this will sync when you're back online. Its calendar entry needs the task to sync first; reopen and save it again once online to add it to the calendar."
          : "Saved offline — this will sync when you're back online.");
      }
      await loadTasks();
    }, { signal });

    return { form };
  }

  function buildTaskEditForm(task, onDone) {
    const form = document.createElement('form');
    form.setAttribute('aria-label', `Edit ${task.title}`);
    const idPrefix = `edit-task-${task.id}`;

    const titleF = labeledInput(`${idPrefix}-title`, 'Title');
    titleF.input.required = true;
    titleF.input.value = task.title;

    const projectLabel = document.createElement('label');
    projectLabel.htmlFor = `${idPrefix}-project`;
    projectLabel.textContent = 'Project';
    const projectSelect = document.createElement('select');
    projectSelect.id = `${idPrefix}-project`;
    projectSelect.required = true;
    populateProjectSelect(projectSelect, task.project_id);

    const detailsLabel = document.createElement('label');
    detailsLabel.htmlFor = `${idPrefix}-details`;
    detailsLabel.textContent = 'Details (optional)';
    const detailsInput = document.createElement('textarea');
    detailsInput.id = `${idPrefix}-details`;
    detailsInput.value = task.details || '';

    const repeatRow = document.createElement('div');
    repeatRow.className = 'field field-checkbox';
    const repeatCheckbox = document.createElement('input');
    repeatCheckbox.type = 'checkbox';
    repeatCheckbox.id = `${idPrefix}-repeat`;
    repeatCheckbox.checked = !!task.is_repeatable;
    const repeatLabel = document.createElement('label');
    repeatLabel.htmlFor = repeatCheckbox.id;
    repeatLabel.textContent = 'This task repeats';
    repeatRow.append(repeatCheckbox, repeatLabel);

    const recurrence = createRecurrenceBuilder(idPrefix, signal);
    recurrence.fieldset.hidden = !task.is_repeatable;

    repeatCheckbox.addEventListener('change', () => {
      recurrence.fieldset.hidden = !repeatCheckbox.checked;
      recurrence.clearPreview();
    }, { signal });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save changes';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => onDone(false), { signal });

    const actionsRow = document.createElement('div');
    actionsRow.className = 'card-actions';
    actionsRow.append(saveBtn, cancelBtn);

    form.append(
      fieldWrap(titleF.label, titleF.input),
      fieldWrap(projectLabel, projectSelect),
      fieldWrap(detailsLabel, detailsInput),
      repeatRow,
      recurrence.fieldset,
      actionsRow
    );

    // Prefill the recurrence builder. chore_tasks has no start_date column
    // (see data/calendar.js) — the anchor date lives only on the task's
    // calendar_events row, so it's fetched here for a repeatable task.
    (async () => {
      if (!task.is_repeatable || !task.recurrence_rule) return;
      let startDate = todayIso();
      const eventResult = await findEventByTaskId(task.id);
      if (eventResult.ok && eventResult.data) startDate = eventResult.data.start_date;
      recurrence.setInitial({ recurrenceRule: task.recurrence_rule, startDate });
    })();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!titleF.input.value.trim()) {
        titleF.input.focus();
        return;
      }
      const isRepeatable = repeatCheckbox.checked;
      let rule = null;
      if (isRepeatable) {
        rule = recurrence.getConfirmedRule() || recurrence.buildRuleFromForm();
        if (!rule) return;
        // If this rule hasn't been confirmed via a preview in this
        // session, force one before saving (principle 4 applies to
        // recurrence changes on edit exactly as it does on create).
        if (!recurrence.getConfirmedRule()) {
          recurrence.showPreview(rule, recurrence.startInput.value);
          showToast('Review the upcoming dates below, then press Save changes again to confirm.');
          return;
        }
      }

      saveBtn.disabled = true;
      const result = await updateTask(task.id, {
        title: titleF.input.value.trim(),
        details: detailsInput.value.trim() || null,
        is_repeatable: isRepeatable,
        recurrence_rule: rule
      });
      if (!result.ok) {
        saveBtn.disabled = false;
        console.error('Failed to update task:', result.error);
        showToast("Couldn't save those changes — check your connection and try again.");
        return;
      }

      const eventResult = await upsertTaskEvent({
        taskId: task.id,
        title: titleF.input.value.trim(),
        isRepeatable,
        recurrenceRule: rule,
        startDate: recurrence.startInput.value
      });
      if (!eventResult.ok) {
        console.error('Failed to update calendar event:', eventResult.error);
        showToast('Task saved, but the calendar entry failed to update — try saving again.');
      }

      saveBtn.disabled = false;
      announce(`${titleF.input.value.trim()} updated${result.queued ? ', saved offline' : ''}`);
      if (result.queued) {
        showToast("Saved offline — this will sync when you're back online.");
      }
      onDone(true);
    }, { signal });

    return form;
  }

  function buildTaskCard(task, project) {
    const { article, body, actions } = createCard({ title: task.title, headingLevel: 3, className: 'task-card' });
    article.dataset.taskId = task.id;

    if (project) {
      const projLine = document.createElement('p');
      const swatch = document.createElement('span');
      swatch.className = 'colour-swatch colour-swatch-inline';
      swatch.style.backgroundColor = project.colour;
      swatch.setAttribute('aria-hidden', 'true');
      projLine.append(swatch, document.createTextNode(` ${project.title}`));
      body.appendChild(projLine);
    }

    if (task.details) {
      const details = document.createElement('p');
      details.textContent = task.details;
      body.appendChild(details);
    }

    if (task.is_repeatable && task.recurrence_rule) {
      const repeatInfo = document.createElement('p');
      repeatInfo.className = 'field-hint';
      try {
        repeatInfo.textContent = `Repeats: ${describe(task.recurrence_rule)}`;
      } catch {
        repeatInfo.textContent = 'Repeats';
      }
      body.appendChild(repeatInfo);
    }

    const statusChip = document.createElement('span');
    statusChip.className = 'chip';
    statusChip.textContent = task.status === 'complete' ? 'Complete' : 'Pending';
    body.appendChild(statusChip);

    const editContainer = document.createElement('div');
    body.appendChild(editContainer);

    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'btn btn-done';
    const isComplete = task.status === 'complete';
    completeBtn.setAttribute('aria-pressed', String(isComplete));
    completeBtn.textContent = isComplete ? `Marked complete: ${task.title}` : `Mark ${task.title} complete`;
    completeBtn.addEventListener('click', async () => {
      completeBtn.disabled = true;
      const nowComplete = completeBtn.getAttribute('aria-pressed') !== 'true';
      const result = nowComplete ? await completeTask(task.id) : await uncompleteTask(task.id);
      completeBtn.disabled = false;
      if (!result.ok) {
        console.error('Failed to update task status:', result.error);
        showToast("Couldn't save — you're offline, this will sync later.");
        return;
      }
      completeBtn.setAttribute('aria-pressed', String(nowComplete));
      completeBtn.textContent = nowComplete ? `Marked complete: ${task.title}` : `Mark ${task.title} complete`;
      statusChip.textContent = nowComplete ? 'Complete' : 'Pending';
      if (nowComplete) {
        showCompletionStamp(article, { label: 'Complete' });
      } else {
        hideCompletionStamp(article);
      }
      announce(`${task.title} marked ${nowComplete ? 'complete' : 'pending'}`);
      if (result.queued) showToast("Saved offline — this will sync when you're back online.");
    }, { signal });
    actions.appendChild(completeBtn);
    if (isComplete) showCompletionStamp(article, { label: 'Complete' });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn';
    editBtn.setAttribute('aria-expanded', 'false');
    editBtn.textContent = `Edit ${task.title}`;
    editBtn.addEventListener('click', () => {
      const editing = editBtn.getAttribute('aria-expanded') === 'true';
      if (editing) {
        editContainer.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${task.title}`;
        return;
      }
      const editForm = buildTaskEditForm(task, async (saved) => {
        editContainer.replaceChildren();
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.textContent = `Edit ${task.title}`;
        if (saved) {
          await loadTasks();
        }
      });
      editContainer.replaceChildren(editForm);
      editBtn.setAttribute('aria-expanded', 'true');
      editBtn.textContent = `Close edit form for ${task.title}`;
    }, { signal });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = `Delete ${task.title}`;
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Delete ${task.title}?`,
        message: 'This can\u2019t be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      });
      if (!confirmed) return;
      const result = await deleteTask(task.id);
      if (!result.ok) {
        console.error('Failed to delete task:', result.error);
        showToast("Couldn't delete that task — check your connection and try again.");
        return;
      }
      if (task.is_repeatable) {
        const eventResult = await removeTaskEvent(task.id);
        if (!eventResult.ok) {
          console.error('Failed to remove calendar event:', eventResult.error);
        }
      }
      announce(`${task.title} deleted`);
      await loadTasks();
    }, { signal });
    actions.appendChild(deleteBtn);

    return article;
  }

  async function loadTasks() {
    const result = await listTasks();
    if (!result.ok) {
      console.error('Failed to load tasks:', result.error);
      showToast("Couldn't load tasks — check your connection and try again.");
      return;
    }
    tasks = result.data;

    // The recurrence ANCHOR lives only on calendar_events.start_date — the
    // tracked debt from Phase 4 — so deciding what is due needs the join.
    // Fetched ONCE for the whole list: a request per row is what makes a
    // hundred-task screen unusable on mobile data.
    const rangeStart = addMonthsIso(todayIso(), -3);
    const rangeEnd = addMonthsIso(todayIso(), 3);
    const eventResult = await listEvents(rangeStart, rangeEnd, { eventTypes: ['chore'] });
    eventStartById = new Map();
    if (eventResult.ok) {
      for (const event of eventResult.data) {
        if (event.source_id) eventStartById.set(event.source_id, event.start_date);
      }
    } else {
      console.error('Failed to load chore anchors:', eventResult.error);
    }

    const doneResult = await listBetween(rangeStart, rangeEnd);
    if (doneResult.ok) {
      doneKeys = completionKeys(doneResult.data);
    } else {
      // Without completions the screen cannot know what is done, so it must
      // not pretend: everything reads as outstanding rather than as done.
      // Wrong in the safe direction — a chore done twice beats one missed.
      console.error('Failed to load completions:', doneResult.error);
      doneKeys = new Set();
    }

    renderProjects();
  }

  (async () => {
    await loadProjects();
    populateProjectSelect(projectSelectEl);
    await loadTasks();
  })();

  return () => controller.abort();
}
