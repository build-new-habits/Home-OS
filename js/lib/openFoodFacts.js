// js/lib/openFoodFacts.js — 21 Aug 2026 v2
// v2: also reads categories_tags and suggests a Home-OS category from them.
// A SUGGESTION ONLY, never a saved default — see suggestCategory().
// The ONLY place Home-OS talks to Open Food Facts. Free, no key, ODbL data,
// rate-limited by courtesy.
//
// This is a third-party network call and it WILL fail — the service is
// community-run, the phone is often in a shop with one bar of signal, and
// most products are missing at least one macro. Every one of those is an
// ordinary outcome here, not an error state:
//
//   found        -> a partly-filled food, ready to save
//   not-found    -> open the manual form with the barcode already in it
//   offline      -> same, said plainly
//   timeout      -> same
//
// Food creation is NEVER blocked on this call.
//
// ---- Traps this module exists to absorb ----
// 1. A 200 with status:1 can still carry an EMPTY product object. Trusting
//    the HTTP status alone yields a food with a null name.
// 2. Energy is not reliably in kcal. Products carry energy-kcal_100g,
//    energy-kj_100g, or a bare energy_100g whose unit is stated separately.
//    Reading energy_100g blind stores kilojoules in a kcal column — a
//    plausible-looking number that is wrong by 4.184x.
// 3. Values arrive as strings often enough to matter.
//
// ---- User-Agent ----
// Open Food Facts asks clients to send an identifying User-Agent. Browsers
// forbid setting that header from fetch(), so we cannot comply, and no code
// here pretends to. Recorded rather than silently ignored.

import { isOffline, withTimeout } from './net.js';
import { barcodeCandidates } from './barcode.js';

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'code,product_name,product_name_en,generic_name,brands,quantity,nutriments,categories_tags';

/** Shorter than the 6s write budget: a lookup is an accelerator, not a save. */
export const OFF_TIMEOUT_MS = 5000;

const KJ_PER_KCAL = 4.184;

