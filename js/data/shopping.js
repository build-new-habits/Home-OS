// js/data/shopping.js — 01 Sep 2026 v2
// All Supabase access for `shopping_list_items`.
// Shared data-access contract: { ok, data|error }, error always checked,
// nothing thrown at views, no user_id on inserts (RLS supplies it).
//
// ---- Regeneration must not destroy decisions ----
// Rebuilding from the meal plan replaces ONLY rows that came from the meal
// plan AND are still `needed`. Everything else survives:
//   * `have` / `bought` — you looked and decided. Resurrecting those reads
//     as the app forgetting what it was told.
//   * source `usual`    — staples you added by hand.
//   * source `holiday`  — put there by a trip's purchase list.
//
// ---- Delete and insert are separate, delete first ----
// If the delete succeeds and the insert fails you get an EMPTY list rather
// than a doubled one. Empty is recoverable by regenerating; doubled is
// silent and wrong. The failure message says so.
//
// ---- Ticking works in a shop, where signal does not ----
// Status changes go through the offline queue. They carry a real row id, so
// unlike a queued food there is no parent-id dependency: they apply cleanly
// whenever they replay.

import { supabase } from '../supabaseClient.js';
import { attemptWrite } from '../lib/net.js';
import { enqueue, flush } from '../lib/offlineQueue.js';

const TABLE = 'shopping_list_items';

export const SOURCES = ['meal_plan', 'usual', 'holiday'];
export const STATUSES = ['needed', 'have', 'bought'];

/** What each source is, in the user's words. Shown on grouped lines. */
export const SOURCE_LABELS = {
  meal_plan: 'from your weekly plan',
  usual: 'staple you always buy',
  holiday: 'for a holiday'
};

export const STATUS_LABELS = {
  needed: 'Still to get',
  have: 'Already have',
  bought: 'Bought'
};

