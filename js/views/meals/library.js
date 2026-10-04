// js/views/meals/library.js — 03 Oct 2026 v7
// v7: quick filters (vegetarian, vegan, 30 minutes or less, puddings); the
// rest fold under More filters; rows show time instead of a step count.
// v6: a photo or meal-colour tile beside each recipe.
// v5: Course filter (starters, mains, puddings); drinks under Meal time.
// v4: the blurb no longer counts its recipes.
// v3: a recipe name links to its own page (#/recipe?r=slug).
// v2: favourites have somewhere to show up.
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
import { COURSES } from '../../data/courses.js';
import { estimateRecipeTime } from '../../lib/recipeTime.js';
import { loadImages } from '../../data/recipeImages.js';
import { recipePhoto } from '../../components/recipePhoto.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
// libraryDetail.js is no longer opened from this list (v3, 3 Oct 2026); the
// recipe has its own page. The sheet module is kept, not deleted.
// A literal, so the orphan gate can see the route is linked from here.
const RECIPE_ROUTE = '#/recipe';
import {
  loadAllRecipes, filterRecipes, existingLibraryRefs, addLibraryRecipe, describeAdd
} from '../../data/recipeLibrary.js';
import { listRecipeNotes } from '../../data/recipeNotes.js';

/**
 * @param {{
 *   signal: AbortSignal,
 *   isDestroyed: () => boolean,
 *   onAdded: () => Promise<void>
 * }} options
 */
