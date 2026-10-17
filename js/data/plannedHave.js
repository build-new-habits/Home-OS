// js/data/plannedHave.js — 17 Oct 2026 v1
// v1: what you said you have, or want bought anyway, for one planned meal.
//
// ---- Why ----
// Graeme, 15 Oct 2026: "I've planned next week's meals and I've opened the
// recipe for teriyaki salmon. I know we have some ingredients but I don't
// want to have to remember one or two of them, go to the shopping list,
// add or remove them, then come back."
//
// The list is rebuilt from plan minus pantry (lib/shortfall.js) every time
// the plan changes, so editing a generated line on the list would be undone
// by the next rebuild. The decision has to live UNDER the list, as an input
// to the arithmetic. And it belongs to the PLANNED MEAL, not the recipe:
// salmon on Tuesday and salmon on Friday are two separate shops, and taking
// the meal off the plan should take what you said about it with it.
//
// ---- What is stored ----
// Per plan entry, per food:
//   { mode: 'have', amount: null }   you have all of it — leave it off
//   { mode: 'have', amount: 30, unit: 'ml' }   you have 30 ml — buy the rest
//   { mode: 'buy' }   on the list whatever the pantry says
// Amounts are absolute, in the ingredient's own unit, so changing the
// servings later still gives the right answer: what you HAVE does not
// scale, what you NEED does.
//
// ---- Where ----
// On this phone, like data/pantryTaken.js: no migration, instant offline,
// and the phone is what rebuilds the list (data/listSync.js). Kept six
// weeks, then dropped. Lost storage fails in the safe direction: the item
// goes back on the list.

const LOCAL_KEY = 'home-os-planned-have';
const KEEP_MS = 42 * 86400000;
export const MODES = ['have', 'buy'];

function readStore() {
  try { return JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; }
}
function writeStore(all) {
  try { globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

/** Entries untouched for six weeks are dropped. Pure. */
export function pruneHave(all, now = Date.now()) {
  const out = {};
  for (const [id, rec] of Object.entries(all || {})) {
    const t = Date.parse(rec && rec.at);
    if (Number.isFinite(t) && now - t < KEEP_MS && rec.foods && Object.keys(rec.foods).length) out[id] = rec;
  }
  return out;
}

/**
 * Everything, as { [entryId]: { [foodId]: override } } — the shape
 * computeShortfall takes. Empty (never throws) where there is no storage.
 */
export function readOverrides() {
  const all = pruneHave(readStore());
  const out = {};
  for (const [id, rec] of Object.entries(all)) out[id] = { ...rec.foods };
  return out;
}

/** One planned meal's overrides, { [foodId]: override }. */
export function overridesFor(entryId) {
  if (!entryId) return {};
  const rec = readStore()[entryId];
  return rec && rec.foods ? { ...rec.foods } : {};
}

/** A valid override, or null for "back to the pantry as usual". Pure. */
export function cleanOverride(override) {
  if (!override || !MODES.includes(override.mode)) return null;
  if (override.mode === 'buy') return { mode: 'buy' };
  const amount = override.amount === null || override.amount === undefined || override.amount === ''
    ? null : Number(override.amount);
  if (amount === null) return { mode: 'have', amount: null };
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (amount === 0) return null; // "I have none" is the pantry's default answer
  return { mode: 'have', amount: Math.round(amount * 100) / 100, unit: ['g', 'ml', 'item'].includes(override.unit) ? override.unit : 'g' };
}

/**
 * Sets (or with null, clears) what you said about one food for one
 * planned meal. Returns the stored override, or null when cleared.
 */
export function setOverride(entryId, foodId, override) {
  if (!entryId || !foodId) return { ok: false, error: new Error('Nothing to change.') };
  const all = pruneHave(readStore());
  const rec = all[entryId] || { foods: {} };
  const clean = cleanOverride(override);
  if (clean) rec.foods[foodId] = clean;
  else delete rec.foods[foodId];
  rec.at = new Date().toISOString();
  if (Object.keys(rec.foods).length) all[entryId] = rec;
  else delete all[entryId];
  if (!writeStore(all)) return { ok: false, error: new Error('This phone would not save that.') };
  return { ok: true, data: clean };
}

/** Forgets one planned meal entirely (it left the plan). */
export function forgetEntry(entryId) {
  const all = readStore();
  if (!all[entryId]) return;
  delete all[entryId];
  writeStore(all);
}
