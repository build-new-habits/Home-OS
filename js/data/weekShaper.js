// js/data/weekShaper.js — 27 Nov 2026 v2
// v2: prepare() also carries cuisine and kcal a serving, for Help me choose
// (Phase 39). Nothing the shaper scores has changed.
// Phase 37 (Hearth). Week Shaper: what you might cook, read from rules.
//
// Graeme, 26 Nov 2026: "fish twice a week, meat once a week, veg the rest.
// Something for everybody. A match on Sunday, so Saturday builds energy. The
// gym, so protein. It never says you're going to cook puttanesca tonight.
// It says here are 5 things you might want to cook. And if I don't want to
// choose: you tell me, from what's in the pantry."
//
// ---- No AI ----
// Rules, filters and a score, in plain JS. Same inputs, same list, every
// time: ties are broken by name, and nothing here is random.
//
// ---- It suggests; you decide ----
// Nothing in this file writes anything. The view plans a meal only when a
// person taps Plan it.
//
// ---- No shame ----
// A rule is a fact about the week ("Fish: 1 of 2"), never a failure. Every
// reason this file writes is a plain description of the food.
//
// ---- Pure ----
// prepare() turns your meals and the library into candidates once; the
// rest takes plain data. No queries, so the gates can run it as it is.

import { candidatesFrom, suitsDiet, householdDiet } from './weekIdeas.js';
import { proteinsOf } from './recipeLibrary.js';
import { recipeNutrition } from './nutrition.js';
import { computeMacros } from './meals.js';
import { coverage, normaliseName } from './recipeCoverage.js';

/** The weights, in one table, so they can be tuned in one place. */
export const WEIGHTS = Object.freeze({
  options: Object.freeze({ need: 3, event: 3, soon: 2, pantry: 1, variety: 1, everyone: 1 }),
  chooseForMe: Object.freeze({ need: 3, event: 3, soon: 4, pantry: 3, variety: 1, everyone: 1 })
});

export const DEFAULT_RULES = Object.freeze({
  rhythm: true,
  fish: 2,
  meat: 1,
  everyone: true,
  weeknights: 'any', // 'any' | '30' | '45'
  weekends: 'any',
  useItUp: true,
  variety: true
});

export const TIME_CHOICES = [
  { value: 'any', label: 'Any time' },
  { value: '45', label: 'Under 45 minutes' },
  { value: '30', label: 'Under 30 minutes' }
];

export const EVENTS = [
  { value: 'match', label: 'Match or race' },
  { value: 'gym', label: 'Gym or training' },
  { value: 'busy', label: 'Busy evening' },
  { value: 'guests', label: 'Guests' }
];

export const KIND_LABELS = { fish: 'Fish', meat: 'Meat', veggie: 'Veggie' };

/** Monday to Thursday evenings are weeknights; Friday to Sunday, weekends. */
const WEEKNIGHTS = new Set(['mon', 'tue', 'wed', 'thu']);
const JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const QUICK_MINUTES = 20;
const VARIETY_DAYS = 14;
const NUTS = /\b(peanut|almond|cashew|walnut|pistachio|hazelnut|pecan|macadamia|nut)s?\b/i;

// ---- Rules ----------------------------------------------------------------

function clampCount(value, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(7, Math.max(0, n)) : fallback;
}

/** Rules as saved, made safe: anything odd falls back to its default. */
export function normaliseRules(raw = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const time = (v) => (['any', '30', '45'].includes(String(v)) ? String(v) : 'any');
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  const fish = clampCount(r.fish, DEFAULT_RULES.fish);
  const meat = Math.min(7 - fish, clampCount(r.meat, DEFAULT_RULES.meat));
  return {
    rhythm: bool(r.rhythm, DEFAULT_RULES.rhythm),
    fish,
    meat,
    everyone: bool(r.everyone, DEFAULT_RULES.everyone),
    weeknights: time(r.weeknights),
    weekends: time(r.weekends),
    useItUp: bool(r.useItUp, DEFAULT_RULES.useItUp),
    variety: bool(r.variety, DEFAULT_RULES.variety)
  };
}

