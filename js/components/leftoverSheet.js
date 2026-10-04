// js/components/leftoverSheet.js — 04 Oct 2026 v2
// v2: `portions` prefills how many are left over (spare portions after cooking).
// Kitchen rebuild. "Plan the leftovers": put what is left of a meal onto
// a later lunch or dinner this week, in one tap.
//
// Used from the Plan board (a planned meal's panel) and from Today (the
// meal you are about to cook). A leftover entry is eaten, so it counts in
// that day's nutrition, but it is never bought or taken from the pantry
// again (data/mealPlan.js, lib/shortfall.js).
//
// Only offered once the database can store it (leftoversReady()); until
// migration 026 is applied, the button is not shown at all rather than
// shown and refused.

import { el } from '../lib/dom.js';
import { openDetailSheet } from './detailSheet.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { addPlanEntry, leftoverTargets, DAYS, SLOTS } from '../data/mealPlan.js';
import { requestListSync } from '../data/listSync.js';

const SLOT_WORDS = Object.fromEntries(SLOTS.map((s) => [s.value, s.label.toLowerCase()]));
const DAY_WORDS = Object.fromEntries(DAYS.map((d) => [d.value, d.label]));

/** "Tuesday lunch", for buttons and announcements. */
export function targetLabel(target) {
  return `${DAY_WORDS[target.day] || target.day} ${SLOT_WORDS[target.slot] || target.slot}`;
}

/**
 * @param {{ entry: object, entries: object[], weekStart: string,
 *           returnFocusTo?: Element, onAdded?: (row: object) => void, portions?: number }} opts
 */
export function openLeftoverSheet({ entry, entries = [], weekStart, returnFocusTo, onAdded, portions: spare = 2 }) {
  const meal = entry.meals || {};
  const name = meal.name || 'This meal';
  const targets = leftoverTargets(entries, entry);

  openDetailSheet({
    title: 'Plan the leftovers',
    subtitle: name,
    returnFocusTo,
    build(body, api) {
      if (targets.length === 0) {
        body.appendChild(el('p', {
          text: 'There are no lunches or dinners left this week after this one. Next week’s plan can take them.'
        }));
        return;
      }
      const portions = el('input', { type: 'number', id: 'leftover-portions', min: '1', max: '12', step: '1', inputmode: 'numeric' });
      portions.value = String(Math.max(1, Math.min(12, Math.round(Number(spare) || 2))));
      const field = el('div', { class: 'field' });
      field.append(el('label', { for: 'leftover-portions', text: 'Portions left over' }), portions);
      body.appendChild(field);

      body.appendChild(el('p', { class: 'field-hint', text: 'Choose when you will eat them. Nothing is added to the shopping list for leftovers.' }));
      const list = el('ul', { class: 'leftover-targets' });
      const status = el('p', { class: 'field-hint', role: 'status' });
      for (const target of targets) {
        const li = el('li');
        const others = entries.filter((e) => e.day_of_week === target.day && e.slot === target.slot)
          .map((e) => (e.meals && e.meals.name) || 'a meal');
        const b = el('button', { type: 'button', class: target.open ? 'btn leftover-target' : 'btn btn-quiet leftover-target' });
        b.appendChild(el('span', { class: 'leftover-target-when', text: targetLabel(target) }));
        b.appendChild(el('span', { class: 'field-hint', text: target.open ? 'Open' : `With ${others.join(', ')}` }));
        b.addEventListener('click', async () => {
          const n = Number(portions.value);
          if (!Number.isInteger(n) || n < 1 || n > 12) {
            status.textContent = 'Portions needs to be a whole number from 1 to 12.';
            portions.focus();
            return;
          }
          b.disabled = true;
          const result = await addPlanEntry({
            meal_id: entry.meal_id,
            day_of_week: target.day,
            slot: target.slot,
            week_start: weekStart || entry.week_start,
            serves_override: n,
            is_leftover: true
          });
          if (!result.ok) {
            b.disabled = false;
            status.textContent = (result.error && result.error.message) || 'That did not save. Try again.';
            return;
          }
          // Nothing to buy, but the list is rebuilt from the plan; asking it
          // to follow keeps the two in step all the same.
          requestListSync();
          const words = `${name} leftovers planned for ${targetLabel(target)}.`;
          showToast(words);
          announce(words);
          if (typeof onAdded === 'function') onAdded({ ...result.data, meals: meal, is_leftover: true });
          api.close();
        });
        li.appendChild(b);
        list.appendChild(li);
      }
      body.append(list, status);
    }
  });
}
