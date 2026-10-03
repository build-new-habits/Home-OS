// js/data/localRecipes.js — 03 Oct 2026 v1
// Kitchen rebuild. Recipes kept on this phone.
//
// ---- Why ----
// Graeme, 3 Oct 2026: "I need to be able to edit the recipes and save
// locally." The database was out of reach that day, and the paid/free
// plan has free users keeping recipes on the phone only. So any recipe —
// one you write, or your own version of a library recipe — can be saved
// here with no account and no connection, cooked from, and later added
// to your meals (which is what lets it go on the plan).
//
// ---- Where ----
// localStorage, one key, a list of drafts in the shape data/ownRecipe.js
// already uses. A recipe is a few kilobytes; hundreds fit comfortably.
// Browsers can clear site data, so the Recipes page offers a backup file
// and a way to restore it. Every read and write is wrapped: private mode
// or a full store means "could not save", never a crash.
//
// ---- A library recipe, copied ----
// draftFromLibrary() turns a library recipe into a draft: reference names
// for ingredients, spoons back where they were spoons, step tokens
// ({{ing:olive-oil}}) written out as plain words, the method note as the
// tip, and the library's swaps carried as text (librarySwaps). The copy
// remembers where it came from (fromSlug); the library itself is never
// changed.

import { forEditing, newIngredient, newStep, KINDS } from './ownRecipe.js';
import { kitchenName } from './mealSteps.js';

const KEY = 'home-os-local-recipes';
const FILE_KIND = 'home-os-recipes';

function store() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function readAll() {
  const ls = store();
  if (!ls) return [];
  try {
    const list = JSON.parse(ls.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((r) => r && r.id && r.draft) : [];
  } catch { return []; }
}

function writeAll(list) {
  const ls = store();
  if (!ls) return false;
  try { ls.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

export function localIdFromHash(hash) {
  const match = String(hash || '').match(/[?&]l=([0-9a-z-]+)/i);
  return match ? match[1] : '';
}

export function fromSlugFromHash(hash) {
  const match = String(hash || '').match(/[?&]from=([0-9a-z-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

/** Newest first. Each: { id, savedAt, name, draft }. */
export function listLocal() {
  return readAll()
    .map((r) => ({ ...r, name: (r.draft && r.draft.name) || 'Untitled recipe' }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export function getLocal(id) {
  return readAll().find((r) => r.id === id) || null;
}

function newId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Saves a draft on this phone. A draft that already has a localId replaces
 * that recipe; otherwise it becomes a new one.
 * @returns {{ ok: true, id: string } | { ok: false, error: Error }}
 */
export function saveLocal(draft, now = new Date()) {
  const list = readAll();
  const id = draft.localId || newId();
  const copy = JSON.parse(JSON.stringify({ ...draft, localId: id }));
  const entry = { id, savedAt: now.toISOString(), draft: copy };
  const at = list.findIndex((r) => r.id === id);
  if (at === -1) list.push(entry); else list[at] = entry;
  return writeAll(list)
    ? { ok: true, id }
    : { ok: false, error: new Error('This phone would not store it. Private browsing, or storage is full.') };
}

/** Remembers which of your meals a phone recipe was added to. */
export function linkLocal(id, mealId) {
  const list = readAll();
  const hit = list.find((r) => r.id === id);
  if (!hit) return false;
  hit.draft.syncedMealId = mealId;
  return writeAll(list);
}

export function deleteLocal(id) {
  const list = readAll();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  return writeAll(next);
}

// ---- Backup -----------------------------------------------------------------

export function exportLocal(now = new Date()) {
  return JSON.stringify({ kind: FILE_KIND, version: 1, exportedAt: now.toISOString(), recipes: readAll() }, null, 1);
}

/**
 * Restores from a backup file's text. Recipes already here with the same
 * id are replaced only if the file's copy is newer.
 * @returns {{ ok: true, added: number, updated: number } | { ok: false, error: Error }}
 */
export function importLocal(text) {
  let doc;
  try { doc = JSON.parse(String(text || '')); } catch { return { ok: false, error: new Error('That file is not a recipe backup.') }; }
  if (!doc || doc.kind !== FILE_KIND || !Array.isArray(doc.recipes)) {
    return { ok: false, error: new Error('That file is not a Home-OS recipe backup.') };
  }
  const list = readAll();
  let added = 0;
  let updated = 0;
  for (const r of doc.recipes) {
    if (!r || !r.id || !r.draft || !Array.isArray(r.draft.ingredients)) continue;
    const at = list.findIndex((x) => x.id === r.id);
    if (at === -1) { list.push(r); added += 1; }
    else if (String(r.savedAt) > String(list[at].savedAt)) { list[at] = r; updated += 1; }
  }
  if (!writeAll(list)) return { ok: false, error: new Error('This phone would not store them.') };
  return { ok: true, added, updated };
}

// ---- A library recipe as a draft ---------------------------------------------

/**
 * @param {object} recipe  a library recipe
 * @param {Map} refMap     reference foods by slug (foodReference.referenceBySlug)
 */
export function draftFromLibrary(recipe, refMap = new Map()) {
  const nameOf = (slug) => {
    const entry = refMap.get(slug);
    return entry ? entry.name : String(slug || '').replace(/-/g, ' ');
  };
  const ingredients = (recipe.ingredients || []).map((ing) => {
    const amount = forEditing(ing.quantity, ing.unit);
    return newIngredient({ name: ing.name || nameOf(ing.ref), quantity: amount.quantity, unit: amount.unit });
  });
  const steps = (recipe.steps || []).map((step) => newStep({
    instruction: String(step.instruction || '').replace(/\{\{ing:([a-z0-9-]+)\}\}/gi, (_, slug) => kitchenName(nameOf(slug)).toLowerCase()),
    minutes: step.duration_min || '',
    note: step.note || null
  }));
  const kind = KINDS.some((k) => k.value === recipe.default_slot) ? recipe.default_slot : 'dinner';
  return {
    mealId: null,
    localId: null,
    fromSlug: recipe.slug || null,
    name: recipe.name || '',
    kind,
    course: recipe.course || 'main',
    serves: recipe.default_serves || 4,
    tags: [...(recipe.dietary_tags || [])].filter((t) => ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'].includes(t)),
    note: String(recipe.method_note || '').slice(0, 200),
    ingredients: ingredients.length ? ingredients : [newIngredient()],
    steps: steps.length ? steps : [newStep()],
    librarySwaps: Array.isArray(recipe.swaps) ? recipe.swaps.map((s) => ({ instead: s.instead, text: s.text })) : []
  };
}