/** Events kept by date: { 'YYYY-MM-DD': ['match', 'gym'] }. Unknown names dropped. */
export function normaliseEvents(raw = {}) {
  const known = new Set(EVENTS.map((e) => e.value));
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [date, list] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(list)) continue;
    const kept = [...new Set(list.filter((v) => known.has(v)))];
    if (kept.length) out[date] = kept;
  }
  return out;
}

/** Drops events more than a fortnight old, so the saved row stays small. */
export function pruneEvents(events = {}, todayIso) {
  const out = {};
  const cutoff = addDays(todayIso, -VARIETY_DAYS);
  for (const [date, list] of Object.entries(events)) if (date >= cutoff) out[date] = list;
  return out;
}

export function toggleEvent(events = {}, date, value) {
  const next = { ...events };
  const list = new Set(next[date] || []);
  if (list.has(value)) list.delete(value); else list.add(value);
  if (list.size) next[date] = EVENTS.map((e) => e.value).filter((v) => list.has(v));
  else delete next[date];
  return next;
}

// ---- Dates ----------------------------------------------------------------

export function addDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayValueOf(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return JS_DAY[new Date(y, m - 1, d).getDay()];
}

// ---- Reading a recipe -------------------------------------------------------

/** Fish if anything is fish; else meat if anything is meat; else veggie. */
export function kindOf({ ingredients = [], diet = null } = {}) {
  const found = proteinsOf({ ingredients });
  if (found.includes('fish')) return 'fish';
  if (found.includes('meat')) return 'meat';
  if (diet === 'pescatarian') return 'fish';
  if (diet === 'meat') return 'meat';
  return 'veggie';
}

/**
 * Carb-led: carbohydrate is at least half the energy. Protein-led: protein
 * is at least a quarter of the energy, or 30 g a serving. Incomplete
 * figures are labelled neither: a guess here would be a claim about food.
 */
export function leadOf(perServing, complete = {}) {
  if (!perServing) return null;
  for (const key of ['calories', 'protein_g', 'carbs_g']) if (complete[key] === false) return null;
  const kcal = Number(perServing.calories);
  const carbs = Number(perServing.carbs_g);
  const protein = Number(perServing.protein_g);
  if (!Number.isFinite(kcal) || kcal <= 0) return null;
  const leads = [];
  if (Number.isFinite(carbs) && (carbs * 4) / kcal >= 0.5) leads.push('carb');
  if (Number.isFinite(protein) && ((protein * 4) / kcal >= 0.25 || protein >= 30)) leads.push('protein');
  return leads;
}

/** Calories a serving, only when the figure is complete. Pure. */
export function kcalOf(nutrition) {
  if (!nutrition || !nutrition.perServing) return null;
  if (nutrition.complete && nutrition.complete.calories === false) return null;
  const k = Number(nutrition.perServing.calories);
  return Number.isFinite(k) && k > 0 ? Math.round(k) : null;
}

function hasNuts(ingredients = []) {
  return ingredients.some((i) => NUTS.test(String(i.ref || i.name || '').replace(/-/g, ' ')));
}

/**
 * Your meals and the library, read once into candidates the score can use.
 *
 * @param {object} o
 * @param {Array}  o.meals             your meals rows
 * @param {Array}  o.recipes           the Community library
 * @param {Map}    o.ingredientsByMeal meal id → meal_ingredients rows with foods
 * @param {Map}    o.referenceMap      from foodReference.referenceBySlug()
 * @param {Set}    o.haveSet           from recipeCoverage.haveNames()
 * @param {Set}    o.soonSet           normalised names of food to use soon
 */
