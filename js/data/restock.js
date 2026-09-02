// js/data/restock.js — 01 Sep 2026 v2
// Phase 11. Marking something bought puts it in the cupboard.
//
// ---- The gap this closes ----
// setStatus() wrote 'bought' and nothing else. So the shopping list knew
// you had bought the tomatoes and the pantry did not, which meant next
// week's shortfall diff cheerfully asked you to buy them again. The list
// and the cupboard were describing the same fortnight and disagreeing.
//
// ---- Why this is its own module ----
// It spans shopping_list_items and pantry_stock, and the offline queue is
// table-scoped: flush() must never replay an operation against the wrong
// table. Putting the bridge in data/shopping.js would have put a
// pantry_stock write inside the module whose queue entries are all tagged
// 'shopping_list_items'. Separate module, separate writes, no crossing.
//
// ---- Units are not converted here ----
// If the list says 4 item and the pantry row says 1600 g, adding 4 to 1600
// is silent corruption that only shows up weeks later as a shopping list
// that has quietly stopped making sense. There IS a correct conversion
// (via grams_per_item) but doing it invisibly on a status tap is the wrong
// moment: the user did not ask to reconcile units, they ticked a box.
// So: report the mismatch, write nothing, let them resolve it deliberately.

import { supabase } from '../supabaseClient.js';
import { findByFood, addStock, updateStock, todayIso, defaultShelfLife, isValidUnit } from './pantry.js';

/**
 * Outcomes. Every one of these is a fact to state plainly, never a warning
 * to feel bad about — behavioural principle 1 applies to a cupboard as much
 * as to a weight log.
 */
export const RESTOCK = {
  CREATED: 'created',
  INCREASED: 'increased',
  UNIT_MISMATCH: 'unit-mismatch',
  NO_AMOUNT: 'no-amount',
  SKIPPED: 'skipped'
};

/**
 * Puts a bought item into the pantry.
 *
 * @param {object} item A shopping_list_items row: food_id, qty_needed, unit.
 * @param {{ category?: string }} [food] The food, for a shelf-life default.
 * @returns {Promise<{ ok: boolean, outcome?: string, data?: object, error?: Error }>}
 */
export async function restockFromPurchase(item, food = {}) {
  if (!item || !item.food_id) {
    return { ok: false, error: new Error('That list item has nothing to stock.') };
  }

  const existing = await findByFood(item.food_id);
  if (!existing.ok) return { ok: false, error: existing.error };

  const unit = isValidUnit(item.unit) ? item.unit : null;
  const qty = item.qty_needed === null || item.qty_needed === undefined
    ? null
    : Number(item.qty_needed);
  const hasQty = qty !== null && Number.isFinite(qty) && qty > 0;

  // ---- No pantry row yet: create one ----
  if (!existing.data) {
    if (!unit) {
      return { ok: true, outcome: RESTOCK.SKIPPED };
    }
    const created = await addStock({
      food_id: item.food_id,
      // null is honest here: schema.md treats it as "amount not recorded",
      // which is a different and truer thing than zero.
      current_qty: hasQty ? qty : null,
      unit,
      last_restocked: todayIso(),
      shelf_life_days: defaultShelfLife(food.category)
    });
    if (!created.ok) return { ok: false, error: created.error };
    return { ok: true, outcome: RESTOCK.CREATED, data: created.data };
  }

  const row = existing.data;

  // ---- Units disagree: say so, change nothing ----
  if (unit && row.unit && unit !== row.unit) {
    return { ok: true, outcome: RESTOCK.UNIT_MISMATCH, data: row };
  }

  // ---- No amount to add: still record that you restocked ----
  // The date is real information even when the quantity is not. It drives
  // freshness, and freshness is most of what the pantry is for.
  if (!hasQty) {
    const touched = await updateStock(row.id, { last_restocked: todayIso() });
    if (!touched.ok) return { ok: false, error: touched.error };
    return { ok: true, outcome: RESTOCK.NO_AMOUNT, data: touched.data };
  }

  const before = row.current_qty === null || row.current_qty === undefined
    ? 0
    : Number(row.current_qty);
  const next = await updateStock(row.id, {
    current_qty: Math.round((before + qty) * 100) / 100,
    last_restocked: todayIso()
  });
  if (!next.ok) return { ok: false, error: next.error };
  return { ok: true, outcome: RESTOCK.INCREASED, data: next.data };
}

