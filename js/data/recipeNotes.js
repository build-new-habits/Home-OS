// js/data/recipeNotes.js — 08 Sep 2026 v1
//
// Favourites and notes against library recipes.
//
// Shared data-access contract: every function returns { ok: true, data } or
// { ok: false, error }. Nothing here throws at a caller.
//
// ---- Why these are not meals ----
// meals.is_favourite has existed since revision 5, but a library recipe is
// not a meal until you import it. Marking one used to mean adding it to
// your meals first, which is choosing a dinner in order to say you like it.
// Revision 25 gave the library its own table.
//
// ---- Upsert, not insert ----
// There is a unique index on (household_id, recipe_slug). Favouriting twice
// must not make a second row whose note silently hides the first, so every
// write here is an upsert on that pair.

import { supabase } from '../supabaseClient.js';

const TABLE = 'recipe_library_notes';

/** Every note and favourite, keyed by slug, for a whole-library render. */
export async function listRecipeNotes() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, recipe_slug, is_favourite, note, updated_at');
  if (error) return { ok: false, error };
  const bySlug = new Map();
  for (const row of data || []) bySlug.set(row.recipe_slug, row);
  return { ok: true, data: bySlug };
}

/** One recipe's note, or null. */
export async function getRecipeNote(slug) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, recipe_slug, is_favourite, note, updated_at')
    .eq('recipe_slug', slug)
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data: data || null };
}

/**
 * Set the favourite flag, keeping any note.
 *
 * household_id is NOT sent: it defaults to my_household_id() and RLS
 * enforces it. A client that names its own household is a client that can
 * be asked to name someone else's.
 */
export async function setFavourite(slug, isFavourite) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ recipe_slug: slug, is_favourite: !!isFavourite, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,recipe_slug' })
    .select()
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Set the note text, keeping the favourite flag.
 *
 * An empty box saves NULL rather than an empty string. '' later reads as a
 * note somebody wrote and then deleted, and the column is nullable
 * precisely so that difference survives.
 */
export async function setRecipeNote(slug, note) {
  const trimmed = String(note || '').trim();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ recipe_slug: slug, note: trimmed || null, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,recipe_slug' })
    .select()
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data };
}
