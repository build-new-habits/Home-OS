// js/views/meals/libraryDetail.js — 07 Sep 2026 v1
//
// What is actually in a recipe, before you commit to it.
//
// ---- Why ----
// Device test, 7 Sep 2026: "How do I find the recipe ingredients and
// instructions and other info? I might want a light calorie meal, but I
// definitely want to see the ingredients and instructions."
//
// The library listed a hundred and ten recipes by name and offered exactly
// one thing to do with each: add it to your meals. To read one you had to
// add it first, which is choosing a meal by its title.
//
// ---- What is real and what is not ----
// Ingredients, quantities and method steps are all in the library data.
// Nutrition is computable: every ingredient is a reference slug, and
// data/food_reference.json carries calories and macros per 100 g plus a
// gram weight for countable items.
//
// PREPARATION AND COOKING TIME ARE NOT RECORDED ANYWHERE. Not in the
// library, not in the reference. So this does not show a time, and does not
// derive one from the number of steps — "12 steps" says nothing about
// whether a thing takes ten minutes or three hours, and a made-up figure on
// a recipe is worse than a missing one because you plan your evening around
// it. Adding real times is a data job; see the note this file prints.
//
// ---- Nutrition is stated as an estimate, and says why ----
// Some ingredients resolve and some do not. A total built from nine of
// eleven ingredients is not the calorie count of the dish, and presenting
// it as one would be exactly the "unknown treated as zero" mistake the
// behavioural principles exist to prevent.

import { el } from '../../lib/dom.js';
import { openDetailSheet } from '../../components/detailSheet.js';
import { lookupSlug } from '../../data/foodReference.js';

/** Grams for one ingredient line, or null when it cannot be known. */
function gramsFor(ing, entry) {
  const qty = Number(ing.quantity);
  if (!Number.isFinite(qty)) return null;
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g') return qty;
  if (unit === 'kg') return qty * 1000;
  // A countable thing only converts if the reference says what one weighs.
  if (unit === 'item' && entry && entry.grams_per_item) return qty * entry.grams_per_item;
  // ml is NOT assumed to be grams. It is right for water and wrong for oil,
  // and being wrong about oil moves a calorie total a long way.
  return null;
}

function describeAmount(ing) {
  const qty = ing.quantity;
  if (qty === null || qty === undefined) return '';
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'item') return String(qty);
  return `${qty} ${ing.unit}`;
}

export async function openLibraryRecipe(recipe, returnFocusTo) {
  // Resolved before the sheet opens: a sheet that appears and then fills in
  // is harder to read than one that arrives complete.
  const resolved = await Promise.all((recipe.ingredients || []).map(async (ing) => {
    const entry = await lookupSlug(ing.ref).catch(() => null);
    return { ing, entry, grams: gramsFor(ing, entry) };
  }));

  openDetailSheet({
    title: recipe.name,
    subtitle: [recipe.cuisine, recipe.default_slot, `serves ${recipe.default_serves}`]
      .filter(Boolean).join(' · '),
    returnFocusTo,
    build(body) {
      // ---- Nutrition, per serving, and honest about its footing --------
      let kcal = 0;
      let known = 0;
      for (const r of resolved) {
        if (r.grams != null && r.entry && r.entry.calories_per_100g != null) {
          kcal += (r.grams / 100) * r.entry.calories_per_100g;
          known += 1;
        }
      }
      const serves = Number(recipe.default_serves) || 1;
      const nut = el('p', { class: 'recipe-nutrition' });
      if (known === 0) {
        nut.textContent = 'No calorie estimate — none of these ingredients '
          + 'have nutrition recorded.';
      } else if (known === resolved.length) {
        nut.textContent = `About ${Math.round(kcal / serves)} kcal a serving.`;
      } else {
        // Says what it is missing. A total from part of a recipe is not the
        // recipe's total, and rounding that distinction away is how an
        // estimate gets trusted as a fact.
        nut.textContent = `At least ${Math.round(kcal / serves)} kcal a serving, `
          + `from ${known} of ${resolved.length} ingredients. `
          + 'The rest have no nutrition recorded, so the real figure is higher.';
      }
      body.appendChild(nut);

      // Time is not in the data. Said once, plainly, rather than left as a
      // gap the eye keeps looking for.
      body.appendChild(el('p', {
        class: 'field-hint',
        text: `${recipe.steps.length} steps. How long it takes is not recorded yet.`
      }));

      body.appendChild(el('h3', { text: 'Ingredients' }));
      const list = el('ul', { class: 'recipe-ingredients' });
      for (const { ing, entry } of resolved) {
        const row = el('li');
        const amount = describeAmount(ing);
        // The reference name where there is one; the raw slug is not a
        // shopping list you could read in a kitchen.
        const name = entry ? entry.name : ing.ref.replace(/-/g, ' ');
        row.textContent = amount ? `${amount} ${name}` : name;
        list.appendChild(row);
      }
      body.appendChild(list);

      body.appendChild(el('h3', { text: 'Method' }));
      const steps = el('ol', { class: 'recipe-steps' });
      for (const step of recipe.steps || []) {
        // {{ing:slug}} tokens are for the app, not for a person. Replaced
        // with the ingredient's real name.
        const text = String(step.instruction || '').replace(
          /\{\{ing:([a-z0-9-]+)\}\}/gi,
          (_, slug) => {
            const hit = resolved.find((r) => r.ing.ref === slug);
            return hit && hit.entry ? hit.entry.name.toLowerCase() : slug.replace(/-/g, ' ');
          }
        );
        steps.appendChild(el('li', { text }));
      }
      body.appendChild(steps);

      if (recipe.method_note) {
        body.appendChild(el('p', { class: 'field-hint', text: recipe.method_note }));
      }
    }
  });
}
