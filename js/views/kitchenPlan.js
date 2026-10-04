// js/views/kitchenPlan.js — 04 Oct 2026 v7
// v7: an Eaten tick on each planned meal this week (data/eaten.js).
// v6: Board or List — the week in words, day by day, for a small phone.
// v5: starters and puddings — listed in eating order with their course, and
// Find a starter / Find a pudding for lunch and dinner.
// v4: leftovers — "Plan leftovers" on a planned meal; leftover entries are
// labelled on the board and in the panel, and never add to the shopping list.
// v4: your own meals open the recipe page too (#/recipe?m=<id>).
// v3: Fill the open meals — suggestions from your own meals for every open
// breakfast, lunch and dinner left this week, reviewed before anything is added.
// v2: plan changes ask the shopping list to follow (requestListSync), as the old plan did.
// Kitchen rebuild K6. The week as a board: seven days across, a row per
// meal. The approved mockup's Plan screen.
//
// planThisWeek.js and planNextWeek.js hand over to this in kitchen-only
// mode; mealPlan.js keeps the previous day-card screen for the full app.
//
// ---- Why a board ----
// The day cards answered "what is on Tuesday" and nothing else. The board
// answers "where are the gaps this week" at a glance, without scrolling,
// and a tap on any square says what is in it and offers something for it.
//
// ---- Accessibility ----
// A real <table>: day column headers, meal row headers, so a screen reader
// announces "Tuesday, Lunch: open". One square is in the tab order at a
// time and the arrow keys move between squares (roving tabindex), so the
// board is one Tab stop, not twenty-eight.
//
// ---- No verdicts ----
// An empty square is "open". Never missed, never red, never counted
// against anyone (behavioural principle 1).

import { el } from '../lib/dom.js';
import {
  listPlan, addPlanEntry, removePlanEntry, servesFor, DAYS, SLOTS,
  isLeftover, leftoversReady
} from '../data/mealPlan.js';
import { listMeals, listIngredients, groupByMeal, computeMacros } from '../data/meals.js';
import { dayNutrition, nutritionRows } from '../data/nutrition.js';
import { thisWeekStart, nextWeekStart } from '../lib/weeks.js';
import { buildWeekIntoList } from '../data/planShopping.js';
import { requestListSync } from '../data/listSync.js';
import { readDraft, writeDraft, clearDraft } from '../lib/planDraft.js';
import { mealGlyph, mealIcon } from '../components/mealGlyph.js';
import { navigate } from '../router.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { openLeftoverSheet } from '../components/leftoverSheet.js';
import { eatenTick } from '../components/eatenTick.js';
import { isEaten } from '../data/eaten.js';
import { courseOf, courseLabel, sortByCourse } from '../data/courses.js';
import { loadAllRecipes } from '../data/recipeLibrary.js';

const JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SLOT_WORDS = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snacks', drink: 'drinks' };

/** "Monday 28 September to Sunday 4 October". */
export function rangeLabel(isoMonday) {
  const [y, m, d] = String(isoMonday).split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const fmt = (date) => date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${fmt(start)} to ${fmt(end)}`;
}

function recipeHref(meal) {
  if (meal && meal.library_ref) return `#/recipe?r=${encodeURIComponent(meal.library_ref)}`;
  if (meal && meal.id) return `#/recipe?m=${encodeURIComponent(meal.id)}`;
  return '#/meals';
}

/** Up to three of your own meals that suit this slot, favourites first. */
export function ideasFor(meals, slot, alreadyIds = []) {
  return (meals || [])
    .filter((m) => !alreadyIds.includes(m.id))
    .filter((m) => m.meal_type === slot || m.default_slot === slot)
    .sort((a, b) => Number(Boolean(b.is_favourite)) - Number(Boolean(a.is_favourite))
      || String(a.name).localeCompare(String(b.name)))
    .slice(0, 3);
}

/**
 * Suggestions for every open main meal from today on (or the whole week for
 * next week). Your own meals only, suited to the slot, favourites first, and
 * no meal used twice in a week, so a filled week is not seven of the same.
 *
 * @returns {Array<{ day: string, slot: string, meal: object }>}
 */
