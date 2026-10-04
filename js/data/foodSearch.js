// js/data/foodSearch.js — 04 Oct 2026 v1
// v1: one search over every food the app knows, and over shop products.
//
// Graeme, 4 Oct 2026: "Vegetarian Butcher is not in the list ... fake
// chicken, Nando's Perinaise, protein bagels, baby spinach. I need a full
// and thorough list of 10,000s+ ingredients to search by."
//
// Offline, on the phone, about 10,300 foods in one ranked list:
//   app   the app's own everyday foods (data/food_reference.json), checked
//         by hand, with item weights and portions — first
//   uk    McCance and Widdowson, CoFID 2019 (2,877, OGL v3.0)
//   us    USDA FoodData Central SR Legacy (7,283, public domain): American
//         names, so British words are translated (courgette, zucchini)
//
// Online, on request: Open Food Facts, the open product database the
// barcode scanner already uses — hundreds of thousands of products sold in
// the UK, brands included, with label nutrition per 100 g. Its search is
// limited to 10 requests a minute per phone and asks not to be used
// search-as-you-type, so it runs when a person presses Search products,
// once per wording, and its answers are kept for the session.

import { indexFoods, searchFoods } from './cofid.js';
import { energyKcalPer100g } from '../lib/openFoodFacts.js';

const SOURCE_WORDS = { app: 'Everyday foods', uk: 'UK food tables', us: 'US food tables', product: 'Shop product' };
export function sourceLabel(source) { return SOURCE_WORDS[source] || ''; }

let offline = null;
let loadingOffline = null;

function words(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean)
    .map((w) => (w.length > 4 && w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

async function json(path) {
  const res = await fetch(new URL(path, import.meta.url).href);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Every offline food, loaded once. */
export async function loadOfflineFoods() {
  if (offline) return offline;
  if (loadingOffline) return loadingOffline;
  loadingOffline = (async () => {
    const [ref, uk, us] = await Promise.allSettled([
      json('../../data/food_reference.json'), json('../../data/cofid.json'), json('../../data/usda.json')
    ]);
    const all = [];
    if (ref.status === 'fulfilled') {
      for (const f of ref.value.foods || []) {
        if (f.calories_per_100g === null || f.calories_per_100g === undefined) continue;
        if (['household', 'personal', 'pet', 'home'].includes(f.category)) continue;
        all.push({ ...f, code: f.slug, source: 'app', words: words(f.name), phrases: [f.name, ...(f.aliases || [])].map(words) });
      }
    }
    if (uk.status === 'fulfilled') all.push(...indexFoods(uk.value.foods || [], 'uk'));
    if (us.status === 'fulfilled') all.push(...indexFoods(us.value.foods || [], 'us'));
    offline = all;
    loadingOffline = null;
    return offline;
  })();
  return loadingOffline;
}

/** Ranked offline matches. */
export async function searchOffline(query, limit = 15) {
  return searchFoods(await loadOfflineFoods(), query, limit);
}

// ---- Open Food Facts --------------------------------------------------------
const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_FIELDS = 'code,product_name,product_name_en,brands,quantity,nutriments';
const cache = new Map();
let lastCall = 0;
export const PRODUCT_GAP_MS = 6500; // ten a minute, with room to spare

/** Open Food Facts product to the search's shape, or null without figures. Pure. */
export function fromProduct(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = energyKcalPer100g(n);
  if (kcal === null) return null;
  const num = (v) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.round(x * 10) / 10 : null; };
  const title = String(p.product_name_en || p.product_name || '').trim();
  if (!title) return null;
  const brand = String(p.brands || '').split(',')[0].trim();
  return {
    code: p.code || null,
    name: brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title,
    pack: p.quantity || '',
    source: 'product',
    group: '',
    calories_per_100g: kcal,
    protein_g: num(n.proteins_100g),
    fat_g: num(n.fat_100g),
    carbs_g: num(n.carbohydrates_100g),
    fibre_g: num(n.fiber_100g),
    sugars_g: num(n.sugars_100g),
    words: words(`${brand} ${title}`)
  };
}

/**
 * Shop products for a wording. Rate-limited and cached.
 * @returns {Promise<{ ok: true, data: object[] } | { ok: false, reason: 'offline'|'wait'|'failed', waitMs?: number }>}
 */
export async function searchProducts(query) {
  const q = String(query || '').trim();
  if (q.length < 3) return { ok: true, data: [] };
  const key = q.toLowerCase();
  if (cache.has(key)) return { ok: true, data: cache.get(key) };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  const wait = lastCall + PRODUCT_GAP_MS - Date.now();
  if (wait > 0) return { ok: false, reason: 'wait', waitMs: wait };
  lastCall = Date.now();
  const params = new URLSearchParams({
    search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '24', fields: OFF_FIELDS,
    tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: 'united-kingdom', sort_by: 'unique_scans_n'
  });
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 9000) : null;
    const res = await fetch(`${OFF_SEARCH}?${params}`, controller ? { signal: controller.signal } : undefined);
    if (timer) clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: 'failed' };
    const body = await res.json();
    const seen = new Set();
    const data = (body.products || []).map(fromProduct).filter(Boolean).filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 15);
    cache.set(key, data);
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
