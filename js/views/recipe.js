// js/views/recipe.js — 03 Oct 2026 v13
// v13: servings start at your household's size.
// v12: Make it vegetarian / vegan (data/dietSwitch.js), as radio buttons.
// v11: a photo at the top when the recipe has one.
// v10: recipes kept on this phone (#/recipe?l=<id>): cook, change, delete, and
// Add to plan puts them in your meals first. Library recipes offer Make your own version.
// v9: a meal added from the library keeps the library's swaps and course.
// v8: starters and puddings say so.
// v7: spoon-sized amounts of liquid read as tsp/tbsp.
// v6: Change this recipe opens the recipe editor (#/recipe-edit?m=<id>);
// your own recipe's swaps are listed under its ingredients.
// v5: your own meals get this page too (#/recipe?m=<meal id>): the same
// what-you-have, nutrition, scaling, cook mode and Add to plan. Until now a
// meal you wrote yourself opened the old Meals screen — the last dead end.
// v4: Start cooking — the existing cook mode (one step at a time, screen kept
// awake, timers, progress kept) for library recipes, at the servings chosen.
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
import { toSpoons } from '../lib/units.js';
import { courseOf, courseLabel } from '../data/courses.js';
import { loadAllRecipes, existingLibraryRefs, addLibraryRecipe, addMissingToList } from '../data/recipeLibrary.js';
import { listStock } from '../data/pantry.js';
import { haveNames, coverage } from '../data/recipeCoverage.js';
import { addPlanEntry, DAYS, SLOTS, servingsForEntry } from '../data/mealPlan.js';
import { getHousehold } from '../data/household.js';
import { thisWeekStart, nextWeekStart } from '../lib/weeks.js';
import { requestListSync } from '../data/listSync.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { announce } from '../lib/a11y.js';
import { openCookMode } from '../components/cookMode.js';
import { referenceBySlug } from '../data/foodReference.js';
import { recipeNutrition } from '../data/nutrition.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { describeRecipeTime } from '../lib/recipeTime.js';
import { describeEquipment } from '../lib/recipeEquipment.js';
import { getRecipeNote, setFavourite } from '../data/recipeNotes.js';
import { listMeals, listIngredients, setFavourite as setMealFavourite } from '../data/meals.js';
import { listSteps, slugifyFoodName } from '../data/mealSteps.js';
import { showToast } from '../components/toast.js';
import { localIdFromHash, getLocal, linkLocal, deleteLocal } from '../data/localRecipes.js';
import { buildNameIndex, draftToRecipe, saveDraft, measuredOnly } from '../data/ownRecipe.js';
import { listFoods } from '../data/foods.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { loadImages } from '../data/recipeImages.js';
import { DIETS, dietsFor, switchRecipe, dietFromHash } from '../data/dietSwitch.js';
import { recipePhoto } from '../components/recipePhoto.js';

const SLOT_WORDS = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', drink: 'Drink'
};
const COST_WORDS = { budget: 'Budget', everyday: 'Everyday', special: 'A treat' };
const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const MAX_SERVES = 12;

/** The slug from #/recipe?r=..., or ''. */
/** Your own meal's id from #/recipe?m=..., or ''. */
export function mealIdFromHash(hash) {
  const match = String(hash || '').match(/[?&]m=([0-9a-z-]+)/i);
  return match ? match[1] : '';
}

/**
 * One of your own meals in the library recipe's shape, so every part of
 * this page works on it unchanged. Its foods stand in for the reference
 * file: each ingredient's `ref` is its food's slug, mapped to the food.
 */
