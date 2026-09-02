// js/data/recipeLibrary.js — 01 Sep 2026 v1
// Phase 16. A browsable catalogue of recipes you can add to your own.
//
// ---- Why the library is static JSON, not database rows ----
// Free to serve at any number of users, cacheable by the CDN, works
// offline, and needs no RLS reasoning. Database rows would cost a read per
// browse per user for content that is identical for everyone. Move to
// tables only if user-contributed recipes become real.
//
// ---- Nothing is bulk-loaded ----
// Seeding 300 recipes into `meals` on first run would create roughly 1,200
// `foods` rows for things you will never buy. That wrecks the Phase 7
// shortfall diff, buries the pantry, and blows past the standing decision
// to defer finer food taxonomy until around fifty real foods exist.
//
// A recipe becomes rows only when you tap add.

import { supabase } from '../supabaseClient.js';
import { lookup as lookupReference, referencePatch } from './foodReference.js';
import { toStorage } from '../lib/units.js';

const INDEX_URL = new URL('../../data/recipe_library/index.json', import.meta.url).href;

let indexCache = null;
const fileCache = new Map();

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** The list of cuisine files. Small, precached, always loaded. */
export async function loadIndex() {
  if (indexCache) return { ok: true, data: indexCache };
  try {
    const response = await fetch(INDEX_URL);
    if (!response.ok) throw new Error(`index returned ${response.status}`);
    indexCache = await response.json();
    return { ok: true, data: indexCache };
  } catch (error) {
    console.error('Recipe library index unavailable:', error);
    return { ok: false, error };
  }
}

/**
 * One cuisine file, fetched on demand.
 *
 * Deliberately NOT precached: the index is one small file, but precaching
 * every cuisine would put the whole library in the service worker's
 * all-or-nothing precache, where one bad path breaks the entire app.
 */
