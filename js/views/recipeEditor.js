// js/views/recipeEditor.js — 03 Oct 2026 v3
// v3: Save on this phone (no account needed); ?l=<id> changes a phone recipe;
// ?from=<slug> starts your own version of a library recipe.
// v2: Course (starter, main, pudding) beside Kind of meal.
// Kitchen rebuild. "Make my own recipe" (#/recipe-edit), and changing one
// you already have (#/recipe-edit?m=<meal id>).
//
// ---- What it replaces ----
// Adding a meal used to be a name, a serving count and a kind of meal, and
// then a trip into that meal's sheet to add each ingredient and each step
// one save at a time. This page is the whole recipe in one place:
//
//   About it      name, kind of meal, serves, vegetarian/vegan/…
//   Ingredients   name (your foods and 240 common ones suggested), amount,
//                 unit, and any swaps ("tofu, to make it vegan")
//   Method        one step per box, an optional timer on each
//   A tip         for whoever cooks it
//
// Pasting is first class: a list of ingredients or a method copied from a
// note or a website becomes rows in one go (data/ownRecipe.js reads it).
//
// While you write, the page shows what the recipe would come to per
// serving and how much of it is already in your cupboards. Nothing reaches
// the database until Save, and a new recipe being written is kept on this
// phone so leaving the page by accident loses nothing.
//
// ---- Accessibility ----
// Every input has a visible label; each ingredient and swap is a fieldset
// with a numbered legend. Problems on save are listed at the top, each
// linking to its field, and focus moves to that list (WCAG 3.3.1, 3.3.3).
// Adding a row moves focus into it; removing one moves focus to its
// neighbour, never to the top of the page.

import { el, selectFrom } from '../lib/dom.js';
import { COURSES } from '../data/courses.js';
import { localIdFromHash, fromSlugFromHash, getLocal, saveLocal, draftFromLibrary } from '../data/localRecipes.js';
import { loadAllRecipes } from '../data/recipeLibrary.js';
import { switchRecipe, dietFromHash } from '../data/dietSwitch.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { referenceBySlug } from '../data/foodReference.js';
import { listFoods } from '../data/foods.js';
import { listStock } from '../data/pantry.js';
import { listMeals, listIngredients } from '../data/meals.js';
import { listSteps } from '../data/mealSteps.js';
import { recipeNutrition } from '../data/nutrition.js';
import { haveNames, coverage, normaliseName } from '../data/recipeCoverage.js';
import {
  DIET_TAGS, KINDS, MAX_NOTE, MAX_STEP, ENTRY_UNITS,
  emptyDraft, newIngredient, newSwap, newStep,
  parseIngredientLine, parseMethod, stepHint,
  buildNameIndex, resolveName, draftToRecipe, unknownNutrition, measuredOnly,
  validateDraft, draftFromMeal, saveDraft
} from '../data/ownRecipe.js';

const DRAFT_KEY = 'home-os-own-recipe-draft';
const UNIT_OPTIONS = ENTRY_UNITS.map((u) => ({ value: u.value, label: u.label }));

export function editIdFromHash(hash) {
  const match = String(hash || '').match(/[?&]m=([0-9a-z-]+)/i);
  return match ? match[1] : '';
}

function readStoredDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && Array.isArray(draft.ingredients) ? draft : null;
  } catch { return null; }
}
function storeDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* private mode: fine */ }
}
function clearStoredDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* fine */ }
}

