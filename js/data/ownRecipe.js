// js/data/ownRecipe.js — 03 Oct 2026 v3
// v3: draftToRecipe carries course, tip, swaps and step notes, so a recipe
// kept on the phone (data/localRecipes.js) shows in full.
// v2: a recipe has a course (starter, main, pudding), stored once migration
// 026 adds meals.course; saving works the same before it.
// Kitchen rebuild. "Make my own recipe": the whole recipe written in one
// place, then saved as one of your meals.
//
// ---- Why a draft ----
// The old way was a name, a serving count and a kind of meal, then into the
// meal's sheet to add ingredients one at a time and steps one at a time,
// each a round trip to the database. Writing a recipe that way felt like
// filling in a form about a recipe. Here the recipe is a plain object (a
// "draft") in the same shape as a library recipe until you press Save, so
// the page can show its nutrition and what you have WHILE you write it,
// and nothing half-written ever reaches the database.
//
// ---- Saving an edit without losing anything ----
// New ingredient and step rows are written first, and the old rows are
// removed only once every new one is in. If the connection drops halfway,
// the meal has its old rows plus some new ones: untidy, never empty.
// Nothing references a meal_ingredients or meal_steps row by id
// (schema.md), so replacing them loses nothing.
//
// ---- Swaps ----
// A swap is an alternative ingredient: "use tofu instead of chicken". It is
// stored the way the meal sheet has always stored alternatives: the main
// ingredient and its swaps share an option_group, and only the chosen one
// (is_selected) reaches the shopping list and the nutrition.

import { supabase } from '../supabaseClient.js';
import { referencePatch } from './foodReference.js';
import { toStorage, ENTRY_UNITS } from '../lib/units.js';
import { COURSES, isMissingColumnError } from './courses.js';

let courseColumn = null; // meals.course: null = not known yet (migration 026)

export const DIET_TAGS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten free' },
  { value: 'dairy_free', label: 'Dairy free' }
];

export const KINDS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' }
];

export const MAX_NOTE = 200;
export const MAX_STEP = 300;

let keySeq = 0;
/** A key for a row while it is being edited. Never stored. */
function nextKey() { keySeq += 1; return `k${keySeq}`; }

export function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function emptyDraft() {
  return {
    mealId: null,
    name: '',
    kind: 'dinner',
    course: 'main',
    serves: 4,
    tags: [],
    note: '',
    ingredients: [newIngredient()],
    steps: [newStep()]
  };
}

export function newIngredient(partial = {}) {
  return { key: nextKey(), name: '', quantity: '', unit: 'g', swaps: [], ...partial };
}

export function newSwap(partial = {}) {
  return { key: nextKey(), name: '', quantity: '', unit: 'g', label: '', ...partial };
}

export function newStep(partial = {}) {
  return { key: nextKey(), instruction: '', minutes: '', ...partial };
}

// ---- Reading pasted text ------------------------------------------------

