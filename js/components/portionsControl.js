// js/components/portionsControl.js — 04 Oct 2026 v1
// Kitchen rebuild. "Making 2 portions", with − and +, and the usual
// choices: just for us, double to freeze half, as the recipe says
// (data/portions.js). Saved on the plan entry as serves_override, so the
// shopping list and the pantry follow it.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { updatePlanEntry } from '../data/mealPlan.js';
import { requestListSync } from '../data/listSync.js';
import { entryPortions, portionChoices, portionWords, MAX_PORTIONS } from '../data/portions.js';

let counter = 0;

/**
 * @param {object} entry  a weekly_meal_plan row with meals embedded (changed in place)
 * @param {{ members?: object[], signal?: AbortSignal, onChange?: (n: number) => void }} [opts]
 */
export function portionsControl(entry, { members = [], signal, onChange } = {}) {
  counter += 1;
  const id = `portions-${counter}`;
  const on = (node, type, fn) => node.addEventListener(type, fn, signal ? { signal } : undefined);
  const name = (entry.meals && entry.meals.name) || 'this meal';
  const wrap = el('div', { class: 'portions', role: 'group', 'aria-labelledby': `${id}-label` });
  const row = el('div', { class: 'portions-row' });
  const minus = el('button', { type: 'button', class: 'btn btn-small portions-step', text: '−' });
  minus.setAttribute('aria-label', `One portion fewer of ${name}`);
  const value = el('span', { class: 'portions-value', id: `${id}-label` });
  const plus = el('button', { type: 'button', class: 'btn btn-small portions-step', text: '+' });
  plus.setAttribute('aria-label', `One portion more of ${name}`);
  row.append(minus, value, plus);
  wrap.appendChild(row);
  const chips = el('div', { class: 'portions-chips' });
  wrap.appendChild(chips);
  if (!members.length) {
    const hint = el('p', { class: 'field-hint portions-hint' });
    hint.appendChild(document.createTextNode('Add who eats in '));
    hint.appendChild(el('a', { href: '#/settings', text: 'Settings' }));
    hint.appendChild(document.createTextNode(' and meals start at the right size.'));
    wrap.appendChild(hint);
  }

  let saving = false;
  async function set(n) {
    const next = Math.max(1, Math.min(MAX_PORTIONS, Math.round(n)));
    if (saving || next === entryPortions(entry, members)) return;
    saving = true;
    const before = entry.serves_override;
    entry.serves_override = next;
    paint();
    const result = await updatePlanEntry(entry.id, { serves_override: next });
    saving = false;
    if (!result.ok) {
      entry.serves_override = before;
      paint();
      showToast('That did not save. Try again.');
      return;
    }
    requestListSync();
    announce(`Making ${portionWords(next)} of ${name}. The shopping list will follow.`);
    if (onChange) onChange(next);
  }

  function paint() {
    const n = entryPortions(entry, members);
    value.textContent = `Making ${portionWords(n)}`;
    minus.disabled = n <= 1;
    plus.disabled = n >= MAX_PORTIONS;
    chips.replaceChildren();
    for (const choice of portionChoices(entry, members)) {
      const b = el('button', { type: 'button', class: 'chip-toggle portions-chip', text: choice.label, 'aria-pressed': String(choice.value === n) });
      on(b, 'click', () => set(choice.value));
      chips.appendChild(b);
    }
  }
  on(minus, 'click', () => set(entryPortions(entry, members) - 1));
  on(plus, 'click', () => set(entryPortions(entry, members) + 1));
  paint();
  return wrap;
}
