// js/data/foods.js — 01 Sep 2026 v4
// v3: `category` is now written and read. Revision 3 added the column but
// nothing set it, so every food defaulted to food_ambient and the value was
// dead weight — grouping or filtering by it would have been meaningless.
// v2 (schema revision 4): grams_per_ml and grams_per_item are optional
// conversion factors letting an ingredient measured in ml or items reach
// the per-100 g nutrition figures. Null means "cannot convert", which
// surfaces as an incomplete total — never a guess.
// All Supabase access for `foods`. Shared data-access contract:
// { ok, data|error } returns, error always checked, nothing thrown at views,
// no user_id on inserts (the column defaults to auth.uid(); RLS scopes it).
//
// Canonical units (schema.md): macros are stored PER 100 g. Nothing derived
// is stored — see data/meals.js for why totals are computed at read time.
//
// ---- Offline ----
// Food creation IS queued. Scanning happens in a shop, which is exactly
// where signal fails, so refusing to save there would defeat the feature.
// Everything else (edit, delete) is a kitchen-table action and is not
// queued: it needs a real row id, and the view says plainly when it cannot
// reach the network.
//
// A queued food has NO real id yet, so it must not be offered as a meal
// ingredient — meal_ingredients.food_id is a foreign key and would be
// rejected. createFood() flags this with `queued: true` and the view keeps
// such foods out of ingredient pickers until they sync. This is the same
// class of gap as the Phase 4 offline linked-row debt, handled up front
// this time rather than discovered later.
//
// ---- Barcode duplicates (the Phase 6 open question) ----
// foods.barcode has no unique constraint and the schema is frozen, so
// de-duplication is an application concern. findByBarcode() is the answer:
// look up before insert and let the user choose.
//
// That read is correct under RLS. The policy is
// `using (auth.uid() = user_id)`, so the select returns only this user's
// own foods — which is exactly the scope in which a duplicate is a problem.
// It cannot see anyone else's rows, and does not need to.
//
// The select alone is NOT sufficient, though: a food created offline is
// sitting in IndexedDB, invisible to any query, and scanning the same tin
// twice in the same shop is an obvious path to two rows. findByBarcode()
// therefore checks the offline queue as well and reports which it found.

import { supabase } from '../supabaseClient.js';
import { enqueue, flush, list as listQueued } from '../lib/offlineQueue.js';
import { attemptWrite } from '../lib/net.js';
import { normaliseBarcode } from '../lib/barcode.js';

const TABLE = 'foods';

/** Tables whose rows reference foods with ON DELETE RESTRICT (schema.md §2). */
const DEPENDENT_TABLES = [
  { table: 'meal_ingredients', label: 'meal' },
  { table: 'pantry_stock', label: 'pantry entry' },
  { table: 'shopping_list_items', label: 'shopping list item' }
];

const MACRO_FIELDS = ['calories_per_100g', 'protein_g', 'fat_g', 'carbs_g'];

/**
 * The `foods.category` CHECK constraint, in full and in DISPLAY ORDER.
 * Order matters: it is aisle order for the shopping list (Phase 7) and
 * grouping order in every picker. `other` sits last so it does not become
 * the lazy default.
 *
 * `isFood` marks the categories an ingredient picker may offer. Shower gel
 * must never appear mid-recipe — that is what this column exists for.
 */
export const FOOD_CATEGORIES = [
  { value: 'food_fresh', label: 'Fresh food', hint: 'fruit, veg, meat, fish, dairy, bakery', isFood: true },
  { value: 'food_frozen', label: 'Frozen food', hint: 'anything from the freezer', isFood: true },
  { value: 'food_ambient', label: 'Cupboard food', hint: 'dried, tinned, jarred, packets, herbs, snacks', isFood: true },
  { value: 'drink', label: 'Drinks', hint: 'tea, coffee, squash, bottles, cans', isFood: true },
  { value: 'household', label: 'Household', hint: 'cleaning products, toilet roll, foil, bin bags', isFood: false },
  { value: 'personal', label: 'Personal care', hint: 'shower gel, shampoo, toothpaste, razors', isFood: false },
  { value: 'home', label: 'Home', hint: 'bulbs, batteries, equipment, cards, stationery', isFood: false },
  { value: 'pet', label: 'Pet', hint: 'pet food, bedding, hay, litter', isFood: false },
  { value: 'other', label: 'Other', hint: '', isFood: false }
];

