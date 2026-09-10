// js/data/planningNotes.js — 10 Sep 2026 v1
//
// Plans that are not a week yet.
//
// Shared data-access contract: every function returns { ok: true, data } or
// { ok: false, error }. Nothing here throws at a caller.
//
// ---- Why this is not the weekly plan ----
// `weekly_meal_plan` is keyed by week_start and weekday, so everything in it
// belongs to a specific Monday. That is right for eating and wrong for
// thinking: "Christmas", "when Sam visits", "curry night at some point" are
// real plans with no week attached, and forcing them onto one means either
// inventing a date or losing them.
//
// So planning_notes is free-standing. Rebuilding a week does not touch it,
// and a note can sit there for eight months without pretending to be dinner
// on the 14th.
//
// ---- occasion_date is nullable ON PURPOSE ----
// "Christmas" has a date. "Ideas for when Sam visits" does not, and will not
// until Sam says. A required date here would turn every vague good idea into
// a guess, and a guessed date on a screen is indistinguishable from a real
// one a fortnight later.

import { supabase } from '../supabaseClient.js';

const TABLE = 'planning_notes';
const COLUMNS = 'id, title, body, recipe_refs, occasion_date, created_at, updated_at';

/**
 * Every note.
 *
 * Dated ones first, soonest first; undated ones after, newest first. Not
 * alphabetical: a plan with a date on it is the one with a deadline, and
 * "Christmas" outranks "curry ideas" in December for reasons the app can
 * actually see.
 */
export async function listPlanningNotes() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('occasion_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error };
  return { ok: true, data: data || [] };
}

/**
 * Add a note.
 *
 * household_id is NOT sent: it defaults to my_household_id() and RLS
 * enforces it. A client that names its own household is a client that can be
 * asked to name someone else's.
 */
export async function addPlanningNote({ title, body = '', occasion_date = null, recipe_refs = [] }) {
  const cleanTitle = String(title || '').trim();
  // Checked here as well as in the UI: `title` is NOT NULL, and a constraint
  // violation comes back as an opaque database error, which is not a useful
  // thing to put in front of a person.
  if (!cleanTitle) return { ok: false, error: new Error('A plan needs a name.') };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: cleanTitle,
      // An empty box saves NULL rather than ''. '' later reads as a note
      // somebody wrote and then deleted, and the column is nullable
      // precisely so that difference survives.
      body: String(body || '').trim() || null,
      occasion_date: occasion_date || null,
      recipe_refs: Array.isArray(recipe_refs) ? recipe_refs : []
    })
    .select(COLUMNS)
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Change a note.
 *
 * Only the keys passed are sent. Spreading a whole row back would rewrite
 * `recipe_refs` from whatever the editing screen happened to be holding,
 * which is how an edit to a title quietly empties a list of recipes.
 */
export async function updatePlanningNote(id, changes = {}) {
  if (!id) return { ok: false, error: new Error('Which plan?') };
  const payload = { updated_at: new Date().toISOString() };
  if ('title' in changes) {
    const cleanTitle = String(changes.title || '').trim();
    if (!cleanTitle) return { ok: false, error: new Error('A plan needs a name.') };
    payload.title = cleanTitle;
  }
  if ('body' in changes) payload.body = String(changes.body || '').trim() || null;
  if ('occasion_date' in changes) payload.occasion_date = changes.occasion_date || null;
  if ('recipe_refs' in changes) {
    payload.recipe_refs = Array.isArray(changes.recipe_refs) ? changes.recipe_refs : [];
  }

  const { data, error } = await supabase
    .from(TABLE).update(payload).eq('id', id).select(COLUMNS).single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** Remove a note. */
export async function removePlanningNote(id) {
  if (!id) return { ok: false, error: new Error('Which plan?') };
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * How a date reads on a card. Undated is a first-class answer, not a gap.
 *
 * Deliberately not "in 3 months": a countdown to Christmas is the kind of
 * thing that turns a list of nice ideas into a set of deadlines, and this
 * app does not do that to people.
 */
export function occasionLabel(note) {
  if (!note || !note.occasion_date) return 'No date yet';
  const date = new Date(`${note.occasion_date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No date yet';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
