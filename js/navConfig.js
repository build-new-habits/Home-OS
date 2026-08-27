// js/navConfig.js — 26 Aug 2026 v4
// v4: the weekly plan is its own page under Kitchen.
// v3: adds Kitchen. Meals, pantry and shopping are not three peers — they
// are one pipeline (plan a week, diff it against the cupboards, buy the
// difference, stock the cupboards, cook), so they sit behind one entry.
// v2: adds DASHBOARD_LINKS.
// Which four things sit in the bottom bar.
//
// This used to be a `nav: true` flag inside routes.js, which meant changing
// the nav required editing route entries that were meant to be frozen. Nav
// membership is a product decision that will change repeatedly; a route's
// existence is not. Separating them lets routes.js stay append-only.
//
// ---- Why these four ----
// Behavioural principle 2 spends the friction budget on daily actions.
// Exercises, weight and water were three separate bottom-bar slots for
// things that are one subject, which crowded out the calendar. They now sit
// behind Health.
//
// THE COST IS PAID ELSEWHERE, DELIBERATELY: water logging is the single
// most frequent action in the app, and putting it behind a hub adds a tap
// to it. So the dashboard keeps the one-tap water control and today's
// exercises. Health is where you go to REVIEW; the dashboard is where you
// go to DO. If that stops being true, this decision is wrong and should be
// revisited rather than defended.

export const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { path: 'health', label: 'Health', icon: '♡' },
  { path: 'kitchen', label: 'Kitchen', icon: '☰' },
  { path: 'chores', label: 'Chores', icon: '✓' },
  { path: 'calendar', label: 'Calendar', icon: '▤' }
];

/**
 * The dashboard's link list.
 *
 * It used to be generated from every route, which meant the dashboard grew
 * a duplicate link every time anything was added — including the four
 * things already one tap away in the bottom bar, and the three now behind
 * Health. Listed explicitly instead: what belongs on the dashboard is a
 * judgement, not "everything that exists".
 */
export const DASHBOARD_LINKS = [
  { path: 'holidays', title: 'Holidays', blurb: 'Trips and their checklists.' },
  { path: 'settings', title: 'Settings', blurb: 'Themes, units and your account.' }
];

/**
 * Pages behind the Kitchen hub.
 *
 * THE COST, STATED: the shopping list becomes two taps while you are
 * standing in a shop. Judged acceptable where water was not — water is
 * eight times a day, a shop is twice a week, and ticking items is fast once
 * you are there. If it grates in the aisle, promote Shopping back out
 * rather than defend the structure.
 */
export const KITCHEN_PAGES = [
  { path: 'shopping', title: 'Shopping list', blurb: 'What you still need to buy.' },
  { path: 'meal-plan', title: 'Weekly plan', blurb: 'What you are eating this week.' },
  { path: 'meals', title: 'Meals', blurb: 'Recipes and the weekly plan.' },
  { path: 'pantry', title: 'Pantry', blurb: 'What is in your cupboards.' }
];

/**
 * Pages reachable from the Health hub. Kept here beside the nav so the two
 * cannot disagree about what "Health" contains.
 */
export const HEALTH_PAGES = [
  { path: 'exercises', title: 'Exercises', blurb: 'Your physio set and anything else you are working on.' },
  { path: 'weight', title: 'Weight', blurb: 'Weigh-ins, your target, and the trend.' },
  { path: 'water', title: 'Water', blurb: 'What you have drunk today, and the last week.' }
];
