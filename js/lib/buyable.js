// js/lib/buyable.js — 04 Oct 2026 v2
// v2: fresh herbs and ginger are bought as a pack or a piece, never a cupboard check.
// v1: what you actually pick up in a shop, from what the recipes need.
//
// Persona re-trace 3, the most-felt fault in the app: for one portion of a
// stew the list said "0.25 sweet potatos (50 g)", "0.75 cloves (3.8 g)",
// "0.6 ml" of chilli powder. Recipes are allowed fractions. A shop is not.
//
// Three kinds of line come out of this:
//
//   buy     whole things: "2 chicken thighs", "1 tin", "1 bulb". The
//           recipe amount is kept as a detail when it is not already whole,
//           so nothing is hidden: "Recipes use ¼".
//   weigh   loose food bought by weight or volume, rounded up to an amount
//           a person would ask for: "300 g", "500 ml".
//   check   spoonfuls and cupboard staples (spices, oils, stock, sauces):
//           nobody buys 0.6 ml of chilli powder. The question is whether
//           there is some in the cupboard, so the line says exactly that.
//
// `qty` and `unit` are what goes into the pantry when the line is bought:
// the whole thing you bought, not the fraction the recipe used. A check line
// has no amount (null), because a jar of cumin is not "0.6 ml".
//
// Pure: no imports from data/, so the gates can test it without a client.

import { formatQuantity, pluraliseLabel, toSpoons } from './units.js';

/** Shelves whose contents are bought once and kept: asked about, not counted. */
const STAPLE_SHELVES = new Set(['spices', 'sauces']);
/** Baking is a staple only in small amounts: 300 g of flour for a cake is real shopping. */
const SMALL_STAPLE_SHELVES = new Set(['baking']);
const SPOON_ML = 45;      // three tablespoons and under is a spoonful
const PINCH_G = 15;       // a few grams of anything loose is a pinch
const SMALL_STAPLE_G = 100;

const FRACTIONS = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']];

/** "¼", "1½", "2.3": how much of a thing the recipes use, for the detail line. */
export function friendlyAmount(n) {
  const whole = Math.floor(n + 1e-9);
  const part = n - whole;
  if (part < 0.05) return String(whole);
  for (const [value, glyph] of FRACTIONS) {
    if (Math.abs(part - value) < 0.04) return whole ? `${whole}${glyph}` : glyph;
  }
  return String(Math.round(n * 10) / 10);
}

/** Round up to an amount a person would ask for at a counter. */
export function roundUpNice(n) {
  if (n <= 0) return 0;
  const step = n <= 50 ? 5 : n <= 250 ? 25 : n <= 1000 ? 50 : 100;
  return Math.ceil((n - 1e-9) / step) * step;
}

function isStockLike(name) {
  return /\bstock\b|\bbouillon\b|\bgravy\b/i.test(String(name || ''));
}

/**
 * @param {{qty_needed:number|null, unit:string, foods?:object}} line
 * @param {string} shelf  the shelf this food sits on (data/shelves.js values)
 * @returns {{kind:'buy'|'weigh'|'check'|'none', text:string, detail:string|null, qty:number|null, unit:string|null}}
 */
