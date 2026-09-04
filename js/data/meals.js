// js/data/meals.js — 01 Sep 2026 v7
// v3: meal_type and is_favourite (schema revision 5). meal_type is
// normalised here rather than sent raw — a CHECK violation surfaces as an
// opaque database error and tells the user nothing.
// v2 (schema revision 4): ingredients carry a UNIT. quantity_g is a
// historical column name — read `unit` before using it.
// All Supabase access for `meals` and `meal_ingredients`, plus the macro
// maths. Shared data-access contract: { ok, data|error }, error always
// checked, nothing thrown at views, no user_id on inserts.
//
// ---- Macros are computed, never stored ----
// foods stores macros per 100 g; meal_ingredients.quantity_g is grams, so a
// meal's total is sum(quantity_g / 100 * per_100g_value).
//
// There is no column for a total and one must not be added: the schema is
// frozen, and a stored total silently rots the moment an ingredient's
// quantity or a food's nutrition data changes. computeMacros() runs on
// every read. It is a pure function of its arguments, which is what makes
// it testable against a hand calculation.
//
// ---- Units, and why a missing conversion is incomplete ----
// Nutrition is stored per 100 GRAMS, but an ingredient may be measured in
// millilitres or items. Converting needs foods.grams_per_ml or
// foods.grams_per_item, both nullable.
//
// When the factor is missing the ingredient contributes NOTHING and is
// counted as incomplete — the same treatment as a missing macro, not a
// second failure mode. Nothing is guessed: 1 ml of water is 1 g, oil is
// about 0.9, flour is neither, and a plausible wrong total is worse than an
// admitted gap.
//
// A null macro is INCOMPLETE, NOT ZERO. A food added by hand with no
// nutrition data must not quietly drag a meal's protein total down to a
// confidently wrong number. Every result carries how many ingredients
// contributed nothing, so the view can say "2 of 5 ingredients have no
// nutrition data" instead of reporting a figure it cannot stand behind.
//
// ---- Offline ----
// Meal writes are NOT queued, unlike foods. A meal insert must return a real
// id before its ingredients can reference it, and a queued insert has no id
// — the rows would be orphaned. Building a meal is a kitchen-table action
// anyway, so the view says so plainly when offline rather than pretending
// (build conventions §9: "may require connectivity — if offline, say so
// clearly in the UI; never fail silently").

import { supabase } from '../supabaseClient.js';

const MEALS = 'meals';
const INGREDIENTS = 'meal_ingredients';

/** Units an ingredient can be measured in. Matches the CHECK constraint. */
export const INGREDIENT_UNITS = [
  { value: 'g', label: 'grams (g)', short: 'g' },
  { value: 'ml', label: 'millilitres (ml)', short: 'ml' },
  { value: 'item', label: 'items', short: 'item' }
];

const UNIT_VALUES = INGREDIENT_UNITS.map((u) => u.value);

export function isValidUnit(value) {
  return UNIT_VALUES.includes(value);
}

/**
 * Converts an ingredient quantity to grams so it can meet per-100 g macros.
 *
 * @returns {{ grams: number } | { grams: null, reason: string }}
 *   `reason` is user-facing text explaining what is missing, so the view
 *   never has to reconstruct why a figure could not be worked out.
 */
export function toGrams(quantity, unit, food = {}) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { grams: null, reason: 'the quantity is not a usable number' };
  }
  if (unit === 'g' || unit === undefined || unit === null) return { grams: qty };

  if (unit === 'ml') {
    const factor = Number(food.grams_per_ml);
    if (!Number.isFinite(factor) || factor <= 0) {
      return { grams: null, reason: 'no weight per millilitre is recorded for it' };
    }
    return { grams: qty * factor };
  }
  if (unit === 'item') {
    const factor = Number(food.grams_per_item);
    if (!Number.isFinite(factor) || factor <= 0) {
      return { grams: null, reason: 'no weight per item is recorded for it' };
    }
    return { grams: qty * factor };
  }
  return { grams: null, reason: `"${unit}" is not a unit this app understands` };
}

