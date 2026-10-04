// js/data/foodShelves.js — 04 Oct 2026 v1
// Kitchen rebuild. The shelf you chose for a food, stored.
//
// foods.shelf arrives with migration 026. Until then a choice is kept on
// this phone (data/shelves.js rememberShelfChoice); after it, in the
// database for the whole household. Which world we are in is found out on
// the first read, the same way leftovers and courses are.

import { supabase } from '../supabaseClient.js';
import { shelfOf, rememberShelfChoice, isShelf } from './shelves.js';
import { isMissingColumnError } from './courses.js';

let shelfColumn = null; // null = not known yet
let chosen = new Map(); // food id -> shelf, from the database

/** Reads the household's chosen shelves. Safe before migration 026. */
export async function loadShelfChoices() {
  if (shelfColumn === false) return { ok: true, data: chosen };
  const { data, error } = await supabase.from('foods').select('id, shelf').not('shelf', 'is', null);
  if (error) {
    if (isMissingColumnError(error, 'shelf')) { shelfColumn = false; return { ok: true, data: chosen }; }
    return { ok: false, error };
  }
  shelfColumn = true;
  chosen = new Map((data || []).filter((r) => isShelf(r.shelf)).map((r) => [r.id, r.shelf]));
  return { ok: true, data: chosen };
}

/** The shelf for a food: a household choice first, then data/shelves.js. */
export function shelfFor(food) {
  if (food && chosen.has(food.id)) return chosen.get(food.id);
  return shelfOf(food);
}

/**
 * Files a food on a shelf. In the database when it can be, on this phone
 * when it cannot.
 * @returns {{ ok: boolean, where?: 'household'|'phone', error?: Error }}
 */
export async function setShelf(foodId, shelf) {
  if (!foodId || !isShelf(shelf)) return { ok: false, error: new Error('Pick a kind first.') };
  if (shelfColumn !== false) {
    const { error } = await supabase.from('foods').update({ shelf }).eq('id', foodId);
    if (!error) { shelfColumn = true; chosen.set(foodId, shelf); rememberShelfChoice(foodId, null); return { ok: true, where: 'household' }; }
    if (!isMissingColumnError(error, 'shelf')) return { ok: false, error };
    shelfColumn = false;
  }
  return rememberShelfChoice(foodId, shelf)
    ? { ok: true, where: 'phone' }
    : { ok: false, error: new Error('This phone would not store it.') };
}

/** For tests only. */
export function resetShelfDetection() { shelfColumn = null; chosen = new Map(); }
