// js/components/itemSheet.js — 03 Oct 2026 v2
// v2: ideasSection() exported for the pantry's own sheet.
// Kitchen rebuild. One thing in your cupboard, and everything you might
// want to do with it, in one place.
//
// ---- Why ----
// Device feedback, 3 Oct 2026: from "worth using up" you could see a thing
// but not act on it. A new one came in, or it went in the bin, and saying
// so meant leaving Today and finding it again behind the pantry's doors.
// Wherever a pantry item appears, tapping it opens this.
//
// ---- What it offers ----
//   A new one is in      restocked today, with the new use-by if you have it
//   Used it up / Threw it away   off the pantry, optionally onto the list
//   Where it lives, use by       edit in place
//   Recipes that use it          library recipes with it in
//   Use it instead of…           recipes it could stand in for (data/swaps.js)
//
// Nothing here is a verdict. Throwing food away is a fact to record, not a
// failure to be told about (behavioural principle 1).

import { el } from '../lib/dom.js';
import { openDetailSheet } from './detailSheet.js';
import { showToast } from './toast.js';
import { announce } from '../lib/a11y.js';
import { updateStock, removeStock, freshness, describeFreshness, todayIso } from '../data/pantry.js';
import { addItem } from '../data/shopping.js';
import { loadAllRecipes } from '../data/recipeLibrary.js';
import { lookup, referenceBySlug } from '../data/foodReference.js';
import { ideasFor } from '../data/swaps.js';

export const COMMON_PLACES = ['Fridge', 'Freezer', 'Cupboard', 'Fruit bowl', 'Bread bin', 'Spice rack'];

function recipeLink(recipe) {
  return el('a', { href: `#/recipe?r=${encodeURIComponent(recipe.slug)}`, text: recipe.name });
}

/**
 * @param {object} row  a pantry_stock row with `foods` embedded
 * @param {{ returnFocusTo?: Element, places?: string[], onChanged?: () => void }} opts
 *   onChanged runs once, after the sheet closes, if anything was saved.
 */
export function openItemSheet(row, { returnFocusTo, places = [], onChanged } = {}) {
  const food = row.foods || {};
  const name = food.name || 'This item';
  let changed = false;

  openDetailSheet({
    title: name,
    subtitle: describeFreshness(freshness(row, todayIso())),
    returnFocusTo,
    onClose() { if (changed && typeof onChanged === 'function') onChanged(); },
    build(body, api) {
      const say = (message) => { announce(message); showToast(message); };

      // ---- A new one is in -------------------------------------------
      const fresh = el('section', { class: 'item-sheet-section', 'aria-labelledby': 'item-new-h' });
      fresh.appendChild(el('h3', { id: 'item-new-h', text: 'A new one is in' }));
      const newDate = el('input', { type: 'date', id: 'item-new-useby' });
      const newLabel = el('label', { for: 'item-new-useby', text: 'Use by on the new one (if it has one)' });
      const newBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Save the new one' });
      newBtn.addEventListener('click', async () => {
        newBtn.disabled = true;
        const result = await updateStock(row.id, { last_restocked: todayIso(), use_by: newDate.value || null });
        newBtn.disabled = false;
        if (!result.ok) { showToast('That did not save. Try again.'); return; }
        changed = true;
        say(`${name}: new one saved.`);
        api.close();
      });
      fresh.append(newLabel, newDate, newBtn);
      body.appendChild(fresh);

      // ---- It has gone -------------------------------------------------
      const gone = el('section', { class: 'item-sheet-section', 'aria-labelledby': 'item-gone-h' });
      gone.appendChild(el('h3', { id: 'item-gone-h', text: 'It has gone' }));
      const relistRow = el('div', { class: 'checkbox-row' });
      const relist = el('input', { type: 'checkbox', id: 'item-relist' });
      relist.checked = true;
      relistRow.append(relist, el('label', { for: 'item-relist', text: 'Put it on the shopping list' }));
      gone.appendChild(relistRow);
      const goneButtons = el('div', { class: 'item-sheet-buttons' });
      for (const [label, words] of [['Used it up', 'used up'], ['Threw it away', 'thrown away']]) {
        const b = el('button', { type: 'button', class: 'btn', text: label });
        b.addEventListener('click', async () => {
          b.disabled = true;
          const removed = await removeStock(row.id);
          if (!removed.ok) { b.disabled = false; showToast('That did not save. Try again.'); return; }
          changed = true;
          let message = `${name} ${words}.`;
          if (relist.checked && row.food_id) {
            const added = await addItem({ food_id: row.food_id, qty_needed: null, unit: 'item', source: 'usual' });
            message += added.ok ? ' Added to the shopping list.' : ' It could not be added to the list.';
          }
          say(message);
          api.close();
        });
        goneButtons.appendChild(b);
      }
      gone.appendChild(goneButtons);
      body.appendChild(gone);

      // ---- Where it lives, use by ----------------------------------------
      const edit = el('section', { class: 'item-sheet-section', 'aria-labelledby': 'item-edit-h' });
      edit.appendChild(el('h3', { id: 'item-edit-h', text: 'Details' }));
      const listId = 'item-places';
      const placeList = el('datalist', { id: listId });
      for (const p of [...new Set([...places, ...COMMON_PLACES])]) placeList.appendChild(el('option', { value: p }));
      const place = el('input', { type: 'text', id: 'item-place', list: listId, autocomplete: 'off' });
      place.value = row.default_location || '';
      const useBy = el('input', { type: 'date', id: 'item-useby' });
      useBy.value = row.use_by || '';
      const saveBtn = el('button', { type: 'button', class: 'btn', text: 'Save details' });
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        const result = await updateStock(row.id, { default_location: place.value, use_by: useBy.value || null });
        saveBtn.disabled = false;
        if (!result.ok) { showToast('That did not save. Try again.'); return; }
        changed = true;
        say(`${name}: details saved.`);
      });
      edit.append(
        el('label', { for: 'item-place', text: 'Where it lives' }), place, placeList,
        el('label', { for: 'item-useby', text: 'Use by' }), useBy,
        saveBtn
      );
      body.appendChild(edit);

      body.appendChild(ideasSection(name));
    }
  });
}


