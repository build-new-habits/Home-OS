// js/data/calendar.js — 21 Aug 2026 v3
// v3 (Phase 8): work-location events and assertSupportedRule() live here.
//
// DEVIATION FROM THE PHASE 8 BRIEF, deliberately. The brief listed a
// separate js/data/workLocation.js and worried about it needing to import
// this module (which REPO_STRUCTURE forbids: data/ imports supabaseClient
// and lib/ only). That problem disappears entirely if one table has one
// data module: calendar_events is one table, so it gets one module. Two
// modules writing the same table would also make the event_type discipline
// below harder to hold, which is exactly what went wrong in v1.
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
  const guard = assertSupportedRule(recurrenceRule);
  if (!guard.ok) return guard;

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
 * Rejects recurrence rules this app's engine cannot honour.
 *
 * lib/rrule.js supports FREQ (DAILY/WEEKLY/MONTHLY), INTERVAL, BYDAY and
 * BYMONTHDAY. It SILENTLY IGNORES `UNTIL` and `COUNT` — it does not reject
 * them, it does not warn, it just keeps generating occurrences. Verified
 * 21 Aug 2026 against the real engine:
 *
 *     FREQ=DAILY;UNTIL=20260828  over a 15-day window -> 15 dates, not 5
 *     FREQ=DAILY;COUNT=7         over a 15-day window -> 15 dates, not 7
 *
 * So a bounded range encoded as a recurrence rule produces something that
 * looks right for a fortnight and is wrong forever afterwards. rrule.js is
 * write-once and cannot be fixed, so the boundary is guarded instead.
 *
 * Safe against cleared Phase 4 code: views/chores.js buildRuleFromForm()
 * emits only FREQ/INTERVAL/BYDAY/BYMONTHDAY. Checked by reading the call
 * site before this guard was written, because if it had emitted either
 * token this guard would have broken working chores recurrence.
 *
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
export function assertSupportedRule(rule) {
  if (rule === null || rule === undefined || rule === '') return { ok: true };
  if (typeof rule !== 'string') {
    return { ok: false, error: new Error('A recurrence rule must be text.') };
  }
  const upper = rule.toUpperCase();
  const unsupported = ['UNTIL', 'COUNT'].filter((token) => upper.includes(`${token}=`));
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: new Error(
        `This app's repeat engine ignores ${unsupported.join(' and ')}, so a repeat `
        + 'set that way would carry on forever. Use an open-ended repeat and remove it '
        + 'when it stops, or set a single date instead.'
      )
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Work location (Phase 8). event_type = 'work_location'.
// location_label carries the place; recurrence_rule the pattern. There is
// no end date, by design — see assertSupportedRule().
// ---------------------------------------------------------------------

const WORK = 'work_location';

export async function listWorkLocations() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', WORK)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function createWorkLocation({ title, locationLabel, startDate, recurrenceRule }) {
  const name = String(title || '').trim();
  if (!name) return { ok: false, error: new Error('Give this a name, such as "Office".') };
  if (!startDate) return { ok: false, error: new Error('Pick the date this pattern starts from.') };
  const guard = assertSupportedRule(recurrenceRule);
  if (!guard.ok) return guard;

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      event_type: WORK,
      source_id: null,
      title: name,
      start_date: startDate,
      recurrence_rule: recurrenceRule || null,
      location_label: String(locationLabel || '').trim() || null
    })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateWorkLocation(eventId, { title, locationLabel, startDate, recurrenceRule } = {}) {
  const patch = {};
  if (title !== undefined) {
    const name = String(title).trim();
    if (!name) return { ok: false, error: new Error('Give this a name, such as "Office".') };
    patch.title = name;
  }
  if (locationLabel !== undefined) patch.location_label = String(locationLabel).trim() || null;
  if (startDate !== undefined) patch.start_date = startDate;
  if (recurrenceRule !== undefined) {
    const guard = assertSupportedRule(recurrenceRule);
    if (!guard.ok) return guard;
    patch.recurrence_rule = recurrenceRule || null;
  }
  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', eventId)
    .eq('event_type', WORK)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeWorkLocation(eventId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('event_type', WORK);
  if (error) return { ok: false, error };
  return { ok: true };
}

// ---------------------------------------------------------------------
// Holiday projection (Phase 8).
//
// ONE row per holiday, recurrence_rule ALWAYS NULL. A holiday is a bounded
// range and this engine cannot express bounds, so the row marks the START
// only. The range itself lives on holidays.start_date / end_date, which is
// the source of truth. Never encode the span as a daily rule.
//
// source_id is a soft pointer, not a foreign key (schema.md §2), so nothing
// cascades this row when the holiday goes — data/holidays.js deletes it
// explicitly.
// ---------------------------------------------------------------------

export async function upsertHolidayEvent({ holidayId, title, startDate }) {
  const existing = await findHolidayEvent(holidayId);
  if (!existing.ok) return existing;

  const payload = {
    event_type: 'holiday',
    source_id: holidayId,
    title,
    start_date: startDate,
    recurrence_rule: null
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

export async function findHolidayEvent(holidayId) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', 'holiday')
    .eq('source_id', holidayId)
    .maybeSingle();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeHolidayEvent(holidayId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('event_type', 'holiday')
    .eq('source_id', holidayId);
  if (error) return { ok: false, error };
  return { ok: true };
}

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