/** Something has been written, so it is worth keeping. */
function hasContent(draft) {
  return Boolean(String(draft.name || '').trim()
    || (draft.ingredients || []).some((r) => String(r.name || '').trim())
    || (draft.steps || []).some((s) => String(s.instruction || '').trim()));
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;
  let previewTimer = null;

  const editId = editIdFromHash(window.location.hash);
  // 3 Oct 2026: recipes kept on this phone (data/localRecipes.js).
  //   ?l=<id>       change one kept on this phone
  //   ?from=<slug>  your own version of a library recipe, kept on this phone
  const localId = editId ? '' : localIdFromHash(window.location.hash);
  const fromSlug = editId || localId ? '' : fromSlugFromHash(window.location.hash);
  const onPhone = Boolean(localId || fromSlug);
  const backHref = editId ? `#/recipe?m=${encodeURIComponent(editId)}`
    : localId ? `#/recipe?l=${encodeURIComponent(localId)}`
      : fromSlug ? `#/recipe?r=${encodeURIComponent(fromSlug)}` : '#/library';
  const back = el('a', {
    class: 'back-link',
    href: backHref,
    text: editId || localId || fromSlug ? 'Back to the recipe' : 'Recipes'
  });
  const heading = el('h1', { text: editId || localId ? 'Change your recipe' : fromSlug ? 'Your version' : 'Write your own recipe' });
  const page = el('div', { class: 'own-recipe' });
  page.appendChild(el('p', { class: 'field-hint', text: 'Getting things ready…' }));
  mountEl.append(back, heading, page);

  (async () => {
    const [refs, foods, stock, existing, library] = await Promise.all([
      referenceBySlug().catch(() => new Map()),
      listFoods().catch(() => ({ ok: false })),
      listStock().catch(() => ({ ok: false })),
      editId
        ? Promise.all([listMeals(), listIngredients(editId), listSteps(editId)]).catch(() => null)
        : Promise.resolve(null),
      fromSlug ? loadAllRecipes().catch(() => null) : Promise.resolve(null)
    ]);
    if (destroyed) return;

    const index = buildNameIndex([...refs.values()], foods && foods.ok ? foods.data || [] : []);
    const haveSet = haveNames(stock && stock.ok ? stock.data || [] : [], new Date().toISOString());

    let draft;
    let restored = false;
    if (editId) {
      const [meals, ings, steps] = existing || [];
      const meal = meals && meals.ok ? (meals.data || []).find((m) => m.id === editId) : null;
      if (!meal || !ings || !ings.ok) {
        page.replaceChildren(el('p', { text: 'This recipe could not be loaded. Check your connection and try again.' }));
        return;
      }
      heading.textContent = `Change ${meal.name}`;
      draft = draftFromMeal(meal, ings.data || [], steps && steps.ok ? steps.data || [] : []);
    } else if (localId) {
      const kept = getLocal(localId);
      if (!kept) {
        page.replaceChildren(el('p', { text: 'That recipe is not on this phone any more.' }));
        return;
      }
      draft = kept.draft;
      heading.textContent = `Change ${draft.name || 'your recipe'}`;
    } else if (fromSlug) {
      const source = library && library.ok ? (library.data || []).find((r) => r.slug === fromSlug) : null;
      if (!source) {
        page.replaceChildren(el('p', { text: 'That recipe could not be loaded. Check your connection and try again.' }));
        return;
      }
      // Starting from the vegetarian or vegan version, if that was on screen.
      const diet = dietFromHash(window.location.hash);
      const switched = diet ? switchRecipe(source, diet, refs) : null;
      draft = draftFromLibrary(switched ? { ...switched.recipe, slug: source.slug } : source, refs);
      heading.textContent = `Your version of ${source.name}`;
    } else {
      const stored = readStoredDraft();
      if (stored && hasContent(stored)) { draft = stored; restored = true; } else draft = emptyDraft();
    }
    build(draft, index, haveSet, restored);
  })().catch((err) => {
    console.error('Recipe editor failed to load:', err);
    if (!destroyed) page.replaceChildren(el('p', { text: 'Something went wrong getting this ready. Try again.' }));
  });

  function build(draft, index, haveSet, restored) {
    page.replaceChildren();

    if (restored) {
      const kept = el('div', { class: 'own-kept', role: 'status' });
      kept.appendChild(el('p', { text: 'Here is the recipe you were writing.' }));
      const fresh = el('button', { type: 'button', class: 'btn btn-small', text: 'Start a new one instead' });
      fresh.addEventListener('click', () => {
        clearStoredDraft();
        Object.assign(draft, emptyDraft());
        kept.remove();
        paintAll();
        page.querySelector('#own-name')?.focus();
        announce('Started a new recipe.');
      }, { signal });
      kept.appendChild(fresh);
      page.appendChild(kept);
    }

    // ---- Problems on save --------------------------------------------
    const errors = el('div', { class: 'own-errors', tabindex: '-1', hidden: '' });
    page.appendChild(errors);

    const datalist = el('datalist', { id: 'own-food-names' });
    for (const name of index.names) datalist.appendChild(el('option', { value: name }));
    page.appendChild(datalist);

    // ---- About it ------------------------------------------------------
    const about = el('section', { class: 'own-section', 'aria-labelledby': 'own-about-h' });
    about.appendChild(el('h2', { id: 'own-about-h', text: 'About it' }));
    const nameInput = el('input', { type: 'text', id: 'own-name', autocomplete: 'off', maxlength: '80' });
    const kindSelect = selectFrom('own-kind', KINDS);
    const courseSelect = selectFrom('own-course', COURSES);
    const servesInput = el('input', { type: 'number', id: 'own-serves', min: '1', max: '50', step: '1', inputmode: 'numeric' });
    const aboutRow = el('div', { class: 'own-about-row' });
    aboutRow.append(
      fieldWrap('What it is called', nameInput, 'own-field-wide'),
      fieldWrap('Kind of meal', kindSelect),
      fieldWrap('Course', courseSelect),
      fieldWrap('Serves', servesInput)
    );
    about.appendChild(aboutRow);
    const tags = el('fieldset', { class: 'own-tags' });
    tags.appendChild(el('legend', { text: 'It is (tick any that are true)' }));
    const tagBoxes = [];
    for (const tag of DIET_TAGS) {
      const id = `own-tag-${tag.value}`;
      const box = el('input', { type: 'checkbox', id, value: tag.value });
      tagBoxes.push(box);
      const row = el('div', { class: 'checkbox-row' });
      row.append(box, el('label', { for: id, text: tag.label }));
      tags.appendChild(row);
      box.addEventListener('change', () => {
        draft.tags = tagBoxes.filter((b) => b.checked).map((b) => b.value);
        changed();
      }, { signal });
    }
    about.appendChild(tags);
    page.appendChild(about);

    nameInput.addEventListener('input', () => { draft.name = nameInput.value; changed(); }, { signal });
    kindSelect.addEventListener('change', () => { draft.kind = kindSelect.value; changed(); }, { signal });
    courseSelect.addEventListener('change', () => { draft.course = courseSelect.value; changed(); }, { signal });
    servesInput.addEventListener('input', () => { draft.serves = servesInput.value; changed(); }, { signal });

    // ---- Ingredients ---------------------------------------------------
    const ingSection = el('section', { class: 'own-section', 'aria-labelledby': 'own-ing-h' });
    ingSection.appendChild(el('h2', { id: 'own-ing-h', text: 'Ingredients' }));
    ingSection.appendChild(el('p', {
      class: 'field-hint',
      text: 'Amounts for the number it serves. Leave the amount blank for things like salt.'
    }));
    const ingList = el('ol', { class: 'own-list' });
    ingSection.appendChild(ingList);
    const ingButtons = el('div', { class: 'own-buttons' });
    const addIng = el('button', { type: 'button', class: 'btn', text: 'Add an ingredient' });
    const pasteIng = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Paste a list', 'aria-haspopup': 'dialog' });
    ingButtons.append(addIng, pasteIng);
    ingSection.appendChild(ingButtons);
    page.appendChild(ingSection);

    addIng.addEventListener('click', () => {
      draft.ingredients.push(newIngredient());
      paintIngredients();
      changed();
      focusId(`own-ing-name-${draft.ingredients.length - 1}`);
    }, { signal });
    pasteIng.addEventListener('click', () => openPaste({
      title: 'Paste ingredients',
      hint: 'One ingredient per line, like "200g rice" or "2 tbsp olive oil".',
      returnFocusTo: pasteIng,
      apply(text) {
        const rows = String(text).split(/\r?\n/).map(parseIngredientLine).filter(Boolean)
          .map((p) => newIngredient({ name: p.name, quantity: p.quantity, unit: p.unit }));
        if (!rows.length) return 0;
        // A lone empty row is a placeholder, not something you wrote.
        draft.ingredients = draft.ingredients.filter((r) => String(r.name || '').trim() || r.swaps.length);
        draft.ingredients.push(...rows);
        paintIngredients();
        changed();
        return rows.length;
      }
    }), { signal });

    // ---- Method --------------------------------------------------------
    const methodSection = el('section', { class: 'own-section', 'aria-labelledby': 'own-method-h' });
    methodSection.appendChild(el('h2', { id: 'own-method-h', text: 'Method' }));
    methodSection.appendChild(el('p', {
      class: 'field-hint',
      text: 'One thing to do in each step. Add minutes to a step and cook mode gives it a timer.'
    }));
    const stepList = el('ol', { class: 'own-list' });
    methodSection.appendChild(stepList);
    const stepButtons = el('div', { class: 'own-buttons' });
    const addStepBtn = el('button', { type: 'button', class: 'btn', text: 'Add a step' });
    const pasteSteps = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Paste the method', 'aria-haspopup': 'dialog' });
    stepButtons.append(addStepBtn, pasteSteps);
    methodSection.appendChild(stepButtons);
    page.appendChild(methodSection);

    addStepBtn.addEventListener('click', () => {
      draft.steps.push(newStep());
      paintSteps();
      changed();
      focusId(`own-step-${draft.steps.length - 1}`);
    }, { signal });
    pasteSteps.addEventListener('click', () => openPaste({
      title: 'Paste the method',
      hint: 'Each line becomes a step. Numbers and bullets at the start are tidied away.',
      returnFocusTo: pasteSteps,
      apply(text) {
        const steps = parseMethod(text);
        if (!steps.length) return 0;
        draft.steps = draft.steps.filter((s) => String(s.instruction || '').trim());
        draft.steps.push(...steps);
        paintSteps();
        changed();
        return steps.length;
      }
    }), { signal });

    // ---- A tip ---------------------------------------------------------
    const tipSection = el('section', { class: 'own-section', 'aria-labelledby': 'own-tip-h' });
    tipSection.appendChild(el('h2', { id: 'own-tip-h', text: 'A tip (optional)' }));
    const note = el('textarea', { id: 'own-note', rows: '3', maxlength: String(MAX_NOTE), 'aria-describedby': 'own-note-hint' });
    const tipField = el('div', { class: 'field' });
    tipField.append(
      el('label', { for: 'own-note', text: 'Anything whoever cooks it should know' }),
      note,
      el('p', { id: 'own-note-hint', class: 'field-hint', text: `Up to ${MAX_NOTE} characters. It shows above the method.` })
    );
    tipSection.appendChild(tipField);
    page.appendChild(tipSection);
    note.addEventListener('input', () => { draft.note = note.value; changed(); }, { signal });

    // ---- As you write --------------------------------------------------
    const preview = el('section', { class: 'own-section own-preview', 'aria-labelledby': 'own-preview-h' });
    preview.appendChild(el('h2', { id: 'own-preview-h', text: 'As it stands' }));
    const previewBody = el('div');
    preview.appendChild(previewBody);
    page.appendChild(preview);

    // ---- Save --------------------------------------------------------------
    const saveBar = el('div', { class: 'own-save-bar' });
    const save = el('button', { type: 'button', class: 'btn btn-primary', text: editId ? 'Save changes' : 'Save recipe' });
    const savePhone = el('button', { type: 'button', class: onPhone ? 'btn btn-primary' : 'btn', text: 'Save on this phone' });
    const saveStatus = el('p', { class: 'field-hint', role: 'status' });
    if (onPhone) saveBar.append(savePhone);
    else if (editId) saveBar.append(save);
    else saveBar.append(save, savePhone);
    if (editId || onPhone) saveBar.appendChild(el('a', { class: 'btn btn-quiet', href: backHref, text: 'Cancel' }));
    page.append(saveBar, saveStatus);
    if (!editId) {
      page.appendChild(el('p', { class: 'field-hint own-save-note', text: onPhone
        ? 'Kept on this phone, with no account needed. To put it on the plan, open it and choose Add to plan.'
        : 'Save recipe adds it to your meals, ready for the plan. Save on this phone keeps it here only, with no account or connection needed.' }));
    }

    savePhone.addEventListener('click', () => {
      const problems = validateDraft(draft);
      if (problems.length) { showProblems(problems); return; }
      errors.hidden = true;
      const kept = saveLocal(draft);
      if (!kept.ok) { saveStatus.textContent = kept.error.message; return; }
      draft.localId = kept.id;
      if (!editId && !onPhone) clearStoredDraft();
      const words = `${draft.name.trim()} saved on this phone.`;
      showToast(words);
      announce(words);
      window.location.hash = `#/recipe?l=${encodeURIComponent(kept.id)}`;
    }, { signal });

    save.addEventListener('click', async () => {
      const problems = validateDraft(draft);
      if (problems.length) { showProblems(problems); return; }
      errors.hidden = true;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        saveStatus.textContent = 'You are offline, so it cannot go to your meals yet. Save on this phone keeps it here now.';
        return;
      }
      save.disabled = true;
      saveStatus.textContent = 'Saving…';
      const result = await saveDraft(draft, index);
      if (destroyed) return;
      save.disabled = false;
      if (!result.ok) {
        console.error('Saving a recipe failed:', result.error);
        saveStatus.textContent = 'That did not reach your meals. Nothing you wrote has been lost. Try again, or use Save on this phone.';
        return;
      }
      if (!editId) clearStoredDraft();
      saveStatus.textContent = '';
      showToast(`${result.data.name} saved.`);
      announce(`${result.data.name} saved.`);
      window.location.hash = `#/recipe?m=${encodeURIComponent(result.data.id)}`;
    }, { signal });

    function showProblems(problems, { focus = true } = {}) {
      errors.replaceChildren();
      errors.appendChild(el('h2', { text: problems.length === 1 ? 'One thing to sort before saving' : `${problems.length} things to sort before saving` }));
      const ul = el('ul');
      for (const p of problems) {
        const li = el('li');
        const link = el('a', { href: `#${p.field}`, text: p.message });
        link.addEventListener('click', (event) => {
          event.preventDefault();
          focusId(p.field);
        }, { signal });
        li.appendChild(link);
        ul.appendChild(li);
      }
      errors.appendChild(ul);
      errors.hidden = false;
      if (focus) errors.focus();
    }

    // ---- Painting ----------------------------------------------------------
    function paintAll() {
      nameInput.value = draft.name || '';
      kindSelect.value = draft.kind || 'dinner';
      courseSelect.value = draft.course || 'main';
      servesInput.value = String(draft.serves || '');
      for (const box of tagBoxes) box.checked = (draft.tags || []).includes(box.value);
      note.value = draft.note || '';
      paintIngredients();
      paintSteps();
      paintPreview();
    }

    function paintIngredients() {
      ingList.replaceChildren();
      draft.ingredients.forEach((row, i) => ingList.appendChild(ingredientItem(row, i)));
    }

    function ingredientItem(row, i) {
      const li = el('li', { class: 'own-item' });
      const set = el('fieldset', { class: 'own-ing' });
      set.appendChild(el('legend', { text: `Ingredient ${i + 1}` }));
      const name = el('input', { type: 'text', id: `own-ing-name-${i}`, list: 'own-food-names', autocomplete: 'off', maxlength: '80' });
      name.value = row.name || '';
      const qty = el('input', { type: 'text', id: `own-ing-qty-${i}`, inputmode: 'decimal', autocomplete: 'off' });
      qty.value = row.quantity === '' || row.quantity === null || row.quantity === undefined ? '' : String(row.quantity);
      const unit = selectFrom(`own-ing-unit-${i}`, UNIT_OPTIONS);
      unit.value = row.unit || 'g';
      const grid = el('div', { class: 'own-ing-row' });
      grid.append(fieldWrap('Ingredient', name, 'own-field-wide'), fieldWrap('Amount', qty), fieldWrap('Unit', unit));
      set.appendChild(grid);
      const status = el('p', { class: 'field-hint own-ing-status', id: `own-ing-status-${i}` });
      name.setAttribute('aria-describedby', status.id);
      const paintStatus = () => { status.textContent = describeIngredient(row, index); };
      paintStatus();
      set.appendChild(status);

      name.addEventListener('input', () => { row.name = name.value; changed(); }, { signal });
      name.addEventListener('change', () => { paintStatus(); }, { signal });
      qty.addEventListener('input', () => { row.quantity = qty.value.trim() === '' ? '' : qty.value.trim(); changed(); }, { signal });
      qty.addEventListener('change', () => { paintStatus(); }, { signal });
      unit.addEventListener('change', () => { row.unit = unit.value; paintStatus(); changed(); }, { signal });

      // Swaps
      if (row.swaps.length) {
        const swaps = el('ul', { class: 'own-swaps' });
        row.swaps.forEach((swap, j) => swaps.appendChild(swapItem(row, swap, i, j)));
        set.appendChild(swaps);
      }

      const buttons = el('div', { class: 'own-buttons' });
      const label = () => row.name || `ingredient ${i + 1}`;
      const addSwap = el('button', { type: 'button', class: 'btn btn-small', text: 'Add a swap' });
      addSwap.setAttribute('aria-label', `Add a swap for ${label()}`);
      addSwap.addEventListener('click', () => {
        row.swaps.push(newSwap({ unit: row.unit || 'g', quantity: row.quantity }));
        paintIngredients();
        changed();
        focusId(`own-swap-name-${i}-${row.swaps.length - 1}`);
      }, { signal });
      const remove = el('button', { type: 'button', class: 'btn btn-small btn-quiet', text: 'Remove' });
      remove.setAttribute('aria-label', `Remove ${label()}`);
      remove.addEventListener('click', () => {
        draft.ingredients.splice(i, 1);
        if (!draft.ingredients.length) draft.ingredients.push(newIngredient());
        paintIngredients();
        changed();
        announce(`${row.name || 'Ingredient'} removed.`);
        focusId(`own-ing-name-${Math.min(i, draft.ingredients.length - 1)}`);
      }, { signal });
      buttons.append(addSwap, remove);
      set.appendChild(buttons);
      li.appendChild(set);
      return li;
    }

    function swapItem(row, swap, i, j) {
      const li = el('li', { class: 'own-swap' });
      const set = el('fieldset');
      set.appendChild(el('legend', { text: `Swap for ${row.name || `ingredient ${i + 1}`}` }));
      const name = el('input', { type: 'text', id: `own-swap-name-${i}-${j}`, list: 'own-food-names', autocomplete: 'off', maxlength: '80' });
      name.value = swap.name || '';
      const qty = el('input', { type: 'text', id: `own-swap-qty-${i}-${j}`, inputmode: 'decimal', autocomplete: 'off' });
      qty.value = swap.quantity === '' || swap.quantity == null ? '' : String(swap.quantity);
      const unit = selectFrom(`own-swap-unit-${i}-${j}`, UNIT_OPTIONS);
      unit.value = swap.unit || 'g';
      const why = el('input', { type: 'text', id: `own-swap-why-${i}-${j}`, autocomplete: 'off', maxlength: '40', placeholder: 'to make it vegan' });
      why.value = swap.label || '';
      const grid = el('div', { class: 'own-ing-row' });
      grid.append(fieldWrap('Use instead', name, 'own-field-wide'), fieldWrap('Amount', qty), fieldWrap('Unit', unit));
      set.appendChild(grid);
      set.appendChild(fieldWrap('When (optional)', why));
      name.addEventListener('input', () => { swap.name = name.value; changed(); }, { signal });
      qty.addEventListener('input', () => { swap.quantity = qty.value.trim(); changed(); }, { signal });
      unit.addEventListener('change', () => { swap.unit = unit.value; changed(); }, { signal });
      why.addEventListener('input', () => { swap.label = why.value; changed(); }, { signal });
      const remove = el('button', { type: 'button', class: 'btn btn-small btn-quiet', text: 'Remove swap' });
      remove.setAttribute('aria-label', `Remove the swap ${swap.name || ''}`.trim());
      remove.addEventListener('click', () => {
        row.swaps.splice(j, 1);
        paintIngredients();
        changed();
        announce('Swap removed.');
        focusId(`own-ing-name-${i}`);
      }, { signal });
      set.appendChild(remove);
      li.appendChild(set);
      return li;
    }

    function paintSteps() {
      stepList.replaceChildren();
      draft.steps.forEach((step, i) => stepList.appendChild(stepItem(step, i)));
    }

    function stepItem(step, i) {
      const li = el('li', { class: 'own-item own-step' });
      const text = el('textarea', { id: `own-step-${i}`, rows: '2', maxlength: String(MAX_STEP) });
      text.value = step.instruction || '';
      const hint = el('p', { class: 'field-hint', id: `own-step-hint-${i}`, 'aria-live': 'polite' });
      text.setAttribute('aria-describedby', hint.id);
      const paintHint = () => { hint.textContent = stepHint(text.value); };
      paintHint();
      const minutes = el('input', { type: 'text', id: `own-step-min-${i}`, inputmode: 'numeric', autocomplete: 'off' });
      minutes.value = step.minutes === '' || step.minutes == null ? '' : String(step.minutes);
      const stepField = el('div', { class: 'field own-field-wide' });
      stepField.append(el('label', { for: text.id, text: `Step ${i + 1}` }), text, hint);
      const row = el('div', { class: 'own-step-row' });
      row.append(stepField, fieldWrap('Minutes (optional)', minutes));
      li.appendChild(row);
      // Tall enough to read the whole step, growing as it is written.
      const fit = () => { text.rows = Math.max(2, Math.ceil(text.value.length / 34)); };
      fit();
      text.addEventListener('input', () => { step.instruction = text.value; fit(); paintHint(); changed(); }, { signal });
      minutes.addEventListener('input', () => { step.minutes = minutes.value.trim(); changed(); }, { signal });

      const buttons = el('div', { class: 'own-buttons' });
      const move = (delta, label) => {
        const b = el('button', { type: 'button', class: 'btn btn-small btn-quiet', text: label });
        b.setAttribute('aria-label', `${label}: step ${i + 1}`);
        const to = i + delta;
        if (to < 0 || to >= draft.steps.length) b.disabled = true;
        b.addEventListener('click', () => {
          const [moved] = draft.steps.splice(i, 1);
          draft.steps.splice(to, 0, moved);
          paintSteps();
          changed();
          announce(`Step moved to number ${to + 1}.`);
          focusId(`own-step-${to}`);
        }, { signal });
        return b;
      };
      const remove = el('button', { type: 'button', class: 'btn btn-small btn-quiet', text: 'Remove' });
      remove.setAttribute('aria-label', `Remove step ${i + 1}`);
      remove.addEventListener('click', () => {
        draft.steps.splice(i, 1);
        if (!draft.steps.length) draft.steps.push(newStep());
        paintSteps();
        changed();
        announce(`Step ${i + 1} removed.`);
        focusId(`own-step-${Math.min(i, draft.steps.length - 1)}`);
      }, { signal });
      buttons.append(move(-1, 'Move up'), move(1, 'Move down'), remove);
      li.appendChild(buttons);
      return li;
    }

    function paintPreview() {
      previewBody.replaceChildren();
      const { recipe, refMap } = draftToRecipe(draft, index);
      if (!recipe.ingredients.length) {
        previewBody.appendChild(el('p', { class: 'field-hint', text: 'Add ingredients and this shows what a serving comes to, and what you already have.' }));
        return;
      }
      // Matched on the reference name AND on what you typed, so "basmati
      // rice" in the cupboard counts for "Rice, basmati, dry". Missing
      // things are listed in your words, not the reference's.
      const typed = new Map(recipe.ingredients.map((i) => [i.ref, i.name]));
      const cover = coverage(recipe, haveSet, refMap);
      const stillMissing = cover.missing.filter((m) => !haveSet.has(normaliseName(typed.get(m.ref) || '')));
      const haveCount = cover.total - stillMissing.length;
      const have = el('p', { class: 'own-have' });
      have.textContent = stillMissing.length === 0
        ? `You have all ${cover.total} ingredients.`
        : `You have ${haveCount} of ${cover.total}. Missing: ${stillMissing.map((m) => typed.get(m.ref) || m.name).join('; ')}.`;
      previewBody.appendChild(have);
      const result = recipeNutrition(measuredOnly(recipe), refMap);
      const unknown = unknownNutrition(draft, index);
      let noteText = 'An estimate per serving, from published averages. Percentages are of a day’s UK adult reference intake.';
      if (unknown.length) noteText += ` Not counted yet: ${unknown.join(', ')}.`;
      previewBody.appendChild(nutritionBars({
        id: 'own-nutrition-h', title: 'Per serving', headingLevel: 'h3',
        totals: result.perServing, complete: result.complete, note: noteText
      }));
    }

    function changed() {
      if (!editId && !onPhone) storeDraft(draft);
      // An open list of problems keeps up as they are fixed, without moving focus.
      if (!errors.hidden) {
        const left = validateDraft(draft);
        if (left.length) showProblems(left, { focus: false });
        else { errors.hidden = true; errors.replaceChildren(); }
      }
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => { if (!destroyed) paintPreview(); }, 400);
    }

    function openPaste({ title, hint, returnFocusTo, apply }) {
      openDetailSheet({
        title,
        returnFocusTo,
        build(body, api) {
          const area = el('textarea', { id: 'own-paste', rows: '8', 'aria-describedby': 'own-paste-hint' });
          const field = el('div', { class: 'field' });
          field.append(el('label', { for: 'own-paste', text: 'Paste here' }), area,
            el('p', { id: 'own-paste-hint', class: 'field-hint', text: hint }));
          body.appendChild(field);
          const add = el('button', { type: 'button', class: 'btn btn-primary', text: 'Add them' });
          const status = el('p', { class: 'field-hint', role: 'status' });
          add.addEventListener('click', () => {
            const count = apply(area.value);
            if (!count) { status.textContent = 'Nothing to add yet. Paste some lines first.'; return; }
            announce(`${count} added.`);
            api.close();
          });
          body.append(add, status);
        }
      });
    }

    paintAll();
  }

  function focusId(id) {
    // After a repaint, on the next frame, so the element exists.
    requestAnimationFrame(() => {
      const target = mountEl.querySelector(`#${CSS.escape(id)}`);
      if (target) target.focus();
    });
  }

  return () => {
    destroyed = true;
    clearTimeout(previewTimer);
    controller.abort();
  };
}

function fieldWrap(labelText, input, extraClass = '') {
  const wrap = el('div', { class: `field${extraClass ? ` ${extraClass}` : ''}` });
  wrap.append(el('label', { for: input.id, text: labelText }), input);
  return wrap;
}

/** What the page knows about an ingredient, in a short line under it. */
export function describeIngredient(row, index) {
  const name = String(row.name || '').trim();
  if (!name) return '';
  const hit = resolveName(name, index);
  const entry = hit && hit.entry;
  const noAmount = row.quantity === '' || row.quantity === null || row.quantity === undefined;
  if (noAmount && entry) return 'No amount, so it is not counted in the nutrition.';
  if (!entry || entry.calories_per_100g === null || entry.calories_per_100g === undefined) {
    return 'New to the app. It will be added to your foods; its nutrition is not known yet.';
  }
  if (row.unit === 'item' && !(Number(entry.grams_per_item) > 0)) {
    return 'Known, but not by the item. Grams will let its nutrition count.';
  }
  if (row.unit !== 'g' && row.unit !== 'item' && !(Number(entry.grams_per_ml) > 0)) {
    return 'Known, but not by volume. Grams will let its nutrition count.';
  }
  return hit.foodId ? 'One of your foods.' : 'Nutrition known.';
}
