// js/data/chores.js — 20 Jul 2026 v1
// Projects + tasks queries. Views never call Supabase directly — this is
// the only place that does, for these two tables.
import { supabase } from '../supabaseClient.js';
import { enqueue, flush } from '../lib/offlineQueue.js';

// ---- Projects (occasional/weekly action — not queued offline; the view
// tells the user to retry when back online if this fails, per principle 10:
// "meal planning / shopping generation may require connectivity ... say so
// clearly" — the same applies here, project setup is not a daily action) ----

export async function listProjects() {
  const { data, error } = await supabase
    .from('chore_projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function createProject({ title, colour, sort_order = 0 }) {
  const { data, error } = await supabase
    .from('chore_projects')
    .insert({ title, colour, sort_order })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateProject(projectId, { title, colour, sort_order } = {}) {
  const patch = {};
  if (title !== undefined) patch.title = title;
  if (colour !== undefined) patch.colour = colour;
  if (sort_order !== undefined) patch.sort_order = sort_order;
  const { data, error } = await supabase
    .from('chore_projects')
    .update(patch)
    .eq('id', projectId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

// Dependent count for the restrict-delete confirm (schema.md §2 / conventions §3).
export async function countTasksInProject(projectId) {
  const { count, error } = await supabase
    .from('chore_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

export async function deleteProject(projectId) {
  const { error } = await supabase.from('chore_projects').delete().eq('id', projectId);
  if (error) return { ok: false, error };
  return { ok: true };
}

// ---- Tasks (daily-use completion action — writes go through the offline
// queue on failure, following the pattern established in data/exercises.js:
// try the live write, and on failure enqueue it for replay on reconnect) ----

export async function listTasks(projectId) {
  let query = supabase.from('chore_tasks').select('*').order('title', { ascending: true });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function createTask({ project_id, title, details, is_repeatable, recurrence_rule }) {
  const payload = {
    project_id,
    title,
    details: details || null,
    is_repeatable: !!is_repeatable,
    recurrence_rule: is_repeatable ? recurrence_rule : null
  };
  try {
    const { data, error } = await supabase.from('chore_tasks').insert(payload).select().single();
    if (error) throw error;
    return { ok: true, data };
  } catch (error) {
    const queuedId = await enqueue({ table: 'chore_tasks', type: 'insert', payload }).catch(() => null);
    if (queuedId !== null) {
      return { ok: true, queued: true, data: { ...payload, id: `pending-${queuedId}` } };
    }
    return { ok: false, error };
  }
}

export async function updateTask(taskId, { title, details, is_repeatable, recurrence_rule } = {}) {
  const patch = {};
  if (title !== undefined) patch.title = title;
  if (details !== undefined) patch.details = details || null;
  if (is_repeatable !== undefined) patch.is_repeatable = is_repeatable;
  if (recurrence_rule !== undefined) patch.recurrence_rule = is_repeatable ? recurrence_rule : null;
  return writeTaskUpdate(taskId, patch);
}

export async function completeTask(taskId) {
  return writeTaskUpdate(taskId, { status: 'complete', completed_at: new Date().toISOString() });
}

export async function uncompleteTask(taskId) {
  return writeTaskUpdate(taskId, { status: 'pending', completed_at: null });
}

async function writeTaskUpdate(taskId, patch) {
  try {
    const { data, error } = await supabase
      .from('chore_tasks')
      .update(patch)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return { ok: true, data };
  } catch (error) {
    const queuedId = await enqueue({ table: 'chore_tasks', type: 'update', payload: { id: taskId, patch } }).catch(() => null);
    if (queuedId !== null) {
      return { ok: true, queued: true };
    }
    return { ok: false, error };
  }
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from('chore_tasks').delete().eq('id', taskId);
  if (error) return { ok: false, error };
  return { ok: true };
}

// ---- Offline replay ----
// Known limitation (flagged in the Phase 4 handoff): if a *repeatable*
// task is created while offline, its calendar_events row is not written
// here on sync — data/chores.js does not import data/calendar.js, per
// REPO_STRUCTURE.md's "data imports supabaseClient and lib only" rule.
// The view surfaces this to the user at save time; re-saving the task
// once online creates the missing calendar entry.

function applyQueuedOp(op) {
  if (op.table === 'chore_tasks') {
    if (op.type === 'insert') {
      return supabase.from('chore_tasks').insert(op.payload);
    }
    if (op.type === 'update') {
      return supabase.from('chore_tasks').update(op.payload.patch).eq('id', op.payload.id);
    }
  }
  return Promise.reject(new Error(`No handler for queued op: ${op.table}/${op.type}`));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const { failed } = await flush(applyQueuedOp);
    for (const f of failed) {
      console.error('Failed to sync a queued chore write:', f.op, f.error);
    }
  });
}
