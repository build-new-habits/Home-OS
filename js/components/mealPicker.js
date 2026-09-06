// js/components/mealPicker.js — 06 Sep 2026 v1
//
// Choosing what to eat, from everything you could eat.
//
// ---- Why ----
// Device test, 6 Sep 2026: "Adding a meal to the weekly plan is not right.
// I only have access to the ones I've created, and the ones I created are
// dinners, not the lunches I'm looking for."
//
// The old control was a single <select> over the user's own meals. Six
// recipes, all marked Dinner, offered as the complete answer to "what shall
// we have for lunch on Tuesday". The hundred and ten recipes that ship with
// the app were two pages away and had to be imported by hand first.
//
// ---- The idea ----
// One list, both sources. Your own meals and the whole library, filtered
// together. Picking a library recipe imports it on the spot — the import is
// a consequence of choosing, not a chore you do beforehand.
//
// ---- The filters ----
// The meal time is pre-set from the slot being filled, because that is the
// question actually being asked. Choosing a lunch and then being shown
// dinners is the specific failure this replaces, so the fix is not "add a
// filter", it is "answer the right question by default".
//
// Everything else is optional and combines: search, cuisine, dietary needs,
// budget, and which source. Filters that would return nothing are disabled
// rather than hidden, so the shape of the library stays legible — a greyed
// "Vegan (0)" tells you something a vanished chip does not.

import { el } from '../lib/dom.js';
import { loadAllRecipes, filterRecipes, addLibraryRecipe, existingLibraryRefs } from '../data/recipeLibrary.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';

const DIETARY = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten free' },
  { value: 'dairy_free', label: 'Dairy free' },
  { value: 'nut_free', label: 'Nut free' }
];

