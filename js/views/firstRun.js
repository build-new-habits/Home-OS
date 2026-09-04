// js/views/firstRun.js — 01 Sep 2026 v3
// v3 (worklist F8): resumable, same six-hour rule as Cook Mode.
// v2 (worklist A1): asks what you came for.
// Phase 27. The first ninety seconds.
//
// ---- Why a guided TASK and not a tour ----
// A carousel of screenshots teaches nothing. Nobody reads them, and the one
// person who does cannot map "here is the pantry" onto anything they wanted
// to do. A checklist of set-up chores is worse: it puts work between someone
// and the thing they downloaded the app for.
//
// So this does one real thing, end to end: pick a recipe, put it on a day,
// watch the shopping list fill itself in. At the end you have a meal
// planned and a list you can actually shop from. That is a demonstration
// nobody has to remember, because it left something behind.
//
// ---- What it must never do ----
// Imply you are behind if you skip. Nag. Block the app. Ask twice.
// Every screen here is skippable and the whole thing is dismissible
// forever, from the first step.

import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { icon } from '../lib/icons.js';
import { loadAllRecipes, addLibraryRecipe, describeAdd } from '../data/recipeLibrary.js';
import { addPlanEntry, DAYS, SLOTS } from '../data/mealPlan.js';
import { flushListSync, describeListSync } from '../data/listSync.js';
import { upsertSettings } from '../data/settings.js';
import { FOCUS_AREAS } from '../navConfig.js';

import { el } from '../lib/dom.js';
/** Marks it done. Failing to record it is not worth interrupting anyone. */
async function markDone() {
  clearFirstRunProgress();
  const result = await upsertSettings({ onboarded_at: new Date().toISOString() });
  if (!result.ok) console.error('Could not record onboarding:', result.error);
}