/**
 * "Ways to use it": recipes that use this food, and recipes it could stand
 * in for (data/swaps.js). Its own export so the pantry's fuller sheet can
 * offer the same ideas without a second copy of this code.
 */
export function ideasSection(name) {
  const ideas = el('section', { class: 'item-sheet-section', 'aria-labelledby': 'item-ideas-h' });
  ideas.appendChild(el('h3', { id: 'item-ideas-h', text: 'Ways to use it' }));
  const ideasBody = el('div', { 'aria-live': 'polite' });
  ideasBody.appendChild(el('p', { class: 'field-hint', text: 'Looking for recipes…' }));
  ideas.appendChild(ideasBody);

  (async () => {
    const [library, refMap, entry] = await Promise.all([
      loadAllRecipes(), referenceBySlug(), lookup(name).catch(() => null)
    ]);
    ideasBody.replaceChildren();
    if (!library.ok || !entry) {
      ideasBody.appendChild(el('p', { class: 'field-hint', text: 'No recipe ideas for this one yet.' }));
      return;
    }
    const { uses, swaps } = ideasFor(entry.slug, library.data, refMap);
    if (uses.length === 0 && swaps.length === 0) {
      ideasBody.appendChild(el('p', { class: 'field-hint', text: 'No recipe ideas for this one yet.' }));
      return;
    }
    if (uses.length) {
      ideasBody.appendChild(el('p', { class: 'item-ideas-title', text: 'Recipes that use it' }));
      const ul = el('ul', { class: 'item-ideas' });
      for (const r of uses.slice(0, 5)) { const li = el('li'); li.appendChild(recipeLink(r)); ul.appendChild(li); }
      ideasBody.appendChild(ul);
    }
    if (swaps.length) {
      ideasBody.appendChild(el('p', { class: 'item-ideas-title', text: `Use it instead of something else` }));
      const ul = el('ul', { class: 'item-ideas' });
      for (const s of swaps.slice(0, 5)) {
        const li = el('li');
        li.appendChild(recipeLink(s.recipe));
        li.appendChild(el('span', { class: 'field-hint', text: s.tip }));
        ul.appendChild(li);
      }
      ideasBody.appendChild(ul);
    }
  })().catch(() => {
    ideasBody.replaceChildren(el('p', { class: 'field-hint', text: 'Recipe ideas could not be loaded.' }));
  });
  return ideas;
}
