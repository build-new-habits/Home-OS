// js/data/courses.js — 03 Oct 2026 v1
// Kitchen rebuild. Starters, mains and puddings.
//
// ---- A course is not a slot ----
// A slot is WHEN you eat (breakfast, lunch, dinner, snack, drink). A course
// is WHICH PART of that meal a dish is. Sunday dinner can be soup, a roast
// and a crumble: three dishes in one dinner slot, which the plan has always
// allowed. So a starter or pudding is planned into the dinner (or lunch)
// slot beside the main, and the panel lists them in eating order.
//
// Library recipes carry `course` in their JSON. Your own meals carry it in
// meals.course once migration 026 is in; before that, a meal you added from
// the library still knows its course through library_ref, and one you wrote
// yourself reads as a main.

export const COURSES = [
  { value: 'starter', label: 'Starter' },
  { value: 'main', label: 'Main' },
  { value: 'pudding', label: 'Pudding' }
];

const ORDER = { starter: 0, main: 1, pudding: 2 };

/** A recipe's or meal's course; anything unknown or missing is a main. */
export function courseOf(item) {
  const value = item && item.course;
  return Object.prototype.hasOwnProperty.call(ORDER, value) ? value : 'main';
}

export function courseLabel(value) {
  const hit = COURSES.find((c) => c.value === value);
  return hit ? hit.label : 'Main';
}

/** Items in eating order: starters, mains, puddings. Stable within a course. */
export function sortByCourse(items = [], courseFor = courseOf) {
  return items
    .map((item, i) => ({ item, i, rank: ORDER[courseFor(item)] ?? 1 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.item);
}

/**
 * Postgres 42703 ("undefined column"), or PostgREST naming the column, for
 * a column that a not-yet-applied migration adds.
 */
export function isMissingColumnError(error, column) {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return new RegExp(`\\b${column}\\b`).test(String(error.message || ''))
    && /does not exist|could not find|schema cache/i.test(String(error.message || ''));
}
