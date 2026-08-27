// js/data/holidays.js — 21 Aug 2026 v1
// All Supabase access for `holidays`, `holiday_checklist_items` and
// `holiday_purchase_items`. Shared data-access contract: { ok, data|error }
// returns, error always checked, nothing thrown at views, no user_id on
// inserts (the column defaults to auth.uid(); RLS scopes it).
//
// Three tables in one module because they are one domain: both child tables
// exist only as children of a holiday and cascade with it.
//
// ---- The date range has no CHECK constraint ----
// schema.md gives holidays a start_date and an end_date and no constraint
// between them, so the database will happily accept a holiday that ends
// before it starts. That row then renders as nothing at all — a holiday
// that vanishes rather than errors. Validated here instead, before the
// insert, so the user gets a sentence rather than an empty screen.
//
// ---- Offline ----
// Ticking a checklist item is a light, repeated action done while packing,
// which is often away from wifi, so status changes ARE queued and the view
// treats them optimistically. Creating and deleting holidays is not queued:
// a holiday insert must return a real id before its items can reference it,
// and a queued insert has no id — the same reasoning as Phase 6 meals.
//
// ---- The calendar row is a soft pointer ----
// calendar_events.source_id is NOT a foreign key (schema.md §2), so deleting
// a holiday does not remove its calendar row. deleteHoliday() removes it
// explicitly. Miss that and an orphan sits on the calendar forever, pointing
// at a holiday that no longer exists.

import { supabase } from '../supabaseClient.js';
import { enqueue, flush, list as listQueued } from '../lib/offlineQueue.js';
import { attemptWrite } from '../lib/net.js';

const HOLIDAYS = 'holidays';
const CHECKLIST = 'holiday_checklist_items';
const PURCHASES = 'holiday_purchase_items';

/** Matches the status CHECK constraint on both child tables. */
export const ITEM_STATUSES = ['pending', 'complete'];

export const ITEM_TABLES = { checklist: CHECKLIST, purchase: PURCHASES };

function tableFor(kind) {
  // 'pack' and 'do' are both rows in the checklist table, told apart by the
  // `kind` column. 'checklist' is kept as an alias so any older caller that
  // has not been updated still resolves rather than throwing.
  if (kind === 'purchase') return PURCHASES;
  if (kind === 'checklist' || kind === 'pack' || kind === 'do') return CHECKLIST;
  throw new Error(`Unknown holiday item kind: ${kind}`);
}