export function createLibraryPanel({ signal, isDestroyed, onAdded, ownPage = false, course = '' }) {
  let libraryRecipes = [];
  let libraryImages = new Map();
  let libraryOwned = new Map();
  // ---- Favourites, 10 Sep 2026 ----
  // Device test: "no way to find favourites". Revision 25 gave the library
  // a heart and a note box and then no way to use either — a favourite you
  // cannot filter by is a tap that goes nowhere, which is worse than no
  // heart at all.
  let libraryNotes = new Map();
  let libraryLoaded = false;
  const libraryFilters = {
    quick: false, term: '', cuisine: '', budget_tier: '', default_slot: '', course: COURSES.some((c) => c.value === course) ? course : '', dietary: [],
    favouritesOnly: false
  };
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
  // Suppressed when the panel IS the page. On its own route the view
  // already supplies an <h1> and the blurb, so this printed both a second
  // time — the same two paragraphs, one under the other, which reads as a
  // rendering fault rather than a design.
  if (!ownPage) section.appendChild(el('h3', { text: 'Recipe library' }));
  if (!ownPage) section.appendChild(el('p', {
    class: 'field-hint',
    text: 'Recipes that come with the app. Add any of them to your meals '
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

  const [recipes, owned, notes, images] = await Promise.all([
    loadAllRecipes(), existingLibraryRefs(), listRecipeNotes(), loadImages().catch(() => new Map())
  ]);
  if (destroyed()) return;
  libraryImages = images;

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
  // A failed notes read narrows the panel rather than emptying it: no
  // hearts, no favourites chip, every recipe still browsable.
  libraryNotes = notes.ok ? notes.data : new Map();
  // Say when the count is short. A partial read used to look identical to a
  // complete one — same shape, fewer recipes, nothing said.
  librarySummary.textContent = `Browse the recipe library (${libraryRecipes.length})`
    + (recipes.missing ? ' — part of it did not load' : '');
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

  // 3 Oct 2026: on a phone, five dropdowns pushed the first recipe below
  // the fold. Search stays out; the rest fold away under "More filters",
  // which says how many are on and opens itself when any are.
  const activeCount = ['cuisine', 'budget_tier', 'default_slot', 'course'].filter((k) => libraryFilters[k]).length
    + ((libraryFilters.dietary || []).length ? 1 : 0);
  const more = el('details', { class: 'library-more' });
  if (activeCount) more.open = true;
  more.appendChild(el('summary', { text: activeCount ? `More filters (${activeCount} on)` : 'More filters' }));
  const moreRow = el('div', { class: 'library-filters' });
  more.appendChild(moreRow);
  const cuisines = [...new Set(libraryRecipes.map((r) => r.cuisine))].sort();
  moreRow.appendChild(buildLibrarySelect('Cuisine', 'cuisine',
    cuisines.map((c) => ({ value: c, label: c }))));
  moreRow.appendChild(buildLibrarySelect('Budget', 'budget_tier', [
    { value: 'budget', label: 'Budget' },
    { value: 'everyday', label: 'Everyday' },
    { value: 'special', label: 'Something special' }
  ]));
  moreRow.appendChild(buildLibrarySelect('Meal time', 'default_slot', [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
    { value: 'drink', label: 'Drink' }
  ]));
  // 3 Oct 2026: starters and puddings. A course, not a meal time.
  moreRow.appendChild(buildLibrarySelect('Course', 'course', COURSES));

  // Worklist C1. Ren, two traces: "You've written the function and not
  // the dropdown. I can tell, and that's a strange thing to be able to
  // tell." filterRecipes has supported this since Phase 16 and 72 of the
  // 100 recipes are tagged vegetarian.
  //
  // A single select rather than checkboxes: asking for "vegan AND gluten
  // free" is a real need, but it is rarer than asking for one thing, and
  // four tick boxes in a filter row is a wall. The select covers the
  // common case; the combination is a wish.
  moreRow.appendChild(buildLibrarySelect('Suitable for', 'dietaryOne', [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten_free', label: 'Gluten free' },
    { value: 'dairy_free', label: 'Dairy free' },
    { value: 'nut_free', label: 'Nut free' }
  ]));

  // ---- Favourites -------------------------------------------------
  // A chip rather than a sixth select: it is a yes/no, and the count says
  // in advance whether pressing it is worth anything. Disabled at zero for
  // the same reason the meal picker greys an empty diet chip — "Favourites
  // (0)" tells you where you stand; a chip that silently empties the list
  // teaches you the filters are broken.
  const favCount = countFavourites();
  const favChip = el('button', {
    type: 'button', class: 'chip-toggle',
    text: favCount ? `Favourites (${favCount})` : 'Favourites (0)'
  });
  favChip.setAttribute('aria-pressed', String(libraryFilters.favouritesOnly));
  if (favCount === 0) {
    favChip.disabled = true;
    favChip.setAttribute('aria-label',
      'Favourites. Nothing is favourited yet — open a recipe to add one.');
  }
  favChip.addEventListener('click', () => {
    libraryFilters.favouritesOnly = !libraryFilters.favouritesOnly;
    favChip.setAttribute('aria-pressed', String(libraryFilters.favouritesOnly));
    renderLibraryList();
  }, { signal });
  const favRow = el('div', { class: 'library-chips', role: 'group' });
  favRow.setAttribute('aria-label', 'Quick filters');
  // 3 Oct 2026: the questions people actually start with, one tap each.
  // Each is the same filter as its dropdown, so the two never disagree.
  const quick = [
    ['Vegetarian', () => (libraryFilters.dietary || [])[0] === 'vegetarian', (on) => { libraryFilters.dietary = on ? [] : ['vegetarian']; }],
    ['Vegan', () => (libraryFilters.dietary || [])[0] === 'vegan', (on) => { libraryFilters.dietary = on ? [] : ['vegan']; }],
    ['30 minutes or less', () => libraryFilters.quick === true, (on) => { libraryFilters.quick = !on; }],
    ['Puddings', () => libraryFilters.course === 'pudding', (on) => { libraryFilters.course = on ? '' : 'pudding'; }]
  ];
  for (const [label, isOn, toggle] of quick) {
    const chip = el('button', { type: 'button', class: 'chip-toggle', text: label });
    chip.setAttribute('aria-pressed', String(isOn()));
    chip.addEventListener('click', () => {
      toggle(isOn());
      renderLibrary();
      const again = [...libraryBody.querySelectorAll('.library-chips .chip-toggle')].find((c) => c.textContent === label);
      if (again) again.focus();
    }, { signal });
    favRow.appendChild(chip);
  }
  favRow.appendChild(favChip);

  libraryBody.appendChild(filterRow);
  libraryBody.appendChild(favRow);
  libraryBody.appendChild(more);
  libraryBody.appendChild(libraryList);
  renderLibraryList();
}


function countFavourites() {
  let n = 0;
  for (const row of libraryNotes.values()) if (row && row.is_favourite) n++;
  return n;
}

function isFavourite(slug) {
  const row = libraryNotes.get(slug);
  return !!(row && row.is_favourite);
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


/** Diet tags as a cook would list them. Vegan implies the other two. Pure. */
function shortTags(tags = []) {
  const set = new Set(tags);
  const out = [];
  if (set.has('vegan')) out.push('vegan');
  else if (set.has('vegetarian')) out.push('vegetarian');
  if (set.has('gluten_free')) out.push('gluten free');
  if (set.has('dairy_free') && !set.has('vegan')) out.push('dairy free');
  if (set.has('nut_free')) out.push('nut free');
  return out;
}

function renderLibraryList() {
  // filterRecipes knows nothing about favourites — they live in a table, not
  // in the recipe files — so the flag is applied here rather than smuggled
  // into a function that filters static data.
  let matches = filterRecipes(libraryRecipes, libraryFilters);
  if (libraryFilters.favouritesOnly) matches = matches.filter((r) => isFavourite(r.slug));
  if (libraryFilters.quick) {
    matches = matches.filter((r) => {
      const t = estimateRecipeTime(r);
      return t.total > 0 && t.total <= 30 && !t.needsWaiting;
    });
  }

  // Favourites first, always. Marking one and then hunting for it in
  // alphabetical order is the same problem in a smaller room.
  matches = [...matches].sort((a, b) => {
    if (isFavourite(a.slug) !== isFavourite(b.slug)) return isFavourite(a.slug) ? -1 : 1;
    return 0;
  });

  libraryList.replaceChildren();

  if (matches.length === 0) {
    libraryList.appendChild(el('li', {
      class: 'field-hint',
      text: libraryFilters.favouritesOnly
        ? 'Nothing favourited matches those filters.'
        : 'Nothing matches those filters.'
    }));
    return;
  }

  for (const recipe of matches) {
    const item = el('li', { class: 'library-row has-thumb' });
    // 3 Oct 2026: a photo, or a tile in the meal's colour. Decorative: the
    // name beside it says what it is.
    item.appendChild(recipePhoto(recipe, libraryImages.get(recipe.slug) || null, 'thumb'));
    // The name opens the recipe. Until now the only thing you could do with
    // a library entry was add it to your meals — so reading one meant
    // adding it first, which is choosing a dinner by its title.
    // 3 Oct 2026 (K5): the name is a LINK to the recipe's own page. The
    // detail sheet (libraryDetail.js) is kept but no longer opened from here:
    // a recipe you cook from needs room, a back button and an address.
    const open = el('a', {
      class: 'library-row-open', 'data-slug': recipe.slug, text: recipe.name,
      href: `${RECIPE_ROUTE}?r=${encodeURIComponent(recipe.slug)}`
    });
    item.appendChild(open);

    // Time rather than a step count: "35 min" answers "can I make this
    // tonight". Tags shortened: vegan already says vegetarian and dairy free.
    const t = estimateRecipeTime(recipe);
    const meta = [recipe.cuisine, t.total ? `${t.total} min${t.needsWaiting ? ' + chilling' : ''}` : null];
    meta.push(...shortTags(recipe.dietary_tags || []));
    item.appendChild(el('span', { class: 'library-row-meta', text: meta.filter(Boolean).join(' · ') }));

    // The heart, out here where the list is. The word goes with it: a glyph
    // alone is a state you have to infer, and the meta line is read aloud.
    if (isFavourite(recipe.slug)) {
      item.appendChild(el('span', { class: 'library-row-fav', text: '♥ Favourite' }));
    }

    // Your own note, shown rather than hidden one tap away. It is the only
    // thing on the row you wrote, and "topped with frozen fruit" is exactly
    // the kind of thing you need when scanning, not when already committed.
    const note = (libraryNotes.get(recipe.slug) || {}).note;
    if (note) item.appendChild(el('p', { class: 'library-row-note', text: note }));

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
    // Guarded: not every environment implements it (jsdom does not), and on
    // the library's own page there is nothing above it to scroll past.
    if (typeof libraryDetails.scrollIntoView === 'function') {
      libraryDetails.scrollIntoView({ block: 'center' });
    }
    if (!libraryLoaded) {
      libraryLoaded = true;
      loadLibrary();
    }
  }

  return { section, open };
}
