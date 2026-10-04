// js/data/drinks.js — 04 Oct 2026 v1
// Kitchen rebuild. Drinks: a row on the plan and on Today, added in a tap.
//
// ---- Why ----
// Graeme, 4 Oct 2026: "In the plan, drinks needs a space, a quick add
// option." Nobody plans a cup of tea as a recipe. A drink is one tap on
// a chip: Tea, Water, Coffee…, counted per day ("Tea ×3").
//
// ---- Where they live ----
// On this phone. Drinks are personal (your tea is not the household's), and
// the plan table's drink slot needs migration 026 and a meal row per cup,
// which is the wrong weight for a cup of tea. Kept by week and day, and
// weeks older than three are forgotten.
//
// ---- Nutrition ----
// Each kind carries an estimate for one usual serving, stated in `serving`
// so it is never a hidden number. "Something else" is counted as a drink
// but its nutrition is unknown, and the day's figures say so.

export const DRINKS = [
  { value: 'water', label: 'Water', serving: 'a 250 ml glass', per: { calories: 0, carbs_g: 0, fat_g: 0, protein_g: 0, fibre_g: 0 } },
  // A mug of black tea or coffee with a 30 ml splash of semi-skimmed milk.
  { value: 'tea', label: 'Tea', serving: 'a mug with a splash of milk', per: { calories: 17, carbs_g: 2.1, fat_g: 0.5, protein_g: 1.1, fibre_g: 0 } },
  { value: 'coffee', label: 'Coffee', serving: 'a mug with a splash of milk', per: { calories: 19, carbs_g: 2.3, fat_g: 0.5, protein_g: 1.4, fibre_g: 0 } },
  { value: 'juice', label: 'Juice', serving: 'a 150 ml glass', per: { calories: 70, carbs_g: 15.6, fat_g: 0.3, protein_g: 1.1, fibre_g: 0.3 } },
  { value: 'milk', label: 'Milk', serving: 'a 200 ml glass of semi-skimmed', per: { calories: 103, carbs_g: 9.9, fat_g: 3.7, protein_g: 7.4, fibre_g: 0 } },
  { value: 'smoothie', label: 'Smoothie', serving: 'a 150 ml glass', per: { calories: 80, carbs_g: 17.5, fat_g: 0.3, protein_g: 1, fibre_g: 1.5 } },
  { value: 'squash', label: 'Squash', serving: 'a 250 ml glass, no added sugar', per: { calories: 5, carbs_g: 0.8, fat_g: 0, protein_g: 0, fibre_g: 0 } },
  { value: 'fizzy', label: 'Fizzy drink', serving: 'a 330 ml can, full sugar', per: { calories: 139, carbs_g: 35, fat_g: 0, protein_g: 0, fibre_g: 0 } },
  { value: 'other', label: 'Something else', serving: 'nutrition not known', per: null }
];

const BY_VALUE = new Map(DRINKS.map((d) => [d.value, d]));
const LOCAL_KEY = 'home-os-drinks';
const KEEP_WEEKS = 3;

export function drinkKind(value) { return BY_VALUE.get(value) || BY_VALUE.get('other'); }

function readAll() {
  try { return JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; }
}

function writeAll(all) {
  try { globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

/** Keeps the newest weeks only. Pure. Week keys are ISO Mondays, so they sort. */
export function pruneWeeks(all, keep = KEEP_WEEKS) {
  const weeks = Object.keys(all || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-keep);
  const out = {};
  for (const w of weeks) out[w] = all[w];
  return out;
}

/** The drinks for one day: [{ id, kind, name? }]. */
export function listDrinks(weekStart, day) {
  const week = readAll()[weekStart] || {};
  return Array.isArray(week[day]) ? week[day].filter((d) => d && d.id) : [];
}

/** Adds one drink. `name` only for "Something else". */
export function addDrink(weekStart, day, kind, name = '') {
  const all = readAll();
  const week = all[weekStart] || {};
  const list = Array.isArray(week[day]) ? week[day] : [];
  const drink = { id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: BY_VALUE.has(kind) ? kind : 'other' };
  const clean = String(name || '').trim().slice(0, 60);
  if (drink.kind === 'other' && clean) drink.name = clean;
  week[day] = [...list, drink];
  all[weekStart] = week;
  return writeAll(pruneWeeks(all)) ? { ok: true, data: drink } : { ok: false, error: new Error('This phone would not store it.') };
}

/** Takes one drink off: the latest of that kind (and name), or by id. */
export function removeDrink(weekStart, day, { id, kind, name } = {}) {
  const all = readAll();
  const week = all[weekStart] || {};
  const list = Array.isArray(week[day]) ? [...week[day]] : [];
  let index = -1;
  if (id) index = list.findIndex((d) => d.id === id);
  else {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].kind === kind && (kind !== 'other' || (list[i].name || '') === (name || ''))) { index = i; break; }
    }
  }
  if (index === -1) return { ok: true, data: null };
  const [gone] = list.splice(index, 1);
  week[day] = list;
  all[weekStart] = week;
  return writeAll(all) ? { ok: true, data: gone } : { ok: false, error: new Error('This phone would not store it.') };
}

export function drinkName(drink) {
  if (!drink) return 'A drink';
  if (drink.kind === 'other') return drink.name || 'Something else';
  return drinkKind(drink.kind).label;
}

/** "Tea ×3, Water ×2" groups, in the order first drunk. Pure. */
export function tallyDrinks(drinks = []) {
  const groups = new Map();
  for (const d of drinks) {
    const key = d.kind === 'other' ? `other:${d.name || ''}` : d.kind;
    if (!groups.has(key)) groups.set(key, { kind: d.kind, name: d.kind === 'other' ? (d.name || '') : undefined, label: drinkName(d), count: 0 });
    groups.get(key).count += 1;
  }
  return [...groups.values()];
}

export function tallyText(drinks = []) {
  return tallyDrinks(drinks).map((g) => (g.count > 1 ? `${g.label} ×${g.count}` : g.label)).join(', ');
}

/**
 * Nutrition items for data/nutrition.js dayNutrition: one per drink, with
 * "Something else" marked as unknown. Pure.
 */
export function drinkNutritionItems(drinks = []) {
  const unknown = { calories: false, carbs_g: false, fat_g: false, protein_g: false, fibre_g: false };
  return drinks.map((d) => {
    const kind = drinkKind(d.kind);
    return kind.per
      ? { perServing: kind.per, complete: {} }
      : { perServing: { calories: 0, carbs_g: 0, fat_g: 0, protein_g: 0, fibre_g: 0 }, complete: unknown };
  });
}
