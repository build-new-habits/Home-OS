// js/navConfig.js — 26 Aug 2026 v1
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
  { path: 'chores', label: 'Chores', icon: '✓' },
  { path: 'calendar', label: 'Calendar', icon: '▤' }
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
