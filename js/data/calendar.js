// js/data/calendar.js — 21 Aug 2026 v2
// v2: listEvents() now REQUIRES an explicit eventTypes filter. In v1 it
// returned every row in calendar_events regardless of event_type, and
// views/chores.js rendered all of them as chore occurrences. That was
// invisible while chores were the only writer, and would have started
// silently corrupting the chores calendar the moment Phase 8 wrote its
// first 'work_location' row. Found by reading before building Phase 8.
//
// The parameter is required rather than defaulted, because "forgetting the
// filter" is precisely the failure being fixed — a default would let the
// next caller make the same mistake quietly. Asking for every type is
// still possible; it just has to be asked for.
// calendar_events queries. One row per recurring source (schema.md §2:
// calendar_events.source_id is a soft pointer, not a FK) — never one row
// per occurrence. Occurrences are expanded at render time by the view
// using js/lib/rrule.js.
import { supabase } from '../supabaseClient.js';

/**
 * Create or update the single calendar_events row for a repeatable
 * chore_tasks source. If isRepeatable is false, removes any existing row
 * instead (a task that stops repeating has nothing to show on the
 * calendar).
 *
 * Locked decision (flagged to the PM): chore_tasks has no start_date
 * column in schema.md. The recurrence anchor date is collected in the UI
 * and stored only in calendar_events.start_date — it never needs to live
 * on chore_tasks, since calendar_events already carries its own
 * start_date. This is a reversible, low-stakes call made to close a real
 * gap in the brief rather than leaving it open.
 */
export async function upsertTaskEvent({ taskId, title, isRepeatable, recurrenceRule, startDate }) {
  if (!isRepeatable) {
    return removeTaskEvent(taskId);
  }
  const existing = await findEventByTaskId(taskId);
  if (!existing.ok) return existing;

  const payload = {
    event_type: 'chore',
    source_id: taskId,
    title,
    start_date: startDate,
    recurrence_rule: recurrenceRule
  };

  if (existing.data) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(payload)
      .eq('id', existing.data.id)
      .select()
      .single();
    if (error) return { ok: false, error };
    return { ok: true, data };
  }

  const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function findEventByTaskId(taskId) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', 'chore')
    .eq('source_id', taskId)
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeTaskEvent(taskId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('event_type', 'chore')
    .eq('source_id', taskId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/** The event_type CHECK constraint, in full (schema.md). */
export const EVENT_TYPES = ['chore', 'holiday', 'work_location', 'custom'];

/**
 * Fetch event rows that could have an occurrence in [rangeStartISO,
 * rangeEndISO]. This is a loose server-side prefilter only (start_date in
 * the past is always included, since a recurring rule can still produce
 * future occurrences from an old start date) — the real intersection
 * check happens in the view via rrule.expand().
 *
 * @param {string} rangeStartISO kept for call-site clarity; see above for
 *        why it is deliberately not used as a lower bound.
 * @param {string} rangeEndISO
 * @param {{ eventTypes: string[] }} opts REQUIRED. Which event types the
 *        caller wants. `calendar_events` is shared by chores, holidays,
 *        work locations and custom entries, so a caller that does not say
 *        gets an error rather than everyone else's rows.
 */
export async function listEvents(rangeStartISO, rangeEndISO, { eventTypes } = {}) {
  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    return {
      ok: false,
      error: new Error('listEvents requires eventTypes, e.g. { eventTypes: ["chore"] }.')
    };
  }
  const unknown = eventTypes.filter((t) => !EVENT_TYPES.includes(t));
  if (unknown.length > 0) {
    return { ok: false, error: new Error(`Unknown event type(s): ${unknown.join(', ')}`) };
  }
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .in('event_type', eventTypes)
    .lte('start_date', rangeEndISO);
  if (error) return { ok: false, error };
  return { ok: true, data };
}
