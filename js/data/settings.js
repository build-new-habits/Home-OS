// js/data/settings.js — 18 Jul 2026 v2
import { supabase } from '../supabaseClient.js';

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

/** Signs the single user out. Views never call supabase directly (§2). */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error };
  return { ok: true };
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
