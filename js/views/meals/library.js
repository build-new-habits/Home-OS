// js/views/meals/library.js — 01 Sep 2026 v1
// Worklist G1, first extraction. The recipe library panel.
//
// ---- Why this one first ----
// meals.js is 2,421 lines holding seven features, and the note from Phase
// 29 stands: splitting it means threading a context object through
// everything, which is a large mechanical change with real regression risk.
//
// So it is done one feature at a time, smallest coupling first, with the
// gates run between each. The library was the obvious start: it touches
// four pieces of state that nothing else reads.
//
// ---- The interface ----
// This module owns its own DOM and its own state. The parent gives it three
// things it genuinely cannot know — whether the view has been torn down, an
// abort signal, and what to do after a recipe is added — and gets back a
// section to append. No shared mutable state crosses the boundary, which is
// the whole point: a context object full of `let` would have moved the
// tangle rather than removed it.

import { el } from '../../lib/dom.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
import {
  loadAllRecipes, filterRecipes, existingLibraryRefs, addLibraryRecipe, describeAdd
} from '../../data/recipeLibrary.js';

/**
 * @param {{
 *   signal: AbortSignal,
 *   isDestroyed: () => boolean,
 *   onAdded: () => Promise<void>
 * }} options
 */
export function createLibraryPanel({ signal, isDestroyed, onAdded }) {
  let libraryRecipes = [];
  let libraryOwned = new Map();
  let libraryLoaded = false;
  const libraryFilters = { term: '', cuisine: '', budget_tier: '', default_slot: '', dietary: [] };
  const libraryList = el('ul', { class: 'library-list' });

  const destroyed = () => isDestroyed();

  // ---- Position, corrected in the A1 pass ----
  // This was built last on the page, after the add-meal form, behind a
  // collapsed <details>. A hundred recipes were in there and the person who
  // commissioned them could not find them.
  //
  // "A place you visit occasionally" was wrong in both directions: browsing
  // is far more common than writing a recipe from scratch, and
  // "occasionally" is a reason to LABEL something well, not to bury it.
  const section = el('section', { class: 'library-section' });
  section.appendChild(el('h3', { text: 'Recipe library' }));
  section.appendChild(el('p', {
    class: 'field-hint',
    text: 'A hundred recipes that come with the app. Add any of them to your meals '
      + 'in one tap — the ingredients and steps come with it.'
  }));

  const libraryDetails = el('details');
  const librarySummary = el('summary', { text: 'Browse the recipe library' });
  libraryDetails.appendChild(librarySummary);
  const libraryBody = el('div', { class: 'library-body' });
  libraryDetails.appendChild(libraryBody);
  section.appendChild(libraryDetails);

  libraryDetails.addEventListener('toggle', () => {
    // Loaded on first open, never before: fetching several cuisine files on
    // page load would cost bandwidth for a panel most visits never open.
    if (libraryDetails.open && !libraryLoaded) {
      libraryLoaded = true;
      loadLibrary();
    }
  }, { signal });

async function loadLibrary() {
  libraryBody.replaceChildren(el('p', { class: 'field-hint', text: 'Loading recipes…' }));

  const [recipes, owned] = await Promise.all([loadAllRecipes(), existingLibraryRefs()]);
  if (destroyed()) return;

  if (!recipes.ok) {
    libraryBody.replaceChildren(el('p', {
      class: 'field-hint',
      text: 'The recipe library could not be loaded. Check your connection and reopen this.'
    }));
    libraryLoaded = false;
    return;
  }

  libraryRecipes = recipes.data;
  libraryOwned = owned.ok ? owned.data : new Map();
  librarySummary.textContent = `Browse the recipe library (${libraryRecipes.length})`;
  renderLibrary();
}


function renderLibrary() {
  libraryBody.replaceChildren();

  const filterRow = el('div', { class: 'library-filters' });

  const search = el('input', { id: 'library-search', type: 'search', placeholder: 'name or ingredient' });
  search.value = libraryFilters.term;
  const searchWrap = el('div', { class: 'field' });
  searchWrap.append(el('label', { for: search.id, text: 'Search' }), search);
  search.addEventListener('input', () => {
    libraryFilters.term = search.value;
    renderLibraryList();
  }, { signal });
  filterRow.appendChild(searchWrap);

  const cuisines = [...new Set(libraryRecipes.map((r) => r.cuisine))].sort();
  filterRow.appendChild(buildLibrarySelect('Cuisine', 'cuisine',
    cuisines.map((c) => ({ value: c, label: c }))));
  filterRow.appendChild(buildLibrarySelect('Budget', 'budget_tier', [
    { value: 'budget', label: 'Budget' },
    { value: 'everyday', label: 'Everyday' },
    { value: 'special', label: 'Something special' }
  ]));
  filterRow.appendChild(buildLibrarySelect('Meal time', 'default_slot', [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ]));

  // Worklist C1. Ren, two traces: "You've written the function and not
  // the dropdown. I can tell, and that's a strange thing to be able to
  // tell." filterRecipes has supported this since Phase 16 and 72 of the
  // 100 recipes are tagged vegetarian.
  //
  // A single select rather than checkboxes: asking for "vegan AND gluten
  // free" is a real need, but it is rarer than asking for one thing, and
  // four tick boxes in a filter row is a wall. The select covers the
  // common case; the combination is a wish.
  filterRow.appendChild(buildLibrarySelect('Suitable for', 'dietaryOne', [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten_free', label: 'Gluten free' },
    { value: 'dairy_free', label: 'Dairy free' },
    { value: 'nut_free', label: 'Nut free' }
  ]));

  libraryBody.appendChild(filterRow);
  libraryBody.appendChild(libraryList);
  renderLibraryList();
}


function buildLibrarySelect(label, key, options) {
  const wrap = el('div', { class: 'field' });
  const select = el('select', { id: `library-${key}` });
  select.appendChild(el('option', { value: '', text: `Any ${label.toLowerCase()}` }));
  for (const option of options) {
    const opt = el('option', { value: option.value, text: option.label });
    const current = key === 'dietaryOne'
      ? (libraryFilters.dietary || [])[0]
      : libraryFilters[key];
    if (current === option.value) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    if (key === 'dietaryOne') {
      // filterRecipes takes an array and requires EVERY tag, so a single
      // choice becomes a one-element list rather than a special case.
      libraryFilters.dietary = select.value ? [select.value] : [];
    } else {
      libraryFilters[key] = select.value;
    }
    renderLibraryList();
  }, { signal });
  wrap.append(el('label', { for: select.id, text: label }), select);
  return wrap;
}


