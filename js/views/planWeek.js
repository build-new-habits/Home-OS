// js/views/planWeek.js — 01 Sep 2026 v1
// Phase 24. Sort out a week's food from one button.
//
// ---- Why this exists ----
// The app was built as a set of correct screens rather than a set of tasks.
// Planning a week meant Meals → Meal plan → Shopping → Pantry, knowing which
// screen does what and in what order. Every hop is a place to lose the
// thread, and for the people this product is for, that is not an
// inconvenience — it is the failure mode.
//
// This is a path THROUGH the existing screens, not a replacement for them.
// Every one of them still works exactly as it did.
//
// ---- The rules this flow obeys ----
// 1. Every step is skippable and the flow is abandonable at any point.
//    Whatever you did is already saved — each action writes as it happens,
//    there is no "submit at the end". A wizard that loses your work if you
//    leave is a wizard people learn not to start.
// 2. Position is stated ("Step 2 of 4"), never a filling progress bar.
//    A bar that fills toward completion is a small guilt machine.
// 3. It never blocks on incompleteness. You can reach the end having
//    planned two meals. Two is better than none and the app has no opinion.
// 4. Resumable, on the same six-hour rule as Cook Mode.

import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { icon, countChip } from '../lib/icons.js';
import { getHousehold } from '../data/household.js';
import { listMeals, listIngredients } from '../data/meals.js';
import {
  listPlan, addPlanEntry, removePlanEntry, groupByCell, DAYS, SLOTS
} from '../data/mealPlan.js';
import { listStock } from '../data/pantry.js';
import { listFoods } from '../data/foods.js';
import { computeShortfall } from '../lib/shortfall.js';
import { replaceGeneratedItems } from '../data/shopping.js';
import { scoreMeals, BAND } from '../data/pantryMatch.js';
import { todayIso } from '../data/pantry.js';

/** Local, matching every other view in this codebase. */
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

const PROGRESS_KEY = 'home-os:plan-week';
const PROGRESS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const STEPS = [
  { key: 'who', title: "Who's eating this week?" },
  { key: 'fill', title: 'Fill the week' },
  { key: 'need', title: 'What you need' },
  { key: 'done', title: 'That is the week sorted' }
];

