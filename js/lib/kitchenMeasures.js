// js/lib/kitchenMeasures.js — 24 Nov 2026 v1
// Phase 34. Kitchen words to grams or millilitres.
//
// Graeme, 24 Nov 2026: recipes say "1 cup", "a handful", "a knob", "8oz",
// and those must become grams or kilograms without anyone doing sums.
//
// ---- Two kinds of word ----
// Fixed:   oz, lb, pint, fl oz, quart, dessertspoon, dash, splash — the same
//          amount whatever it is of.
// Depends: cup, handful, knob, bunch, sprig, pinch, tin/can — how much
//          a cup weighs depends on what is in it. A small table of everyday
//          foods answers that (US cup, 240 ml, which is what cup recipes on
//          the web mean). A cup of something not in the table is kept as
//          240 ml: a volume is honest; a guessed weight would not be.
//
// Words that name a countable thing ("2 garlic cloves", "3 rashers",
// "2 slices of bread") are NOT converted: they stay items, and the food's
// own item weight (data/food_reference.json) does the rest.
//
// Pure. No imports. Tested by Tests/import.mjs.

const ML_PER_CUP = 240;

/** Grams in one US cup, by what is in it. First match wins, so order matters. */
const GRAMS_PER_CUP = [
  [/icing|powdered sugar|confectioner/, 120],
  [/brown sugar|muscovado|demerara/, 200],
  [/sugar|caster/, 200],
  [/cocoa/, 85],
  [/flour|cornflour|cornstarch/, 125],
  [/oat|porridge/, 90],
  [/rice/, 185],
  [/quinoa|couscous|bulgur/, 170],
  [/lentil/, 190],
  [/bean|chickpea/, 180],
  [/pasta|macaroni|penne/, 100],
  [/peanut butter|nut butter|almond butter|tahini/, 250],
  [/butter(?!milk|nut|bean)/, 227],
  [/honey|syrup|treacle|molasses/, 340],
  [/yog(h)?urt|sour cream|creme fraiche|crème fraîche|cream cheese|ricotta/, 245],
  [/parmesan|pecorino/, 90],
  [/cheese|cheddar|mozzarella/, 100],
  [/breadcrumb|panko/, 60],
  [/desiccated|shredded coconut/, 85],
  [/chocolate chip|choc chip/, 170],
  [/almond|walnut|pecan|cashew|peanut|hazelnut|pistachio|nut\b|nuts\b/, 140],
  [/raisin|sultana|currant|cranberr(y|ies) dried|dried fruit|date/, 150],
  [/berr(y|ies)|grape|cherr(y|ies)/, 150],
  [/spinach|rocket|lettuce|kale|leaves|salad|basil|coriander|parsley|mint|herb/, 30],
  [/pea\b|peas\b|sweetcorn|corn\b/, 150],
  [/mushroom/, 70],
  [/onion|pepper|carrot|celery|courgette|tomato|broccoli|cauliflower|cabbage|potato|squash/, 150]
];

/** Liquids: a cup of these is 240 ml. */
const LIQUID = /milk|water|stock|broth|juice|cream(?! cheese)|oil|wine|vinegar|beer|cider|sauce|coconut milk|buttermilk|passata/;

const HERB = /basil|coriander|cilantro|parsley|mint|dill|chive|thyme|rosemary|sage|oregano|tarragon|herb|spinach|rocket|watercress|leaves/;

/** Measure words a recipe uses, to their canonical form. */
const WORDS = [
  [/^(cups?|c)$/, 'cup'],
  [/^(oz|ounces?)$/, 'oz'],
  [/^(lbs?|pounds?)$/, 'lb'],
  [/^(pints?|pt)$/, 'pint'],
  [/^(quarts?|qt)$/, 'quart'],
  [/^(floz|fl\.?\s?oz)$/, 'floz'],
  [/^(dessertspoons?|dsp)$/, 'dsp'],
  [/^(handfuls?)$/, 'handful'],
  [/^(pinch(es)?)$/, 'pinch'],
  [/^(knobs?)$/, 'knob'],
  [/^(bunch(es)?)$/, 'bunch'],
  [/^(sprigs?)$/, 'sprig'],
  [/^(dash(es)?)$/, 'dash'],
  [/^(splash(es)?|glug)$/, 'splash'],
  [/^(tins?|cans?)$/, 'tin'],
  [/^(sticks?)$/, 'stick']
];

/** The canonical measure word, or '' if this word is not a measure. */
export function measureWord(word) {
  const w = String(word || '').toLowerCase().replace(/\.$/, '');
  for (const [pattern, canon] of WORDS) if (pattern.test(w)) return canon;
  return '';
}

function round(n) {
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}

/**
 * An amount in a kitchen measure as grams or ml.
 * @param {number} amount   e.g. 1.5
 * @param {string} measure  a canonical word from measureWord()
 * @param {string} name     what it is of, e.g. "plain flour"
 * @returns {{ quantity: number, unit: 'g'|'ml'|'item', converted: string } | null}
 *   null when the measure should not be converted (leave the line alone).
 */
export function toMetric(amount, measure, name) {
  const n = Number(amount) > 0 ? Number(amount) : 1;
  const what = String(name || '').toLowerCase();
  const PLURAL = { cup: 'cups', handful: 'handfuls', knob: 'knobs', bunch: 'bunches', sprig: 'sprigs', tin: 'tins', stick: 'sticks', pint: 'pints', quart: 'quarts', splash: 'splashes' };
  const WORD = { floz: 'fl oz', dsp: 'dessertspoon' };
  const word = WORD[measure] || (n !== 1 && PLURAL[measure]) || measure;
  const said = `${n} ${word}`;
  const g = (v) => ({ quantity: round(v), unit: 'g', converted: said });
  const ml = (v) => ({ quantity: round(v), unit: 'ml', converted: said });
  switch (measure) {
    case 'oz': return g(n * 28.35);
    case 'lb': return g(n * 453.6);
    case 'pint': return ml(n * 568);
    case 'quart': return ml(n * 946);
    case 'floz': return ml(n * 28.4);
    case 'dsp': return ml(n * 10);
    // A pinch or a dash is seasoning: no amount, exactly as it was before
    // this file existed. "0.5 g salt" on a shopping list helps nobody.
    case 'dash':
    case 'pinch': return { quantity: '', unit: 'item', converted: '' };
    case 'splash': return ml(n * 15);
    case 'sprig': return g(n * 1);
    case 'knob': return g(n * (/ginger/.test(what) ? 15 : 10));
    case 'handful': return g(n * (HERB.test(what) ? 15 : 30));
    case 'bunch': return HERB.test(what) ? g(n * 30) : null;
    case 'tin': return /tomato|bean|chickpea|lentil|coconut|sweetcorn|tuna|fruit|soup/.test(what) ? g(n * 400) : null;
    case 'stick': return /butter/.test(what) ? g(n * 113) : null;
    case 'cup': {
      if (LIQUID.test(what)) return ml(n * ML_PER_CUP);
      for (const [pattern, grams] of GRAMS_PER_CUP) if (pattern.test(what)) return g(n * grams);
      return ml(n * ML_PER_CUP);
    }
    default: return null;
  }
}