export async function loadCuisine(relativePath) {
  if (fileCache.has(relativePath)) return { ok: true, data: fileCache.get(relativePath) };
  try {
    const url = new URL(`../../${relativePath}`, import.meta.url).href;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${relativePath} returned ${response.status}`);
    const doc = await response.json();
    fileCache.set(relativePath, doc);
    return { ok: true, data: doc };
  } catch (error) {
    console.error('Recipe file unavailable:', error);
    return { ok: false, error };
  }
}

/** Every recipe across every cuisine file. */
export async function loadAllRecipes() {
  const index = await loadIndex();
  if (!index.ok) return index;

  const all = [];
  for (const file of index.data.files || []) {
    const doc = await loadCuisine(file.path);
    if (!doc.ok) continue;
    for (const recipe of doc.data.recipes || []) all.push(recipe);
  }
  return { ok: true, data: all };
}

/** Filters a recipe list. Every filter is optional and they combine. */
export function filterRecipes(recipes = [], {
  cuisine = '', budget_tier = '', default_slot = '', dietary = [], term = ''
} = {}) {
  const q = normalise(term);
  return recipes.filter((r) => {
    if (cuisine && r.cuisine !== cuisine) return false;
    if (budget_tier && r.budget_tier !== budget_tier) return false;
    if (default_slot && r.default_slot !== default_slot) return false;
    // A recipe must carry EVERY tag asked for. Tags say what a meal is, and
    // asking for vegan means vegan, not "vegan or vegetarian".
    if (dietary.length && !dietary.every((t) => (r.dietary_tags || []).includes(t))) return false;
    if (q.length >= 2) {
      const haystack = normalise(
        `${r.name} ${r.cuisine} ${(r.ingredients || []).map((i) => i.ref || i.name).join(' ')}`
      );
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Which library slugs you already have, so the browser can say so. */
export async function existingLibraryRefs() {
  const { data, error } = await supabase
    .from('meals').select('id, name, library_ref').not('library_ref', 'is', null);
  if (error) return { ok: false, error };
  return { ok: true, data: new Map((data || []).map((m) => [m.library_ref, m])) };
}

/**
 * Resolves one seed ingredient to a foods row, in strict order.
 *
 * 1. An existing food with the same name — this is what makes your already
 *    scanned tin of tomatoes get REUSED rather than duplicated. It is
 *    Phase 11's principle applied to seeding, and skipping it would
 *    reintroduce the exact defect Phase 11 fixed.
 * 2. The reference file, creating the food complete with macros.
 * 3. A bare row from the recipe's own wording.
 */
async function resolveFood(seedIngredient, existingFoods) {
  const refSlug = seedIngredient.ref;
  const entry = refSlug ? await lookupReference(refSlug.replace(/-/g, ' ')) : null;
  const wantedName = (entry && entry.name) || seedIngredient.name || refSlug || 'Unnamed';

  const existing = existingFoods.get(normalise(wantedName));
  if (existing) return { food: existing, created: false };

  const patch = entry ? referencePatch(entry, {}) : {};
  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: wantedName,
      category: (entry && entry.category) || 'food_ambient',
      source: patch.source || 'manual',
      calories_per_100g: patch.calories_per_100g ?? null,
      protein_g: patch.protein_g ?? null,
      fat_g: patch.fat_g ?? null,
      carbs_g: patch.carbs_g ?? null,
      grams_per_ml: patch.grams_per_ml ?? null,
      grams_per_item: patch.grams_per_item ?? null,
      item_label: patch.item_label ?? null
    })
    .select()
    .single();
  if (error) return { error };

  existingFoods.set(normalise(wantedName), data);
  return { food: data, created: true, fromReference: Boolean(entry) };
}

/**
 * Adds a library recipe to your own meals.
 *
 * Needs connectivity: a meal insert must return a real id before its
 * ingredients and steps can reference it. Queueing this offline would
 * orphan the children, so it says so plainly instead.
 *
 * Reports what happened rather than doing it invisibly.
 */
export async function addLibraryRecipe(recipe) {
  const already = await supabase
    .from('meals').select('id, name').eq('library_ref', recipe.slug).maybeSingle();
  if (already.error) return { ok: false, error: already.error };
  if (already.data) {
    return { ok: false, error: new Error(`You already have ${already.data.name}.`), existing: already.data };
  }

  const foodList = await supabase.from('foods').select('*');
  if (foodList.error) return { ok: false, error: foodList.error };
  const existingFoods = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));

  const meal = await supabase
    .from('meals')
    .insert({
      name: recipe.name,
      default_serves: recipe.default_serves || 4,
      cuisine: recipe.cuisine || null,
      budget_tier: recipe.budget_tier || null,
      default_slot: recipe.default_slot || null,
      dietary_tags: recipe.dietary_tags || [],
      method_note: recipe.method_note || null,
      library_ref: recipe.slug
    })
    .select()
    .single();
  if (meal.error) return { ok: false, error: meal.error };

  let reused = 0;
  let created = 0;
  const slugToFood = new Map();

  for (const seed of recipe.ingredients || []) {
    const resolved = await resolveFood(seed, existingFoods);
    if (resolved.error) return { ok: false, error: resolved.error };
    if (resolved.created) created += 1; else reused += 1;
    if (seed.ref) slugToFood.set(seed.ref, resolved.food);

    const stored = toStorage(seed.quantity, seed.unit) || { value: seed.quantity, unit: seed.unit };
    const row = await supabase.from('meal_ingredients').insert({
      meal_id: meal.data.id,
      food_id: resolved.food.id,
      quantity_g: stored.value,
      unit: stored.unit,
      option_group: seed.option_group || null,
      option_label: seed.option_label || null,
      is_selected: seed.option_group ? Boolean(seed.default) : true
    });
    if (row.error) return { ok: false, error: row.error };
  }

  const steps = (recipe.steps || []).map((step, i) => ({
    meal_id: meal.data.id,
    step_number: i + 1,
    instruction: step.instruction,
    note: step.note || null,
    duration_min: step.duration_min || null,
    step_group: step.step_group || null,
    while_waiting: Boolean(step.while_waiting)
  }));
  if (steps.length > 0) {
    const written = await supabase.from('meal_steps').insert(steps);
    if (written.error) return { ok: false, error: written.error };
  }

  return { ok: true, data: meal.data, reused, created, steps: steps.length };
}

/** Plain sentence about what an add actually did. */
export function describeAdd(result) {
  if (!result || !result.ok) return '';
  const parts = [`Added ${result.data.name}.`];
  if (result.reused > 0) parts.push(`${result.reused} ingredient${result.reused === 1 ? '' : 's'} you already had`);
  if (result.created > 0) parts.push(`${result.created} created`);
  if (result.steps > 0) parts.push(`${result.steps} steps`);
  return parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(', ')}.` : parts[0];
}
