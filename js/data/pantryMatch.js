// js/data/pantryMatch.js — 01 Sep 2026 v3
// Phase 14. "I've got salmon in the freezer. What can I make?"
//
// This is the Phase 7 shortfall engine run backwards. Instead of "here is
// what the week needs that you lack", it answers "here is what you could
// cook without going out".
//
// ---- scoreMeals is pure ----
// It takes already-fetched data and returns a ranked list. No queries, no
// awaits. That is what makes it testable against hand-worked examples the
// way computeMacros() is, and it is what keeps the caller honest about
// fetching everything in ONE query rather than one per meal.

import { toGrams } from './meals.js';
import { effectiveLevel } from './pantry.js';

/** How an ingredient stands against the pantry. */
export const STATE = {
  HAVE: 'have',
  SHORT: 'short',
  MISSING: 'missing',
  UNKNOWN: 'unknown'
};

export const BAND = {
  READY: 'ready',
  NEARLY: 'nearly',
  SHOP: 'shop'
};

/** Above this many gaps, a meal is a shopping trip rather than a decision. */
const NEARLY_LIMIT = 2;

/**
 * Classifies one ingredient against what is in the cupboard.
 *
 * ---- Unknown is not missing ----
 * `current_qty` null means "amount not recorded" (schema.md), which is a
 * different and truer thing than zero. You not having written down how much
 * rice is in the jar is not evidence that there is none, and treating it as
 * a failure is exactly the framing this app rejects.
 */
export function classifyIngredient(row, stockByFood, scale = 1) {
  const food = row.foods || row.food || {};
  const stock = stockByFood.get(row.food_id);

  if (!stock) return { state: STATE.MISSING, food };

  // ---- Phase 31: precedence, decided once ----
  // A number wins when there is one — precision beats approximation. When
  // there is not, a rough level is far better than nothing, and it is what
  // most people will actually keep up to date.
  if (stock.current_qty === null || stock.current_qty === undefined) {
    // Phase 31 part three: a level older than its lifespan is not acted on.
    // effectiveLevel returns null once stale, so a forgotten "plenty"
    // degrades to UNKNOWN — never to MISSING, which would flood the list.
    const level = effectiveLevel(stock);
    if (level === 'plenty') return { state: STATE.HAVE, food, rough: true };
    if (level === 'low') return { state: STATE.SHORT, food, rough: true };
    if (level === 'none') return { state: STATE.MISSING, food, rough: true };
    // Null level is "nothing said", not "none".
    return { state: STATE.UNKNOWN, food, stale: Boolean(stock.level) };
  }

  const haveQty = Number(stock.current_qty);
  if (!Number.isFinite(haveQty)) return { state: STATE.UNKNOWN, food };
  if (haveQty <= 0) return { state: STATE.MISSING, food };

  const needQty = Number(row.quantity_g) * (Number(scale) || 1);
  if (!Number.isFinite(needQty) || needQty <= 0) return { state: STATE.HAVE, food };

  // Same unit: compare directly, no conversion to get wrong.
  if (stock.unit === row.unit) {
    return { state: haveQty >= needQty ? STATE.HAVE : STATE.SHORT, food, have: haveQty, need: needQty };
  }

  // Different units: both must reach grams, and neither may be guessed.
  const needG = toGrams(needQty, row.unit, food);
  const haveG = toGrams(haveQty, stock.unit, food);
  if (needG.grams === null || haveG.grams === null) {
    return { state: STATE.UNKNOWN, food, reason: needG.reason || haveG.reason };
  }
  return {
    state: haveG.grams >= needG.grams ? STATE.HAVE : STATE.SHORT,
    food, have: haveG.grams, need: needG.grams
  };
}

/**
 * Ranks meals by how little you would have to buy.
 *
 * @param {object[]} meals
 * @param {Map<string, object[]>} ingredientsByMeal
 * @param {object[]} stock pantry_stock rows
 * @returns {Array<{ meal, band, missing, short, unknown, gaps, ingredients }>}
 */
export function scoreMeals(meals = [], ingredientsByMeal = new Map(), stock = []) {
  const stockByFood = new Map();
  for (const row of stock) {
    if (row.food_id) stockByFood.set(row.food_id, row);
  }

  const scored = [];

  for (const meal of meals) {
    const rows = ingredientsByMeal.get(meal.id) || [];
    // A meal with no ingredients cannot be scored honestly. It is not
    // "ready now" — nobody said what it takes.
    if (rows.length === 0) continue;

    // Phase 19: only the chosen option counts. An alternative you decided
    // against is not a reason to say you cannot cook something.
    const counted = rows.filter((r) => r.option_group == null || r.is_selected !== false);

    const ingredients = counted.map((row) => classifyIngredient(row, stockByFood));
    const missing = ingredients.filter((i) => i.state === STATE.MISSING);
    const short = ingredients.filter((i) => i.state === STATE.SHORT);
    const unknown = ingredients.filter((i) => i.state === STATE.UNKNOWN);

    // UNKNOWN never demotes a meal. Assuming the worst about an unrecorded
    // jar would push half your recipes into "needs a shop" on the strength
    // of paperwork you never did.
    const gaps = missing.length + short.length;
    const band = gaps === 0 ? BAND.READY : (gaps <= NEARLY_LIMIT ? BAND.NEARLY : BAND.SHOP);

    scored.push({ meal, band, missing, short, unknown, gaps, ingredients });
  }

  scored.sort((a, b) =>
    a.missing.length - b.missing.length
    || a.short.length - b.short.length
    || (a.meal.name || '').localeCompare(b.meal.name || ''));

  return scored;
}

/** Narrows a scored list to meals using a food whose name matches `term`. */
export function filterByIngredient(scored = [], term = '') {
  const q = String(term || '').toLowerCase().trim();
  if (q.length < 2) return scored;
  return scored.filter((entry) =>
    entry.ingredients.some((i) => (i.food.name || '').toLowerCase().includes(q)));
}

/** The gaps, named, for the line under a meal. */
export function describeGaps(entry) {
  const names = [
    ...entry.missing.map((i) => i.food.name || 'something'),
    ...entry.short.map((i) => `more ${(i.food.name || 'something').toLowerCase()}`)
  ];
  if (names.length === 0) return 'You have everything.';
  if (names.length === 1) return `You would need ${names[0].toLowerCase()}.`;
  const last = names.pop();
  return `You would need ${names.join(', ').toLowerCase()} and ${last.toLowerCase()}.`;
}

/**
 * The quiet footnote for unrecorded amounts.
 *
 * Stated as an assumption the app is making, not as something you failed to
 * do. It is the difference between "assumes you have rice" and "you have
 * not recorded your rice".
 */
export function describeAssumptions(entry) {
  if (entry.unknown.length === 0) return '';
  const names = entry.unknown.map((i) => (i.food.name || 'something').toLowerCase());
  if (names.length === 1) return `Assumes you have ${names[0]} — amount not recorded.`;
  return `Assumes you have ${names.join(', ')} — amounts not recorded.`;
}

/** The shortfall rows for this meal, for the "add to shopping list" action. */
export function gapsToShoppingItems(entry) {
  return [...entry.missing, ...entry.short].map((i) => ({
    food_id: i.food.id,
    qty_needed: i.need === undefined ? null : Math.round((i.need - (i.have || 0)) * 100) / 100,
    unit: 'g',
    source: 'meal_plan'
  }));
}