const UNIT_WORDS = [
  [/^(g|gr|gram|grams|gramme|grammes)$/i, 'g', 1],
  [/^(kg|kilo|kilos|kilogram|kilograms)$/i, 'g', 1000],
  [/^(ml|millilitre|millilitres|milliliter|milliliters)$/i, 'ml', 1],
  [/^(l|litre|litres|liter|liters)$/i, 'ml', 1000],
  [/^(tsp|teaspoon|teaspoons)$/i, 'tsp', 1],
  [/^(tbsp|tbs|tablespoon|tablespoons)$/i, 'tbsp', 1]
];

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function readNumber(text) {
  const t = String(text).trim();
  if (FRACTIONS[t] !== undefined) return FRACTIONS[t];
  const mixed = t.match(/^(\d+)\s*([½¼¾⅓⅔])$/);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]];
  const slash = t.match(/^(\d+)\/(\d+)$/);
  if (slash && Number(slash[2]) > 0) return Number(slash[1]) / Number(slash[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * One line of a pasted ingredient list, as a cook writes it.
 *   "200g rice"            → 200 g rice
 *   "2 tbsp olive oil"     → 2 tbsp olive oil
 *   "1.5 kg potatoes"      → 1500 g potatoes
 *   "3 eggs"               → 3 item eggs
 *   "- a pinch of salt"    → salt, no amount
 * Bullets and numbering at the start are dropped. Never throws.
 */
export function parseIngredientLine(line) {
  let text = String(line || '').replace(/^\s*([-*•·]|\d+[.)])\s+/, '').trim();
  if (!text) return null;
  const m = text.match(/^((?:\d+(?:\.\d+)?)?\s*[½¼¾⅓⅔]|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\.?\s+(?:of\s+)?(.+)$/);
  if (!m) {
    const pinch = text.replace(/^(a\s+)?(pinch|handful|dash|splash|few)\s+(of\s+)?/i, '');
    return { quantity: '', unit: 'item', name: pinch };
  }
  const qty = readNumber(m[1].replace(/\s+/g, ''));
  const word = m[2] || '';
  for (const [pattern, unit, factor] of UNIT_WORDS) {
    if (pattern.test(word)) {
      return { quantity: qty === null ? '' : Math.round(qty * factor * 100) / 100, unit, name: m[3].trim() };
    }
  }
  // No unit word: "3 eggs", or "2 large onions" where the word is part of the name.
  const name = `${word ? `${word} ` : ''}${m[3]}`.trim();
  return { quantity: qty === null ? '' : qty, unit: 'item', name };
}

/** A pasted method: one step per line, bullets and numbers dropped. */
export function parseMethod(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*([-*•·]|(step\s*)?\d+[.):]?)\s*/i, '').trim())
    .filter(Boolean)
    .map((instruction) => newStep({ instruction: instruction.slice(0, MAX_STEP) }));
}

/**
 * Advisory only, never blocking, and never a telling-off: a long step is
 * a suggestion that it might read better as two.
 */
export function stepHint(instruction) {
  const words = String(instruction || '').trim().split(/\s+/).filter(Boolean).length;
  if (words > 20) return 'This step is quite long. It may be easier to follow as two.';
  return '';
}

// ---- Names to nutrition -------------------------------------------------

/**
 * One lookup for every name the picker knows: reference foods (names and
 * aliases) and your own foods. Your own come second and win, because a
 * figure read off your actual packet beats a published average.
 *
 * @returns {{ byName: Map<string, {key, entry, foodId?, ref?}>, names: string[] }}
 */
export function buildNameIndex(referenceFoods = [], ownFoods = []) {
  const byName = new Map();
  const names = new Set();
  for (const food of referenceFoods) {
    if (!food || !food.slug || !food.name) continue;
    const hit = { key: food.slug, ref: food.slug, entry: food };
    byName.set(normalise(food.name), hit);
    names.add(food.name);
    for (const alias of food.aliases || []) {
      const k = normalise(alias);
      if (!byName.has(k)) byName.set(k, hit);
    }
  }
  for (const food of ownFoods) {
    if (!food || !food.name) continue;
    const k = normalise(food.name);
    const existing = byName.get(k);
    const hasFigures = food.calories_per_100g !== null && food.calories_per_100g !== undefined;
    // Your own food with no figures yet should not hide the reference's.
    if (existing && !hasFigures) { byName.set(k, { ...existing, foodId: food.id }); continue; }
    byName.set(k, { key: `food-${food.id}`, foodId: food.id, entry: food, ref: existing ? existing.ref : undefined });
    names.add(food.name);
  }
  return { byName, names: [...names].sort((a, b) => a.localeCompare(b)) };
}

export function resolveName(name, index) {
  if (!index || !index.byName) return null;
  return index.byName.get(normalise(name)) || null;
}

function quantityFor(row) {
  const stored = toStorage(row.quantity, row.unit);
  return stored && stored.value > 0 ? stored : null;
}

/**
 * The draft as a library-shaped recipe, for the live preview: nutrition
 * (recipeNutrition) and what you have (coverage) take this directly.
 * Swaps are left out: the preview is the recipe as written.
 */
