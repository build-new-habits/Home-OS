// js/components/drinksQuickAdd.js — 04 Oct 2026 v1
// Kitchen rebuild. One day's drinks: what has been had, and a chip per kind
// to add another in one tap (data/drinks.js). Used on the Plan panel and on
// Today.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { DRINKS, listDrinks, addDrink, removeDrink, tallyDrinks } from '../data/drinks.js';

let counter = 0;

/**
 * @param {{ weekStart: string, day: string, dayLabel?: string, signal?: AbortSignal, onChange?: () => void }} opts
 */
export function drinksQuickAdd({ weekStart, day, dayLabel = '', signal, onChange } = {}) {
  counter += 1;
  const uid = `drinks-${counter}`;
  const on = (node, type, fn) => node.addEventListener(type, fn, signal ? { signal } : undefined);
  const wrap = el('div', { class: 'drinks-quick' });
  const tally = el('ul', { class: 'drinks-tally', 'aria-label': `Drinks${dayLabel ? ` on ${dayLabel}` : ''}` });
  const none = el('p', { class: 'field-hint drinks-none', text: 'No drinks added yet.' });
  wrap.append(tally, none);

  wrap.appendChild(el('p', { class: 'drinks-add-title', id: `${uid}-add`, text: 'Add a drink' }));
  const chips = el('ul', { class: 'drinks-chips', 'aria-labelledby': `${uid}-add` });
  wrap.appendChild(chips);

  const otherRow = el('div', { class: 'drinks-other' });
  otherRow.hidden = true;
  const otherLabel = el('label', { for: `${uid}-other`, text: 'What was it?' });
  const otherInput = el('input', { type: 'text', id: `${uid}-other`, maxlength: '60', autocomplete: 'off' });
  const otherAdd = el('button', { type: 'button', class: 'btn btn-small', text: 'Add it' });
  otherRow.append(otherLabel, otherInput, otherAdd);
  wrap.appendChild(otherRow);

  const servings = el('details', { class: 'drinks-servings' });
  servings.appendChild(el('summary', { text: 'What each one counts as' }));
  const sl = el('ul');
  for (const d of DRINKS) sl.appendChild(el('li', { text: `${d.label}: ${d.serving}` }));
  servings.appendChild(sl);
  wrap.appendChild(servings);

  function changed(words) {
    paint();
    announce(words);
    if (onChange) onChange();
  }

  function add(kind, name = '') {
    const result = addDrink(weekStart, day, kind, name);
    if (!result.ok) { showToast('That did not save. Try again.'); return false; }
    const label = kind === 'other' ? (name || 'Something else') : DRINKS.find((d) => d.value === kind).label;
    changed(`${label} added.`);
    return true;
  }

  for (const d of DRINKS) {
    const li = el('li');
    const b = el('button', { type: 'button', class: 'chip-toggle drinks-chip', text: `+ ${d.label}` });
    b.setAttribute('aria-label', `Add ${d.value === 'other' ? 'another drink' : d.label.toLowerCase()}`);
    if (d.value === 'other') {
      b.setAttribute('aria-expanded', 'false');
      on(b, 'click', () => {
        otherRow.hidden = !otherRow.hidden;
        b.setAttribute('aria-expanded', String(!otherRow.hidden));
        if (!otherRow.hidden) otherInput.focus();
      });
    } else {
      on(b, 'click', () => add(d.value));
    }
    li.appendChild(b);
    chips.appendChild(li);
  }

  const addOther = () => {
    const name = otherInput.value.trim();
    if (!name) { otherInput.focus(); announce('Type what it was first.'); return; }
    if (add('other', name)) { otherInput.value = ''; otherInput.focus(); }
  };
  on(otherAdd, 'click', addOther);
  on(otherInput, 'keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addOther(); } });

  function paint() {
    const groups = tallyDrinks(listDrinks(weekStart, day));
    tally.replaceChildren();
    none.hidden = groups.length > 0;
    tally.hidden = groups.length === 0;
    for (const g of groups) {
      const li = el('li', { class: 'drinks-tally-row' });
      li.appendChild(el('span', { class: 'drinks-tally-name', text: g.count > 1 ? `${g.label} ×${g.count}` : g.label }));
      const minus = el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Take one off' });
      minus.setAttribute('aria-label', `Take one ${g.label.toLowerCase()} off`);
      on(minus, 'click', () => {
        const result = removeDrink(weekStart, day, { kind: g.kind, name: g.name });
        if (!result.ok) { showToast('That did not save. Try again.'); return; }
        changed(`One ${g.label.toLowerCase()} taken off.`);
        // The row may be gone; keep focus inside the drinks.
        const first = wrap.querySelector('.drinks-chip');
        if (!wrap.contains(document.activeElement) && first) first.focus();
      });
      li.appendChild(minus);
      tally.appendChild(li);
    }
  }
  paint();
  return wrap;
}
