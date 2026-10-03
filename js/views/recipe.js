// js/views/recipe.js — 03 Oct 2026 v1
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
import { loadAllRecipes, existingLibraryRefs, addLibraryRecipe, describeAdd } from '../data/recipeLibrary.js';
import { referenceBySlug } from '../data/foodReference.js';
import { recipeNutrition, nutritionRows, REFERENCE_INTAKES } from '../data/nutrition.js';
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

function nutritionBlock(result) {
  const section = el('section', { class: 'recipe-page-section', 'aria-labelledby': 'recipe-nutrition-h' });
  section.appendChild(el('h2', { id: 'recipe-nutrition-h', text: 'Nutrition per serving' }));
  const rows = nutritionRows(result.perServing, result.complete, REFERENCE_INTAKES);
  const list = el('ul', { class: 'nutrition-bars' });
  for (const row of rows) {
    const li = el('li', { class: 'nutrition-row' });
    const amount = row.amount === null ? 'unknown' : `${row.atLeast ? 'at least ' : ''}${row.amount.toLocaleString('en-GB')} ${row.unit}`;
    li.appendChild(el('span', { class: 'nutrition-name', text: row.label }));
    li.appendChild(el('span', { class: 'nutrition-amount', text: amount }));
    const bar = el('span', { class: 'nutrition-bar', 'aria-hidden': 'true' });
    const fill = el('span', { class: 'nutrition-bar-fill' });
    // The bar stops at full; the number does not. Over 100% is information,
    // not a warning, so it gets no colour of its own (principle 1).
    fill.style.width = `${Math.min(row.percent || 0, 100)}%`;
    bar.appendChild(fill);
    li.appendChild(bar);
    li.appendChild(el('span', {
      class: 'nutrition-percent',
      text: row.percent === null ? '' : `${row.percent}%`
    }));
    if (row.percent !== null) {
      li.appendChild(el('span', {
        class: 'visually-hidden',
        text: ` of a day's reference intake of ${row.target.toLocaleString('en-GB')} ${row.unit}`
      }));
    }
    list.appendChild(li);
  }
  section.appendChild(list);
  let note = 'An estimate, from published averages for each ingredient. '
    + 'Percentages are of a day’s UK adult reference intake.';
  if (result.incompleteCount > 0) {
    note += ` ${result.incompleteNames.join(', ')} could not be counted, so the real figures are higher.`;
  }
  section.appendChild(el('p', { class: 'field-hint', text: note }));
  return section;
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
    const add = el('button', { type: 'button', class: 'btn btn-primary', text: 'Add to my meals' });
    const fav = el('button', { type: 'button', class: 'btn' });
    actions.append(add, fav);
    body.appendChild(actions);
    const status = el('p', { class: 'field-hint', role: 'status' });
    body.appendChild(status);

    existingLibraryRefs().then((refs) => {
      if (destroyed || !refs || !refs.ok) return;
      const owned = refs.data instanceof Map && refs.data.has(recipe.slug);
      if (owned) { add.textContent = 'In your meals'; add.disabled = true; }
    }).catch(() => {});

    add.addEventListener('click', async () => {
      add.disabled = true;
      add.textContent = 'Adding…';
      const result = await addLibraryRecipe(recipe);
      if (destroyed) return;
      if (!result.ok) {
        add.disabled = Boolean(result.existing);
        add.textContent = result.existing ? 'In your meals' : 'Add to my meals';
        status.textContent = result.existing ? `You already have ${result.existing.name}.` : 'That did not save. Check your connection and try again.';
        return;
      }
      add.textContent = 'In your meals';
      status.textContent = describeAdd(result);
    }, { signal });

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
    body.appendChild(nutritionBlock(recipeNutrition(recipe, refMap)));

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
