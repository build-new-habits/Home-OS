// js/data/recipeLibrary.js — 04 Oct 2026 v7
// v7: every ingredient row sends display_text and sort_order (not null in the live database since 13 Sep; their absence made every library add fail).
// v6: adding a library recipe is all or nothing; a meal left with no
// ingredients is filled again (reseedLibraryIngredients); every food is read,
// not the first page.
// v5: foodsForReference() for the pantry quick start.
// v4: recipes have a course (starter, main, pudding): filterable, and stored on
// the meal once migration 026 adds meals.course.
// v3: library drinks are added with meal_type 'drink' (default_slot waits for 026).
// v2: addMissingToList() — a recipe's missing ingredients onto the list.
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
import { toStorage, ingredientLine } from '../lib/units.js';
import { readAll } from '../lib/readAll.js';
import { courseOf, isMissingColumnError } from './courses.js';

const INDEX_URL = new URL('../../data/recipe_library/index.json', import.meta.url).href;

let indexCache = null;
let courseColumn = null; // meals.course: null = not known yet (migration 026)
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

/**
 * Every recipe across every cuisine file.
 *
 * Returns `missing`: how many cuisine files could not be read. Callers are
 * expected to SAY so.
 *
 * ---- Why this is not just ok/not-ok ----
 * Screen recording, 10 Sep 2026. This used to `continue` past a failed file
 * and return `{ ok: true }` regardless, so sixteen files failing and none
 * failing produced the same shape. The picker then reported "2 to choose
 * from" — its own two meals — as a complete answer, and a favourite that
 * lived in the library was simply absent with nothing said.
 *
 * A short answer that cannot tell you it is short is worse than an error.
 */
export async function loadAllRecipes() {
  const index = await loadIndex();
  if (!index.ok) return index;

  const files = index.data.files || [];
  const all = [];
  let missing = 0;
  for (const file of files) {
    const doc = await loadCuisine(file.path);
    if (!doc.ok) { missing += 1; continue; }
    for (const recipe of doc.data.recipes || []) all.push(recipe);
  }
  // Everything failing is not "a library with no recipes in it".
  if (files.length > 0 && missing === files.length) {
    return { ok: false, error: new Error('No recipe file could be read.'), missing };
  }
  return { ok: true, data: all, missing };
}

/* ---- What the dish is built on (device test 6 Sep 2026) --------------
   "There's no meat or fish filter options."

   There were not, and there is no tag for it: the library carries only
   vegetarian, vegan, gluten_free and dairy_free. Rather than hand-tag 110
   recipes, this reads the ingredients, which is where the answer already
   is.

   Stock and fish sauce are deliberately NOT counted. A risotto made with
   chicken stock is not what anyone means by "show me a meat dish", and a
   Thai curry seasoned with fish sauce is not a fish supper. Counting them
   would make both filters useless by returning almost everything.

   Judged by ingredient rather than by absence: a recipe with neither is
   neither, not automatically vegetarian, because "no meat in the list" and
   "suitable for vegetarians" are different claims and the second one is
   what the dietary tags are for. */
const MEAT = /\b(beef|lamb|pork|chicken|turkey|bacon|sausage|ham|chorizo|duck|steak|gammon|mince)\b/;
const FISH = /\b(salmon|tuna|cod|haddock|prawn|prawns|anchovy|mackerel|sardine|shrimp|squid|crab)\b/;
const FLAVOURING = /^(stock-|fish-sauce)/;

/** @returns {string[]} some of ['meat', 'fish'] */
export function proteinsOf(recipe) {
  const out = new Set();
  for (const ing of recipe.ingredients || []) {
    const ref = String(ing.ref || ing.name || '');
    if (FLAVOURING.test(ref)) continue;
    const words = ref.replace(/[^a-z]+/gi, ' ');
    if (MEAT.test(words)) out.add('meat');
    if (FISH.test(words)) out.add('fish');
  }
  return [...out];
}

