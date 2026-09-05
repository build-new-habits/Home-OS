// js/views/meals/cookNow.js — 01 Sep 2026 v1
// Worklist G1, second extraction. "What could I make?"
//
// Same shape as library.js: this module owns its DOM and its own filter
// state, and is TOLD the data rather than reaching for it. The parent holds
// meals, ingredients and pantry stock because three other features need
// them, so passing them in on update() keeps one owner rather than two
// copies that can disagree.

import { el } from '../../lib/dom.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
import { addItem } from '../../data/shopping.js';
import {
  scoreMeals, filterByIngredient, describeGaps, describeAssumptions,
  gapsToShoppingItems, BAND
} from '../../data/pantryMatch.js';

/**
 * @param {{ signal: AbortSignal, isDestroyed: () => boolean }} options
 */
export function createCookNowPanel({ signal, isDestroyed }) {
  const destroyed = () => isDestroyed();

  let meals = [];
  let ingredientsByMeal = new Map();
  // null until the first read, so the panel can say "reading" rather than
  // claiming an empty cupboard.
  let pantryStock = null;
  let rotationMode = false;

  // Above the full list, because "what can I make tonight" is the question
  // people actually arrive with; browsing every recipe is the rarer one.
  const section = el('section', { class: 'cook-now' });
  section.appendChild(el('h3', { text: 'What could I make?' }));

  const searchInput = el('input', {
    id: 'cook-search', type: 'search', placeholder: 'salmon, chickpeas…'
  });
  const searchWrap = el('div', { class: 'field' });
  searchWrap.append(
    el('label', { for: searchInput.id, text: 'Search by an ingredient you have' }),
    searchInput
  );
  section.appendChild(searchWrap);

  const results = el('div', { class: 'cook-results' });
  section.appendChild(results);

  searchInput.addEventListener('input', () => render(), { signal });

  /** Told the data, never reaching for it. */
  function update(next = {}) {
    if (next.meals !== undefined) meals = next.meals;
    if (next.ingredientsByMeal !== undefined) ingredientsByMeal = next.ingredientsByMeal;
    if (next.pantryStock !== undefined) pantryStock = next.pantryStock;
    if (next.rotationMode !== undefined) rotationMode = next.rotationMode;
    render();
  }

function render() {
  results.replaceChildren();

  // Worklist E3. Tom eats a rotation of six meals deliberately. For
  // somebody whose routine is the point, "you could cook these right
  // now" is not helpfulness, it is noise.
  //
  // The section hides entirely rather than emptying: a heading with
  // nothing under it is its own kind of clutter.
  if (rotationMode) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  if (pantryStock === null) {
    results.appendChild(el('p', { class: 'field-hint', text: 'Reading your cupboard…' }));
    return;
  }

  const scored = filterByIngredient(
    scoreMeals(meals, ingredientsByMeal, pantryStock),
    searchInput.value
  );

  if (scored.length === 0) {
    results.appendChild(el('p', {
      class: 'field-hint',
      text: searchInput.value.trim().length >= 2
        ? 'No recipes use that. Try another ingredient.'
        : 'Add ingredients to a recipe and this will tell you what you could cook.'
    }));
    return;
  }

  const bands = [
    { key: BAND.READY, label: 'Ready now', open: true },
    { key: BAND.NEARLY, label: 'Nearly there', open: true },
    // Collapsed: if it needs three or more things it is a shopping trip,
    // not a decision about tonight.
    { key: BAND.SHOP, label: 'Needs a shop', open: false }
  ];

  for (const band of bands) {
    const entries = scored.filter((e) => e.band === band.key);
    if (entries.length === 0) continue;

    const details = el('details', { class: `cook-band cook-band-${band.key}` });
    details.open = band.open;
    details.appendChild(el('summary', {
      text: `${band.label} (${entries.length})`
    }));

    const list = el('ul', { class: 'cook-band-list' });
    for (const entry of entries) list.appendChild(buildCookRow(entry));
    details.appendChild(list);
    results.appendChild(details);
  }
}


function buildCookRow(entry) {
  const item = el('li', { class: 'cook-row' });
  item.appendChild(el('span', { class: 'cook-row-name', text: entry.meal.name }));
  item.appendChild(el('span', { class: 'cook-row-gaps', text: describeGaps(entry) }));

  // An unrecorded amount is stated as an assumption the app is making,
  // never as something you failed to do.
  const assumption = describeAssumptions(entry);
  if (assumption) {
    item.appendChild(el('span', { class: 'cook-row-assumption', text: assumption }));
  }

  if (entry.gaps > 0) {
    const add = el('button', {
      type: 'button', class: 'btn btn-small', text: 'Add what is missing to the shopping list'
    });
    add.addEventListener('click', async () => {
      add.disabled = true;
      const items = gapsToShoppingItems(entry);
      let failed = 0;
      for (const line of items) {
        const result = await addItem(line);
        if (!result.ok) failed += 1;
      }
      add.disabled = false;
      if (destroyed()) return;
      showToast(failed === 0
        ? `${items.length} item${items.length === 1 ? '' : 's'} added to your shopping list.`
        : `${items.length - failed} of ${items.length} added. Check your connection.`);
      announce(`Added to your shopping list.`);
    }, { signal });
    item.appendChild(add);
  }

  return item;
}


  return { section, update };
}