export function draftToRecipe(draft, index) {
  const refMap = new Map();
  const ingredients = [];
  for (const row of draft.ingredients || []) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const hit = resolveName(name, index);
    const key = hit ? hit.key : `new-${normalise(name).replace(/\s/g, '-')}`;
    refMap.set(key, hit ? hit.entry : { name });
    const stored = quantityFor(row);
    ingredients.push({ ref: key, name, quantity: stored ? stored.value : 0, unit: stored ? stored.unit : 'item' });
  }
  const recipe = {
    slug: null,
    name: String(draft.name || '').trim() || 'Your recipe',
    default_serves: Number(draft.serves) > 0 ? Number(draft.serves) : 1,
    default_slot: draft.kind || null,
    dietary_tags: draft.tags || [],
    course: draft.course || null,
    method_note: String(draft.note || '').trim() || null,
    ingredients,
    // Swaps you wrote, then any carried over from a library recipe this
    // was copied from (those are text, not rows).
    swaps: [
      ...(draft.ingredients || []).flatMap((row) => (row.swaps || [])
        .filter((sw) => String(sw.name || '').trim() && String(row.name || '').trim())
        .map((sw) => ({ instead: String(row.name).trim(), text: swapLabel(sw) || String(sw.name).trim() }))),
      ...(Array.isArray(draft.librarySwaps) ? draft.librarySwaps : [])
    ],
    steps: (draft.steps || []).filter((s) => String(s.instruction || '').trim())
      .map((s) => ({ instruction: s.instruction.trim(), duration_min: Number(s.minutes) || null, note: s.note || null }))
  };
  return { recipe, refMap };
}

/**
 * Ingredients whose nutrition cannot be worked out, by name. One with no
 * amount ("salt") is not counted and not listed: there is nothing to count.
 */
export function unknownNutrition(draft, index) {
  const out = [];
  for (const row of draft.ingredients || []) {
    const name = String(row.name || '').trim();
    const stored = quantityFor(row);
    if (!name || !stored) continue;
    const hit = resolveName(name, index);
    const entry = hit && hit.entry;
    const known = entry && entry.calories_per_100g !== null && entry.calories_per_100g !== undefined;
    if (!known
      || (stored.unit === 'item' && !(Number(entry.grams_per_item) > 0))
      || (stored.unit === 'ml' && !(Number(entry.grams_per_ml) > 0))) out.push(name);
  }
  return out;
}

/** The recipe as nutrition sees it: only ingredients with an amount. */
export function measuredOnly(recipe) {
  return { ...recipe, ingredients: (recipe.ingredients || []).filter((i) => Number(i.quantity) > 0) };
}

// ---- Checking before saving -----------------------------------------------

/**
 * @returns {Array<{ field: string, message: string }>} empty when it can be saved.
 *   `field` is the id of the input to focus, so the summary can link to it.
 */
export function validateDraft(draft) {
  const problems = [];
  if (!String(draft.name || '').trim()) problems.push({ field: 'own-name', message: 'Give the recipe a name.' });
  const serves = Number(draft.serves);
  if (!Number.isInteger(serves) || serves < 1 || serves > 50) {
    problems.push({ field: 'own-serves', message: 'Serves needs to be a whole number from 1 to 50.' });
  }
  const named = (draft.ingredients || []).filter((r) => String(r.name || '').trim());
  if (named.length === 0) problems.push({ field: 'own-ing-name-0', message: 'Add at least one ingredient.' });
  (draft.ingredients || []).forEach((row, i) => {
    if (!String(row.name || '').trim()) return;
    if (row.quantity !== '' && row.quantity !== null && !(Number(row.quantity) > 0)) {
      problems.push({ field: `own-ing-qty-${i}`, message: `${row.name}: the amount needs to be a number above 0, or left blank.` });
    }
    (row.swaps || []).forEach((swap, j) => {
      if (String(swap.name || '').trim() && swap.quantity !== '' && swap.quantity !== null && !(Number(swap.quantity) > 0)) {
        problems.push({ field: `own-swap-qty-${i}-${j}`, message: `${swap.name}: the amount needs to be a number above 0, or left blank.` });
      }
    });
  });
  (draft.steps || []).forEach((step, i) => {
    if (String(step.instruction || '').trim().length > MAX_STEP) {
      problems.push({ field: `own-step-${i}`, message: `Step ${i + 1} is over ${MAX_STEP} characters. Split it into two.` });
    }
    const minutes = step.minutes;
    if (minutes !== '' && minutes !== null && minutes !== undefined) {
      const n = Number(minutes);
      if (!Number.isFinite(n) || n < 1 || n > 1440) {
        problems.push({ field: `own-step-min-${i}`, message: `Step ${i + 1}: a timer is between 1 and 1440 minutes, or left blank.` });
      }
    }
  });
  if (String(draft.note || '').length > MAX_NOTE) {
    problems.push({ field: 'own-note', message: `The tip is over ${MAX_NOTE} characters.` });
  }
  return problems;
}

