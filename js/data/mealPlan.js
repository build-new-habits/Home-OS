// js/data/mealPlan.js — 01 Sep 2026 v2
// All Supabase access for `weekly_meal_plan`. Shared data-access contract:
// { ok, data|error }, error always checked, nothing thrown at views, no
// user_id on inserts.
//
// day_of_week and slot both carry CHECK constraints (schema.md), so the
// allowed values are exported from here and the view builds <select>
// controls from them — never free text (standing rule 1, which exists
// because a Phase 3 free-text input violated a check constraint).
//
// The plan is a recurring week, not dated: there is no start_date column,
// and "this week" means the same seven rows every week until they change.
// That is the schema's design and nothing here invents a date.
//
// The schema allows MORE THAN ONE entry per day and slot — there is no
// unique constraint on (day_of_week, slot) — and that is treated as a
// feature rather than worked around: a dinner can legitimately be two
// dishes. Cells therefore hold a list.
//
// serves_override is per-entry and overrides meals.default_serves for that
// instance only (principle 5). Setting it must never touch the meal.

import { supabase } from '../supabaseClient.js';

const TABLE = 'weekly_meal_plan';

/** Matches the day_of_week CHECK constraint exactly. Order is display order. */
export const DAYS = [
  { value: 'mon', label: 'Monday', short: 'Mon' },
  { value: 'tue', label: 'Tuesday', short: 'Tue' },
  { value: 'wed', label: 'Wednesday', short: 'Wed' },
  { value: 'thu', label: 'Thursday', short: 'Thu' },
  { value: 'fri', label: 'Friday', short: 'Fri' },
  { value: 'sat', label: 'Saturday', short: 'Sat' },
  { value: 'sun', label: 'Sunday', short: 'Sun' }
];

/** Matches the slot CHECK constraint exactly. Order is display order. */
export const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
];

const DAY_VALUES = DAYS.map((d) => d.value);
const SLOT_VALUES = SLOTS.map((s) => s.value);

export function isValidDay(value) {
  return DAY_VALUES.includes(value);
}

export function isValidSlot(value) {
  return SLOT_VALUES.includes(value);
}

/** The whole plan, each entry with its meal embedded. */
export async function listPlan() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, day_of_week, slot, serves_override, member_ids, meal_id, meals(id, name, default_serves)')
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/**
 * Groups plan rows by `${day}:${slot}` so a view can look a cell up in one
 * step instead of filtering the whole list 28 times.
 */
