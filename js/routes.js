// js/routes.js — 14 Jul 2026 v1
// Declarative route registry. Written complete in Phase 2 and never
// edited again — later phases replace the stub view file a route points
// at, they do not add or change entries here.
//
// nav set (behavioural principle 2 — friction budget spent on daily
// actions): dashboard, water, exercises, chores are one-tap-reachable
// from the bottom nav. weight/meals/pantry/shopping/holidays/settings are
// weekly-or-less and reachable via the dashboard's link list instead —
// see views/dashboard.js.

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
  }
];

export function findRoute(path) {
  return routes.find(r => r.path === path);
}
