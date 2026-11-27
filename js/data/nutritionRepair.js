// js/data/nutritionRepair.js — 27 Nov 2026 v3
// v3: foods filled from the app's own reference are brought up to date once
// when the reference changes (v5, 27 Nov 2026: carbohydrate UK-style, the
// world pantry). Only source 'reference': a figure typed or scanned is never
// touched, and editing a food makes it 'manual'.
// v2: the food's last word is tried too ("cheese and onion crisps" are crisps).
// v1: give every food with no nutrition its figures, without being asked.
//
// Graeme, 4 Oct 2026: "lists every food without nutrition — can't you look
// at this and do it yourself?" Yes. Once a day, quietly, this goes through
// the household's foods that have no calories and fills them in:
//
//   1. The app's own reference (data/food_reference.json): hand-checked
//      everyday foods, generic, now including shop-bought and takeaway
//      food (pizza, kebab, crumpets, crisps, sandwiches…). Matched on the
//      name with brands and pack sizes taken off: "Tesco Capers (190g)" is
//      capers; "Hellmann's Light Mayonnaise" is reduced-fat mayonnaise.
//      Brings item weights with it ("a crumpet is 55 g").
//   2. The UK food tables (CoFID 2019, data/cofid.js), only where every
//      word of the name matched: "Frozen peas" is peas, frozen.
//
// Anything else is left alone and listed, rather than guessed. Every change
// is written down (on this phone) and shown on the Nutrition filled in page
// with a Change button, so nothing is filled in out of sight.

import { supabase } from '../supabaseClient.js';
import { readAll } from '../lib/readAll.js';
import { updateFood } from './foods.js';
import { lookup as lookupReference } from './foodReference.js';
import { loadCofid, bestMatch, rememberFibre } from './cofid.js';

const LOG_KEY = 'home-os-nutrition-fixes';
const RAN_KEY = 'home-os-nutrition-repair-at';
const UNSEEN_KEY = 'home-os-nutrition-fixes-unseen';
const REFRESHED_KEY = 'home-os-reference-refreshed';

/** Bump when data/food_reference.json changes figures already in use. */
export const REFERENCE_VERSION = 5;
const COMPARED = ['calories_per_100g', 'protein_g', 'fat_g', 'carbs_g'];

const BRANDS = [
  'tesco', 'sainsbury s', 'sainsburys', 'asda', 'morrisons', 'aldi', 'lidl', 'waitrose', 'm s', 'marks and spencer', 'co op', 'coop',
  'iceland', 'ocado', 'hellmann s', 'hellmanns', 'heinz', 'birds eye', 'mccain', 'young s', 'youngs', 'kellogg s', 'kelloggs',
  'warburtons', 'hovis', 'muller', 'müller', 'cathedral city', 'philadelphia', 'lurpak', 'flora', 'dolmio', 'uncle ben s', 'ben s original',
  'napolina', 'princes', 'john west', 'oxo', 'bisto', 'knorr', 'schwartz', 'old el paso', 'patak s', 'sharwood s', 'loyd grossman',
  'walkers', 'cadbury', 'nestle', 'mr kipling', 'kingsmill', 'alpro', 'oatly', 'innocent', 'tropicana', 'robinsons', 'ribena',
  'yorkshire tea', 'pg tips', 'twinings', 'nescafe', 'kenco', 'nature valley', 'hartley s', 'bonne maman', 'branston', 'colman s',
  'lea perrins', 'kikkoman', 'blue dragon', 'amoy', 'pringles', 'doritos', 'finest', 'extra special', 'taste the difference',
  'everyday essentials', 'essentials', 'basics', 'value', 'plant chef', 'stockwell', 'hearty food co', 'by sainsbury s', 'the vegetarian butcher', 'vegetarian butcher', 'nando s', 'nandos', 'quorn', 'linda mccartney s', 'linda mccartney', 'richmond', 'heck', 'gosh', 'beyond meat', 'meatless farm', 'dr oetker', 'chicago town', 'goodfella s', 'mr kipling', 'graze', 'fage', 'arla', 'warburton s', 'new york bakery co', 'deliciously ella', 'wicked kitchen', 'oggs', 'this isn t', 'naked glory', 'vivera', 'plant menu', 'garden gourmet'
];

