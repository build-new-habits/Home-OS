// js/views/planThisWeek.js — 04 Oct 2026 v4
// v4: looks ahead on the last day of YOUR food week (lib/foodWeek.js).
// v3: at the weekend Plan looks ahead. On a Sunday, or a Saturday evening,
// "this week" has a day or less left, and that is when most households plan
// (persona re-trace 3), so the board opens on next week. Asking for this
// week by name (#/plan-this-week?week=this) always gets it.
// v2: kitchen-only mode shows the week board (views/kitchenPlan.js, K6).
//
// "This week" as its own page. Three lines: the plan's behaviour lives in
// js/views/mealPlan.js and this route selects the scope.
import { render as renderPlan } from './mealPlan.js';
import { render as renderBoard } from './kitchenPlan.js';
import { KITCHEN_ONLY } from '../navConfig.js';
import { looksAhead } from '../lib/foodWeek.js';

export function render(mountEl) {
  if (KITCHEN_ONLY) {
    const asked = /[?&]week=this\b/.test(window.location.hash || '');
    if (!asked && looksAhead()) return renderBoard(mountEl, { week: 'next', lookedAhead: true });
    return renderBoard(mountEl, { week: 'this' });
  }
  return renderPlan(mountEl, { section: 'week' });
}
