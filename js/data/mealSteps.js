// js/data/mealSteps.js — 01 Sep 2026 v1
// Phase 15. Instructions you can follow while tired, distracted, or holding
// something hot.
//
// Implements Docs/Current/RECIPE_STEP_STYLE.md, which is canonical. Read it
// before writing step content anywhere.
//
// ---- Why one row per step ----
// A blob of prose cannot be ticked off, cannot hold a timer, and cannot
// keep your place when the screen locks. That last one is the whole point:
// losing the recipe because you answered the door is exactly the failure
// this app exists to prevent.

import { supabase } from '../supabaseClient.js';
import { formatPackQuantity } from '../lib/units.js';

const TABLE = 'meal_steps';

/** Style guide rule 6. Advisory in the editor, never enforced on save. */
export const MAX_STEP_WORDS = 20;

/**
 * Rule 11: no-shame framing holds in the kitchen too. Every one of these is
 * a way of telling somebody that struggling is their fault.
 */
const BANNED_WORDS = ['simply', 'just', 'obviously', 'quickly', 'easy', 'easily', 'merely'];

export async function listSteps(mealId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('meal_id', mealId)
    .order('step_number', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data: data || [] };
}

/** All steps for several meals in one read, so a list view is one query. */
export async function listStepsForMeals(mealIds = []) {
  if (mealIds.length === 0) return { ok: true, data: new Map() };
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('meal_id', mealIds)
    .order('step_number', { ascending: true });
  if (error) return { ok: false, error };
  const byMeal = new Map();
  for (const row of data || []) {
    if (!byMeal.has(row.meal_id)) byMeal.set(row.meal_id, []);
    byMeal.get(row.meal_id).push(row);
  }
  return { ok: true, data: byMeal };
}

export async function addStep(input = {}) {
  const clean = validateStep(input);
  if (!clean.ok) return clean;

  const existing = await listSteps(input.meal_id);
  if (!existing.ok) return existing;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      meal_id: input.meal_id,
      step_number: existing.data.length + 1,
      ...clean.data
    })
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function updateStep(stepId, patch = {}) {
  const clean = validateStep(patch, { partial: true });
  if (!clean.ok) return clean;
  if (Object.keys(clean.data).length === 0) {
    return { ok: false, error: new Error('Nothing to change.') };
  }
  const { data, error } = await supabase
    .from(TABLE).update(clean.data).eq('id', stepId).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Deletes a step and renumbers the rest contiguously.
 *
 * Renumbering in code rather than by constraint is why step_number carries
 * no unique index — see the migration.
 */
export async function removeStep(stepId, mealId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', stepId);
  if (error) return { ok: false, error };
  return renumber(mealId);
}

/** Moves a step one place up or down. */
export async function moveStep(stepId, mealId, direction) {
  const current = await listSteps(mealId);
  if (!current.ok) return current;

  const steps = current.data;
  const index = steps.findIndex((s) => s.id === stepId);
  if (index < 0) return { ok: false, error: new Error('That step is not in this recipe.') };

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= steps.length) return { ok: true, data: steps };

  const reordered = [...steps];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return writeOrder(reordered);
}

async function renumber(mealId) {
  const current = await listSteps(mealId);
  if (!current.ok) return current;
  return writeOrder(current.data);
}

async function writeOrder(steps) {
  for (let i = 0; i < steps.length; i += 1) {
    const wanted = i + 1;
    if (steps[i].step_number === wanted) continue;
    const { error } = await supabase
      .from(TABLE).update({ step_number: wanted }).eq('id', steps[i].id);
    if (error) return { ok: false, error };
  }
  return { ok: true, data: steps.map((s, i) => ({ ...s, step_number: i + 1 })) };
}

function validateStep(input, { partial = false } = {}) {
  const out = {};

  if (input.instruction !== undefined || !partial) {
    const text = String(input.instruction || '').trim();
    if (!text) return { ok: false, error: new Error('A step needs an instruction.') };
    if (text.length > 300) {
      return { ok: false, error: new Error('That step is too long. Split it into two.') };
    }
    out.instruction = text;
  }
  if (input.note !== undefined) out.note = String(input.note || '').trim() || null;
  if (input.step_group !== undefined) {
    out.step_group = String(input.step_group || '').trim() || null;
  }
  if (input.while_waiting !== undefined) out.while_waiting = Boolean(input.while_waiting);
  if (input.duration_min !== undefined) {
    const raw = input.duration_min;
    if (raw === null || raw === '' || raw === undefined) {
      out.duration_min = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > 1440) {
        return { ok: false, error: new Error('A timer has to be between 1 minute and 24 hours.') };
      }
      out.duration_min = Math.round(n);
    }
  }
  return { ok: true, data: out };
}

