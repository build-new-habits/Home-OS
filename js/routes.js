// js/routes.js — 01 Sep 2026 v4
// Declarative route registry.
//
// ---- The rule is now APPEND-ONLY, not write-once ----
// v1 said never edited again. That was aimed at stopping phases rewriting
// each other's route table, and it is still right about that — but it also
// froze the app at ten routes, which is not a property worth keeping. New
// routes may be APPENDED. Existing entries are never modified, reordered
// or removed, so no existing path can break.
//
// ---- `nav` no longer lives here ----
// v1 carried a `nav` flag per route, which meant changing which four
// things sit in the bottom bar required editing entries that were supposed
// to be frozen. Nav membership is a UI decision, not a routing fact, and
// it now lives in js/navConfig.js. The flags below are left exactly as
// they were rather than stripped — removing them would be a modification,
// and nothing reads them any more.

export const DEFAULT_ROUTE = 'dashboard';

export const routes = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    nav: true,
    navOrder: 1,
    load: () => import('./views/dashboard.js')
  },
  {
    path: 'water',
    title: 'Water',
    nav: true,
    navOrder: 2,
    load: () => import('./views/water.js')
  },
  {
    path: 'exercises',
    title: 'Exercises',
    nav: true,
    navOrder: 3,
    load: () => import('./views/exercises.js')
  },
  {
    path: 'chores',
    title: 'Chores',
    nav: true,
    navOrder: 4,
    load: () => import('./views/chores.js')
  },
  {
    path: 'weight',
    title: 'Weight',
    nav: false,
    load: () => import('./views/weight.js')
  },
  {
    path: 'meals',
    title: 'Meals',
    nav: false,
    load: () => import('./views/meals.js')
  },
  {
    path: 'pantry',
    title: 'Pantry',
    nav: false,
    load: () => import('./views/pantry.js')
  },
  {
    path: 'shopping',
    title: 'Shopping List',
    nav: false,
    load: () => import('./views/shopping.js')
  },
  {
    path: 'holidays',
    title: 'Holidays',
    nav: false,
    load: () => import('./views/holidays.js')
  },
  {
    path: 'settings',
    title: 'Settings',
    nav: false,
    load: () => import('./views/settings.js')
  },
  // ---- Appended 26 Aug 2026 ----
  {
    path: 'calendar',
    title: 'Calendar',
    load: () => import('./views/calendar.js')
  },
  {
    path: 'health',
    title: 'Health',
    load: () => import('./views/health.js')
  },
  {
    path: 'kitchen',
    title: 'Kitchen',
    load: () => import('./views/kitchen.js')
  },
  {
    path: 'meal-plan',
    title: 'Weekly plan',
    load: () => import('./views/mealPlan.js')
  },
  {
    path: 'foods',
    title: 'Things you buy',
    load: () => import('./views/foods.js')
  },
  // Phase 24. Appended, per the append-only rule in the header: nothing
  // above is modified, so no existing path can break.
  {
    path: 'plan-week',
    title: 'Plan the week',
    load: () => import('./views/planWeek.js')
  },
  // Phase 27. Appended, per the append-only rule.
  {
    path: 'first-run',
    title: 'Getting started',
    load: () => import('./views/firstRun.js')
  }
];

export function findRoute(path) {
  return routes.find(r => r.path === path);
}
