// js/lib/weeks.js — 08 Sep 2026 v1
//
// Which Monday a plan belongs to.
//
// ---- Why this exists at all ----
// Migration 024 gave weekly_meal_plan a `week_start` date. Every screen that
// reads or writes a plan now has to agree on what "this week" means, and the
// database will reject anything that is not a Monday — there is a check
// constraint on it precisely so a disagreement fails loudly rather than
// quietly splitting one week into two.
//
// One helper, so no view computes a Monday for itself. Two functions that
// each round differently is exactly how a Sunday evening ends up planning
// into the wrong week.
//
// ---- Monday, and the local Monday ----
// The database uses date_trunc('week'), which is ISO: weeks start Monday.
// This matches it. It also works in LOCAL time rather than UTC, because a
// person planning at 11pm on Sunday in Britain is still on Sunday, and UTC
// would already have moved them into the next week.

const MS_PER_DAY = 86400000;

/** ISO date (YYYY-MM-DD) for a Date, in local time. */
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The Monday of the week containing `date`, as YYYY-MM-DD.
 * @param {Date} [date] defaults to now
 */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): 0 = Sunday. Sunday belongs to the week that STARTED six days
  // ago, not the one beginning tomorrow — the off-by-one that makes a
  // Sunday-evening plan land a week late.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return isoDate(d);
}

/** This week's Monday. */
export function thisWeekStart() {
  return mondayOf();
}

/** Next week's Monday. */
export function nextWeekStart() {
  return addWeeks(thisWeekStart(), 1);
}

/** `n` weeks after an ISO Monday, as an ISO Monday. */
export function addWeeks(isoMonday, n) {
  const [y, m, d] = String(isoMonday).split('-').map(Number);
  const date = new Date(y, m - 1, d + (n * 7));
  return isoDate(date);
}

/**
 * How a week reads to a person. "This week", "Next week", or a date —
 * because "week beginning 2026-09-21" means nothing at a glance and a
 * relative label three weeks out is worse than useless.
 */
export function describeWeek(isoMonday) {
  const here = thisWeekStart();
  if (isoMonday === here) return 'This week';
  if (isoMonday === addWeeks(here, 1)) return 'Next week';
  if (isoMonday === addWeeks(here, -1)) return 'Last week';

  const [y, m, d] = String(isoMonday).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Week of ${date.getDate()} ${months[date.getMonth()]}`;
}

/** True when the string is a Monday in YYYY-MM-DD form. */
export function isWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  return mondayOf(new Date(`${value}T00:00:00`)) === value;
}
