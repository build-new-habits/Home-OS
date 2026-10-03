// js/views/recipe.js — 03 Oct 2026 v3
// v3: Add to plan (day and meal, straight from here), what you have of it,
// and the missing ingredients onto the list in one tap. The two dead ends
// were: add to meals, then go to the plan; see what is missing, then go to Shop.
// v2: nutrition bars moved to components/nutritionBars.js (shared with Today).
// Kitchen rebuild, K5. One recipe on its own page.
//
// ---- Why a page and not the sheet ----
// The library already had a detail sheet (views/meals/libraryDetail.js) and
// it stays for the Meals page. But a recipe is something you cook FROM, with
// the phone propped against the kettle: it needs room for the method, a
// servings control that rescales the ingredients, a back button that works,
// and a URL you can return to mid-cook. A sheet gives none of those.
//
// ---- Which recipe ----
// #/recipe?r=<library slug>. The router matches the path before the "?",
// so no router change was needed, and the slug in the URL means the system
// back button, a refresh and a bookmark all land on the same recipe.
//
// ---- Nutrition ----
// From data/nutrition.js, which feeds computeMacros. Per serving does NOT
// change with the servings stepper: cooking for six makes six portions of
// the same size. Only the ingredient amounts scale.

import { el } from '../lib/dom.js';
import { loadAllRecipes, existingLibraryRefs, addLibraryRecipe, addMissingToList } from '../data/recipeLibrary.js';
import { listStock } from '../data/pantry.js';
import { haveNames, coverage } from '../data/recipeCoverage.js';
import { addPlanEntry, DAYS, SLOTS } from '../data/mealPlan.js';
import { thisWeekStart, nextWeekStart } from '../lib/weeks.js';
import { requestListSync } from '../data/listSync.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { announce } from '../lib/a11y.js';
import { referenceBySlug } from '../data/foodReference.js';
import { recipeNutrition } from '../data/nutrition.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { describeRecipeTime } from '../lib/recipeTime.js';
import { describeEquipment } from '../lib/recipeEquipment.js';
import { getRecipeNote, setFavourite } from '../data/recipeNotes.js';
import { showToast } from '../components/toast.js';

const SLOT_WORDS = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', drink: 'Drink'
};
const COST_WORDS = { budget: 'Budget', everyday: 'Everyday', special: 'A treat' };
const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const MAX_SERVES = 12;

