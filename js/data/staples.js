// js/data/staples.js — 01 Sep 2026 v1
// Phase 25. A reason for the non-food half of your shopping to appear.
//
// ---- What already worked ----
// `foods` has covered non-food since Phase 6: drink, household, personal,
// home and pet are all valid categories, the shopping list is not filtered
// to edible, and `usual` has always been a valid source. Shampoo, kitchen
// spray and guinea pig hay could always go on the list.
//
// ---- What was missing ----
// A reason for them to appear. Food reaches the list because a meal plan
// needs it. Nothing plans your shampoo, so it only ever appeared if you
// remembered — which is exactly the thing this product exists not to
// require.
//
// ---- Opt-in, always ----
// `reorder_at` is null by default and null means never remind. An app that
// decides on its own that you need shampoo is an app that adds noise, and
// noise is how a useful prompt gets ignored.

import { supabase } from '../supabaseClient.js';
import { listStock } from './pantry.js';
import { listItems, addItem } from './shopping.js';

/**
 * Stock rows that have dropped to or below their reorder point.
 *
 * Pure over already-fetched data, so it is testable against hand-worked
 * examples and the caller stays honest about fetching once.
 */
export function dueForReorder(stock = []) {
  return stock.filter((row) => {
    const at = row.reorder_at;
    // Null is the default and means "never remind". Not zero — zero is a
    // real threshold meaning "tell me when it is gone".
    if (at === null || at === undefined) return false;
    // An unrecorded amount is not evidence of running low, the same way it
    // is not evidence of an empty cupboard anywhere else in this app.
    if (row.current_qty === null || row.current_qty === undefined) return false;
    return Number(row.current_qty) <= Number(at);
  });
}

/**
 * Puts anything due back on the list, once.
 *
 * "Once" matters: something sitting at zero would otherwise be added every
 * time the list rebuilt, and a list that grows on its own is one you stop
 * trusting. Anything already on the list as `needed` is skipped.
 */
export async function addDueStaples() {
  const [stock, items] = await Promise.all([listStock(), listItems()]);
  if (!stock.ok) return { ok: false, error: stock.error };
  if (!items.ok) return { ok: false, error: items.error };

  const alreadyListed = new Set(
    (items.data || [])
      .filter((i) => i.status === 'needed')
      .map((i) => i.food_id)
  );

  const due = dueForReorder(stock.data).filter((row) => !alreadyListed.has(row.food_id));

  let added = 0;
  for (const row of due) {
    const result = await addItem({
      food_id: row.food_id,
      // The amount is not guessed. You said "tell me at 1"; how many you
      // want is your business, and an invented number on a shopping list
      // gets trusted standing in an aisle.
      qty_needed: null,
      unit: row.unit,
      source: 'usual'
    });
    if (result.ok) added += 1;
  }
  return { ok: true, added, due: due.length };
}

export function describeReorder(row, foodName = 'It') {
  if (row.reorder_at === null || row.reorder_at === undefined) {
    return `${foodName} is not on the reminder list.`;
  }
  if (Number(row.reorder_at) === 0) {
    return `${foodName} goes on the shopping list when it runs out.`;
  }
  return `${foodName} goes on the shopping list at ${row.reorder_at} ${row.unit} or fewer.`;
}

// ---- How often you actually buy it -------------------------------------
// No machine learning and no confidence score: an average interval and a
// plain sentence. Anything cleverer would be a guess dressed as a fact.

const MIN_HISTORY = 3;

/**
 * "You usually buy this about every 3 weeks. Last bought 24 days ago."
 *
 * Returns null below three restocks. Two points is a line through noise,
 * and a prediction from one data point is a fabrication.
 */
export function describeUsualInterval(restockDates = [], todayISO) {
  const dates = [...new Set(restockDates.filter(Boolean))].sort();
  if (dates.length < MIN_HISTORY) return null;

  const gaps = [];
  for (let i = 1; i < dates.length; i += 1) {
    const days = Math.round(
      (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86400000
    );
    if (Number.isFinite(days) && days > 0) gaps.push(days);
  }
  if (gaps.length === 0) return null;

  const average = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const since = Math.round((Date.parse(todayISO) - Date.parse(dates[dates.length - 1])) / 86400000);

  const every = average >= 14 && average % 7 === 0
    ? `about every ${average / 7} weeks`
    : `about every ${average} days`;

  return `You usually buy this ${every}. Last bought ${since} day${since === 1 ? '' : 's'} ago.`;
}

// ---- The starter list ---------------------------------------------------
// Offered once on an empty list, dismissible forever. Not automatic: a list
// that fills itself with things you never asked for is worse than an empty
// one.

export const STARTER_STAPLES = [
  { name: 'Toilet roll', category: 'household', item_label: 'roll' },
  { name: 'Kitchen roll', category: 'household', item_label: 'roll' },
  { name: 'Bin bags', category: 'household', item_label: 'box' },
  { name: 'Washing up liquid', category: 'household', item_label: 'bottle' },
  { name: 'Laundry detergent', category: 'household', item_label: 'bottle' },
  { name: 'Surface cleaner', category: 'household', item_label: 'bottle' },
  { name: 'Toothpaste', category: 'personal', item_label: 'tube' },
  { name: 'Shampoo', category: 'personal', item_label: 'bottle' },
  { name: 'Shower gel', category: 'personal', item_label: 'bottle' },
  { name: 'Deodorant', category: 'personal', item_label: 'can' },
  { name: 'Milk, semi-skimmed', category: 'food_fresh' },
  { name: 'Bread, white sliced loaf', category: 'food_fresh', item_label: 'loaf' },
  { name: 'Butter, block', category: 'food_fresh', item_label: 'block' },
  { name: 'Egg, medium', category: 'food_fresh', item_label: 'egg' },
  { name: 'Tea bags', category: 'drink', item_label: 'box' },
  { name: 'Coffee', category: 'drink', item_label: 'bag' }
];

/**
 * Adds the starter staples, skipping anything you already have.
 *
 * Idempotent by name: running it twice adds nothing the second time.
 */
export async function addStarterStaples() {
  const existing = await supabase.from('foods').select('id, name');
  if (existing.error) return { ok: false, error: existing.error };

  const byName = new Map(
    (existing.data || []).map((f) => [String(f.name).toLowerCase().trim(), f])
  );

  let created = 0;
  let reused = 0;
  const foodIds = [];

  for (const staple of STARTER_STAPLES) {
    const key = staple.name.toLowerCase().trim();
    const found = byName.get(key);
    if (found) { foodIds.push(found.id); reused += 1; continue; }

    const made = await supabase.from('foods').insert({
      name: staple.name,
      category: staple.category,
      item_label: staple.item_label || null,
      source: 'manual'
    }).select().single();
    if (made.error) return { ok: false, error: made.error };
    foodIds.push(made.data.id);
    byName.set(key, made.data);
    created += 1;
  }

  const items = await listItems();
  if (!items.ok) return { ok: false, error: items.error };
  const listed = new Set((items.data || []).map((i) => i.food_id));

  let added = 0;
  for (const id of foodIds) {
    if (listed.has(id)) continue;
    const result = await addItem({ food_id: id, qty_needed: null, unit: 'item', source: 'usual' });
    if (result.ok) added += 1;
  }

  return { ok: true, created, reused, added };
}
