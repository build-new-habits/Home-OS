// js/components/spareSheet.js — 04 Oct 2026 v1
// Kitchen rebuild. After cooking more than the people eating: what to do
// with the spare portions. The freezer (as a pantry item), a later meal
// this week (leftovers), or neither. Asked once, when the meal is done.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { openDetailSheet } from './detailSheet.js';
import { openLeftoverSheet } from './leftoverSheet.js';
import { leftoversReady } from '../data/mealPlan.js';
import { freezePortions } from '../data/homeMade.js';
import { portionWords } from '../data/portions.js';

/**
 * @param {{ entry: object, spare: number, entries?: object[], weekStart?: string,
 *           returnFocusTo?: Element, onLeftovers?: (row: object) => void }} opts
 */
export function openSpareSheet({ entry, spare, entries = [], weekStart, returnFocusTo, onLeftovers }) {
  const meal = entry.meals || {};
  const name = meal.name || 'This meal';
  openDetailSheet({
    title: `${portionWords(spare)} spare`,
    subtitle: name,
    returnFocusTo,
    build(body, api) {
      body.appendChild(el('p', { text: `You made more than the people eating it. What would you like to do with the ${spare === 1 ? 'spare portion' : `${spare} spare portions`}?` }));
      const status = el('p', { class: 'field-hint', role: 'status' });
      const row = el('div', { class: 'item-sheet-buttons spare-buttons' });
      const freeze = el('button', { type: 'button', class: 'btn btn-primary', text: 'Put in the freezer' });
      freeze.addEventListener('click', async () => {
        freeze.disabled = true;
        status.textContent = 'Saving…';
        const result = await freezePortions(meal, spare);
        if (!result.ok) {
          freeze.disabled = false;
          status.textContent = 'That did not save. Check your connection and try again.';
          return;
        }
        api.close();
        const words = `${portionWords(spare)} of ${name} in the freezer. ${result.data.portions === spare ? '' : `${result.data.portions} there now. `}They are in the pantry under Frozen.`;
        showToast(words.trim());
        announce(words.trim());
      });
      row.appendChild(freeze);
      if (leftoversReady()) {
        const later = el('button', { type: 'button', class: 'btn', text: 'Eat later this week', 'aria-haspopup': 'dialog' });
        later.addEventListener('click', () => {
          api.close();
          openLeftoverSheet({ entry, entries, weekStart: weekStart || entry.week_start, returnFocusTo, portions: spare, onAdded: onLeftovers });
        });
        row.appendChild(later);
      }
      const no = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Nothing for now' });
      no.addEventListener('click', () => api.close());
      row.appendChild(no);
      body.append(row, status);
    }
  });
}