export async function listItems() {
  const { data, error } = await supabase
    .from(TABLE)
    // Phase 12: item_label and grams_per_item come along so the list can
    // read "4 tins (1.6 kg)" rather than "4 item" while you are in the shop.
    .select('id, food_id, qty_needed, unit, source, status, '
      + 'foods(id, name, category, item_label, grams_per_item)')
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Add one item by hand. Defaults to `usual`, because a hand-added thing is
 * a staple — anything from the plan arrives through regeneration.
 */
export async function addItem({ food_id, qty_needed, unit = 'item', source = 'usual' }) {
  if (!food_id) return { ok: false, error: new Error('Pick an item first.') };
  if (!SOURCES.includes(source)) {
    return { ok: false, error: new Error(`"${source}" is not a valid source.`) };
  }
  const qty = qty_needed === '' || qty_needed == null ? null : Number(qty_needed);
  if (qty != null && (!Number.isFinite(qty) || qty <= 0)) {
    return { ok: false, error: new Error('Enter a quantity greater than zero, or leave it blank.') };
  }
  const payload = {
    food_id,
    qty_needed: qty,
    unit: ['g', 'ml', 'item'].includes(unit) ? unit : 'item',
    source,
    status: 'needed'
  };
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Change an item's status, queueing when offline.
 *
 * The view is optimistic — the tap counts immediately and this runs behind
 * it — so `queued` is a success from the user's point of view, not a
 * deferral to apologise for.
 */
export async function setStatus(itemId, status) {
  if (!STATUSES.includes(status)) {
    return { ok: false, error: new Error(`"${status}" is not a valid status.`) };
  }
  const payload = { id: itemId, status };
  try {
    const data = await attemptWrite(() =>
      supabase.from(TABLE).update({ status }).eq('id', itemId).select().single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      await enqueue({ table: TABLE, type: 'update', payload });
      return { ok: true, queued: true, data: payload };
    } catch (queueErr) {
      console.error('Could not queue a shopping status:', queueErr);
      return { ok: false, error: queueErr };
    }
  }
}

/**
 * Is this food already on the list from a holiday?
 *
 * The bridge is idempotent through this: ticking, unticking and re-ticking
 * a holiday purchase must not stack up three identical lines. There is no
 * foreign key from a list item back to the holiday item — deliberately, so
 * deleting a holiday cannot cascade away something you still need to buy —
 * so identity is (food, source).
 */
export async function findHolidayItem(foodId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, status')
    .eq('food_id', foodId)
    .eq('source', 'holiday')
    .limit(1);
  if (error) return { ok: false, error };
  return { ok: true, data: (data && data[0]) || null };
}

/** Remove a holiday-sourced line for one food, when its tick is undone. */
export async function removeHolidayItem(foodId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('food_id', foodId)
    .eq('source', 'holiday');
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function removeItem(itemId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', itemId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * How many rows a regeneration would replace, so the confirm can say it
 * before anything is destroyed.
 */
export async function countReplaceable() {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('source', 'meal_plan')
    .eq('status', 'needed');
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

/**
 * How many meal-plan rows a regeneration would KEEP because they have been
 * ticked. Counted separately so the confirm can promise they survive.
 */
export async function countProtected() {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('source', 'meal_plan')
    .in('status', ['have', 'bought']);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

/**
 * Replace the meal-plan half of the list.
 *
 * `items` are shortfall results. Delete runs FIRST and its error is checked
 * before the insert: a failed delete followed by a successful insert would
 * double the list silently, which is far worse than an empty one.
 */
export async function replaceGeneratedItems(items) {
  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq('source', 'meal_plan')
    .eq('status', 'needed');
  if (deleteError) {
    return { ok: false, error: deleteError, stage: 'delete' };
  }

  const rows = (items || [])
    .filter((item) => item.food && item.food.id && item.shortfall > 0)
    .map((item) => ({
      food_id: item.food.id,
      qty_needed: item.shortfall,
      unit: ['g', 'ml', 'item'].includes(item.unit) ? item.unit : 'item',
      source: 'meal_plan',
      status: 'needed'
    }));

  if (rows.length === 0) return { ok: true, data: [] };

  const { data, error } = await supabase.from(TABLE).insert(rows).select();
  if (error) {
    // The old rows are already gone. Say that plainly so the user knows
    // regenerating again fixes it rather than wondering what happened.
    return { ok: false, error, stage: 'insert' };
  }
  return { ok: true, data };
}

/**
 * Group by food so one thing is one entry, even when it arrives twice —
 * once from the plan and once as a staple.
 *
 * The ROWS stay separate: `source` is what makes regeneration safe, and a
 * merged row could not be replaced without eating the manual one. Only the
 * rendering is grouped. A total is offered ONLY when the units match;
 * grams are never added to items.
 */
export function groupByFood(items) {
  const map = new Map();
  for (const item of items || []) {
    const key = item.food_id;
    if (!map.has(key)) map.set(key, { food: item.foods || {}, lines: [] });
    map.get(key).lines.push(item);
  }
  return [...map.values()].map((entry) => {
    const units = new Set(entry.lines.map((line) => line.unit));
    const total = units.size === 1 && entry.lines.every((line) => line.qty_needed != null)
      ? entry.lines.reduce((sum, line) => sum + Number(line.qty_needed), 0)
      : null;
    return { ...entry, total, unit: units.size === 1 ? [...units][0] : null };
  });
}

/**
 * Aisle order, not alphabetical. A list that walks you through the shop in
 * order is the difference between a list you use and one you ignore.
 */
export const AISLE_ORDER = [
  'food_fresh', 'food_frozen', 'food_ambient', 'drink',
  'household', 'personal', 'home', 'pet', 'other'
];

export function aisleRank(category) {
  const index = AISLE_ORDER.indexOf(category);
  return index === -1 ? AISLE_ORDER.length : index;
}

/** Replay queued status changes. Scoped: a foreign op THROWS rather than
 *  being guessed at, so it stays in the queue for its owner. */
export async function flushQueued() {
  return flush(async (op) => {
    if (op.table !== TABLE) {
      throw new Error(`shopping.flushQueued received a ${op.table} operation`);
    }
    const { error } = await supabase
      .from(TABLE)
      .update({ status: op.payload.status })
      .eq('id', op.payload.id);
    // supabase-js RESOLVES on a database error. Without this check a failed
    // write would be treated as done and dropped from the queue.
    if (error) throw error;
  }, { tables: [TABLE] });
}
