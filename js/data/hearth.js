// js/data/hearth.js — 26 Nov 2026 v1
// Phase 36a. Free and Hearth.
//
// Graeme, 26 Nov 2026: "Free needs to be basic and premium has all features."
// Hearth is the paid tier (COMPETITIVE_POSITION.md v3). £2.99 a month or
// £24.99 a year per household. No billing yet: a household is switched to
// Hearth by hand in Supabase until the store phase.
//
// ---- Where the answer comes from ----
// household_entitlements (migration 028): one row per household, readable by
// its members, writable by nobody but the database owner. A household can
// read whether it is Hearth; it cannot make itself Hearth. (The households
// table is no place for this: its members may update it.)
//
//   row says hearth, and hearth_until is empty or in the future → Hearth
//   row says free, or no row                                    → Free
//   table not there yet (before 028)                            → Hearth,
//     so the app does not suddenly shrink before the migration is run
//   offline                                                     → the last
//     answer this phone saw; Free if it has never seen one
//
// ---- What is never limited ----
// Accessibility settings, export and backup, cook mode, and anything already
// saved. Past a limit, everything made is still there to read and cook;
// only adding more is limited.

import { supabase } from '../supabaseClient.js';
import { isMissingColumnError } from './courses.js';
import { isLocalMode } from '../lib/localClient.js';

/** The Free limits. One table, so changing a number is one line. */
export const FREE_LIMITS = {
  recipes: 10,          // your own recipes (typed or imported, not library copies)
  importsPerMonth: 3,   // web links or pasted captions
  pantryItems: 30,
  libraryPerMonth: 10,  // Community library recipes shown each month
  planWeeksAhead: 0,    // this week only
  planSlots: ['dinner'] // dinners only
};

/** What each limit unlocks, in one sentence, for the Hearth card. */
export const WHAT_HEARTH_ADDS = {
  recipes: 'Hearth keeps as many of your own recipes as you like.',
  imports: 'Hearth imports as many recipes as you like, and reads Instagram, TikTok and cookbook photos too.',
  pantry: 'Hearth keeps your whole pantry, fills it from your shopping and tells you what to use soon.',
  library: 'Hearth opens the whole Community library, every month.',
  planAhead: 'Hearth plans any week ahead, and can repeat a week you liked.',
  planSlots: 'Hearth plans breakfasts, lunches, snacks and drinks as well as dinners.'
};

const CACHE_KEY = 'home-os-hearth';
const IMPORTS_KEY = 'home-os-imports-month';

let known = null; // { hearth: boolean, until: string|null, from: 'household'|'cache'|'default' }

function readCache() {
  try { return JSON.parse(globalThis.localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function writeCache(value) {
  try { globalThis.localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch { /* fine */ }
}

/** Pure: is this entitlement row Hearth today? */
export function rowIsHearth(row, now = new Date()) {
  if (!row || row.plan !== 'hearth') return false;
  if (!row.hearth_until) return true;
  const until = Date.parse(row.hearth_until);
  return Number.isFinite(until) && until > now.getTime();
}

/** Reads the household's tier once per session. */
export async function loadHearth({ force = false } = {}) {
  if (known && !force) return known;
  // The test gates run the whole app against a stub database. They exercise
  // every feature, so under a stub the household is Hearth unless a gate
  // says otherwise (Tests/hearth.mjs sets 'data' to use the real path).
  // Nothing in the app sets either global.
  const tier = globalThis.__HOME_OS_TIER__;
  if (globalThis.__HOME_OS_SUPABASE_STUB__ && tier !== 'data') {
    known = { hearth: tier !== 'free', until: null, from: 'default' };
    return known;
  }
  // Trying it on this phone (no account) is Free.
  if (!supabase || typeof supabase.from !== 'function' || isLocalMode()) {
    known = { hearth: false, until: null, from: 'default' };
    return known;
  }
  try {
    const { data, error } = await supabase.from('household_entitlements').select('plan, hearth_until').limit(1);
    if (error) {
      // Before migration 028 there is no table: keep the app as it was.
      if (error.code === '42P01' || isMissingColumnError(error, 'plan') || /does not exist/i.test(error.message || '')) {
        known = { hearth: true, until: null, from: 'default' };
        return known;
      }
      throw error;
    }
    const row = (data && data[0]) || null;
    known = { hearth: rowIsHearth(row), until: row ? row.hearth_until : null, from: 'household' };
    writeCache(known);
    return known;
  } catch {
    const cached = readCache();
    known = cached ? { ...cached, from: 'cache' } : { hearth: false, until: null, from: 'default' };
    return known;
  }
}

/** Synchronous answer after loadHearth() has run; Free until it has. */
export function isHearth() {
  return Boolean(known && known.hearth);
}

/** For tests only. */
export function setHearthForTests(value) {
  known = value === null ? null : { hearth: Boolean(value), until: null, from: 'default' };
}

// ---- Counting what a Free household has ------------------------------------

/** Your own recipes: meals not copied from the library. */
export async function countOwnRecipes() {
  const { count, error } = await supabase.from('meals').select('id', { count: 'exact', head: true }).is('library_ref', null);
  return error ? 0 : (count || 0);
}

export async function countPantry() {
  const { count, error } = await supabase.from('pantry_stock').select('id', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
}

function monthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Imports this calendar month, counted on this phone (Free is one phone). */
export function importsThisMonth(now = new Date()) {
  try {
    const saved = JSON.parse(globalThis.localStorage.getItem(IMPORTS_KEY) || 'null');
    return saved && saved.month === monthKey(now) ? Number(saved.count) || 0 : 0;
  } catch { return 0; }
}

export function countImport(now = new Date()) {
  const count = importsThisMonth(now) + 1;
  try { globalThis.localStorage.setItem(IMPORTS_KEY, JSON.stringify({ month: monthKey(now), count })); } catch { /* fine */ }
  return count;
}

// ---- The checks the screens ask -------------------------------------------

/**
 * May this household add one more of `what`?
 * @param {'recipes'|'imports'|'pantry'} what
 * @returns {Promise<{ ok: boolean, used?: number, limit?: number }>}
 */
export async function canAdd(what) {
  await loadHearth();
  if (isHearth()) return { ok: true };
  if (what === 'recipes') {
    const used = await countOwnRecipes();
    return { ok: used < FREE_LIMITS.recipes, used, limit: FREE_LIMITS.recipes };
  }
  if (what === 'imports') {
    const used = importsThisMonth();
    return { ok: used < FREE_LIMITS.importsPerMonth, used, limit: FREE_LIMITS.importsPerMonth };
  }
  if (what === 'pantry') {
    const used = await countPantry();
    return { ok: used < FREE_LIMITS.pantryItems, used, limit: FREE_LIMITS.pantryItems };
  }
  return { ok: true };
}

// ---- This month's Community library (Free) --------------------------------

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The ten library recipes a Free household sees this month. The same ten
 * for everyone all month, different next month. Pure.
 */
export function libraryThisMonth(slugs = [], now = new Date(), size = FREE_LIMITS.libraryPerMonth) {
  const key = monthKey(now);
  return [...new Set(slugs)].sort((a, b) => hash(`${key}:${a}`) - hash(`${key}:${b}`) || a.localeCompare(b)).slice(0, size);
}

/** Can a library recipe be opened and planned this month? */
export function libraryOpen(slug, allSlugs, now = new Date()) {
  return isHearth() || libraryThisMonth(allSlugs, now).includes(slug);
}
