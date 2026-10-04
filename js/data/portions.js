// js/data/portions.js — 04 Oct 2026 v2
// v2: a chip for each head count, Just me (1) up to Everyone; nutrition is
// always one person's portion (Today and Plan count one portion each).
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

/**
 * The quick choices offered beside − and +. Pure.
 * Graeme, 4 Oct 2026: "my default is a family of 4, but sometimes I cook on
 * my own, and sometimes for 2 or 3." So one tap for each head count from
 * just you up to everyone, then double to freeze half.
 */
export function portionChoices(entry, members = []) {
  const people = peoplePortions({ member_ids: [] }, members);
  const everyone = people === null ? null : Math.max(1, Math.ceil(people));
  const top = Math.min(6, everyone || 4);
  const out = [];
  for (let n = 1; n <= top; n += 1) {
    let label = String(n);
    if (n === 1) label = 'Just me (1)';
    else if (n === everyone) label = members.length > 1 ? `Everyone (${n})` : String(n);
    out.push({ value: n, label });
  }
  if (everyone) out.push({ value: Math.min(MAX_PORTIONS, everyone * 2), label: `Double, freeze half (${Math.min(MAX_PORTIONS, everyone * 2)})` });
  const meal = (entry && entry.meals) || {};
  const recipe = Number(meal.default_serves);
  if (recipe > 0 && !out.some((c) => c.value === recipe)) out.push({ value: recipe, label: `As the recipe (${recipe})` });
  return out;
}

export function portionWords(n) {
  return `${n} portion${n === 1 ? '' : 's'}`;
}