export function proposeFills(entries, meals, fromDayIndex = 0) {
  const days = DAYS.slice(fromDayIndex);
  const used = new Set(entries.map((e) => e.meal_id));
  const proposals = [];
  for (const d of days) {
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      if (entries.some((e) => e.day_of_week === d.value && e.slot === slot)) continue;
      const pick = ideasFor(meals, slot, [...used])[0];
      if (!pick) continue;
      used.add(pick.id);
      proposals.push({ day: d.value, slot, meal: pick });
    }
  }
  return proposals;
}

/**
 * @param {HTMLElement} mountEl
 * @param {{ week: 'this' | 'next' }} opts
 */
export function render(mountEl, { week = 'this' } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const weekStart = week === 'next' ? nextWeekStart() : thisWeekStart();
  const origin = week === 'next' ? 'next' : 'week';
  const todayValue = week === 'this' ? JS_DAY[new Date().getDay()] : null;

  let entries = [];
  let meals = [];
  let ingredientsByMeal = new Map();
  let libraryCourse = new Map(); // library slug -> course
  let sel = { day: todayValue || 'mon', slot: 'dinner' };

  // ---------------------------------------------------------------- shell
  const header = el('header', { class: 'plan-header' });
  header.appendChild(el('h1', { class: 'plan-title', text: week === 'next' ? 'Next week' : 'This week' }));
  header.appendChild(el('p', { class: 'plan-range', text: rangeLabel(weekStart) }));
  const weekNav = el('p', { class: 'plan-week-switch' });
  weekNav.appendChild(week === 'next'
    ? el('a', { href: '#/plan-this-week', text: 'This week' })
    : el('a', { href: '#/plan-next-week', text: 'Next week' }));
  header.appendChild(weekNav);
  mountEl.appendChild(header);

  const status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  mountEl.appendChild(status);

  const boardWrap = el('div', { class: 'plan-board-wrap' });
  const help = el('p', { class: 'visually-hidden', id: 'plan-board-help',
    text: 'Each column is a day and each row is a meal. Use the arrow keys to move between squares.' });
  const table = el('table', { class: 'plan-board', 'aria-describedby': 'plan-board-help' });
  table.appendChild(el('caption', { class: 'visually-hidden', text: `Meals planned, ${rangeLabel(weekStart)}` }));
  const thead = el('thead');
  const tbody = el('tbody');
  table.append(thead, tbody);
  boardWrap.append(help, table);
  const legend = el('ul', { class: 'plan-legend', 'aria-hidden': 'true' });
  for (const s of SLOTS) {
    const li = el('li');
    li.appendChild(el('span', { class: `plan-legend-swatch meal-${s.value}` }));
    li.appendChild(document.createTextNode(s.label));
    legend.appendChild(li);
  }
  const openKey = el('li');
  openKey.appendChild(el('span', { class: 'plan-legend-swatch plan-legend-open' }));
  openKey.appendChild(document.createTextNode('Open'));
  legend.appendChild(openKey);
  boardWrap.appendChild(legend);

  // ---- Board or list (3 Oct 2026) ----------------------------------------
  // The board shows a week's shape; on a small phone it does not show what
  // anything IS without a tap per square. The list says it in words, day by
  // day. Your choice is remembered on this phone.
  const VIEW_KEY = 'home-os-plan-view';
  let view = 'board';
  try { if (localStorage.getItem(VIEW_KEY) === 'list') view = 'list'; } catch { /* fine */ }
  const switcher = el('div', { class: 'plan-view-switch', role: 'group', 'aria-label': 'Show the week as' });
  const boardBtn = el('button', { type: 'button', class: 'chip-toggle', text: 'Board' });
  const listBtn = el('button', { type: 'button', class: 'chip-toggle', text: 'List' });
  switcher.append(boardBtn, listBtn);
  const listWrap = el('div', { class: 'plan-list' });
  const setView = (next) => {
    view = next;
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* fine */ }
    paintView();
  };
  boardBtn.addEventListener('click', () => setView('board'), { signal });
  listBtn.addEventListener('click', () => setView('list'), { signal });
  function paintView() {
    boardBtn.setAttribute('aria-pressed', String(view === 'board'));
    listBtn.setAttribute('aria-pressed', String(view === 'list'));
    boardWrap.hidden = view !== 'board';
    listWrap.hidden = view !== 'list';
    if (view === 'list') paintList();
  }
  mountEl.append(switcher, boardWrap, listWrap);

  const dayNutri = el('section', { class: 'plan-day-nutrition', 'aria-labelledby': 'plan-nutri-h' });
  mountEl.appendChild(dayNutri);

  const detail = el('section', { class: 'plan-detail', 'aria-labelledby': 'plan-detail-h' });
  mountEl.appendChild(detail);

  const actions = el('div', { class: 'plan-actions' });
  const shopBtn = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Update shopping list' });
  const fillBtn = el('button', { type: 'button', class: 'btn btn-block', text: 'Fill the open meals', 'aria-haspopup': 'dialog' });
  actions.append(fillBtn, shopBtn);
  mountEl.appendChild(actions);

  fillBtn.addEventListener('click', () => {
    const fromIndex = todayValue ? DAYS.findIndex((d) => d.value === todayValue) : 0;
    const proposals = proposeFills(entries, meals, Math.max(0, fromIndex));
    if (proposals.length === 0) {
      const words = meals.length === 0
        ? 'Add some meals of your own first, and they will be suggested here.'
        : 'Nothing to fill: every meal left this week is planned, or none of your meals suit the gaps.';
      showToast(words);
      announce(words);
      return;
    }
    openDetailSheet({
      title: 'Fill the open meals',
      subtitle: 'From your own meals. Untick any you do not want.',
      returnFocusTo: fillBtn,
      build(body, api) {
        const list = el('ul', { class: 'fill-list' });
        const boxes = [];
        proposals.forEach((p, i) => {
          const li = el('li', { class: 'checkbox-row' });
          const box = el('input', { type: 'checkbox', id: `fill-${i}` });
          box.checked = true;
          const dayLabel = (DAYS.find((d) => d.value === p.day) || {}).label;
          const label = el('label', { for: `fill-${i}` });
          label.appendChild(el('span', { class: 'fill-when', text: `${dayLabel} ${SLOT_WORDS[p.slot]}` }));
          label.appendChild(el('span', { class: 'fill-meal', text: p.meal.name }));
          li.append(box, label);
          list.appendChild(li);
          boxes.push(box);
        });
        body.appendChild(list);
        const go = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Add these to the plan' });
        go.addEventListener('click', async () => {
          go.disabled = true;
          let added = 0;
          for (let i = 0; i < proposals.length; i += 1) {
            if (!boxes[i].checked) continue;
            const p = proposals[i];
            const result = await addPlanEntry({ meal_id: p.meal.id, day_of_week: p.day, slot: p.slot, week_start: weekStart });
            if (destroyed) return;
            if (!result.ok) { showToast('Some could not be added. Try again.'); break; }
            entries = [...entries, { ...result.data, meals: p.meal }];
            added += 1;
          }
          api.close();
          requestListSync();
          refreshAfterChange(`${added} meal${added === 1 ? '' : 's'} added. The shopping list will follow.`);
        });
        body.appendChild(go);
      }
    });
  }, { signal });

  // ---------------------------------------------------------------- board
  const headRow = el('tr');
  headRow.appendChild(el('td', { class: 'plan-corner' }));
  for (const d of DAYS) {
    const th = el('th', { scope: 'col', class: d.value === todayValue ? 'is-today' : '', abbr: d.label });
    th.appendChild(el('span', { class: 'plan-day-short', text: d.value === todayValue ? 'Today' : d.short }));
    th.appendChild(el('span', { class: 'visually-hidden', text: d.value === todayValue ? `, ${d.label}` : '' }));
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);

  function cellEntries(day, slot) {
    return entries.filter((e) => e.day_of_week === day && e.slot === slot);
  }

  function paintBoard() {
    if (view === 'list') paintList();
    tbody.replaceChildren();
    SLOTS.forEach((s, r) => {
      const tr = el('tr');
      const th = el('th', { scope: 'row', class: 'plan-row-head' });
      th.appendChild(mealIcon(s.value, 18));
      th.appendChild(el('span', { class: 'visually-hidden', text: s.label }));
      tr.appendChild(th);
      DAYS.forEach((d, c) => {
        const here = cellEntries(d.value, s.value);
        const on = sel.day === d.value && sel.slot === s.value;
        const td = el('td', { class: d.value === todayValue ? 'is-today' : '' });
        const names = here.map((e) => `${(e.meals && e.meals.name) || 'a meal'}${isLeftover(e) ? ' (leftovers)' : ''}${isEaten(e) ? ' (eaten)' : ''}`).join(', ');
        const allLeftover = here.length > 0 && here.every(isLeftover);
        const btn = el('button', {
          type: 'button',
          class: here.length ? `plan-cell meal-${s.value}${allLeftover ? ' plan-cell-leftover' : ''}` : 'plan-cell plan-cell-open',
          'aria-pressed': String(on),
          'aria-label': `${d.label} ${SLOT_WORDS[s.value]}: ${here.length ? names : 'open'}`,
          tabindex: on ? '0' : '-1',
          'data-r': String(r),
          'data-c': String(c)
        });
        if (here.length) {
          btn.appendChild(mealIcon(s.value, 18));
          if (here.length > 1) btn.appendChild(el('span', { class: 'plan-cell-count', 'aria-hidden': 'true', text: String(here.length) }));
          // Leftovers carry a mark as well as a dashed edge, so the
          // difference is never colour or line style alone.
          else if (allLeftover) btn.appendChild(el('span', { class: 'plan-cell-count', 'aria-hidden': 'true', text: 'L' }));
        }
        btn.addEventListener('click', () => select(d.value, s.value, true), { signal });
        td.appendChild(btn);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // The week in words: each day, each meal, tap one to work on it.
  function paintList() {
    listWrap.replaceChildren();
    for (const d of DAYS) {
      const day = el('section', { class: d.value === todayValue ? 'plan-list-day is-today' : 'plan-list-day', 'aria-labelledby': `plan-list-${d.value}` });
      day.appendChild(el('h2', { id: `plan-list-${d.value}`, class: 'plan-list-day-name', text: d.value === todayValue ? `${d.label} (today)` : d.label }));
      const ul = el('ul', { class: 'plan-list-slots' });
      for (const s of SLOTS) {
        const here = cellEntries(d.value, s.value);
        const li = el('li');
        const b = el('button', { type: 'button', class: here.length ? 'plan-list-slot' : 'plan-list-slot is-open' });
        b.appendChild(mealGlyph(s.value, 18));
        const text = el('span', { class: 'plan-list-text' });
        text.appendChild(el('span', { class: 'plan-list-slot-name', text: s.label }));
        text.appendChild(el('span', { class: 'plan-list-meals', text: here.length
          ? here.map((e) => `${(e.meals && e.meals.name) || 'A meal'}${isLeftover(e) ? ' (leftovers)' : ''}${isEaten(e) ? ' (eaten)' : ''}`).join(', ')
          : 'Open' }));
        b.appendChild(text);
        b.setAttribute('aria-label', `${d.label} ${SLOT_WORDS[s.value]}: ${here.length ? text.lastChild.textContent : 'open'}. Change it.`);
        b.addEventListener('click', () => {
          sel = { day: d.value, slot: s.value };
          paintBoard();
          paintDetail();
          paintDayNutrition();
          const h = document.getElementById('plan-detail-h');
          if (h) { h.focus(); h.scrollIntoView({ block: 'start' }); }
        }, { signal });
        li.appendChild(b);
        ul.appendChild(li);
      }
      day.appendChild(ul);
      listWrap.appendChild(day);
    }
  }

  tbody.addEventListener('keydown', (event) => {
    const btn = event.target.closest('.plan-cell');
    if (!btn) return;
    const r = Number(btn.dataset.r);
    const c = Number(btn.dataset.c);
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    let move = moves[event.key];
    if (event.key === 'Home') move = [0, -c];
    if (event.key === 'End') move = [0, DAYS.length - 1 - c];
    if (!move) return;
    event.preventDefault();
    const nr = Math.max(0, Math.min(SLOTS.length - 1, r + move[0]));
    const nc = Math.max(0, Math.min(DAYS.length - 1, c + move[1]));
    select(DAYS[nc].value, SLOTS[nr].value, false);
    const target = tbody.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
    if (target) target.focus();
  }, { signal });

  function select(day, slot, keepFocus) {
    const dayChanged = day !== sel.day;
    sel = { day, slot };
    paintBoard();
    paintDetail();
    if (dayChanged) paintDayNutrition();
    if (keepFocus) {
      const target = tbody.querySelector('[aria-pressed="true"]');
      if (target) target.focus();
    }
  }

  // ------------------------------------------------------- day nutrition
  function paintDayNutrition() {
    dayNutri.replaceChildren();
    const dayLabel = (DAYS.find((d) => d.value === sel.day) || {}).label || '';
    const head = el('div', { class: 'plan-nutri-head' });
    head.appendChild(el('h2', { id: 'plan-nutri-h', text: `${dayLabel}’s nutrition` }));
    head.appendChild(el('span', { class: 'field-hint', text: 'Estimate, % of reference intake' }));
    dayNutri.appendChild(head);
    const items = cellsForDay(sel.day).map((entry) => {
      const rows = ingredientsByMeal.get(entry.meal_id) || [];
      if (rows.length === 0) return null;
      const m = computeMacros(rows, { serves: (entry.meals && entry.meals.default_serves) || 1 });
      return { perServing: m.perServing, complete: m.complete };
    }).filter(Boolean);
    if (items.length === 0) {
      dayNutri.appendChild(el('p', { class: 'field-hint', text: 'Nothing planned with ingredients yet.' }));
      return;
    }
    const day = dayNutrition(items);
    const dl = el('dl', { class: 'plan-nutri-strip' });
    for (const row of nutritionRows(day.totals, day.complete)) {
      const group = el('div');
      const value = row.amount === null ? '–' : (row.unit === 'kcal' ? row.amount.toLocaleString('en-GB') : `${row.percent}%`);
      group.appendChild(el('dt', { text: row.unit === 'kcal' ? 'kcal' : row.label }));
      group.appendChild(el('dd', { text: value }));
      dl.appendChild(group);
    }
    dayNutri.appendChild(dl);
  }

  function cellsForDay(day) {
    return entries.filter((e) => e.day_of_week === day);
  }

  // -------------------------------------------------------------- detail
  function paintDetail() {
    detail.replaceChildren();
    const d = DAYS.find((x) => x.value === sel.day);
    const s = SLOTS.find((x) => x.value === sel.slot);
    const here = cellEntries(sel.day, sel.slot);

    const head = el('div', { class: 'plan-detail-head' });
    head.appendChild(mealGlyph(sel.slot, 22));
    head.appendChild(el('h2', { id: 'plan-detail-h', tabindex: '-1', text: `${d.label} ${SLOT_WORDS[s.value]}` }));
    const choose = el('button', { type: 'button', class: 'btn', text: 'Choose' });
    choose.setAttribute('aria-label', `Choose a meal for ${d.label} ${SLOT_WORDS[s.value]}`);
    choose.addEventListener('click', () => {
      writeDraft({ day: sel.day, slot: sel.slot, origin, mealId: null, mealName: null });
      navigate('plan-choose');
    }, { signal });
    head.appendChild(choose);
    detail.appendChild(head);

    // A course for each dish: the meal's own (migration 026), else the
    // library recipe it came from, else a main.
    const courseFor = (entry) => {
      const meal = meals.find((m) => m.id === entry.meal_id) || entry.meals || {};
      if (meal.course) return courseOf(meal);
      const ref = meal.library_ref || (entry.meals && entry.meals.library_ref);
      return ref && libraryCourse.has(ref) ? libraryCourse.get(ref) : 'main';
    };
    const ordered = sortByCourse(here, courseFor);
    const showCourses = ordered.some((e) => courseFor(e) !== 'main');

    if (here.length) {
      const list = el('ul', { class: 'plan-detail-items' });
      for (const entry of ordered) {
        const li = el('li');
        const text = el('span', { class: 'plan-detail-text' });
        text.appendChild(el('a', { href: recipeHref(entry.meals), text: (entry.meals && entry.meals.name) || 'A meal' }));
        if (showCourses) text.appendChild(el('span', { class: 'plan-detail-course', text: courseLabel(courseFor(entry)) }));
        text.appendChild(el('span', { class: 'field-hint', text: isLeftover(entry)
          ? `Leftovers, ${servesFor(entry)} portion${servesFor(entry) === 1 ? '' : 's'}. Nothing to buy.`
          : `Serves ${servesFor(entry)}` }));
        li.appendChild(text);
        // Eaten (4 Oct 2026): this week only; next week has not happened.
        if (week === 'this') li.appendChild(eatenTick(entry, { signal, onChange: () => paintBoard() }));
        if (leftoversReady() && !isLeftover(entry)) {
          const lo = el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Plan leftovers', 'aria-haspopup': 'dialog' });
          lo.setAttribute('aria-label', `Plan the leftovers of ${(entry.meals && entry.meals.name) || 'this meal'}`);
          lo.addEventListener('click', () => openLeftoverSheet({
            entry, entries, weekStart, returnFocusTo: lo,
            onAdded(row) {
              entries = [...entries, row];
              refreshAfterChange(`Leftovers of ${(entry.meals && entry.meals.name) || 'the meal'} planned.`);
            }
          }), { signal });
          li.appendChild(lo);
        }
        const rm = el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Remove' });
        rm.setAttribute('aria-label', `Remove ${(entry.meals && entry.meals.name) || 'this meal'} from ${d.label} ${SLOT_WORDS[s.value]}`);
        rm.addEventListener('click', async () => {
          rm.disabled = true;
          const result = await removePlanEntry(entry.id);
          if (destroyed) return;
          if (!result.ok) { rm.disabled = false; showToast('That did not save. Try again.'); return; }
          entries = entries.filter((x) => x.id !== entry.id);
          // The list follows the plan on its own (Phase 22), as it did
          // from the old plan screen.
          requestListSync();
          refreshAfterChange(`Removed ${(entry.meals && entry.meals.name) || 'the meal'}.`);
        }, { signal });
        li.appendChild(rm);
        list.appendChild(li);
      }
      detail.appendChild(list);
    } else {
      detail.appendChild(el('p', { class: 'plan-detail-open', text: 'Open. Choose a meal, or pick one of your ideas below.' }));
    }

    // Starters and puddings sit beside the main. Offered for lunch and
    // dinner once there is a main to go with.
    if ((sel.slot === 'dinner' || sel.slot === 'lunch') && here.length) {
      const has = new Set(here.map(courseFor));
      const more = el('p', { class: 'plan-courses' });
      if (!has.has('starter')) more.appendChild(el('a', { class: 'btn btn-quiet btn-small', href: '#/library?course=starter', text: 'Find a starter' }));
      if (!has.has('pudding')) more.appendChild(el('a', { class: 'btn btn-quiet btn-small', href: '#/library?course=pudding', text: 'Find a pudding' }));
      if (more.childNodes.length) detail.appendChild(more);
    }

    const ideas = ideasFor(meals, sel.slot, here.map((e) => e.meal_id));
    if (ideas.length) {
      const wrap = el('div', { class: 'plan-ideas' });
      wrap.appendChild(el('p', { class: 'plan-ideas-title', text: here.length ? 'Add another' : 'From your meals' }));
      const ul = el('ul');
      for (const meal of ideas) {
        const li = el('li');
        const b = el('button', { type: 'button', class: 'chip-toggle plan-idea', text: `+ ${meal.name}` });
        b.setAttribute('aria-label', `Add ${meal.name} to ${d.label} ${SLOT_WORDS[s.value]}`);
        b.addEventListener('click', () => addMeal(meal, b), { signal });
        li.appendChild(b);
        ul.appendChild(li);
      }
      wrap.appendChild(ul);
      detail.appendChild(wrap);
    }
  }

  async function addMeal(meal, button) {
    if (button) button.disabled = true;
    const result = await addPlanEntry({ meal_id: meal.id, day_of_week: sel.day, slot: sel.slot, week_start: weekStart });
    if (destroyed) return;
    if (!result.ok) {
      if (button) button.disabled = false;
      showToast(result.error && result.error.message ? result.error.message : 'That did not save. Try again.');
      return;
    }
    entries = [...entries, { ...result.data, meals: meal }];
    requestListSync();
    refreshAfterChange(`Added ${meal.name}.`);
  }

  function refreshAfterChange(message) {
    paintBoard();
    paintDetail();
    paintDayNutrition();
    status.textContent = message;
    announce(message);
    const h = document.getElementById('plan-detail-h');
    if (h) h.focus();
  }

  // ---------------------------------------------------------- shopping
  shopBtn.addEventListener('click', async () => {
    shopBtn.disabled = true;
    shopBtn.textContent = 'Updating…';
    const result = await buildWeekIntoList(weekStart);
    if (destroyed) return;
    shopBtn.disabled = false;
    shopBtn.textContent = 'Update shopping list';
    if (!result.ok) {
      showToast(result.stage === 'insert'
        ? 'The old list was cleared but the new one failed to save. Try again.'
        : 'The list could not be updated. Nothing was changed.');
      return;
    }
    const n = result.data.items.length;
    const message = n === 0
      ? 'Nothing to buy for this week’s plan.'
      : `Shopping list updated: ${n} thing${n === 1 ? '' : 's'} from this week’s plan.`;
    status.textContent = message;
    showToast(message);
  }, { signal });

  // --------------------------------------------------------------- load
  paintView();
  paintBoard();
  paintDetail();

  (async () => {
    const [plan, mealList, ingredients] = await Promise.all([listPlan(weekStart), listMeals(), listIngredients()]);
    if (destroyed) return;
    entries = plan.ok ? (plan.data || []) : [];
    meals = mealList.ok ? (mealList.data || []) : [];
    ingredientsByMeal = ingredients.ok ? groupByMeal(ingredients.data) : new Map();
    if (!plan.ok) {
      detail.replaceChildren(el('p', { text: 'The plan could not be loaded. Check your connection and try again.' }));
    }

    // Back from the chooser with a meal picked: add it where it was asked for.
    const draft = readDraft();
    if (draft.mealId && draft.day && draft.slot && draft.origin === origin) {
      clearDraft();
      sel = { day: draft.day, slot: draft.slot };
      const meal = meals.find((m) => m.id === draft.mealId) || { id: draft.mealId, name: draft.mealName || 'The meal' };
      paintBoard();
      await addMeal(meal, null);
      if (destroyed) return;
    }

    paintBoard();
    paintDetail();
    paintDayNutrition();

    // Courses for library recipes, for the panel's order and labels. Not
    // awaited before the first paint: the board is useful without it.
    loadAllRecipes().then((lib) => {
      if (destroyed || !lib || !lib.ok) return;
      libraryCourse = new Map((lib.data || []).map((r) => [r.slug, courseOf(r)]));
      paintDetail();
    }).catch(() => {});
  })().catch((error) => {
    if (destroyed) return;
    console.error('Plan board failed:', error);
    detail.replaceChildren(el('p', { text: 'Something went wrong loading the plan. Try again.' }));
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
