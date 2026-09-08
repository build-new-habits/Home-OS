// js/views/mealsMatch.js — 07 Sep 2026 v1
//
// "What could I make?" as its own page.
//
// Three lines by design. The behaviour lives in js/views/meals.js and this
// route selects which part of it to show — the same shape as the pantry's
// pages and the shopping list's. Three copies of a recipe list that drift
// apart would be a worse answer to "one job per screen" than one that does
// not.
import { render as renderMeals } from './meals.js';

export function render(mountEl) {
  return renderMeals(mountEl, { section: 'match' });
}
