// js/lib/foodNames.js — 03 Oct 2026 v2
// v2: countedName() — "2 anchovy fillets", "½ tin of chopped tomatoes".
// Reference names are written for sorting a list: "Rice, basmati, dry",
// "Flour, plain", "Black pepper, ground". People say "basmati rice",
// "plain flour", "ground black pepper". This turns one into the other for
// places where a name is read, not weighed: a list of what you are missing,
// a checklist of what you have.
//
// A trailing state word (dry, dried, tinned, frozen, cooked) is dropped
// here, because "basmati rice" is what you look for on a shelf. Where the
// state matters to an amount (300 g of DRY rice), keep the full name.

import { pluraliseLabel } from './units.js';

const STATES = /^(dry|dried|tinned|frozen|cooked|fresh|raw)$/i;

export function everydayName(name) {
  let parts = String(name || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && STATES.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  if (parts.length === 1) return parts[0] || '';
  const [head, ...rest] = parts;
  const turned = `${rest.join(' ')} ${head.charAt(0).toLowerCase()}${head.slice(1)}`;
  return turned.charAt(0).toUpperCase() + turned.slice(1);
}

const FRACTION_WORDS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** 0.5 -> "½", 1.5 -> "1½", 2 -> "2"; to the nearest quarter. Pure. */
export function countText(n) {
  const q = Math.max(0.25, Math.round(Number(n) * 4) / 4);
  const whole = Math.floor(q);
  const frac = FRACTION_WORDS[q - whole] || '';
  return `${whole || ''}${frac}` || '¼';
}

/**
 * A counted amount of a food, as a cook says it (found 3 Oct 2026: a
 * method step read "Add 2 fillets", and the recipe page listed "½ tins").
 *   Anchovy fillet, label fillet, 2  -> "2 anchovy fillets"
 *   Garlic clove, label clove, 1.5   -> "1½ garlic cloves"
 *   Egg, medium, label egg, 3        -> "3 medium eggs"
 *   Chopped tomatoes, tinned, tin, ½ -> "½ tin of chopped tomatoes"
 * @returns {{ count: string, rest: string, text: string }}
 */
export function countedName(n, food = {}) {
  const count = countText(n);
  const numeric = Math.round(Number(n) * 4) / 4;
  const label = String(food.item_label || '').trim().toLowerCase();
  const words = everydayName(food.name || '').toLowerCase();
  let rest;
  if (!label) rest = words;
  else {
    const plural = pluraliseLabel(label, numeric > 1 ? 2 : 1);
    if (words === label || words.endsWith(` ${label}`)) rest = `${words.slice(0, words.length - label.length)}${plural}`.trim();
    else if (words.endsWith(` ${label}s`)) rest = `${words.slice(0, words.length - label.length - 1)}${plural}`.trim();
    else rest = `${plural} of ${words}`;
  }
  return { count, rest, text: `${count} ${rest}` };
}