// Worklist F8. Cook Mode and Plan The Week both resume; this did not, which
// is an inconsistency somebody notices exactly when they can least afford
// it — halfway through, having been interrupted.
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
  let chosenRecipe = null;
  let createdMeal = null;
  let plannedDay = null;
  let listResult = null;
  let step = resumedRun ? Math.min(resumedRun.stepIndex, 3) : 0;

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

  // Dismissible forever, from the first step. Not buried at the end.
  const never = el('button', {
    type: 'button', class: 'btn first-run-dismiss', text: 'I will find my own way around'
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
    if (step === STEPS.length - 1) {
      await markDone();
      if (destroyed) return;
      window.location.hash = '#/dashboard';
      return;
    }
    go(step + 1);
  }, { signal });

  const STEPS = ['welcome', 'focus', 'pick', 'plan', 'done'];

  function go(index) {
    step = Math.max(0, Math.min(index, STEPS.length - 1));
    writeFirstRunProgress(step, runStartedAt);
    renderStep();
    heading.focus();
  }

  async function load() {
    body.replaceChildren(el('p', { class: 'field-hint', text: 'One moment…' }));
    const result = await loadAllRecipes();
    if (destroyed) return;
    recipes = result.ok ? result.data : [];
    renderStep();
  }

  function renderStep() {
    position.textContent = `Step ${step + 1} of ${STEPS.length}`;
    skip.hidden = step === STEPS.length - 1;
    next.textContent = step === STEPS.length - 1 ? 'Finish' : 'Next';
    body.replaceChildren();

    const key = STEPS[step];
    if (key === 'welcome') renderWelcome();
    else if (key === 'focus') renderFocus();
    else if (key === 'pick') renderPick();
    else if (key === 'plan') renderPlan();
    else renderDone();
  }

  // ---- 1. What this is, in one breath ------------------------------------
  function renderWelcome() {
    heading.textContent = 'Let us plan one meal together';
    body.appendChild(el('p', {
      text: 'It takes about a minute, and at the end you will have a meal planned '
        + 'and a shopping list you can actually use.'
    }));
    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Nothing here is a test and you can stop at any point. '
        + 'Anything you do is kept.'
    }));
  }

  // ---- 2. What did you come for? -----------------------------------------
  // Worklist A1. Sarah, three traces running: "I wanted to sort out dinner.
  // Why is it asking about my weight?"
  //
  // Asked ONCE, here, where somebody is deciding what this app is. Asking
  // later means they have already formed the impression this is meant to
  // prevent.
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
      // Everything ticked is the same as nothing ticked. Storing it empty
      // means an area added in a later version appears rather than being
      // silently excluded by a list written today.
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

  // ---- 3. Pick something --------------------------------------------------
  function renderPick() {
    heading.textContent = 'Pick something you fancy';

    if (recipes.length === 0) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'The recipe library could not be loaded just now. '
          + 'You can add your own meals on the Meals screen whenever you like.'
      }));
      return;
    }

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'These come with the app. You can add your own later.'
    }));

    const list = el('ul', { class: 'plain-list' });
    // Six is a choice; twenty is a decision. Keep it to a glance.
    for (const recipe of recipes.slice(0, 6)) {
      const item = el('li', { class: 'first-run-pick' });
      const button = el('button', { type: 'button', class: 'btn first-run-recipe' });
      button.appendChild(el('span', { class: 'first-run-recipe-name', text: recipe.name }));
      button.appendChild(el('span', {
        class: 'field-hint',
        text: `${recipe.cuisine} · ${recipe.steps.length} steps`
      }));
      button.setAttribute('aria-label', `Choose ${recipe.name}`);
      button.addEventListener('click', async () => {
        button.disabled = true;
        const added = await addLibraryRecipe(recipe);
        button.disabled = false;
        if (destroyed) return;
        if (!added.ok) { showToast(added.error.message); return; }
        chosenRecipe = recipe;
        createdMeal = added.data;
        // Say what it actually did. Nothing happens invisibly, even here.
        announce(describeAdd(added));
        go(step + 1);
      }, { signal });
      item.appendChild(button);
      list.appendChild(item);
    }
    body.appendChild(list);
  }

  // ---- 3. Put it on a day -------------------------------------------------
  function renderPlan() {
    heading.textContent = chosenRecipe
      ? `When would you like ${chosenRecipe.name}?`
      : 'When would you like it?';

    if (!createdMeal) {
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'No recipe chosen, which is fine. You can plan meals any time from the dashboard.'
      }));
      return;
    }

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'Pick a day. You can move it later, or take it off entirely.'
    }));

    const list = el('div', { class: 'first-run-days' });
    for (const day of DAYS) {
      const button = el('button', { type: 'button', class: 'btn', text: day.label });
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await addPlanEntry({
          meal_id: createdMeal.id,
          day_of_week: day.value,
          slot: chosenRecipe.default_slot || 'dinner'
        });
        if (destroyed) return;
        if (!result.ok) {
          button.disabled = false;
          showToast('That could not be saved. Check your connection.');
          return;
        }
        plannedDay = day.label;
        // The payoff: the list fills itself in, and they watch it happen.
        body.replaceChildren(el('p', { class: 'field-hint', text: 'Working out what you need…' }));
        listResult = await flushListSync();
        if (destroyed) return;
        go(step + 1);
      }, { signal });
      list.appendChild(button);
    }
    body.appendChild(list);
  }

  // ---- 4. What just happened ---------------------------------------------
  function renderDone() {
    heading.textContent = 'That is how it works';

    const summary = el('div', { class: 'plan-week-summary' });

    if (createdMeal) {
      const line = el('p', { class: 'state-row' });
      const mark = icon('meal');
      if (mark) line.appendChild(mark);
      line.appendChild(el('span', {
        class: 'state-row-main',
        text: plannedDay
          ? `${createdMeal.name} is planned for ${plannedDay}.`
          : `${createdMeal.name} is in your meals.`
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
        text: 'You skipped through, which is completely fine. Everything is on the dashboard.'
      }));
    }

    body.appendChild(summary);

    body.appendChild(el('p', {
      text: 'That is the whole idea: plan what you want to eat, and the shopping list '
        + 'works itself out. Scan things as you put them away and it stays right.'
    }));

    body.appendChild(el('p', {
      class: 'field-hint',
      text: 'You can run this again from Settings if it is useful.'
    }));

    if (listResult && listResult.ok && listResult.count > 0) {
      body.appendChild(el('a', {
        class: 'btn', href: '#/shopping', text: 'See my shopping list'
      }));
    }
  }

  load();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
