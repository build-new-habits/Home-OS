// js/views/menu.js — 27 Nov 2026 v1
// Phase 38. One menu (#/menu?o=christmas&m=<slug>).
//
// Starter, main with its sides, pudding: each a card that opens the recipe.
// Under each course, what to drink with it: a soft drink and a drink with
// alcohol, linked to the recipe where the app has one.
//
// One primary action: Add this menu to My meals, so every dish (and every
// drink the app has a recipe for) can be planned and shopped for. That is a
// Hearth feature; Free sees the Hearth card once, when it taps.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { createActionBar } from '../components/actionBar.js';
import { showHearthCard } from '../components/hearthCard.js';
import { loadHearth, isHearth } from '../data/hearth.js';
import { loadAllRecipes, addLibraryRecipe } from '../data/recipeLibrary.js';
import { OCCASIONS, loadMenus, resolveCourse, menuSlugs, dietLabel } from '../data/menus.js';

function param(name) {
  const m = String(window.location.hash || '').match(new RegExp(`[?&]${name}=([^&]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function cardLink(href, title, blurb) {
  const li = el('li', { class: 'hub-item' });
  const a = el('a', { class: 'hub-link', href });
  const text = el('span', { class: 'hub-text' });
  text.appendChild(el('span', { class: 'hub-title', text: title }));
  if (blurb) text.appendChild(el('span', { class: 'hub-blurb', text: blurb }));
  a.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
  li.appendChild(a);
  return li;
}

const TAG_WORDS = { vegetarian: 'Vegetarian', vegan: 'Vegan', gluten_free: 'Gluten free', dairy_free: 'Dairy free' };

function tagsLine(recipe) {
  return (recipe.dietary_tags || []).map((t) => TAG_WORDS[t]).filter(Boolean).join(' · ');
}

function drinkRow(label, drink) {
  const li = el('li', { class: 'menu-drink' });
  li.appendChild(el('strong', { text: `${label}: ` }));
  if (drink.href) {
    li.appendChild(el('a', { href: drink.href, text: drink.recipe.name }));
    if (drink.text && drink.text !== drink.recipe.name) li.appendChild(document.createTextNode(` (${drink.text})`));
  } else {
    li.appendChild(document.createTextNode(drink.text || 'Water'));
  }
  return li;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const occasion = OCCASIONS[param('o')] ? param('o') : 'christmas';
  const slug = param('m');
  const backHref = `#/menus?o=${occasion}`;

  mountEl.appendChild(el('a', { class: 'back-link', href: backHref, text: OCCASIONS[occasion].title }));
  const heading = el('h1', { text: 'Menu' });
  const body = el('div', { class: 'menu-page' });
  const status = el('p', { class: 'field-hint', role: 'status', 'aria-live': 'polite', text: 'Reading the menu…' });
  mountEl.append(heading, status, body);

  let slugs = [];
  let bySlug = new Map();
  let busy = false;

  const bar = createActionBar({
    label: 'Add this menu to My meals',
    signal,
    onClick: async () => {
      if (busy || !slugs.length) return;
      await loadHearth().catch(() => null);
      if (!isHearth()) {
        await showHearthCard('menus');
        return;
      }
      busy = true;
      bar.setDisabled(true);
      bar.setLabel('Adding…');
      let added = 0;
      let had = 0;
      let failed = 0;
      for (const s of slugs) {
        const recipe = bySlug.get(s);
        if (!recipe) continue;
        const result = await addLibraryRecipe(recipe).catch((error) => ({ ok: false, error }));
        if (result.ok) added += 1;
        else if (result.existing) had += 1;
        else failed += 1;
        if (destroyed) return;
      }
      busy = false;
      bar.setDisabled(false);
      bar.setLabel('Add this menu to My meals');
      const bits = [];
      if (added) bits.push(`${added} added to My meals`);
      if (had) bits.push(`${had} already there`);
      if (failed) bits.push(`${failed} could not be added: check your connection and try again`);
      const words = `${bits.join(', ')}.`.replace(/^./, (c) => c.toUpperCase());
      status.textContent = words;
      showToast(words);
      announce(words);
    }
  });
  mountEl.appendChild(bar.element);

  (async () => {
    const [doc, library] = await Promise.all([loadMenus(occasion), loadAllRecipes()]);
    if (destroyed) return;
    const menu = doc.ok ? (doc.data.menus || []).find((m) => m.slug === slug) : null;
    if (!menu) {
      heading.textContent = 'Menu not found';
      status.textContent = doc.ok
        ? 'This menu is not in the list any more. Go back to choose another.'
        : 'The menus could not be loaded. Check your connection, then open this page again.';
      bar.setDisabled(true);
      return;
    }
    bySlug = new Map(((library.ok && library.data) || []).map((r) => [r.slug, r]));
    slugs = menuSlugs(menu).filter((s) => bySlug.has(s));

    heading.textContent = menu.name;
    status.textContent = '';
    body.appendChild(el('p', { text: menu.summary || '' }));
    body.appendChild(el('p', { class: 'field-hint', text: `${dietLabel(menu.diet)} · serves ${menu.serves}. Every recipe scales to your table.` }));

    for (const course of menu.courses || []) {
      const c = resolveCourse(course, bySlug);
      const id = `menu-${course.course}-h`;
      const section = el('section', { class: 'menu-course', 'aria-labelledby': id });
      section.appendChild(el('h2', { id, text: c.label }));
      if (c.dish) {
        const dishList = el('ul', { class: 'hub-list' });
        dishList.appendChild(cardLink(c.href, c.dish.name, tagsLine(c.dish) || c.dish.method_note || ''));
        section.appendChild(dishList);
      }
      if (c.sides.length) {
        section.appendChild(el('h3', { text: 'On the side' }));
        const sides = el('ul', { class: 'hub-list' });
        for (const s of c.sides) sides.appendChild(cardLink(s.href, s.recipe.name, tagsLine(s.recipe)));
        section.appendChild(sides);
      }
      section.appendChild(el('h3', { text: 'To drink' }));
      const drinks = el('ul', { class: 'menu-drinks' });
      drinks.append(drinkRow('Soft', c.soft), drinkRow('With alcohol', c.alcoholic));
      section.appendChild(drinks);
      body.appendChild(section);
    }

    if (menu.note) body.appendChild(el('p', { class: 'field-hint', text: menu.note }));
    if (doc.data.drinks_note) body.appendChild(el('p', { class: 'field-hint', text: doc.data.drinks_note }));
  })().catch((err) => console.error('Menu:', err));

  return () => {
    destroyed = true;
    controller.abort();
  };
}
