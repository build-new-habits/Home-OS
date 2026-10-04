// js/data/homeMade.js — 04 Oct 2026 v1
// Kitchen rebuild. Spare portions into the freezer, as a pantry item.
//
// Cooking double to freeze half only helps if the half shows up later:
// "Lentil ragu (home-made), 2 portions" in the freezer, on the Frozen
// shelf, where Use soon, Tonight and the defrost reminder can see it.
// A second batch of the same dish adds to the portions already there.

import { supabase } from '../supabaseClient.js';
import { createFood } from './foods.js';
import { findByFood, addStock, updateStock, todayIso } from './pantry.js';
import { setShelf } from './foodShelves.js';

/** "Lentil ragu (home-made)". Pure. */
export function homeMadeName(mealName) {
  const base = String(mealName || 'Home-made meal').trim().replace(/\s*\(home-made\)$/i, '');
  return `${base} (home-made)`;
}

/** Home-cooked food keeps about three months frozen (FSA guidance). */
export const FREEZER_DAYS = 90;

/**
 * @returns {Promise<{ ok: boolean, data?: { food: object, stock: object, portions: number }, error?: Error }>}
 */
export async function freezePortions(meal, portions) {
  const n = Math.round(Number(portions));
  if (!Number.isInteger(n) || n < 1) return { ok: false, error: new Error('How many portions?') };
  const name = homeMadeName(meal && meal.name);

  const found = await supabase.from('foods').select('id, name, category').eq('name', name).limit(1);
  if (found.error) return { ok: false, error: found.error };
  let food = found.data && found.data[0];
  if (!food) {
    const made = await createFood({ name, category: 'food_frozen', item_label: 'portion', source: 'manual' });
    if (!made.ok) return { ok: false, error: made.error };
    food = made.data;
  }
  setShelf(food.id, 'frozen').catch(() => {});

  const existing = await findByFood(food.id);
  if (!existing.ok) return { ok: false, error: existing.error };
  if (existing.data) {
    const total = Number(existing.data.current_qty || 0) + n;
    const updated = await updateStock(existing.data.id, { current_qty: total });
    if (!updated.ok) return { ok: false, error: updated.error };
    return { ok: true, data: { food, stock: { ...existing.data, current_qty: total }, portions: total } };
  }
  const added = await addStock({
    food_id: food.id,
    current_qty: n,
    unit: 'item',
    default_location: 'Freezer',
    shelf_life_days: FREEZER_DAYS,
    last_restocked: todayIso()
  });
  if (!added.ok) return { ok: false, error: added.error };
  return { ok: true, data: { food, stock: added.data, portions: n } };
}
