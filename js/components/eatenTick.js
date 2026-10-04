// js/components/eatenTick.js — 04 Oct 2026 v2
// v2: ticking takes the meal's ingredients out of the pantry, once (the
// same as "We cooked it"; data/pantryTaken.js), and offers any spare
// portions to the freezer; unticking puts them back.
// Kitchen rebuild. The "Eaten" tick on a planned meal (data/eaten.js).
// A real checkbox with a visible label: the tick is the state, the word
// says what it means, so it never relies on colour or an icon alone.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { isEaten, setEaten } from '../data/eaten.js';
import { isLeftover } from '../data/mealPlan.js';
import { wasTaken, planForEntry, takeForEntry, markTaken, putBack } from '../data/pantryTaken.js';
import { sparePortions } from '../data/portions.js';
import { openSpareSheet } from './spareSheet.js';

let counter = 0;

/**
 * Takes the meal's ingredients out of the pantry unless that has been done
 * (by an earlier tick or "We cooked it"), then offers spare portions.
 * @returns {Promise<string>} what happened, in words
 */
export async function useUpFor(entry, { members = [], entries = [], weekStart, returnFocusTo, onLeftovers } = {}) {
  if (isLeftover(entry) || wasTaken(entry.id)) return '';
  const plan = await planForEntry(entry, members);
  if (!plan.ok) return 'The pantry could not be read, so nothing was taken out.';
  let words = '';
  if (plan.data.length === 0) {
    markTaken(entry);
  } else {
    const done = await takeForEntry(entry, plan.data);
    words = done.ok
      ? `Pantry updated: ${done.applied} thing${done.applied === 1 ? '' : 's'} used.`
      : 'Some of the pantry did not update. Check it when you can.';
  }
  const spare = sparePortions(entry, members);
  if (spare > 0) openSpareSheet({ entry, spare, entries, weekStart, returnFocusTo, onLeftovers });
  return words;
}

/**
 * @param {object} entry  a weekly_meal_plan row with meals embedded
 * @param {{ signal?: AbortSignal, onChange?: (on: boolean) => void, members?: object[],
 *           entries?: object[], weekStart?: string, onLeftovers?: (row: object) => void }} [options]
 */
export function eatenTick(entry, { signal, onChange, members = [], entries = [], weekStart, onLeftovers } = {}) {
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
    if (!result.ok) {
      box.disabled = false;
      box.checked = !on;
      showToast('That did not save. Try again.');
      return;
    }
    let pantry = '';
    if (on) {
      pantry = await useUpFor(entry, { members, entries, weekStart, returnFocusTo: box, onLeftovers });
    } else if (wasTaken(entry.id)) {
      const back = await putBack(entry.id);
      pantry = back.ok && back.restored ? `Put back in the pantry: ${back.restored} thing${back.restored === 1 ? '' : 's'}.` : '';
    }
    box.disabled = false;
    const words = `${name}: ${on ? 'eaten' : 'not eaten'}.${pantry ? ` ${pantry}` : ''}`;
    if (pantry) showToast(words);
    announce(words);
    if (onChange) onChange(on);
  }, signal ? { signal } : undefined);
  return wrap;
}
