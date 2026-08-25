// js/lib/units.js — 21 Aug 2026 v3
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
