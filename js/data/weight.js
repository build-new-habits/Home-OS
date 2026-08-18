// js/data/weight.js — 18 Aug 2026 v2
// v2: writes go through attemptWrite() (see lib/net.js) so an offline log
// queues immediately instead of hanging. Weights are rounded to gram
// precision before storage — a stone/lb conversion produced values like
// 79.83235206067259, which is false precision from a scale reading to the
// nearest pound.
// All Supabase access for weight_logs. Follows the shared data-access
// contract (GEMINI_BUILD_CONVENTIONS.md §2): every call checks `error` and
// returns { ok, data|error }; views never see a thrown exception.
//
// Canonical units (schema.md §8): weight is stored in KG, always. Callers
// convert display units -> kg via lib/units.js BEFORE reaching this module.
// Nothing display-formatted is ever written here.
//
// Target handling (locked architectural decision, Phase 5):
//   weight_logs.weight_kg is NOT NULL, so a target cannot exist as a row of
//   its own. target_weight_kg / target_date therefore ride on an existing
//   log row. The CURRENT target is the most recent non-null target by
//   log_date (then created_at); setTarget() UPDATES the most recent log
//   rather than inserting. With no logs at all, there is nowhere to put a
//   target — setTarget returns ok:false with code 'no-logs' and the view
//   disables the control rather than inventing a weight value.

import { supabase } from '../supabaseClient.js';
import { enqueue, flush } from '../lib/offlineQueue.js';
import { attemptWrite } from '../lib/net.js';

const TABLE = 'weight_logs';

/**
 * Replays a queued weight_logs write. Passed to offlineQueue.flush() with
 * a { tables } filter, so it only ever receives its own ops. Throws on a
 * non-owned op rather than returning: flush() removes an op as soon as
 * applyFn resolves, so a silent return would delete another module's write.
 */
async function applyWeightOp(op) {
  if (op.table !== TABLE) {
    throw new Error(`applyWeightOp received a non-${TABLE} op: ${op.table}`);
  }
  if (op.type === 'insert') {
    const { error } = await supabase.from(TABLE).insert(op.payload);
    if (error) throw error;
    return;
  }
  if (op.type === 'update') {
    const { id, ...rest } = op.payload;
    const { error } = await supabase.from(TABLE).update(rest).eq('id', id);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown queued op type: ${op.type}`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush(applyWeightOp, { tables: [TABLE] })
      .then(({ failed }) => {
        // No silent failures: each failed op is reported individually.
        for (const { op, error } of failed) {
          console.error('Failed to sync queued weight log:', op, error);
        }
      })
      .catch((err) => console.error('Offline queue flush failed (weight):', err));
  });
}

/** All logs oldest-first, which is the order the trend line needs. */
export async function listLogs() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('log_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Records a weight for a date. `weightKg` MUST already be canonical kg.
 * On network failure the write is queued and an optimistic row returned so
 * the view can update immediately (same shape as exercises.setDone).
 */
export async function logWeight(weightKg, logDate) {
  // Gram precision. Storing 79.83235206067259 implies a measurement accuracy
  // no bathroom scale has; it is an artefact of dividing pounds by 2.20462.
  const payload = { log_date: logDate, weight_kg: Math.round(weightKg * 1000) / 1000 };
  try {
    const data = await attemptWrite(() =>
      supabase.from(TABLE).insert(payload).select().single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      await enqueue({ table: TABLE, type: 'insert', payload });
    } catch (queueErr) {
      return { ok: false, error: queueErr };
    }
    return { ok: true, queued: true, data: { ...payload, id: `pending-${Date.now()}` } };
  }
}

/**
 * The current target: most recent row carrying a non-null target_weight_kg.
 * Returns { ok: true, data: null } when no target has ever been set — an
 * absent target is a normal state, not an error.
 */
export async function getCurrentTarget() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, target_weight_kg, target_date, log_date')
    .not('target_weight_kg', 'is', null)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return { ok: false, error };
  if (!data || data.length === 0) return { ok: true, data: null };
  return { ok: true, data: data[0] };
}

/**
 * Attaches a target to the most recent existing log row. See the module
 * header for why this is an UPDATE and not an INSERT. Returns
 * { ok:false, code:'no-logs' } when there is no row to attach to, so the
 * view can show neutral guidance instead of a failure message.
 */
export async function setTarget(targetWeightKg, targetDate) {
  const { data: recent, error: findErr } = await supabase
    .from(TABLE)
    .select('id')
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (findErr) return { ok: false, error: findErr };
  if (!recent || recent.length === 0) {
    return { ok: false, code: 'no-logs', error: new Error('Log a weight before setting a target.') };
  }
  const patch = {
    target_weight_kg: Math.round(targetWeightKg * 1000) / 1000,
    target_date: targetDate || null
  };
  const targetId = recent[0].id;
  try {
    const data = await attemptWrite(() =>
      supabase.from(TABLE).update(patch).eq('id', targetId).select().single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      await enqueue({ table: TABLE, type: 'update', payload: { id: targetId, ...patch } });
    } catch (queueErr) {
      return { ok: false, error: queueErr };
    }
    return { ok: true, queued: true, data: { id: targetId, ...patch } };
  }
}