export function readPlanProgress() {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - Number(saved.startedAt || 0) > PROGRESS_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function writeProgress(stepIndex, startedAt, awayIds) {
  try {
    window.localStorage.setItem(PROGRESS_KEY,
      JSON.stringify({ stepIndex, startedAt, awayIds }));
  } catch { /* a full store must not stop you planning */ }
}

export function clearPlanProgress() {
  try { window.localStorage.removeItem(PROGRESS_KEY); } catch { /* nothing to do */ }
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const resumed = readPlanProgress();
  const startedAt = resumed ? resumed.startedAt : Date.now();
  let stepIndex = resumed ? Math.min(resumed.stepIndex, STEPS.length - 1) : 0;
  let awayIds = new Set(resumed ? resumed.awayIds || [] : []);

  let members = [];
  let meals = [];
  let ingredientsByMeal = new Map();
  let planByCell = new Map();
  let stock = [];
  let foods = [];
  let shortfall = [];

  mountEl.replaceChildren();

  const header = el('div', { class: 'plan-week-header' });
  const heading = el('h1', { id: 'plan-week-heading', tabindex: '-1' });
  const position = el('p', { class: 'plan-week-position' });
  header.append(heading, position);
  mountEl.appendChild(header);

  const body = el('div', { class: 'plan-week-body' });
  mountEl.appendChild(body);

  const nav = el('div', { class: 'plan-week-nav' });
  const back = el('button', { type: 'button', class: 'btn', text: 'Back' });
  const skip = el('button', { type: 'button', class: 'btn', text: 'Skip this' });
  const next = el('button', { type: 'button', class: 'btn btn-primary btn-large' });
  nav.append(back, skip, next);
  mountEl.appendChild(nav);

  // A way out that is not a failure. Leaving is a normal thing to do and
  // the label says so — "Cancel" would imply the work is discarded, and it
  // is not: everything is already written.
  const leave = el('button', {
    type: 'button', class: 'btn plan-week-leave', text: 'Finish later'
  });
  leave.addEventListener('click', () => {
    showToast('Saved. Pick this up from the dashboard whenever you like.');
    window.location.hash = '#/dashboard';
  }, { signal });
  mountEl.appendChild(leave);

  back.addEventListener('click', () => go(stepIndex - 1), { signal });
  skip.addEventListener('click', () => go(stepIndex + 1), { signal });
  next.addEventListener('click', () => {
    if (stepIndex === STEPS.length - 1) {
      clearPlanProgress();
      announce('Week planned.');
      window.location.hash = '#/dashboard';
      return;
    }
    go(stepIndex + 1);
  }, { signal });

  function go(index) {
    stepIndex = Math.max(0, Math.min(index, STEPS.length - 1));
    writeProgress(stepIndex, startedAt, [...awayIds]);
    renderStep();
    // Focus the heading, not the first control: the person needs to know
    // where they are before they are asked to do anything.
    heading.focus();
  }

  async function loadEverything() {
    body.replaceChildren(el('p', { class: 'field-hint', text: 'Getting your week ready…' }));

    const [household, mealResult, ingredientResult, planResult, stockResult, foodResult] =
      await Promise.all([
        getHousehold(), listMeals(), listIngredients(), listPlan(), listStock(), listFoods()
      ]);
    if (destroyed) return;

    members = household.ok ? household.data.members : [];
    meals = mealResult.ok ? mealResult.data : [];
    foods = foodResult.ok ? foodResult.data : [];
    stock = stockResult.ok ? stockResult.data : [];
    planByCell = planResult.ok ? groupByCell(planResult.data) : new Map();

    ingredientsByMeal = new Map();
    if (ingredientResult.ok) {
      for (const row of ingredientResult.data) {
        if (!ingredientsByMeal.has(row.meal_id)) ingredientsByMeal.set(row.meal_id, []);
        ingredientsByMeal.get(row.meal_id).push(row);
      }
    }

    renderStep();
    if (resumed) announce(`Picking up at step ${stepIndex + 1}.`);
  }

  function renderStep() {
    const step = STEPS[stepIndex];
    heading.textContent = step.title;
    position.textContent = `Step ${stepIndex + 1} of ${STEPS.length}`;

    back.disabled = stepIndex === 0;
    skip.hidden = stepIndex === STEPS.length - 1;
    next.textContent = stepIndex === STEPS.length - 1 ? 'Done' : 'Next';

    body.replaceChildren();
    if (step.key === 'who') renderWho();
    else if (step.key === 'fill') renderFill();
    else if (step.key === 'need') renderNeed();
    else renderDone();
  }

  // ---- Step 1: who's in --------------------------------------------------
  function renderWho() {
    if (members.length === 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'You have not added anyone to your household yet, so everything is planned for you. '
          + 'You can add people in Settings whenever you like.'
      }));
      return;
    }

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Untick anyone who is away. This only affects what gets planned in this run — '
        + 'you can change any meal afterwards.'
    }));

    const list = el('ul', { class: 'plain-list' });
    for (const member of members) {
      const item = el('li', { class: 'checkbox-row' });
      const box = el('input', { type: 'checkbox', id: `away-${member.id}` });
      box.checked = !awayIds.has(member.id);
      const label = el('label', { for: box.id, text: member.display_name });
      box.addEventListener('change', () => {
        if (box.checked) awayIds.delete(member.id); else awayIds.add(member.id);
        writeProgress(stepIndex, startedAt, [...awayIds]);
      }, { signal });
      item.append(box, label);
      list.appendChild(item);
    }
    body.appendChild(list);
  }

  /** The member ids to stamp on anything planned in this run. */
  function planningFor() {
    if (members.length === 0 || awayIds.size === 0) return [];
    const here = members.filter((m) => !awayIds.has(m.id)).map((m) => m.id);
    // Everyone here is the same as nobody named, and storing it empty means
    // a member added later is automatically included.
    return here.length === members.length ? [] : here;
  }

  // ---- Step 2: fill the week --------------------------------------------
  function renderFill() {
    const planned = [...planByCell.values()].reduce((n, list) => n + list.length, 0);

    const summary = el('p', { class: 'field-hint' });
    summary.textContent = planned === 0
      ? 'Nothing planned yet. Add as many or as few as you like — an empty day is fine.'
      : `${planned} meal${planned === 1 ? '' : 's'} planned so far. An empty day is fine.`;
    body.appendChild(summary);

    // Cooking what you already have is the cheapest good decision available,
    // so it is offered before anything else.
    const ready = scoreMeals(meals, ingredientsByMeal, stock)
      .filter((entry) => entry.band === BAND.READY)
      .slice(0, 6);

    if (ready.length > 0) {
      const readyBox = el('section', { class: 'plan-week-ready' });
      readyBox.appendChild(el('h2', { text: 'You could cook these right now' }));
      readyBox.appendChild(el('p', {
        class: 'field-hint', text: 'Nothing to buy for any of these.'
      }));
      const list = el('ul', { class: 'plain-list' });
      for (const entry of ready) list.appendChild(buildQuickAdd(entry.meal));
      readyBox.appendChild(list);
      body.appendChild(readyBox);
    }

    const all = el('details', { class: 'plan-week-all' });
    all.appendChild(el('summary', { text: 'Choose from all my meals' }));
    const allList = el('ul', { class: 'plain-list' });
    for (const meal of meals) allList.appendChild(buildQuickAdd(meal));
    if (meals.length === 0) {
      allList.appendChild(el('li', {
        class: 'field-hint',
        text: 'No recipes yet. Add one on the Meals screen, or browse the recipe library there.'
      }));
    }
    all.appendChild(allList);
    body.appendChild(all);

    body.appendChild(buildPlannedSoFar());
  }

  function buildQuickAdd(meal) {
    const item = el('li', { class: 'plan-week-pick' });
    item.appendChild(el('span', { class: 'plan-week-pick-name', text: meal.name }));

    const daySelect = el('select', { id: `pick-day-${meal.id}` });
    for (const day of DAYS) daySelect.appendChild(el('option', { value: day.value, text: day.label }));
    const dayLabel = el('label', { class: 'sr-only', for: daySelect.id, text: `Day for ${meal.name}` });

    const slotSelect = el('select', { id: `pick-slot-${meal.id}` });
    for (const slot of SLOTS) slotSelect.appendChild(el('option', { value: slot.value, text: slot.label }));
    slotSelect.value = meal.default_slot || 'dinner';
    const slotLabel = el('label', { class: 'sr-only', for: slotSelect.id, text: `Meal time for ${meal.name}` });

    const add = el('button', { type: 'button', class: 'btn btn-small', text: 'Add' });
    add.setAttribute('aria-label', `Add ${meal.name} to the plan`);
    add.addEventListener('click', async () => {
      add.disabled = true;
      const result = await addPlanEntry({
        meal_id: meal.id,
        day_of_week: daySelect.value,
        slot: slotSelect.value,
        member_ids: planningFor()
      });
      add.disabled = false;
      if (destroyed) return;
      if (!result.ok) { showToast('That could not be added. Check your connection.'); return; }
      const dayLabelText = DAYS.find((d) => d.value === daySelect.value).label;
      announce(`${meal.name} added to ${dayLabelText}.`);
      const fresh = await listPlan();
      if (destroyed) return;
      if (fresh.ok) planByCell = groupByCell(fresh.data);
      renderStep();
    }, { signal });

    const controls = el('div', { class: 'plan-week-pick-controls' });
    controls.append(dayLabel, daySelect, slotLabel, slotSelect, add);
    item.appendChild(controls);
    return item;
  }

  function buildPlannedSoFar() {
    const box = el('section', { class: 'plan-week-planned' });
    box.appendChild(el('h2', { text: 'Planned so far' }));

    const list = el('ul', { class: 'plain-list' });
    let any = false;
    for (const day of DAYS) {
      for (const slot of SLOTS) {
        const entries = planByCell.get(`${day.value}|${slot.value}`) || [];
        for (const entry of entries) {
          any = true;
          const meal = entry.meals || entry.meal || {};
          const item = el('li', { class: 'state-row' });
          item.appendChild(el('span', {
            class: 'state-row-main',
            text: `${day.short} ${slot.label.toLowerCase()} — ${meal.name || 'Unknown'}`
          }));
          const remove = el('button', { type: 'button', class: 'btn btn-small', text: 'Remove' });
          remove.setAttribute('aria-label', `Remove ${meal.name} from ${day.label} ${slot.label}`);
          remove.addEventListener('click', async () => {
            const result = await removePlanEntry(entry.id);
            if (destroyed) return;
            if (!result.ok) { showToast('That could not be removed.'); return; }
            announce('Removed.');
            const fresh = await listPlan();
            if (destroyed) return;
            if (fresh.ok) planByCell = groupByCell(fresh.data);
            renderStep();
          }, { signal });
          item.appendChild(remove);
          list.appendChild(item);
        }
      }
    }

    if (!any) {
      // Not a warning, not a nudge. A statement of where you are.
      box.appendChild(el('p', { class: 'field-hint', text: 'Nothing yet.' }));
    } else {
      box.appendChild(list);
    }
    return box;
  }

  // ---- Step 3: what you need --------------------------------------------
  async function renderNeed() {
    body.appendChild(el('p', { class: 'field-hint', text: 'Working out what you need…' }));

    const [planResult, ingredientResult] = await Promise.all([listPlan(), listIngredients()]);
    if (destroyed) return;

    if (!planResult.ok || !ingredientResult.ok) {
      body.replaceChildren(el('p', {
        class: 'field-hint',
        text: 'Your shopping list could not be worked out just now. '
          + 'You can rebuild it from the Shopping screen when you are back online.'
      }));
      return;
    }

    const result = computeShortfall({
      plan: planResult.data,
      ingredients: ingredientResult.data,
      pantry: stock,
      foods,
      todayISO: todayIso(),
      householdMembers: members
    });
    shortfall = result.items;

    // Writing here rather than at the end is the point: leaving now still
    // leaves you with a correct list.
    const written = await replaceGeneratedItems(shortfall);
    if (destroyed) return;

    body.replaceChildren();

    if (!written.ok) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'The list could not be saved. Everything you planned is safe — '
          + 'rebuild the list from the Shopping screen when you are back online.'
      }));
      return;
    }

    if (shortfall.length === 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'Nothing to buy. You already have everything this week needs.'
      }));
      return;
    }

    const intro = el('p', { class: 'field-hint' });
    intro.textContent = `${shortfall.length} thing${shortfall.length === 1 ? '' : 's'} to buy. `
      + 'Anything you know you already have, tick off here rather than in the shop.';
    body.appendChild(intro);

    const list = el('ul', { class: 'plain-list' });
    for (const item of shortfall) {
      const row = el('li', { class: 'state-row' });
      row.appendChild(el('span', {
        class: 'state-row-main',
        text: `${item.food.name} — ${item.shortfall} ${item.unit}`
      }));
      list.appendChild(row);
    }
    body.appendChild(list);
  }

  // ---- Step 4: done ------------------------------------------------------
  function renderDone() {
    const planned = [...planByCell.values()].reduce((n, l) => n + l.length, 0);

    const summary = el('div', { class: 'plan-week-summary' });

    // Named mealLine, not meals: `meals` is the module-scope recipe list and
    // shadowing it here would be a trap for the next edit.
    const mealLine = el('p', { class: 'state-row' });
    const mealIcon = icon('plan');
    if (mealIcon) mealLine.appendChild(mealIcon);
    mealLine.appendChild(el('span', {
      class: 'state-row-main',
      text: `${planned} meal${planned === 1 ? '' : 's'} planned`
    }));
    summary.appendChild(mealLine);

    const shop = el('p', { class: 'state-row' });
    const shopIcon = icon('shopping');
    if (shopIcon) shop.appendChild(shopIcon);
    shop.appendChild(el('span', {
      class: 'state-row-main',
      text: `${shortfall.length} thing${shortfall.length === 1 ? '' : 's'} to buy`
    }));
    if (shortfall.length > 0) shop.appendChild(countChip(shortfall.length, 'things to buy'));
    summary.appendChild(shop);

    body.appendChild(summary);

    const link = el('a', { class: 'btn', href: '#/shopping', text: 'Open my shopping list' });
    body.appendChild(link);

    // Two planned meals is a finished week if that is what you wanted. The
    // app does not get an opinion about the number.
    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'You can change any of this later from the Weekly plan screen.'
    }));
  }

  loadEverything();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
