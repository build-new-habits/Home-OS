// js/components/eatenTick.js — 04 Oct 2026 v1
// Kitchen rebuild. The "Eaten" tick on a planned meal (data/eaten.js).
// A real checkbox with a visible label: the tick is the state, the word
// says what it means, so it never relies on colour or an icon alone.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { isEaten, setEaten } from '../data/eaten.js';

let counter = 0;

/**
 * @param {object} entry  a weekly_meal_plan row with meals embedded
 * @param {{ signal?: AbortSignal, onChange?: (on: boolean) => void }} [options]
 */
export function eatenTick(entry, { signal, onChange } = {}) {
  counter += 1;
  const id = `eaten-${counter}`;
  const name = (entry.meals && entry.meals.name) || 'this meal';
  const wrap = el('span', { class: 'eaten-tick' });
  const box = el('input', { type: 'checkbox', id });
  box.checked = isEaten(entry);
  const label = el('label', { for: id, text: 'Eaten' });
  label.appendChild(el('span', { class: 'visually-hidden', text: `: ${name}` }));
  wrap.append(box, label);
  box.addEventListener('change', async () => {
    const on = box.checked;
    box.disabled = true;
    const result = await setEaten(entry, on);
    box.disabled = false;
    if (!result.ok) {
      box.checked = !on;
      showToast('That did not save. Try again.');
      return;
    }
    announce(on ? `${name}: eaten.` : `${name}: not eaten.`);
    if (onChange) onChange(on);
  }, signal ? { signal } : undefined);
  return wrap;
}