/** Filters a recipe list. Every filter is optional and they combine. */
export function filterRecipes(recipes = [], {
  cuisine = '', budget_tier = '', default_slot = '', dietary = [], term = '', proteins = [], course = ''
} = {}) {
  const q = normalise(term);
  return recipes.filter((r) => {
    if (cuisine && r.cuisine !== cuisine) return false;
    if (budget_tier && r.budget_tier !== budget_tier) return false;
    if (default_slot && r.default_slot !== default_slot) return false;
    if (course && courseOf(r) !== course) return false;
    // A recipe must carry EVERY tag asked for. Tags say what a meal is, and
    // asking for vegan means vegan, not "vegan or vegetarian".
    if (dietary.length && !dietary.every((t) => (r.dietary_tags || []).includes(t))) return false;
    // Meat and fish are asked for, not ruled out, so ANY match counts:
    // picking both means "something with meat or fish in it", which is what
    // pressing two buttons that name foods reads as.
    if (proteins.length) {
      const has = proteinsOf(r);
      if (!proteins.some((p) => has.includes(p))) return false;
    }
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
 * Every food, past the server's per-request limit (4 Oct 2026). Reading only
 * the first page meant a food already in the household could be missed and
 * made again, so the pantry and the list saw two of the same thing.
 */
async function allFoods() {
  return readAll(() => supabase.from('foods').select('*').order('created_at', { ascending: true }).order('id', { ascending: true }));
}

/** Writes one library recipe's ingredients against a meal. */
async function writeIngredients(mealId, recipe, existingFoods) {
  let reused = 0;
  let created = 0;
  let order = 0;
  for (const seed of recipe.ingredients || []) {
    const resolved = await resolveFood(seed, existingFoods);
    if (resolved.error) return { ok: false, error: resolved.error };
    if (resolved.created) created += 1; else reused += 1;
    const stored = toStorage(seed.quantity, seed.unit) || { value: seed.quantity, unit: seed.unit };
    order += 1;
    const row = await supabase.from('meal_ingredients').insert({
      meal_id: mealId,
      food_id: resolved.food.id,
      quantity_g: stored.value,
      unit: stored.unit,
      display_text: ingredientLine(stored.value, stored.unit, resolved.food),
      sort_order: order,
      option_group: seed.option_group || null,
      option_label: seed.option_label || null,
      is_selected: seed.option_group ? Boolean(seed.default) : true
    });
    if (row.error) return { ok: false, error: row.error };
  }
  return { ok: true, reused, created };
}

/**
 * Puts a library meal's ingredients back when it has none (4 Oct 2026).
 * A meal left empty by an add that failed part-way was reused by every
 * later add, and counted as nothing in nutrition, the list and the pantry.
 * Checks again just before writing, so two screens cannot both fill it.
 */
export async function reseedLibraryIngredients(mealId, recipe) {
  const present = await supabase.from('meal_ingredients').select('id', { count: 'exact', head: true }).eq('meal_id', mealId);
  if (present.error) return { ok: false, error: present.error };
  if ((present.count || 0) > 0) return { ok: true, skipped: true };
  const foodList = await allFoods();
  if (!foodList.ok) return { ok: false, error: foodList.error };
  const existingFoods = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));
  const written = await writeIngredients(mealId, recipe, existingFoods);
  if (!written.ok) {
    await supabase.from('meal_ingredients').delete().eq('meal_id', mealId);
    return written;
  }
  // Steps too, if they went missing with the ingredients.
  const steps = await supabase.from('meal_steps').select('id', { count: 'exact', head: true }).eq('meal_id', mealId);
  if (!steps.error && (steps.count || 0) === 0 && (recipe.steps || []).length) {
    await supabase.from('meal_steps').insert((recipe.steps || []).map((step, i) => ({
      meal_id: mealId,
      step_number: i + 1,
      instruction: step.instruction,
      note: step.note || null,
      duration_min: step.duration_min || null,
      step_group: step.step_group || null,
      while_waiting: Boolean(step.while_waiting)
    })));
  }
  return { ok: true, ...written };
}

/**
 * Makes sure there is a foods row for each reference slug, reusing any you
 * already have by name. For the pantry quick start (3 Oct 2026).
 * @returns {{ ok: true, data: Map<string, object> } | { ok: false, error }}
 */
export async function foodsForReference(slugs = []) {
  const foodList = await allFoods();
  if (foodList.error) return { ok: false, error: foodList.error };
  const existingFoods = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));
  const out = new Map();
  for (const slug of slugs) {
    const resolved = await resolveFood({ ref: slug }, existingFoods);
    if (resolved.error) return { ok: false, error: resolved.error };
    out.set(slug, resolved.food);
  }
  return { ok: true, data: out };
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
  // limit(1), not maybeSingle(): two meals from the same recipe made
  // maybeSingle fail, and the recipe could then never be added again.
  const found = await supabase
    .from('meals').select('id, name').eq('library_ref', recipe.slug).order('created_at', { ascending: true }).limit(1);
  if (found.error) return { ok: false, error: found.error };
  const already = { data: (found.data && found.data[0]) || null };
  if (already.data) {
    // An earlier add that failed part-way left it empty: fill it now.
    await reseedLibraryIngredients(already.data.id, recipe).catch(() => null);
    return { ok: false, error: new Error(`You already have ${already.data.name}.`), existing: already.data };
  }

  const foodList = await allFoods();
  if (foodList.error) return { ok: false, error: foodList.error };
  const existingFoods = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));

  const row = {
    name: recipe.name,
    default_serves: recipe.default_serves || 4,
    cuisine: recipe.cuisine || null,
    budget_tier: recipe.budget_tier || null,
    // A drink is a kind of meal (meal_type) everywhere, but default_slot
    // only accepts 'drink' after migration 026.
    default_slot: recipe.default_slot === 'drink' ? null : (recipe.default_slot || null),
    meal_type: recipe.default_slot || null,
    dietary_tags: recipe.dietary_tags || [],
    method_note: recipe.method_note || null,
    library_ref: recipe.slug
  };
  // meals.course arrives with migration 026. Sent while it may not exist,
  // and the insert retried without it if the database says so: the meal
  // still knows its course through library_ref either way.
  let meal = courseColumn === false
    ? await supabase.from('meals').insert({ ...row }).select().single()
    : await supabase.from('meals').insert({ ...row, course: courseOf(recipe) }).select().single();
  if (meal.error && courseColumn !== false && isMissingColumnError(meal.error, 'course')) {
    courseColumn = false;
    meal = await supabase.from('meals').insert({ ...row }).select().single();
  } else if (!meal.error && courseColumn === null) {
    courseColumn = true;
  }
  if (meal.error) return { ok: false, error: meal.error };

  // v (4 Oct 2026): all or nothing. A failure part-way used to leave the
  // meal with some or no ingredients, and every later add reused it.
  const written = await writeIngredients(meal.data.id, recipe, existingFoods);
  if (!written.ok) {
    await supabase.from('meal_ingredients').delete().eq('meal_id', meal.data.id);
    await supabase.from('meals').delete().eq('id', meal.data.id);
    return { ok: false, error: written.error };
  }
  const { reused, created } = written;

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


