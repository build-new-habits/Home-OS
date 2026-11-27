// js/data/seasons.js — 27 Nov 2026 v1
// Phase 41. Is this recipe in season? One answer for Shape my week, Fill the
// week and Help me choose.
//
// Phase 40 left a gap: a barbecue recipe could be offered for a December
// Tuesday, and a Christmas pudding in June. A season's or occasion's recipes
// live in a library file whose cuisine names it (Summer, BBQ, Christmas...),
// and data/menus.js knows the months each one is in season.
//
//   in    in season this month: offered, and a little ahead
//   out   out of season: not offered as an idea, unless the day asks for it
//         (a Barbecue or Birthday on that day in Shape my week) or it is one
//         of your own meals, which you chose and may want any time
//   none  everyday food: no season, nothing changes
//
// Birthday food is never "in season" on its own: it is party food, offered
// when a day has a birthday on it, or when you choose it.
//
// Pure. No queries.

import { OCCASIONS } from './menus.js';

/** Library cuisine → season or occasion key. */
export const OCCASION_OF_CUISINE = Object.freeze({
  Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Easter: 'easter',
  Birthday: 'birthday', Halloween: 'halloween', BBQ: 'bbq', 'Outdoor cooking': 'outdoor', Christmas: 'christmas'
});

export function occasionOf(cuisine) {
  return OCCASION_OF_CUISINE[String(cuisine || '')] || null;
}

/** Month 1 to 12 from 'YYYY-MM-DD', a Date, or today. */
export function monthOf(when) {
  if (typeof when === 'string' && /^\d{4}-\d{2}/.test(when)) return Number(when.slice(5, 7));
  const d = when instanceof Date ? when : new Date();
  return d.getMonth() + 1;
}

/** 'in' | 'out' | 'none' for one cuisine in one month. */
export function seasonState(cuisine, when) {
  const key = occasionOf(cuisine);
  if (!key) return 'none';
  if (key === 'birthday') return 'out';
  return OCCASIONS[key].months.includes(monthOf(when)) ? 'in' : 'out';
}

/** The occasion's name for a chip: "In season: Winter". */
export function seasonLabel(cuisine) {
  const key = occasionOf(cuisine);
  return key ? OCCASIONS[key].name : '';
}

/**
 * May this candidate be offered as an idea on this day?
 * @param {object} c       a candidate with cuisine, own, favourite
 * @param {*} when         the day
 * @param {Set<string>} [asked]  occasion keys the day asks for ('bbq' asks for outdoor too)
 */
export function seasonAllows(c, when, asked = new Set()) {
  if (c.own || c.favourite) return true;
  const state = seasonState(c.cuisine, when);
  if (state !== 'out') return true;
  return asked.has(occasionOf(c.cuisine));
}
