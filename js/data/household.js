// js/data/household.js — 01 Sep 2026 v1
// Phase 18. Who is in this house.
//
// ---- What changed underneath this ----
// Revision 8 moved thirteen tables from per-user to per-household access.
// The cupboard, the shopping list, the meal plan, the chores, the calendar
// and the holidays are now shared by everyone in the household. Weight,
// water, exercises, exercise logs and settings stay personal, and this
// module does not touch them.
//
// ---- Why nothing here writes household_id ----
// `household_id` carries `default my_household_id()` in the database,
// exactly mirroring `default auth.uid()` on `user_id`. So the standing
// rule holds unchanged: inserts pass nothing, the database supplies it.
// A data module that started sending household_id would be one place that
// could send the WRONG one.
//
// ---- Members without accounts ----
// `user_id` is nullable. A child who eats the meals and has portions
// planned for them is a real member; they do not need a login. Everything
// here has to cope with a member who can never sign in, because that is
// the common case for the people this feature exists for.

import { supabase } from '../supabaseClient.js';

export const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' }
];

export const DIETARY_TAGS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten free' },
  { value: 'dairy_free', label: 'Dairy free' },
  { value: 'nut_free', label: 'Nut free' }
];

/**
 * Cached in module scope: this is read on nearly every screen eventually,
 * and it changes about twice a year. Invalidated explicitly on write and
 * on sign-out — never on a timer, which would only ever be wrong slowly.
 */
let cache = null;

export function clearHouseholdCache() {
  cache = null;
}

/**
 * The household this account belongs to, with its members.
 *
 * RLS means this can only ever return your own, so there is no id to pass
 * and no way to ask for someone else's.
 */
export async function getHousehold({ force = false } = {}) {
  if (cache && !force) return { ok: true, data: cache };

  const households = await supabase.from('households').select('*').limit(1);
  if (households.error) return { ok: false, error: households.error };

  const household = (households.data && households.data[0]) || null;
  if (!household) {
    // Should be impossible: signup creates one in a trigger. If it happens,
    // say so plainly rather than rendering an empty box — an account with
    // no household can see no rows at all, and that needs a real message.
    return {
      ok: false,
      error: new Error('This account is not in a household yet. Sign out and back in, and tell Graeme if it persists.')
    };
  }

  const members = await supabase
    .from('household_members')
    .select('*')
    .order('created_at', { ascending: true });
  if (members.error) return { ok: false, error: members.error };

  cache = { ...household, members: members.data || [] };
  return { ok: true, data: cache };
}

export async function renameHousehold(name) {
  const clean = String(name || '').trim();
  if (!clean) return { ok: false, error: new Error('A household needs a name.') };

  const current = await getHousehold();
  if (!current.ok) return current;

  const { data, error } = await supabase
    .from('households')
    .update({ name: clean })
    .eq('id', current.data.id)
    .select()
    .single();
  if (error) return { ok: false, error };

  clearHouseholdCache();
  return { ok: true, data };
}

/**
 * Adds someone who does not have an account.
 *
 * There is no invite flow yet (Phase 21). This is how a child, or anyone
 * who is fed but does not use the app, becomes a member — which is the
 * case that actually matters for meal planning and shopping.
 */
export async function addMember({ display_name, role = 'adult', portion_factor = 1, dietary_tags = [] }) {
  const name = String(display_name || '').trim();
  if (!name) return { ok: false, error: new Error('Give them a name.') };
  if (!ROLES.some((r) => r.value === role)) {
    return { ok: false, error: new Error(`"${role}" is not a role.`) };
  }
  const factor = Number(portion_factor);
  if (!Number.isFinite(factor) || factor <= 0 || factor > 3) {
    return { ok: false, error: new Error('A portion has to be more than nothing and less than three helpings.') };
  }

  const current = await getHousehold();
  if (!current.ok) return current;

  // household_id IS passed here, unlike everywhere else, because this row
  // defines membership rather than depending on it — the column has no
  // default on this table for exactly that reason.
  const { data, error } = await supabase
    .from('household_members')
    .insert({
      household_id: current.data.id,
      user_id: null,
      display_name: name,
      role,
      portion_factor: Math.round(factor * 100) / 100,
      dietary_tags: cleanTags(dietary_tags)
    })
    .select()
    .single();
  if (error) return { ok: false, error };

  clearHouseholdCache();
  return { ok: true, data };
}

