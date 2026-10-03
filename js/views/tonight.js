// js/views/tonight.js — 03 Oct 2026 v1
// "What can I make?" Library recipes ranked by how little you would need to
// buy, then by how much they use up what is near its date.
//
// Reached from Today and from Recipes. Each result says what you have of it
// and what it uses up, and opens the recipe page, where the missing things
// go on the list in one tap and the meal goes on the plan.

import { el } from '../lib/dom.js';
import { loadAllRecipes } from '../data/recipeLibrary.js';
import { referenceBySlug } from '../data/foodReference.js';
import { listStock, useSoon } from '../data/pantry.js';
import { haveNames, rankRecipes, normaliseName } from '../data/recipeCoverage.js';
import { cookingName } from './recipe.js';

const SHOW = 15;

export function render(mountEl) {
  let destroyed = false;

  mountEl.appendChild(el('h1', { class: 'shop-title', text: 'What can I make?' }));
  const intro = el('p', { class: 'shop-summary', text: 'Looking in your cupboards…' });
  mountEl.appendChild(intro);
  const list = el('ul', { class: 'tonight-list' });
  mountEl.appendChild(list);

  (async () => {
    const [library, refMap, stock] = await Promise.all([loadAllRecipes(), referenceBySlug(), listStock()]);
    if (destroyed) return;
    if (!library.ok || !stock.ok) {
      intro.textContent = 'The recipes or the pantry could not be loaded. Check your connection and try again.';
      return;
    }
    const nowIso = new Date().toISOString();
    const haveSet = haveNames(stock.data || [], nowIso);
    const soonSet = new Set(useSoon(stock.data || []).map(({ row }) => normaliseName(row.foods && row.foods.name)));
    const ranked = rankRecipes(library.data, haveSet, refMap, soonSet).slice(0, SHOW);

    if (ranked.length === 0) {
      intro.textContent = 'Nothing in the pantry matches a recipe yet. Put your shopping away and this fills up.';
      return;
    }
    const ready = ranked.filter((r) => r.missing.length === 0).length;
    intro.textContent = ready
      ? `${ready} you could make now with what you have. Then the ones that need one or two things.`
      : 'Nothing is complete, so these need the fewest things to buy.';

    for (const r of ranked) {
      const li = el('li');
      const a = el('a', { class: 'tonight-item', href: `#/recipe?r=${encodeURIComponent(r.recipe.slug)}` });
      a.appendChild(el('span', { class: 'tonight-name', text: r.recipe.name }));
      a.appendChild(el('span', {
        class: 'tonight-have',
        text: r.missing.length === 0 ? 'You have everything' : `Need ${r.missing.length}: ${r.missing.map((i) => cookingName(i.name).toLowerCase()).join(', ')}`
      }));
      if (r.usesSoon.length) {
        a.appendChild(el('span', { class: 'tonight-soon', text: `Uses up ${r.usesSoon.map((n) => cookingName(n).toLowerCase()).join(', ')}` }));
      }
      li.appendChild(a);
      list.appendChild(li);
    }
  })().catch((error) => {
    console.error('What can I make failed:', error);
    if (!destroyed) intro.textContent = 'Something went wrong. Try again.';
  });

  return () => { destroyed = true; };
}
