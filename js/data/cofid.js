// js/data/cofid.js — 04 Oct 2026 v1
// v1: the UK's own food composition tables, searchable on the phone.
//
// Graeme, 4 Oct 2026: fish and chips came to 18 kcal a serving, because
// "Breaded Fish", "Chips" and "Frozen peas" had no nutrition at all. "We
// need a look-up ... otherwise we will be just guessing and then this fails."
//
// data/cofid.json is McCance and Widdowson's Composition of Foods Integrated
// Dataset (CoFID 2019, Public Health England): 2,877 foods with energy,
// protein, fat, carbohydrate, fibre (AOAC, or NSP where that is all there
// is) and sugars per 100 g. Open Government Licence v3.0, so it ships with
// the app and works offline. It is the dataset UK dietitians and food labels
// work from, and it names food the British way ("Courgette", "Chips").
//
// ---- Search, not guess ----
// Nothing here fills in figures by itself. search() ranks candidates and a
// person picks the closest; the home-made reference (foodReference.js) and
// anything typed or scanned still come first. A near-match chosen by a
// person is an estimate they own; one chosen silently is a wrong number.

const URL_PATH = './data/cofid.json';

let loaded = null;
let loading = null;

/** Group letter to words, for showing where a match comes from. */
export const GROUPS = {
  A: 'Cereals and bread', B: 'Milk and dairy', C: 'Eggs', D: 'Vegetables',
  F: 'Fruit', G: 'Nuts and seeds', H: 'Herbs and spices', J: 'Fish',
  M: 'Meat', O: 'Fats and oils', P: 'Drinks', Q: 'Alcoholic drinks',
  S: 'Sugars and sweets', W: 'Soups, sauces and dishes'
};

export async function loadCofid() {
  if (loaded) return loaded;
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(URL_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const doc = await res.json();
      loaded = indexFoods(doc.foods || []);
    } catch (error) {
      console.error('Food tables unavailable:', error);
      loaded = [];
    } finally {
      loading = null;
    }
    return loaded;
  })();
  return loading;
}

/** Rows to searchable objects. Exported for the gates. */
export function indexFoods(rows = []) {
  return rows.map(([code, name, kcal, protein, fat, carbs, fibre, sugars, group]) => ({
    code, name, group,
    calories_per_100g: kcal, protein_g: protein, fat_g: fat, carbs_g: carbs, fibre_g: fibre, sugars_g: sugars,
    words: words(name)
  }));
}

// Everyday words to the tables' words. Kept small and kitchen-shaped.
const SYNONYMS = {
  chips: ['potato', 'chips'], fries: ['potato', 'chips'], mince: ['minced'],
  breaded: ['crumbs', 'breadcrumbs', 'coated'], battered: ['batter'],
  aubergine: ['aubergine'], courgette: ['courgette'], prawn: ['prawns'],
  yoghurt: ['yogurt'], yogurt: ['yogurt'], spaghetti: ['spaghetti', 'pasta'],
  fish: ['fish', 'cod', 'haddock', 'pollock', 'plaice'], mayo: ['mayonnaise'],
  ketchup: ['tomato', 'ketchup'], porridge: ['porridge', 'oats'], crisps: ['crisps'],
  peppers: ['peppers', 'capsicum'], pepper: ['peppers', 'capsicum'], beans: ['beans'],
  light: ['reduced', 'light'], tinned: ['canned'], chopped: ['canned', 'chopped'], ipa: ['beer', 'bitter'], lager: ['lager'], ale: ['beer', 'bitter']
};

function words(text) {
  return String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean).map(singular);
}

function singular(w) {
  if (w.length > 4 && w.endsWith('oes')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

/** Words that tell a brand or a pack size, not a food. */
const NOISE = new Set(['tesco', 'sainsbury', 'asda', 'morrison', 'aldi', 'lidl', 'waitrose', 'coop', 'hellmann', 'heinz', 'm', 'and', 'with', 'the', 'of', 'a', 'g', 'ml', 'kg', 'pack', 'x']);

/** A word that, said alone, means a particular food: chips are potato chips. */
const MEANS = { chip: 'potato', fry: 'potato', fries: 'potato', egg: 'chicken' };

/**
 * Best matches for what a person typed, best first. Pure over `foods`.
 * Every query word that matches a word in the name scores; matching the
 * first word of the name (what the food IS) scores more; plain foods beat
 * long descriptions; "raw" is preferred for vegetables and fruit unless the
 * person said how it was cooked.
 */
export function searchFoods(foods = [], query = '', limit = 12) {
  const raw = words(query).filter((w) => !NOISE.has(w) && !/^\d+[a-z]*$/.test(w));
  if (!raw.length) return [];
  const expanded = raw.map((w) => [w, ...(SYNONYMS[w] || []).map((s) => words(s)[0])]);
  const cooking = /\b(boiled|fried|baked|roast|grilled|steamed|microwaved|cooked|raw|canned|tinned|frozen|dried)\b/i.test(query);
  const scored = [];
  for (const f of foods) {
    let score = 0;
    let hits = 0;
    for (const options of expanded) {
      let best = 0;
      for (const w of options) {
        if (f.words.includes(w)) best = Math.max(best, f.words[0] === w ? 6 : 4);
        else if (w.length >= 4 && f.words.some((fw) => fw.startsWith(w))) best = Math.max(best, 2);
      }
      if (best > 0) hits += 1;
      score += best;
    }
    if (hits === 0) continue;
    score += hits === expanded.length ? 5 : 0;
    score -= Math.max(0, f.words.length - 4) * 0.4;
    if (!cooking && f.words.includes('raw')) score += (f.group === 'D' || f.group === 'F' || f.group === 'C') ? 2 : 1;
    if (/weighed with|edible portion|flesh and skin/i.test(f.name)) score -= 2;
    if (/homemade|retail/i.test(f.name) && f.words.length > 4) score -= 0.5;
    for (const w of raw) if (MEANS[w]) score += f.words.includes(MEANS[w]) ? 4 : -3;
    if (/\b(takeaway|retail|fast food)\b/i.test(f.name)) score -= 0.5;
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length).slice(0, limit).map((x) => x.f);
}

export async function search(query, limit = 12) {
  return searchFoods(await loadCofid(), query, limit);
}

/** "240 kcal · protein 13 g · fat 12.6 g · carbs 19.9 g, per 100 g" */
export function describeMatch(f) {
  const bits = [`${Math.round(f.calories_per_100g)} kcal`];
  if (f.protein_g !== null) bits.push(`protein ${f.protein_g} g`);
  if (f.fat_g !== null) bits.push(`fat ${f.fat_g} g`);
  if (f.carbs_g !== null) bits.push(`carbs ${f.carbs_g} g`);
  return `${bits.join(' · ')}, per 100 g`;
}

// ---- Fibre, kept on the phone until foods.fibre_g exists (migration 026) ----
const FIBRE_KEY = 'home-os-food-fibre';

export function rememberFibre(foodId, fibre) {
  if (!foodId || fibre === null || fibre === undefined) return;
  try {
    const all = JSON.parse(localStorage.getItem(FIBRE_KEY) || '{}') || {};
    all[foodId] = Number(fibre);
    localStorage.setItem(FIBRE_KEY, JSON.stringify(all));
  } catch { /* fibre is a nicety */ }
}

export function rememberedFibre(foodId) {
  try {
    const all = JSON.parse(localStorage.getItem(FIBRE_KEY) || '{}') || {};
    return Number.isFinite(Number(all[foodId])) && all[foodId] !== null ? Number(all[foodId]) : null;
  } catch { return null; }
}
