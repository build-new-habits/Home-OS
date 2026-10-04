// js/data/plannedIngredients.js — 04 Oct 2026 v1
// v1: the ingredients of the meals that are actually planned, read so that
// nothing can go missing, and repaired when a meal has none.
//
// Graeme, 4 Oct 2026, the second time of asking: Today counted 449 kcal for
// overnight oats and a falafel bowl, and ticking the lentil ragu as eaten
// changed nothing. Two of three meals said "no ingredients yet".
//
// Two ways that could happen, and this answers both:
//
//   1. The read. Every screen read ALL ingredients of ALL meals in one go
//      and grouped them. Past the server's per-request row limit the newest
//      meals came back empty (readAll v1 guarded 1,000; a lower cap still
//      cut it off). Now only the planned meals' ingredients are asked for,
//      a few dozen rows, in chunks of meal ids — no cap can reach them.
//
//   2. The data. Adding a library recipe writes the meal first and its
//      ingredients one by one; a failure part-way (a dropped connection on
//      a phone) leaves a meal with no ingredients, and every later add of
//      the same recipe finds "You already have it" and reuses the empty
//      meal. Now a library meal with no ingredients is counted from the
//      library recipe straight away, and its ingredients are written back
//      once so the shopping list and the pantry see them too.

import { supabase } from '../supabaseClient.js';
import { readAll } from '../lib/readAll.js';
import { toStorage } from '../lib/units.js';
import { loadAllRecipes, reseedLibraryIngredients } from './recipeLibrary.js';
import { referenceBySlug } from './foodReference.js';

const SELECT = 'id, meal_id, food_id, quantity_g, unit, option_group, is_selected, option_label, '
  + 'foods(id, name, barcode, calories_per_100g, protein_g, fat_g, carbs_g, grams_per_ml, grams_per_item, item_label, source)';
const CHUNK = 60;
const repairing = new Set();

/** Ingredient rows for these meals only. */
export async function listIngredientsFor(mealIds = []) {
  const ids = [...new Set((mealIds || []).filter(Boolean))];
  const rows = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const read = await readAll(() => supabase
      .from('meal_ingredients')
      .select(SELECT)
      .in('meal_id', chunk)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }));
    if (!read.ok) return read;
    rows.push(...read.data);
  }
  await fibreFromReference(rows);
  return { ok: true, data: rows };
}

/**
 * Library recipe rows in the shape computeMacros reads, for a meal whose
 * own rows are missing. Pure apart from the lookups passed in.
 */
export function stand_inRows(mealId, recipe, referenceMap) {
  return ((recipe && recipe.ingredients) || [])
    .filter((ing) => !ing.option_group || ing.default)
    .map((ing, i) => {
      const stored = toStorage(ing.quantity, ing.unit) || { value: ing.quantity, unit: ing.unit || 'g' };
      return {
        id: `library-${mealId}-${i}`,
        meal_id: mealId,
        food_id: null,
        quantity_g: stored.value,
        unit: stored.unit,
        is_selected: true,
        option_group: null,
        stand_in: true,
        foods: (referenceMap && referenceMap.get(ing.ref)) || { name: ing.ref }
      };
    });
}

/**
 * Ingredients for planned entries (weekly_meal_plan rows with meals
 * embedded), grouped by meal id. A library meal with no rows of its own is
 * filled from the library recipe and repaired in the background.
 *
 * @returns {Promise<{ ok: true, data: object[], repaired: string[] } | { ok: false, error }>}
 */
export async function ingredientsForEntries(entries = [], { repair = true, standIns = true, awaitRepair = false } = {}) {
  const ids = [...new Set((entries || []).map((e) => e.meal_id).filter(Boolean))];
  const read = await listIngredientsFor(ids);
  if (!read.ok) return read;
  const have = new Set(read.data.map((r) => r.meal_id));
  const empty = (entries || [])
    .filter((e) => e.meal_id && !have.has(e.meal_id) && e.meals && e.meals.library_ref)
    .filter((e, i, all) => all.findIndex((x) => x.meal_id === e.meal_id) === i);
  if (empty.length === 0) return { ok: true, data: read.data, repaired: [] };

  let lib = null;
  let refs = null;
  try {
    const [loaded, map] = await Promise.all([loadAllRecipes(), referenceBySlug()]);
    lib = loaded && loaded.ok ? loaded.data : null;
    refs = map;
  } catch { /* counted as missing, as before */ }
  if (!lib) return { ok: true, data: read.data, repaired: [] };

  const rows = [...read.data];
  const repaired = [];
  // The shopping list needs real rows (real foods to buy and stock), so it
  // waits for the repair and reads them back rather than using stand-ins.
  if (awaitRepair) {
    const fixed = [];
    for (const entry of empty) {
      const recipe = lib.find((r) => r.slug === entry.meals.library_ref);
      if (!recipe) continue;
      const result = await reseedLibraryIngredients(entry.meal_id, recipe).catch((error) => ({ ok: false, error }));
      if (result.ok) { fixed.push(entry.meal_id); repaired.push(entry.meal_id); }
      else console.error('Could not repair a meal\'s ingredients:', result.error);
    }
    if (fixed.length) {
      const again = await listIngredientsFor(fixed);
      if (again.ok) rows.push(...again.data);
    }
    return { ok: true, data: rows, repaired };
  }
  for (const entry of empty) {
    const recipe = lib.find((r) => r.slug === entry.meals.library_ref);
    if (!recipe) continue;
    if (standIns) rows.push(...stand_inRows(entry.meal_id, recipe, refs));
    if (repair && !repairing.has(entry.meal_id)) {
      repairing.add(entry.meal_id);
      repaired.push(entry.meal_id);
      reseedLibraryIngredients(entry.meal_id, recipe)
        .then((r) => { if (!r.ok) console.error('Could not repair a meal\'s ingredients:', r.error); })
        .catch((error) => console.error('Could not repair a meal\'s ingredients:', error))
        .finally(() => repairing.delete(entry.meal_id));
    }
  }
  return { ok: true, data: rows, repaired };
}

/** Fibre from the food reference while foods.fibre_g waits on migration 026. */
async function fibreFromReference(rows = []) {
  const missing = rows.filter((r) => r.foods && (r.foods.fibre_g === undefined || r.foods.fibre_g === null));
  if (!missing.length) return;
  try {
    const { lookup } = await import('./foodReference.js');
    const seen = new Map();
    const { rememberedFibre } = await import('./cofid.js');
    for (const row of missing) {
      const picked = rememberedFibre(row.foods.id);
      if (picked !== null) { row.foods.fibre_g = picked; continue; }
      const name = row.foods.name;
      if (!seen.has(name)) seen.set(name, await lookup(name));
      const entry = seen.get(name);
      if (entry && Number.isFinite(Number(entry.fibre_g))) row.foods.fibre_g = Number(entry.fibre_g);
    }
  } catch { /* a nicety, never a failure */ }
}
