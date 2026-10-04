// js/views/firstRun.js — 04 Oct 2026 v5
// v5 (persona re-trace 3): about the person first. In the kitchen app it
// asks who you cook for and whether anyone eats differently, then offers six
// quick dinners that suit (not the first six in the file), then a day
// counted from today (Today, Tomorrow, …) in the right week, then offers to
// fill the rest of the week. One way out ("Not now"), not two. Choosing a
// recipe then pressing Next no longer skips the day: the day step has no
// Next. Finishing updates the app's settings at once, so Today stops
// offering the walk-through without a reload. No talk of scanning.
// v4: no 'focus' step while KITCHEN_ONLY (K2).
// v3 (worklist F8): resumable, same six-hour rule as Cook Mode.
// v2 (worklist A1): asks what you came for.
// Phase 27. The first ninety seconds.
//
// ---- Why a guided TASK and not a tour ----
// A carousel of screenshots teaches nothing. So this does one real thing,
// end to end: pick a recipe, put it on a day, watch the shopping list fill
// itself in. At the end you have a meal planned and a list you can shop
// from — a demonstration that left something behind.
//
// ---- What it must never do ----
// Imply you are behind if you skip. Nag. Block the app. Ask twice.
// Every screen is skippable and the whole thing is dismissible forever,
// from the first step.

import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { icon } from '../lib/icons.js';
import { loadAllRecipes, addLibraryRecipe, describeAdd } from '../data/recipeLibrary.js';
import { addPlanEntry } from '../data/mealPlan.js';
import { flushListSync, describeListSync } from '../data/listSync.js';
import { upsertSettings } from '../data/settings.js';
import { getHousehold, addMember, updateMember, DIETARY_TAGS } from '../data/household.js';
import { candidatesFrom, householdDiet, starterDinners, nextSevenDays, WEEKDAY_MAX_MINUTES } from '../data/weekIdeas.js';
import { setSettings, getState } from '../lib/store.js';
import { FOCUS_AREAS, KITCHEN_ONLY } from '../navConfig.js';

import { el } from '../lib/dom.js';

/** Marks it done, and tells the rest of the app straight away. */
async function markDone() {
  clearFirstRunProgress();
  const result = await upsertSettings({ onboarded_at: new Date().toISOString() });
  if (!result.ok) { console.error('Could not record onboarding:', result.error); return; }
  setSettings({ ...(getState().settings || {}), ...result.data });
}

