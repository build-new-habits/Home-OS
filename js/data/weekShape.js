// js/data/weekShape.js — 27 Nov 2026 v1
// Phase 37. Where the Week Shaper's rules and events are kept.
//
// week_shapes (migration 030): one row per household, so everyone at home
// sees the same rules and the same match on Sunday. Before 030 runs there is
// no table, and both are kept on this phone instead; nothing is lost when
// the table arrives, because the phone's copy is written up on the next save.

import { supabase } from '../supabaseClient.js';
import { normaliseRules, normaliseEvents, pruneEvents, DEFAULT_RULES } from './weekShaper.js';

const TABLE = 'week_shapes';
const LOCAL_KEY = 'home-os-week-shape';

function missingTable(error) {
  return Boolean(error) && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));
}

function readLocal() {
  try {
    const raw = JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch { return null; }
}

function writeLocal(value) {
  try { globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); } catch { /* fine */ }
}

let rowId = null;

/** @returns {{ rules, events, from: 'household'|'phone' }} — never fails. */
export async function loadShape() {
  const local = readLocal();
  const fallback = {
    rules: normaliseRules(local ? local.rules : DEFAULT_RULES),
    events: normaliseEvents(local ? local.events : {}),
    from: 'phone'
  };
  try {
    const { data, error } = await supabase.from(TABLE).select('id, rules, events').limit(1);
    if (error) return fallback;
    const row = (data && data[0]) || null;
    if (!row) return fallback;
    rowId = row.id;
    const shape = { rules: normaliseRules(row.rules), events: normaliseEvents(row.events), from: 'household' };
    writeLocal({ rules: shape.rules, events: shape.events });
    return shape;
  } catch {
    return fallback;
  }
}

/**
 * Saves rules and events together. The phone always keeps a copy, so a
 * save without a signal or before migration 030 still sticks here.
 * @returns {{ ok: boolean, where: 'household'|'phone' }}
 */
export async function saveShape({ rules, events }, todayIso) {
  const clean = { rules: normaliseRules(rules), events: pruneEvents(normaliseEvents(events), todayIso) };
  writeLocal(clean);
  try {
    if (rowId) {
      const { error } = await supabase.from(TABLE).update(clean).eq('id', rowId);
      if (!error) return { ok: true, where: 'household' };
      if (missingTable(error)) return { ok: true, where: 'phone' };
      return { ok: false, where: 'phone', error };
    }
    const { data, error } = await supabase.from(TABLE).insert(clean).select('id').single();
    if (!error) { rowId = data && data.id; return { ok: true, where: 'household' }; }
    if (missingTable(error)) return { ok: true, where: 'phone' };
    if (error.code === '23505') {
      // Someone else at home saved first: read their row, then update it.
      const again = await supabase.from(TABLE).select('id').limit(1);
      rowId = again.data && again.data[0] && again.data[0].id;
      if (rowId) {
        const up = await supabase.from(TABLE).update(clean).eq('id', rowId);
        if (!up.error) return { ok: true, where: 'household' };
      }
    }
    return { ok: false, where: 'phone', error };
  } catch (error) {
    return { ok: false, where: 'phone', error };
  }
}