/** Number, or null. Strings, blanks, NaN and negatives all become null. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Rounds to 2dp so a 6.9999999 from a unit conversion does not reach the DB. */
function round2(value) {
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

/**
 * Kilocalories per 100 g, or null. Tries the explicit kcal field first,
 * then kJ, then a bare `energy` value whose unit is stated elsewhere.
 * A bare energy value with NO stated unit is treated as kJ, because that
 * is what Open Food Facts stores by default — guessing kcal there would
 * overstate every such product by more than four times.
 */
export function energyKcalPer100g(nutriments) {
  if (!nutriments || typeof nutriments !== 'object') return null;

  const kcal = toNumber(nutriments['energy-kcal_100g']);
  if (kcal !== null) return round2(kcal);

  const kj = toNumber(nutriments['energy-kj_100g']);
  if (kj !== null) return round2(kj / KJ_PER_KCAL);

  const bare = toNumber(nutriments.energy_100g);
  if (bare === null) return null;
  const unit = String(nutriments.energy_unit || nutriments['energy_100g_unit'] || 'kJ').toLowerCase();
  if (unit === 'kcal') return round2(bare);
  return round2(bare / KJ_PER_KCAL);
}

/** First non-empty trimmed string from the arguments, or null. */
function firstText(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Maps an Open Food Facts product onto our `foods` columns.
 * Exported so it can be tested against real response shapes without a network.
 *
 * Returns null when the product carries no usable name — a nameless food is
 * worse than no food, and the caller should open the manual form instead.
 */
export function mapProductToFood(product, barcode) {
  if (!product || typeof product !== 'object') return null;

  const brand = firstText(product.brands);
  const base = firstText(product.product_name, product.product_name_en, product.generic_name);
  if (!base) return null;

  // "Heinz Baked Beans" reads better on a shopping list than "Baked Beans",
  // but only when the brand is not already in the name.
  let name = base;
  if (brand && !base.toLowerCase().includes(brand.toLowerCase().split(',')[0].trim())) {
    name = `${brand.split(',')[0].trim()} ${base}`;
  }
  const quantity = firstText(product.quantity);
  if (quantity) name = `${name} (${quantity})`;

  const n = product.nutriments || {};
  return {
    name: name.slice(0, 120),
    barcode,
    // Deliberately NOT called `category`: it must not be mistaken for a
    // value ready to save. The view pre-selects it and waits for a choice.
    suggestedCategory: suggestCategory(product),
    calories_per_100g: energyKcalPer100g(n),
    protein_g: round2(toNumber(n.proteins_100g)),
    fat_g: round2(toNumber(n.fat_100g)),
    carbs_g: round2(toNumber(n.carbohydrates_100g)),
    source: 'openfoodfacts'
  };
}

/**
 * Suggests a Home-OS category from Open Food Facts' category tags.
 *
 * A SUGGESTION, not a default. OFF's tags are community-maintained and
 * inconsistent, and it barely covers non-food at all — so this is right
 * often and quietly wrong sometimes. "Often right" is not good enough here,
 * because the failure mode is shampoo appearing in the ingredient picker
 * mid-recipe, which the user only discovers when it is confusing.
 *
 * So the caller must present this as a pre-selection the user CONFIRMS, and
 * must never save a category the user has not seen. Returns null when
 * nothing matches, which is a perfectly good answer.
 */
export function suggestCategory(product) {
  const tags = (product && product.categories_tags) || [];
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const joined = tags.join(' ').toLowerCase();

  // Order matters: the most specific storage state wins. A frozen pizza is
  // tagged both frozen and meals, and frozen is the useful answer.
  const rules = [
    ['food_frozen', /frozen|ice-cream|ices/],
    ['drink', /beverage|drink|water|juice|coffee|tea|soda|squash|wine|beer|spirit/],
    ['food_fresh', /fresh|dairy|milk|cheese|yogurt|yoghurt|meat|poultry|fish|seafood|fruit|vegetable|salad|bread|bakery|egg/],
    ['personal', /hygiene|cosmetic|shampoo|soap|toothpaste|deodorant|shaving/],
    ['household', /cleaning|detergent|laundry|household/],
    ['pet', /pet-food|cat-food|dog-food/],
    ['food_ambient', /canned|tinned|dried|pasta|rice|cereal|snack|biscuit|confectionery|sauce|spice|condiment|flour|sugar/]
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(joined)) return category;
  }
  return null;
}

/** Which of our four macro fields came back empty. Used for honest UI copy. */
export function missingMacroFields(food) {
  if (!food) return [];
  const labels = {
    calories_per_100g: 'calories',
    protein_g: 'protein',
    fat_g: 'fat',
    carbs_g: 'carbohydrate'
  };
  return Object.keys(labels).filter((key) => food[key] === null || food[key] === undefined)
    .map((key) => labels[key]);
}

async function fetchOne(barcode) {
  const url = `${API_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const response = await withTimeout(fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store'
  }), OFF_TIMEOUT_MS);

  // A 404 is Open Food Facts saying "not in the database", which is an
  // answer, not a failure. Anything else non-OK is a service problem.
  if (response.status === 404) return { found: false };
  if (!response.ok) {
    const err = new Error(`Open Food Facts returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const body = await response.json();
  // Trap 1: status can say found while product is empty. Both are checked.
  if (!body || body.status !== 1 || !body.product) return { found: false };
  const food = mapProductToFood(body.product, barcode);
  if (!food) return { found: false };
  return { found: true, food };
}

/**
 * Looks a barcode up, trying each candidate form (EAN-13 first, then the
 * raw digits — see lib/barcode.js on why the two can differ).
 *
 * @returns {Promise<{ ok: true, data: object, missing: string[] }
 *                 | { ok: false, reason: 'not-found'|'offline'|'timeout'|'error'|'invalid', error?: Error }>}
 */
export async function lookupBarcode(rawBarcode) {
  const candidates = barcodeCandidates(rawBarcode);
  if (candidates.length === 0) return { ok: false, reason: 'invalid' };
  if (isOffline()) return { ok: false, reason: 'offline' };

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const result = await fetchOne(candidate);
      if (result.found) {
        return { ok: true, data: result.food, missing: missingMacroFields(result.food) };
      }
    } catch (err) {
      lastError = err;
      if (err && err.isTimeout) return { ok: false, reason: 'timeout', error: err };
      // A transport failure on the first candidate is worth one more try
      // with the second; keep going rather than giving up early.
      console.error(`Open Food Facts lookup failed for ${candidate}:`, err);
    }
  }
  if (lastError) return { ok: false, reason: 'error', error: lastError };
  return { ok: false, reason: 'not-found' };
}
