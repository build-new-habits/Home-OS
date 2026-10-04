// js/data/listWindow.js — 04 Oct 2026 v2
// v2: follows YOUR food week (lib/foodWeek.js). The list is for meals still
// to come this food week, and on its last day (the night you shop) for the
// whole of the next one too. A Monday week behaves as v1 did on a Sunday.
// v1: which planned meals the shopping list is for.
//
// Persona re-trace 3 found two faults in the list's reach:
//
//   1. It counted the whole of this week, past days included. Once a meal
//      is cooked, We cooked it takes its ingredients out of the pantry, so
//      the next rebuild saw Monday's chicken as missing and put it back on
//      the list on Tuesday.
//   2. On a Sunday it ignored next week entirely, though Sunday is when
//      most households plan and shop.

import { listPlan } from './mealPlan.js';
import { isEaten } from './eaten.js';
import { foodWeekDays, mondaysOf, inDays, looksAhead, entryDate } from '../lib/foodWeek.js';

/** Keep only meals still to come (today or later), not ticked Eaten. Pure. */
export function stillToCome(entries = [], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return (entries || []).filter((e) => {
    const d = entryDate(e);
    return d && d.getTime() >= today && !isEaten(e);
  });
}

/**
 * @param {{ includeNext?: boolean, now?: Date }} [opts]
 * @returns {Promise<{ ok: true, data: object[] } | { ok: false, error: any }>}
 */
export async function planForList({ includeNext = false, now = new Date() } = {}) {
  const days = [...foodWeekDays(now, 0)];
  if (includeNext || looksAhead(now)) days.push(...foodWeekDays(now, 1));
  const mondays = mondaysOf(days);
  const reads = await Promise.all(mondays.map((monday) => listPlan(monday)));
  const failed = reads.find((r) => !r.ok);
  if (failed) return failed;
  const all = reads.flatMap((r, i) => (r.data || []).map((e) => (e.week_start ? e : { ...e, week_start: mondays[i] })))
    .filter((e) => inDays(e, days));
  return { ok: true, data: stillToCome(all, now) };
}