const BUDGET = [
  { value: '', label: 'Any budget' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Middling' },
  { value: 'treat', label: 'A treat' }
];

const SLOTS = [
  { value: '', label: 'Any time' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
];

/**
 * @param {object} options
 * @param {AbortSignal} options.signal
 * @param {() => Array} options.getMeals   the user's own meals, live
 * @param {(meal: {id: string, name: string}) => void} options.onChoose
 */
export function createMealPicker({ signal, getMeals, onChoose }) {
  let library = [];
  let libraryLoaded = false;
  let owned = new Map();
  let slot = '';
  let busy = false;

  const state = { term: '', cuisine: '', budget: '', dietary: [], source: 'all' };

  const root = el('div', { class: 'meal-picker' });

  // ---- Search ----------------------------------------------------------
  const search = el('input', {
    id: 'meal-picker-search', type: 'search', class: 'meal-picker__search',
    placeholder: 'Search by name or an ingredient'
  });
  const searchLabel = el('label', { for: 'meal-picker-search', class: 'visually-hidden', text: 'Search meals' });
  root.append(searchLabel, search);

  // ---- Source: yours, the library, or both -----------------------------
  const sourceRow = el('div', { class: 'meal-picker__chips', role: 'group' });
  sourceRow.setAttribute('aria-label', 'Where to look');
  const sourceChips = new Map();
  for (const opt of [
    { value: 'all', label: 'Everything' },
    { value: 'mine', label: 'My meals' },
    { value: 'library', label: 'Library' }
  ]) {
    const chip = el('button', { type: 'button', class: 'chip-toggle', text: opt.label });
    chip.setAttribute('aria-pressed', String(state.source === opt.value));
    chip.addEventListener('click', () => {
      state.source = opt.value;
      for (const [v, c] of sourceChips) c.setAttribute('aria-pressed', String(v === opt.value));
      render();
    }, { signal });
    sourceChips.set(opt.value, chip);
    sourceRow.appendChild(chip);
  }
  root.appendChild(sourceRow);

  // ---- The rest, folded ------------------------------------------------
  // Search and source answer most questions. Cuisine, diet and budget are
  // real needs but not every-time needs, and six controls stacked above a
  // list is the clutter this whole redesign is undoing.
  const more = el('details', { class: 'meal-picker__more' });
  more.appendChild(el('summary', { text: 'Narrow it down' }));

  const slotSelect = el('select', { id: 'meal-picker-slot' });
  for (const s of SLOTS) slotSelect.appendChild(el('option', { value: s.value, text: s.label }));

  const cuisineSelect = el('select', { id: 'meal-picker-cuisine' });
  const budgetSelect = el('select', { id: 'meal-picker-budget' });
  for (const b of BUDGET) budgetSelect.appendChild(el('option', { value: b.value, text: b.label }));

  const dietRow = el('div', { class: 'meal-picker__chips', role: 'group' });
  dietRow.setAttribute('aria-label', 'Dietary needs');
  const dietChips = new Map();
  for (const d of DIETARY) {
    const chip = el('button', { type: 'button', class: 'chip-toggle', text: d.label });
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!on));
      state.dietary = on
        ? state.dietary.filter((t) => t !== d.value)
        : [...state.dietary, d.value];
      render();
    }, { signal });
    dietChips.set(d.value, chip);
    dietRow.appendChild(chip);
  }

  more.append(
    labelled('Meal time', slotSelect),
    labelled('Cuisine', cuisineSelect),
    labelled('Budget', budgetSelect),
    dietRow
  );
  root.appendChild(more);

  const count = el('p', { class: 'meal-picker__count', role: 'status' });
  root.appendChild(count);

  const list = el('ul', { class: 'meal-picker__list' });
  root.appendChild(list);

  function labelled(text, control) {
    const wrap = el('div', { class: 'field field-inline' });
    wrap.append(el('label', { for: control.id, text }), control);
    return wrap;
  }

  for (const control of [slotSelect, cuisineSelect, budgetSelect]) {
    control.addEventListener('change', () => {
      state.cuisine = cuisineSelect.value;
      state.budget = budgetSelect.value;
      slot = slotSelect.value;
      render();
    }, { signal });
  }
  search.addEventListener('input', () => {
    state.term = search.value;
    render();
  }, { signal });

  // ---- Loading the library ---------------------------------------------
  async function ensureLibrary() {
    if (libraryLoaded) return;
    libraryLoaded = true;
    // The library is an enhancement, not the point of this screen. If it
    // cannot be reached — offline, a bad fetch, a schema surprise — the
    // person must still be able to plan from their own meals, so a failure
    // here narrows the picker rather than taking the page down with it.
    let recipes = { ok: false };
    let refs = { ok: false };
    try {
      [recipes, refs] = await Promise.all([loadAllRecipes(), existingLibraryRefs()]);
    } catch (error) {
      console.error('Recipe library unavailable to the picker:', error);
    }
    if (signal.aborted) return;
    if (recipes.ok) {
      library = recipes.data;
      const cuisines = [...new Set(library.map((r) => r.cuisine).filter(Boolean))].sort();
      cuisineSelect.replaceChildren(el('option', { value: '', text: 'Any cuisine' }));
      for (const c of cuisines) cuisineSelect.appendChild(el('option', { value: c, text: c }));
    }
    if (refs.ok) owned = refs.data;
    render();
  }

  // ---- Rendering -------------------------------------------------------
  function matchingMine() {
    const term = state.term.trim().toLowerCase();
    return getMeals().filter((m) => {
      if (term && !(m.name || '').toLowerCase().includes(term)) return false;
      // A meal of yours with no type set is never excluded by a time filter:
      // "not said yet" means unknown, not "wrong".
      if (slot && m.meal_type && m.meal_type !== slot) return false;
      if (state.cuisine && m.cuisine !== state.cuisine) return false;
      if (state.budget && m.budget_tier !== state.budget) return false;
      if (state.dietary.length
        && !state.dietary.every((t) => (m.dietary_tags || []).includes(t))) return false;
      return true;
    });
  }

  function matchingLibrary() {
    return filterRecipes(library, {
      cuisine: state.cuisine,
      budget_tier: state.budget,
      default_slot: slot,
      dietary: state.dietary,
      term: state.term
    // Already imported? It is in "My meals", so showing it twice is noise.
    }).filter((r) => !owned.has(r.slug));
  }

  function render() {
    const mine = state.source === 'library' ? [] : matchingMine();
    const lib = state.source === 'mine' ? [] : matchingLibrary();

    list.replaceChildren();

    if (mine.length === 0 && lib.length === 0) {
      count.textContent = libraryLoaded
        ? 'Nothing matches. Try fewer filters.'
        : 'Looking…';
      return;
    }

    count.textContent = `${mine.length + lib.length} to choose from`
      + (lib.length ? ` — ${lib.length} from the library` : '');

    // Yours first. They are yours, and you already decided you liked them.
    for (const meal of sortMeals(mine)) list.appendChild(mineRow(meal));
    for (const recipe of lib.slice(0, 60)) list.appendChild(libraryRow(recipe));

    if (lib.length > 60) {
      list.appendChild(el('li', {
        class: 'meal-picker__more-note',
        text: `${lib.length - 60} more in the library — search or narrow it down to see them.`
      }));
    }
  }

  function sortMeals(meals) {
    return [...meals].sort((a, b) => {
      if (!!b.is_favourite !== !!a.is_favourite) return b.is_favourite ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function row(name, metaBits, onPick, { chip = null } = {}) {
    const item = el('li', { class: 'meal-picker__item' });
    const button = el('button', { type: 'button', class: 'meal-picker__pick' });
    const text = el('span', { class: 'meal-picker__text' });
    text.appendChild(el('span', { class: 'meal-picker__name', text: name }));
    const meta = metaBits.filter(Boolean).join(' · ');
    if (meta) text.appendChild(el('span', { class: 'meal-picker__meta', text: meta }));
    button.appendChild(text);
    if (chip) button.appendChild(el('span', { class: 'meal-picker__chip', text: chip }));
    button.addEventListener('click', onPick, { signal });
    item.appendChild(button);
    return item;
  }

  function mineRow(meal) {
    return row(
      meal.name,
      [meal.is_favourite ? 'Favourite' : '', typeLabel(meal.meal_type), servesLabel(meal.default_serves)],
      () => onChoose({ id: meal.id, name: meal.name })
    );
  }

  function libraryRow(recipe) {
    return row(
      recipe.name,
      [recipe.cuisine, typeLabel(recipe.default_slot), servesLabel(recipe.default_serves)],
      () => pickFromLibrary(recipe),
      { chip: 'Library' }
    );
  }

  async function pickFromLibrary(recipe) {
    if (busy) return;
    busy = true;
    announce(`Adding ${recipe.name} from the library.`);
    const result = await addLibraryRecipe(recipe);
    busy = false;
    if (signal.aborted) return;

    if (!result.ok) {
      // Already yours: that is not a failure, it is the same outcome by a
      // shorter route. Choose the copy you already have.
      if (result.existing) {
        owned.set(recipe.slug, result.existing);
        onChoose({ id: result.existing.id, name: result.existing.name });
        render();
        return;
      }
      showToast(result.error?.message || 'That could not be added.');
      return;
    }

    owned.set(recipe.slug, result.data);
    showToast(`${recipe.name} added to your meals.`);
    onChoose({ id: result.data.id, name: result.data.name });
    render();
  }

  function typeLabel(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function servesLabel(n) {
    return n ? `serves ${n}` : '';
  }

  return {
    element: root,
    /** The slot being filled. Sets the meal-time filter, because that is
     *  the question being asked rather than a preference to be re-entered. */
    setSlot(value) {
      slot = value || '';
      slotSelect.value = slot;
      render();
    },
    refresh() { render(); },
    load: ensureLibrary
  };
}
