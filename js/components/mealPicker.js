// js/components/mealPicker.js — 10 Sep 2026 v5
// v5: a library that fails to load says so, and can be tried again.
// v4: favourites, from both sources, filterable.
// v2: filters shown, not folded — it has a screen of its own now.
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
import { listRecipeNotes } from '../data/recipeNotes.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';

// 'Nut free' was offered here and no recipe in the library carries the tag,
// so the chip could only ever return nothing. A filter that always empties
// the list teaches people the filters are broken. Dropped until the data
// can back it up.
const DIETARY = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten free' },
  { value: 'dairy_free', label: 'Dairy free' }
];

// Asked for rather than ruled out, and derived from the ingredients because
// the library has no tag for either. See proteinsOf() in recipeLibrary.js.
const PROTEIN = [
  { value: 'meat', label: 'Meat' },
  { value: 'fish', label: 'Fish' }
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
  // ---- A failed load must not be permanent, or silent ----------------
  // Screen recording, 10 Sep 2026: the picker offered "2 to choose from"
  // and "Favourites (0)" while 110 recipes and one favourite sat in the
  // library. `libraryLoaded` was set to true BEFORE the awaits, so the one
  // failed fetch was final for the life of the screen — and the degraded
  // result was presented as an ordinary answer. Two of his own meals is a
  // perfectly plausible number. That is what made it hard to see.
  let libraryLoading = false;
  let libraryFailed = false;
  let libraryPartial = false;
  let notesFailed = false;
  let owned = new Map();
  // ---- Favourites live in two places, 10 Sep 2026 ----
  // Device test: "no way to find favourites for meal choices". Your own
  // meals carry meals.is_favourite; library recipes carry a row in
  // recipe_library_notes. One list, one chip, so both have to be read —
  // filtering on only one of them would quietly hide half the answer.
  let notes = new Map();
  let slot = '';
  let busy = false;

  const state = {
    term: '', cuisine: '', budget: '', dietary: [], proteins: [],
    source: 'all', favouritesOnly: false
  };

  /** True for a meal of yours, whichever place its heart was set in. */
  function mealIsFavourite(meal) {
    if (meal.is_favourite) return true;
    // Imported from the library and favourited there. Without this, hearting
    // a recipe and then adding it to your meals would lose the heart —
    // the same recipe, two tables, one of them not consulted.
    const row = meal.library_ref ? notes.get(meal.library_ref) : null;
    return !!(row && row.is_favourite);
  }

  function recipeIsFavourite(recipe) {
    const row = notes.get(recipe.slug);
    return !!(row && row.is_favourite);
  }

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

  // ---- Favourites -------------------------------------------------------
  // Its own row rather than a fourth source chip: "Everything / My meals /
  // Library" is a choice of ONE, and favourites narrows whichever of those
  // you are looking at. Putting it in that group would have made it look
  // like a fourth place to look.
  const favRow = el('div', { class: 'meal-picker__chips', role: 'group' });
  favRow.setAttribute('aria-label', 'Narrow to favourites');
  const favChip = el('button', { type: 'button', class: 'chip-toggle', text: 'Favourites' });
  favChip.setAttribute('aria-pressed', 'false');
  favChip.addEventListener('click', () => {
    state.favouritesOnly = !state.favouritesOnly;
    favChip.setAttribute('aria-pressed', String(state.favouritesOnly));
    render();
  }, { signal });
  favRow.appendChild(favChip);
  root.appendChild(favRow);

  /** Keeps the chip honest about how much is behind it. */
  function paintFavChip() {
    // "Favourites (0)" when the table could not be read is a lie told with
    // a number. Nothing known is not the same as nothing there.
    if (notesFailed) {
      favChip.textContent = 'Favourites';
      favChip.disabled = true;
      favChip.setAttribute('aria-label', 'Favourites could not be read. Try loading the library again.');
      return;
    }
    const n = countFavourites();
    favChip.textContent = `Favourites (${n})`;
    // Never disabled while it is switched ON, or pressing it once would
    // strand you in an empty list with the way out greyed out.
    favChip.disabled = n === 0 && !state.favouritesOnly;
    favChip.setAttribute('aria-label', n === 0
      ? 'Favourites. Nothing is favourited yet.'
      : `Show only your ${n} favourite${n === 1 ? '' : 's'}.`);
  }

  /** A way back from a failed load, rather than leaving the screen to get one. */
  function paintRetry() {
    retryRow.replaceChildren();
    retryRow.hidden = !libraryFailed && !libraryPartial && !notesFailed;
    if (retryRow.hidden) return;
    const again = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Try again' });
    again.addEventListener('click', () => {
      libraryFailed = false;
      libraryPartial = false;
      notesFailed = false;
      // Without this, ensureLibrary() returns at the door on a partial load.
      libraryLoaded = false;
      count.textContent = 'Looking…';
      retryRow.hidden = true;
      ensureLibrary();
    }, { signal });
    retryRow.appendChild(again);
  }

  function countFavourites() {
    let n = 0;
    for (const meal of getMeals()) if (mealIsFavourite(meal)) n++;
    for (const recipe of library) if (recipeIsFavourite(recipe) && !owned.has(recipe.slug)) n++;
    return n;
  }

  // ---- The rest, folded ------------------------------------------------
  // Search and source answer most questions. Cuisine, diet and budget are
  // real needs but not every-time needs, and six controls stacked above a
  // list is the clutter this whole redesign is undoing.
  // Shown, not folded. On a screen of its own there is room for five
  // controls, and hiding filters behind a disclosure was the collapsible
  // habit this redesign is meant to be leaving behind.
  const more = el('div', { class: 'meal-picker__more' });

  const slotSelect = el('select', { id: 'meal-picker-slot' });
  for (const s of SLOTS) slotSelect.appendChild(el('option', { value: s.value, text: s.label }));

  const cuisineSelect = el('select', { id: 'meal-picker-cuisine' });
  const budgetSelect = el('select', { id: 'meal-picker-budget' });
  for (const b of BUDGET) budgetSelect.appendChild(el('option', { value: b.value, text: b.label }));

  const proteinRow = el('div', { class: 'meal-picker__chips', role: 'group' });
  proteinRow.setAttribute('aria-label', "What's in it");
  for (const p of PROTEIN) {
    const chip = el('button', { type: 'button', class: 'chip-toggle', text: p.label });
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!on));
      state.proteins = on
        ? state.proteins.filter((v) => v !== p.value)
        : [...state.proteins, p.value];
      render();
    }, { signal });
    proteinRow.appendChild(chip);
  }

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

  const filterGrid = el('div', { class: 'meal-picker__filters' });
  filterGrid.append(
    labelled('Meal time', slotSelect),
    labelled('Cuisine', cuisineSelect),
    labelled('Budget', budgetSelect)
  );
  more.append(filterGrid, proteinRow, dietRow);
  root.appendChild(more);

  const count = el('p', { class: 'meal-picker__count', role: 'status' });
  root.appendChild(count);
  const retryRow = el('div', { class: 'meal-picker__more' });
  retryRow.hidden = true;
  root.appendChild(retryRow);

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
    if (libraryLoaded || libraryLoading) return;
    libraryLoading = true;
    // The library is an enhancement, not the point of this screen. If it
    // cannot be reached — offline, a bad fetch, a schema surprise — the
    // person must still be able to plan from their own meals, so a failure
    // here narrows the picker rather than taking the page down with it.
    //
    // allSettled, not all: three independent reads. Promise.all meant a
    // slow favourites table could cost you the whole recipe library, and a
    // missing recipe file could cost you your favourites. Nothing here
    // depends on anything else here.
    const settled = await Promise.allSettled([
      loadAllRecipes(), existingLibraryRefs(), listRecipeNotes()
    ]);
    const [recipes, refs, saved] = settled.map((r) => (
      r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason }
    ));
    libraryLoading = false;
    if (signal.aborted) return;
    if (!recipes.ok) console.error('Recipe library unavailable to the picker:', recipes.error);
    if (!saved.ok) console.error('Favourites unavailable to the picker:', saved.error);
    // Only a successful read counts as loaded. Anything else can be retried.
    libraryLoaded = !!recipes.ok;
    libraryFailed = !recipes.ok;
    // Some files read, some not. The list looks ordinary and is short, which
    // is the shape this bug arrived in.
    libraryPartial = !!(recipes.ok && recipes.missing);
    notesFailed = !saved.ok;
    if (recipes.ok) {
      library = recipes.data;
      const cuisines = [...new Set(library.map((r) => r.cuisine).filter(Boolean))].sort();
      cuisineSelect.replaceChildren(el('option', { value: '', text: 'Any cuisine' }));
      for (const c of cuisines) cuisineSelect.appendChild(el('option', { value: c, text: c }));
    }
    if (refs.ok) owned = refs.data;
    // A failed read means no hearts, not an empty picker. Choosing dinner
    // must not depend on a table that only decorates the list.
    if (saved.ok) notes = saved.data;
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
      // Your own meals are not loaded with their ingredients here, so meat
      // and fish cannot be read off them. Rather than guess, only the case
      // we DO know is applied: a meal tagged vegetarian or vegan is not
      // what you are asking for. Anything else stays, on the same footing
      // as an unset meal time — unknown is not the same as wrong.
      if (state.proteins.length) {
        const tags = m.dietary_tags || [];
        if (tags.includes('vegetarian') || tags.includes('vegan')) return false;
      }
      if (state.favouritesOnly && !mealIsFavourite(m)) return false;
      return true;
    });
  }

  function matchingLibrary() {
    return filterRecipes(library, {
      cuisine: state.cuisine,
      budget_tier: state.budget,
      default_slot: slot,
      dietary: state.dietary,
      proteins: state.proteins,
      term: state.term
    // Already imported? It is in "My meals", so showing it twice is noise.
    }).filter((r) => !owned.has(r.slug))
      .filter((r) => !state.favouritesOnly || recipeIsFavourite(r));
  }

  function render() {
    paintFavChip();
    const mine = state.source === 'library' ? [] : matchingMine();
    const lib = state.source === 'mine' ? [] : matchingLibrary();

    list.replaceChildren();

    if (mine.length === 0 && lib.length === 0) {
      count.textContent = libraryFailed
        ? 'The recipe library did not load, so only your own meals are here.'
        : libraryLoaded
          ? (state.favouritesOnly
            ? 'Nothing favourited matches. Try fewer filters, or turn favourites off.'
            : 'Nothing matches. Try fewer filters.')
          : 'Looking…';
      paintRetry();
      return;
    }

    count.textContent = `${mine.length + lib.length} to choose from`
      + (lib.length ? ` — ${lib.length} from the library` : '')
      // Said every time, not only when the list is empty. Two of your own
      // meals looks like a complete answer, which is exactly how this went
      // unnoticed until a screen recording caught the number.
      + (libraryFailed ? ' — the recipe library did not load' : '')
      + (libraryPartial ? ' — part of the recipe library did not load' : '');
    paintRetry();

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
      if (mealIsFavourite(a) !== mealIsFavourite(b)) return mealIsFavourite(a) ? -1 : 1;
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
      [mealIsFavourite(meal) ? '♥ Favourite' : '', typeLabel(meal.meal_type),
        servesLabel(meal.default_serves)],
      () => onChoose({ id: meal.id, name: meal.name })
    );
  }

  function libraryRow(recipe) {
    // The cuisine is dropped when it only repeats the meal time. The
    // breakfast and lunch files record their cuisine as "Breakfast" and
    // "Lunch", which printed "Breakfast · Breakfast · serves 2" — true
    // twice over, and useless the second time.
    const cuisine = (recipe.cuisine || '').toLowerCase() === (recipe.default_slot || '').toLowerCase()
      ? '' : recipe.cuisine;
    return row(
      recipe.name,
      [recipeIsFavourite(recipe) ? '♥ Favourite' : '', cuisine,
        typeLabel(recipe.default_slot), servesLabel(recipe.default_serves)],
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
