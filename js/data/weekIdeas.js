// js/data/weekIdeas.js — 04 Oct 2026 v1
// v1: Fill the week for me — ideas for every open meal from your own meals
// AND the library, chosen the way a person would plan a week.
//
// Persona re-trace 3: "Fill the open meals" drew only on your own meals, so
// a new household with one saved meal and 214 library recipes was told
// "Nothing to fill". Mealime and Samsung Food sell on exactly this button.
//
// ---- How a week is chosen ----
// For each open meal, in day order, every candidate that suits the slot is
// scored and the best taken:
//
//   + your favourite meals first, then your own meals
//   + uses something in the cupboard that needs using up
//   + a little chance, so the same week does not come back every time
//   - the same cuisine as the day before
//   - the same main protein (meat, fish, neither) as the day before
//   - more than two "special" recipes in a week
//
// Hard rules, never scored away:
//   - the household's diet: if anyone is vegetarian, vegan, gluten free,
//     dairy free or nut free, every idea is (a shared meal has to suit the
//     whole table; swaps are still offered on the recipe)
//   - Monday to Thursday dinners take 45 minutes or less of hands-on time
//   - starters, puddings and drinks are courses, never a main meal idea
//   - nothing twice in one week
//
// No database calls: the view hands in what it has already read.

import { estimateRecipeTime } from '../lib/recipeTime.js';
import { courseOf } from './courses.js';
import { proteinsOf } from './recipeLibrary.js';

export const WEEKDAY_MAX_MINUTES = 45;
const WEEKDAYS = new Set(['mon', 'tue', 'wed', 'thu']);
const NUTS = /\b(peanut|almond|cashew|walnut|pistachio|hazelnut|pecan|macadamia|nut)s?\b/i;

/** One rule set for the table: every diet anyone in the household has. */
export function householdDiet(members = []) {
  const tags = new Set();
  for (const m of members || []) for (const t of m.dietary_tags || []) tags.add(t);
  return tags;
}

/** Does a recipe (or meal) suit every diet at the table? */
export function suitsDiet(item, diet, ingredientRefs = null) {
  if (!diet || diet.size === 0) return true;
  const tags = new Set(item.dietary_tags || []);
  // Vegan food is vegetarian food, whether or not it says both.
  if (tags.has('vegan')) tags.add('vegetarian');
  for (const need of diet) {
    if (need === 'nut_free') {
      const refs = ingredientRefs || (item.ingredients || []).map((i) => i.ref || i.name || '');
      if (refs.some((r) => NUTS.test(String(r).replace(/-/g, ' ')))) return false;
      continue;
    }
    if (!tags.has(need)) return false;
  }
  return true;
}

