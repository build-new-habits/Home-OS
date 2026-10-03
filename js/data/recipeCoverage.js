// js/data/recipeCoverage.js — 03 Oct 2026 v2
// v2: size words ignored when matching (a large onion does for a medium one).
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

// A large onion in the cupboard does for a recipe that asks for a medium
// one. Size words are dropped when deciding whether you HAVE something;
// "Butter, block" and "Butter beans, tinned" stay different foods.
const SIZE = /\b(very large|small|medium|large)\b/g;
function family(value) {
  return normalise(value).replace(SIZE, ' ').replace(/\s+/g, ' ').trim();
}

/** Names of pantry foods you actually have, normalised. */
export function haveNames(stock = [], nowISO) {
  const names = new Set();
  for (const row of stock) {
    if (!row || !row.foods || !row.foods.name) continue;
    if (row.current_qty !== null && row.current_qty !== undefined && Number(row.current_qty) <= 0) continue;
    if (effectiveLevel(row, nowISO) === 'none') continue;
    names.add(family(row.foods.name));
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
    if (ALWAYS_HAVE.has(ing.ref) || haveSet.has(family(name))) have.push(item);
    else missing.push(item);
  }
  return { have, missing, total: have.length + missing.length };
}

/**
 * Recipes ranked by how little you need to buy, and then by how much they
 * use up what is near its date (3 Oct 2026, "What can I make tonight?").
 *
 * @param {object[]} recipes  library recipes
 * @param {Set<string>} haveSet  from haveNames()
 * @param {Map} referenceMap
 * @param {Set<string>} soonSet  normalised names of foods worth using up
 * @returns {Array<{ recipe, have, missing, total, usesSoon: string[] }>}
 */
export function rankRecipes(recipes = [], haveSet, referenceMap = new Map(), soonSet = new Set()) {
  return recipes.map((recipe) => {
    const c = coverage(recipe, haveSet, referenceMap);
    const usesSoon = c.have.filter((i) => soonSet.has(family(i.name))).map((i) => i.name);
    return { recipe, ...c, usesSoon };
  })
    .filter((r) => r.have.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length
      || b.usesSoon.length - a.usesSoon.length
      || (b.have.length / b.total) - (a.have.length / a.total)
      || a.recipe.name.localeCompare(b.recipe.name));
}

export function normaliseName(value) { return family(value); }