export function prepare({ meals = [], recipes = [], ingredientsByMeal = new Map(), referenceMap = new Map(), haveSet = new Set(), soonSet = new Set() } = {}) {
  const base = candidatesFrom({ meals, recipes });
  return base.map((c) => {
    let ingredients;
    let nutrition = null;
    let minutes = c.minutes;
    if (c.recipe) {
      ingredients = c.recipe.ingredients || [];
      try { nutrition = recipeNutrition(c.recipe, referenceMap); } catch { nutrition = null; }
    } else {
      const rows = (c.meal && ingredientsByMeal.get(c.meal.id)) || [];
      const counted = rows.filter((r) => r.option_group == null || r.is_selected !== false);
      ingredients = counted.map((r) => ({ ref: (r.foods && r.foods.name) || '', name: (r.foods && r.foods.name) || '', quantity: r.quantity_g, unit: r.unit }));
      if (counted.length) {
        try { nutrition = computeMacros(counted, { serves: (c.meal && c.meal.default_serves) || 1 }); } catch { nutrition = null; }
      }
      const prep = Number(c.meal && c.meal.prep_minutes);
      const cook = Number(c.meal && c.meal.cook_minutes);
      const known = [prep, cook].filter((n) => Number.isFinite(n) && n >= 0);
      minutes = known.length ? known.reduce((a, b) => a + b, 0) : null;
    }
    const cover = coverage({ ingredients }, haveSet, referenceMap);
    const usesSoon = cover.have.filter((i) => soonSet.has(normaliseName(i.name))).map((i) => i.name);
    return {
      key: c.key,
      name: c.name,
      meal: c.meal,
      recipe: c.recipe,
      own: c.own,
      favourite: c.favourite,
      slot: c.slot || 'dinner',
      course: c.course || 'main',
      budget: c.budget,
      serves: Number((c.meal && c.meal.default_serves) || (c.recipe && c.recipe.default_serves)) || null,
      dietary_tags: c.dietary_tags || [],
      ingredients,
      nuts: hasNuts(ingredients),
      kind: kindOf({ ingredients, diet: c.meal && c.meal.diet }),
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      lead: nutrition ? leadOf(nutrition.perServing, nutrition.complete) : null,
      kcal: kcalOf(nutrition),
      cuisine: c.cuisine || '',
      have: cover.have.length,
      total: cover.total,
      missing: cover.missing,
      usesSoon
    };
  });
}

// ---- The week so far ------------------------------------------------------

/** The keys a plan entry stands for: its meal, and its library recipe. */
export function entryKeys(entry) {
  const out = [];
  if (entry && entry.meal_id) out.push(`meal:${entry.meal_id}`);
  const ref = entry && entry.meals && entry.meals.library_ref;
  if (ref) out.push(`recipe:${ref}`);
  return out;
}

/**
 * Fish, meat and veggie dinners already planned. Leftovers are the same
 * meal again, so they do not count twice.
 */
export function tally(entries = [], candidates = []) {
  const byKey = new Map();
  for (const c of candidates) {
    byKey.set(c.key, c);
    if (c.recipe) byKey.set(`recipe:${c.recipe.slug}`, c);
  }
  const counts = { fish: 0, meat: 0, veggie: 0, planned: 0 };
  for (const e of entries) {
    if (e.slot !== 'dinner' || e.is_leftover) continue;
    counts.planned += 1;
    const c = entryKeys(e).map((k) => byKey.get(k)).find(Boolean);
    const kind = c ? c.kind : (e.meals && e.meals.diet === 'pescatarian' ? 'fish' : e.meals && e.meals.diet === 'meat' ? 'meat' : 'veggie');
    counts[kind] += 1;
  }
  return counts;
}

/** "Fish: 1 of 2", "Meat: 1 of 1", "Veggie: 3". Facts, never verdicts. */
export function describeTally(counts, rules) {
  const r = normaliseRules(rules);
  if (!r.rhythm) return [`${counts.planned} dinner${counts.planned === 1 ? '' : 's'} planned`];
  return [
    `Fish: ${counts.fish} of ${r.fish}`,
    `Meat: ${counts.meat} of ${r.meat}`,
    `Veggie: ${counts.veggie}`
  ];
}

/** Which kinds the week still has room for, from the dinners left open. */
export function needs(counts, rules) {
  const r = normaliseRules(rules);
  const fish = Math.max(0, r.fish - counts.fish);
  const meat = Math.max(0, r.meat - counts.meat);
  const open = Math.max(0, 7 - counts.planned);
  return { fish, meat, veggie: Math.max(0, open - fish - meat) };
}

// ---- Events ---------------------------------------------------------------

/**
 * What a day's events ask of one meal. A match shapes the dinner the day
 * before and the lunch on the day; training shapes that day and breakfast
 * the next morning.
 * @returns {Array<{ want: 'carb'|'protein'|'quick'|'familiar'|'serves', reason: string }>}
 */
