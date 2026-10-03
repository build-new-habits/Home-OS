// js/views/planNextWeek.js — 03 Oct 2026 v2
// v2: kitchen-only mode shows the week board (views/kitchenPlan.js, K6).
//
// "Next week" as its own page. Real since migration 024 gave
// weekly_meal_plan a week_start; before that the table held one week and
// did not know which one.
import { render as renderPlan } from './mealPlan.js';
import { render as renderBoard } from './kitchenPlan.js';
import { KITCHEN_ONLY } from '../navConfig.js';

export function render(mountEl) {
  if (KITCHEN_ONLY) return renderBoard(mountEl, { week: 'next' });
  return renderPlan(mountEl, { section: 'next' });
}
