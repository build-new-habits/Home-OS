// js/data/listSync.js — 01 Sep 2026 v2
// Phase 22. The shopping list follows the plan on its own.
//
// ---- The defect ----
// Putting a meal in the plan wrote one row and nothing else. The list only
// changed when you went to a different screen and pressed a button you had
// to know about. A shopping list that silently disagrees with your plan is
// exactly what this app exists to prevent, and for someone with
// executive-function differences a hidden manual step on another screen is
// the same as no feature at all.
//
// ---- Why it was manual, and why that no longer holds ----
// Recomputing means reading plan + ingredients + pantry + foods. Doing that
// on every tap while laying out a week is six or seven full reads in a
// minute. The answer is not to make the user do it: the answer is to
// debounce.
//
// ---- What it never does ----
// It never touches anything you added yourself. replaceGeneratedItems()
// only replaces `source = 'meal_plan'` rows, so a `usual` staple or a
// holiday item survives untouched. That is asserted by a test.

import { listPlan } from './mealPlan.js';
import { listIngredients } from './meals.js';
import { listStock, todayIso } from './pantry.js';
import { listFoods } from './foods.js';
import { replaceGeneratedItems } from './shopping.js';
import { getHousehold } from './household.js';
import { computeShortfall } from '../lib/shortfall.js';
import { isOffline } from '../lib/net.js';
import { addDueStaples } from './staples.js';

/** Long enough to swallow a burst of edits, short enough to feel immediate. */
const DEBOUNCE_MS = 2500;

let timer = null;
let running = false;
let queuedAgain = false;
const listeners = new Set();

/**
 * Subscribe to results. Views use this to say what happened rather than
 * changing the list under someone in silence.
 *
 * @param {(result: { ok: boolean, count?: number, reason?: string }) => void} fn
 */
export function onListSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(result) {
  for (const fn of listeners) {
    try { fn(result); } catch (error) { console.error('List sync listener failed:', error); }
  }
}

/**
 * Asks for a recompute soon.
 *
 * Every call cancels the previous timer, so a burst of edits while laying
 * out a week produces ONE recompute rather than seven.
 */
export function requestListSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; syncNow(); }, DEBOUNCE_MS);
}

/** Runs it immediately — for leaving the plan screen, or a manual button. */
export function flushListSync() {
  if (timer) { clearTimeout(timer); timer = null; }
  return syncNow();
}

/** True when a recompute is pending, so a view can say the list is stale. */
export function listSyncPending() {
  return timer !== null || running;
}

export async function syncNow() {
  // Offline: skip and say so. Writing a list computed from a plan whose
  // last change never reached the server would produce a wrong list with
  // no sign that it was wrong.
  if (isOffline()) {
    const result = { ok: false, reason: 'offline' };
    emit(result);
    return result;
  }

  // Never two at once. A second run overlapping the first could interleave
  // its delete and insert with the first one's.
  if (running) { queuedAgain = true; return { ok: false, reason: 'busy' }; }
  running = true;

  try {
    const [plan, ingredients, pantry, foods, household] = await Promise.all([
      listPlan(), listIngredients(), listStock(), listFoods(), getHousehold()
    ]);

    if (!plan.ok || !ingredients.ok || !pantry.ok || !foods.ok) {
      const result = { ok: false, reason: 'read-failed' };
      emit(result);
      return result;
    }

    const { items } = computeShortfall({
      plan: plan.data,
      ingredients: ingredients.data,
      pantry: pantry.data,
      foods: foods.data,
      todayISO: todayIso(),
      householdMembers: household.ok ? household.data.members : []
    });

    const written = await replaceGeneratedItems(items);

    // Phase 25. Anything below its reorder point joins the list at the same
    // moment. Written as `usual`, not `meal_plan`, so the next rebuild does
    // not sweep it away again.
    if (written.ok) {
      const staples = await addDueStaples();
      if (!staples.ok) console.error('Could not add running-low staples:', staples.error);
    }

    if (!written.ok) {
      const result = { ok: false, reason: 'write-failed' };
      emit(result);
      return result;
    }

    const result = { ok: true, count: items.length };
    emit(result);
    return result;
  } finally {
    running = false;
    if (queuedAgain) { queuedAgain = false; requestListSync(); }
  }
}

/** What to tell the person. Never silent, never alarming. */
export function describeListSync(result) {
  if (!result) return '';
  if (result.ok) {
    if (result.count === 0) return 'Shopping list updated — nothing to buy.';
    return `Shopping list updated — ${result.count} thing${result.count === 1 ? '' : 's'} to buy.`;
  }
  if (result.reason === 'offline') {
    return 'Your list will update when you are back online.';
  }
  if (result.reason === 'busy') return '';
  return 'Your list could not be updated just now. Rebuild it from the Shopping screen.';
}
