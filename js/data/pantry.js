// js/data/pantry.js — 26 Aug 2026 v2
// v2: a blank amount is NULL ("not recorded"), never 0. See normaliseQty.
//     Adds needsAmount() and defaultUnitFor().
// All Supabase access for `pantry_stock`. Shared data-access contract:
// { ok, data|error } returns, error always checked, nothing thrown at views,
// no user_id on inserts (the column defaults to auth.uid(); RLS scopes it).
//
// ---- This holds NON-FOOD too ----
// `foods` is "things you buy" since schema revision 3, so 3 spare light
// bulbs is a legitimate pantry row. Quantities therefore carry a `unit`
// (g/ml/item) and `item` is what makes non-food work at all.
//
// ---- Near-expiry ----
// last_restocked + shelf_life_days. NEVER updated_at, which moves whenever
// a row is edited for any reason — fixing a typo in a location would have
// silently reset an item's apparent freshness. That was the workaround
// revision 3 existed to kill, and it must not creep back.
//
// Both fields are nullable and "I don't know when I bought this" is a real
// state. When either is missing, near-expiry is simply NOT CALCULATED and
// the view says "date not recorded". A guessed date is worse than none:
// it looks like knowledge.
//
// ---- Offline ----
// Pantry edits are not queued. Stocktaking is a kitchen-table activity, and
// an insert needs a real food_id to point at. The view says so plainly when
// offline rather than failing silently (conventions §9).

import { supabase } from '../supabaseClient.js';

const TABLE = 'pantry_stock';

/** Matches the unit CHECK constraint on pantry_stock. */
export const STOCK_UNITS = [
  { value: 'g', label: 'grams (g)' },
  { value: 'ml', label: 'millilitres (ml)' },
  { value: 'item', label: 'items' }
];

const UNIT_VALUES = STOCK_UNITS.map((u) => u.value);

export function isValidUnit(value) {
  return UNIT_VALUES.includes(value);
}

/**
 * A sensible starting shelf life per category, in days.
 *
 * A DEFAULT THE USER CAN OVERWRITE, never a value written silently. Offered
 * when a row is created so stocktaking a whole cupboard does not mean typing
 * a number sixty times; every one of them is visible in the form first.
 * Null means "no sensible default" — bulbs and stationery do not expire.
 */
export const DEFAULT_SHELF_LIFE_DAYS = {
  food_fresh: 5,
  food_frozen: 90,
  food_ambient: 365,
  drink: 180,
  household: 730,
  personal: 730,
  home: null,
  pet: 180,
  other: null
};

export function defaultShelfLife(category) {
  const value = DEFAULT_SHELF_LIFE_DAYS[category];
  return value === undefined ? null : value;
}

/** Everything in the pantry, each row with its food embedded. */
export async function listStock() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, food_id, default_location, shelf_life_days, current_qty, unit, last_restocked, '
      + 'foods(id, name, category, barcode, calories_per_100g, protein_g, fat_g, carbs_g, grams_per_ml, grams_per_item)')
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** The pantry row for a food, or null. Used to stop duplicate entries. */
export async function findByFood(foodId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('food_id', foodId)
    .limit(1);
  if (error) return { ok: false, error };
  return { ok: true, data: (data && data[0]) || null };
}

function normaliseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return Number.isNaN(Date.parse(`${text}T00:00:00Z`)) ? null : text;
}

// ---- "How much" has three answers, not two ----
// A blank amount used to be written as 0, and 0 means "you have none": the
// shortfall treats it exactly like no pantry row at all, so a scanned shelf
// of jars would have gone straight back onto the shopping list. Blank now
// stores NULL — "amount not recorded" — which is a third, visible state.
// Only a deliberately typed 0 means none.
function normaliseQty(value) {
  if (value === '' || value === null || value === undefined) return null;
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0) return null;
  return Math.round(qty * 100) / 100;
}

function buildPayload(input) {
  const shelf = input.shelf_life_days === '' || input.shelf_life_days == null
    ? null
    : Number(input.shelf_life_days);
  return {
    food_id: input.food_id,
    current_qty: normaliseQty(input.current_qty),
    unit: isValidUnit(input.unit) ? input.unit : 'g',
    default_location: String(input.default_location || '').trim() || null,
    shelf_life_days: Number.isInteger(shelf) && shelf > 0 ? shelf : null,
    last_restocked: normaliseDate(input.last_restocked)
  };
}

/**
 * Stock whose amount is missing or zero — nothing usable to diff against.
 *
 * Surfaced at the top of the pantry so a stocktake that skipped the amount
 * can be finished, rather than quietly producing a shopping list that
 * rebuys everything.
 */
export function needsAmount(rows) {
  return (rows || []).filter((row) => row.current_qty == null || Number(row.current_qty) === 0);
}

/**
 * The unit a new pantry row should start in, by category.
 *
 * You buy a JAR of harissa, not 180 grams of it — the pack size is already
 * in the name. `item` is right for almost everything on a shelf; loose fresh
 * food is the exception worth weighing. A starting point the user can
 * change, never a silent decision.
 */