export function shapesFor(dateIso, slot, events = {}) {
  const today = events[dateIso] || [];
  const tomorrow = events[addDays(dateIso, 1)] || [];
  const yesterday = events[addDays(dateIso, -1)] || [];
  const out = [];
  if (slot === 'dinner' && tomorrow.includes('match')) out.push({ want: 'carb', reason: 'Carb-led for energy before the match' });
  if (slot === 'lunch' && today.includes('match')) out.push({ want: 'familiar', reason: 'A familiar lunch on match day' });
  if (today.includes('gym') && slot !== 'breakfast') out.push({ want: 'protein', reason: 'Protein-led after training' });
  if (slot === 'breakfast' && yesterday.includes('gym')) out.push({ want: 'protein', reason: 'Protein-led the morning after training' });
  if (slot === 'dinner' && today.includes('busy')) out.push({ want: 'quick', reason: 'Quick for a busy evening' });
  if (slot === 'dinner' && today.includes('guests')) out.push({ want: 'serves', reason: 'Serves a crowd' });
  return out;
}

/** The longest a meal on this day may take, from the time rule. Dinners only. */
export function timeLimit(dateIso, slot, rules) {
  if (slot !== 'dinner') return null;
  const r = normaliseRules(rules);
  const setting = WEEKNIGHTS.has(dayValueOf(dateIso)) ? r.weeknights : r.weekends;
  return setting === 'any' ? null : Number(setting);
}

function eventFit(c, shape, guests) {
  switch (shape.want) {
    case 'carb': return c.lead && c.lead.includes('carb') ? 1 : 0;
    case 'protein': return c.lead && c.lead.includes('protein') ? 1 : 0;
    case 'quick': return c.minutes !== null && c.minutes <= QUICK_MINUTES ? 1 : 0;
    case 'familiar': return c.favourite ? 1 : c.own && c.budget !== 'special' ? 0.7 : 0;
    case 'serves': return c.budget === 'special' || (c.serves && c.serves >= guests) ? 1 : 0;
    default: return 0;
  }
}

// ---- The score ------------------------------------------------------------

/**
 * Every candidate that may be cooked on this day, scored and explained,
 * best first. Both ways in use it: Show me options takes the first five,
 * You choose for me takes the first.
 *
 * @param {object} o
 * @param {Array}  o.candidates   from prepare()
 * @param {string} o.date         'YYYY-MM-DD'
 * @param {string} [o.slot]       'dinner' by default
 * @param {object} o.rules
 * @param {object} o.events       by date
 * @param {Array}  o.entries      this food week's plan
 * @param {Array}  o.members      household members (dietary_tags)
 * @param {Set}    [o.recentKeys] cooked in the last 14 days
 * @param {'options'|'chooseForMe'} [o.mode]
 * @param {Set}    [o.skip]       keys already passed over ("Something else")
 */
export function rank({
  candidates = [], date, slot = 'dinner', rules = DEFAULT_RULES, events = {}, entries = [],
  members = [], recentKeys = new Set(), mode = 'options', skip = new Set()
}) {
  const r = normaliseRules(rules);
  const w = WEIGHTS[mode] || WEIGHTS.options;
  const table = householdDiet(members);
  const nutFree = table.has('nut_free');
  const counts = tally(entries, candidates);
  const room = needs(counts, r);
  const shapes = shapesFor(date, slot, events);
  const limit = timeLimit(date, slot, r);
  const guests = (members.length || 2) + 2;
  const planned = new Set(entries.flatMap(entryKeys));

  const out = [];
  for (const c of candidates) {
    // ---- Hard filters: never scored away ----
    if (c.course !== 'main') continue;
    if (c.slot !== slot) continue;
    if (planned.has(c.key) || skip.has(c.key)) continue;
    if (c.recipe && (planned.has(`recipe:${c.recipe.slug}`) || skip.has(`recipe:${c.recipe.slug}`))) continue;
    if (nutFree && c.nuts) continue; // an allergy always excludes
    const suitsAll = suitsDiet(c, table, c.ingredients.map((i) => i.ref || i.name || ''));
    if (r.everyone && !suitsAll) continue;
    if (limit !== null && c.minutes !== null && c.minutes > limit) continue;

    // ---- The score: each part 0 to 1 (rule need can be -1) ----
    const parts = { need: 0, event: 0, soon: 0, pantry: 0, variety: 0, everyone: 0 };
    if (r.rhythm && slot === 'dinner') {
      // Fish and meat nights are asked for by number; veggie is the rest.
      // So a night the week still asks for comes first, and veggie fills.
      if (c.kind === 'veggie') parts.need = room.veggie > 0 ? 0.5 : 0;
      else parts.need = room[c.kind] > 0 ? 1 : -1;
    }
    let shapeHit = null;
    for (const s of shapes) {
      const fit = eventFit(c, s, guests);
      if (fit > parts.event) { parts.event = fit; shapeHit = s; }
    }
    if (r.useItUp || mode === 'chooseForMe') parts.soon = c.usesSoon.length ? 1 : 0;
    parts.pantry = c.total ? c.have / c.total : 0;
    if (r.variety) parts.variety = recentKeys.has(c.key) || (c.recipe && recentKeys.has(`recipe:${c.recipe.slug}`)) ? 0 : 1;
    parts.everyone = suitsAll ? 1 : 0;

    let score = 0;
    for (const k of Object.keys(parts)) score += parts[k] * w[k];
    out.push({ c, score: Math.round(score * 1000) / 1000, parts, shape: shapeHit, reasons: reasonsFor(c, { parts, shape: shapeHit, counts, rules: r, slot, members, mode }) });
  }
  out.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name) || a.c.key.localeCompare(b.c.key));
  return out;
}

