// js/data/pantryTaken.js — 04 Oct 2026 v1
// Kitchen rebuild. Taking a planned meal's ingredients out of the pantry,
// once, and putting them back if it did not happen.
//
// ---- Why ----
// Graeme, 4 Oct 2026: "the Eaten button means the ingredients get taken
// or reduced from the pantry, I guess Cooked it also does this, but not
// both." Ticking Eaten and tapping "We cooked it" both take a meal's
// ingredients out; whichever comes first does it, the other sees it has
// been done. Unticking Eaten puts them back.
//
// Leftovers never take anything: that food came out when it was cooked.
// The record of what was taken (so it can be put back) is kept on this
// phone, by plan entry, for three weeks.

import { listIngredients } from './meals.js';
import { listStock, updateStock } from './pantry.js';
import { planDepletion, applyDepletion } from './restock.js';
import { isLeftover } from './mealPlan.js';
import { entryPortions } from './portions.js';

const LOCAL_KEY = 'home-os-pantry-taken';
const KEEP_MS = 21 * 86400000;

function readAll() {
  try { return JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; }
}
function writeAll(all) {
  try { globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

/** Records older than three weeks are dropped. Pure. */
export function pruneTaken(all, now = Date.now()) {
  const out = {};
  for (const [id, rec] of Object.entries(all || {})) {
    const t = Date.parse(rec && rec.at);
    if (Number.isFinite(t) && now - t < KEEP_MS) out[id] = rec;
  }
  return out;
}

export function wasTaken(entryId) {
  return Boolean(entryId && readAll()[entryId]);
}

/**
 * What cooking this entry would take out, scaled to the portions it makes.
 * @returns {Promise<{ ok: boolean, data?: object[], error?: Error }>}
 */
export async function planForEntry(entry, members = []) {
  if (!entry || isLeftover(entry)) return { ok: true, data: [] };
  const meal = entry.meals || {};
  const [ings, stock] = await Promise.all([listIngredients(entry.meal_id), listStock()]);
  if (!ings.ok) return { ok: false, error: ings.error };
  if (!stock.ok) return { ok: false, error: stock.error };
  const scale = entryPortions(entry, members) / (Number(meal.default_serves) || 1);
  return { ok: true, data: planDepletion(ings.data || [], stock.data || [], scale) };
}

/** Applies the changes and remembers them against the entry. */
export async function takeForEntry(entry, changes = []) {
  if (!entry || !entry.id) return { ok: false, error: new Error('Nothing to take.') };
  const done = await applyDepletion(changes);
  // Remember even a partial apply: those rows did change.
  const applied = changes.slice(0, done.applied);
  const all = pruneTaken(readAll());
  all[entry.id] = { at: new Date().toISOString(), changes: applied.map((c) => ({
    stockId: c.stockId, before: c.before, after: c.after, fromLevel: c.fromLevel, toLevel: c.toLevel
  })) };
  writeAll(all);
  return done;
}

/** Marks an entry as done with nothing to take (so it is not asked twice). */
export function markTaken(entry) {
  if (!entry || !entry.id) return;
  const all = pruneTaken(readAll());
  all[entry.id] = { at: new Date().toISOString(), changes: [] };
  writeAll(all);
}

/**
 * Puts back what was taken for an entry. Each row goes back to what it was
 * before, plus anything that came in since (a number), or to its old level.
 */
export async function putBack(entryId) {
  const all = readAll();
  const rec = all[entryId];
  if (!rec) return { ok: true, restored: 0 };
  const stock = await listStock();
  const byId = new Map(stock.ok ? (stock.data || []).map((r) => [r.id, r]) : []);
  let restored = 0;
  for (const c of rec.changes || []) {
    const row = byId.get(c.stockId);
    if (!row) continue; // gone from the pantry since; nothing to put back into
    let patch;
    if (c.toLevel !== undefined && c.toLevel !== null) {
      if (row.level !== c.toLevel) continue; // changed by hand since; leave it
      patch = { level: c.fromLevel };
    } else {
      const used = Number(c.before) - Number(c.after);
      if (!Number.isFinite(used) || used <= 0) continue;
      patch = { current_qty: Math.round((Number(row.current_qty || 0) + used) * 100) / 100 };
    }
    const result = await updateStock(c.stockId, patch);
    if (!result.ok) return { ok: false, error: result.error, restored };
    restored += 1;
  }
  delete all[entryId];
  writeAll(all);
  return { ok: true, restored };
}