/**
 * Plain-language line for what just happened.
 *
 * The unit mismatch message names both units and says what to do. A message
 * that reports a problem without a next step just moves the confusion.
 */
export function describeRestock(outcome, { foodName = 'It', listUnit, stockUnit } = {}) {
  switch (outcome) {
    case RESTOCK.CREATED:
      return `${foodName} added to the pantry.`;
    case RESTOCK.INCREASED:
      return `${foodName} added to what you already had.`;
    case RESTOCK.NO_AMOUNT:
      return `${foodName} marked as restocked today. No amount was on the list, so the pantry count is unchanged.`;
    case RESTOCK.UNIT_MISMATCH:
      return `${foodName} is in the pantry in ${stockUnit}, but the list says ${listUnit}. `
        + 'The pantry was left alone — open it to set the amount yourself.';
    case RESTOCK.SKIPPED:
      return `${foodName} was marked bought. It is not in the pantry yet.`;
    default:
      return `${foodName} was marked bought.`;
  }
}

/**
 * Fetches the foods behind a set of list items in one read, so a caller
 * restocking several at once does not do a query per row.
 */
export async function fetchFoodsFor(items = []) {
  const ids = [...new Set(items.map((i) => i.food_id).filter(Boolean))];
  if (ids.length === 0) return { ok: true, data: new Map() };
  const { data, error } = await supabase
    .from('foods')
    .select('id, name, category')
    .in('id', ids);
  if (error) return { ok: false, error };
  return { ok: true, data: new Map((data || []).map((f) => [f.id, f])) };
}


// ---- Phase 22: depletion after cooking ---------------------------------
// The competitive review of this whole category repeats one failure mode:
// "keeping quantities accurate takes discipline". That is a death sentence
// for a user with executive-function differences, so every gram of upkeep
// we can remove is worth more than a feature.
//
// Cooking is the one moment the app knows exactly what left the cupboard.

/**
 * Works out what cooking a meal would take out of the pantry.
 *
 * Pure: no queries, no writes. Returns what WOULD change so the offer can
 * be honest about it before anything happens.
 */
export function planDepletion(ingredients = [], stock = [], scale = 1) {
  const byFood = new Map();
  for (const row of stock) if (row.food_id) byFood.set(row.food_id, row);

  const changes = [];
  for (const row of ingredients) {
    // Phase 19: an option you did not choose was never cooked.
    if (row.option_group != null && row.is_selected === false) continue;

    const entry = byFood.get(row.food_id);
    if (!entry) continue;
    if (entry.current_qty === null || entry.current_qty === undefined) continue;
    // Units must match. Converting silently here would be the same
    // corruption the bought-to-pantry path refuses to commit.
    if (entry.unit !== row.unit) continue;

    const used = Number(row.quantity_g) * (Number(scale) || 1);
    if (!Number.isFinite(used) || used <= 0) continue;

    const before = Number(entry.current_qty);
    // Floored at zero. A negative cupboard is not a thing, and it would
    // make the shortfall diff ask for more than you need.
    const after = Math.max(0, Math.round((before - used) * 100) / 100);
    if (after === before) continue;

    changes.push({
      stockId: entry.id,
      food: row.foods || row.food || {},
      before,
      after,
      unit: entry.unit
    });
  }
  return changes;
}

/** Applies what planDepletion worked out. */
export async function applyDepletion(changes = []) {
  let applied = 0;
  for (const change of changes) {
    const result = await updateStock(change.stockId, { current_qty: change.after });
    if (!result.ok) return { ok: false, error: result.error, applied };
    applied += 1;
  }
  return { ok: true, applied };
}

/** The offer, in plain words. */
export function describeDepletion(changes = []) {
  if (changes.length === 0) return '';
  const names = changes.map((c) => (c.food.name || 'something').toLowerCase());
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Take ${list} out of the pantry?`;
}
