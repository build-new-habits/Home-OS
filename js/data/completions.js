// js/data/completions.js — 26 Aug 2026 v1
// All Supabase access for `chore_task_completions` (schema revision 5).
// Shared data-access contract: { ok, data|error } returns, error always
// checked, nothing thrown at views, no user_id on inserts (the column
// defaults to auth.uid(); RLS scopes it).
//
// ---- Why this table exists ----
// `chore_tasks.status` marks THE TASK complete, not this occurrence. Tick a
// repeating chore once and the whole series reads as done forever. A
// completion is a fact about a task ON A DATE, so it gets its own row and
// "is this due?" becomes a question with an answer.
//
// ---- Re-ticking must be harmless ----
// `unique (task_id, occurrence_date)` is the point of the table. A double
// tap, or an offline replay landing after the live write already succeeded,
// must not create a second row. Every write here is an UPSERT on that pair,
// so the second attempt is a no-op rather than an error the user has to
// understand.
//
// ---- Offline ----
// Ticking a chore is a one-tap daily action and must work with no signal,
// so it goes through the queue like water and shopping. The write carries a
// real task id and a date, so there is no parent-id dependency: it applies
// cleanly whenever it replays.

import { supabase } from '../supabaseClient.js';
import { attemptWrite } from '../lib/net.js';
import { enqueue, flush } from '../lib/offlineQueue.js';

const TABLE = 'chore_task_completions';

/**
 * Completions in a date window, for deciding what is still outstanding.
 * Returns rows, not a map: the caller knows how it wants to index them.
 */
export async function listBetween(startISO, endISO) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, task_id, occurrence_date, completed_at')
    .gte('occurrence_date', startISO)
    .lte('occurrence_date', endISO);
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** Every completion for one task, newest first — the history of a chore. */
export async function listForTask(taskId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, task_id, occurrence_date, completed_at')
    .eq('task_id', taskId)
    .order('occurrence_date', { ascending: false });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * A Set of "taskId|date" keys, which is how a calendar or dashboard asks
 * "has this one been done?" — one lookup per cell, no scanning.
 */
export function completionKeys(rows) {
  return new Set((rows || []).map((row) => `${row.task_id}|${row.occurrence_date}`));
}

export function isDone(keys, taskId, occurrenceISO) {
  return keys.has(`${taskId}|${occurrenceISO}`);
}

/**
 * Mark one occurrence done. Upsert, so ticking twice is harmless.
 *
 * Returns { ok, data, queued? }. `queued: true` means it is saved on this
 * device and will apply on reconnect — the caller should say so rather than
 * implying the write reached the server.
 */
export async function markDone(taskId, occurrenceISO) {
  if (!taskId || !occurrenceISO) {
    return { ok: false, error: new Error('A completion needs a task and a date.') };
  }
  const payload = { task_id: taskId, occurrence_date: occurrenceISO };
  try {
    const data = await attemptWrite(() =>
      supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'task_id,occurrence_date' })
        .select()
        .single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      const queuedId = await enqueue({ table: TABLE, type: 'upsert', payload });
      return { ok: true, queued: true, data: { ...payload, id: `pending-${queuedId}`, pending: true } };
    } catch (queueErr) {
      console.error('Could not queue a completion for later:', queueErr);
      return { ok: false, error: queueErr };
    }
  }
}

/** Un-tick an occurrence. Deleting a row that is not there is not an error. */
export async function markNotDone(taskId, occurrenceISO) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('task_id', taskId)
    .eq('occurrence_date', occurrenceISO);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * Replay queued completions. Scoped to this table — a non-scoped flush can
 * hand this module another table's operation, and the assertion below
 * THROWS rather than guessing, so a foreign op stays in the queue for its
 * owner instead of being silently dropped.
 */
export async function flushQueued() {
  return flush(async (op) => {
    if (op.table !== TABLE) {
      throw new Error(`completions.flushQueued received a ${op.table} operation`);
    }
    const { error } = await supabase
      .from(TABLE)
      .upsert(op.payload, { onConflict: 'task_id,occurrence_date' });
    // supabase-js RESOLVES on a database error. Without this check a failed
    // write would be treated as done and dropped from the queue.
    if (error) throw error;
  }, { tables: [TABLE] });
}