// ---- Style checks -------------------------------------------------------
// Advisory only. They tell you which rule you are bending; they never block
// a save. A checker that refuses your sentence is a checker you turn off.

export function checkStyle(instruction) {
  const text = String(instruction || '');
  const issues = [];
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length > MAX_STEP_WORDS) {
    issues.push({ rule: 6, text: `${words.length} words. Twenty is the ceiling — this is probably two steps.` });
  }
  if (/\bmeanwhile\b/i.test(text)) {
    issues.push({ rule: 2, text: 'No "meanwhile". Make it its own step and tick "while waiting".' });
  }
  // Two verbs joined by "and" is two actions, and two actions is two steps.
  if (/\b(chop|fry|add|stir|heat|cook|boil|drain|mix|pour|slice|dice|season|simmer|bake|whisk|melt|tip)\b[^.]*\band\b[^.]*\b(chop|fry|add|stir|heat|cook|boil|drain|mix|pour|slice|dice|season|simmer|bake|whisk|melt|tip)\b/i.test(text)) {
    issues.push({ rule: 1, text: 'Two actions joined by "and". That is two steps.' });
  }
  const banned = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
  if (banned.length > 0) {
    issues.push({
      rule: 11,
      text: `"${banned[0]}" tells someone that struggling is their fault. Take it out.`
    });
  }
  return issues;
}

// ---- Ingredient tokens --------------------------------------------------
// Rule 3 says every step restates its quantity, so you never scroll back
// mid-cook. Doing that by hand breaks the moment a recipe is scaled, so the
// instruction carries {{ing:chopped-tomatoes}} and the renderer substitutes
// the real quantity at the real serving size.

export function slugifyFoodName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Replaces {{ing:slug}} with "400 g chopped tomatoes" / "1 tin chopped
 * tomatoes", scaled by `scale`.
 *
 * An unresolvable token renders as the plain food-ish name with NO
 * quantity, never as raw braces. A recipe showing {{ing:butter}} to someone
 * mid-cook is worse than one that just says "butter".
 */
export function resolveTokens(instruction, ingredients = [], scale = 1) {
  const index = new Map();
  for (const row of ingredients) {
    const food = row.foods || row.food || {};
    if (food.name) index.set(slugifyFoodName(food.name), { row, food });
  }

  return String(instruction || '').replace(/\{\{ing:([a-z0-9-]+)\}\}/gi, (_match, slug) => {
    const hit = index.get(String(slug).toLowerCase());
    if (!hit) return String(slug).replace(/-/g, ' ');
    const qty = Number(hit.row.quantity_g) * (Number(scale) || 1);
    const amount = formatPackQuantity(qty, hit.row.unit, hit.food);

    // When the unit is items and the food has a label, the label IS the
    // noun: "2 eggs" is already the whole phrase. Appending the food name
    // gives "2 eggs (116 g) egg, medium", which is how a step stops being
    // readable. The bracketed weight goes too — nobody needs the gram total
    // of two eggs while holding two eggs.
    if (hit.row.unit === 'item' && hit.food.item_label) {
      return formatPackQuantity(qty, 'item', { item_label: hit.food.item_label });
    }
    return `${amount} ${hit.food.name.toLowerCase()}`;
  });
}

/** Tokens in a step that match nothing in the meal, for the editor to flag. */
export function unresolvedTokens(instruction, ingredients = []) {
  const known = new Set(
    ingredients.map((r) => slugifyFoodName((r.foods || r.food || {}).name)).filter(Boolean)
  );
  const found = [...String(instruction || '').matchAll(/\{\{ing:([a-z0-9-]+)\}\}/gi)];
  return found.map((m) => m[1].toLowerCase()).filter((slug) => !known.has(slug));
}
