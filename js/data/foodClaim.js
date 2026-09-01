// js/data/foodClaim.js — 01 Sep 2026 v1
// Phase 11. The missing joint in the kitchen loop.
//
// ---- The defect this closes ----
// You type "chorizo" into a meal's ingredient picker. That creates a foods
// row with a name and nothing else: no barcode, no macros. You buy the
// chorizo and scan it. findByBarcode() looks for a row carrying that
// barcode, finds none, and a SECOND row is created — this one with the
// barcode and the Open Food Facts figures.
//
// Your recipe is still pointed at the first row. It stays empty forever.
// Two rows for one sausage, and the one the meal knows about is the useless
// one. This is the single largest cause of both "the recipe card never
// fills in" and "the macros are unreliable".
//
// ---- The fix ----
// Before offering to create anything, ask whether this barcode belongs to
// something you were already expecting. Claiming MERGES into the existing
// row, so its id never changes, so every meal_ingredients row already
// pointing at it gains macros the instant you walk out of the shop.
//
// ---- Why "expecting" and not "every unbarcoded food" ----
// A cupboard accumulates hundreds of foods. Offering all of them turns a
// one-tap confirmation into a search problem, and a list nobody reads is a
// list everybody mis-taps. Candidates are restricted to things you are
// plausibly holding: on the shopping list now, or needed by this week's
// meals. That is a short, relevant list.

import { supabase } from '../supabaseClient.js';
import { normaliseBarcode } from '../lib/barcode.js';

const MACRO_FIELDS = ['calories_per_100g', 'protein_g', 'fat_g', 'carbs_g'];
const FACTOR_FIELDS = ['grams_per_ml', 'grams_per_item'];

/** Shopping statuses that mean "you may be holding this right now". */
const HOLDING_STATUSES = ['needed', 'bought'];

/** Most candidates we will ever show. Beyond this it stops being a glance. */
export const MAX_CANDIDATES = 5;

/**
 * Words too short or too common to say anything about which food this is.
 * "of", "and" match everything; brand-agnostic filler matches nearly as
 * much. Dropping them stops "Tesco Chopped Tomatoes" scoring against
 * "Tesco Semi Skimmed Milk" on the strength of the shop's name.
 */
const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'own', 'brand', 'value',
  'tesco', 'asda', 'sainsburys', 'morrisons', 'aldi', 'lidl', 'waitrose',
  'coop', 'co', 'op', 'organic', 'finest', 'essential', 'everyday',
  'pack', 'packet', 'tin', 'can', 'jar', 'bottle', 'box'
]);

/**
 * Splits a product name into comparable tokens.
 *
 * Exported for the behaviour gate: the ranking is the part most likely to
 * be quietly wrong, and it is worth being able to test directly.
 */
export function tokenise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * How much two names look like the same thing, 0 to 1.
 *
 * Overlap divided by the SMALLER token set, not the union. "Chorizo" should
 * score highly against "Unearthed Spanish Cooking Chorizo Ring" — the food
 * you typed is nearly always shorter than the name on the packet, and
 * Jaccard would punish it for that.
 */
