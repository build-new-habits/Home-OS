// js/views/planThisWeek.js — 03 Oct 2026 v2
// v2: kitchen-only mode shows the week board (views/kitchenPlan.js, K6).
//
// "This week" as its own page. Three lines: the plan's behaviour lives in
// js/views/mealPlan.js and this route selects the scope.
import { render as renderPlan } from './mealPlan.js';
import { render as renderBoard } from './kitchenPlan.js';
import { KITCHEN_ONLY } from '../navConfig.js';

export function render(mountEl) {
  if (KITCHEN_ONLY) return renderBoard(mountEl, { week: 'this' });
  return renderPlan(mountEl, { section: 'week' });
}
