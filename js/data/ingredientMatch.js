// js/data/ingredientMatch.js — 24 Nov 2026 v1
// Phase 34. Finding the food an ingredient line means, without asking.
//
// Graeme, 24 Nov 2026: "We need to be better at figuring out the macros
// without the user. There's some stuff that isn't being found that should be."
//
// ---- Why things were missed ----
// A name matched only if it was spelled exactly like a food or one of its
// aliases. "Large onion" missed "Onion, large"; "red lentils" missed;
// "2 garlic cloves, finely chopped" missed. Meanwhile ~10,000 foods sat in
// the offline UK and US tables (data/foodSearch.js), used only when a person
// tapped "Find nutrition" for each ingredient in turn.
//
// ---- What happens now, in order ----
//   1. exact name or alias                    (as before)
//   2. same words in any order, singular      ("large onion" = "Onion, large")
//   3. preparation and filler words removed   ("finely chopped", "fresh", "to serve")
//   4. a size said → that size; none said → the medium one, where sizes exist
//   5. the offline tables, best match, only when EVERY word of the cleaned
//      name is accounted for (cofid.bestMatch's "confident")
// Steps 1–4 are synchronous and live in resolveName (data/ownRecipe.js), so
// every screen that already resolves names gets them. Step 5 needs the
// tables loaded, so it is a separate pass (autoMatch) that adds what it finds
// to the page's name index. A match from step 5 is saved to the food with
// source 'reference', the same as choosing it in the nutrition finder.
//
// Nothing here invents a figure. An ingredient nothing fits stays unknown
// and is shown as unknown — principle "honest data".

import { loadOfflineFoods } from './foodSearch.js';
import { bestMatch } from './cofid.js';

/** Words that describe how an ingredient is prepared, not what it is. */
const PREP = new Set([
  'fresh', 'freshly', 'finely', 'roughly', 'thinly', 'thickly', 'coarsely', 'lightly', 'well',
  'chopped', 'diced', 'sliced', 'grated', 'crushed', 'peeled', 'deseeded', 'seeded', 'trimmed',
  'halved', 'quartered', 'cubed', 'shredded', 'torn', 'rinsed', 'drained', 'softened', 'melted',
  'beaten', 'sifted', 'zested', 'juiced', 'washed', 'picked', 'stoned', 'pitted', 'cored',
  'ripe', 'boneless', 'skinless', 'organic', 'free', 'range', 'good', 'quality', 'plus', 'extra',
  'about', 'approx', 'approximately', 'roughly', 'optional', 'heaped', 'level', 'rounded',
  'room', 'temperature', 'cold', 'warm', 'hot', 'handful', 'bunch', 'sprig', 'sprigs', 'pinch',
  'serve', 'serving', 'taste', 'garnish', 'decorate', 'frying', 'greasing', 'dusting', 'brushing',
  'into', 'chunks', 'pieces', 'piece', 'strips', 'wedges', 'rings', 'thin', 'thick', 'small',
  'bite', 'sized', 'size', 'cut', 'or', 'and', 'for', 'to', 'the', 'a', 'an', 'of', 'in', 'your',
  'favourite', 'favorite', 'choice', 'such', 'as', 'like', 'if', 'you', 'want', 'needed', 'more',
  'tin', 'tins', 'can', 'cans', 'jar', 'jars', 'pack', 'packs', 'packet', 'bag', 'tub', 'x'
]);
// "virgin" kept out of PREP on purpose: "extra virgin olive oil" → "virgin olive oil"
// still finds olive oil (every word except virgin matches and virgin is dropped below).
const DROP_TOO = new Set(['virgin', 'unsalted', 'salted', 'plain', 'whole', 'large', 'medium', 'small', 'big', 'baby', 'mini', 'jumbo', 'very']);

export const SIZES = ['small', 'medium', 'large'];

