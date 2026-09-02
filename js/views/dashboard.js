// js/views/dashboard.js — 01 Sep 2026 v4
// Phase 9: what is actually happening today.
//
// v1 was a link list. v2 added one-tap water. This is the screen the whole
// app was building towards — every other phase now has data worth pulling
// forward, so it finally can.
//
// ---- Today, not everything ----
// A dashboard that shows all of it is a second navigation menu. This shows
// only what is true TODAY: chores due, tonight's meal, what is worth using
// up, what is still to buy. If a section has nothing to say it disappears
// rather than reporting its own emptiness — six cards saying "nothing" is
// worse than no cards.
//
// ---- Every section fails alone ----
// One failed query must not blank the page. Each section loads
// independently and a failure leaves that section quiet, logged, and out of
// the way of the rest.
//
// ---- Chores due today needs a join ----
// The recurrence anchor lives only on calendar_events.start_date (the
// Phase 4 debt), so "due today" is: expand each chore event's rule over
// today, then check chore_task_completions for that date. Both fetched
// once, not per chore.

import { DASHBOARD_LINKS } from '../navConfig.js';
import { formatDateDisplay, todayIso } from '../lib/dates.js';
import { totalForDate, logWater, GLASS_ML, DAILY_TARGET_ML } from '../data/water.js';
import { listEvents } from '../data/calendar.js';
import { listTasks, listProjects } from '../data/chores.js';
import { listBetween, completionKeys, isDone, markDone } from '../data/completions.js';
import { expand } from '../lib/rrule.js';
import { listPlan, servesFor, DAYS } from '../data/mealPlan.js';
import { listStock, useSoon, describeFreshness, freshness } from '../data/pantry.js';
import { listItems as listShoppingItems } from '../data/shopping.js';
import { listCleared, getLogsForDate } from '../data/exercises.js';
import { formatMl } from '../lib/units.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { readPlanProgress } from './planWeek.js';
import { PRIMARY_ACTION } from '../navConfig.js';

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

