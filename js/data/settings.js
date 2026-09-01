// js/data/settings.js — 01 Sep 2026 v5
// v4: changePassword() no longer assumes the account HAS a password. A user
// who signed in by magic link may never have set one, so requiring the
// current password locked out exactly the people who most needed to set it.
// Supabase returns an identical 400 whether a password is wrong or was
// never set, and exposes no reliable flag for 'has a password'. Rather than
// ship a guess, the view offers sendPasswordReset() — a route through that
// resolves both cases without needing to tell them apart.
// v3: adds changePassword(). Requested out-of-band during the Phase 5
// session; recorded in PHASE5_HANDOFF.md as an addition outside that
// brief. No schema change — Supabase Auth owns credentials, not our tables.
import { supabase } from '../supabaseClient.js';
import { clearHouseholdCache } from './household.js';

// The 17 tables, per schema.md / PROJECT_BLUEPRINT.md §4. Frozen list —
// do not add a table here without it existing in the schema first.
export const ALL_TABLES = [
  'exercises',
  'exercise_logs',
  'chore_projects',
  'chore_tasks',
  'calendar_events',
  'weight_logs',
  'water_logs',
  'foods',
  'meals',
  'meal_ingredients',
  'weekly_meal_plan',
  'pantry_stock',
  'shopping_list_items',
  'holidays',
  'holiday_checklist_items',
  'holiday_purchase_items',
  'user_settings'
];

const DEFAULT_SETTINGS = {
  theme: 'default',
  contrast_mode: 'standard',
  brightness_pref: 'standard',
  weight_unit_display: 'stone_lb',
  notification_prefs: {}
};

/**
 * Fetch the single user_settings row. Follows the shared data-access
 * contract (GEMINI_BUILD_CONVENTIONS.md §2): every call checks the error
 * and returns a predictable { ok, data|error } shape — views never see a
 * thrown exception from a data module.
 */
export async function getSettings() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Upsert the user_settings row. Never pass user_id — it defaults via
 * `auth.uid()` on the column, per the locked schema decision.
 * Accepts a partial patch and merges over defaults/current values.
 */
export async function upsertSettings(patch) {
  const currentResult = await getSettings();
  if (!currentResult.ok) return currentResult;

  const merged = { ...DEFAULT_SETTINGS, ...(currentResult.data || {}), ...patch };
  delete merged.id;
  delete merged.user_id;

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(merged, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Export all 17 tables for the signed-in user as one pretty-printed,
 * human-readable JSON object (behavioural principle 9). RLS already
 * scopes every select() to the current user — no manual filtering needed.
 */
export async function exportAllData() {
  const result = {
    exported_at: new Date().toISOString(),
    tables: {}
  };
  for (const table of ALL_TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) return { ok: false, error: new Error(`Export failed on ${table}: ${error.message}`) };
    result.tables[table] = data;
  }
  return { ok: true, data: result };
}

/**
 * Signs the user out. Views never call supabase directly (§2).
 *
 * The household cache is cleared FIRST. It is module-scoped and survives a
 * sign-out, so on a shared device the next person to sign in would briefly
 * see the previous household's name and members before the read returned.
 * Cheap to prevent, unpleasant to discover.
 */
export async function signOutUser() {
  clearHouseholdCache();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * Changes the account password.
 *
 * The current password is re-verified with signInWithPassword before the
 * change is applied. Supabase's updateUser() would accept a new password on
 * the strength of the existing session alone, but that means anyone reaching
 * an unlocked, signed-in device could lock the owner out of their own health
 * data. Re-authenticating costs one round trip and removes that.
 *
 * Returns the shared { ok, data|error } shape with a `code` on the failures
 * a view needs to tell apart, so the UI can point at the right field.
 */
/** Emails a reset link, the route through for an account with no password. */
export async function sendPasswordReset() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { ok: false, error };
  const email = data && data.user && data.user.email;
  if (!email) return { ok: false, code: 'no-session', error: new Error('No signed-in account found.') };
  const redirectTo = new URL('./', window.location.href).href;
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (resetErr) return { ok: false, error: resetErr };
  return { ok: true, data: { email } };
}

export async function changePassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, code: 'too-short', error: new Error('New password must be at least 8 characters.') };
  }
  if (currentPassword === newPassword) {
    return { ok: false, code: 'unchanged', error: new Error('New password must be different from the current one.') };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { ok: false, error: userErr };
  const email = userData && userData.user && userData.user.email;
  if (!email) {
    return { ok: false, code: 'no-session', error: new Error('No signed-in account found.') };
  }

  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });
  if (reauthErr) {
    // Indistinguishable at the API level from a wrong password: Supabase
    // returns the same 400 whether the password is wrong or was never set.
    // The view offers the reset route for both, since it resolves either.
    return { ok: false, code: 'wrong-current', error: reauthErr };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) return { ok: false, error: updateErr };
  return { ok: true, data: { email } };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