/** The slug from #/recipe?r=..., or ''. */
export function slugFromHash(hash) {
  const match = String(hash || '').match(/[?&]r=([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

/**
 * An ingredient amount at a given scale, in words a cook reads.
 * Grams and millilitres round to sensible steps; countable things go to
 * the nearest quarter and show as fractions, so "0.666 onion" never appears.
 */
export function scaledAmount(quantity, unit, scale) {
  const q = Number(quantity) * scale;
  if (!Number.isFinite(q) || q <= 0) return '';
  if (unit === 'g' || unit === 'ml') {
    let value = q;
    let u = unit;
    if (value >= 1000) { value /= 1000; u = unit === 'g' ? 'kg' : 'litres'; value = Math.round(value * 10) / 10; }
    else if (value >= 100) value = Math.round(value / 10) * 10;
    else if (value >= 10) value = Math.round(value);
    else value = Math.round(value * 2) / 2;
    return `${value.toLocaleString('en-GB')} ${u}`;
  }
  // Items: nearest quarter, never below a quarter.
  const quarters = Math.max(0.25, Math.round(q * 4) / 4);
  const whole = Math.floor(quarters);
  const frac = quarters - whole;
  return `${whole || ''}${FRACTIONS[frac] || ''}` || '¼';
}

/**
 * Reference names are written for a shopping list: "Oats, rolled",
 * "Milk, semi-skimmed". In a recipe they read "rolled oats". One comma is
 * turned round; anything more complicated is left exactly as written.
 */
export function cookingName(name) {
  const parts = String(name || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return String(name || '');
  const turned = `${parts[1]} ${parts[0].charAt(0).toLowerCase()}${parts[0].slice(1)}`;
  return turned.charAt(0).toUpperCase() + turned.slice(1);
}

function ingredientName(ing, entry, amountIsOne) {
  const base = entry ? cookingName(entry.name) : String(ing.ref || '').replace(/-/g, ' ');
  // "Egg, medium" reads as a shopping-list entry. On a recipe it is
  // "medium egg"; the label the reference gives one item is better still.
  if (entry && ing.unit === 'item' && entry.item_label) {
    return amountIsOne ? entry.item_label : `${entry.item_label}s`;
  }
  return base;
}

function stepText(step, refMap) {
  return String(step.instruction || '').replace(/\{\{ing:([a-z0-9-]+)\}\}/gi, (_, slug) => {
    const entry = refMap.get(slug);
    return entry ? cookingName(entry.name).toLowerCase() : slug.replace(/-/g, ' ');
  });
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const slug = slugFromHash(window.location.hash);

  const back = el('a', { class: 'back-link', href: '#/library', text: 'All recipes' });
  mountEl.appendChild(back);
  const heading = el('h1', { class: 'recipe-page-title', text: 'Recipe' });
  mountEl.appendChild(heading);
  const body = el('div', { class: 'recipe-page' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Loading the recipe…' }));
  mountEl.appendChild(body);

  (async () => {
    const [library, refMap] = await Promise.all([
      loadAllRecipes(),
      referenceBySlug().catch(() => new Map())
    ]);
    if (destroyed) return;
    body.replaceChildren();

    if (!library.ok) {
      heading.textContent = 'Recipe unavailable';
      body.appendChild(el('p', { text: 'The recipe library could not be loaded. Check your connection and try again.' }));
      return;
    }
    const recipe = library.data.find((r) => r.slug === slug);
    if (!recipe) {
      heading.textContent = 'Recipe not found';
      body.appendChild(el('p', { text: 'That recipe is not in the library. It may have been renamed.' }));
      body.appendChild(el('a', { class: 'btn', href: '#/library', text: 'Browse all recipes' }));
      return;
    }

    heading.textContent = recipe.name;
    document.title = `${recipe.name} · Home-OS`;

    // ---- Facts -----------------------------------------------------------
    const facts = el('ul', { class: 'recipe-facts' });
    const time = describeRecipeTime(recipe);
    const seen = new Set();
    for (const fact of [
      time,
      `Serves ${recipe.default_serves}`,
      SLOT_WORDS[recipe.default_slot],
      recipe.cuisine,
      COST_WORDS[recipe.budget_tier],
      ...(recipe.dietary_tags || []).map((t) => t.replace(/_/g, ' '))
    ].filter(Boolean)) {
      // A breakfast recipe filed under the cuisine "Breakfast" would say so twice.
      const key = fact.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      facts.appendChild(el('li', { class: 'chip', text: fact.replace(/\.$/, '') }));
    }
    body.appendChild(facts);

    // ---- Actions ---------------------------------------------------------
    const actions = el('div', { class: 'recipe-actions' });
    const add = el('button', { type: 'button', class: 'btn btn-primary', text: 'Add to plan', 'aria-haspopup': 'dialog' });
    const fav = el('button', { type: 'button', class: 'btn' });
    actions.append(add, fav);
    body.appendChild(actions);
    const status = el('p', { class: 'field-hint', role: 'status' });
    body.appendChild(status);

    // Your copy of this recipe, if you have one: planning uses it rather
    // than adding the recipe a second time.
    let ownedMeal = null;
    existingLibraryRefs().then((refs) => {
      if (destroyed || !refs || !refs.ok) return;
      ownedMeal = (refs.data instanceof Map && refs.data.get(recipe.slug)) || null;
    }).catch(() => {});

    add.addEventListener('click', () => openPlanSheet(), { signal });

    function openPlanSheet() {
      const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
      openDetailSheet({
        title: `Add ${recipe.name} to the plan`,
        returnFocusTo: add,
        build(sheetBody, api) {
          const form = el('form', { class: 'plan-add-form' });
          const week = el('select', { id: 'plan-add-week' });
          week.append(el('option', { value: 'this', text: 'This week' }), el('option', { value: 'next', text: 'Next week' }));
          const day = el('select', { id: 'plan-add-day' });
          DAYS.forEach((d, i) => {
            const o = el('option', { value: d.value, text: d.label });
            if (i === todayIndex) o.selected = true;
            day.appendChild(o);
          });
          const slot = el('select', { id: 'plan-add-slot' });
          for (const s2 of SLOTS) {
            const o = el('option', { value: s2.value, text: s2.label });
            if (s2.value === (recipe.default_slot || 'dinner')) o.selected = true;
            slot.appendChild(o);
          }
          const go = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Add to plan' });
          form.append(
            el('label', { for: 'plan-add-week', text: 'Week' }), week,
            el('label', { for: 'plan-add-day', text: 'Day' }), day,
            el('label', { for: 'plan-add-slot', text: 'Meal' }), slot,
            go
          );
          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            go.disabled = true;
            go.textContent = 'Adding…';
            let meal = ownedMeal;
            if (!meal) {
              const added = await addLibraryRecipe(recipe);
              meal = added.ok ? added.data : (added.existing || null);
            }
            if (!meal) {
              go.disabled = false; go.textContent = 'Add to plan';
              showToast('That did not save. Check your connection and try again.');
              return;
            }
            ownedMeal = meal;
            const result = await addPlanEntry({
              meal_id: meal.id, day_of_week: day.value, slot: slot.value,
              week_start: week.value === 'next' ? nextWeekStart() : thisWeekStart()
            });
            if (!result.ok) {
              go.disabled = false; go.textContent = 'Add to plan';
              showToast(result.error && result.error.message ? result.error.message : 'That did not save.');
              return;
            }
            requestListSync();
            const dayLabel = (DAYS.find((d) => d.value === day.value) || {}).label;
            const words = `Added to ${week.value === 'next' ? 'next week\u2019s ' : ''}${dayLabel} ${slot.value}. The shopping list will follow.`;
            api.close();
            status.textContent = words;
            announce(words);
          });
          sheetBody.appendChild(form);
        }
      });
    }

    // ---- What you have ---------------------------------------------------
    const haveBox = el('section', { class: 'recipe-have', 'aria-labelledby': 'recipe-have-h' });
    haveBox.hidden = true;
    body.appendChild(haveBox);
    listStock().then((stockResult) => {
      if (destroyed || !stockResult.ok) return;
      const result = coverage(recipe, haveNames(stockResult.data || [], new Date().toISOString()), refMap);
      paintHave(result);
    }).catch(() => {});

    function paintHave(result) {
      haveBox.replaceChildren();
      haveBox.hidden = false;
      const all = result.missing.length === 0;
      haveBox.appendChild(el('h2', {
        id: 'recipe-have-h', class: 'recipe-have-title',
        text: all ? 'You have everything' : `You have ${result.have.length} of ${result.total}`
      }));
      if (all) return;
      haveBox.appendChild(el('p', {
        class: 'recipe-have-missing',
        text: `Missing: ${result.missing.map((i) => cookingName(i.name).toLowerCase()).join(', ')}.`
      }));
      const n = result.missing.length;
      const btn = el('button', { type: 'button', class: 'btn', text: `Add the ${n} missing to the list` });
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Adding…';
        const done = await addMissingToList(result.missing);
        if (destroyed) return;
        if (!done.ok) {
          btn.disabled = false;
          btn.textContent = `Add the ${n} missing to the list`;
          showToast('That did not save. Check your connection and try again.');
          return;
        }
        const words = done.skipped
          ? `${done.added} added to the shopping list; ${done.skipped} already on it.`
          : `${done.added} added to the shopping list.`;
        btn.textContent = 'On the list';
        status.textContent = words;
        announce(words);
      }, { signal });
      haveBox.appendChild(btn);
    }

    let favourite = false;
    const paintFav = () => {
      fav.textContent = favourite ? 'In your favourites' : 'Add to favourites';
      fav.setAttribute('aria-pressed', String(favourite));
    };
    paintFav();
    getRecipeNote(recipe.slug).then((saved) => {
      if (destroyed || !saved || !saved.ok || !saved.data) return;
      favourite = Boolean(saved.data.is_favourite);
      paintFav();
    }).catch(() => {});
    fav.addEventListener('click', async () => {
      favourite = !favourite;
      paintFav();
      const result = await setFavourite(recipe.slug, favourite);
      if (!result.ok) {
        favourite = !favourite;
        paintFav();
        showToast('That did not save. Try again.');
      }
    }, { signal });

    // ---- Nutrition -------------------------------------------------------
    {
      const result = recipeNutrition(recipe, refMap);
      let note = 'An estimate, from published averages for each ingredient. '
        + 'Percentages are of a day\u2019s UK adult reference intake.';
      if (result.incompleteCount > 0) {
        note += ` ${result.incompleteNames.join(', ')} could not be counted, so the real figures are higher.`;
      }
      body.appendChild(nutritionBars({
        id: 'recipe-nutrition-h', title: 'Nutrition per serving',
        totals: result.perServing, complete: result.complete, note
      }));
    }

    // ---- Ingredients, scaled --------------------------------------------
    const ingSection = el('section', { class: 'recipe-page-section', 'aria-labelledby': 'recipe-ing-h' });
    const ingHead = el('div', { class: 'recipe-section-head' });
    ingHead.appendChild(el('h2', { id: 'recipe-ing-h', text: 'Ingredients' }));
    const stepper = el('div', { class: 'serves-stepper', role: 'group', 'aria-label': 'Servings' });
    const minus = el('button', { type: 'button', class: 'btn btn-small', 'aria-label': 'Fewer servings', text: '−' });
    const count = el('output', { class: 'serves-count', 'aria-live': 'polite' });
    const plus = el('button', { type: 'button', class: 'btn btn-small', 'aria-label': 'More servings', text: '+' });
    stepper.append(minus, count, plus);
    ingHead.appendChild(stepper);
    ingSection.appendChild(ingHead);
    const list = el('ul', { class: 'recipe-ingredients' });
    ingSection.appendChild(list);
    body.appendChild(ingSection);

    const baseServes = Number(recipe.default_serves) || 1;
    let serves = baseServes;
    const paintIngredients = () => {
      count.textContent = `${serves} ${serves === 1 ? 'serving' : 'servings'}`;
      minus.disabled = serves <= 1;
      plus.disabled = serves >= MAX_SERVES;
      list.replaceChildren();
      for (const ing of recipe.ingredients || []) {
        const entry = refMap.get(ing.ref);
        const amount = scaledAmount(ing.quantity, ing.unit, serves / baseServes);
        const one = ing.unit === 'item' && amount === '1';
        const li = el('li', { class: 'recipe-ingredient' });
        li.appendChild(el('span', { class: 'recipe-ingredient-amount', text: amount }));
        li.appendChild(el('span', { class: 'recipe-ingredient-name', text: ingredientName(ing, entry, one) }));
        list.appendChild(li);
      }
    };
    minus.addEventListener('click', () => { if (serves > 1) { serves -= 1; paintIngredients(); } }, { signal });
    plus.addEventListener('click', () => { if (serves < MAX_SERVES) { serves += 1; paintIngredients(); } }, { signal });
    paintIngredients();

    const kit = describeEquipment(recipe);
    if (kit) {
      ingSection.appendChild(el('p', { class: 'field-hint', text: `You will probably need: ${kit}` }));
    }

    // ---- Method ----------------------------------------------------------
    const method = el('section', { class: 'recipe-page-section', 'aria-labelledby': 'recipe-method-h' });
    method.appendChild(el('h2', { id: 'recipe-method-h', text: 'Method' }));
    const steps = el('ol', { class: 'recipe-method' });
    for (const step of recipe.steps || []) {
      steps.appendChild(el('li', { class: 'recipe-step', text: stepText(step, refMap) }));
    }
    method.appendChild(steps);
    if (recipe.method_note) method.appendChild(el('p', { class: 'field-hint', text: recipe.method_note }));
    body.appendChild(method);
  })().catch((error) => {
    if (destroyed) return;
    console.error('Recipe page failed:', error);
    heading.textContent = 'Recipe unavailable';
    body.replaceChildren(el('p', { text: 'Something went wrong loading this recipe. Try again.' }));
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
