// js/data/meals.js — 21 Aug 2026 v1
// All Supabase access for `meals` and `meal_ingredients`, plus the macro
// maths. Shared data-access contract: { ok, data|error }, error always
// checked, nothing thrown at views, no user_id on inserts.
//
// ---- Macros are computed, never stored ----
// foods stores macros per 100 g; meal_ingredients.quantity_g is grams, so a
// meal's total is sum(quantity_g / 100 * per_100g_value).
//
// There is no column for a total and one must not be added: the schema is
// frozen, and a stored total silently rots the moment an ingredient's
// quantity or a food's nutrition data changes. computeMacros() runs on
// every read. It is a pure function of its arguments, which is what makes
// it testable against a hand calculation.
//
// A null macro is INCOMPLETE, NOT ZERO. A food added by hand with no
// nutrition data must not quietly drag a meal's protein total down to a
// confidently wrong number. Every result carries how many ingredients
// contributed nothing, so the view can say "2 of 5 ingredients have no
// nutrition data" instead of reporting a figure it cannot stand behind.
//
// ---- Offline ----
// Meal writes are NOT queued, unlike foods. A meal insert must return a real
// id before its ingredients can reference it, and a queued insert has no id
// — the rows would be orphaned. Building a meal is a kitchen-table action
// anyway, so the view says so plainly when offline rather than pretending
// (build conventions §9: "may require connectivity — if offline, say so
// clearly in the UI; never fail silently").

import { supabase } from '../supabaseClient.js';

const MEALS = 'meals';
const INGREDIENTS = 'meal_ingredients';

/** Our four macro fields, mapped from the foods column to the total's key. */
const MACROS = [
  { column: 'calories_per_100g', key: 'calories', label: 'Calories', unit: 'kcal' },
  { column: 'protein_g', key: 'protein_g', label: 'Protein', unit: 'g' },
  { column: 'fat_g', key: 'fat_g', label: 'Fat', unit: 'g' },
  { column: 'carbs_g', key: 'carbs_g', label: 'Carbohydrate', unit: 'g' }
];

export { MACROS };

