// js/components/shelfPicker.js — 04 Oct 2026 v1
// Kitchen rebuild. "What kind of thing is this?" — one select, saved as
// soon as it changes. Used wherever a pantry item can be edited.
//
// Most things are filed for you (data/shelves.js). This is the way to put
// right the ones that were not: tofu you think of as dairy-free protein,
// a jar you keep with the snacks.

import { el } from '../lib/dom.js';
import { SHELVES } from '../data/shelves.js';
import { shelfFor, setShelf } from '../data/foodShelves.js';
import { announce } from '../lib/a11y.js';

let seq = 0;

/**
 * @param {object} food  needs id and name
 * @param {{ onChanged?: (shelf: string) => void }} opts
 * @returns {HTMLElement} a labelled field
 */
export function shelfPicker(food, { onChanged } = {}) {
  seq += 1;
  const id = `shelf-pick-${seq}`;
  const wrap = el('div', { class: 'field shelf-picker' });
  const select = el('select', { id });
  for (const s of SHELVES) select.appendChild(el('option', { value: s.value, text: s.label }));
  select.value = shelfFor(food);
  const status = el('p', { class: 'field-hint', role: 'status' });
  wrap.append(el('label', { for: id, text: 'Kind' }), select, status);
  select.addEventListener('change', async () => {
    const result = await setShelf(food.id, select.value);
    if (!result.ok) {
      status.textContent = 'That did not save. Try again.';
      select.value = shelfFor(food);
      return;
    }
    const label = select.options[select.selectedIndex].text;
    status.textContent = result.where === 'phone'
      ? `Filed under ${label} on this phone.`
      : `Filed under ${label}.`;
    announce(status.textContent);
    if (typeof onChanged === 'function') onChanged(select.value);
  });
  return wrap;
}