/**
 * Puts a recipe's missing ingredients on the shopping list (3 Oct 2026).
 *
 * Each ingredient becomes a food the same way adding the recipe does
 * (existing food by name, else from the reference file), and is added as a
 * `usual` line with the recipe's quantity. Anything already on the list and
 * still needed is left alone rather than added twice.
 *
 * @param {Array<{ ref: string, quantity?: number, unit?: string }>} missing
 * @returns {{ ok: boolean, added?: number, skipped?: number, error?: Error }}
 */
export async function addMissingToList(missing = []) {
  const foodList = await allFoods();
  if (foodList.error) return { ok: false, error: foodList.error };
  const existingFoods = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));

  const listed = await supabase.from('shopping_list_items').select('food_id, status');
  if (listed.error) return { ok: false, error: listed.error };
  const onList = new Set((listed.data || []).filter((i) => i.status === 'needed').map((i) => i.food_id));

  let added = 0;
  let skipped = 0;
  for (const seed of missing) {
    const resolved = await resolveFood(seed, existingFoods);
    if (resolved.error) return { ok: false, error: resolved.error, added };
    if (onList.has(resolved.food.id)) { skipped += 1; continue; }
    const unit = ['g', 'ml', 'item'].includes(seed.unit) ? seed.unit : 'item';
    const qty = Number(seed.quantity);
    const row = await supabase.from('shopping_list_items').insert({
      food_id: resolved.food.id,
      qty_needed: Number.isFinite(qty) && qty > 0 ? qty : null,
      unit,
      source: 'usual',
      status: 'needed'
    });
    if (row.error) return { ok: false, error: row.error, added };
    onList.add(resolved.food.id);
    added += 1;
  }
  return { ok: true, added, skipped };
}