/** Monday-first index of today, matching mealPlan.DAYS. */
function todayDayValue() {
  const day = new Date().getDay(); // 0 = Sunday
  return DAYS[day === 0 ? 6 : day - 1].value;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const today = todayIso();
  let waterTotalMl = 0;
  let waterPartial = false;

  mountEl.appendChild(el('h1', { text: 'Today' }));
  mountEl.appendChild(el('p', { class: 'field-hint', text: formatDateDisplay(today) }));

  // ---- Phase 24: one primary action ----
  // Phase 9 flagged that this screen was becoming a wall of tiles. The
  // answer is not fewer tiles, it is one obvious thing to do at the top —
  // a task, not a menu. Everything below stays exactly where it was.
  {
    const resumed = readPlanProgress();
    const primary = el('a', {
      class: 'btn btn-primary btn-large dashboard-primary',
      href: `#/${PRIMARY_ACTION.path}`,
      text: resumed ? PRIMARY_ACTION.resumeLabel : PRIMARY_ACTION.label
    });
    mountEl.appendChild(primary);
    if (resumed) {
      mountEl.appendChild(el('p', {
        class: 'field-hint',
        text: `You were on step ${resumed.stepIndex + 1} of 4. Nothing was lost.`
      }));
    }
  }

  /**
   * A section that starts hidden and only appears once it has something to
   * say. Nothing announces its own emptiness.
   */
  function makeSection(title) {
    const section = el('section', { class: 'card today-card' });
    section.hidden = true;
    section.appendChild(el('h2', { class: 'card-title', text: title }));
    const body = el('div');
    section.appendChild(body);
    mountEl.appendChild(section);
    return {
      section,
      body,
      show() { section.hidden = false; },
      clear() { body.replaceChildren(); }
    };
  }

  // ======================= Water (always shown) =======================
  // The one section that stays even when empty: it is a control, not a
  // report, and it is the most frequent action in the app.
  const water = el('section', { class: 'card today-card' });
  water.appendChild(el('h2', { class: 'card-title', text: 'Water' }));
  const waterTotal = el('p', { class: 'water-total', role: 'status' });
  waterTotal.setAttribute('aria-live', 'polite');
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary btn-block',
    text: `Add a glass (${formatMl(GLASS_ML)})`
  });
  const waterError = el('p', { class: 'field-error', role: 'alert' });
  waterError.hidden = true;
  water.append(waterTotal, addBtn, waterError,
    el('a', { class: 'card-link', href: '#/water', text: 'See the week' }));
  mountEl.appendChild(water);

  function paintWater() {
    // A fact, never a shortfall to feel bad about (principle 1).
    const base = `${formatMl(waterTotalMl)} today, of ${formatMl(DAILY_TARGET_ML)}`;
    waterTotal.textContent = waterPartial
      ? `${base}. Some of this is saved on this device and will sync when you are back online.`
      : `${base}.`;
    addBtn.setAttribute('aria-label',
      `Add a glass of water, ${formatMl(GLASS_ML)}. ${formatMl(waterTotalMl)} logged today.`);
  }

  addBtn.addEventListener('click', () => {
    waterError.hidden = true;
    waterTotalMl += GLASS_ML;
    paintWater();
    announce(`Glass logged. ${formatMl(waterTotalMl)} today.`);
    logWater(GLASS_ML, today)
      .then((result) => {
        if (destroyed) return;
        if (!result.ok) {
          // Neither stored nor queued — the only case where the count lies.
          waterTotalMl -= GLASS_ML;
          paintWater();
          waterError.textContent =
            `That ${formatMl(GLASS_ML)} could not be saved and has not been counted. Tap again to retry.`;
          waterError.hidden = false;
          return;
        }
        if (result.queued) waterPartial = true;
        paintWater();
      })
      .catch((err) => {
        if (destroyed) return;
        console.error('Unexpected error logging water:', err);
        waterTotalMl -= GLASS_ML;
        paintWater();
        waterError.textContent =
          `That ${formatMl(GLASS_ML)} could not be saved and has not been counted. Tap again to retry.`;
        waterError.hidden = false;
      });
  }, { signal });

  paintWater();

  // ======================= The other sections =========================
  const chores = makeSection('Chores due today');
  const exercises = makeSection('Exercises');
  const meal = makeSection('Eating today');
  const useUp = makeSection('Worth using up');
  const shopping = makeSection('Shopping');

  // ---------------------------- Chores --------------------------------

  async function loadChores() {
    const [eventResult, taskResult, projectResult, doneResult] = await Promise.all([
      listEvents(today, today, { eventTypes: ['chore'] }),
      listTasks(),
      listProjects(),
      listBetween(today, today)
    ]);
    if (destroyed) return;
    if (!eventResult.ok || !taskResult.ok) {
      console.error('Could not work out what is due:', eventResult.error || taskResult.error);
      return;
    }

    const tasks = new Map((taskResult.data || []).map((task) => [task.id, task]));
    const projects = new Map((projectResult.ok ? projectResult.data : []).map((p) => [p.id, p]));
    const done = doneResult.ok ? completionKeys(doneResult.data) : new Set();
    if (!doneResult.ok) {
      // Without completions this cannot know what is finished. Everything
      // reads as outstanding — wrong in the safe direction, since a chore
      // done twice beats one missed.
      console.error('Could not read completions:', doneResult.error);
    }

    const due = [];
    for (const event of eventResult.data || []) {
      if (!event.source_id) continue;
      const task = tasks.get(event.source_id);
      if (!task) continue;
      let hits = false;
      try {
        hits = event.recurrence_rule
          ? expand(event.recurrence_rule, event.start_date, today, today).length > 0
          : event.start_date === today;
      } catch (err) {
        // One unreadable rule must not take the whole dashboard down.
        console.error('Skipping an unreadable rule:', event.recurrence_rule, err);
        continue;
      }
      if (!hits) continue;
      if (isDone(done, task.id, today)) continue;
      due.push({ task, project: projects.get(task.project_id) });
    }

    chores.clear();
    if (due.length === 0) return;   // nothing to say, so nothing appears
    chores.show();

    const list = el('ul', { class: 'today-list' });
    for (const { task, project } of due) {
      const row = el('li', { class: 'today-row' });
      const text = el('span', { class: 'today-row-text' });
      text.appendChild(el('span', { class: 'today-row-title', text: task.title }));
      if (project) text.appendChild(el('span', { class: 'today-row-meta', text: project.title }));
      row.appendChild(text);

      const tick = el('button', { type: 'button', class: 'btn check-toggle', text: 'Mark done' });
      tick.setAttribute('aria-pressed', 'false');
      tick.setAttribute('aria-label', `${task.title}, due today, not done`);
      tick.addEventListener('click', async () => {
        // Optimistic, and never disabled: this is tapped in a doorway.
        tick.textContent = 'Done';
        tick.setAttribute('aria-pressed', 'true');
        tick.setAttribute('aria-label', `${task.title}, done today`);
        const result = await markDone(task.id, today);
        if (destroyed) return;
        if (!result.ok) {
          tick.textContent = 'Mark done';
          tick.setAttribute('aria-pressed', 'false');
          console.error('Failed to mark a chore done:', result.error);
          showToast("That didn't save — tap it again.");
          return;
        }
        announce(result.queued
          ? `${task.title} marked done on this device. It will sync when you are back online.`
          : `${task.title} marked done.`);
      }, { signal });
      row.appendChild(tick);
      list.appendChild(row);
    }
    chores.body.appendChild(list);
  }

  // --------------------------- Exercises -------------------------------

  async function loadExercises() {
    const [all, logs] = await Promise.all([listCleared(), getLogsForDate(today)]);
    if (destroyed || !all.ok) return;
    const cleared = all.data || [];
    if (cleared.length === 0) return;

    const doneIds = logs.ok
      ? new Set((logs.data || []).filter((log) => log.completed).map((log) => log.exercise_id))
      : new Set();
    const outstanding = cleared.length - doneIds.size;
    if (outstanding === 0) return;   // all done: say nothing rather than well done

    exercises.clear();
    exercises.show();
    exercises.body.appendChild(el('p', {
      text: `${doneIds.size} of ${cleared.length} done today.`
    }));
    exercises.body.appendChild(el('a', {
      class: 'card-link', href: '#/exercises', text: 'Open exercises'
    }));
  }

  // ------------------------ Eating today --------------------------------

  async function loadMeal() {
    const result = await listPlan();
    if (destroyed || !result.ok) return;
    const day = todayDayValue();
    const entries = (result.data || []).filter((entry) => entry.day_of_week === day);
    if (entries.length === 0) return;

    meal.clear();
    meal.show();
    const list = el('ul', { class: 'today-list' });
    // Planner order, not database order: breakfast before dinner.
    const slotOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
    entries.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
    for (const entry of entries) {
      const name = (entry.meals && entry.meals.name) || 'Planned';
      const row = el('li', { class: 'today-row' });
      const text = el('span', { class: 'today-row-text' });
      text.appendChild(el('span', { class: 'today-row-title', text: name }));
      text.appendChild(el('span', {
        class: 'today-row-meta',
        text: `${entry.slot} · serves ${servesFor(entry)}`
      }));
      row.appendChild(text);
      list.appendChild(row);
    }
    meal.body.appendChild(list);
    meal.body.appendChild(el('a', { class: 'card-link', href: '#/meal-plan', text: 'Open the plan' }));
  }

  // ------------------------ Worth using up ------------------------------

  async function loadUseUp() {
    const result = await listStock();
    if (destroyed || !result.ok) return;
    const soon = useSoon(result.data || [], today);
    if (soon.length === 0) return;

    useUp.clear();
    useUp.show();
    const list = el('ul', { class: 'today-list' });
    // Three at most. A dashboard that lists twelve things becomes a second
    // pantry screen, and the point is the nudge.
    for (const { row, freshness: fresh } of soon.slice(0, 3)) {
      const item = el('li', { class: 'today-row' });
      const text = el('span', { class: 'today-row-text' });
      text.appendChild(el('span', {
        class: 'today-row-title',
        text: (row.foods && row.foods.name) || 'Something'
      }));
      // In words, never a red dot: this is food you have, not a mistake.
      text.appendChild(el('span', { class: 'today-row-meta', text: describeFreshness(fresh) }));
      item.appendChild(text);
      list.appendChild(item);
    }
    useUp.body.appendChild(list);
    if (soon.length > 3) {
      useUp.body.appendChild(el('p', {
        class: 'field-hint',
        text: `…and ${soon.length - 3} more.`
      }));
    }
    useUp.body.appendChild(el('a', { class: 'card-link', href: '#/pantry', text: 'Open the pantry' }));
  }

  // --------------------------- Shopping ---------------------------------

  async function loadShopping() {
    const result = await listShoppingItems();
    if (destroyed || !result.ok) return;
    const outstanding = (result.data || []).filter((item) => item.status === 'needed').length;
    if (outstanding === 0) return;

    shopping.clear();
    shopping.show();
    shopping.body.appendChild(el('p', {
      text: `${outstanding} thing${outstanding === 1 ? '' : 's'} still to get.`
    }));
    shopping.body.appendChild(el('a', {
      class: 'card-link', href: '#/shopping', text: 'Open the list'
    }));
  }

  // ------------------------- Everything else -----------------------------

  mountEl.appendChild(el('h2', { text: 'Everything else' }));
  const links = el('ul', { class: 'hub-list' });
  for (const entry of DASHBOARD_LINKS) {
    const item = el('li', { class: 'hub-item' });
    const link = el('a', { class: 'hub-link', href: `#/${entry.path}` });
    const text = el('span', { class: 'hub-text' });
    text.append(
      el('span', { class: 'hub-title', text: entry.title }),
      el('span', { class: 'hub-blurb', text: entry.blurb })
    );
    link.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
    item.appendChild(link);
    links.appendChild(item);
  }
  mountEl.appendChild(links);

  // ------------------------------ Loading --------------------------------

  totalForDate(today).then((result) => {
    if (destroyed || !result.ok) return;
    waterTotalMl = result.data.total;
    waterPartial = result.data.partial;
    paintWater();
  });

  // Each section independently: one failed query must not blank the page.
  Promise.allSettled([
    loadChores(), loadExercises(), loadMeal(), loadUseUp(), loadShopping()
  ]).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') console.error('A dashboard section failed:', result.reason);
    }
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