/** "Tesco Capers (190g)" -> "capers". Pure. */
export function cleanFoodName(name) {
  let s = ` ${String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9%\s.]/g, ' ')} `;
  s = s.replace(/\b\d+(\.\d+)?\s*(x\s*\d+(\.\d+)?\s*)?(g|kg|ml|l|cl|pack|pk)\b/g, ' ');
  s = s.replace(/\bx\s*\d+\b/g, ' ').replace(/\b\d+\s*x\b/g, ' ').replace(/\b\d+\s*pack\b/g, ' ');
  s = s.replace(/\s+/g, ' ');
  for (const brand of BRANDS) s = s.replace(new RegExp(` ${brand.replace(/\s+/g, '\\s+')} `, 'g'), ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** "light mayonnaise" also tried as "mayonnaise, light" and singular. Pure. */
function variants(clean) {
  const out = new Set([clean]);
  if (clean.endsWith('s') && !clean.endsWith('ss')) out.add(clean.slice(0, -1));
  const parts = clean.split(' ');
  if (parts.length === 2) out.add(`${parts[1]} ${parts[0]}`);
  // British food names put the food last: "cheese and onion crisps" are
  // crisps, "pork sausages" are sausages. Tried after the whole name.
  if (parts.length >= 3) out.add(parts.slice(-2).join(' '));
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    out.add(last);
    if (last.endsWith('s') && !last.endsWith('ss')) out.add(last.slice(0, -1));
  }
  return [...out].filter((v) => v && v.length > 2);
}

/**
 * What a food with no figures should become, or null. Exported so the
 * gates can check the matching without a database.
 * @returns {Promise<{ via: 'reference'|'tables', name: string, figures: object, fibre: number|null } | null>}
 */
export async function matchFood(food, cofidFoods = null) {
  const clean = cleanFoodName(food && food.name);
  if (!clean) return null;
  for (const v of [String(food.name || ''), ...variants(clean)]) {
    const entry = await lookupReference(v);
    if (entry && entry.calories_per_100g !== null && entry.calories_per_100g !== undefined) {
      const figures = {
        calories_per_100g: entry.calories_per_100g, protein_g: entry.protein_g, fat_g: entry.fat_g, carbs_g: entry.carbs_g,
        source: 'reference'
      };
      if (!(Number(food.grams_per_item) > 0) && Number(entry.grams_per_item) > 0) figures.grams_per_item = entry.grams_per_item;
      if (!(Number(food.grams_per_ml) > 0) && Number(entry.grams_per_ml) > 0) figures.grams_per_ml = entry.grams_per_ml;
      if (!food.item_label && entry.item_label) figures.item_label = entry.item_label;
      return { via: 'reference', name: entry.name, figures, fibre: entry.fibre_g ?? null };
    }
  }
  const tables = cofidFoods || await loadCofid();
  const { food: hit, confident } = bestMatch(tables, clean);
  if (!hit || !confident) return null;
  return {
    via: 'tables',
    name: hit.name,
    figures: { calories_per_100g: hit.calories_per_100g, protein_g: hit.protein_g, fat_g: hit.fat_g, carbs_g: hit.carbs_g, source: 'reference' },
    fibre: hit.fibre_g
  };
}

export function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') || []; } catch { return []; }
}
function writeLog(log) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-500))); } catch { /* the log is a courtesy */ }
}
export function unseenFixes() {
  try { return Number(localStorage.getItem(UNSEEN_KEY) || 0) || 0; } catch { return 0; }
}
export function markFixesSeen() {
  try { localStorage.removeItem(UNSEEN_KEY); } catch { /* fine */ }
}

/**
 * What a food filled from the reference should now read, or null when it
 * already agrees. Pure: the gates check it without a database.
 */
