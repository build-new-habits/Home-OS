// js/lib/units.js — 01 Sep 2026 v4
// v4 (Phase 12): pack labels and household measures. formatQuantity() gains
// an OPTIONAL third argument, the food, so it can say "4 tins (1.6 kg)"
// instead of "4 item". The two-argument call is unchanged and still used
// from pantry, shopping and meals — extension by addition only, again.
//
// Teaspoons and tablespoons live HERE and nowhere else. They are display
// units for ml, never stored (schema.md §8), so the conversion has exactly
// one home and no view rolls its own.
//
// v3 (Phase 7): adds formatQuantity() for the g/ml/item quantities on
// pantry stock and shopping list items. Extension by addition only — no
// existing export's signature changed.
// Display-only unit conversion. Canonical storage stays kg / ml / macros
// per 100g everywhere (locked architectural decision).
//
// v2 (Phase 5):
//  - Adds the missing INPUT direction (stone/lb -> kg). v1 could only
//    format kg outward, so a user entering a weight in their display unit
//    had nowhere to convert it before writing. Weight is stored in kg only.
//  - Fixes a rounding defect in kgToStoneLb(): Math.round() on the pounds
//    remainder could return 14, rendering 69.8 kg as "10st 14lb" instead
//    of "11st 0lb". The carry is now handled explicitly.
// Nothing here ever writes a converted value back to the database.

const KG_PER_STONE = 6.35029;
const LB_PER_KG = 2.20462;
const LB_PER_STONE = 14;

/** kg -> { stone, lb } for stone+lb display. lb is always 0-13. */
export function kgToStoneLb(kg) {
  if (kg == null || Number.isNaN(kg)) return null;
  const totalLb = kg * LB_PER_KG;
  let stone = Math.floor(totalLb / LB_PER_STONE);
  let lb = Math.round(totalLb - stone * LB_PER_STONE);
  // Carry: rounding the remainder can reach 14, which is one more stone.
  if (lb >= LB_PER_STONE) {
    stone += 1;
    lb -= LB_PER_STONE;
  }
  return { stone, lb };
}

/** stone + lb -> kg. The canonical direction for anything being stored. */
export function stoneLbToKg(stone, lb = 0) {
  const st = Number(stone) || 0;
  const pounds = Number(lb) || 0;
  const totalLb = st * LB_PER_STONE + pounds;
  return totalLb / LB_PER_KG;
}

/** lb -> kg. */
export function lbToKg(lb) {
  const pounds = Number(lb);
  if (Number.isNaN(pounds)) return null;
  return pounds / LB_PER_KG;
}

/**
 * Normalises a weight entered in the user's display unit into canonical kg.
 * Returns null when the input is not a usable number, so callers can show a
 * text error rather than writing a bad row.
 *
 * unitPref 'kg'       -> { kg }
 * unitPref 'stone_lb' -> { stone, lb }
 */
export function parseWeightToKg(input, unitPref) {
  if (unitPref === 'kg') {
    const kg = Number(input.kg);
    if (!Number.isFinite(kg) || kg <= 0) return null;
    return kg;
  }
  const stone = input.stone === '' || input.stone == null ? 0 : Number(input.stone);
  const lb = input.lb === '' || input.lb == null ? 0 : Number(input.lb);
  if (!Number.isFinite(stone) || !Number.isFinite(lb)) return null;
  if (stone < 0 || lb < 0) return null;
  const kg = stoneLbToKg(stone, lb);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  return kg;
}

/** Format a kg value per the user's `weight_unit_display` preference. */
export function formatWeight(kg, unitPref) {
  if (kg == null || Number.isNaN(kg)) return '—';
  if (unitPref === 'kg') {
    return `${Number(kg).toFixed(1)} kg`;
  }
  const { stone, lb } = kgToStoneLb(Number(kg));
  return `${stone}st ${lb}lb`;
}

/**
 * Format a kg *difference* per the user's preference. Differences are
 * stated as plain magnitudes; the caller supplies any wording around them
 * (behavioural principle 1 — no shame framing, no "best"/"worst").
 */
export function formatWeightDelta(kgDelta, unitPref) {
  if (kgDelta == null || Number.isNaN(kgDelta)) return '—';
  const magnitude = Math.abs(Number(kgDelta));
  if (unitPref === 'kg') {
    return `${magnitude.toFixed(1)} kg`;
  }
  const totalLb = magnitude * LB_PER_KG;
  if (totalLb < LB_PER_STONE) {
    return `${totalLb.toFixed(1)} lb`;
  }
  const { stone, lb } = kgToStoneLb(magnitude);
  return `${stone}st ${lb}lb`;
}

