// js/views/mealsHome.js — 27 Nov 2026 v3
// v3: Help me choose, first of the places: a few taps narrow 600 recipes (Phase 39).
// v2: Christmas menus, a third place beside My meals and the library (Phase 38).
// Phase 34. The Meals tab (#/meals-home).
//
// Graeme, 24 Nov 2026: "'Recipes' in the app should be Meals and then
// Community library and my meals. Finding the ones I've imported is hard."
//
// Two places, named for whose they are:
//   My meals            your own, imported, and copied from the library
//   Community library   the recipes that come with the app
// and, above them, what you added lately — so a recipe you shared in a
// minute ago is the first thing on the tab, not somewhere in a list of fifty.
//
// One primary action: Import a recipe. Writing one, What can I make and
// Make a plate sit beside it as ordinary buttons.

import { el } from '../lib/dom.js';
import { createActionBar } from '../components/actionBar.js';
import { listMeals } from '../data/meals.js';
import { listLocal } from '../data/localRecipes.js';

const RECENT = 6;

/** What a meal of yours is, in a few words. Pure. */
export function originOf(meal) {
  if (meal.source_url) return meal.source ? `Imported from ${meal.source}` : 'Imported';
  if (meal.library_ref) return 'From the Community library';
  if (meal.source) return `From ${meal.source}`;
  return 'Your recipe';
}

/** Newest first, your meals and recipes kept on this phone together. Pure. */
export function recentlyAdded(meals = [], local = [], limit = RECENT) {
  const rows = [
    ...meals.map((m) => ({
      name: m.name, href: `#/recipe?m=${encodeURIComponent(m.id)}`, origin: originOf(m), at: Date.parse(m.created_at || '') || 0
    })),
    ...local.filter((r) => !(r.draft && r.draft.syncedMealId)).map((r) => ({
      name: r.name, href: `#/recipe?l=${encodeURIComponent(r.id)}`, origin: 'Kept on this phone', at: Date.parse(r.savedAt || '') || 0
    }))
  ];
  return rows.sort((a, b) => b.at - a.at).slice(0, limit);
}

function hubLink(href, title, blurb) {
  const li = el('li', { class: 'hub-item' });
  const a = el('a', { class: 'hub-link', href });
  const text = el('span', { class: 'hub-text' });
  const blurbEl = el('span', { class: 'hub-blurb', text: blurb });
  text.append(el('span', { class: 'hub-title', text: title }), blurbEl);
  a.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
  li.appendChild(a);
  return { li, blurbEl };
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('h1', { text: 'Meals' }));

  const places = el('ul', { class: 'hub-list meals-home__places' });
  const coach = hubLink('#/meal-coach', 'Help me choose', 'A few taps, and the recipes that fit: what it is for, how long, what you feel like.');
  const mine = hubLink('#/meals', 'My meals', 'Yours, imported, and ones you copied from the library.');
  const library = hubLink('#/library', 'Community library', 'Recipes that come with the app, ready to cook.');
  const menus = hubLink('#/menus', 'Christmas menus', 'Whole menus from starter to pudding, with drinks to match.');
  places.append(coach.li, mine.li, library.li, menus.li);
  mountEl.appendChild(places);

  const more = el('p', { class: 'library-links' });
  more.append(
    el('a', { class: 'btn', href: '#/recipe-edit', text: 'Write your own' }),
    el('a', { class: 'btn', href: '#/tonight', text: 'What can I make?' }),
    el('a', { class: 'btn', href: '#/plate', text: 'Make a plate' })
  );
  mountEl.appendChild(more);

  const recent = el('section', { class: 'meals-home__recent', 'aria-labelledby': 'meals-recent-h' });
  recent.appendChild(el('h2', { id: 'meals-recent-h', text: 'Recently added' }));
  const recentBody = el('div', { role: 'status' });
  recentBody.appendChild(el('p', { class: 'field-hint', text: 'Looking…' }));
  recent.appendChild(recentBody);
  mountEl.appendChild(recent);

  mountEl.appendChild(createActionBar({ label: 'Import a recipe', href: '#/recipe-import', signal }).element);

  (async () => {
    const result = await listMeals().catch(() => ({ ok: false }));
    if (destroyed) return;
    const meals = result.ok ? result.data || [] : [];
    const local = listLocal();
    const imported = meals.filter((m) => m.source_url).length;
    mine.blurbEl.textContent = meals.length
      ? `${meals.length} recipe${meals.length === 1 ? '' : 's'}${imported ? `, ${imported} imported` : ''}. Yours, imported, and copied from the library.`
      : 'Yours, imported, and ones you copied from the library.';

    const rows = recentlyAdded(meals, local);
    recentBody.replaceChildren();
    if (!result.ok && !rows.length) {
      recentBody.appendChild(el('p', { class: 'field-hint', text: 'Your meals could not be loaded. Check your connection, then come back to this tab.' }));
      return;
    }
    if (!rows.length) {
      recentBody.appendChild(el('p', { class: 'field-hint', text: 'Recipes you import or write appear here first.' }));
      return;
    }
    const ul = el('ul', { class: 'hub-list' });
    for (const row of rows) ul.appendChild(hubLink(row.href, row.name, row.origin).li);
    recentBody.appendChild(ul);
  })().catch((err) => {
    console.error('Meals tab:', err);
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