export function referenceRefresh(food, figures) {
  if (!food || !figures) return null;
  const differs = COMPARED.some((k) => {
    const want = Number(figures[k]);
    const have = Number(food[k]);
    return Number.isFinite(want) && !(Number.isFinite(have) && Math.abs(have - want) < 0.05);
  });
  if (!differs) return null;
  const patch = { source: 'reference' };
  for (const k of COMPARED) if (Number.isFinite(Number(figures[k]))) patch[k] = figures[k];
  return patch;
}

/**
 * Once per reference version: every food whose figures came from the
 * reference, matched again by name, and updated where the reference now
 * says something different. Logged like any other fix, so it shows on the
 * Nutrition filled in page with a Change button.
 */
export async function refreshReferenceFoods({ force = false } = {}) {
  try { if (!force && localStorage.getItem(REFRESHED_KEY) === String(REFERENCE_VERSION)) return { ok: true, refreshed: [], skipped: true }; } catch { /* run */ }
  const read = await readAll(() => supabase.from('foods').select('*').eq('source', 'reference')
    .order('created_at', { ascending: true }).order('id', { ascending: true }));
  if (!read.ok) return { ok: false, refreshed: [] };
  const refreshed = [];
  for (const food of read.data || []) {
    // An empty table list: the reference only, never the UK tables here.
    const match = await matchFood(food, []);
    if (!match || match.via !== 'reference') continue;
    const patch = referenceRefresh(food, match.figures);
    if (!patch) continue;
    const saved = await updateFood(food.id, patch);
    if (!saved.ok) continue;
    rememberFibre(food.id, match.fibre);
    refreshed.push({ foodId: food.id, name: food.name, matched: match.name, via: 'reference', kcal: patch.calories_per_100g ?? food.calories_per_100g, at: new Date().toISOString() });
  }
  try { localStorage.setItem(REFRESHED_KEY, String(REFERENCE_VERSION)); } catch { /* fine */ }
  return { ok: true, refreshed };
}

/** Foods with no calories, read in full. */
export async function foodsWithoutNutrition() {
  const read = await readAll(() => supabase.from('foods').select('*').is('calories_per_100g', null)
    .order('created_at', { ascending: true }).order('id', { ascending: true }));
  if (!read.ok) return read;
  // Household and other non-food things are not food.
  return { ok: true, data: (read.data || []).filter((f) => !['household', 'personal', 'pet', 'home'].includes(f.category)) };
}

let running = null;

/**
 * Fill in what can be filled in. Runs at most once a day unless forced.
 * @returns {Promise<{ ok: boolean, fixed: object[], left: object[], skipped?: boolean }>}
 */
export function repairNutrition({ force = false } = {}) {
  if (running) return running;
  running = (async () => {
    const today = new Date().toISOString().slice(0, 10);
    try { if (!force && localStorage.getItem(RAN_KEY) === today) return { ok: true, fixed: [], left: [], skipped: true }; } catch { /* run */ }
    const missing = await foodsWithoutNutrition();
    if (!missing.ok) return { ok: false, fixed: [], left: [] };
    const cofid = await loadCofid();
    const log = readLog();
    const fixed = [];
    const left = [];
    for (const food of missing.data) {
      const match = await matchFood(food, cofid);
      if (!match) { left.push(food); continue; }
      const saved = await updateFood(food.id, match.figures);
      if (!saved.ok) { left.push(food); continue; }
      rememberFibre(food.id, match.fibre);
      const entry = { foodId: food.id, name: food.name, matched: match.name, via: match.via, kcal: match.figures.calories_per_100g, at: new Date().toISOString() };
      log.push(entry);
      fixed.push(entry);
    }
    const again = await refreshReferenceFoods().catch(() => ({ refreshed: [] }));
    for (const entry of again.refreshed || []) { log.push(entry); fixed.push(entry); }
    writeLog(log);
    try {
      localStorage.setItem(RAN_KEY, today);
      if (fixed.length) localStorage.setItem(UNSEEN_KEY, String(unseenFixes() + fixed.length));
    } catch { /* fine */ }
    return { ok: true, fixed, left };
  })().finally(() => { running = null; });
  return running;
}
