// js/data/recipeCoverage.js — 03 Oct 2026 v1
// What of a recipe is already in the cupboard.
//
// Used by the recipe page ("You have 6 of 8"), and to rank what you could
// make tonight. Pure: given a recipe, the pantry and the reference file, it
// says which ingredients you have. No network, so it is testable and cheap.
//
// ---- What counts as having something ----
// A pantry row for the same food (matched by name, the way library recipes
// become meals: the reference name IS the food's name), unless it is
// recorded as gone — a quantity of zero, or a level of "none" that is still
// believable. A row with no amount and no level counts as had: "it is in the
// cupboard, amount not recorded" is how most of a real pantry looks.
//
// Water and salt are never "missing". Nobody shops for water, and listing
// salt as missing on every recipe teaches people to ignore the line.

import { effectiveLevel } from './pantry.js';

const ALWAYS_HAVE = new Set(['water', 'salt', 'black-pepper-ground']);

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Names of pantry foods you actually have, normalised. */
export function haveNames(stock = [], nowISO) {
  const names = new Set();
  for (const row of stock) {
    if (!row || !row.foods || !row.foods.name) continue;
    if (row.current_qty !== null && row.current_qty !== undefined && Number(row.current_qty) <= 0) continue;
    if (effectiveLevel(row, nowISO) === 'none') continue;
    names.add(normalise(row.foods.name));
  }
  return names;
}

/**
 * @returns {{ have: object[], missing: object[], total: number }}
 *   each entry is the recipe's own ingredient object, with `name` added
 */
export function coverage(recipe, haveSet, referenceMap = new Map()) {
  const have = [];
  const missing = [];
  for (const ing of (recipe && recipe.ingredients) || []) {
    const entry = referenceMap.get(ing.ref);
    const name = entry ? entry.name : String(ing.ref || '').replace(/-/g, ' ');
    const item = { ...ing, name };
    if (ALWAYS_HAVE.has(ing.ref) || haveSet.has(normalise(name))) have.push(item);
    else missing.push(item);
  }
  return { have, missing, total: have.length + missing.length };
}
