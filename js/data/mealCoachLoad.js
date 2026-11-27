// js/data/mealCoachLoad.js — 27 Nov 2026 v1
// Phase 39. What Help me choose reads: your meals, the library, the pantry,
// the household and the last fortnight's plan. Read once and kept for two
// minutes, so moving between the questions and the results is instant.
//
// Free reads this month's library recipes and every meal of yours, the same
// as the Community library page does. Hearth reads the whole library.

import { listPlan } from './mealPlan.js';
import { listMeals, listIngredients, groupByMeal } from './meals.js';
import { loadAllRecipes } from './recipeLibrary.js';
import { referenceBySlug } from './foodReference.js';
import { listStock, useSoon } from './pantry.js';
import { haveNames, normaliseName } from './recipeCoverage.js';
import { getHousehold } from './household.js';
import { loadHearth, isHearth, libraryThisMonth } from './hearth.js';
import { foodWeekDays, mondaysOf } from '../lib/foodWeek.js';
import { prepare, recentKeysFrom } from './weekShaper.js';
import { factsOf, markRecent } from './mealCoach.js';

const KEEP_MS = 2 * 60 * 1000;
let memo = null; // { at, value }

function isoToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Forget what was read, after planning or adding a meal. */
export function forgetCoachData() { memo = null; }

/**
 * @returns {Promise<{ facts: Array, members: Array, hearth: boolean,
 *   libraryShown: number, libraryAll: number, partial: boolean }>}
 */
export async function loadCoachData({ force = false } = {}) {
  if (!force && memo && Date.now() - memo.at < KEEP_MS) return memo.value;
  await loadHearth();
  const hearth = isHearth();
  const now = new Date();
  const weeks = [foodWeekDays(now, 0), foodWeekDays(now, -1), foodWeekDays(now, -2)];
  const mondays = [...new Set(weeks.flatMap(mondaysOf))];
  const [reads, mealList, ingredients, library, refMap, stock, household] = await Promise.all([
    Promise.all(mondays.map((m) => listPlan(m).then((r) => (r.ok ? (r.data || []).map((e) => (e.week_start ? e : { ...e, week_start: m })) : [])).catch(() => []))),
    listMeals().catch(() => ({ ok: false })),
    listIngredients().catch(() => ({ ok: false })),
    loadAllRecipes().catch(() => ({ ok: false })),
    referenceBySlug().catch(() => new Map()),
    listStock().catch(() => ({ ok: false })),
    getHousehold().catch(() => null)
  ]);
  let recipes = library && library.ok ? (library.data || []) : [];
  const libraryAll = recipes.length;
  if (!hearth) {
    const open = new Set(libraryThisMonth(recipes.map((r) => r.slug)));
    recipes = recipes.filter((r) => open.has(r.slug));
  }
  const stockRows = stock && stock.ok ? (stock.data || []) : [];
  const candidates = prepare({
    meals: mealList && mealList.ok ? (mealList.data || []) : [],
    recipes,
    ingredientsByMeal: ingredients && ingredients.ok ? groupByMeal(ingredients.data || []) : new Map(),
    referenceMap: refMap instanceof Map ? refMap : new Map(),
    haveSet: haveNames(stockRows, now.toISOString()),
    soonSet: new Set(useSoon(stockRows).map(({ row }) => normaliseName(row.foods && row.foods.name)))
  });
  const seen = new Set();
  const history = reads.flat().filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
  const facts = markRecent(candidates.map(factsOf), recentKeysFrom(history, isoToday(now)));
  const value = {
    facts,
    members: household && household.ok ? ((household.data && household.data.members) || []) : [],
    hearth,
    libraryShown: recipes.length,
    libraryAll,
    partial: !(library && library.ok) || !(mealList && mealList.ok) || Boolean(library && library.missing)
  };
  memo = { at: Date.now(), value };
  return value;
}

// ---- Answers kept between the two pages ----------------------------------------

const ANSWERS_KEY = 'home-os-coach-answers';

export function readSavedQuery(storage = globalThis.sessionStorage) {
  try { return (storage && storage.getItem(ANSWERS_KEY)) || ''; } catch { return ''; }
}

export function saveQuery(query, storage = globalThis.sessionStorage) {
  try { if (storage) storage.setItem(ANSWERS_KEY, query); } catch { /* private mode: the URL still carries them */ }
}