function renderLibraryList() {
  const matches = filterRecipes(libraryRecipes, libraryFilters);
  libraryList.replaceChildren();

  if (matches.length === 0) {
    libraryList.appendChild(el('li', { class: 'field-hint', text: 'Nothing matches those filters.' }));
    return;
  }

  for (const recipe of matches) {
    const item = el('li', { class: 'library-row' });
    item.appendChild(el('span', { class: 'library-row-name', text: recipe.name }));

    const meta = [recipe.cuisine, recipe.budget_tier, `${recipe.steps.length} steps`];
    if ((recipe.dietary_tags || []).length) meta.push(recipe.dietary_tags.join(', ').replace(/_/g, ' '));
    item.appendChild(el('span', { class: 'library-row-meta', text: meta.join(' · ') }));

    // Already-added recipes are MARKED, not hidden. Seeing that you own
    // it is information; making it vanish just looks like a bug.
    if (libraryOwned.has(recipe.slug)) {
      item.appendChild(el('span', { class: 'library-row-owned', text: 'Already in your meals' }));
    } else {
      const add = el('button', { type: 'button', class: 'btn btn-small', text: 'Add to my meals' });
      add.setAttribute('aria-label', `Add ${recipe.name} to my meals`);
      add.addEventListener('click', async () => {
        add.disabled = true;
        add.textContent = 'Adding…';
        const result = await addLibraryRecipe(recipe);
        if (destroyed()) return;
        if (!result.ok) {
          add.disabled = false;
          add.textContent = 'Add to my meals';
          showToast(result.error.message);
          return;
        }
        // Say what actually happened. Nothing here is invisible.
        const message = describeAdd(result);
        showToast(message);
        announce(message);
        libraryOwned.set(recipe.slug, result.data);
        await onAdded();
        if (destroyed()) return;
        renderLibraryList();
      }, { signal });
      item.appendChild(add);
    }

    libraryList.appendChild(item);
  }
}


  /**
   * Opens the panel and scrolls to it.
   *
   * Exposed because the Meals empty state offers "browse the library" as
   * its action, and reaching into another module's DOM to force a
   * <details> open is exactly the coupling this extraction removed.
   */
  function open() {
    libraryDetails.open = true;
    libraryDetails.scrollIntoView({ block: 'center' });
    if (!libraryLoaded) {
      libraryLoaded = true;
      loadLibrary();
    }
  }

  return { section, open };
}