// ---- To rows and back -----------------------------------------------------

/**
 * The ingredient rows to write, in order. Pure, so it can be tested
 * without a database. `foodName` is resolved to a food id when saving.
 */
export function ingredientSpecs(draft) {
  const specs = [];
  for (const row of draft.ingredients || []) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const swaps = (row.swaps || []).filter((s) => String(s.name || '').trim());
    // option_group is 1–40 characters (schema.md).
    const group = swaps.length ? name.slice(0, 40) : null;
    const stored = quantityFor(row);
    specs.push({
      foodName: name,
      quantity_g: stored ? stored.value : null,
      unit: stored ? stored.unit : (row.unit === 'tsp' || row.unit === 'tbsp' ? 'ml' : row.unit || 'g'),
      option_group: group,
      option_label: null,
      is_selected: true
    });
    for (const swap of swaps) {
      const s = quantityFor(swap);
      specs.push({
        foodName: String(swap.name).trim(),
        quantity_g: s ? s.value : (stored ? stored.value : null),
        unit: s ? s.unit : (stored ? stored.unit : 'g'),
        option_group: group,
        option_label: swapLabel(swap),
        is_selected: false
      });
    }
  }
  return specs;
}

/**
 * option_label REPLACES the food name on screen (meals.optionLabel), so a
 * swap's reason travels with its name: "Tofu, to make it vegan". 1–60
 * characters (schema.md).
 */
export function swapLabel(swap) {
  const name = String(swap.name || '').trim();
  const why = String(swap.label || '').trim();
  return why ? `${name}, ${why}`.slice(0, 60) : null;
}

/** The reverse of swapLabel, for editing. */
export function splitSwapLabel(label, foodName) {
  const text = String(label || '');
  const name = String(foodName || '');
  if (!text) return '';
  if (name && text.toLowerCase().startsWith(`${name.toLowerCase()}, `)) return text.slice(name.length + 2);
  return text === name ? '' : text;
}

export function stepSpecs(draft) {
  return (draft.steps || [])
    .map((s) => ({ instruction: String(s.instruction || '').trim(), minutes: s.minutes }))
    .filter((s) => s.instruction)
    .map((s, i) => ({
      step_number: i + 1,
      instruction: s.instruction.slice(0, MAX_STEP),
      duration_min: Number(s.minutes) >= 1 ? Math.min(1440, Math.round(Number(s.minutes))) : null
    }));
}

/** Stored ml back to spoons where that is how it was written (exact multiples). */
export function forEditing(quantity, unit) {
  const q = Number(quantity);
  if (!(q > 0)) return { quantity: '', unit: unit || 'g' };
  if (unit === 'ml' && q < 60) {
    if (q % 15 === 0) return { quantity: q / 15, unit: 'tbsp' };
    if (q % 5 === 0) return { quantity: q / 5, unit: 'tsp' };
  }
  return { quantity: q, unit: unit || 'g' };
}

