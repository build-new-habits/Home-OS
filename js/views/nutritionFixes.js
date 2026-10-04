// js/views/nutritionFixes.js — 04 Oct 2026 v1
// v1: Nutrition filled in. What the automatic pass (data/nutritionRepair.js)
// gave figures to, each with a Change button, and the few foods it could
// not match, each with Find nutrition. Reached from a note on Today and
// from Settings. Running it again is one button.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { readLog, markFixesSeen, repairNutrition, foodsWithoutNutrition } from '../data/nutritionRepair.js';
import { openNutritionFinder } from '../components/nutritionFinder.js';

export function render(mountEl) {
  let destroyed = false;
  markFixesSeen();

  mountEl.appendChild(el('h1', { class: 'shop-title', text: 'Nutrition filled in' }));
  mountEl.appendChild(el('p', { class: 'shop-summary', text: 'Foods with no nutrition are matched once a day: first to the app’s own everyday foods, then to the UK food tables (McCance and Widdowson), only where the name matches clearly. Anything unclear waits for you.' }));
  const status = el('p', { class: 'field-hint', role: 'status', 'aria-live': 'polite' });
  mountEl.appendChild(status);

  const again = el('button', { type: 'button', class: 'btn btn-block', text: 'Check every food now' });
  mountEl.appendChild(again);

  const leftSection = el('section', { class: 'fixes-section', 'aria-labelledby': 'fixes-left-h' });
  leftSection.appendChild(el('h2', { id: 'fixes-left-h', text: 'Waiting for a match' }));
  const leftList = el('ul', { class: 'fixes-list' });
  leftSection.appendChild(leftList);
  mountEl.appendChild(leftSection);

  const doneSection = el('section', { class: 'fixes-section', 'aria-labelledby': 'fixes-done-h' });
  doneSection.appendChild(el('h2', { id: 'fixes-done-h', text: 'Filled in' }));
  const doneList = el('ul', { class: 'fixes-list' });
  doneSection.appendChild(doneList);
  mountEl.appendChild(doneSection);

  function paintDone() {
    const log = readLog().slice().reverse();
    doneList.replaceChildren();
    if (!log.length) doneList.appendChild(el('li', { class: 'field-hint', text: 'Nothing yet.' }));
    log.forEach((entry, i) => {
      const li = el('li', { class: 'fixes-row' });
      const text = el('div', { class: 'fixes-text' });
      text.append(
        el('span', { class: 'fixes-name', text: entry.name }),
        el('span', { class: 'fixes-detail', text: `Counted as ${entry.matched}, ${Math.round(entry.kcal)} kcal per 100 g${entry.via === 'tables' ? ' (UK food tables)' : ''}` })
      );
      const change = el('button', { type: 'button', class: 'btn btn-small', text: 'Change', 'aria-haspopup': 'dialog' });
      change.setAttribute('aria-label', `Change what ${entry.name} counts as`);
      change.id = `fix-done-${i}`;
      change.addEventListener('click', () => openNutritionFinder({
        name: entry.name, foodId: entry.foodId, returnFocusTo: change,
        onSaved: (food) => {
          const log2 = readLog();
          const hit = log2.find((x) => x.foodId === entry.foodId);
          if (hit) { hit.matched = '(your choice)'; hit.kcal = food.calories_per_100g; hit.via = 'you'; }
          try { localStorage.setItem('home-os-nutrition-fixes', JSON.stringify(log2)); } catch { /* fine */ }
          paintDone();
        }
      }));
      li.append(text, change);
      doneList.appendChild(li);
    });
  }

  async function paintLeft() {
    const missing = await foodsWithoutNutrition();
    if (destroyed) return;
    leftList.replaceChildren();
    if (!missing.ok) { leftList.appendChild(el('li', { class: 'field-hint', text: 'Your foods could not be read. Check your connection.' })); return; }
    if (!missing.data.length) { leftList.appendChild(el('li', { class: 'field-hint', text: 'None. Every food has its nutrition.' })); return; }
    missing.data.forEach((food, i) => {
      const li = el('li', { class: 'fixes-row' });
      li.appendChild(el('span', { class: 'fixes-name', text: food.name }));
      const find = el('button', { type: 'button', class: 'btn btn-small', text: 'Find nutrition', 'aria-haspopup': 'dialog' });
      find.setAttribute('aria-label', `Find nutrition for ${food.name}`);
      find.id = `fix-left-${i}`;
      find.addEventListener('click', () => openNutritionFinder({
        name: food.name, foodId: food.id, itemLabel: food.item_label, gramsPerItem: food.grams_per_item, returnFocusTo: find,
        onSaved: () => { paintLeft(); }
      }));
      li.appendChild(find);
      leftList.appendChild(li);
    });
  }

  again.addEventListener('click', async () => {
    again.disabled = true;
    status.textContent = 'Checking every food…';
    const result = await repairNutrition({ force: true });
    again.disabled = false;
    if (destroyed) return;
    const words = result.ok
      ? `${result.fixed.length} filled in; ${result.left.length} waiting for a match.`
      : 'Your foods could not be read. Check your connection.';
    status.textContent = words;
    announce(words);
    markFixesSeen();
    paintDone();
    paintLeft();
  });

  paintDone();
  paintLeft();
  return () => { destroyed = true; };
}
