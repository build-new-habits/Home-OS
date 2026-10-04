// js/components/nutritionFinder.js — 04 Oct 2026 v2
// v2: searches over 10,000 foods (data/foodSearch.js) and, on request, shop
// products from Open Food Facts.
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
import { describeMatch, GROUPS, rememberFibre } from '../data/cofid.js';
import { searchOffline, searchProducts, sourceLabel } from '../data/foodSearch.js';
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
    subtitle: `For “${name}”. Over 10,000 foods, and shop products. Pick the closest match.`,
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

      // Shop products (Open Food Facts): on request, because its search
      // allows ten a minute and asks not to be searched as you type.
      const productsHead = el('h3', { class: 'nf-products-title', text: 'Shop products' });
      const productsHint = el('p', { class: 'field-hint', text: 'Brands and supermarket products, with the nutrition from their labels. Needs a signal.' });
      const productsBtn = el('button', { type: 'button', class: 'btn btn-block nf-products-btn', text: 'Search shop products' });
      const productsStatus = el('p', { class: 'field-hint nf-count', role: 'status', 'aria-live': 'polite' });
      const productsList = el('ul', { class: 'nf-results' });
      body.append(productsHead, productsHint, productsBtn, productsStatus, productsList);
      productsBtn.addEventListener('click', async () => {
        productsBtn.disabled = true;
        productsStatus.textContent = 'Searching shop products…';
        const result = await searchProducts(input.value);
        productsBtn.disabled = false;
        productsList.replaceChildren();
        if (!result.ok) {
          productsStatus.textContent = result.reason === 'offline'
            ? 'No signal just now. The foods above work without one.'
            : result.reason === 'wait'
              ? `One moment: shop products can be searched again in ${Math.ceil(result.waitMs / 1000)} seconds.`
              : 'Shop products could not be searched just now. Try again shortly.';
          return;
        }
        productsStatus.textContent = result.data.length
          ? `${result.data.length} shop products.`
          : 'No shop products with nutrition for that. Try the brand and product name.';
        for (const m of result.data) productsList.appendChild(matchItem(m));
      });

      body.appendChild(el('p', { class: 'field-hint nf-credit', text: 'Sources: UK CoFID 2019 (Public Health England, Open Government Licence v3.0); USDA FoodData Central (public domain); shop products from Open Food Facts (Open Database Licence).' }));

      function matchItem(m) {
        const li = el('li');
        const b = el('button', { type: 'button', class: 'btn nf-match' });
        b.append(
          el('span', { class: 'nf-name', text: m.name }),
          el('span', { class: 'nf-figures', text: describeMatch(m) }),
          el('span', { class: 'nf-group', text: [sourceLabel(m.source), GROUPS[m.group] || '', m.pack || ''].filter(Boolean).join(' · ') })
        );
        b.addEventListener('click', () => choose(m, b));
        li.appendChild(b);
        return li;
      }

      let timer = null;
      let token = 0;
      async function run() {
        const mine = ++token;
        const matches = await searchOffline(input.value, 15);
        if (mine !== token) return;
        list.replaceChildren();
        count.textContent = matches.length
          ? `${matches.length} closest foods. For a brand, search shop products below.`
          : 'No food close to that. For a brand, search shop products below.';
        for (const m of matches) list.appendChild(matchItem(m));
      }
      input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); });

      async function choose(m, button) {
        let grams = weight ? Number(weight.value) : null;
        // An everyday food knows how much one weighs; use it if none was typed.
        if (needsWeight && !(grams > 0) && Number(m.grams_per_item) > 0) grams = Number(m.grams_per_item);
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
          source: m.source === 'product' ? 'openfoodfacts' : 'reference'
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