/** One of your meals, back into a draft for editing. */
export function draftFromMeal(meal, ingredientRows = [], stepRows = []) {
  const ingredients = [];
  const groups = new Map();
  for (const row of ingredientRows) {
    const name = (row.foods && row.foods.name) || '';
    const amount = forEditing(row.quantity_g, row.unit);
    if (row.option_group == null) {
      ingredients.push(newIngredient({ name, ...amount }));
      continue;
    }
    if (!groups.has(row.option_group)) {
      const main = newIngredient({ name: '', quantity: '', unit: 'g' });
      groups.set(row.option_group, main);
      ingredients.push(main);
    }
    const main = groups.get(row.option_group);
    if (row.is_selected !== false && !main.name) Object.assign(main, { name, ...amount });
    else main.swaps.push(newSwap({ name, ...amount, label: splitSwapLabel(row.option_label, name) }));
  }
  // A group where nothing was chosen: the first swap becomes the main one.
  for (const main of groups.values()) {
    if (!main.name && main.swaps.length) {
      const first = main.swaps.shift();
      Object.assign(main, { name: first.name, quantity: first.quantity, unit: first.unit });
    }
  }
  const steps = [...stepRows]
    .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
    .map((s) => newStep({ instruction: s.instruction || '', minutes: s.duration_min || '' }));
  const kind = meal.meal_type || meal.default_slot || 'dinner';
  return {
    mealId: meal.id,
    name: meal.name || '',
    kind,
    course: meal.course || 'main',
    serves: meal.default_serves || 4,
    tags: [...(meal.dietary_tags || [])],
    note: meal.method_note || '',
    ingredients: ingredients.length ? ingredients : [newIngredient()],
    steps: steps.length ? steps : [newStep()]
  };
}

// ---- Saving ---------------------------------------------------------------

async function foodFor(name, index, foodsByName) {
  const hit = resolveName(name, index);
  if (hit && hit.foodId) return { ok: true, id: hit.foodId };
  const existing = foodsByName.get(normalise(name)) || (hit && hit.entry && foodsByName.get(normalise(hit.entry.name)));
  if (existing) return { ok: true, id: existing.id };

  const entry = hit && hit.ref ? hit.entry : null;
  const patch = entry ? referencePatch(entry, {}) : {};
  const { data, error } = await supabase.from('foods').insert({
    name: entry ? entry.name : name,
    category: (entry && entry.category) || 'food_ambient',
    source: patch.source || 'manual',
    calories_per_100g: patch.calories_per_100g ?? null,
    protein_g: patch.protein_g ?? null,
    fat_g: patch.fat_g ?? null,
    carbs_g: patch.carbs_g ?? null,
    grams_per_ml: patch.grams_per_ml ?? null,
    grams_per_item: patch.grams_per_item ?? null,
    item_label: patch.item_label ?? null
  }).select().single();
  if (error) return { ok: false, error };
  foodsByName.set(normalise(data.name), data);
  foodsByName.set(normalise(name), data);
  return { ok: true, id: data.id };
}

/**
 * Writes the draft as one of your meals: a new one, or the one it was
 * opened from. Needs a connection — a meal must have a real id before its
 * ingredients can point at it.
 *
 * @returns {{ ok: true, data: { id, name } } | { ok: false, error }}
 */
