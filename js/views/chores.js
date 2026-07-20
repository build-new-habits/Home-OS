// js/views/chores.js — 20 Jul 2026 v1
// Replaces the Phase 2 stub. Projects, tasks (with the 3-month recurrence
// confirmation — principle 4), and a calendar (principles 1, 2, 3, 9, 10).
//
// Known gap (flagged in the Phase 4 handoff, not hidden): task EDIT
// (changing an existing task's title/details/recurrence) is not
// implemented this pass — only create, complete/uncomplete, and delete.
// The brief calls for an edit form; this needs a small follow-up addition
// before the phase is fully cleared.
import {
  listProjects, createProject, countTasksInProject, deleteProject,
  listTasks, createTask, completeTask, uncompleteTask, deleteTask
} from '../data/chores.js';
import { upsertTaskEvent, removeTaskEvent, listEvents } from '../data/calendar.js';
import { expand, describe } from '../lib/rrule.js';
import { createCard } from '../components/card.js';
import { showCompletionStamp, hideCompletionStamp } from '../components/completionStamp.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';

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

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;

  let projects = [];
  let projectSelectEl;

  const h1 = document.createElement('h1');
  h1.textContent = 'Chores';
  h1.tabIndex = -1;
  mountEl.appendChild(h1);
  h1.focus();

  // ---------------- Projects ----------------
  const projectsSection = document.createElement('section');
  const projectsHeading = document.createElement('h2');
  projectsHeading.textContent = 'Projects';
  const projectsList = document.createElement('div');
  projectsList.className = 'card-list';
  projectsSection.append(projectsHeading, projectsList);

  const { form: addProjectForm } = buildAddProjectForm();
  projectsSection.appendChild(addProjectForm);

  // ---------------- Tasks ----------------
  const tasksSection = document.createElement('section');
  const tasksHeading = document.createElement('h2');
  tasksHeading.textContent = 'Tasks';
  const tasksList = document.createElement('div');
  tasksList.className = 'card-list';
  tasksSection.append(tasksHeading, tasksList);

  const { form: addTaskForm } = buildAddTaskForm();
  tasksSection.appendChild(addTaskForm);

  // ---------------- Calendar ----------------
  const calendarSection = document.createElement('section');
  const calendarHeading = document.createElement('h2');
  calendarHeading.textContent = 'Calendar';
  const calendar = buildCalendar();
  calendarSection.append(calendarHeading, calendar.el);

  mountEl.append(projectsSection, tasksSection, calendarSection);

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
      populateProjectSelect();
    }, { signal });

    return { form };
  }

  function buildProjectCard(project) {
    const { article, body, actions } = createCard({ title: project.title, headingLevel: 3, className: 'project-card' });
    article.dataset.projectId = project.id;

    const swatchRow = document.createElement('p');
    swatchRow.className = 'colour-row';
    const swatch = document.createElement('span');
    swatch.className = 'colour-swatch';
    swatch.style.backgroundColor = project.colour;
    swatch.setAttribute('aria-hidden', 'true');
    const swatchLabel = document.createElement('span');
    swatchLabel.textContent = `Colour: ${project.colour}`;
    swatchRow.append(swatch, swatchLabel);
    body.appendChild(swatchRow);

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
      await loadProjects();
      populateProjectSelect();
    }, { signal });

    actions.appendChild(deleteBtn);
    return article;
  }

  async function loadProjects() {
    const result = await listProjects();
    if (!result.ok) {
      console.error('Failed to load projects:', result.error);
      showToast("Couldn't load projects — check your connection and try again.");
      return;
    }
    projects = result.data;
    projectsList.replaceChildren();
    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects yet — add one below.';
      projectsList.appendChild(empty);
      return;
    }
    for (const project of projects) {
      projectsList.appendChild(buildProjectCard(project));
    }
  }

  function populateProjectSelect() {
    projectSelectEl.replaceChildren();
    for (const project of projects) {
      const opt = document.createElement('option');
      opt.value = project.id;
      opt.textContent = project.title;
      projectSelectEl.appendChild(opt);
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

    // ---- Recurrence builder (hidden until "repeats" is checked) ----
    const recurrenceFieldset = document.createElement('fieldset');
    recurrenceFieldset.hidden = true;
    const recurrenceLegend = document.createElement('legend');
    recurrenceLegend.textContent = 'Repeats';
    recurrenceFieldset.appendChild(recurrenceLegend);

    const startF = labeledInput('new-task-start', 'Starts on', 'date');
    startF.input.value = todayIso();
    startF.input.required = true;
    recurrenceFieldset.appendChild(fieldWrap(startF.label, startF.input));

    const freqLabel = document.createElement('label');
    freqLabel.htmlFor = 'new-task-freq';
    freqLabel.textContent = 'Frequency';
    const freqSelect = document.createElement('select');
    freqSelect.id = 'new-task-freq';
    for (const [value, text] of [['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']]) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      freqSelect.appendChild(opt);
    }
    recurrenceFieldset.appendChild(fieldWrap(freqLabel, freqSelect));

    const intervalF = labeledInput('new-task-interval', 'Every (number of days/weeks/months)', 'number');
    intervalF.input.min = '1';
    intervalF.input.value = '1';
    intervalF.input.required = true;
    recurrenceFieldset.appendChild(fieldWrap(intervalF.label, intervalF.input));

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
      cb.id = `new-task-byday-${code}`;
      cb.value = code;
      const lbl = document.createElement('label');
      lbl.htmlFor = cb.id;
      lbl.textContent = label;
      row.append(cb, lbl);
      weekdayFieldset.appendChild(row);
      weekdayCheckboxes.set(code, cb);
    }
    recurrenceFieldset.appendChild(weekdayFieldset);

    const monthDayLabel = document.createElement('label');
    monthDayLabel.htmlFor = 'new-task-monthday';
    monthDayLabel.textContent = 'Day of month';
    const monthDaySelect = document.createElement('select');
    monthDaySelect.id = 'new-task-monthday';
    for (let d = 1; d <= 28; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = String(d);
      monthDaySelect.appendChild(opt);
    }
    const monthDayField = fieldWrap(monthDayLabel, monthDaySelect);
    recurrenceFieldset.appendChild(monthDayField);

    const monthDayHint = document.createElement('p');
    monthDayHint.className = 'field-hint';
    monthDayHint.textContent = 'Days 29–31 are not supported yet, to avoid short-month edge cases.';
    recurrenceFieldset.appendChild(monthDayHint);

    function updateFreqVisibility() {
      const freq = freqSelect.value;
      weekdayFieldset.hidden = freq !== 'WEEKLY';
      monthDayField.hidden = freq !== 'MONTHLY';
      monthDayHint.hidden = freq !== 'MONTHLY';
    }
    freqSelect.addEventListener('change', () => { updateFreqVisibility(); clearPreview(); }, { signal });
    updateFreqVisibility();

    // ---- Preview / 3-month confirmation (principle 4 — the trust gate) ----
    const previewRegion = document.createElement('div');
    previewRegion.className = 'recurrence-preview';
    previewRegion.setAttribute('aria-live', 'polite');

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn';
    previewBtn.textContent = 'Show upcoming dates';
    recurrenceFieldset.appendChild(previewBtn);
    recurrenceFieldset.appendChild(previewRegion);

    let confirmedRule = null;

    function clearPreview() {
      previewRegion.replaceChildren();
      confirmedRule = null;
    }

    function buildRuleFromForm() {
      const freq = freqSelect.value;
      const interval = Number(intervalF.input.value) || 1;
      if (freq === 'WEEKLY') {
        const days = [...weekdayCheckboxes.entries()].filter(([, cb]) => cb.checked).map(([code]) => code);
        if (days.length === 0) {
          showToast('Pick at least one day of the week.');
          return null;
        }
        return `FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${days.join(',')}`;
      }
      if (freq === 'MONTHLY') {
        return `FREQ=MONTHLY;INTERVAL=${interval};BYMONTHDAY=${monthDaySelect.value}`;
      }
      return `FREQ=DAILY;INTERVAL=${interval}`;
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
      count.textContent = `${dates.length} occurrence${dates.length === 1 ? '' : 's'} over the next 3 months:`;
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
      announce(`Showing ${dates.length} upcoming dates`);
    }

    previewBtn.addEventListener('click', () => {
      const rule = buildRuleFromForm();
      if (!rule) return;
      showPreview(rule, startF.input.value);
    }, { signal });

    repeatCheckbox.addEventListener('change', () => {
      recurrenceFieldset.hidden = !repeatCheckbox.checked;
      clearPreview();
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
      recurrenceFieldset,
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
        rule = confirmedRule || buildRuleFromForm();
        if (!rule) return;
        if (!confirmedRule) {
          // Force the confirmation step — the user must see the real
          // upcoming dates before the save is finalised (principle 4).
          showPreview(rule, startF.input.value);
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
          startDate: startF.input.value
        });
        if (!eventResult.ok) {
          console.error('Failed to write calendar event:', eventResult.error);
          showToast('Task saved, but the calendar entry failed — try reopening this task.');
        }
      }

      submitBtn.disabled = false;
      form.reset();
      clearPreview();
      recurrenceFieldset.hidden = true;
      updateFreqVisibility();
      announce(`${taskResult.data.title} added${taskResult.queued ? ', saved offline' : ''}`);
      if (taskResult.queued) {
        showToast(isRepeatable
          ? "Saved offline — this will sync when you're back online. Its calendar entry needs the task to sync first; reopen and save it again once online to add it to the calendar."
          : "Saved offline — this will sync when you're back online.");
      }
      await Promise.all([loadTasks(), loadCalendar()]);
    }, { signal });

    return { form };
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
      await Promise.all([loadTasks(), loadCalendar()]);
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
    const projectsById = new Map(projects.map((p) => [p.id, p]));
    tasksList.replaceChildren();
    if (result.data.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No tasks yet — add one below.';
      tasksList.appendChild(empty);
      return;
    }
    for (const task of result.data) {
      tasksList.appendChild(buildTaskCard(task, projectsById.get(task.project_id)));
    }
  }

  // ================= Calendar =================

  function buildCalendar() {
    const el = document.createElement('div');
    el.className = 'calendar';

    let viewDate = new Date();
    viewDate = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1));
    let allEvents = [];

    const nav = document.createElement('div');
    nav.className = 'calendar-nav';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn';
    prevBtn.textContent = 'Previous month';
    const monthLabel = document.createElement('p');
    monthLabel.className = 'calendar-month-label';
    monthLabel.setAttribute('aria-live', 'polite');
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn';
    nextBtn.textContent = 'Next month';
    nav.append(prevBtn, monthLabel, nextBtn);

    const grid = document.createElement('table');
    grid.className = 'calendar-grid';
    const caption = document.createElement('caption');
    caption.className = 'sr-only';
    caption.textContent = 'Chores calendar';
    grid.appendChild(caption);

    el.append(nav, grid);

    function monthRange(date) {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      const toIso = (d) => d.toISOString().slice(0, 10);
      return { startIso: toIso(start), endIso: toIso(end) };
    }

    function renderGrid() {
      const { startIso, endIso } = monthRange(viewDate);
      monthLabel.textContent = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      const occurrencesByDate = new Map();
      for (const event of allEvents) {
        let dates = [];
        try {
          dates = event.recurrence_rule
            ? expand(event.recurrence_rule, event.start_date, startIso, endIso)
            : (event.start_date >= startIso && event.start_date <= endIso ? [event.start_date] : []);
        } catch (err) {
          console.error('Failed to expand calendar event:', event, err);
          continue;
        }
        for (const iso of dates) {
          if (!occurrencesByDate.has(iso)) occurrencesByDate.set(iso, []);
          occurrencesByDate.get(iso).push(event);
        }
      }

      grid.replaceChildren(caption);
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = day;
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      grid.appendChild(thead);

      const tbody = document.createElement('tbody');
      const firstOfMonth = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1));
      const firstWeekday = firstOfMonth.getUTCDay();
      const leadingBlank = firstWeekday === 0 ? 6 : firstWeekday - 1;
      const daysInMonth = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 0)).getUTCDate();
      const todayStr = todayIso();
      const monthPrefix = startIso.slice(0, 8);

      let cellsUsed = 0;
      let row = document.createElement('tr');
      for (let i = 0; i < leadingBlank; i++) {
        row.appendChild(document.createElement('td'));
        cellsUsed++;
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${monthPrefix}${String(day).padStart(2, '0')}`;
        const cell = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calendar-day';
        const events = occurrencesByDate.get(iso) || [];
        const isToday = iso === todayStr;
        if (isToday) btn.setAttribute('aria-current', 'date');
        const dayLabel = document.createElement('span');
        dayLabel.textContent = String(day);
        btn.appendChild(dayLabel);
        if (events.length > 0) {
          const marker = document.createElement('span');
          marker.className = 'calendar-day-marker';
          marker.textContent = `${events.length} chore${events.length === 1 ? '' : 's'}`;
          btn.appendChild(marker);
        }
        const nameBits = [String(day)];
        if (isToday) nameBits.push('today');
        if (events.length > 0) nameBits.push(`${events.length} chore${events.length === 1 ? '' : 's'}: ${events.map((e) => e.title).join(', ')}`);
        btn.setAttribute('aria-label', nameBits.join(', '));
        cell.appendChild(btn);
        row.appendChild(cell);
        cellsUsed++;
        if (cellsUsed % 7 === 0) {
          tbody.appendChild(row);
          row = document.createElement('tr');
        }
      }
      if (row.childElementCount > 0) {
        while (row.childElementCount < 7) row.appendChild(document.createElement('td'));
        tbody.appendChild(row);
      }
      grid.appendChild(tbody);
    }

    prevBtn.addEventListener('click', () => {
      viewDate = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() - 1, 1));
      renderGrid();
    }, { signal });
    nextBtn.addEventListener('click', () => {
      viewDate = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 1));
      renderGrid();
    }, { signal });

    return {
      el,
      setEvents(events) {
        allEvents = events;
        renderGrid();
      }
    };
  }

  async function loadCalendar() {
    const today = todayIso();
    const rangeEnd = addMonthsIso(today, 3);
    const result = await listEvents(today, rangeEnd);
    if (!result.ok) {
      console.error('Failed to load calendar events:', result.error);
      showToast("Couldn't load the calendar — check your connection and try again.");
      return;
    }
    calendar.setEvents(result.data);
  }

  (async () => {
    await loadProjects();
    populateProjectSelect();
    await loadTasks();
    await loadCalendar();
  })();

  return () => controller.abort();
}