/** The chips on a suggestion: why it fits, in plain words. */
export function reasonsFor(c, { parts, shape, counts, rules, slot, members = [], mode = 'options' }) {
  const out = [];
  if (shape && parts.event > 0) out.push(shape.reason);
  if (rules.rhythm && slot === 'dinner' && parts.need > 0 && c.kind !== 'veggie') {
    out.push(`${KIND_LABELS[c.kind]} night ${counts[c.kind] + 1} of ${rules[c.kind]}`);
  } else {
    out.push(KIND_LABELS[c.kind]);
  }
  if (c.minutes) out.push(`${c.minutes} min`);
  if (c.usesSoon.length) out.push(`Uses ${c.usesSoon.slice(0, 2).map((n) => shortName(n)).join(' and ')}`);
  if (mode === 'chooseForMe' && c.total) out.push(c.have === c.total ? 'You have everything' : `You have ${c.have} of ${c.total}`);
  if (parts.everyone && members.length > 1) out.push('Suits everyone');
  if (c.favourite) out.push('A favourite');
  else if (c.own) out.push('One of yours');
  return out;
}

/** "Spinach, baby" → "spinach". Lower case, the first part only. */
export function shortName(name) {
  return String(name || '').split(',')[0].trim().toLowerCase();
}

/** The five for one page of Show me options. */
export function options(ranked = [], page = 0, size = 5) {
  return ranked.slice(page * size, page * size + size);
}

/** You choose for me: the best one, and what you would need for it. */
export function chooseOne(ranked = []) {
  const first = ranked[0];
  if (!first) return null;
  const alwaysHave = new Set(['water', 'salt', 'black pepper ground']);
  const missing = (first.c.missing || []).filter((i) => !alwaysHave.has(normaliseName(i.name)));
  return { ...first, missing };
}

/** "You'd need lemon and crème fraîche." */
export function describeMissing(missing = []) {
  const names = missing.map((i) => shortName(i.name)).filter(Boolean);
  if (!names.length) return 'You have everything for this.';
  if (names.length === 1) return `You would need ${names[0]}.`;
  const last = names.pop();
  return `You would need ${names.join(', ')} and ${last}.`;
}

/**
 * Keys of meals cooked (planned on a day before today) in the last 14 days.
 * @param {Array} entries plan rows with week_start and day_of_week
 */
export function recentKeysFrom(entries = [], todayIso) {
  const from = addDays(todayIso, -VARIETY_DAYS);
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const keys = new Set();
  for (const e of entries) {
    const i = order.indexOf(e.day_of_week);
    if (i < 0 || !e.week_start) continue;
    const date = addDays(e.week_start, i);
    if (date >= from && date < todayIso) for (const k of entryKeys(e)) keys.add(k);
  }
  return keys;
}

export { householdDiet };