export function defaultUnitFor(category) {
  return category === 'food_fresh' ? 'g' : 'item';
}

export async function addStock(input) {
  if (!input || !input.food_id) {
    return { ok: false, error: new Error('Pick what this is first.') };
  }
  if (!isValidUnit(input.unit)) {
    return { ok: false, error: new Error(`"${input.unit}" is not a unit this app understands.`) };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert(buildPayload(input))
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateStock(stockId, patch = {}) {
  const next = {};
  if (patch.current_qty !== undefined) {
    // '' clears the amount back to "not recorded" rather than to zero.
    if (patch.current_qty === '' || patch.current_qty === null) {
      next.current_qty = null;
    } else {
      const qty = Number(patch.current_qty);
      if (!Number.isFinite(qty) || qty < 0) {
        return { ok: false, error: new Error('Enter a quantity of zero or more.') };
      }
      next.current_qty = Math.round(qty * 100) / 100;
    }
  }
  if (patch.unit !== undefined) {
    if (!isValidUnit(patch.unit)) {
      return { ok: false, error: new Error(`"${patch.unit}" is not a unit this app understands.`) };
    }
    next.unit = patch.unit;
  }
  if (patch.default_location !== undefined) {
    next.default_location = String(patch.default_location).trim() || null;
  }
  if (patch.shelf_life_days !== undefined) {
    if (patch.shelf_life_days === '' || patch.shelf_life_days === null) {
      next.shelf_life_days = null;
    } else {
      const days = Number(patch.shelf_life_days);
      if (!Number.isInteger(days) || days <= 0) {
        return { ok: false, error: new Error('Shelf life must be a whole number of days.') };
      }
      next.shelf_life_days = days;
    }
  }
  if (patch.last_restocked !== undefined) {
    next.last_restocked = normaliseDate(patch.last_restocked);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(next)
    .eq('id', stockId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeStock(stockId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', stockId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/** Today as an ISO date, for defaulting "last restocked" to now. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * How a stock row is doing on freshness.
 *
 * PURE — no clock of its own beyond the date passed in, so it can be tested
 * against fixed dates rather than whatever today happens to be.
 *
 * @returns {{ state: 'unknown'|'fresh'|'soon'|'past', daysLeft: number|null,
 *             daysSince: number|null, reason: string }}
 *   `unknown` is a first-class answer, not a failure: without both a restock
 *   date and a shelf life there is nothing to work out, and the UI must say
 *   so rather than imply the item is fine.
 */
export function freshness(row, todayISO = todayIso()) {
  const restocked = normaliseDate(row && row.last_restocked);
  const shelf = row && Number(row.shelf_life_days);

  if (!restocked && !Number.isFinite(shelf)) {
    return { state: 'unknown', daysLeft: null, daysSince: null, reason: 'no date or shelf life recorded' };
  }
  if (!restocked) {
    return { state: 'unknown', daysLeft: null, daysSince: null, reason: 'date not recorded' };
  }
  if (!Number.isFinite(shelf) || shelf <= 0) {
    return { state: 'unknown', daysLeft: null, daysSince: null, reason: 'no shelf life recorded' };
  }

  const day = 86400000;
  const daysSince = Math.round((Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${restocked}T00:00:00Z`)) / day);
  const daysLeft = shelf - daysSince;

  // "Soon" is a fifth of the shelf life, minimum two days: two days is
  // meaningful warning for fresh food, a fifth is meaningful for a tin.
  const window = Math.max(2, Math.round(shelf / 5));
  let state = 'fresh';
  if (daysLeft < 0) state = 'past';
  else if (daysLeft <= window) state = 'soon';

  return { state, daysLeft, daysSince, reason: '' };
}

/**
 * Plain words for a freshness result. Never a colour, never an icon alone —
 * and never alarming: this is food you HAVE, not a mistake you made
 * (principle 1).
 */
export function describeFreshness(result) {
  if (!result || result.state === 'unknown') {
    return result && result.reason ? `Freshness unknown — ${result.reason}` : 'Freshness unknown';
  }
  const { state, daysSince, daysLeft } = result;
  const since = `Stocked ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`}`;
  if (state === 'past') {
    const over = Math.abs(daysLeft);
    return `${since} — past its usual ${daysSince + daysLeft} days by ${over} day${over === 1 ? '' : 's'}. Worth a look.`;
  }
  if (state === 'soon') {
    return `${since} — about ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Good one to use up.`;
  }
  return `${since} — about ${daysLeft} days left.`;
}

/** Stock worth using up soon, most urgent first. The Phase 7 "use soon" signal. */
export function useSoon(rows, todayISO = todayIso()) {
  return (rows || [])
    .map((row) => ({ row, freshness: freshness(row, todayISO) }))
    .filter((entry) => entry.freshness.state === 'soon' || entry.freshness.state === 'past')
    .sort((a, b) => (a.freshness.daysLeft ?? 0) - (b.freshness.daysLeft ?? 0));
}
