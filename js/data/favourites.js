// js/data/favourites.js — 27 Nov 2026 v1
// Phase 36b (Hearth). Favourites, regulars, the three lists, and the list
// built for you each week.
//
// Graeme, 25–26 Nov 2026: favourites in the pantry and the shopping list;
// groceries, household cleaning and toiletries; the list ready for the
// Thursday-night click and collect.
//
// ---- Favourites and regulars ----
// shop_favourites (migration 029), one row per food per household.
//   every empty  → a favourite: one tap puts it on the list
//   every set    → a regular too: added by itself when the week's list is
//                  built, once a week, fortnight or month, unless the
//                  pantry already has enough or it is already on the list
//
// ---- The list built for you ----
// A web app has no alarm on a server, so the list is built the first time
// the Shop screen opens after the chosen day and time: the plan (the same
// "Add everything from the plan" the button does) plus the regulars that
// are due. Building twice adds nothing twice. The day and time are kept on
// this phone.

import { supabase } from '../supabaseClient.js';
import { addItem, listItems } from './shopping.js';
import { findByFood } from './pantry.js';
import { buildWeekIntoList } from './planShopping.js';

const TABLE = 'shop_favourites';
export const EVERY = [
  { value: '', label: 'Only when I tap it' },
  { value: 'week', label: 'Every week' },
  { value: 'fortnight', label: 'Every fortnight' },
  { value: 'month', label: 'Every month' }
];

function missingTable(error) {
  return Boolean(error) && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));
}

export async function listFavourites() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, food_id, every, qty, unit, last_added_on, foods(id, name, category)')
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error, missing: missingTable(error) };
  return { ok: true, data: data || [] };
}

export async function addFavourite(foodId) {
  const { data, error } = await supabase.from(TABLE).insert({ food_id: foodId }).select('id').single();
  if (error) {
    if (error.code === '23505') return { ok: true, data: null, already: true };
    return { ok: false, error, missing: missingTable(error) };
  }
  return { ok: true, data };
}

export async function removeFavourite(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return error ? { ok: false, error } : { ok: true };
}

/** every: '' | 'week' | 'fortnight' | 'month'; qty and unit for a regular. */
export async function setRegular(id, { every = '', qty = null, unit = 'item' } = {}) {
  const patch = {
    every: every || null,
    qty: every ? (Number(qty) > 0 ? Number(qty) : 1) : null,
    unit: unit || 'item'
  };
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
  return error ? { ok: false, error } : { ok: true };
}

// ---- Pure rules ---------------------------------------------------------------

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(fromIso, to) {
  const from = new Date(`${fromIso}T00:00:00`);
  const end = new Date(`${isoDate(to)}T00:00:00`);
  return Math.round((end - from) / 86400000);
}

/** Is this regular due on `today`? A few days early counts, so a Thursday shop catches a Friday-due regular. */
export function isDue(fav, today = new Date()) {
  if (!fav || !fav.every) return false;
  if (!fav.last_added_on) return true;
  const gap = daysBetween(fav.last_added_on, today);
  if (fav.every === 'week') return gap >= 5;
  if (fav.every === 'fortnight') return gap >= 12;
  if (fav.every === 'month') return gap >= 26;
  return false;
}

/** Which of the three lists a kind belongs to (data/shelves.js kinds). */
export function listOf(kind) {
  if (kind === 'personal') return 'toiletries';
  if (kind === 'household' || kind === 'pet') return 'household';
  return 'groceries';
}

export const LISTS = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'household', label: 'Household' },
  { value: 'toiletries', label: 'Toiletries' }
];

// ---- Putting things on the list ---------------------------------------------

/** One favourite onto the list now. Nothing twice: already needed → left alone. */
export async function addFavouriteToList(fav, existing = null) {
  const current = existing || (await listItems());
  const items = current && current.ok !== undefined ? (current.ok ? current.data : []) : current;
  if ((items || []).some((i) => i.food_id === fav.food_id && i.status === 'needed')) return { ok: true, already: true };
  return addItem({ food_id: fav.food_id, qty_needed: Number(fav.qty) > 0 ? Number(fav.qty) : 1, unit: fav.unit || 'item', source: 'usual' });
}

/**
 * Due regulars onto the list. Skips anything already on it, and anything the
 * pantry says it has plenty of or enough of (current_qty ≥ the regular's qty).
 * @returns {Promise<{ ok: boolean, added: string[], skipped: string[] }>}
 */
export async function addDueRegulars(today = new Date()) {
  const favs = await listFavourites();
  if (!favs.ok) return { ok: false, added: [], skipped: [], missing: favs.missing };
  const listed = await listItems();
  const items = listed.ok ? listed.data : [];
  const added = [];
  const skipped = [];
  for (const fav of favs.data.filter((f) => isDue(f, today))) {
    const name = (fav.foods && fav.foods.name) || 'something';
    if (items.some((i) => i.food_id === fav.food_id && i.status === 'needed')) { skipped.push(name); continue; }
    const stock = await findByFood(fav.food_id);
    const row = stock.ok ? stock.data : null;
    const enough = row && (row.level === 'plenty'
      || (row.current_qty != null && Number(row.current_qty) >= (Number(fav.qty) || 1)));
    if (enough) { skipped.push(name); continue; }
    const result = await addItem({ food_id: fav.food_id, qty_needed: Number(fav.qty) || 1, unit: fav.unit || 'item', source: 'usual' });
    if (!result.ok) { skipped.push(name); continue; }
    await supabase.from(TABLE).update({ last_added_on: isoDate(today) }).eq('id', fav.id);
    added.push(name);
  }
  return { ok: true, added, skipped };
}

// ---- The list built for you each week -----------------------------------------

export const BUILD_KEY = 'home-os-list-build';
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function readBuild(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(BUILD_KEY) || 'null');
    if (saved && Number.isInteger(saved.day)) return { on: saved.on !== false, day: saved.day, time: saved.time || '19:00', lastBuilt: saved.lastBuilt || '' };
  } catch { /* fall through */ }
  return { on: false, day: 4, time: '19:00', lastBuilt: '' };
}

export function saveBuild(value, storage = globalThis.localStorage) {
  try { storage.setItem(BUILD_KEY, JSON.stringify(value)); } catch { /* the setting lasts this visit */ }
}

/** The most recent scheduled moment at or before `now`. Pure. */
export function lastSlot(setting, now = new Date()) {
  const [h, m] = String(setting.time || '19:00').split(':').map(Number);
  const slot = new Date(now);
  slot.setHours(h || 0, m || 0, 0, 0);
  const back = (now.getDay() - setting.day + 7) % 7;
  slot.setDate(slot.getDate() - back);
  if (slot > now) slot.setDate(slot.getDate() - 7);
  return slot;
}

/** Should the list be built now? On, and not yet built since the last slot. Pure. */
export function buildDue(setting, now = new Date()) {
  if (!setting || !setting.on) return false;
  const slot = lastSlot(setting, now);
  return !setting.lastBuilt || setting.lastBuilt < isoDate(slot);
}

/** Builds the week's list: the plan, then due regulars. Marks it built. */
export async function runWeeklyBuild(now = new Date(), storage = globalThis.localStorage) {
  const setting = readBuild(storage);
  const plan = await buildWeekIntoList('this');
  const regulars = await addDueRegulars(now);
  if (plan.ok) saveBuild({ ...setting, lastBuilt: isoDate(now) }, storage);
  const fromPlan = plan.ok ? (plan.data.items || []).filter((i) => i.shortfall > 0).length : 0;
  return { ok: plan.ok, fromPlan, regulars: regulars.added || [] };
}
