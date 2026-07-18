// js/lib/units.js — 14 Jul 2026 v1
// Display-only unit conversion. Canonical storage stays kg / ml / macros
// per 100g everywhere (locked architectural decision) — these helpers
// never write a converted value back to the database.

const KG_PER_STONE = 6.35029;
const LB_PER_KG = 2.20462;

/** kg -> { stone, lb } for stone+lb display. */
export function kgToStoneLb(kg) {
  if (kg == null || Number.isNaN(kg)) return null;
  const totalLb = kg * LB_PER_KG;
  const stone = Math.floor(totalLb / 14);
  const lb = Math.round(totalLb - stone * 14);
  return { stone, lb };
}

/** Format a kg value per the user's `weight_unit_display` preference. */
export function formatWeight(kg, unitPref) {
  if (kg == null || Number.isNaN(kg)) return '—';
  if (unitPref === 'kg') {
    return `${kg.toFixed(1)} kg`;
  }
  const { stone, lb } = kgToStoneLb(kg);
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
