// js/data/portions.js — 04 Oct 2026 v1
// Kitchen rebuild. How many portions a planned meal makes, and how many of
// those are spare.
//
// ---- Why ----
// Graeme, 4 Oct 2026: "What if we make double quantities for freezing, or
// reduced quantities for singles or partners? Everything suggests make for
// 4." The shopping list already scaled to the household (lib/shortfall.js),
// but Plan and Today showed the recipe's own "Serves 4", and cooking took
// four portions' worth out of the pantry. One rule everywhere now:
//   1. What you set for this meal (serves_override).
//   2. Else the people eating it (household members and their portions).
//   3. Else the recipe's own servings.
// Spare portions = made minus the people eating. Those are offered to the
// freezer or a later meal; they are never assumed.

import { servingsForEntry, membersFor, servesFor, isLeftover } from './mealPlan.js';

export const MAX_PORTIONS = 24;

function eatersTotal(members) {
  const total = members.reduce((sum, m) => {
    const f = Number(m.portion_factor);
    return sum + (Number.isFinite(f) && f > 0 ? f : 1);
  }, 0);
  return Math.max(1, Math.ceil(total * 2) / 2);
}

/** Portions for the people eating it, or null when no household is set. Pure. */
export function peoplePortions(entry, members = []) {
  const eating = membersFor(entry || {}, members);
  return eating.length ? eatersTotal(eating) : null;
}

/** Portions this entry makes. Leftovers are what was set aside. Pure. */
export function entryPortions(entry, members = []) {
  if (!entry) return 1;
  if (isLeftover(entry)) return servesFor(entry);
  return servingsForEntry(entry, members);
}

/** Whole portions spare after the people eating it. 0 when unknown. Pure. */
export function sparePortions(entry, members = []) {
  if (!entry || isLeftover(entry)) return 0;
  const people = peoplePortions(entry, members);
  if (people === null) return 0;
  return Math.max(0, Math.floor(entryPortions(entry, members) - people));
}

/** The quick choices offered beside − and +. Pure. */
export function portionChoices(entry, members = []) {
  const people = peoplePortions(entry, members);
  const meal = (entry && entry.meals) || {};
  const out = [];
  if (people !== null) {
    const whole = Math.max(1, Math.ceil(people));
    out.push({ value: whole, label: members.length === 1 || whole === 1 ? `Just for me (${whole})` : `For us (${whole})` });
    out.push({ value: Math.min(MAX_PORTIONS, whole * 2), label: `Double, freeze half (${Math.min(MAX_PORTIONS, whole * 2)})` });
  }
  const recipe = Number(meal.default_serves);
  if (recipe > 0 && !out.some((c) => c.value === recipe)) out.push({ value: recipe, label: `As the recipe (${recipe})` });
  return out;
}

export function portionWords(n) {
  return `${n} portion${n === 1 ? '' : 's'}`;
}