// Worklist F8: resumes within six hours, like Cook Mode.
const FIRST_RUN_KEY = 'home-os:first-run';
const RESUME_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function readFirstRunProgress() {
  try {
    const raw = window.localStorage.getItem(FIRST_RUN_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - Number(saved.startedAt || 0) > RESUME_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function writeFirstRunProgress(stepIndex, startedAt) {
  try {
    window.localStorage.setItem(FIRST_RUN_KEY, JSON.stringify({ stepIndex, startedAt }));
  } catch { /* a full store must not stop somebody starting */ }
}

function clearFirstRunProgress() {
  try { window.localStorage.removeItem(FIRST_RUN_KEY); } catch { /* nothing to do */ }
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const resumedRun = readFirstRunProgress();
  const runStartedAt = resumedRun ? resumedRun.startedAt : Date.now();

  let recipes = [];
  let members = [];
  let diet = new Set();
  let chosenRecipe = null;
  let createdMeal = null;
  let plannedDay = null;
  let listResult = null;

  // Kitchen rebuild K2: no 'focus' step while the other areas are parked.
  // v5: the kitchen app starts with who you cook for.
  const STEPS = KITCHEN_ONLY ? ['who', 'pick', 'plan', 'done'] : ['welcome', 'focus', 'pick', 'plan', 'done'];
  let step = resumedRun ? Math.min(resumedRun.stepIndex, STEPS.length - 1) : 0;
  // A resumed run has lost its chosen recipe; go back to choosing one.
  if (STEPS[step] === 'plan' || STEPS[step] === 'done') step = STEPS.indexOf('pick');

  mountEl.replaceChildren();

  const heading = el('h1', { id: 'first-run-heading', tabindex: '-1' });
  const position = el('p', { class: 'plan-week-position' });
  mountEl.append(heading, position);

  const body = el('div', { class: 'first-run-body' });
  mountEl.appendChild(body);

  const nav = el('div', { class: 'plan-week-nav' });
  const skip = el('button', { type: 'button', class: 'btn', text: 'Skip this' });
  const next = el('button', { type: 'button', class: 'btn btn-primary btn-large', text: 'Next' });
  nav.append(skip, next);
  mountEl.appendChild(nav);
  // One way out in the kitchen app: "Not now" below. Skip stays for the
  // full app's focus question.
  if (KITCHEN_ONLY) skip.remove();

  // Dismissible forever, from the first step. Not buried at the end.
  const never = el('button', {
    type: 'button', class: 'btn first-run-dismiss',
    text: KITCHEN_ONLY ? 'Not now' : 'I will find my own way around'
  });
  never.addEventListener('click', async () => {
    await markDone();
    if (destroyed) return;
    showToast('No problem. You can find this again in Settings.');
    window.location.hash = '#/dashboard';
  }, { signal });
  mountEl.appendChild(never);

  skip.addEventListener('click', () => go(step + 1), { signal });
  next.addEventListener('click', async () => {
    if (STEPS[step] === 'who') { await saveWho(); return; }
    if (step === STEPS.length - 1) {
      await markDone();
      if (destroyed) return;
      window.location.hash = '#/dashboard';
      return;
    }
    go(step + 1);
  }, { signal });

  function go(index) {
    step = Math.max(0, Math.min(index, STEPS.length - 1));
    writeFirstRunProgress(step, runStartedAt);
    renderStep();
    heading.focus();
  }

  async function load() {
    body.replaceChildren(el('p', { class: 'field-hint', text: 'One moment…' }));
    const [result, household] = await Promise.all([loadAllRecipes(), getHousehold().catch(() => null)]);
    if (destroyed) return;
    recipes = result.ok ? result.data : [];
    members = household && household.ok ? (household.data.members || []) : [];
    diet = householdDiet(members);
    renderStep();
  }

  function renderStep() {
    position.textContent = `Step ${step + 1} of ${STEPS.length}`;
    skip.hidden = step === STEPS.length - 1;
    next.textContent = step === STEPS.length - 1 ? 'Finish' : 'Next';
    // Choosing a day IS the step; a Next here used to skip it by accident.
    next.hidden = STEPS[step] === 'plan' && Boolean(createdMeal);
    never.hidden = step === STEPS.length - 1;
    body.replaceChildren();

    const key = STEPS[step];
    if (key === 'who') renderWho();
    else if (key === 'welcome') renderWelcome();
    else if (key === 'focus') renderFocus();
    else if (key === 'pick') renderPick();
    else if (key === 'plan') renderPlan();
    else renderDone();
  }

  // ---- 1 (kitchen). Who do you cook for? ---------------------------------
  // Two questions, both changing what comes next: portions start at the
  // household's size, and every idea suits the whole table.
  let wantCount = 1;
  let wantDiet = new Set();
  function renderWho() {
    heading.textContent = 'Who do you cook for?';
    body.appendChild(el('p', {
      text: 'Two quick questions, then we plan a meal together and your shopping list writes itself.'
    }));

    wantCount = Math.max(1, members.length || 1);
    wantDiet = new Set(diet);

    const howMany = el('fieldset', { class: 'first-run-fieldset' });
    howMany.appendChild(el('legend', { text: 'How many usually eat' }));
    const chips = el('div', { class: 'first-run-choices' });
    [[1, 'Just me'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']].forEach(([n, label]) => {
      const id = `first-count-${n}`;
      // The whole chip is the label, so a tap anywhere on it counts.
      const wrap = el('label', { class: 'first-run-choice', for: id });
      const radio = el('input', { type: 'radio', name: 'first-count', id, value: String(n) });
      radio.checked = n === Math.min(6, wantCount);
      radio.addEventListener('change', () => { if (radio.checked) wantCount = n; }, { signal });
      wrap.append(radio, el('span', { text: label }));
      chips.appendChild(wrap);
    });
    howMany.appendChild(chips);
    body.appendChild(howMany);

    const eats = el('fieldset', { class: 'first-run-fieldset' });
    eats.appendChild(el('legend', { text: 'Does anyone eat differently? (optional)' }));
    eats.appendChild(el('p', { class: 'field-hint', text: 'Every idea will suit everyone. You can change this in Settings.' }));
    const boxes = el('div', { class: 'first-run-choices' });
    for (const tag of DIETARY_TAGS) {
      const id = `first-diet-${tag.value}`;
      const wrap = el('label', { class: 'first-run-choice', for: id });
      const box = el('input', { type: 'checkbox', id, value: tag.value });
      box.checked = wantDiet.has(tag.value);
      box.addEventListener('change', () => {
        if (box.checked) wantDiet.add(tag.value); else wantDiet.delete(tag.value);
      }, { signal });
      wrap.append(box, el('span', { text: tag.label }));
      boxes.appendChild(wrap);
    }
    eats.appendChild(boxes);
    body.appendChild(eats);

    if (members.length > 1) {
      body.appendChild(el('p', { class: 'field-hint', text: `Your household already has ${members.length} people. Names and portions are in Settings.` }));
    }
  }

  async function saveWho() {
    next.disabled = true;
    try {
      // Add people up to the number given. Never removes anyone: taking a
      // person out is a decision for Settings, with its confirm step.
      for (let n = members.length + 1; n <= wantCount; n += 1) {
        const added = await addMember({ display_name: `Person ${n}`, role: 'adult' });
        if (destroyed) return;
        if (!added.ok) { showToast('Someone could not be added. You can do it in Settings.'); break; }
      }
      // The diet goes on you: one person's needs set the table's (weekIdeas).
      const meId = members[0] && members[0].id;
      const sameDiet = wantDiet.size === diet.size && [...wantDiet].every((t) => diet.has(t));
      if (meId && !sameDiet) {
        const updated = await updateMember(meId, { dietary_tags: [...wantDiet] });
        if (destroyed) return;
        if (!updated.ok) showToast('That could not be saved, but nothing is lost.');
      }
      const fresh = await getHousehold({ force: true }).catch(() => null);
      if (destroyed) return;
      if (fresh && fresh.ok) members = fresh.data.members || members;
      diet = new Set(wantDiet);
      announce(wantCount === 1 ? 'Cooking for one.' : `Cooking for ${wantCount}.`);
      go(step + 1);
    } finally {
      next.disabled = false;
    }
  }

  // ---- 1 (full app). What this is, in one breath --------------------------
  function renderWelcome() {
    heading.textContent = 'Let us plan one meal together';
    body.appendChild(el('p', {
      text: 'It takes about a minute, and at the end you will have a meal planned '
        + 'and a shopping list you can actually use.'
    }));
    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Nothing here is a test and you can stop at any point. Anything you do is kept.'
    }));
  }

  // ---- 2 (full app). What did you come for? -------------------------------
  function renderFocus() {
    heading.textContent = 'What would you like to sort out?';
    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Pick what you want now. Everything else is still there — this only '
        + 'decides what sits in the bar at the bottom, and you can change it any time.'
    }));

    const chosen = new Set();
    const list = el('ul', { class: 'plain-list' });
    for (const area of FOCUS_AREAS) {
      const item = el('li', { class: 'checkbox-row' });
      const box = el('input', { type: 'checkbox', id: `first-focus-${area.value}` });
      const label = el('label', { for: box.id });
      label.appendChild(el('span', { class: 'first-run-recipe-name', text: area.label }));
      label.appendChild(el('span', { class: 'field-hint', text: area.blurb }));
      box.addEventListener('change', () => {
        if (box.checked) chosen.add(area.value); else chosen.delete(area.value);
      }, { signal });
      item.append(box, label);
      list.appendChild(item);
    }
    body.appendChild(list);

    const save = el('button', { type: 'button', class: 'btn', text: 'Use these' });
    save.addEventListener('click', async () => {
      const areas = chosen.size === FOCUS_AREAS.length ? [] : [...chosen];
      const result = await upsertSettings({ focus_areas: areas });
      if (destroyed) return;
      if (!result.ok) { showToast('That could not be saved, but nothing is lost.'); }
      announce(areas.length === 0 ? 'Showing everything.' : 'Saved.');
      go(step + 1);
    }, { signal });
    body.appendChild(save);

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Skipping this shows you everything, which is the normal setting.'
    }));
  }

  // ---- Pick something -----------------------------------------------------
  function renderPick() {
    heading.textContent = 'Pick a dinner you fancy';

    if (recipes.length === 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'The recipe library could not be loaded just now. '
          + 'You can add your own recipes from Recipes whenever you like.'
      }));
      return;
    }

    const words = DIETARY_TAGS.filter((t) => diet.has(t.value)).map((t) => t.label.toLowerCase());
    body.appendChild(el('p', {
      class: 'field-hint',
      text: `${WEEKDAY_MAX_MINUTES} minutes or less${words.length ? `, and all ${words.join(' and ')}` : ''}. There are more in Recipes.`
    }));

    const list = el('ul', { class: 'plain-list' });
    // Six is a choice; twenty is a decision. Keep it to a glance.
    for (const recipe of starterDinners(recipes, diet)) {
      const item = el('li', { class: 'first-run-pick' });
      const button = el('button', { type: 'button', class: 'btn first-run-recipe' });
      button.appendChild(el('span', { class: 'first-run-recipe-name', text: recipe.name }));
      const minutes = candidatesFrom({ recipes: [recipe] })[0].minutes;
      button.appendChild(el('span', {
        class: 'field-hint',
        text: [recipe.cuisine, minutes ? `${minutes} min` : ''].filter(Boolean).join(' · ')
      }));
      button.setAttribute('aria-label', `Choose ${recipe.name}`);
      button.addEventListener('click', async () => {
        button.disabled = true;
        const added = await addLibraryRecipe(recipe);
        button.disabled = false;
        if (destroyed) return;
        if (!added.ok && !added.existing) { showToast(added.error.message); return; }
        chosenRecipe = recipe;
        createdMeal = added.ok ? added.data : added.existing;
        if (added.ok) announce(describeAdd(added));
        go(step + 1);
      }, { signal });
      item.appendChild(button);
      list.appendChild(item);
    }
    body.appendChild(list);

    if (KITCHEN_ONLY) {
      const whole = el('p', { class: 'first-run-whole' });
      whole.appendChild(el('a', { class: 'btn btn-block', href: '#/plan-this-week?fill=1', text: 'Or plan the whole week for me' }));
      whole.querySelector('a').addEventListener('click', () => { markDone(); }, { signal });
      body.appendChild(whole);
    }
  }

  // ---- Put it on a day ----------------------------------------------------
  function renderPlan() {
    heading.textContent = chosenRecipe
      ? `When would you like ${chosenRecipe.name}?`
      : 'When would you like it?';

    if (!createdMeal) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'No recipe chosen, which is fine. You can plan meals any time from Plan.'
      }));
      return;
    }

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'You can move it later, or take it off entirely.'
    }));

    const list = el('div', { class: 'first-run-days' });
    for (const day of nextSevenDays()) {
      const button = el('button', { type: 'button', class: 'btn', text: day.label });
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await addPlanEntry({
          meal_id: createdMeal.id,
          day_of_week: day.day,
          slot: chosenRecipe.default_slot || 'dinner',
          week_start: day.weekStart
        });
        if (destroyed) return;
        if (!result.ok) {
          button.disabled = false;
          showToast('That could not be saved. Check your connection.');
          return;
        }
        plannedDay = day.offset <= 1 ? day.label.toLowerCase() : day.dayName;
        // The payoff: the list fills itself in, and they watch it happen.
        body.replaceChildren(el('p', { class: 'field-hint', text: 'Working out what you need…' }));
        listResult = await flushListSync();
        if (destroyed) return;
        go(step + 1);
      }, { signal });
      list.appendChild(button);
    }
    body.appendChild(list);

    const later = el('button', { type: 'button', class: 'btn first-run-later', text: 'Plan it later' });
    later.addEventListener('click', () => go(step + 1), { signal });
    body.appendChild(later);
  }

  // ---- What just happened ---------------------------------------------
  function renderDone() {
    heading.textContent = plannedDay ? 'Planned' : 'That is how it works';

    const summary = el('div', { class: 'plan-week-summary' });

    if (createdMeal) {
      const line = el('p', { class: 'state-row' });
      const mark = icon('meal');
      if (mark) line.appendChild(mark);
      line.appendChild(el('span', {
        class: 'state-row-main',
        text: plannedDay
          ? `${createdMeal.name} is planned for ${plannedDay}.`
          : `${createdMeal.name} is saved in your recipes.`
      }));
      summary.appendChild(line);
    }

    if (listResult && listResult.ok) {
      const line = el('p', { class: 'state-row' });
      const mark = icon('shopping');
      if (mark) line.appendChild(mark);
      line.appendChild(el('span', {
        class: 'state-row-main', text: describeListSync(listResult)
      }));
      summary.appendChild(line);
    }

    if (summary.children.length === 0) {
      summary.appendChild(el('p', {
        class: 'field-hint',
        text: KITCHEN_ONLY ? 'Nothing planned yet, which is fine.' : 'You skipped through, which is completely fine. Everything is on the dashboard.'
      }));
    }

    body.appendChild(summary);

    body.appendChild(el('p', {
      text: KITCHEN_ONLY
        ? 'That is the whole idea: plan what you want to eat, and the shopping list works itself out. Tick things off in the shop and they go into the pantry.'
        : 'That is the whole idea: plan what you want to eat, and the shopping list works itself out. Scan things as you put them away and it stays right.'
    }));

    if (KITCHEN_ONLY) {
      const fill = el('a', { class: 'btn btn-primary btn-block', href: '#/plan-this-week?fill=1', text: 'Fill the rest of the week for me' });
      fill.addEventListener('click', () => { markDone(); }, { signal });
      body.appendChild(fill);
    }

    if (listResult && listResult.ok && listResult.count > 0) {
      const see = el('a', { class: 'btn btn-block', href: '#/shopping', text: 'See my shopping list' });
      see.addEventListener('click', () => { markDone(); }, { signal });
      body.appendChild(see);
    }

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'You can run this again from Settings.'
    }));
    // On the last page Finish is not the main thing; the week is.
    if (KITCHEN_ONLY) next.classList.remove('btn-primary');
  }

  load();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