export function similarity(nameA, nameB) {
  const a = new Set(tokenise(nameA));
  const b = new Set(tokenise(nameB));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Finds unbarcoded foods this scan might belong to.
 *
 * Four reads rather than one join, because Supabase's PostgREST cannot
 * express the union cleanly and this runs once per unmatched scan, never in
 * a loop. RLS scopes every one of them.
 *
 * @param {{ productName?: string }} [options] Name from Open Food Facts.
 *   Absent (offline, or not found) is fine — you still get the list,
 *   just unranked, which is still far better than a duplicate row.
 * @returns {Promise<{ ok: true, data: object[] } | { ok: false, error: Error }>}
 */
export async function findClaimCandidates({ productName = '' } = {}) {
  // food_id -> the reason it is expected, so the dialog can account for
  // itself. A suggestion you cannot explain is one people stop trusting.
  const expected = new Map();

  const shopping = await supabase
    .from('shopping_list_items')
    .select('food_id, status')
    .in('status', HOLDING_STATUSES);
  if (shopping.error) return { ok: false, error: shopping.error };
  for (const row of shopping.data || []) {
    if (row.food_id) expected.set(row.food_id, 'On your shopping list');
  }

  const plan = await supabase.from('weekly_meal_plan').select('meal_id');
  if (plan.error) return { ok: false, error: plan.error };
  const mealIds = [...new Set((plan.data || []).map((r) => r.meal_id).filter(Boolean))];

  if (mealIds.length > 0) {
    const ingredients = await supabase
      .from('meal_ingredients')
      .select('food_id')
      .in('meal_id', mealIds);
    if (ingredients.error) return { ok: false, error: ingredients.error };
    for (const row of ingredients.data || []) {
      if (!row.food_id) continue;
      // Shopping list wins the label: it is the more immediate reason to be
      // holding the thing, and it is what you were doing five minutes ago.
      if (!expected.has(row.food_id)) {
        expected.set(row.food_id, 'Needed for a meal this week');
      }
    }
  }

  if (expected.size === 0) return { ok: true, data: [] };

  // barcode IS NULL is the whole point: a food that already carries a
  // barcode is not the row this scan was meant to land on.
  const foods = await supabase
    .from('foods')
    .select('*')
    .is('barcode', null)
    .in('id', [...expected.keys()]);
  if (foods.error) return { ok: false, error: foods.error };

  const scored = (foods.data || []).map((food) => ({
    food: { ...food, reason: expected.get(food.id) },
    score: similarity(productName, food.name)
  }));

  // Name order as the tiebreak, so an unranked list (no product name) is at
  // least stable and predictable rather than however the database felt.
  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));

  return { ok: true, data: scored.slice(0, MAX_CANDIDATES) };
}

/**
 * Builds the patch that merges scanned data into an existing food.
 *
 * ---- Merge is additive, always ----
 * Open Food Facts is frequently missing a protein figure, or a fat figure,
 * or all of them. If the row already has a number and the scan does not,
 * the row keeps its number. Overwriting real data with null because a
 * crowd-sourced database had a gap would make scanning a thing you learn to
 * fear, and the whole point of this phase is that scanning is safe.
 *
 * The barcode is the exception: it is what we came for, and the candidate
 * had none by definition.
 *
 * Exported separately from claimFood so the behaviour gate can assert the
 * merge rules without a database.
 */
export function buildClaimPatch(existingFood, scanned = {}) {
  const patch = {};

  const barcode = normaliseBarcode(scanned.barcode);
  if (barcode) patch.barcode = barcode;

  let gained = false;
  for (const field of [...MACRO_FIELDS, ...FACTOR_FIELDS]) {
    const incoming = scanned[field];
    if (incoming === null || incoming === undefined || incoming === '') continue;
    const n = Number(incoming);
    if (!Number.isFinite(n) || n < 0) continue;
    const current = existingFood ? existingFood[field] : null;
    if (current !== null && current !== undefined) continue; // never overwrite
    patch[field] = n;
    gained = true;
  }

  // Only claim Open Food Facts as the source when it actually contributed
  // something. A row that stays manual, plus a barcode, is still manual —
  // and Phase 13 will lean on source being honest.
  if (gained && scanned.source) patch.source = scanned.source;

  return patch;
}

/**
 * Merges a scan into an existing food row.
 *
 * Returns the updated food plus which fields were filled, so the caller can
 * say what actually happened rather than a bare "saved".
 */
export async function claimFood(foodId, scanned = {}) {
  if (!foodId) return { ok: false, error: new Error('No food to claim.') };

  const current = await supabase.from('foods').select('*').eq('id', foodId).single();
  if (current.error) return { ok: false, error: current.error };

  const patch = buildClaimPatch(current.data, scanned);
  if (Object.keys(patch).length === 0) {
    return { ok: true, data: current.data, filled: [] };
  }

  const { data, error } = await supabase
    .from('foods')
    .update(patch)
    .eq('id', foodId)
    .select()
    .single();
  if (error) return { ok: false, error };

  const filled = Object.keys(patch).filter((k) => k !== 'barcode' && k !== 'source');
  return { ok: true, data, filled };
}

/** Plain-language summary of a claim, for the status line. */
export function describeClaim(food, filled = []) {
  const name = food && food.name ? food.name : 'That food';
  if (filled.length === 0) {
    return `${name} now has its barcode. Nutrition data was not available, so it is unchanged.`;
  }
  const macros = filled.filter((f) => MACRO_FIELDS.includes(f)).length;
  const part = macros > 0
    ? `nutrition for ${macros} value${macros === 1 ? '' : 's'}`
    : 'its pack size';
  return `${name} updated with its barcode and ${part}. Any recipe using it is up to date.`;
}
