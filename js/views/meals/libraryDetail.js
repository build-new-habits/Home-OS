// js/views/meals/libraryDetail.js — 08 Sep 2026 v4
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
import { describeRecipeTime } from '../../lib/recipeTime.js';
import { describeEquipment } from '../../lib/recipeEquipment.js';
import { getRecipeNote, setFavourite, setRecipeNote } from '../../data/recipeNotes.js';
import { showToast } from '../../components/toast.js';

/** Grams for one ingredient line, or null when it cannot be known. */
function gramsFor(ing, entry) {
  const qty = Number(ing.quantity);
  if (!Number.isFinite(qty)) return null;
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g') return qty;
  if (unit === 'kg') return qty * 1000;
  // A countable thing only converts if the reference says what one weighs.
  if (unit === 'item' && entry && entry.grams_per_item) return qty * entry.grams_per_item;
  // Millilitres convert when the reference knows the density — which it
  // does for all 226 ml ingredients in the library.
  //
  // The first version of this refused to convert ml at all, on the sound
  // reasoning that assuming 1 ml = 1 g is right for water and badly wrong
  // for oil. That reasoning was correct and the conclusion was not: the
  // data already carries grams_per_ml, and I never looked. It is why
  // Overnight oats reported "3 of 6 ingredients" while sitting on a
  // complete set of figures.
  if (unit === 'ml' && entry && entry.grams_per_ml) return qty * entry.grams_per_ml;
  return null;
}

function describeAmount(ing) {
  const qty = ing.quantity;
  if (qty === null || qty === undefined) return '';
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'item') return String(qty);
  return `${qty} ${ing.unit}`;
}

export async function openLibraryRecipe(recipe, returnFocusTo, onChanged) {
  // Resolved before the sheet opens: a sheet that appears and then fills in
  // is harder to read than one that arrives complete.
  const resolved = await Promise.all((recipe.ingredients || []).map(async (ing) => {
    const entry = await lookupSlug(ing.ref).catch(() => null);
    return { ing, entry, grams: gramsFor(ing, entry) };
  }));

  // Read before the sheet opens, with the ingredients. A favourite heart
  // that arrives unfilled and then fills itself half a second later reads
  // as the app changing its mind.
  const saved = await getRecipeNote(recipe.slug).catch(() => ({ ok: false }));
  const existing = saved.ok ? saved.data : null;

  openDetailSheet({
    title: recipe.name,
    subtitle: [recipe.cuisine, recipe.default_slot, `serves ${recipe.default_serves}`]
      .filter(Boolean).join(' · '),
    returnFocusTo,
    build(body) {
      // ---- Nutrition, per serving, and honest about its footing --------
      // Calories AND the three macros, from the same grams. Protein is the
      // one most often looked for and it was computed and thrown away.
      const totals = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
      let known = 0;
      for (const r of resolved) {
        if (r.grams == null || !r.entry || r.entry.calories_per_100g == null) continue;
        const per = r.grams / 100;
        totals.kcal += per * r.entry.calories_per_100g;
        // A macro that is absent is absent — not zero. Adding nothing for a
        // missing protein figure understates the total, which is the right
        // direction to be wrong in, and the line below says how many
        // ingredients it stands on.
        if (r.entry.protein_g != null) totals.protein += per * r.entry.protein_g;
        if (r.entry.fat_g != null) totals.fat += per * r.entry.fat_g;
        if (r.entry.carbs_g != null) totals.carbs += per * r.entry.carbs_g;
        known += 1;
      }
      const kcal = totals.kcal;
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

      // The three macros, per serving, as chips. Only when there is
      // something to divide — a row of zeroes is not information.
      if (known > 0) {
        const chips = el('p', { class: 'recipe-macros' });
        for (const [label, value] of [
          ['protein', totals.protein], ['fat', totals.fat], ['carbs', totals.carbs]
        ]) {
          chips.appendChild(el('span', {
            class: 'macro-chip',
            text: `${Math.round(value / serves)} g ${label}`
          }));
        }
        body.appendChild(chips);
      }

      // What it costs, in the bands the library actually records. Three,
      // not four: budget / everyday / special. A fourth would be invented.
      const COST = { budget: '£ budget', everyday: '££ everyday', special: '£££ a treat' };
      if (COST[recipe.budget_tier]) {
        body.appendChild(el('p', {
          class: 'recipe-cost', text: COST[recipe.budget_tier]
        }));
      }

      // Read out of the method rather than invented — see lib/recipeTime.js.
      const time = describeRecipeTime(recipe);
      body.appendChild(el('p', {
        class: 'field-hint',
        text: [`${recipe.steps.length} steps`, time].filter(Boolean).join('. ')
      }));

      // Read from the method, and labelled as such. It will miss things —
      // the jar for overnight oats, a sieve nobody mentioned — so it must
      // never read as "the equipment". See lib/recipeEquipment.js.
      const kit = describeEquipment(recipe);
      if (kit) {
        body.appendChild(el('h3', { text: 'You will probably need' }));
        body.appendChild(el('p', { class: 'recipe-equipment', text: kit }));
        body.appendChild(el('p', {
          class: 'field-hint',
          text: 'Read from the method, so it may not be the whole list.'
        }));
      }

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

      // ---- Yours: a favourite, and anything you want to remember --------
      let favourite = !!(existing && existing.is_favourite);
      const favBtn = el('button', { type: 'button', class: 'btn btn-block' });
      const paintFav = () => {
        // The word, not only the heart. Colour and a glyph alone leave a
        // pressed state that has to be inferred.
        favBtn.textContent = favourite ? '♥ In your favourites' : '♡ Add to favourites';
        favBtn.setAttribute('aria-pressed', String(favourite));
        favBtn.setAttribute('aria-label', favourite
          ? `${recipe.name} is in your favourites. Press to remove it.`
          : `Add ${recipe.name} to your favourites.`);
      };
      paintFav();
      favBtn.addEventListener('click', async () => {
        // Optimistic: the tap counts now and the write runs behind it. A
        // heart that waits on a round trip feels broken on a slow train.
        favourite = !favourite;
        paintFav();
        const result = await setFavourite(recipe.slug, favourite);
        if (!result.ok) {
          favourite = !favourite;
          paintFav();
          console.error('Could not change a favourite:', result.error);
          showToast("Couldn't save that — try again.");
          return;
        }
        if (typeof onChanged === 'function') onChanged();
      });
      body.appendChild(favBtn);

      body.appendChild(el('h3', { text: 'Your notes' }));
      const noteBox = el('textarea', { id: `recipe-note-${recipe.slug}`, rows: '3' });
      noteBox.value = (existing && existing.note) || '';
      const noteLabel = el('label', {
        for: noteBox.id, class: 'visually-hidden',
        text: `Your notes on ${recipe.name}`
      });
      const noteStatus = el('p', { class: 'field-hint', role: 'status' });
      const saveNote = el('button', { type: 'button', class: 'btn', text: 'Save note' });
      saveNote.addEventListener('click', async () => {
        saveNote.disabled = true;
        const result = await setRecipeNote(recipe.slug, noteBox.value);
        saveNote.disabled = false;
        if (!result.ok) {
          console.error('Could not save a recipe note:', result.error);
          noteStatus.textContent = 'That did not save. Try again.';
          return;
        }
        noteStatus.textContent = noteBox.value.trim() ? 'Saved.' : 'Note cleared.';
        if (typeof onChanged === 'function') onChanged();
      });
      body.append(noteLabel, noteBox, saveNote, noteStatus);
    }
  });
}