export function ownMealAsRecipe(meal, ingredientRows = [], stepRows = []) {
  const refMap = new Map();
  const ingredients = [];
  const swaps = [];
  const chosenIn = new Map();
  for (const row of ingredientRows) {
    if (row.option_group != null && row.is_selected !== false) chosenIn.set(row.option_group, (row.foods || {}).name);
  }
  for (const row of ingredientRows) {
    if (row.option_group != null && row.is_selected === false) {
      // A swap: shown under the ingredients, not counted or shopped for.
      swaps.push({ instead: chosenIn.get(row.option_group) || row.option_group, text: row.option_label || (row.foods || {}).name || '' });
      continue;
    }
    const food = row.foods || {};
    const ref = slugifyFoodName(food.name) || `food-${row.food_id}`;
    refMap.set(ref, food);
    ingredients.push({ ref, name: food.name, quantity: row.quantity_g, unit: row.unit || 'g' });
  }
  const recipe = {
    slug: null,
    name: meal.name,
    default_serves: meal.default_serves || 1,
    default_slot: meal.default_slot || meal.meal_type || null,
    course: meal.course || null,
    cuisine: meal.cuisine || null,
    budget_tier: meal.budget_tier || null,
    dietary_tags: meal.dietary_tags || [],
    method_note: meal.method_note || null,
    ingredients,
    swaps,
    steps: stepRows.map((st) => ({
      instruction: st.instruction, note: st.note, duration_min: st.duration_min,
      step_group: st.step_group, while_waiting: st.while_waiting
    }))
  };
  return { recipe, refMap };
}

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
  // Small amounts of liquid read as spoons when they are exact ones:
  // 30 ml of oil is "2 tbsp". 45 ml scaled by ⅔ is 30 ml, so still spoons;
  // 200 ml of milk stays 200 ml (lib/units.js toSpoons).
  if (unit === 'ml') {
    const spoons = toSpoons(Math.round(q * 100) / 100);
    if (spoons) return spoons.text;
  }
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
  const mealId = mealIdFromHash(window.location.hash);
  // 3 Oct 2026: a recipe kept on this phone (#/recipe?l=<id>).
  const localId = mealId ? '' : localIdFromHash(window.location.hash);

  const back = el('a', {
    class: 'back-link',
    href: mealId ? '#/meals' : '#/library',
    text: mealId ? 'Your meals' : localId ? 'Recipes' : 'All recipes'
  });
  mountEl.appendChild(back);
  const heading = el('h1', { class: 'recipe-page-title', text: 'Recipe' });
  mountEl.appendChild(heading);
  const body = el('div', { class: 'recipe-page' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Loading the recipe…' }));
  mountEl.appendChild(body);

  (async () => {
    let recipe = null;
    let refMap = new Map();
    let ownMeal = null;
    let kept = null;     // a recipe kept on this phone
    let original = null; // a library recipe before any diet switch
    let nameIndex = null;
    if (localId) {
      kept = getLocal(localId);
      const [refs, foods] = await Promise.all([
        referenceBySlug().catch(() => new Map()),
        listFoods().catch(() => ({ ok: false }))
      ]);
      if (destroyed) return;
      body.replaceChildren();
      if (kept) {
        nameIndex = buildNameIndex([...refs.values()], foods && foods.ok ? foods.data || [] : []);
        ({ recipe, refMap } = draftToRecipe(kept.draft, nameIndex));
      }
    } else if (mealId) {
      const [mealsResult, ingResult, stepResult] = await Promise.all([
        listMeals(), listIngredients(mealId), listSteps(mealId)
      ]);
      if (destroyed) return;
      body.replaceChildren();
      ownMeal = mealsResult.ok ? (mealsResult.data || []).find((m) => m.id === mealId) || null : null;
      if (!mealsResult.ok || !ingResult.ok) {
        heading.textContent = 'Recipe unavailable';
        body.appendChild(el('p', { text: 'This meal could not be loaded. Check your connection and try again.' }));
        return;
      }
      if (ownMeal) {
        ({ recipe, refMap } = ownMealAsRecipe(ownMeal, ingResult.data || [], stepResult.ok ? (stepResult.data || []) : []));
        // Added from the library: its suggested swaps and course still apply.
        if (ownMeal.library_ref) {
          const library = await loadAllRecipes().catch(() => null);
          if (destroyed) return;
          const source = library && library.ok ? (library.data || []).find((r) => r.slug === ownMeal.library_ref) : null;
          if (source) {
            if (!recipe.swaps.length && Array.isArray(source.swaps)) recipe.swaps = source.swaps;
            if (!recipe.course && source.course) recipe.course = source.course;
          }
        }
      }
    } else {
      const [library, refs] = await Promise.all([
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
      refMap = refs;
      recipe = library.data.find((r) => r.slug === slug) || null;
      // 3 Oct 2026: as written, or switched to vegetarian or vegan.
      if (recipe) {
        original = recipe;
        const diet = dietFromHash(window.location.hash);
        const switched = diet ? switchRecipe(recipe, diet, refMap) : null;
        if (switched) recipe = switched.recipe;
      }
    }
    if (!recipe && localId) {
      heading.textContent = 'Recipe not found';
      body.appendChild(el('p', { text: 'That recipe is not on this phone. It may have been deleted, or kept on another phone.' }));
      body.appendChild(el('a', { class: 'btn', href: '#/library', text: 'Browse all recipes' }));
      return;
    }
    if (!recipe) {
      heading.textContent = 'Recipe not found';
      body.appendChild(el('p', { text: 'That recipe is not in the library. It may have been renamed.' }));
      body.appendChild(el('a', { class: 'btn', href: '#/library', text: 'Browse all recipes' }));
      return;
    }

    heading.textContent = recipe.name;
    document.title = `${recipe.name} · Home-OS`;

    // ---- Photo (3 Oct 2026) ---------------------------------------------
    // Library recipes, and your own versions of them. Only when there is a
    // real photo: an empty coloured band on every page reads as unfinished.
    const photoSlug = recipe.source_slug || recipe.slug || (kept && kept.draft.fromSlug) || (ownMeal && ownMeal.library_ref) || null;
    if (photoSlug) {
      const slot = el('div', { class: 'recipe-photo-slot' });
      body.appendChild(slot);
      loadImages().then((images) => {
        if (destroyed) return;
        const image = images.get(photoSlug);
        if (image) slot.appendChild(recipePhoto(recipe, image, 'hero'));
        else slot.remove();
      }).catch(() => slot.remove());
    }

    // ---- Facts -----------------------------------------------------------
    const facts = el('ul', { class: 'recipe-facts' });
    const time = describeRecipeTime(recipe);
    const seen = new Set();
    for (const fact of [
      time,
      `Serves ${recipe.default_serves}`,
      // A starter or pudding says so first; "Dinner" alone would mislead.
      courseOf(recipe) !== 'main' ? courseLabel(courseOf(recipe)) : null,
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

    // ---- Make it vegetarian / vegan (3 Oct 2026) -------------------------
    // Radio buttons, not a menu: three short choices, all visible. Changing
    // one reloads the page for that version (#/recipe?r=…&diet=…), replacing
    // rather than adding history, so Back still leaves the recipe.
    if (original && dietsFor(original).length > 1) {
      const offered = dietsFor(original);
      const current = recipe.diet || '';
      const set = el('fieldset', { class: 'recipe-diet' });
      set.appendChild(el('legend', { text: 'Make it' }));
      for (const d of DIETS.filter((x) => offered.includes(x.value))) {
        const id = `recipe-diet-${d.value || 'written'}`;
        const input = el('input', { type: 'radio', name: 'recipe-diet', id, value: d.value });
        input.checked = d.value === current;
        input.addEventListener('change', () => {
          try { sessionStorage.setItem('home-os-diet-focus', id); } catch { /* fine */ }
          const base = `#/recipe?r=${encodeURIComponent(original.slug)}`;
          window.location.replace(d.value ? `${base}&diet=${d.value}` : base);
        }, { signal });
        const row = el('div', { class: 'recipe-diet-option' });
        row.append(input, el('label', { for: id, text: d.label }));
        set.appendChild(row);
      }
      if (current) {
        set.appendChild(el('p', { class: 'field-hint', role: 'status', text: `Showing the ${current} version: ingredients, amounts, method and shopping all follow.` }));
      }
      body.appendChild(set);
      let focusId = null;
      try { focusId = sessionStorage.getItem('home-os-diet-focus'); sessionStorage.removeItem('home-os-diet-focus'); } catch { /* fine */ }
      if (focusId) requestAnimationFrame(() => { const t = document.getElementById(focusId); if (t) t.focus(); });
    }

    // ---- Actions ---------------------------------------------------------
    const actions = el('div', { class: 'recipe-actions' });
    const add = el('button', { type: 'button', class: 'btn btn-primary', text: 'Add to plan', 'aria-haspopup': 'dialog' });
    const fav = el('button', { type: 'button', class: 'btn' });
    actions.append(add, fav);
    if (ownMeal) {
      // Your own recipe is yours to change: ingredients, steps, swaps.
      actions.appendChild(el('a', { class: 'btn', href: `#/recipe-edit?m=${encodeURIComponent(ownMeal.id)}`, text: 'Change this recipe' }));
    } else if (kept) {
      fav.hidden = true;
      actions.appendChild(el('a', { class: 'btn', href: `#/recipe-edit?l=${encodeURIComponent(kept.id)}`, text: 'Change this recipe' }));
      const del = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Delete from this phone' });
      del.addEventListener('click', async () => {
        const sure = await confirmDialog({
          title: `Delete ${recipe.name}?`,
          message: kept.draft.syncedMealId
            ? 'It goes from this phone. The copy in your meals stays.'
            : 'It goes from this phone. This cannot be undone unless you have a backup.',
          confirmLabel: 'Delete', cancelLabel: 'Keep it'
        });
        if (!sure || destroyed) return;
        deleteLocal(kept.id);
        showToast(`${recipe.name} deleted from this phone.`);
        window.location.hash = '#/library';
      }, { signal });
      actions.appendChild(del);
    } else {
      // A library recipe stays as it is; your version is kept on this phone.
      const fromHref = `#/recipe-edit?from=${encodeURIComponent(recipe.source_slug || recipe.slug)}${recipe.diet ? `&diet=${recipe.diet}` : ''}`;
      actions.appendChild(el('a', { class: 'btn', href: fromHref, text: 'Make your own version' }));
    }
    body.appendChild(actions);
    const status = el('p', { class: 'field-hint', role: 'status' });
    body.appendChild(status);

    // Your copy of this recipe, if you have one: planning uses it rather
    // than adding the recipe a second time.
    let ownedMeal = ownMeal;
    if (!ownMeal && !kept) existingLibraryRefs().then((refs) => {
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
            if (!meal && kept) {
              // A phone recipe goes into your meals first (the plan needs a
              // meal), with its latest changes. Remembered, so planning it
              // again updates that meal rather than adding a second one.
              let saved = await saveDraft({ ...kept.draft, mealId: kept.draft.syncedMealId || null }, nameIndex);
              if (!saved.ok && kept.draft.syncedMealId) saved = await saveDraft({ ...kept.draft, mealId: null }, nameIndex);
              if (saved.ok) { linkLocal(kept.id, saved.data.id); kept.draft.syncedMealId = saved.data.id; meal = saved.data; }
            } else if (!meal) {
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
    if (ownMeal) {
      favourite = Boolean(ownMeal.is_favourite);
      paintFav();
    } else if (kept) {
      // No favourites on phone recipes: being kept here is the point.
    } else {
      getRecipeNote(recipe.source_slug || recipe.slug).then((saved) => {
        if (destroyed || !saved || !saved.ok || !saved.data) return;
        favourite = Boolean(saved.data.is_favourite);
        paintFav();
      }).catch(() => {});
    }
    fav.addEventListener('click', async () => {
      favourite = !favourite;
      paintFav();
      const result = ownMeal
        ? await setMealFavourite(ownMeal.id, favourite)
        : await setFavourite(recipe.source_slug || recipe.slug, favourite);
      if (!result.ok) {
        favourite = !favourite;
        paintFav();
        showToast('That did not save. Try again.');
      }
    }, { signal });

    // ---- Nutrition -------------------------------------------------------
    {
      // Unmeasured things on a phone recipe ("salt") are listed, not counted.
      const result = recipeNutrition(kept ? measuredOnly(recipe) : recipe, refMap);
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
    // 3 Oct 2026: start at your household's size, as the plan and the
    // shopping list already do (mealPlan.servingsForEntry). A recipe for
    // four opens as one for a household of one.
    const servesNote = el('p', { class: 'field-hint recipe-serves-note' });
    getHousehold().then((h) => {
      if (destroyed || !h || !h.ok) return;
      const members = (h.data && h.data.members) || [];
      if (members.length === 0) return;
      const size = servingsForEntry({ serves_override: null, member_ids: [] }, members);
      const whole = Math.max(1, Math.min(MAX_SERVES, Math.ceil(size)));
      if (whole === serves) return;
      serves = whole;
      servesNote.textContent = `Set for your household (${whole}). The recipe is written for ${baseServes}.`;
      paintIngredients();
    }).catch(() => {});
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
    ingSection.appendChild(servesNote);

    if (recipe.swaps && recipe.swaps.length) {
      const swapList = el('ul', { class: 'recipe-swaps' });
      for (const sw of recipe.swaps) {
        swapList.appendChild(el('li', { text: `Instead of ${cookingName(sw.instead || '')}: ${sw.text}` }));
      }
      ingSection.append(el('h3', { text: 'Swaps' }), swapList);
    }

    const kit = describeEquipment(recipe);
    if (kit) {
      ingSection.appendChild(el('p', { class: 'field-hint', text: `You will probably need: ${kit}` }));
    }

    // ---- Method ----------------------------------------------------------
    const method = el('section', { class: 'recipe-page-section', 'aria-labelledby': 'recipe-method-h' });
    const methodHead = el('div', { class: 'recipe-section-head' });
    methodHead.appendChild(el('h2', { id: 'recipe-method-h', text: 'Method' }));
    const cookBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Start cooking' });
    cookBtn.addEventListener('click', () => {
      // Cook mode reads ingredient rows; a library recipe's are built from
      // the reference file so its {{ing:…}} tokens resolve to amounts.
      const rows = (recipe.ingredients || []).map((ing) => ({
        quantity_g: ing.quantity, unit: ing.unit, foods: refMap.get(ing.ref) || { name: ing.ref }
      }));
      openCookMode({
        meal: { id: ownMeal ? ownMeal.id : kept ? `local:${kept.id}` : `library:${recipe.slug}`, name: recipe.name },
        steps: recipe.steps || [],
        ingredients: rows,
        scale: serves / baseServes
      });
    }, { signal });
    methodHead.appendChild(cookBtn);
    method.appendChild(methodHead);
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
