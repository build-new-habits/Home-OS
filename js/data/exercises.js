// js/data/exercises.js — 19 Jul 2026 v1
import { supabase } from '../supabaseClient.js';
import { enqueue, flush } from '../lib/offlineQueue.js';

/**
 * Replays a queued exercise_logs write against Supabase. Passed to
 * offlineQueue.flush() — offlineQueue itself has no schema knowledge,
 * per its own header comment.
 */
async function applyExerciseLogOp(op) {
  if (op.type === 'insert') {
    const { error } = await supabase.from('exercise_logs').insert(op.payload);
    if (error) throw error;
    return;
  }
  if (op.type === 'update') {
    const { id, ...rest } = op.payload;
    const { error } = await supabase.from('exercise_logs').update(rest).eq('id', id);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown queued op type: ${op.type}`);
}

// Flush queued writes on reconnect. Module-level listener, same pattern as
// supabaseClient's single-instance export — this module owns exercise_logs
// sync, nothing else does.
window.addEventListener('online', () => {
  flush(applyExerciseLogOp)
    .then(({ failed }) => {
      for (const { op, error } of failed) {
        console.error('Failed to sync queued exercise log:', op, error);
      }
    })
    .catch((err) => console.error('Offline queue flush failed:', err));
});

export async function listCleared() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('clearance_status', 'cleared')
    .order('name');
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function listPending() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('clearance_status', 'pending_confirmation')
    .order('name');
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function getLogsForDate(logDate) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('log_date', logDate);
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Creates or updates today's log for an exercise. Never passes user_id
 * (defaults to auth.uid()). If the write fails (offline or network error),
 * enqueues it via offlineQueue and returns an optimistic { ok: true }
 * result carrying a synthetic row so the view can update immediately.
 */
export async function setDone(exerciseId, logDate, completed, existingLogId, notes) {
  const notesPayload = notes !== undefined ? { notes } : {};
  try {
    if (existingLogId) {
      const { data, error } = await supabase
        .from('exercise_logs')
        .update({ completed, ...notesPayload })
        .eq('id', existingLogId)
        .select()
        .single();
      if (error) throw error;
      return { ok: true, data };
    }
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({ exercise_id: exerciseId, log_date: logDate, completed, ...notesPayload })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    const payload = existingLogId
      ? { id: existingLogId, completed, ...notesPayload }
      : { exercise_id: exerciseId, log_date: logDate, completed, ...notesPayload };
    const op = {
      table: 'exercise_logs',
      type: existingLogId ? 'update' : 'insert',
      payload
    };
    try {
      await enqueue(op);
    } catch (queueErr) {
      return { ok: false, error: queueErr };
    }
    return {
      ok: true,
      queued: true,
      data: { ...payload, id: existingLogId || `pending-${Date.now()}`, exercise_id: exerciseId, log_date: logDate }
    };
  }
}

export async function addExercise({
  name,
  side,
  target_reps,
  target_sets,
  instructions,
  youtube_search_query,
  body_region,
  fromPhysio
}) {
  const normalizedSide = side ? side.trim().toLowerCase() : null;
  const payload = {
    name,
    side: ['left', 'right', 'both'].includes(normalizedSide) ? normalizedSide : null,
    target_reps: target_reps ?? null,
    target_sets: target_sets ?? null,
    instructions: instructions || null,
    youtube_search_query: youtube_search_query || null,
    body_region: body_region || null,
    source: fromPhysio ? 'physio' : 'suggested',
    clearance_status: fromPhysio ? 'cleared' : 'pending_confirmation'
  };
  const { data, error } = await supabase.from('exercises').insert(payload).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function clearExercise(exerciseId) {
  const { data, error } = await supabase
    .from('exercises')
    .update({ clearance_status: 'cleared' })
    .eq('id', exerciseId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}
