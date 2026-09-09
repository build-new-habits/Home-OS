// js/views/planNextWeek.js — 08 Sep 2026 v1
//
// "Next week" as its own page. Real since migration 024 gave
// weekly_meal_plan a week_start; before that the table held one week and
// did not know which one.
import { render as renderPlan } from './mealPlan.js';

export function render(mountEl) {
  return renderPlan(mountEl, { section: 'next' });
}
