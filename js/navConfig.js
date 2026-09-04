// js/navConfig.js — 01 Sep 2026 v9
// v7: adds FIRST_RUN_ACTION.
// v6: adds PRIMARY_ACTION — the one task at the top of the dashboard.
// v5: the foods library is its own page under Kitchen.
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

/**
 * Worklist A1. Which areas someone said they came for.
 *
 * Sarah met five domains before she had done anything and spent three
 * traces "getting used to ignoring most of it". This lets her ask for less.
 *
 * `always: true` means an item can never be hidden. You must always be able
 * to get home and into Settings — an app you can navigate yourself out of
 * is a bug, not a preference.
 */
export const FOCUS_AREAS = [
  { value: 'kitchen', label: 'Food and shopping',
    blurb: 'Meals, the weekly plan, your cupboard and the shopping list.' },
  { value: 'home', label: 'Home and chores',
    blurb: 'Chores that come back, the calendar and holidays.' },
  { value: 'health', label: 'Health',
    blurb: 'Water, weight and rehab exercises.' }
];

/**
 * Filters the nav to what somebody asked for.
 *
 * An empty list means EVERYTHING, and that is the default. This is a way of
 * asking for less, never something to configure before the app works.
 */
export function visibleNav(items, focusAreas = []) {
  if (!focusAreas || focusAreas.length === 0) return items;
  return items.filter((item) => item.always || focusAreas.includes(item.area));
}

export const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '⌂', always: true },
  { path: 'health', label: 'Health', icon: '♡', area: 'health' },
  { path: 'kitchen', label: 'Kitchen', icon: '☰', area: 'kitchen' },
  { path: 'chores', label: 'Chores', icon: '✓', area: 'home' },
  { path: 'calendar', label: 'Calendar', icon: '▤', area: 'home' }
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
/**
 * The one task offered at the top of the dashboard.
 *
 * Phase 24. Separate from DASHBOARD_LINKS because it is not a link in the
 * "everything else" grid — it is the single obvious thing to do, and Phase 9
 * flagged that the answer to tile clutter is a task rather than fewer tiles.
 *
 * Declared here rather than hardcoded in the view so navigation stays
 * declarative and the a11y gate's reachability check can see it. The gate
 * caught exactly that when this was a hardcoded link.
 */
export const PRIMARY_ACTION = {
  path: 'plan-week',
  label: 'Plan the week',
  resumeLabel: 'Carry on planning the week'
};

/**
 * Offered instead of PRIMARY_ACTION until an account has been through the
 * first run. Declared here rather than hardcoded in the view for the same
 * reason as PRIMARY_ACTION: navigation stays checkable, and the a11y gate
 * caught exactly this when a link was hardcoded in Phase 24.
 */
export const FIRST_RUN_ACTION = {
  path: 'first-run',
  label: 'Show me how this works'
};

export const DASHBOARD_LINKS = [
  { path: 'holidays', title: 'Holidays', blurb: 'Trips and their checklists.', area: 'home' },
  { path: 'settings', title: 'Settings', blurb: 'Themes, units and your account.', always: true }
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
  // v8: the blurb said "Recipes and the weekly plan", which describes the
  // wrong screen and never mentioned the hundred recipes that ship with the
  // app. Somebody looking for the library had no reason to tap here.
  { path: 'meals', title: 'Meals', blurb: 'Your recipes, and a library of 100 to add from.' },
  { path: 'pantry', title: 'Pantry', blurb: 'What is in your cupboards.' },
  { path: 'foods', title: 'Things you buy', blurb: 'Food and everything else that ends up in the trolley.' }
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
