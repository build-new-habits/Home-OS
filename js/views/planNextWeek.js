// js/views/planNextWeek.js — 26 Nov 2026 v3
// v3: next week is Hearth's (Phase 36a). Free sees what Hearth adds here,
// with a way back to this week; nothing already planned is touched.
// v2: kitchen-only mode shows the week board (views/kitchenPlan.js, K6).
//
// "Next week" as its own page. Real since migration 024 gave
// weekly_meal_plan a week_start; before that the table held one week and
// did not know which one.
import { render as renderPlan } from './mealPlan.js';
import { render as renderBoard } from './kitchenPlan.js';
import { KITCHEN_ONLY } from '../navConfig.js';
import { el } from '../lib/dom.js';
import { loadHearth, isHearth, WHAT_HEARTH_ADDS } from '../data/hearth.js';

export function render(mountEl) {
  if (!KITCHEN_ONLY) return renderPlan(mountEl, { section: 'next' });
  let cleanup = null;
  let gone = false;
  loadHearth().then(() => {
    if (gone) return;
    if (isHearth()) { cleanup = renderBoard(mountEl, { week: 'next' }); return; }
    mountEl.append(
      el('a', { class: 'back-link', href: '#/plan-this-week', text: 'This week' }),
      el('h1', { text: 'Next week' }),
      el('p', { text: `Free plans this week. ${WHAT_HEARTH_ADDS.planAhead}` }),
      el('a', { class: 'btn btn-primary', href: '#/hearth', text: 'See Hearth' })
    );
  });
  return () => { gone = true; if (typeof cleanup === 'function') cleanup(); };
}
