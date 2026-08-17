// js/data/water.js — 17 Aug 2026 v1
// All Supabase access for water_logs. Shared data-access contract:
// { ok, data|error } returns, error always checked, nothing thrown at views.
//
// Canonical units (schema.md §8): water is stored in MILLILITRES, always.
//
// Offline totals: the Phase 5 smoke test requires today's total to stay
// correct with no network. A plain select cannot do that, so totalForDate()
// adds any water_logs rows still sitting in the offline queue for that date
// to whatever the server returned. Queued millilitres are real logged
// millilitres from the user's point of view — showing a total that silently
// drops them would read as "my taps didn't count" (behavioural principle 1).

import { supabase } from '../supabaseClient.js';
import { enqueue, flush, list as listQueued } from '../lib/offlineQueue.js';

const TABLE = 'water_logs';

/**
 * Glass size and daily target are fixed constants this phase — there is no
 * schema field for either, and inventing a DB column is out of scope.
 * Making these user-configurable is a future settings addition and would
 * need new user_settings columns.
 */
export const GLASS_ML = 250;
export const DAILY_TARGET_ML = 2000;

async function applyWaterOp(op) {
  if (op.table !== TABLE) {
    throw new Error(`applyWaterOp received a non-${TABLE} op: ${op.table}`);
  }
  if (op.type === 'insert') {
    const { error } = await supabase.from(TABLE).insert(op.payload);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown queued op type: ${op.type}`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush(applyWaterOp, { tables: [TABLE] })
      .then(({ failed }) => {
        for (const { op, error } of failed) {
          console.error('Failed to sync queued water log:', op, error);
        }
      })
      .catch((err) => console.error('Offline queue flush failed (water):', err));
  });
}

/** Millilitres queued but not yet synced, for a given date. */
async function queuedMlForDate(logDate) {
  try {
    const pending = await listQueued();
    return pending
      .filter((op) => op.table === TABLE && op.payload && op.payload.log_date === logDate)
      .reduce((sum, op) => sum + (Number(op.payload.ml_logged) || 0), 0);
  } catch (err) {
    // Never let a queue read break the total; report it rather than swallow.
    console.error('Could not read queued water logs:', err);
    return 0;
  }
}

export async function listForDate(logDate) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('log_date', logDate)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Total millilitres for a date: synced rows plus anything still queued.
 * If the server read fails (offline), the queued total is still returned
 * with `partial: true` so the view can be honest about what it knows.
 */
export async function totalForDate(logDate) {
  const queuedMl = await queuedMlForDate(logDate);
  const { data, error } = await supabase
    .from(TABLE)
    .select('ml_logged')
    .eq('log_date', logDate);
  if (error) {
    return { ok: true, data: { total: queuedMl, queuedMl, partial: true } };
  }
  const syncedMl = (data || []).reduce((sum, row) => sum + (Number(row.ml_logged) || 0), 0);
  return { ok: true, data: { total: syncedMl + queuedMl, queuedMl, partial: false } };
}

/**
 * Logs an amount of water. Queues on network failure and reports the write
 * as accepted, because from the user's side the tap did happen.
 */
export async function logWater(mlLogged, logDate) {
  const amount = Number(mlLogged);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: new Error('Water amount must be a positive number of millilitres.') };
  }
  const payload = { log_date: logDate, ml_logged: Math.round(amount) };
  try {
    const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
    if (error) throw error;
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
