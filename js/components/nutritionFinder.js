// js/components/nutritionFinder.js — 04 Oct 2026 v1
// v1: "Find nutrition" — look an ingredient up in the UK food tables
// (data/cofid.js) and give it figures, so a recipe stops being counted as
// a few calories because three of its foods had none.
//
// One sheet: a search box already holding the ingredient's name, the
// closest matches with their figures per 100 g, and — when the recipe
// counts this food in items rather than grams — how much one weighs. A tap
// on a match saves it to the food (source 'reference'), for every recipe
// that uses it. Nothing is filled in without a tap.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from './toast.js';
import { openDetailSheet } from './detailSheet.js';
import { search, describeMatch, GROUPS, rememberFibre } from '../data/cofid.js';
import { updateFood, createFood } from '../data/foods.js';

let counter = 0;

function categoryFor(group) {
  if (group === 'P' || group === 'Q') return 'drink';
  return ['J', 'M', 'D', 'F', 'C', 'B'].includes(group) ? 'food_fresh' : 'food_ambient';
}

/**
 * @param {{ name: string, foodId?: string|null, unit?: string, itemLabel?: string|null,
 *   gramsPerItem?: number|null, returnFocusTo?: HTMLElement,
 *   onSaved?: (food: object) => void }} opts
 */
export function openNutritionFinder({ name, foodId = null, unit = 'g', itemLabel = null, gramsPerItem = null, gramsPerMl = null, returnFocusTo, onSaved } = {}) {
  counter += 1;
  const uid = `nf-${counter}`;
  const needsWeight = unit === 'item' && !(Number(gramsPerItem) > 0);
  openDetailSheet({
    title: 'Find the nutrition',
    subtitle: `For “${name}”. From the UK food tables (McCance and Widdowson). Pick the closest match.`,
    returnFocusTo,
    build(body, api) {
      const field = el('div', { class: 'field' });
      const input = el('input', { type: 'search', id: `${uid}-q`, autocomplete: 'off', value: name });
      field.append(el('label', { for: `${uid}-q`, text: 'Search the food tables' }), input);
      body.appendChild(field);

      let weight = null;
      if (needsWeight) {
        const wf = el('div', { class: 'field' });
        weight = el('input', { type: 'number', id: `${uid}-w`, inputmode: 'decimal', min: '1', step: 'any', 'aria-describedby': `${uid}-wh` });
        const word = itemLabel || 'one';
        wf.append(
          el('label', { for: `${uid}-w`, text: `How much does ${itemLabel ? `one ${itemLabel}` : 'one'} weigh, in grams?` }),
          weight,
          el('p', { id: `${uid}-wh`, class: 'field-hint', text: `The recipe counts this in items, so the weight of ${word === 'one' ? 'one' : `a ${word}`} turns the figures per 100 g into figures for the recipe. A guess is fine; a pack label is better.` })
        );
        body.appendChild(wf);
      }

      const count = el('p', { class: 'field-hint nf-count', role: 'status', 'aria-live': 'polite' });
      const list = el('ul', { class: 'nf-results' });
      body.append(count, list);
      body.appendChild(el('p', { class: 'field-hint nf-credit', text: 'Contains public sector information licensed under the Open Government Licence v3.0 (CoFID 2019, Public Health England).' }));

      let timer = null;
      let token = 0;
      async function run() {
        const mine = ++token;
        const matches = await search(input.value, 12);
        if (mine !== token) return;
        list.replaceChildren();
        count.textContent = matches.length
          ? `${matches.length} closest matches.`
          : 'Nothing close. Try fewer or plainer words: "fish" rather than a brand.';
        for (const m of matches) {
          const li = el('li');
          const b = el('button', { type: 'button', class: 'btn nf-match' });
          b.append(
            el('span', { class: 'nf-name', text: m.name }),
            el('span', { class: 'nf-figures', text: describeMatch(m) }),
            el('span', { class: 'nf-group', text: GROUPS[m.group] || '' })
          );
          b.addEventListener('click', () => choose(m, b));
          li.appendChild(b);
          list.appendChild(li);
        }
      }
      input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); });

      async function choose(m, button) {
        const grams = weight ? Number(weight.value) : null;
        if (needsWeight && !(grams > 0)) {
          showToast('Say how much one weighs first, so it can be counted.');
          weight.focus();
          return;
        }
        button.disabled = true;
        const figures = {
          calories_per_100g: m.calories_per_100g,
          protein_g: m.protein_g,
          fat_g: m.fat_g,
          carbs_g: m.carbs_g,
          source: 'reference'
        };
        if (grams > 0) figures.grams_per_item = grams;
        // Millilitres need a weight too; most kitchen liquids are close to
        // water, so 1 g per ml stands in until a better figure is known.
        if (unit === 'ml' && !(Number(gramsPerMl) > 0)) figures.grams_per_ml = 1;
        const result = foodId
          ? await updateFood(foodId, figures)
          : await createFood({ name, ...figures, category: categoryFor(m.group), item_label: itemLabel || null });
        button.disabled = false;
        if (!result.ok) { showToast('That did not save. Check your connection and try again.'); return; }
        const food = { ...(result.data || {}), fibre_g: m.fibre_g };
        rememberFibre(food.id, m.fibre_g);
        const words = `${name} now counts as ${m.name}: ${Math.round(m.calories_per_100g)} kcal per 100 g.`;
        announce(words);
        showToast(words);
        api.close();
        if (onSaved) onSaved(food);
      }

      run();
      setTimeout(() => input.focus(), 0);
    }
  });
}