/** American and other recipe words to the British ones the food list uses. */
const SAY_IT_BRITISH = [
  [/\bground (beef|pork|lamb|turkey|chicken)\b/g, '$1 mince'],
  [/\bminced (beef|pork|lamb|turkey|chicken)\b/g, '$1 mince'],
  [/\bscallions?\b/g, 'spring onion'], [/\bgreen onions?\b/g, 'spring onion'],
  [/\bcilantro\b/g, 'coriander'], [/\bzucchinis?\b/g, 'courgette'], [/\beggplants?\b/g, 'aubergine'],
  [/\bbell peppers?\b/g, 'pepper'], [/\bheavy cream\b/g, 'double cream'], [/\blight cream\b/g, 'single cream'],
  [/\ball[- ]purpose flour\b/g, 'plain flour'], [/\b(powdered|confectioners'?) sugar\b/g, 'icing sugar'],
  [/\bgarbanzo beans?\b/g, 'chickpeas'], [/\bshrimps?\b/g, 'prawns'], [/\barugula\b/g, 'rocket'],
  [/\bcornstarch\b/g, 'cornflour'], [/\bbaking soda\b/g, 'bicarbonate of soda'], [/\bsuperfine sugar\b/g, 'caster sugar'],
  [/\bcanola oil\b/g, 'rapeseed oil'], [/\bchile\b/g, 'chilli'], [/\bchili\b/g, 'chilli'], [/\byogurt\b/g, 'yoghurt']
];

/** The name in the words the food list uses. */
export function britishName(name) {
  let out = String(name || '').toLowerCase();
  for (const [pattern, to] of SAY_IT_BRITISH) out = out.replace(pattern, to);
  return out;
}

function singular(w) {
  if (w.length > 4 && w.endsWith('oes')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('ves')) return `${w.slice(0, -3)}f`;
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

/** Lower-case words, singular, punctuation gone. */
export function wordsOf(text) {
  return String(text || '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean).map(singular);
}

/** The same words in any order: "Onion, large" and "large onions" share a key. */
export function sortedKey(text) {
  return wordsOf(text).sort().join(' ');
}

/**
 * The name with preparation cut away. "2 garlic cloves, finely chopped" is
 * parsed to "garlic cloves, finely chopped" upstream; this makes it "garlic clove".
 * Everything after a comma or " - " is preparation by convention; "or"
 * alternatives keep the first.
 */
export function cleanName(name) {
  const head = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .split(/,| - | – | — |\bor\b|\bto serve\b|\bfor (frying|greasing|serving|dusting)\b/i)[0];
  return wordsOf(head).filter((w) => !PREP.has(w)).join(' ').trim();
}

/** The size a cook said, if any. */
export function sizeSaid(name) {
  const w = wordsOf(name);
  return SIZES.find((s) => w.includes(s)) || '';
}

/**
 * Keys to try against the index, most specific first. Pure.
 *   "Large onion, finely chopped" → ["large onion", "onion", "large onion" (sized), "medium onion"…]
 */
export function candidateKeys(rawName) {
  const name = britishName(rawName);
  const keys = [];
  const add = (k) => { if (k && !keys.includes(k)) keys.push(k); };
  const full = sortedKey(name);
  const clean = cleanName(name);
  const size = sizeSaid(name);
  const core = wordsOf(clean).filter((w) => !DROP_TOO.has(w));
  add(full);
  add(sortedKey(clean));
  if (size && core.length) add([...core, size].sort().join(' '));
  add(core.slice().sort().join(' '));
  if (core.length) add([...core, 'medium'].sort().join(' '));
  return keys;
}

/** The cleaned words that must all be found for a table match to count. */
export function coreQuery(name) {
  return wordsOf(cleanName(britishName(name))).filter((w) => !DROP_TOO.has(w)).join(' ');
}

/**
 * Step 5. For every ingredient the index cannot resolve, the best confident
 * match in the offline tables, added to the index under the ingredient's
 * own name so resolveName finds it from now on. Mutates `index`.
 *
 * @returns {Promise<{ matched: string[], unmatched: string[] }>}
 */
export async function autoMatch(names, index, resolve, { foods = null } = {}) {
  const matched = [];
  const unmatched = [];
  const todo = [...new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean))]
    .filter((n) => !resolve(n, index));
  if (!todo.length) return { matched, unmatched };
  let table = foods;
  if (!table) {
    try { table = await loadOfflineFoods(); } catch { table = []; }
  }
  for (const name of todo) {
    // "salt and pepper", "oil and vinegar": two things on one line. Matching
    // either alone would be a guess, and seasoning has no amount anyway.
    if (/\band\b|&/.test(name)) { unmatched.push(name); continue; }
    const query = coreQuery(name);
    const { food, confident } = query ? bestMatch(table, query) : { food: null, confident: false };
    if (food && confident && food.calories_per_100g !== null && food.calories_per_100g !== undefined) {
      const entry = {
        name: food.name,
        source: food.source,
        calories_per_100g: food.calories_per_100g,
        protein_g: food.protein_g ?? null,
        fat_g: food.fat_g ?? null,
        carbs_g: food.carbs_g ?? null,
        fibre_g: food.fibre_g ?? null,
        grams_per_item: food.grams_per_item ?? null,
        grams_per_ml: food.grams_per_ml ?? null,
        item_label: food.item_label ?? null,
        category: food.category || null,
        matchedFrom: food.source === 'app' ? 'everyday' : food.source
      };
      const hit = food.source === 'app' && food.slug
        ? { key: food.slug, ref: food.slug, entry: food }
        : { key: `table-${food.source}-${food.code}`, entry, tableMatch: true };
      index.byName.set(String(name).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(), hit);
      matched.push(name);
    } else {
      unmatched.push(name);
    }
  }
  return { matched, unmatched };
}

/** Where a match came from, in words, for the check screen. */
export function matchSource(hit) {
  if (!hit) return '';
  if (hit.foodId) return 'Your foods';
  if (hit.ref) return 'Everyday foods';
  const from = hit.entry && hit.entry.matchedFrom;
  return from === 'uk' ? 'UK food tables' : from === 'us' ? 'US food tables' : 'Food tables';
}
