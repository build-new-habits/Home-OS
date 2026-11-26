// js/lib/shopSections.js — 25 Nov 2026 v1
// Phase 35. The shopping list by where things go, or in aisle order.
//
// Graeme, 25 Nov 2026: "I like organising by fridges, freezers, fruit, veg,
// cupboards, home. There could be sub categories in meat, fish, dairy etc.
// An aisle-sorted shopping list — let's make this an option."
//
// ---- Built on shelves, not beside them ----
// Every food already has a kind (data/shelves.js: Fruit, Veg, Meat, Fish,
// Dairy and eggs, Bread and bakery, Frozen, Tins and jars…), worked out from
// its name and changeable per food in the pantry. This file only arranges
// those kinds. A food moved once is in the right place in both orders, and
// nothing new has to be learned or corrected.
//
//   Where it goes (default)
//     Fridge    Meat · Fish · Dairy and eggs
//     Freezer · Fruit · Veg · Bakery
//     Cupboard  Tins and jars · Pasta, rice and dried · Baking ·
//               Herbs and spices · Oils and sauces · Snacks
//     Drinks
//     Home      Household · Personal care · Pet
//     Other
//   Aisle order (option)
//     every kind on its own, in the walking order of data/shelves.js
//
// Pure apart from reading and saving the choice. Tested by Tests/shopSections.mjs.

import { shelfLabel, shelfRank } from '../data/shelves.js';

export const SORT_KEY = 'home-os-shop-sort';
export const SORTS = [
  { value: 'where', label: 'Where it goes' },
  { value: 'aisle', label: 'Aisle order' }
];

/** Each kind's place at home. */
const PLACE_OF = {
  meat: 'fridge', fish: 'fridge', dairy: 'fridge',
  frozen: 'freezer',
  fruit: 'fruit',
  veg: 'veg',
  bread: 'bakery',
  tinned: 'cupboard', dried: 'cupboard', baking: 'cupboard', spices: 'cupboard', sauces: 'cupboard', snacks: 'cupboard',
  drinks: 'drinks',
  household: 'home', personal: 'home', pet: 'home',
  other: 'other'
};

export const PLACES = [
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'veg', label: 'Veg' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'cupboard', label: 'Cupboard' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'home', label: 'Home' },
  { value: 'other', label: 'Other' }
];
const PLACE_RANK = new Map(PLACES.map((p, i) => [p.value, i]));
/** Places that hold more than one kind show each kind as a sub-heading. */
const PLACES_WITH_SUBS = new Set(['fridge', 'cupboard', 'home']);

export function placeOf(shelf) {
  return PLACE_OF[shelf] || 'other';
}

export function placeLabel(place) {
  return (PLACES.find((p) => p.value === place) || PLACES[PLACES.length - 1]).label;
}

/** The saved choice: 'where' unless 'aisle' was chosen. */
export function readSort(storage = globalThis.localStorage) {
  try { return storage && storage.getItem(SORT_KEY) === 'aisle' ? 'aisle' : 'where'; } catch { return 'where'; }
}

export function saveSort(value, storage = globalThis.localStorage) {
  try { storage.setItem(SORT_KEY, value === 'aisle' ? 'aisle' : 'where'); } catch { /* the choice lasts this visit */ }
}

/**
 * Lines arranged for the list.
 * @param {any[]} items                    shopping lines
 * @param {(item: any) => string} kindOf   the kind of a line (foodShelves.shelfFor)
 * @param {'where'|'aisle'} sort
 * @returns {Array<{ key: string, label: string, lines: any[], subs: Array<{ key: string, label: string, lines: any[] }> }>}
 *   'aisle': one group per kind, no subs.
 *   'where': one group per place; Fridge, Cupboard and Home carry subs
 *   (kinds with nothing on the list left out). Lines are in name order.
 */
export function arrange(items, kindOf, sort = 'where') {
  const byName = (a, b) => String(a.foods && a.foods.name).localeCompare(String(b.foods && b.foods.name));
  const byKind = new Map();
  for (const item of items || []) {
    const kind = kindOf(item) || 'other';
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(item);
  }
  const kinds = [...byKind.entries()]
    .sort((a, b) => shelfRank(a[0]) - shelfRank(b[0]))
    .map(([kind, lines]) => ({ key: kind, label: shelfLabel(kind), lines: lines.sort(byName) }));

  if (sort === 'aisle') return kinds.map((k) => ({ ...k, subs: [] }));

  const byPlace = new Map();
  for (const kind of kinds) {
    const place = placeOf(kind.key);
    if (!byPlace.has(place)) byPlace.set(place, []);
    byPlace.get(place).push(kind);
  }
  return [...byPlace.entries()]
    .sort((a, b) => (PLACE_RANK.get(a[0]) ?? 99) - (PLACE_RANK.get(b[0]) ?? 99))
    .map(([place, list]) => ({
      key: place,
      label: placeLabel(place),
      lines: list.flatMap((k) => k.lines),
      subs: PLACES_WITH_SUBS.has(place) ? list : []
    }));
}
