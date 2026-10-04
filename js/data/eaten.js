// js/data/eaten.js — 04 Oct 2026 v1
// Kitchen rebuild. "Eaten": a tick on a planned meal.
//
// ---- Why ----
// Graeme, 4 Oct 2026: "Tapping the plan could have a Consumed box that gets
// ticked." A plan says what you meant to eat; the tick says what you did,
// so Today can show nutrition eaten so far beside the day as planned.
// Nothing is ever marked as missed: an unticked meal is only unticked.
//
// ---- Where the tick lives ----
// weekly_meal_plan.eaten_at arrives with migration 026, the same migration
// as is_leftover, so leftoversReady() (data/mealPlan.js) says which world
// we are in. Until then the tick is kept on this phone, keyed by the plan
// entry's id (ids are per week, so last week's ticks never show this week).

import { supabase } from '../supabaseClient.js';
import { leftoversReady } from './mealPlan.js';

const LOCAL_KEY = 'home-os-eaten';
const KEEP_DAYS = 21;

function readLocal() {
  try { return JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; }
}

function writeLocal(map) {
  try { globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(map)); return true; } catch { return false; }
}

/** Ticks older than three weeks are forgotten, so the store never grows. Pure. */
export function pruneEaten(map, now = Date.now()) {
  const out = {};
  for (const [id, at] of Object.entries(map || {})) {
    const t = Date.parse(at);
    if (Number.isFinite(t) && now - t < KEEP_DAYS * 86400000) out[id] = at;
  }
  return out;
}

/** True when the entry has been ticked, in the database or on this phone. */
export function isEaten(entry) {
  if (!entry) return false;
  if (entry.eaten_at) return true;
  return Boolean(entry.id && readLocal()[entry.id]);
}

/** Entries that have been ticked. Pure apart from reading this phone's ticks. */
export function eatenOf(entries = []) {
  const local = readLocal();
  return entries.filter((e) => e && (e.eaten_at || (e.id && local[e.id])));
}

/**
 * Ticks or unticks a planned meal. Updates `entry.eaten_at` in place so the
 * caller can repaint without a reload.
 * @returns {Promise<{ ok: boolean, where?: 'household'|'phone', error?: Error }>}
 */
export async function setEaten(entry, on) {
  if (!entry || !entry.id) return { ok: false, error: new Error('Nothing to tick.') };
  const at = on ? new Date().toISOString() : null;
  if (leftoversReady()) {
    const { error } = await supabase.from('weekly_meal_plan').update({ eaten_at: at }).eq('id', entry.id);
    if (error) return { ok: false, error };
    entry.eaten_at = at;
    // A tick made on this phone before the migration is now in the database.
    const local = readLocal();
    if (local[entry.id]) { delete local[entry.id]; writeLocal(local); }
    return { ok: true, where: 'household' };
  }
  const map = pruneEaten(readLocal());
  if (on) map[entry.id] = at; else delete map[entry.id];
  if (!writeLocal(map)) return { ok: false, error: new Error('This phone would not store it.') };
  entry.eaten_at = at;
  return { ok: true, where: 'phone' };
}