export async function updateMember(memberId, patch = {}) {
  const next = {};

  if (patch.display_name !== undefined) {
    const name = String(patch.display_name).trim();
    if (!name) return { ok: false, error: new Error('A member needs a name.') };
    next.display_name = name;
  }
  if (patch.role !== undefined) {
    if (!ROLES.some((r) => r.value === patch.role)) {
      return { ok: false, error: new Error(`"${patch.role}" is not a role.`) };
    }
    next.role = patch.role;
  }
  if (patch.portion_factor !== undefined) {
    const factor = Number(patch.portion_factor);
    if (!Number.isFinite(factor) || factor <= 0 || factor > 3) {
      return { ok: false, error: new Error('A portion has to be more than nothing and less than three helpings.') };
    }
    next.portion_factor = Math.round(factor * 100) / 100;
  }
  if (patch.dietary_tags !== undefined) {
    next.dietary_tags = cleanTags(patch.dietary_tags);
  }

  if (Object.keys(next).length === 0) return { ok: false, error: new Error('Nothing to change.') };

  const { data, error } = await supabase
    .from('household_members')
    .update(next)
    .eq('id', memberId)
    .select()
    .single();
  if (error) return { ok: false, error };

  clearHouseholdCache();
  return { ok: true, data };
}

/**
 * Removes a member.
 *
 * ---- Their data stays ----
 * The shared rows they created belong to the HOUSEHOLD, not to them, so
 * nothing is deleted here. A person leaving must not empty the cupboard.
 * Their personal rows — weight, water, exercises — are keyed on user_id
 * and are untouched by this and invisible to everyone else anyway.
 */
export async function removeMember(memberId) {
  const current = await getHousehold();
  if (!current.ok) return current;

  const member = current.data.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: new Error('That member is not in this household.') };

  // The last owner cannot be removed. A household with no owner is one
  // nobody can administer, and the recovery for that is a support ticket.
  if (member.role === 'owner') {
    const owners = current.data.members.filter((m) => m.role === 'owner');
    if (owners.length <= 1) {
      return { ok: false, error: new Error('This is the only owner. Make someone else an owner first.') };
    }
  }

  const { error } = await supabase.from('household_members').delete().eq('id', memberId);
  if (error) return { ok: false, error };

  clearHouseholdCache();
  return { ok: true };
}

/** Which member row is this signed-in account? Null for a member with no login. */
export function findSelf(household, userId) {
  if (!household || !userId) return null;
  return household.members.find((m) => m.user_id === userId) || null;
}

/**
 * How many servings to cook for a set of members.
 *
 * Rounded UP to the nearest half and floored at 1: cooking slightly too
 * much is a leftover, cooking slightly too little is someone going without.
 * The asymmetry is deliberate.
 */
export function servingsFor(members = []) {
  if (members.length === 0) return 1;
  const total = members.reduce((sum, m) => sum + Number(m.portion_factor || 1), 0);
  return Math.max(1, Math.ceil(total * 2) / 2);
}

/** Plain description of a member, for a list row. */
export function describeMember(member) {
  if (!member) return '';
  const parts = [];
  const role = ROLES.find((r) => r.value === member.role);
  if (role) parts.push(role.label);
  if (Number(member.portion_factor) !== 1) {
    parts.push(`${member.portion_factor} of an adult portion`);
  }
  if (!member.user_id) parts.push('No sign-in');
  for (const tag of member.dietary_tags || []) {
    const t = DIETARY_TAGS.find((d) => d.value === tag);
    if (t) parts.push(t.label);
  }
  return parts.join(' · ');
}

function cleanTags(tags) {
  const allowed = new Set(DIETARY_TAGS.map((t) => t.value));
  return [...new Set((tags || []).filter((t) => allowed.has(t)))];
}
