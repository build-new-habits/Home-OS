// js/views/plate.js — 05 Oct 2026 v1
// (the running total is pinned to the top, in view while you tick)
// v1: Make a plate (#/plate). Tick what goes on it, choose how much, and
// the nutrition adds up as you go. Save makes it one of your meals, so it
// can be planned, shopped for and counted like any other.
// Graeme, 5 Oct 2026: boiled eggs, carrot sticks, mangetout, baby corn,
// spinach, olives: "the option of being able to compile a concoction of
// crudités". The portions and the save live in data/plate.js.

import { el, selectFrom } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { referenceBySlug } from '../data/foodReference.js';
import { listFoods } from '../data/foods.js';
import { recipeNutrition } from '../data/nutrition.js';
import { buildNameIndex, resolveName, saveDraft } from '../data/ownRecipe.js';
import { PLATE_GROUPS, amountWords, extraItem, plateRecipe, plateDraft } from '../data/plate.js';

const KINDS = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snack' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'dinner', label: 'Dinner' }
];
const NOT_FOOD = new Set(['household', 'personal', 'pet', 'home']);

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/library', text: 'Recipes' }));
  mountEl.appendChild(el('h1', { text: 'Make a plate' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Tick what goes on it and choose how much. The nutrition adds up as you go. Save it, and it becomes one of your meals, ready to plan.'
  }));
  const body = el('div', { class: 'plate' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Getting things ready…' }));
  mountEl.appendChild(body);

  (async () => {
    const [refMap, foods] = await Promise.all([
      referenceBySlug().catch(() => new Map()),
      listFoods().catch(() => ({ ok: false }))
    ]);
    if (destroyed) return;
    body.replaceChildren();
    const index = buildNameIndex([...refMap.values()], foods && foods.ok ? foods.data || [] : []);

    // ref -> { item, box, select }
    const rows = new Map();
    let extraCount = 0;

    function addRow(container, item, idPrefix) {
      const id = `${idPrefix}-${item.ref}`;
      const row = el('div', { class: 'plate-row' });
      const tick = el('div', { class: 'checkbox-row' });
      const box = el('input', { type: 'checkbox', id, value: item.ref });
      tick.append(box, el('label', { for: id, text: item.label }));
      const select = el('select', { id: `${id}-amount`, class: 'plate-amount', 'aria-label': `How much ${item.label.toLowerCase()}` });
      for (const n of [1, 2, 3, 4]) select.appendChild(el('option', { value: String(n), text: amountWords(item, n) }));
      select.hidden = true;
      row.append(tick, select);
      container.appendChild(row);
      rows.set(item.ref, { item, box, select });
      box.addEventListener('change', () => { select.hidden = !box.checked; changed(); }, { signal });
      select.addEventListener('change', changed, { signal });
      return box;
    }

    // The running total, pinned to the top while you tick: a readout, and
    // the top is the one edge the bottom nav never covers.
    const running = el('div', { class: 'plate-running' });
    const runningText = el('p', { class: 'plate-running-text', role: 'status' });
    const jump = el('a', { class: 'btn btn-small', href: '#plate-total-h', text: 'Nutrition and save' });
    jump.addEventListener('click', (e) => {
      e.preventDefault();
      const h = document.getElementById('plate-total-h');
      if (h) { h.setAttribute('tabindex', '-1'); h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); }
    }, { signal });
    running.append(runningText, jump);
    body.appendChild(running);
    for (const [g, group] of PLATE_GROUPS.entries()) {
      const set = el('fieldset', { class: 'plate-group' });
      set.appendChild(el('legend', { text: group.title }));
      for (const item of group.items) {
        if (!refMap.has(item.ref)) continue;
        addRow(set, item, `plate-${g}`);
      }
      body.appendChild(set);
    }

    // ---- Anything else, from every food the app knows ----
    const more = el('fieldset', { class: 'plate-group' });
    more.appendChild(el('legend', { text: 'Something else' }));
    const extras = el('div', { class: 'plate-extras' });
    const findId = 'plate-find';
    const find = el('input', { type: 'text', id: findId, list: 'plate-food-names', autocomplete: 'off', 'aria-describedby': 'plate-find-hint' });
    const names = el('datalist', { id: 'plate-food-names' });
    for (const entry of refMap.values()) {
      if (NOT_FOOD.has(entry.category) || entry.calories_per_100g === null || entry.calories_per_100g === undefined) continue;
      names.appendChild(el('option', { value: entry.name }));
    }
    const findWrap = el('div', { class: 'field' });
    findWrap.append(el('label', { for: findId, text: 'Add a food' }), find, names,
      el('p', { class: 'field-hint', id: 'plate-find-hint', text: 'Start typing, for example "sun-dried tomatoes" or "pork pie".' }));
    const addBtn = el('button', { type: 'button', class: 'btn', text: 'Add it' });
    const findStatus = el('p', { class: 'field-hint', role: 'status' });
    more.append(findWrap, addBtn, findStatus, extras);
    body.appendChild(more);

    function addExtra() {
      const typed = find.value.trim();
      if (!typed) { findStatus.textContent = 'Type a food first.'; find.focus(); return; }
      const hit = resolveName(typed, index);
      const entry = hit && hit.ref ? refMap.get(hit.ref) : null;
      if (!entry) {
        findStatus.textContent = `No match for "${typed}". Pick one of the suggestions, or try another word.`;
        find.focus();
        return;
      }
      if (rows.has(entry.slug)) {
        const existing = rows.get(entry.slug);
        existing.box.checked = true;
        existing.select.hidden = false;
        changed();
        findStatus.textContent = `${existing.item.label} is ticked.`;
        existing.box.focus();
        return;
      }
      extraCount += 1;
      const box = addRow(extras, extraItem(entry), `plate-x${extraCount}`);
      box.checked = true;
      rows.get(entry.slug).select.hidden = false;
      find.value = '';
      findStatus.textContent = `${entry.name} added and ticked.`;
      changed();
    }
    addBtn.addEventListener('click', addExtra, { signal });
    find.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }, { signal });

    // ---- The total ----
    const summary = el('section', { class: 'plate-summary', 'aria-labelledby': 'plate-total-h' });
    summary.appendChild(el('h2', { id: 'plate-total-h', text: 'On your plate' }));
    const count = el('p', { class: 'plate-count' });
    const bars = el('div');
    summary.append(count, bars);
    body.appendChild(summary);

    // ---- Save ----
    const save = el('section', { class: 'plate-save', 'aria-labelledby': 'plate-save-h' });
    save.appendChild(el('h2', { id: 'plate-save-h', text: 'Keep it' }));
    const nameInput = el('input', { type: 'text', id: 'plate-name', autocomplete: 'off', maxlength: '80', value: 'My plate' });
    const kindSelect = selectFrom('plate-kind', KINDS);
    const nameField = el('div', { class: 'field' });
    nameField.append(el('label', { for: 'plate-name', text: 'What to call it' }), nameInput);
    const kindField = el('div', { class: 'field' });
    kindField.append(el('label', { for: 'plate-kind', text: 'Kind of meal' }), kindSelect);
    const saveBtn = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Save to my meals' });
    const saveStatus = el('p', { class: 'field-hint', role: 'status' });
    save.append(nameField, kindField, saveBtn, saveStatus);
    body.appendChild(save);

    function chosen() {
      return [...rows.values()].filter((r) => r.box.checked)
        .map((r) => ({ item: r.item, portions: Number(r.select.value) || 1 }));
    }

    function changed() {
      const picked = chosen();
      bars.replaceChildren();
      if (!picked.length) {
        count.textContent = 'Nothing on it yet.';
        runningText.textContent = 'Nothing on your plate yet.';
        return;
      }
      const result = recipeNutrition(plateRecipe(picked), refMap);
      const kcal = result.perServing && result.perServing.calories;
      const things = picked.length === 1 ? '1 thing' : `${picked.length} things`;
      count.textContent = kcal === null || kcal === undefined ? things : `${things}, about ${Math.round(kcal)} kcal.`;
      runningText.textContent = `On your plate: ${count.textContent.charAt(0).toLowerCase()}${count.textContent.slice(1)}`;
      bars.appendChild(nutritionBars({
        id: 'plate-nutrition-h', title: 'Nutrition', headingLevel: 'h3',
        totals: result.perServing, complete: result.complete,
        note: 'An estimate, from published averages. Percentages are of a day’s UK adult reference intake.'
      }));
    }
    changed();

    saveBtn.addEventListener('click', async () => {
      const picked = chosen();
      if (!picked.length) {
        saveStatus.textContent = 'Tick at least one thing first.';
        return;
      }
      saveBtn.disabled = true;
      saveStatus.textContent = 'Saving…';
      const draft = plateDraft(picked, { name: nameInput.value, kind: kindSelect.value, refMap });
      const result = await saveDraft(draft, index);
      if (destroyed) return;
      saveBtn.disabled = false;
      if (!result.ok) {
        console.error('Saving a plate failed:', result.error);
        saveStatus.textContent = 'That did not save. Your ticks are still here. Check your connection and try again.';
        return;
      }
      saveStatus.textContent = '';
      showToast(`${result.data.name} saved to your meals.`);
      announce(`${result.data.name} saved to your meals.`);
      window.location.hash = `#/recipe?m=${encodeURIComponent(result.data.id)}`;
    }, { signal });
  })().catch((error) => {
    console.error('Make a plate failed:', error);
    if (!destroyed) body.replaceChildren(el('p', { text: 'Something went wrong. Check your connection and try again.' }));
  });

  return () => { destroyed = true; controller.abort(); };
}
