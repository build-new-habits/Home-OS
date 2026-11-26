// js/views/recipeCheck.js — 26 Nov 2026 v2
// v2: a saved import counts towards the 10 recipes Free keeps (Phase 36a).
// Phase 34. "Check and save" (#/recipe-check): where an imported recipe lands.
//
// Graeme, 24 Nov 2026: "It's too procedural and complicated at the moment.
// Some serious work needs to go into making this smooth, simple, tap and quick."
//
// Phase 33 sent an import straight into the full recipe editor: every
// ingredient a fieldset, every step a box, swaps, tags, a course. Right for
// writing a recipe; far too much for checking one. This screen is the check:
//
//   the name            one field, already filled
//   serves              − 4 +
//   per serving         calories and macros, worked out already
//   ingredients         each line as the recipe said it, and the food it was
//                       matched to, ticked; anything unmatched is one tap
//   Save recipe         the one primary action
//
// "Change ingredients or steps" opens the full editor with the same draft,
// for when something needs more than a glance.
//
// Matching runs before anything is shown: the name list first, then the
// offline food tables (data/ingredientMatch.js). Nobody is asked about an
// ingredient the app can place itself.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { createActionBar } from '../components/actionBar.js';
import { showToast } from '../components/toast.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { openNutritionFinder } from '../components/nutritionFinder.js';
import { referenceBySlug } from '../data/foodReference.js';
import { listFoods } from '../data/foods.js';
import { recipeNutrition } from '../data/nutrition.js';
import { saveLocal } from '../data/localRecipes.js';
import {
  buildNameIndex, resolveName, draftToRecipe, measuredOnly, unknownNutrition, saveDraft, normalise
} from '../data/ownRecipe.js';
import { autoMatch, matchSource } from '../data/ingredientMatch.js';
import { takeImportDraft, stashImportDraft, draftCounts } from '../data/recipeImport.js';
import { canAdd } from '../data/hearth.js';
import { showHearthCard } from '../components/hearthCard.js';

export const CHECK_KEY = 'home-os-import-check';

function keepDraft(draft) {
  try { sessionStorage.setItem(CHECK_KEY, JSON.stringify(draft)); } catch { /* fine */ }
}
function readDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(CHECK_KEY) || 'null');
    return d && Array.isArray(d.ingredients) ? d : null;
  } catch { return null; }
}
function dropDraft() {
  try { sessionStorage.removeItem(CHECK_KEY); } catch { /* fine */ }
}