export async function saveDraft(draft, index) {
  const problems = validateDraft(draft);
  if (problems.length) return { ok: false, error: new Error(problems[0].message), problems };

  const kind = KINDS.some((k) => k.value === draft.kind) ? draft.kind : null;
  const mealFields = {
    name: String(draft.name).trim(),
    default_serves: Number(draft.serves),
    meal_type: kind,
    // default_slot cannot be 'drink' until migration 026.
    default_slot: kind === 'drink' ? null : kind,
    dietary_tags: (draft.tags || []).filter((t) => DIET_TAGS.some((d) => d.value === t)),
    method_note: String(draft.note || '').trim().slice(0, MAX_NOTE) || null
  };

  let mealId = draft.mealId;
  const course = COURSES.some((c) => c.value === draft.course) ? draft.course : 'main';
  // meals.course arrives with migration 026. Sent while it may not exist,
  // and the write repeated without it if the database says so.
  const writeMeal = (withCourse) => {
    const table = supabase.from('meals');
    if (mealId) {
      return (withCourse
        ? table.update({
          name: mealFields.name, default_serves: mealFields.default_serves, meal_type: mealFields.meal_type,
          default_slot: mealFields.default_slot, dietary_tags: mealFields.dietary_tags,
          method_note: mealFields.method_note, course
        })
        : table.update({
          name: mealFields.name, default_serves: mealFields.default_serves, meal_type: mealFields.meal_type,
          default_slot: mealFields.default_slot, dietary_tags: mealFields.dietary_tags,
          method_note: mealFields.method_note
        })).eq('id', mealId).select().single();
    }
    return (withCourse
      ? table.insert({
        name: mealFields.name, default_serves: mealFields.default_serves, meal_type: mealFields.meal_type,
        default_slot: mealFields.default_slot, dietary_tags: mealFields.dietary_tags,
        method_note: mealFields.method_note, course
      })
      : table.insert({
        name: mealFields.name, default_serves: mealFields.default_serves, meal_type: mealFields.meal_type,
        default_slot: mealFields.default_slot, dietary_tags: mealFields.dietary_tags,
        method_note: mealFields.method_note
      })).select().single();
  };
  let written = await writeMeal(courseColumn !== false);
  let courseSaved = courseColumn !== false && !written.error;
  if (written.error && courseColumn !== false && isMissingColumnError(written.error, 'course')) {
    courseColumn = false;
    written = await writeMeal(false);
    courseSaved = false;
  } else if (!written.error && courseColumn === null) {
    courseColumn = true;
  }
  if (written.error) return { ok: false, error: written.error };
  const mealRow = written.data;
  mealId = mealRow.id;

  // Old rows, so they can go once the new ones are safely in.
  const [oldIngredients, oldSteps] = draft.mealId
    ? await Promise.all([
      supabase.from('meal_ingredients').select('id').eq('meal_id', mealId),
      supabase.from('meal_steps').select('id').eq('meal_id', mealId)
    ])
    : [{ data: [] }, { data: [] }];
  if (oldIngredients.error) return { ok: false, error: oldIngredients.error };
  if (oldSteps.error) return { ok: false, error: oldSteps.error };

  const foodList = await supabase.from('foods').select('*');
  if (foodList.error) return { ok: false, error: foodList.error };
  const foodsByName = new Map((foodList.data || []).map((f) => [normalise(f.name), f]));

  const rows = [];
  for (const spec of ingredientSpecs(draft)) {
    const food = await foodFor(spec.foodName, index, foodsByName);
    if (!food.ok) return { ok: false, error: food.error };
    const { foodName, ...rest } = spec;
    // quantity_g is not nullable for every household's data; an unmeasured
    // ingredient ("salt") is stored as 1 item, which is what it means.
    rows.push({ meal_id: mealId, food_id: food.id, ...rest,
      quantity_g: rest.quantity_g === null ? 1 : rest.quantity_g,
      unit: rest.quantity_g === null ? 'item' : rest.unit });
  }
  if (rows.length) {
    const written = await supabase.from('meal_ingredients').insert(rows);
    if (written.error) return { ok: false, error: written.error };
  }
  const steps = stepSpecs(draft).map((s) => ({ meal_id: mealId, ...s }));
  if (steps.length) {
    const written = await supabase.from('meal_steps').insert(steps);
    if (written.error) return { ok: false, error: written.error };
  }

  const oldIngIds = (oldIngredients.data || []).map((r) => r.id);
  const oldStepIds = (oldSteps.data || []).map((r) => r.id);
  if (oldIngIds.length) {
    const gone = await supabase.from('meal_ingredients').delete().in('id', oldIngIds);
    if (gone.error) return { ok: false, error: gone.error };
  }
  if (oldStepIds.length) {
    const gone = await supabase.from('meal_steps').delete().in('id', oldStepIds);
    if (gone.error) return { ok: false, error: gone.error };
  }
  return { ok: true, data: { id: mealId, name: mealRow.name }, courseSaved };
}

export { ENTRY_UNITS };