const CATEGORY_VALUES = FOOD_CATEGORIES.map((c) => c.value);
const FOOD_CATEGORY_VALUES = FOOD_CATEGORIES.filter((c) => c.isFood).map((c) => c.value);

export function isValidCategory(value) {
  return CATEGORY_VALUES.includes(value);
}

/** True if this food may appear in a recipe ingredient picker. */
export function isEdible(food) {
  return FOOD_CATEGORY_VALUES.includes((food && food.category) || 'food_ambient');
}

export function categoryLabel(value) {
  const found = FOOD_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : 'Other';
}

/** Foods grouped by category, in display order, each group name-sorted. */
export function groupByCategory(foods) {
  const groups = [];
  for (const category of FOOD_CATEGORIES) {
    const members = (foods || []).filter(
      (f) => (f.category || 'food_ambient') === category.value
    );
    if (members.length > 0) groups.push({ ...category, foods: members });
  }
  return groups;
}

/** Optional ml/item -> grams factors. Same null-is-not-zero rule as macros. */
const FACTOR_FIELDS = ['grams_per_ml', 'grams_per_item'];

async function applyFoodOp(op) {
  // Throwing, not returning: flush() removes an op as soon as the handler
  // resolves, so a quiet "not mine" return would delete another module's
  // queued write (standing rule 7).
  if (op.table !== TABLE) {
    throw new Error(`applyFoodOp received a non-${TABLE} op: ${op.table}`);
  }
  if (op.type === 'insert') {
    const { error } = await supabase.from(TABLE).insert(op.payload);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown queued op type: ${op.type}`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush(applyFoodOp, { tables: [TABLE] })
      .then(({ failed }) => {
        for (const { op, error } of failed) {
          console.error('Failed to sync a queued food:', op, error);
        }
      })
      .catch((err) => console.error('Offline queue flush failed (foods):', err));
  });
}

/** Foods still sitting in the offline queue, shaped like rows for display. */
export async function listQueuedFoods() {
  try {
    const pending = await listQueued();
    return pending
      .filter((op) => op.table === TABLE && op.type === 'insert' && op.payload)
      .map((op) => ({ ...op.payload, id: `pending-${op.id}`, pending: true }));
  } catch (err) {
    console.error('Could not read queued foods:', err);
    return [];
  }
}

export async function listFoods() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Finds an existing food for a barcode, checking synced rows first and the
 * offline queue second.
 *
 * @returns {{ ok: true, data: object|null, pending?: boolean } | { ok: false, error: Error }}
 */
export async function findByBarcode(rawBarcode) {
  const barcode = normaliseBarcode(rawBarcode);
  if (!barcode) {
    return { ok: false, error: new Error('That is not a barcode we can use.') };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('barcode', barcode)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) return { ok: false, error };
  if (data && data.length > 0) return { ok: true, data: data[0], pending: false };

  const queued = await listQueuedFoods();
  const match = queued.find((food) => food.barcode === barcode);
  if (match) return { ok: true, data: match, pending: true };

  return { ok: true, data: null };
}

function buildFoodPayload(input = {}) {
  const { name, barcode, calories_per_100g, protein_g, fat_g, carbs_g, source } = input;
  const itemLabel = String(input.item_label || '').trim().slice(0, 30) || null;
  const payload = {
    name: String(name || '').trim(),
    // Empty string would be a distinct value from null and would break
    // barcode matching, so an absent barcode is stored as null.
    barcode: normaliseBarcode(barcode),
    item_label: itemLabel,
    // A CHECK-constrained column: an invalid value comes back as an opaque
    // database error, so it is normalised here rather than sent through.
    category: isValidCategory(input.category) ? input.category : 'food_ambient',
    source: source === 'openfoodfacts' ? 'openfoodfacts' : 'manual'
  };
  for (const field of MACRO_FIELDS) {
    const raw = { calories_per_100g, protein_g, fat_g, carbs_g }[field];
    if (raw === null || raw === undefined || raw === '') {
      payload[field] = null;
      continue;
    }
    const n = Number(raw);
    payload[field] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  for (const field of FACTOR_FIELDS) {
    const raw = input[field];
    if (raw === null || raw === undefined || raw === '') {
      payload[field] = null;
      continue;
    }
    const n = Number(raw);
    // The CHECK constraint requires > 0; zero would also make every
    // conversion collapse to nothing, so it is rejected here too.
    payload[field] = Number.isFinite(n) && n > 0 ? n : null;
  }
  return payload;
}

export async function createFood(input) {
  const payload = buildFoodPayload(input);
  if (!payload.name) {
    return { ok: false, error: new Error('A food needs a name.') };
  }
  try {
    const data = await attemptWrite(() =>
      supabase.from(TABLE).insert(payload).select().single()
    );
    return { ok: true, data };
  } catch (err) {
    try {
      const queuedId = await enqueue({ table: TABLE, type: 'insert', payload });
      return { ok: true, queued: true, data: { ...payload, id: `pending-${queuedId}`, pending: true } };
    } catch (queueErr) {
      console.error('Could not queue a food for later:', queueErr);
      return { ok: false, error: queueErr };
    }
  }
}

export async function updateFood(foodId, patch) {
  const next = {};
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (!name) return { ok: false, error: new Error('A food needs a name.') };
    next.name = name;
  }
  if (patch.barcode !== undefined) next.barcode = normaliseBarcode(patch.barcode);
  if (patch.item_label !== undefined) {
    // Trimmed to null rather than stored as '': an empty string would pass
    // the NOT NULL-less column but fail the length CHECK, and would read as
    // a label that exists and is blank.
    const label = String(patch.item_label || '').trim().slice(0, 30);
    next.item_label = label || null;
  }
  if (patch.category !== undefined) {
    if (!isValidCategory(patch.category)) {
      return { ok: false, error: new Error(`"${patch.category}" is not a category.`) };
    }
    next.category = patch.category;
  }
  for (const field of MACRO_FIELDS) {
    if (patch[field] === undefined) continue;
    if (patch[field] === null || patch[field] === '') {
      next[field] = null;
      continue;
    }
    const n = Number(patch[field]);
    next[field] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  for (const field of FACTOR_FIELDS) {
    if (patch[field] === undefined) continue;
    if (patch[field] === null || patch[field] === '') {
      next[field] = null;
      continue;
    }
    const n = Number(patch[field]);
    next[field] = Number.isFinite(n) && n > 0 ? n : null;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(next)
    .eq('id', foodId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Counts every row that would block a delete.
 *
 * All three of meal_ingredients, pantry_stock and shopping_list_items
 * reference foods with ON DELETE RESTRICT, so counting only meals would
 * produce "used in 0 meals — remove anyway?" followed by a raw foreign-key
 * error. schema.md §2 requires the count to come BEFORE the attempt, which
 * means counting all three. Phase 7 owns the pantry and shopping features;
 * this is a read for an honest confirm message, not a Phase 7 feature.
 */
export async function countFoodDependents(foodId) {
  const counts = { meal_ingredients: 0, pantry_stock: 0, shopping_list_items: 0, total: 0 };
  for (const { table } of DEPENDENT_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('food_id', foodId);
    if (error) return { ok: false, error };
    counts[table] = count ?? 0;
    counts.total += count ?? 0;
  }
  return { ok: true, data: counts };
}

/** Plain-English summary of a dependent count, for the confirm dialog. */
export function describeDependents(counts) {
  if (!counts || counts.total === 0) return '';
  const parts = [];
  for (const { table, label } of DEPENDENT_TABLES) {
    const n = counts[table] || 0;
    if (n > 0) parts.push(`${n} ${label}${n === 1 ? '' : 's'}`);
  }
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export async function deleteFood(foodId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', foodId);
  if (error) return { ok: false, error };
  return { ok: true };
}