/** "125 g plain flour", plus what the recipe said when it was converted. */
export function lineFor(row) {
  const name = String(row.name || '').trim();
  const qty = Number(row.quantity);
  const amount = qty > 0
    ? (row.unit === 'item' ? `${qty} ` : `${qty} ${row.unit} `)
    : '';
  return `${amount}${name}`.trim();
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const back = el('a', { class: 'back-link', href: '#/recipe-import', text: 'Import a recipe' });
  const heading = el('h1', { text: 'Check and save' });
  const page = el('div', { class: 'recipe-check' });
  page.appendChild(el('p', { class: 'field-hint', role: 'status', text: 'Matching the ingredients…' }));
  mountEl.append(back, heading, page);

  // A fresh import, or the one being checked before a reload.
  const incoming = takeImportDraft();
  const draft = incoming || readDraft();
  if (incoming) keepDraft(incoming);

  if (!draft) {
    page.replaceChildren(
      el('p', { text: 'There is no imported recipe waiting to be checked.' }),
      el('a', { class: 'btn', href: '#/recipe-import', text: 'Import a recipe' })
    );
    return () => { destroyed = true; controller.abort(); };
  }

  (async () => {
    const [refs, foods] = await Promise.all([
      referenceBySlug().catch(() => new Map()),
      listFoods().catch(() => ({ ok: false }))
    ]);
    if (destroyed) return;
    const index = buildNameIndex([...refs.values()], foods && foods.ok ? foods.data || [] : []);
    await autoMatch((draft.ingredients || []).map((r) => r.name), index, resolveName).catch(() => null);
    if (destroyed) return;
    build(index);
  })().catch((err) => {
    console.error('Check screen:', err);
    if (!destroyed) page.replaceChildren(el('p', { text: 'Something went wrong getting this ready. Try again.' }));
  });

  function build(index) {
    page.replaceChildren();

    if (draft.sourceName || draft.sourceUrl) {
      const from = el('p', { class: 'recipe-credit' });
      const name = String(draft.sourceName || '').trim();
      if (draft.sourceUrl) {
        from.append('From ');
        from.appendChild(el('a', {
          href: draft.sourceUrl, target: '_blank', rel: 'noopener noreferrer',
          text: name || 'the original',
          'aria-label': `${name || 'the original page'}, opens the original recipe in a new tab`
        }));
      } else {
        from.textContent = `From ${name}`;
      }
      page.appendChild(from);
    }

    // ---- Name and serves ---------------------------------------------------
    const nameField = el('div', { class: 'field' });
    const nameInput = el('input', { type: 'text', id: 'check-name', autocomplete: 'off', maxlength: '80' });
    nameInput.value = draft.name || '';
    nameField.append(el('label', { for: 'check-name', text: 'Name' }), nameInput);
    const nameProblem = el('p', { id: 'check-name-problem', class: 'field-error', hidden: '' });
    nameField.appendChild(nameProblem);
    nameInput.addEventListener('input', () => {
      draft.name = nameInput.value;
      keepDraft(draft);
      if (!nameProblem.hidden && nameInput.value.trim()) {
        nameProblem.hidden = true;
        nameInput.removeAttribute('aria-invalid');
        nameInput.removeAttribute('aria-describedby');
      }
    }, { signal });
    page.appendChild(nameField);

    const serves = el('div', { class: 'check-serves', role: 'group', 'aria-labelledby': 'check-serves-label' });
    const servesLabel = el('span', { id: 'check-serves-label', class: 'check-serves__label', text: 'Serves' });
    const minus = el('button', { type: 'button', class: 'btn check-serves__btn', text: '−', 'aria-label': 'One fewer serving' });
    const count = el('output', { class: 'check-serves__count', 'aria-live': 'polite', text: String(draft.serves || 4) });
    const plus = el('button', { type: 'button', class: 'btn check-serves__btn', text: '+', 'aria-label': 'One more serving' });
    const setServes = (n) => {
      draft.serves = Math.max(1, Math.min(50, n));
      count.textContent = String(draft.serves);
      minus.disabled = draft.serves <= 1;
      plus.disabled = draft.serves >= 50;
      keepDraft(draft);
      paintNutrition();
    };
    minus.addEventListener('click', () => setServes(Number(draft.serves) - 1), { signal });
    plus.addEventListener('click', () => setServes(Number(draft.serves) + 1), { signal });
    serves.append(servesLabel, minus, count, plus);
    page.appendChild(serves);

    // ---- Per serving ---------------------------------------------------------
    const nutritionSlot = el('div');
    page.appendChild(nutritionSlot);

    // ---- Ingredients -----------------------------------------------------------
    const ingSection = el('section', { class: 'check-section', 'aria-labelledby': 'check-ing-h' });
    const ingHeading = el('h2', { id: 'check-ing-h', text: 'Ingredients' });
    const ingSummary = el('p', { class: 'field-hint' });
    const ingList = el('ul', { class: 'check-ingredients' });
    ingSection.append(ingHeading, ingSummary, ingList);
    page.appendChild(ingSection);

    const counts = draftCounts(draft);
    page.appendChild(el('p', {
      class: 'field-hint check-steps',
      text: counts.steps
        ? `${counts.steps} step${counts.steps === 1 ? '' : 's'} in the method, ready for cook mode.`
        : 'No method came with this recipe. You can add the steps under Change ingredients or steps.'
    }));

    const change = el('button', { type: 'button', class: 'btn', text: 'Change ingredients or steps' });
    change.addEventListener('click', () => {
      stashImportDraft(draft);
      dropDraft();
      window.location.hash = '#/recipe-edit?imported=1';
    }, { signal });
    const status = el('p', { class: 'field-hint', role: 'status' });
    page.append(change, status);

    const bar = createActionBar({ label: 'Save recipe', onClick: save, signal });
    mountEl.appendChild(bar.element);

    function paintNutrition() {
      nutritionSlot.replaceChildren();
      const { recipe, refMap } = draftToRecipe(draft, index);
      if (!recipe.ingredients.length) return;
      const result = recipeNutrition(measuredOnly(recipe), refMap);
      const unknown = unknownNutrition(draft, index);
      const note = unknown.length
        ? `Worked out from food tables. Not counted: ${unknown.join(', ')}.`
        : 'Worked out from food tables. Percentages are of a day’s UK adult reference intake.';
      nutritionSlot.appendChild(nutritionBars({
        id: 'check-nutrition-h', title: 'Per serving', headingLevel: 'h2',
        totals: result.perServing, complete: result.complete, note
      }));
    }

    function paintIngredients() {
      ingList.replaceChildren();
      const rows = (draft.ingredients || []).filter((r) => String(r.name || '').trim());
      const unknown = new Set(unknownNutrition(draft, index));
      let matched = 0;
      let needs = 0;
      rows.forEach((row, i) => {
        const hit = resolveName(row.name, index);
        const counted = hit && !unknown.has(String(row.name).trim());
        const noAmount = !(Number(row.quantity) > 0);
        if (hit) matched += 1;
        const li = el('li', { class: `check-ing${counted || noAmount ? '' : ' check-ing--open'}` });
        const text = el('div', { class: 'check-ing__text' });
        text.appendChild(el('span', { class: 'check-ing__line', text: lineFor(row) }));
        if (row.said) text.appendChild(el('span', { class: 'check-ing__said', text: `Recipe said ${row.said}` }));
        let detail = '';
        if (hit && counted) detail = `✓ ${hit.entry.name} · ${matchSource(hit)}`;
        else if (hit && noAmount) detail = `${hit.entry.name} · no amount, not counted`;
        else if (noAmount) detail = 'No amount, so it does not change the figures';
        else if (hit) detail = `${hit.entry.name} · needs a weight to be counted`;
        else detail = 'Not matched yet, so not counted';
        text.appendChild(el('span', { class: 'check-ing__match', text: detail }));
        li.appendChild(text);
        if (!counted && !noAmount) {
          needs += 1;
          const fix = el('button', {
            type: 'button', class: 'btn btn-small', id: `check-fix-${i}`,
            text: 'Choose', 'aria-haspopup': 'dialog', 'aria-label': `Choose the food for ${row.name}`
          });
          fix.addEventListener('click', () => {
            const entry = (hit && hit.entry) || {};
            openNutritionFinder({
              name: String(row.name).trim(),
              foodId: (hit && hit.foodId) || null,
              unit: row.unit === 'tsp' || row.unit === 'tbsp' ? 'ml' : (row.unit || 'g'),
              itemLabel: entry.item_label || null,
              gramsPerItem: entry.grams_per_item,
              gramsPerMl: entry.grams_per_ml,
              returnFocusTo: fix,
              onSaved: (food) => {
                index.byName.set(normalise(row.name), { key: `food-${food.id}`, foodId: food.id, entry: { ...entry, ...food } });
                paintAll();
                announce(`${row.name} matched to ${food.name}.`);
                (document.getElementById('check-ing-h'))?.focus?.();
              }
            });
          }, { signal });
          li.appendChild(fix);
        }
        ingList.appendChild(li);
      });
      // Seasoning with no amount ("salt and pepper") never needs choosing:
      // it cannot change the figures, so it is not counted as open.
      ingSummary.textContent = needs === 0
        ? `All ${rows.length} ingredients are ready. Nothing to choose.`
        : `${needs} of ${rows.length} need${needs === 1 ? 's' : ''} a food choosing to be counted. Tap Choose, or save now and do it later.`;
    }

    function paintAll() { paintNutrition(); paintIngredients(); }

    async function save() {
      draft.name = nameInput.value.trim();
      if (!draft.name) {
        nameProblem.textContent = 'Give the recipe a name.';
        nameProblem.hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.setAttribute('aria-describedby', 'check-name-problem');
        nameInput.focus();
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const kept = saveLocal(draft);
        if (kept.ok) {
          dropDraft();
          showToast(`${draft.name} saved on this phone. It goes to your meals from the recipe page when you are online.`);
          window.location.hash = `#/recipe?l=${encodeURIComponent(kept.id)}`;
        } else {
          status.textContent = 'You are offline and this phone would not keep it. Try again when you are online.';
        }
        return;
      }
      // Phase 36a: an imported recipe is one of your own.
      const room = await canAdd('recipes');
      if (destroyed) return;
      if (!room.ok) { await showHearthCard('recipes', room); return; }
      bar.setDisabled(true);
      status.textContent = 'Saving…';
      const result = await saveDraft(draft, index);
      if (destroyed) return;
      bar.setDisabled(false);
      if (!result.ok) {
        console.error('Saving an imported recipe:', result.error);
        status.textContent = result.problems && result.problems.length
          ? `${result.problems[0].message} Use Change ingredients or steps to sort it.`
          : 'That did not reach your meals. Nothing has been lost. Try again.';
        return;
      }
      dropDraft();
      status.textContent = '';
      showToast(`${result.data.name} saved to your meals.`);
      window.location.hash = `#/recipe?m=${encodeURIComponent(result.data.id)}`;
    }

    setServes(Number(draft.serves) || 4);
    paintAll();
    announce(ingSummary.textContent);
  }

  return () => {
    destroyed = true;
    controller.abort();
  };
}

