// js/data/listWindow.js — 04 Oct 2026 v1
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
//
// The list is now for meals still to come: today and the rest of this
// week, minus anything ticked Eaten, plus all of next week at the weekend
// (lib/weeks.js weekendLooksAhead) or whenever next week is asked for by
// name (its Update shopping list button).

import { listPlan } from './mealPlan.js';
import { isEaten } from './eaten.js';
import { thisWeekStart, nextWeekStart, weekendLooksAhead } from '../lib/weeks.js';

const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Keep only meals still to come this week. Pure, for the gates. */
export function stillToCome(entries = [], now = new Date()) {
  const today = ORDER.indexOf(JS_DAY[now.getDay()]);
  return (entries || []).filter((e) => ORDER.indexOf(e.day_of_week) >= today && !isEaten(e));
}

/**
 * @param {{ includeNext?: boolean, now?: Date }} [opts]
 * @returns {Promise<{ ok: true, data: object[] } | { ok: false, error: any }>}
 */
export async function planForList({ includeNext = false, now = new Date() } = {}) {
  const wantNext = includeNext || weekendLooksAhead(now);
  const [thisWeek, nextWeek] = await Promise.all([
    listPlan(thisWeekStart()),
    wantNext ? listPlan(nextWeekStart()) : Promise.resolve({ ok: true, data: [] })
  ]);
  if (!thisWeek.ok) return thisWeek;
  if (!nextWeek.ok) return nextWeek;
  return { ok: true, data: [...stillToCome(thisWeek.data || [], now), ...(nextWeek.data || []).filter((e) => !isEaten(e))] };
}