export async function listMeals() {
  const { data, error } = await supabase
    .from(MEALS)
    .select('*')
    .order('name', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Ingredients with their food embedded. Pass a mealId for one meal, or
 * omit it for every meal at once.
 *
 * The no-argument form exists so a screen showing N meals costs ONE query
 * rather than N+1 — group the result with groupByMeal(). PostgREST resolves
 * the embed through the foreign key; RLS applies to both tables
 * independently, so this returns only the user's own rows either way.
 */
export async function listIngredients(mealId) {
  let query = supabase
    .from(INGREDIENTS)
    .select('id, meal_id, food_id, quantity_g, foods(id, name, barcode, calories_per_100g, protein_g, fat_g, carbs_g)')
    .order('created_at', { ascending: true });
  if (mealId) query = query.eq('meal_id', mealId);
  const { data, error } = await query;
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** Ingredient rows keyed by meal_id. */
export function groupByMeal(ingredients) {
  const map = new Map();
  for (const row of ingredients || []) {
    if (!map.has(row.meal_id)) map.set(row.meal_id, []);
    map.get(row.meal_id).push(row);
  }
  return map;
}

export async function createMeal({ name, default_serves = 4 }) {
  const title = String(name || '').trim();
  if (!title) return { ok: false, error: new Error('A meal needs a name.') };
  const serves = Number(default_serves);
  if (!Number.isInteger(serves) || serves < 1) {
    return { ok: false, error: new Error('Servings must be a whole number, 1 or more.') };
  }
  const { data, error } = await supabase
    .from(MEALS)
    .insert({ name: title, default_serves: serves })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateMeal(mealId, { name, default_serves } = {}) {
  const patch = {};
  if (name !== undefined) {
    const title = String(name).trim();
    if (!title) return { ok: false, error: new Error('A meal needs a name.') };
    patch.name = title;
  }
  if (default_serves !== undefined) {
    const serves = Number(default_serves);
    if (!Number.isInteger(serves) || serves < 1) {
      return { ok: false, error: new Error('Servings must be a whole number, 1 or more.') };
    }
    patch.default_serves = serves;
  }
  const { data, error } = await supabase
    .from(MEALS)
    .update(patch)
    .eq('id', mealId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Dependent count for the restrict-delete confirm (schema.md §2).
 * weekly_meal_plan.meal_id is ON DELETE RESTRICT, so the database will
 * refuse this delete — the count has to be reported before the attempt.
 */
export async function countPlanEntries(mealId) {
  const { count, error } = await supabase
    .from('weekly_meal_plan')
    .select('id', { count: 'exact', head: true })
    .eq('meal_id', mealId);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

export async function deleteMeal(mealId) {
  // meal_ingredients cascade with the meal (schema.md §2), so they go too —
  // the view names that in the confirm rather than deleting them silently.
  const { error } = await supabase.from(MEALS).delete().eq('id', mealId);
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function countIngredients(mealId) {
  const { count, error } = await supabase
    .from(INGREDIENTS)
    .select('id', { count: 'exact', head: true })
    .eq('meal_id', mealId);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

export async function addIngredient({ meal_id, food_id, quantity_g }) {
  const grams = Number(quantity_g);
  if (!Number.isFinite(grams) || grams <= 0) {
    return { ok: false, error: new Error('Enter a quantity in grams, greater than zero.') };
  }
  if (!meal_id || !food_id) {
    return { ok: false, error: new Error('Pick a meal and a food first.') };
  }
  const { data, error } = await supabase
    .from(INGREDIENTS)
    .insert({ meal_id, food_id, quantity_g: Math.round(grams * 100) / 100 })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateIngredient(ingredientId, { quantity_g }) {
  const grams = Number(quantity_g);
  if (!Number.isFinite(grams) || grams <= 0) {
    return { ok: false, error: new Error('Enter a quantity in grams, greater than zero.') };
  }
  const { data, error } = await supabase
    .from(INGREDIENTS)
    .update({ quantity_g: Math.round(grams * 100) / 100 })
    .eq('id', ingredientId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeIngredient(ingredientId) {
  const { error } = await supabase.from(INGREDIENTS).delete().eq('id', ingredientId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * Totals and per-serving figures for a set of ingredients.
 *
 * PURE — no network, no clock, no globals. Every argument is data and the
 * result depends on nothing else, so it can be checked against a hand
 * calculation, which is exactly what the Phase 6 smoke test asks for.
 *
 * @param {Array} ingredients rows from listIngredients(); each needs
 *        `quantity_g` and an embedded `foods` object (or `food`).
 * @param {{ serves?: number }} [opts] servings to divide by; defaults to 1.
 * @returns {{
 *   serves: number,
 *   ingredientCount: number,
 *   totals: Record<string, number>,
 *   perServing: Record<string, number>,
 *   complete: Record<string, boolean>,
 *   missingByField: Record<string, number>,
 *   incompleteCount: number,
 *   incompleteNames: string[]
 * }}
 */
export function computeMacros(ingredients, { serves = 1 } = {}) {
  const rows = Array.isArray(ingredients) ? ingredients : [];
  const divisor = Number.isFinite(Number(serves)) && Number(serves) > 0 ? Number(serves) : 1;

  const totals = {};
  const missingByField = {};
  const complete = {};
  for (const macro of MACROS) {
    totals[macro.key] = 0;
    missingByField[macro.key] = 0;
    complete[macro.key] = true;
  }

  const incompleteNames = [];

  for (const row of rows) {
    const food = row.foods || row.food || {};
    const grams = Number(row.quantity_g);
    const usableGrams = Number.isFinite(grams) && grams > 0 ? grams : 0;
    let rowMissing = false;

    for (const macro of MACROS) {
      const per100 = food[macro.column];
      // null / undefined / '' are all "no data". Zero is a real value:
      // water genuinely has zero protein and must not be treated as unknown.
      if (per100 === null || per100 === undefined || per100 === '') {
        missingByField[macro.key] += 1;
        complete[macro.key] = false;
        rowMissing = true;
        continue;
      }
      const value = Number(per100);
      if (!Number.isFinite(value)) {
        missingByField[macro.key] += 1;
        complete[macro.key] = false;
        rowMissing = true;
        continue;
      }
      totals[macro.key] += (usableGrams / 100) * value;
    }

    if (rowMissing) {
      incompleteNames.push(food.name || 'an unnamed food');
    }
  }

  const perServing = {};
  for (const macro of MACROS) {
    totals[macro.key] = Math.round(totals[macro.key] * 10) / 10;
    perServing[macro.key] = Math.round((totals[macro.key] / divisor) * 10) / 10;
  }

  return {
    serves: divisor,
    ingredientCount: rows.length,
    totals,
    perServing,
    complete,
    missingByField,
    incompleteCount: incompleteNames.length,
    incompleteNames
  };
}
