// js/views/planToday.js — 07 Sep 2026 v1
//
// "Today" as its own page. Three lines: the plan's behaviour lives in
// js/views/mealPlan.js and this route selects the scope.
import { render as renderPlan } from './mealPlan.js';

export function render(mountEl) {
  return renderPlan(mountEl, { section: 'today' });
}
