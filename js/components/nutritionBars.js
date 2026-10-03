// js/components/nutritionBars.js — 03 Oct 2026 v1
// Kitchen rebuild. Energy, carbs, fat, protein and fibre as bars against a
// day's reference intake. Used by the recipe page (per serving) and Today
// (the day so far as planned).
//
// The bar stops at full; the number does not. Over 100% is information,
// not a warning, and gets no colour of its own (behavioural principle 1).

import { el } from '../lib/dom.js';
import { nutritionRows, REFERENCE_INTAKES } from '../data/nutrition.js';

/**
 * @param {{ id: string, title: string, totals: object, complete?: object,
 *           targets?: object, note?: string, headingLevel?: string }} opts
 * @returns {HTMLElement} a <section> labelled by its heading
 */
export function nutritionBars({ id, title, totals, complete = {}, targets = REFERENCE_INTAKES, note = '', headingLevel = 'h2' }) {
  const section = el('section', { class: 'recipe-page-section nutrition-section', 'aria-labelledby': id });
  section.appendChild(el(headingLevel, { id, text: title }));
  const list = el('ul', { class: 'nutrition-bars' });
  for (const row of nutritionRows(totals, complete, targets)) {
    const li = el('li', { class: 'nutrition-row' });
    const amount = row.amount === null
      ? 'not recorded yet'
      : `${row.atLeast ? 'at least ' : ''}${row.amount.toLocaleString('en-GB')} ${row.unit}`;
    li.appendChild(el('span', { class: 'nutrition-name', text: row.label }));
    li.appendChild(el('span', { class: 'nutrition-amount', text: amount }));
    const bar = el('span', { class: 'nutrition-bar', 'aria-hidden': 'true' });
    const fill = el('span', { class: 'nutrition-bar-fill' });
    fill.style.width = `${Math.min(row.percent || 0, 100)}%`;
    bar.appendChild(fill);
    li.appendChild(bar);
    li.appendChild(el('span', { class: 'nutrition-percent', text: row.percent === null ? '' : `${row.percent}%` }));
    if (row.percent !== null) {
      li.appendChild(el('span', {
        class: 'visually-hidden',
        text: ` of a day's reference intake of ${row.target.toLocaleString('en-GB')} ${row.unit}`
      }));
    }
    list.appendChild(li);
  }
  section.appendChild(list);
  if (note) section.appendChild(el('p', { class: 'field-hint', text: note }));
  return section;
}