/** Small seeded random, so "Different ideas" moves on and a reload does not. */
export function seeded(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function proteinKey(item) {
  const p = item.ingredients ? proteinsOf(item) : [];
  return p.includes('fish') ? 'fish' : p.includes('meat') ? 'meat' : 'none';
}

/**
 * Turn your meals and the library into one list of candidates.
 * A library recipe you have already added is represented once, by your meal.
 */
export function candidatesFrom({ meals = [], recipes = [], useSoonNames = [] } = {}) {
  const soon = useSoonNames.map((n) => String(n).toLowerCase()).filter(Boolean);
  const mine = new Map();
  const out = [];
  for (const m of meals) {
    if (m.library_ref) mine.set(m.library_ref, m);
  }
  const bySlug = new Map(recipes.map((r) => [r.slug, r]));
  for (const m of meals) {
    const recipe = m.library_ref ? bySlug.get(m.library_ref) : null;
    out.push({
      key: `meal:${m.id}`,
      name: m.name,
      meal: m,
      recipe,
      slot: m.default_slot || m.meal_type || (recipe && recipe.default_slot) || null,
      course: recipe ? courseOf(recipe) : (m.course || 'main'),
      cuisine: m.cuisine || (recipe && recipe.cuisine) || '',
      budget: m.budget_tier || (recipe && recipe.budget_tier) || '',
      minutes: recipe ? estimateRecipeTime(recipe).total : null,
      dietary_tags: m.dietary_tags || (recipe && recipe.dietary_tags) || [],
      ingredients: recipe ? recipe.ingredients : null,
      protein: recipe ? proteinKey(recipe) : 'none',
      own: true,
      favourite: Boolean(m.is_favourite),
      usesSoon: recipe ? usesAny(recipe, soon) : false
    });
  }
  for (const r of recipes) {
    if (mine.has(r.slug)) continue;
    out.push({
      key: `recipe:${r.slug}`,
      name: r.name,
      meal: null,
      recipe: r,
      slot: r.default_slot,
      course: courseOf(r),
      cuisine: r.cuisine || '',
      budget: r.budget_tier || '',
      minutes: estimateRecipeTime(r).total,
      dietary_tags: r.dietary_tags || [],
      ingredients: r.ingredients,
      protein: proteinKey(r),
      own: false,
      favourite: false,
      usesSoon: usesAny(r, soon)
    });
  }
  return out;
}

function usesAny(recipe, soonLower) {
  if (!soonLower.length) return false;
  const refs = (recipe.ingredients || []).map((i) => String(i.ref || i.name || '').replace(/-/g, ' ').toLowerCase());
  return soonLower.some((name) => {
    const head = name.split(',')[0].trim();
    return head.length > 2 && refs.some((r) => r.includes(head) || head.includes(r));
  });
}

/**
 * @param {object} o
 * @param {Array} o.entries        plan rows for the week (day_of_week, slot, meal_id, meals)
 * @param {Array} o.candidates     from candidatesFrom()
 * @param {Set}   o.diet           from householdDiet()
 * @param {number} o.fromDayIndex  0 for a whole week, today's index for this week
 * @param {string[]} o.slots       which meals to fill, e.g. ['dinner']
 * @param {string|number} o.seed
 * @param {Set<string>} [o.avoid]  candidate keys not to offer (swapped away)
 * @returns {Array<{ day, slot, pick }>}
 */
export function planWeek({ entries = [], candidates = [], diet = new Set(), days, fromDayIndex = 0, slots = ['dinner'], seed = 1, avoid = new Set() }) {
  const rand = seeded(seed);
  const used = new Set();
  for (const e of entries) {
    if (e.meal_id) used.add(`meal:${e.meal_id}`);
    const ref = e.meals && e.meals.library_ref;
    if (ref) used.add(`recipe:${ref}`);
  }
  let specials = 0;
  const lastBySlot = new Map();
  const proposals = [];
  for (const d of days.slice(fromDayIndex)) {
    for (const slot of slots) {
      const taken = entries.find((e) => e.day_of_week === d.value && e.slot === slot);
      if (taken) {
        const recipe = taken.meals && taken.meals.library_ref ? candidates.find((c) => c.recipe && c.recipe.slug === taken.meals.library_ref) : null;
        lastBySlot.set(slot, { cuisine: (recipe && recipe.cuisine) || (taken.meals && taken.meals.cuisine) || '', protein: recipe ? recipe.protein : 'none' });
        continue;
      }
      const prev = lastBySlot.get(slot) || null;
      const pick = bestFor({ d, slot, prev, candidates, diet, used, avoid, rand, specials });
      if (!pick) continue;
      used.add(pick.key);
      if (pick.recipe) used.add(`recipe:${pick.recipe.slug}`);
      if (pick.budget === 'special') specials += 1;
      lastBySlot.set(slot, { cuisine: pick.cuisine, protein: pick.protein });
      proposals.push({ day: d.value, slot, pick });
    }
  }
  return proposals;
}

/** The single best idea for one open meal. Exported for "Another idea". */
export function bestFor({ d, slot, prev = null, candidates, diet, used = new Set(), avoid = new Set(), rand = Math.random, specials = 0 }) {
  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (used.has(c.key) || avoid.has(c.key)) continue;
    if (c.recipe && used.has(`recipe:${c.recipe.slug}`)) continue;
    if (c.slot !== slot) continue;
    if (c.course && c.course !== 'main') continue;
    if (!suitsDiet(c, diet, c.ingredients ? null : [])) continue;
    if (slot === 'dinner' && WEEKDAYS.has(d.value) && c.minutes !== null && c.minutes > WEEKDAY_MAX_MINUTES) continue;
    let score = rand() * 2;
    if (c.favourite) score += 4;
    else if (c.own) score += 1.5;
    if (c.usesSoon) score += 2.5;
    if (prev && c.cuisine && prev.cuisine && c.cuisine === prev.cuisine) score -= 2;
    if (prev && slot === 'dinner' && c.protein === prev.protein && c.protein !== 'none') score -= 1;
    if (c.budget === 'special' && specials >= 2) score -= 5;
    if (c.budget === 'special' && WEEKDAYS.has(d.value)) score -= 1;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

/** "Wednesday dinner · Thai · 35 min · uses up spinach"-style detail. */
export function describeIdea(pick) {
  const parts = [];
  if (pick.favourite) parts.push('a favourite');
  else if (pick.own) parts.push('one of yours');
  if (pick.cuisine && !['Breakfast', 'Lunch', 'Snacks', 'Budget', 'Vegetarian', 'Special'].includes(pick.cuisine)) parts.push(pick.cuisine);
  if (pick.minutes) parts.push(`${pick.minutes} min`);
  if (pick.usesSoon) parts.push('uses something to use up');
  return parts.join(' · ');
}