/** Format millilitres, switching to litres above 1000ml for readability. */
export function formatMl(ml) {
  if (ml == null || Number.isNaN(ml)) return '—';
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L`;
  }
  return `${ml} ml`;
}

export { KG_PER_STONE, LB_PER_KG, LB_PER_STONE };


/**
 * "250 g" / "1.5 kg" / "500 ml" / "2 l" / "3 items"
 *
 * Switches to the larger unit above 1000 so a shopping list does not read
 * "2400 g of flour". The UNIT IS ALWAYS PRESENT in the returned text: a
 * bare number on a shopping list is ambiguous at exactly the moment it
 * matters, standing in an aisle.
 */
export function formatQuantity(value, unit = 'g') {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'not known';
  const round = (v, dp = 2) => {
    const factor = 10 ** dp;
    return String(Math.round(v * factor) / factor);
  };
  if (unit === 'item') {
    const rounded = Math.round(n * 100) / 100;
    return `${rounded} item${rounded === 1 ? '' : 's'}`;
  }
  if (unit === 'ml') {
    return n >= 1000 ? `${round(n / 1000)} l` : `${round(n, 1)} ml`;
  }
  // grams, and anything unrecognised, which is safer read as grams than
  // silently relabelled.
  return n >= 1000 ? `${round(n / 1000)} kg` : `${round(n, 1)} g`;
}


// ---- Household measures -------------------------------------------------
// A teaspoon is 5 ml and a tablespoon is 15 ml. Always, everywhere. These
// are DISPLAY units: schema.md §8 forbids storing them, so they are
// converted on the way in and back on the way out.

const ML_PER_TSP = 5;
const ML_PER_TBSP = 15;

/** Ceiling for spoon display. Above this, spoons stop being a sane unit. */
const SPOON_CEILING_ML = 60;

/** What the quantity control offers. `store` is what actually gets saved. */
export const ENTRY_UNITS = [
  { value: 'g', label: 'grams (g)', store: 'g', factor: 1 },
  { value: 'ml', label: 'millilitres (ml)', store: 'ml', factor: 1 },
  { value: 'tsp', label: 'teaspoons', store: 'ml', factor: ML_PER_TSP },
  { value: 'tbsp', label: 'tablespoons', store: 'ml', factor: ML_PER_TBSP },
  { value: 'item', label: 'items', store: 'item', factor: 1 }
];

/**
 * Entry unit -> what to store. 2 tbsp becomes { value: 30, unit: 'ml' }.
 *
 * Returns null for an unusable number rather than guessing, so a caller
 * cannot accidentally write NaN into a quantity column.
 */
export function toStorage(value, entryUnit) {
  const spec = ENTRY_UNITS.find((u) => u.value === entryUnit);
  const n = Number(value);
  if (!spec || !Number.isFinite(n)) return null;
  return { value: Math.round(n * spec.factor * 100) / 100, unit: spec.store };
}

/**
 * Stored ml -> spoons, but ONLY where spoons are the honest reading.
 *
 * 30 ml is 2 tbsp and should say so. 200 ml of milk is 200 ml, not 13⅓
 * tablespoons — a conversion that produces a fraction nobody would measure
 * is a worse label than the number it replaced. So: exact multiples only,
 * and only below the ceiling.
 *
 * Returns null when ml should be left alone.
 */
export function toSpoons(ml) {
  const n = Number(ml);
  if (!Number.isFinite(n) || n <= 0 || n >= SPOON_CEILING_ML) return null;
  if (n % ML_PER_TBSP === 0) {
    const count = n / ML_PER_TBSP;
    return { count, unit: 'tbsp', text: `${count} tbsp` };
  }
  if (n % ML_PER_TSP === 0) {
    const count = n / ML_PER_TSP;
    return { count, unit: 'tsp', text: `${count} tsp` };
  }
  return null;
}

/**
 * Plural of an item label.
 *
 * Deliberately not a pluralisation library. This handles a closed set of
 * kitchen nouns, and the handful that are irregular are listed rather than
 * inferred — a rules engine that turns "loaf" into "loafs" is worse than a
 * lookup that covers the six words people actually type.
 */
const IRREGULAR_PLURALS = {
  loaf: 'loaves',
  half: 'halves',
  leaf: 'leaves',
  knife: 'knives',
  shelf: 'shelves',
  potato: 'potatoes',
  tomato: 'tomatoes',
  box: 'boxes',
  bunch: 'bunches',
  dish: 'dishes',
  glass: 'glasses'
};

export function pluraliseLabel(label, count) {
  const word = String(label || '').trim();
  if (!word) return count === 1 ? 'item' : 'items';
  if (count === 1) return word;
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];
  if (lower.endsWith('s')) return word; // already plural, or a word like "greens"
  return `${word}s`;
}

/**
 * "4 tins (1.6 kg)" / "1 tin" / "4 items" / "2 tbsp"
 *
 * The bracketed total appears ONLY when grams_per_item is known. It is
 * derived on the way out and never stored. Omitting it when the weight is
 * unknown is the point: an invented total on a shopping list gets trusted
 * standing in an aisle.
 */
export function formatPackQuantity(value, unit, food = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'not known';

  if (unit === 'item') {
    const rounded = Math.round(n * 100) / 100;
    const label = pluraliseLabel(food && food.item_label, rounded);
    const perItem = food && food.grams_per_item;
    if (perItem !== null && perItem !== undefined && Number(perItem) > 0) {
      return `${rounded} ${label} (${formatQuantity(rounded * Number(perItem), 'g')})`;
    }
    return `${rounded} ${label}`;
  }

  if (unit === 'ml') {
    const spoons = toSpoons(n);
    if (spoons) return spoons.text;
  }

  return formatQuantity(n, unit);
}

/** The word for one of these, for a form label: "one tin", "one item". */
export function itemNoun(food, count = 1) {
  return pluraliseLabel(food && food.item_label, count);
}

export { ML_PER_TSP, ML_PER_TBSP };