/** "250 g" / "500 ml" / "2 items" — the unit is always present in the text. */
export function formatIngredientQuantity(quantity, unit) {
  const qty = Math.round(Number(quantity) * 100) / 100;
  if (unit === 'item') return `${qty} item${qty === 1 ? '' : 's'}`;
  return `${qty} ${unit || 'g'}`;
}

/** Our four macro fields, mapped from the foods column to the total's key. */
const MACROS = [
  { column: 'calories_per_100g', key: 'calories', label: 'Calories', unit: 'kcal' },
  { column: 'protein_g', key: 'protein_g', label: 'Protein', unit: 'g' },
  { column: 'fat_g', key: 'fat_g', label: 'Fat', unit: 'g' },
  { column: 'carbs_g', key: 'carbs_g', label: 'Carbohydrate', unit: 'g' }
];

export { MACROS };

export async function listMeals() {
  const { data, error } = await supabase
    .from(MEALS)
    .select('*')
    .order('name', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Ingredients with their food embedded. Pass a mealId for one meal, or
 * omit it for every meal at once.
 *
 * The no-argument form exists so a screen showing N meals costs ONE query
 * rather than N+1 — group the result with groupByMeal(). PostgREST resolves
 * the embed through the foreign key; RLS applies to both tables
 * independently, so this returns only the user's own rows either way.
 */
export async function listIngredients(mealId) {
  let query = supabase
    .from(INGREDIENTS)
    .select('id, meal_id, food_id, quantity_g, unit, option_group, is_selected, option_label, foods(id, name, barcode, calories_per_100g, protein_g, fat_g, carbs_g, grams_per_ml, grams_per_item, item_label, source)')
    .order('created_at', { ascending: true });
  if (mealId) query = query.eq('meal_id', mealId);
  const { data, error } = await query;
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** Ingredient rows keyed by meal_id. */
export function groupByMeal(ingredients) {
  const map = new Map();
  for (const row of ingredients || []) {
    if (!map.has(row.meal_id)) map.set(row.meal_id, []);
    map.get(row.meal_id).push(row);
  }
  return map;
}

/**
 * What a recipe IS, distinct from weekly_meal_plan.slot, which is where it
 * sits in one week. Porridge is a breakfast whether or not it is planned
 * for Tuesday, and eating it at 9pm does not reclassify it.
 *
 * `drink` has no matching plan slot — the slot CHECK is unchanged — so a
 * drink can be classified and found without being plannable yet.
 */
export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' }
];

const MEAL_TYPE_VALUES = MEAL_TYPES.map((t) => t.value);

export function isValidMealType(value) {
  return MEAL_TYPE_VALUES.includes(value);
}

/** "Not said yet" is a real state and reads as such, never as an error. */
export function mealTypeLabel(value) {
  const found = MEAL_TYPES.find((t) => t.value === value);
  return found ? found.label : 'Unclassified';
}

/**
 * Normalises meal_type for a write.
 *
 * A value the CHECK constraint would reject is refused HERE rather than
 * sent: a constraint violation surfaces as an opaque database error, and
 * the user gets told nothing useful. Defensive normalisation on enum
 * columns is a standing rule after the Phase 6 category defect.
 */
function normaliseMealType(value) {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  if (!isValidMealType(value)) {
    return { ok: false, error: new Error(`"${value}" is not a kind of meal this app knows.`) };
  }
  return { ok: true, value };
}

export async function createMeal({ name, default_serves = 4, meal_type = null, is_favourite = false }) {
  const title = String(name || '').trim();
  if (!title) return { ok: false, error: new Error('A meal needs a name.') };
  const serves = Number(default_serves);
  if (!Number.isInteger(serves) || serves < 1) {
    return { ok: false, error: new Error('Servings must be a whole number, 1 or more.') };
  }
  const type = normaliseMealType(meal_type);
  if (!type.ok) return { ok: false, error: type.error };
  const { data, error } = await supabase
    .from(MEALS)
    .insert({
      name: title,
      default_serves: serves,
      meal_type: type.value,
      is_favourite: !!is_favourite
    })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateMeal(mealId, { name, default_serves, meal_type, is_favourite, method_note } = {}) {
  const patch = {};
  if (name !== undefined) {
    const title = String(name).trim();
    if (!title) return { ok: false, error: new Error('A meal needs a name.') };
    patch.name = title;
  }
  if (default_serves !== undefined) {
    const serves = Number(default_serves);
    if (!Number.isInteger(serves) || serves < 1) {
      return { ok: false, error: new Error('Servings must be a whole number, 1 or more.') };
    }
    patch.default_serves = serves;
  }
  if (method_note !== undefined) {
    // Worklist C9. A destructured signature silently DISCARDS anything it
    // does not name, so the editor would have looked like it saved and
    // changed nothing. Trimmed to null rather than '': an empty string is
    // a note that exists and is blank.
    const note = String(method_note || '').trim().slice(0, 200);
    patch.method_note = note || null;
  }
  if (meal_type !== undefined) {
    const type = normaliseMealType(meal_type);
    if (!type.ok) return { ok: false, error: type.error };
    patch.meal_type = type.value;
  }
  if (is_favourite !== undefined) patch.is_favourite = !!is_favourite;
  const { data, error } = await supabase
    .from(MEALS)
    .update(patch)
    .eq('id', mealId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Favourite or un-favourite, on its own so a star tap is one small write
 * rather than a full update carrying every other field back to the server.
 */
export async function setFavourite(mealId, isFavourite) {
  const { data, error } = await supabase
    .from(MEALS)
    .update({ is_favourite: !!isFavourite })
    .eq('id', mealId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Dependent count for the restrict-delete confirm (schema.md §2).
 * weekly_meal_plan.meal_id is ON DELETE RESTRICT, so the database will
 * refuse this delete — the count has to be reported before the attempt.
 */
export async function countPlanEntries(mealId) {
  const { count, error } = await supabase
    .from('weekly_meal_plan')
    .select('id', { count: 'exact', head: true })
    .eq('meal_id', mealId);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

export async function deleteMeal(mealId) {
  // meal_ingredients cascade with the meal (schema.md §2), so they go too —
  // the view names that in the confirm rather than deleting them silently.
  const { error } = await supabase.from(MEALS).delete().eq('id', mealId);
  if (error) return { ok: false, error };
  return { ok: true };
}

export async function countIngredients(mealId) {
  const { count, error } = await supabase
    .from(INGREDIENTS)
    .select('id', { count: 'exact', head: true })
    .eq('meal_id', mealId);
  if (error) return { ok: false, error };
  return { ok: true, data: count ?? 0 };
}

export async function addIngredient({ meal_id, food_id, quantity_g, unit = 'g' }) {
  const qty = Number(quantity_g);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: new Error('Enter a quantity greater than zero.') };
  }
  if (!isValidUnit(unit)) {
    return { ok: false, error: new Error(`"${unit}" is not a unit this app understands.`) };
  }
  if (!meal_id || !food_id) {
    return { ok: false, error: new Error('Pick a meal and a food first.') };
  }
  const { data, error } = await supabase
    .from(INGREDIENTS)
    .insert({ meal_id, food_id, quantity_g: Math.round(qty * 100) / 100, unit })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateIngredient(ingredientId, { quantity_g, unit, option_label } = {}) {
  const patch = {};
  if (quantity_g !== undefined) {
    const qty = Number(quantity_g);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: new Error('Enter a quantity greater than zero.') };
    }
    patch.quantity_g = Math.round(qty * 100) / 100;
  }
  if (option_label !== undefined) {
    // Worklist C3. Same trap as method_note — unnamed keys vanish.
    const label = String(option_label || '').trim().slice(0, 60);
    patch.option_label = label || null;
  }
  if (unit !== undefined) {
    if (!isValidUnit(unit)) {
      return { ok: false, error: new Error(`"${unit}" is not a unit this app understands.`) };
    }
    patch.unit = unit;
  }
  const { data, error } = await supabase
    .from(INGREDIENTS)
    .update(patch)
    .eq('id', ingredientId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removeIngredient(ingredientId) {
  const { error } = await supabase.from(INGREDIENTS).delete().eq('id', ingredientId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * Totals and per-serving figures for a set of ingredients.
 *
 * PURE — no network, no clock, no globals. Every argument is data and the
 * result depends on nothing else, so it can be checked against a hand
 * calculation, which is exactly what the Phase 6 smoke test asks for.
 *
 * @param {Array} ingredients rows from listIngredients(); each needs
 *        `quantity_g` and an embedded `foods` object (or `food`).
 * @param {{ serves?: number }} [opts] servings to divide by; defaults to 1.
 * @returns {{
 *   serves: number,
 *   ingredientCount: number,
 *   totals: Record<string, number>,
 *   perServing: Record<string, number>,
 *   complete: Record<string, boolean>,
 *   missingByField: Record<string, number>,
 *   incompleteCount: number,
 *   incompleteNames: string[],
 *   unconvertible: Array<{ name: string, unit: string, reason: string }>
 * }}
 */
export function computeMacros(ingredients, { serves = 1 } = {}) {
  const allRows = Array.isArray(ingredients) ? ingredients : [];
  const divisor = Number.isFinite(Number(serves)) && Number(serves) > 0 ? Number(serves) : 1;

  const totals = {};
  const missingByField = {};
  const complete = {};
  for (const macro of MACROS) {
    totals[macro.key] = 0;
    missingByField[macro.key] = 0;
    complete[macro.key] = true;
  }

  const incompleteNames = [];
  const incompleteFoods = [];
  // Phase 13: contributing ingredients whose figures are published averages
  // rather than measured. Counted, never hidden, and never excluded — a
  // refusal to count them would put us back where Phase 13 started.
  const estimatedNames = [];
  // Ingredients whose quantity could not be turned into grams at all, with
  // the reason, so the view can say what to fill in rather than just
  // reporting a gap.
  const unconvertible = [];

  // ---- Phase 19: selected options only ----
  // An unselected alternative contributes nothing AND is not counted as
  // incomplete. Those two ideas have to stay apart: an unselected option is
  // not missing data, it is a road not taken. Counting it as a gap would
  // fill the incomplete line with noise until people stopped reading it.
  const rows = allRows.filter((r) => r.option_group == null || r.is_selected !== false);

  for (const row of rows) {
    const food = row.foods || row.food || {};

    // Everything must reach grams before it can meet per-100 g macros.
    // A quantity in ml or items needs a conversion factor on the food; when
    // that is missing the ingredient contributes NOTHING and is counted as
    // incomplete, exactly like a missing macro. Never guessed.
    const converted = toGrams(row.quantity_g, row.unit, food);
    const usableGrams = converted.grams === null ? 0 : converted.grams;
    let rowMissing = false;

    if (converted.grams === null) {
      // One reason for the whole row: no macro can be worked out at all.
      for (const macro of MACROS) {
        missingByField[macro.key] += 1;
        complete[macro.key] = false;
      }
      incompleteNames.push(food.name || 'an unnamed food');
      unconvertible.push({
        name: food.name || 'an unnamed food',
        unit: row.unit || 'g',
        reason: converted.reason
      });
      continue;
    }

    for (const macro of MACROS) {
      const per100 = food[macro.column];
      // null / undefined / '' are all "no data". Zero is a real value:
      // water genuinely has zero protein and must not be treated as unknown.
      if (per100 === null || per100 === undefined || per100 === '') {
        missingByField[macro.key] += 1;
        complete[macro.key] = false;
        rowMissing = true;
        continue;
      }
      const value = Number(per100);
      if (!Number.isFinite(value)) {
        missingByField[macro.key] += 1;
        complete[macro.key] = false;
        rowMissing = true;
        continue;
      }
      totals[macro.key] += (usableGrams / 100) * value;
    }

    if (!rowMissing && food.source === 'reference') {
      estimatedNames.push(food.name || 'an unnamed food');
    }

    if (rowMissing) {
      incompleteNames.push(food.name || 'an unnamed food');
      // Phase 11: the id as well as the name. Naming a gap and then giving
      // no way to close it is how a helpful line becomes wallpaper.
      incompleteFoods.push({ id: food.id || null, name: food.name || 'an unnamed food' });
    }
  }

  const perServing = {};
  for (const macro of MACROS) {
    totals[macro.key] = Math.round(totals[macro.key] * 10) / 10;
    perServing[macro.key] = Math.round((totals[macro.key] / divisor) * 10) / 10;
  }

  return {
    serves: divisor,
    ingredientCount: rows.length,
    totals,
    perServing,
    complete,
    missingByField,
    incompleteCount: incompleteNames.length,
    incompleteNames,
    incompleteFoods,
    estimatedCount: estimatedNames.length,
    estimatedNames,
    unconvertible
  };
}


// ---- Phase 19: ingredient options -------------------------------------
// A "build your own lunch" and a "swap the tuna for hummus" are the same
// thing: a named slot with alternatives, one of them chosen. Built once.

/**
 * Groups a meal's ingredients into rows for display.
 *
 * A group renders as ONE row naming the selected option, not as five rows
 * of radio buttons — that turns a six-ingredient lunch into a wall of
 * thirty and buries the ingredients that are not choices.
 *
 * @returns {Array<{ kind: 'single', row } | { kind: 'group', name, options, selected }>}
 */
export function groupIngredientOptions(rows = []) {
  const out = [];
  const groups = new Map();

  for (const row of rows) {
    if (row.option_group == null) {
      out.push({ kind: 'single', row });
      continue;
    }
    if (!groups.has(row.option_group)) {
      const entry = { kind: 'group', name: row.option_group, options: [], selected: null };
      groups.set(row.option_group, entry);
      out.push(entry);
    }
    const entry = groups.get(row.option_group);
    entry.options.push(row);
    if (row.is_selected) entry.selected = row;
  }

  // A group whose selected row was deleted must not leave the recipe with
  // no base at all. Fall back to the first option rather than rendering an
  // empty slot the user cannot act on.
  for (const entry of groups.values()) {
    if (!entry.selected && entry.options.length > 0) entry.selected = entry.options[0];
  }

  return out;
}

/** What to call an option on screen. option_label wins; food name otherwise. */
export function optionLabel(row) {
  if (!row) return '';
  if (row.option_label) return row.option_label;
  const food = row.foods || row.food || {};
  return food.name || 'Unnamed';
}

/**
 * Selects one option within a group, deselecting its siblings.
 *
 * Deselect-then-select, in that order. The reverse would briefly have two
 * selected rows, which the shortfall diff would read as two things to buy.
 * There is no unique constraint precisely so this is safe — see the
 * migration for why a constraint here would be worse.
 */
export async function selectOption(mealId, optionGroup, chosenId) {
  const clear = await supabase
    .from(INGREDIENTS)
    .update({ is_selected: false })
    .eq('meal_id', mealId)
    .eq('option_group', optionGroup)
    .neq('id', chosenId);
  if (clear.error) return { ok: false, error: clear.error };

  const { data, error } = await supabase
    .from(INGREDIENTS)
    .update({ is_selected: true })
    .eq('id', chosenId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Turns an ordinary ingredient into a group, or adds to an existing one.
 *
 * One action from the ingredient row: "Add an alternative". No mode, no
 * separate screen. The existing row keeps its selection, so the recipe
 * never changes meaning just because you offered yourself a choice.
 */
export async function addAlternative(existingRow, alternative = {}) {
  const groupName = existingRow.option_group
    || String(alternative.option_group || '').trim()
    || optionLabel(existingRow);

  if (!existingRow.option_group) {
    const promote = await supabase
      .from(INGREDIENTS)
      .update({ option_group: groupName, is_selected: true })
      .eq('id', existingRow.id);
    if (promote.error) return { ok: false, error: promote.error };
  }

  const { data, error } = await supabase
    .from(INGREDIENTS)
    .insert({
      meal_id: existingRow.meal_id,
      food_id: alternative.food_id,
      quantity_g: alternative.quantity_g,
      unit: alternative.unit,
      option_group: groupName,
      option_label: alternative.option_label || null,
      is_selected: false
    })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * The ingredients that should reach the shopping list.
 *
 * Only selected options. Otherwise planning one build-your-own lunch adds
 * five things to your shop, four of which you decided against.
 */
export function shoppableIngredients(rows = []) {
  return rows.filter((r) => r.option_group == null || r.is_selected !== false);
}