async function applyItemOp(op) {
  // Throwing, not returning: flush() removes an op as soon as the handler
  // resolves, so a quiet "not mine" return would delete another module's
  // queued write (standing rule 7).
  if (op.table !== CHECKLIST && op.table !== PURCHASES) {
    throw new Error(`applyItemOp received an unexpected table: ${op.table}`);
  }
  if (op.type === 'update') {
    const { error } = await supabase.from(op.table).update(op.payload).eq('id', op.rowId);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown queued op type: ${op.type}`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush(applyItemOp, { tables: [CHECKLIST, PURCHASES] })
      .then(({ failed }) => {
        for (const { op, error } of failed) {
          console.error('Failed to sync a queued holiday item:', op, error);
        }
      })
      .catch((err) => console.error('Offline queue flush failed (holiday items):', err));
  });
}

/** Status changes still waiting to upload, keyed by row id. */
export async function pendingItemStatuses() {
  const map = new Map();
  try {
    const queued = await listQueued();
    for (const op of queued) {
      if (op.table !== CHECKLIST && op.table !== PURCHASES) continue;
      if (op.type !== 'update' || !op.rowId || !op.payload) continue;
      map.set(op.rowId, op.payload.status);
    }
  } catch (err) {
    console.error('Could not read queued holiday items:', err);
  }
  return map;
}

// ---------------------------------------------------------------- holidays

export async function listHolidays() {
  const { data, error } = await supabase
    .from(HOLIDAYS)
    .select('*')
    .order('start_date', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** ISO date, or null. Rejects anything the date input could not have produced. */
function normaliseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return text;
}

function validateRange(startDate, endDate) {
  const start = normaliseDate(startDate);
  const end = normaliseDate(endDate);
  if (!start) return { ok: false, error: new Error('Pick a start date.') };
  if (!end) return { ok: false, error: new Error('Pick an end date.') };
  // No CHECK constraint backs this up, so it is enforced here or nowhere.
  if (end < start) {
    return {
      ok: false,
      error: new Error('The end date is before the start date — swap them round.')
    };
  }
  return { ok: true, data: { start, end } };
}

export async function createHoliday({ title, start_date, end_date }) {
  const name = String(title || '').trim();
  if (!name) return { ok: false, error: new Error('Give the holiday a name.') };
  const range = validateRange(start_date, end_date);
  if (!range.ok) return range;

  const { data, error } = await supabase
    .from(HOLIDAYS)
    .insert({ title: name, start_date: range.data.start, end_date: range.data.end })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateHoliday(holidayId, { title, start_date, end_date } = {}) {
  const patch = {};
  if (title !== undefined) {
    const name = String(title).trim();
    if (!name) return { ok: false, error: new Error('Give the holiday a name.') };
    patch.title = name;
  }
  if (start_date !== undefined || end_date !== undefined) {
    const range = validateRange(start_date, end_date);
    if (!range.ok) return range;
    patch.start_date = range.data.start;
    patch.end_date = range.data.end;
  }
  const { data, error } = await supabase
    .from(HOLIDAYS)
    .update(patch)
    .eq('id', holidayId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * What a delete would take with it. Both child tables are ON DELETE CASCADE
 * (schema.md §2), so these rows GO — they do not block. The confirm names
 * them so nothing disappears unannounced.
 */
export async function countHolidayChildren(holidayId) {
  const counts = { checklist: 0, purchases: 0, total: 0 };
  for (const [key, table] of [['checklist', CHECKLIST], ['purchases', PURCHASES]]) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('holiday_id', holidayId);
    if (error) return { ok: false, error };
    counts[key] = count ?? 0;
    counts.total += count ?? 0;
  }
  return { ok: true, data: counts };
}

/** Plain-English summary of a cascade count, for the confirm dialog. */
export function describeChildren(counts) {
  if (!counts || counts.total === 0) return '';
  const parts = [];
  if (counts.checklist > 0) {
    parts.push(`${counts.checklist} checklist item${counts.checklist === 1 ? '' : 's'}`);
  }
  if (counts.purchases > 0) {
    parts.push(`${counts.purchases} thing${counts.purchases === 1 ? '' : 's'} to buy`);
  }
  return parts.join(' and ');
}

export async function deleteHoliday(holidayId) {
  const { error } = await supabase.from(HOLIDAYS).delete().eq('id', holidayId);
  if (error) return { ok: false, error };
  return { ok: true };
}

// ------------------------------------------------------------------- items

/**
 * The three lists a holiday has.
 *
 * `purchase` is its own table because it carries send_to_shopping, which
 * bridges into the shopping list. `pack` and `do` share
 * holiday_checklist_items and are told apart by its `kind` column
 * (revision 6) — same shape, one code path, one RLS policy.
 */
export const ITEM_KINDS = [
  { value: 'purchase', label: 'Things to buy', singular: 'thing to buy' },
  { value: 'pack', label: 'Things to pack', singular: 'thing to pack' },
  { value: 'do', label: 'Things to do there', singular: 'thing to do' }
];

export function itemKindLabel(kind) {
  const found = ITEM_KINDS.find((k) => k.value === kind);
  return found ? found.label : kind;
}

export async function listItems(holidayId, kind) {
  let query = supabase
    .from(tableFor(kind))
    .select('*')
    .eq('holiday_id', holidayId)
    .order('created_at', { ascending: true });
  // Checklist rows are split by `kind`. Filtering in SQL rather than after
  // the fact keeps the index on (holiday_id, kind) doing the work.
  if (kind === 'pack' || kind === 'do') query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function addItem(kind, { holiday_id, title, send_to_shopping = false }) {
  const name = String(title || '').trim();
  if (!name) return { ok: false, error: new Error('Give the item a name.') };
  if (!holiday_id) return { ok: false, error: new Error('Pick a holiday first.') };

  const payload = { holiday_id, title: name };
  // send_to_shopping is stored ONLY on purchase items — the checklist table
  // has no such column and would reject it.
  if (kind === 'purchase') payload.send_to_shopping = Boolean(send_to_shopping);
  // `kind` is only meaningful on the shared checklist table. Sent explicitly
  // rather than relying on the column default, so a packing item is a
  // packing item because the code said so, not by accident.
  if (kind === 'pack' || kind === 'do') payload.kind = kind;

  const { data, error } = await supabase.from(tableFor(kind)).insert(payload).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Sets an item's status, queueing when offline.
 *
 * The view is optimistic — the tick counts immediately and this runs behind
 * it — so a queued result is a success from the user's point of view, not a
 * deferral to report.
 */
export async function setItemStatus(kind, itemId, status) {
  if (!ITEM_STATUSES.includes(status)) {
    return { ok: false, error: new Error(`"${status}" is not a valid status.`) };
  }
  const table = tableFor(kind);
  try {
    const data = await attemptWrite(() =>
      supabase.from(table).update({ status }).eq('id', itemId).select().single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      await enqueue({ table, type: 'update', rowId: itemId, payload: { status } });
      return { ok: true, queued: true, data: { id: itemId, status } };
    } catch (queueErr) {
      console.error('Could not queue a holiday item status:', queueErr);
      return { ok: false, error: queueErr };
    }
  }
}

export async function setSendToShopping(itemId, sendToShopping) {
  // Phase 8 stores this flag and nothing more. It does NOT create a
  // shopping_list_items row, because that table's food_id is NOT NULL and
  // references foods(id) — and "sun cream" has no foods row. The bridge is
  // deferred to the Phase 7 build, which owns shopping_list_items and its
  // UI. See phase8_build_brief.md.
  const { data, error } = await supabase
    .from(PURCHASES)
    .update({ send_to_shopping: Boolean(sendToShopping) })
    .eq('id', itemId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeItem(kind, itemId) {
  const { error } = await supabase.from(tableFor(kind)).delete().eq('id', itemId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/** "24 to 31 August 2026" / "24 August 2026" — always text, never a bar alone. */
export function formatRange(startISO, endISO) {
  const start = normaliseDate(startISO);
  const end = normaliseDate(endISO);
  if (!start) return '';
  const fmt = (iso, withYear = true) => {
    const [y, m, d] = iso.split('-').map(Number);
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'][m - 1];
    return withYear ? `${d} ${month} ${y}` : `${d} ${month}`;
  };
  if (!end || end === start) return fmt(start);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  if (sameMonth) return `${start.split('-')[2].replace(/^0/, '')} to ${fmt(end)}`;
  return `${fmt(start, !sameYear)} to ${fmt(end)}`;
}

/** Whole days from start to end, inclusive. */
export function nightsBetween(startISO, endISO) {
  const start = normaliseDate(startISO);
  const end = normaliseDate(endISO);
  if (!start || !end) return null;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86400000) + 1;
}