export function buyable(line, shelf = 'other') {
  const food = (line && line.foods) || {};
  const unit = line && line.unit;
  const raw = line && line.qty_needed;
  if (raw === null || raw === undefined || raw === '') {
    return { kind: 'none', text: '', detail: null, qty: null, unit: unit || null };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { kind: 'none', text: '', detail: null, qty: null, unit: unit || null };
  }

  const recipeAmount = recipeWords(n, unit, food);
  const check = () => ({ kind: 'check', text: 'Check you have some', detail: `Recipes use ${recipeAmount}`, qty: null, unit: unit || null });

  // ---- Fresh herbs and ginger: small, but bought every time ----
  // A few grams of fresh basil is still a pack from the shop; it does not
  // keep in a cupboard, so it is never a "check you have some".
  if (unit === 'g' && /\bfresh\b/i.test(String(food.name || '')) && !food.item_label) {
    const piece = /ginger|galangal|turmeric/i.test(String(food.name));
    return { kind: 'buy', text: piece ? '1 piece' : '1 pack', detail: `Recipes use ${recipeAmount}`, qty: Math.max(n, piece ? 50 : 30), unit };
  }

  // ---- Cupboard staples and spoonfuls ----
  if (STAPLE_SHELVES.has(shelf) || isStockLike(food.name)) return check();
  if (SMALL_STAPLE_SHELVES.has(shelf) && unit !== 'item' && n <= SMALL_STAPLE_G) return check();
  if (unit === 'ml' && n <= SPOON_ML) return check();
  if (unit === 'g' && !food.item_label && n <= PINCH_G) return check();

  const per = Number(food.grams_per_item);
  const label = food.item_label;

  // ---- Counted things ----
  if (unit === 'item' || (unit === 'g' && label && per > 0)) {
    const count = unit === 'item' ? n : n / per;
    // Garlic is bought by the bulb, about ten cloves.
    if (/^clove$/i.test(String(label || '').trim())) {
      const bulbs = Math.max(1, Math.ceil(count / 10 - 1e-9));
      return {
        kind: 'buy',
        text: `${bulbs} ${bulbs === 1 ? 'bulb' : 'bulbs'}`,
        detail: `Recipes use ${friendlyAmount(count)} ${pluraliseLabel('clove', count <= 1 ? 1 : 2)}`,
        qty: unit === 'item' ? bulbs * 10 : bulbs * 10 * per,
        unit
      };
    }
    // Within 5% of a whole number counts as that number: 2.04 tins is 2.
    const whole = Math.max(1, Math.ceil(count - 0.05));
    const words = `${whole} ${pluraliseLabel(label, whole)}`;
    const exact = Math.abs(count - Math.round(count)) < 0.05;
    return {
      kind: 'buy',
      text: words,
      detail: exact ? null : `Recipes use ${unit === 'item' ? `${friendlyAmount(count)} ${pluraliseLabel(label, count > 1 ? 2 : 1)}` : formatQuantity(n, 'g')}`,
      qty: unit === 'item' ? whole : whole * per,
      unit
    };
  }

  // ---- Loose, by weight or volume ----
  if (unit === 'g' || unit === 'ml') {
    const nice = roundUpNice(n);
    return {
      kind: 'weigh',
      text: formatQuantity(nice, unit),
      detail: Math.abs(nice - n) >= 1 ? `Recipes use ${formatQuantity(Math.round(n), unit)}` : null,
      qty: nice,
      unit
    };
  }

  return { kind: 'buy', text: formatQuantity(n, unit), detail: null, qty: n, unit: unit || null };
}

/** How the recipes' own amount reads, for the detail of a check line. */
function recipeWords(n, unit, food) {
  if (unit === 'ml') {
    const exact = toSpoons(n);
    const spoons = exact ? exact.text : nearestSpoons(n);
    if (spoons) return spoons;
    return formatQuantity(Math.round(n), 'ml');
  }
  if (unit === 'item') return `${friendlyAmount(n)} ${pluraliseLabel(food.item_label, n > 1 ? 2 : 1)}`;
  const rounded = Math.max(1, Math.round(n));
  return `${n < 10 ? 'about ' : ''}${formatQuantity(rounded, unit || 'g')}`;
}

/** 0.6 ml reads as "a pinch"; 3.8 ml as "about 1 tsp". */
function nearestSpoons(ml) {
  if (ml < 1.25) return 'a pinch';
  if (ml < 15) {
    const tsp = Math.round((ml / 5) * 2) / 2;
    return `about ${friendlyAmount(Math.max(0.5, tsp))} tsp`;
  }
  if (ml <= 60) return `about ${friendlyAmount(Math.round((ml / 15) * 2) / 2)} tbsp`;
  return null;
}
