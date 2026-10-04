// js/lib/foodWeek.js — 04 Oct 2026 v1
// v1: your food week starts on the day you choose.
//
// Graeme, 4 Oct 2026: "When does the week start? I tend to do shopping on
// Thursday night for click and collect Friday afternoon. Others will have
// their start of the week differently too."
//
// The database keys each planned meal by the Monday of its calendar week
// plus its day (migration 024, a Monday CHECK), and that stays exactly as
// it is. A "food week" is a VIEW over it: seven days from the day you
// choose, which may cross two of those Mondays. Every planned meal still
// has one real date, so nothing moves and nothing is migrated.
//
//   - Plan shows your week from its start day: Friday to Thursday.
//   - On the last day of your week (Thursday, the night you shop) Plan opens
//     on the next one, and the shopping list covers it.
//   - The shopping list is for the meals still to come in your week.
//
// The choice is kept on this phone until user_settings has a column for it
// (it needs a migration, and the database is out of reach for now).

import { mondayOf } from './weeks.js';

const KEY = 'home-os-food-week-start';
const JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const LABELS = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const SHORT = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

export const WEEK_START_CHOICES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((value) => ({ value, label: LABELS[value] }));

/** The day your food week starts: 'mon' unless you have chosen another. */
export function foodWeekStartDay() {
  try {
    const v = localStorage.getItem(KEY);
    return JS_DAY.includes(v) ? v : 'mon';
  } catch { return 'mon'; }
}

export function setFoodWeekStartDay(value) {
  if (!JS_DAY.includes(value)) return false;
  try { localStorage.setItem(KEY, value); return true; } catch { return false; }
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The first day of the food week containing `now`, shifted by `offset` weeks. Pure. */
export function foodWeekStartDate(now = new Date(), offset = 0, startDay = foodWeekStartDay()) {
  const start = JS_DAY.indexOf(startDay);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() - start + 7) % 7) + offset * 7);
  return d;
}

/**
 * The seven days of a food week, in order. Each day carries the plan's own
 * keys: its day value and the Monday of its calendar week. Pure.
 * @returns {Array<{ value, label, short, date: Date, iso: string, weekStart: string }>}
 */
export function foodWeekDays(now = new Date(), offset = 0, startDay = foodWeekStartDay()) {
  const first = foodWeekStartDate(now, offset, startDay);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const value = JS_DAY[date.getDay()];
    return { value, label: LABELS[value], short: SHORT[value], date, iso: isoDate(date), weekStart: mondayOf(date) };
  });
}

/** The calendar Mondays a food week touches (one or two). Pure. */
export function mondaysOf(days) {
  return [...new Set(days.map((d) => d.weekStart))];
}

/** True for a plan entry inside these days. Pure. */
export function inDays(entry, days) {
  return days.some((d) => d.weekStart === entry.week_start && d.value === entry.day_of_week);
}

/** "Friday 9 October to Thursday 15 October". */
export function foodWeekLabel(days) {
  const fmt = (date) => date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${fmt(days[0].date)} to ${fmt(days[6].date)}`;
}

/**
 * The last day of your food week: the day you shop for the next one. Plan
 * opens on next week and the list includes it. For a Monday week this is
 * Sunday, as before.
 */
export function looksAhead(now = new Date(), startDay = foodWeekStartDay()) {
  const start = JS_DAY.indexOf(startDay);
  return now.getDay() === (start + 6) % 7;
}

/** A plan entry's own date. Pure. */
export function entryDate(entry) {
  const [y, m, d] = String(entry.week_start || '').split('-').map(Number);
  const offset = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(entry.day_of_week);
  if (!y || offset < 0) return null;
  return new Date(y, m - 1, d + offset);
}
