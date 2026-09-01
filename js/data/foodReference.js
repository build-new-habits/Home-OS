// js/data/foodReference.js — 01 Sep 2026 v1
// Phase 13. Published averages for the foods you never scan.
//
// ---- Why a data file and not a document ----
// A markdown table of average weights is something a human reads. This is
// something the APP reads, so it can fill a form the moment you type a name
// it recognises. Ships in the repo, precached, works offline, costs nothing
// to serve at any number of users.
//
// ---- The honesty problem, and its answer ----
// data/meals.js refuses to guess, on purpose, and that refusal is the only
// reason the macro figures can be trusted at all. A reference average IS a
// guess. A good one, from a published composition table, but a guess.
//
// So it is labelled rather than hidden: a food filled from here gets
// source = 'reference', computeMacros() counts those separately, and the
// meal card says plainly that some figures are averages. Scanning the real
// packet later rewrites source to 'openfoodfacts' and the caption
// disappears on its own.
//
// ---- Degrading ----
// A missing or malformed file must mean "no suggestions", never a broken
// food form. Every failure path here returns an empty result, not an error
// the caller has to handle.

// NOT named URL. `const URL = new URL(...)` shadows the global inside its
// own initialiser and dies in the temporal dead zone — caught by the render
// gate on the first run, which is what that gate is for.
const REFERENCE_URL = new URL('../../data/food_reference.json', import.meta.url).href;

let loaded = null;   // the parsed document, once
let loading = null;  // the in-flight promise, so ten keystrokes cause one fetch

/** Normalises a name for matching: lowercase, no punctuation, single spaces. */
function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function load() {
  if (loaded) return loaded;
  if (loading) return loading;

  loading = (async () => {
    try {
      const response = await fetch(REFERENCE_URL);
      if (!response.ok) throw new Error(`reference file returned ${response.status}`);
      const doc = await response.json();
      const foods = Array.isArray(doc && doc.foods) ? doc.foods : [];

      // Build the lookup once. Names and aliases share one index, so
      // "medium egg" and "eggs" land on the same row.
      const index = new Map();
      for (const food of foods) {
        if (!food || !food.slug || !food.name) continue;
        index.set(normalise(food.name), food);
        for (const alias of food.aliases || []) {
          const key = normalise(alias);
          // First writer wins. The generator asserts there are no alias
          // collisions, so this only ever guards against a hand edit.
          if (!index.has(key)) index.set(key, food);
        }
      }
      loaded = { version: doc.version, foods, index };
      return loaded;
    } catch (err) {
      console.error('Food reference unavailable:', err);
      loaded = { version: 0, foods: [], index: new Map() };
      return loaded;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/** Preloads in the background. Callers never have to await this. */
export function warmFoodReference() {
  load();
}

/**
 * Exact match on a name or alias, or null.
 *
 * Deliberately exact rather than fuzzy. A near-match that silently fills in
 * somebody else's calorie figures is worse than no match at all, and the
 * user is typing a name they already know.
 */
export async function lookup(name) {
  const { index } = await load();
  return index.get(normalise(name)) || null;
}

/** Prefix and substring search, for a picker. Capped — this is a hint list. */
export async function search(term, limit = 8) {
  const { foods } = await load();
  const q = normalise(term);
  if (q.length < 2) return [];

  const starts = [];
  const contains = [];
  for (const food of foods) {
    const name = normalise(food.name);
    if (name.startsWith(q)) { starts.push(food); continue; }
    if (name.includes(q) || (food.aliases || []).some((a) => normalise(a).includes(q))) {
      contains.push(food);
    }
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * The patch that turns a reference entry into food columns.
 *
 * ---- Fills blanks only ----
 * Anything already filled in is left exactly alone. A published average
 * must never overwrite a figure read off a real packet, and it must never
 * overwrite something the user typed themselves.
 */
export function referencePatch(entry, existing = {}) {
  if (!entry) return {};
  const patch = {};
  const FIELDS = [
    'calories_per_100g', 'protein_g', 'fat_g', 'carbs_g',
    'grams_per_ml', 'grams_per_item'
  ];

  let filled = false;
  for (const field of FIELDS) {
    const incoming = entry[field];
    if (incoming === null || incoming === undefined) continue;
    const current = existing[field];
    if (current !== null && current !== undefined && current !== '') continue;
    patch[field] = incoming;
    filled = true;
  }

  if (entry.item_label && !existing.item_label) {
    patch.item_label = entry.item_label;
    filled = true;
  }
  if (entry.category && !existing.category) patch.category = entry.category;

  // Only claim 'reference' as the source when a NUTRITION or conversion
  // figure actually came from here. Copying a category is not a claim about
  // where the numbers came from.
  if (filled && hasMacros(entry)) patch.source = 'reference';

  return patch;
}

export function hasMacros(entry) {
  return Boolean(entry) && entry.calories_per_100g !== null
    && entry.calories_per_100g !== undefined;
}

/** The one-line offer shown beside a matching name. */
export function describeOffer(entry) {
  if (!entry) return '';
  const bits = [];
  if (hasMacros(entry)) bits.push(`${entry.calories_per_100g} kcal per 100 g`);
  if (entry.grams_per_item) {
    bits.push(`one ${entry.item_label || 'item'} about ${entry.grams_per_item} g`);
  }
  const detail = bits.length ? ` (${bits.join(', ')})` : '';
  return `Use typical values for ${entry.name}${detail}? These are averages, `
    + 'so they are marked as estimates until you scan the real thing.';
}
