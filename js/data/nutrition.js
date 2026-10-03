// js/data/nutrition.js — 03 Oct 2026 v2
// v2: an incomplete figure with nothing counted is unknown, not "at least 0".
// Kitchen rebuild, phase K4. The one place nutrition is worked out for
// display: a recipe per serving, a day's planned meals, and either as a
// share of a day's reference intake.
//
// ---- What this file does NOT do ----
// It never re-implements the arithmetic. computeMacros() in data/meals.js
// already refuses to guess, counts reference averages separately, and keeps
// zero apart from unknown; everything here feeds it rows and adds up what it
// returns. Two macro calculators in one app is how two screens end up
// disagreeing about the same meal.
//
// ---- Reference intakes ----
// UK adult reference intakes (Regulation (EU) 1169/2011, retained in UK law)
// for energy, fat and carbohydrate; 50 g protein from the same schedule; 30 g
// fibre from SACN (2015), because the regulation sets none. People differ by
// age, size and activity, so these are a default that Settings can replace,
// never a target the app holds anyone to.
//
// ---- No verdicts ----
// Percentages are reported as they are. Over 100 is not an error, a warning
// or a colour change (behavioural principle 1). The views clamp the BAR at
// 100%; this file never clamps the NUMBER.

import { computeMacros } from './meals.js';

export const REFERENCE_INTAKES = Object.freeze({
  calories: 2000,
  carbs_g: 260,
  fat_g: 70,
  protein_g: 50,
  fibre_g: 30
});

/** Display order and words. Calories first: it is the number people look for. */
export const NUTRIENTS = Object.freeze([
  { key: 'calories', label: 'Energy', unit: 'kcal' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'fibre_g', label: 'Fibre', unit: 'g' }
]);

const KEYS = NUTRIENTS.map((n) => n.key);

/**
 * Reference intakes with any personal overrides laid over the top.
 *
 * An override must be a finite number above zero. Anything else falls back
 * to the default for THAT nutrient only — one bad value in settings must not
 * throw away the four good ones.
 */
export function resolveTargets(overrides = null) {
  const targets = { ...REFERENCE_INTAKES };
  if (!overrides || typeof overrides !== 'object') return targets;
  for (const key of KEYS) {
    const value = Number(overrides[key]);
    if (overrides[key] !== null && overrides[key] !== undefined && Number.isFinite(value) && value > 0) {
      targets[key] = value;
    }
  }
  return targets;
}

/**
 * A whole-number percentage of the day's target, or null when either side
 * is unknown. Null, not 0: "we cannot say" and "none" are different facts.
 */
export function percentOfTarget(value, key, targets = REFERENCE_INTAKES) {
  const v = Number(value);
  const t = Number(targets && targets[key]);
  if (value === null || value === undefined || !Number.isFinite(v)) return null;
  if (!Number.isFinite(t) || t <= 0) return null;
  return Math.round((v / t) * 100);
}

/**
 * Library recipe ingredients as computeMacros rows.
 *
 * A library ingredient is { ref, quantity, unit } with ref a reference slug.
 * An unknown ref becomes a row with an EMPTY food, so computeMacros counts it
 * as incomplete by name rather than it vanishing from the total unseen.
 */
export function libraryRows(recipe, referenceMap) {
  const lookup = referenceMap instanceof Map ? referenceMap : new Map();
  return ((recipe && recipe.ingredients) || []).map((ing) => ({
    quantity_g: ing.quantity,
    unit: ing.unit || 'g',
    foods: lookup.get(ing.ref) || { name: ing.ref }
  }));
}

/**
 * One library recipe's nutrition.
 *
 * @param {object} recipe  a library recipe
 * @param {Map} referenceMap  from foodReference.referenceBySlug()
 * @returns the computeMacros() result, divided by the recipe's own serves.
 *   Per-serving figures do not change when the servings stepper moves:
 *   cooking for six makes six portions of the same size.
 */
export function recipeNutrition(recipe, referenceMap) {
  const serves = Number(recipe && recipe.default_serves) > 0 ? Number(recipe.default_serves) : 1;
  return computeMacros(libraryRows(recipe, referenceMap), { serves });
}

/**
 * A day's planned eating, added up.
 *
 * @param {Array<{ perServing: object, complete?: object, portions?: number }>} items
 *   one per planned meal: its per-serving figures and how many portions of
 *   it ONE person eats (default 1). Household servings are not eaten by one
 *   person, so they never multiply in here.
 * @returns {{ totals: object, complete: object, mealCount: number }}
 *   `complete[key]` is false when any contributing meal could not be fully
 *   worked out for that nutrient, so the view can say "at least".
 */
export function dayNutrition(items = []) {
  const totals = {};
  const complete = {};
  for (const key of KEYS) { totals[key] = 0; complete[key] = true; }

  let mealCount = 0;
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.perServing) continue;
    const portions = Number(item.portions) > 0 ? Number(item.portions) : 1;
    mealCount += 1;
    for (const key of KEYS) {
      const value = Number(item.perServing[key]);
      if (Number.isFinite(value)) totals[key] += value * portions;
      if (item.complete && item.complete[key] === false) complete[key] = false;
    }
  }
  for (const key of KEYS) totals[key] = Math.round(totals[key] * 10) / 10;
  return { totals, complete, mealCount };
}

/**
 * Rows ready to render: label, amount, unit, percentage, and whether the
 * figure is a floor ("at least") because something could not be counted.
 */
export function nutritionRows(totals, complete = {}, targets = REFERENCE_INTAKES) {
  return NUTRIENTS.map((n) => {
    const raw = totals ? Number(totals[n.key]) : NaN;
    // "At least 0 g" is no information dressed up as some. When a figure
    // is incomplete AND nothing at all was counted, it is unknown.
    const amount = Number.isFinite(raw) && !(complete[n.key] === false && raw === 0) ? raw : null;
    return {
      key: n.key,
      label: n.label,
      unit: n.unit,
      amount: amount === null ? null : (n.unit === 'kcal' ? Math.round(amount) : Math.round(amount * 10) / 10),
      percent: percentOfTarget(amount, n.key, targets),
      target: targets[n.key],
      atLeast: complete[n.key] === false
    };
  });
}
