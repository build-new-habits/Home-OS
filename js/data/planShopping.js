// js/data/planShopping.js — 08 Sep 2026 v1
//
// Turning a week's plan into a shopping list.
//
// ---- Why this is its own module ----
// This was written inline in shopping.js, where the "Build from the plan"
// button lives. Next week now needs the same thing from a different screen,
// and the one thing that must not happen is two copies of it: the shortfall
// maths is the app's central automation — plan, minus pantry, equals list —
// and two versions that drift would produce two different answers to the
// same question depending on which button you pressed.
//
// ---- What it does NOT do ----
// It does not decide anything. Counting what will be destroyed, asking, and
// telling the person what happened all stay in the view, because those are
// conversations and this is arithmetic.

import { listPlan } from './mealPlan.js';
import { listIngredients } from './meals.js';
import { listStock } from './pantry.js';
import { listFoods } from './foods.js';
import { getHousehold } from './household.js';
import { replaceGeneratedItems } from './shopping.js';
import { computeShortfall } from '../lib/shortfall.js';
import { todayIso } from '../lib/dates.js';

/**
 * Reads everything a build needs for one week.
 *
 * @param {string} weekStart Monday, ISO. Required — a default here would be
 *   the quiet kind of bug this whole change exists to prevent: next week's
 *   button silently building this week's list.
 */
export async function gatherForWeek(weekStart) {
  const [plan, ingredients, pantry, foodList] = await Promise.all([
    listPlan(weekStart), listIngredients(), listStock(), listFoods()
  ]);

  // A failed household read is not fatal. An empty member list falls back to
  // each meal's own default_serves, which is the behaviour from before
  // portions existed — a smaller list, never a wrong one.
  const household = await getHousehold();

  if (!plan.ok || !ingredients.ok || !pantry.ok || !foodList.ok) {
    return {
      ok: false,
      error: plan.error || ingredients.error || pantry.error || foodList.error
    };
  }

  const { items, skipped } = computeShortfall({
    plan: plan.data,
    ingredients: ingredients.data,
    pantry: pantry.data,
    foods: foodList.data,
    todayISO: todayIso(),
    householdMembers: household.ok ? household.data.members : []
  });

  return { ok: true, data: { items, skipped, planned: plan.data.length } };
}

/**
 * Builds one week's plan into the shopping list, replacing whatever the
 * last build produced. Staples, holiday items and anything you added by
 * hand are untouched — that is `replaceGeneratedItems`' contract, not
 * something this function decides.
 *
 * Returns `{ ok, data: { items, skipped } }` so the caller can say what
 * happened. On a partial failure it reports which stage, because "the old
 * list was cleared but the new one failed" needs different words from
 * "nothing was changed".
 */
export async function buildWeekIntoList(weekStart) {
  const gathered = await gatherForWeek(weekStart);
  if (!gathered.ok) return gathered;

  const { items, skipped } = gathered.data;
  const written = await replaceGeneratedItems(items);
  if (!written.ok) return { ok: false, error: written.error, stage: written.stage };

  return { ok: true, data: { items, skipped } };
}