export function groupByCell(entries) {
  const map = new Map();
  for (const entry of entries || []) {
    const key = `${entry.day_of_week}:${entry.slot}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  }
  return map;
}

export async function addPlanEntry({ meal_id, day_of_week, slot, serves_override = null, member_ids = [] }) {
  if (!meal_id) return { ok: false, error: new Error('Pick a meal first.') };
  // Guarded here as well as in the UI: a check-constraint violation comes
  // back as an opaque database error, which is not a useful thing to show.
  if (!isValidDay(day_of_week)) {
    return { ok: false, error: new Error(`"${day_of_week}" is not a day of the week.`) };
  }
  if (!isValidSlot(slot)) {
    return { ok: false, error: new Error(`"${slot}" is not a meal slot.`) };
  }
  const payload = {
    meal_id, day_of_week, slot,
    serves_override: normaliseServes(serves_override),
    // Empty means everyone. That is the default and it stays the default.
    member_ids: Array.isArray(member_ids) ? member_ids : []
  };
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

function normaliseServes(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * Updates one plan entry. Passing serves_override as null or '' clears the
 * override, so the entry falls back to meals.default_serves.
 */
export async function updatePlanEntry(entryId, { day_of_week, slot, serves_override, member_ids } = {}) {
  const patch = {};
  if (day_of_week !== undefined) {
    if (!isValidDay(day_of_week)) {
      return { ok: false, error: new Error(`"${day_of_week}" is not a day of the week.`) };
    }
    patch.day_of_week = day_of_week;
  }
  if (slot !== undefined) {
    if (!isValidSlot(slot)) {
      return { ok: false, error: new Error(`"${slot}" is not a meal slot.`) };
    }
    patch.slot = slot;
  }
  if (serves_override !== undefined) patch.serves_override = normaliseServes(serves_override);
  if (member_ids !== undefined) patch.member_ids = Array.isArray(member_ids) ? member_ids : [];

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', entryId)
    .select()
    .single();
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export async function removePlanEntry(entryId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', entryId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/** Servings actually in force for an entry: the override, else the meal's default. */
export function servesFor(entry) {
  if (!entry) return 1;
  if (entry.serves_override !== null && entry.serves_override !== undefined) {
    return entry.serves_override;
  }
  const meal = entry.meals || entry.meal;
  return (meal && meal.default_serves) || 1;
}


// ---- Phase 20: who is eating -------------------------------------------

/**
 * The members an entry is for.
 *
 * Empty member_ids means EVERYONE, which is the common case and stays free
 * of any tap cost. A stale id — a member removed after the plan was made —
 * is ignored rather than treated as a missing person: past plans keep their
 * record of who ate what, and the id simply stops resolving.
 */
export function membersFor(entry, householdMembers = []) {
  const ids = (entry && entry.member_ids) || [];
  if (ids.length === 0) return householdMembers;
  const byId = new Map(householdMembers.map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Servings to cook, given who is actually eating.
 *
 * serves_override wins outright — it is the manual escape hatch and this
 * must never quietly overrule it.
 *
 * Otherwise: sum of portion_factor, rounded UP to the nearest half, floored
 * at 1. The asymmetry is deliberate. Cooking slightly too much is a
 * leftover; cooking slightly too little is somebody going without.
 */
export function servingsForEntry(entry, householdMembers = []) {
  if (entry && entry.serves_override !== null && entry.serves_override !== undefined) {
    return entry.serves_override;
  }
  const members = membersFor(entry, householdMembers);
  if (members.length === 0) {
    const meal = (entry && (entry.meals || entry.meal)) || {};
    return meal.default_serves || 1;
  }
  const total = members.reduce((sum, m) => {
    const factor = Number(m.portion_factor);
    // A null portion must never silently shrink the shop.
    return sum + (Number.isFinite(factor) && factor > 0 ? factor : 1);
  }, 0);
  return Math.max(1, Math.ceil(total * 2) / 2);
}

/** "Everyone" / "Ellie and Sam" / "Just you" — never a list of raw ids. */
export function describeDiners(entry, householdMembers = []) {
  const ids = (entry && entry.member_ids) || [];
  if (ids.length === 0) return 'Everyone';
  const members = membersFor(entry, householdMembers);
  if (members.length === 0) return 'Nobody in the household any more';
  if (members.length === householdMembers.length) return 'Everyone';
  const names = members.map((m) => m.display_name);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Splitting a cell: the ids NOT in the new entry.
 *
 * When you add a second meal to a slot that already holds one and say who
 * the new one is for, the existing meal should narrow to the remainder on
 * its own. "Sausage and chips for the kids" should make the sea bass
 * "the adults" without you having to go and edit it too. One action, not
 * two.
 */
export function remainingMembers(householdMembers = [], takenIds = []) {
  const taken = new Set(takenIds);
  return householdMembers.filter((m) => !taken.has(m.id)).map((m) => m.id);
}

/**
 * Dietary needs an entry does not visibly meet.
 *
 * ---- Tags say what a meal IS, not what it isn't ----
 * A meal tagged ['gluten_free'] is not thereby "not vegetarian" — it may
 * simply never have been tagged vegetarian. So this reports UNCONFIRMED,
 * not CONFLICT, and the wording has to match: "not marked vegetarian",
 * never "contains meat".
 *
 * An entirely untagged meal returns nothing. Otherwise this would fire on
 * every meal in the app until the whole library were tagged, and a warning
 * that appears everywhere is one nobody reads.
 *
 * It never blocks. It is your kitchen; maybe Sam is having something else.
 */
export function dietaryConflicts(entry, householdMembers = [], mealTags = []) {
  if (mealTags.length === 0) return [];
  const members = membersFor(entry, householdMembers);
  const out = [];
  for (const member of members) {
    const needs = member.dietary_tags || [];
    const unmet = needs.filter((tag) => !mealTags.includes(tag));
    if (unmet.length > 0) out.push({ member, unmet });
  }
  return out;
}
