// js/views/menus.js — 27 Nov 2026 v1
// Phase 38. Christmas menus (#/menus?o=christmas).
//
// A list of complete menus, filtered by what the table eats: meat, fish,
// shellfish, vegetarian or vegan. Each card opens its menu on a page of its
// own (#/menu), never a fold in place.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { createActionBar } from '../components/actionBar.js';
import { loadAllRecipes } from '../data/recipeLibrary.js';
import { OCCASIONS, DIETS, loadMenus, filterMenus, dietLabel, menuLine } from '../data/menus.js';

// One menu's page. A literal, so the reachability gate can see it.
const MENU_PAGE = '#/menu';

function occasionFromHash() {
  const m = String(window.location.hash || '').match(/[?&]o=([a-z-]+)/);
  return m && OCCASIONS[m[1]] ? m[1] : 'christmas';
}

function dietFromHash() {
  const m = String(window.location.hash || '').match(/[?&]diet=([a-z]+)/);
  return m && DIETS.some((d) => d.value === m[1]) ? m[1] : '';
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const occasion = occasionFromHash();
  const meta = OCCASIONS[occasion];
  let diet = dietFromHash();

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/meals-home', text: 'Meals' }));
  mountEl.appendChild(el('h1', { text: meta.title }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Whole menus from starter to pudding, with a soft drink and a drink with alcohol for every course.'
  }));

  const chips = el('div', { class: 'toggle-group', role: 'group', 'aria-label': 'Show menus for' });
  const buttons = DIETS.map((d) => {
    const b = el('button', { type: 'button', class: 'chip-toggle', 'aria-pressed': String(d.value === diet), text: d.label });
    b.addEventListener('click', () => {
      diet = d.value;
      for (const [i, other] of buttons.entries()) other.setAttribute('aria-pressed', String(DIETS[i].value === diet));
      paint();
    }, { signal });
    chips.appendChild(b);
    return b;
  });
  mountEl.appendChild(chips);

  const status = el('p', { class: 'field-hint', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', { class: 'hub-list' });
  mountEl.append(status, list);
  status.textContent = 'Reading the menus…';

  mountEl.appendChild(createActionBar({ label: 'Community library', href: '#/library', signal }).element);

  let menus = [];
  let bySlug = new Map();

  function paint() {
    const shown = filterMenus(menus, diet);
    list.replaceChildren();
    for (const menu of shown) {
      const li = el('li', { class: 'hub-item' });
      const a = el('a', { class: 'hub-link', href: `${MENU_PAGE}?o=${encodeURIComponent(occasion)}&m=${encodeURIComponent(menu.slug)}` });
      const text = el('span', { class: 'hub-text' });
      text.append(
        el('span', { class: 'hub-title', text: menu.name }),
        el('span', { class: 'hub-blurb', text: menu.summary || '' }),
        el('span', { class: 'hub-blurb', text: `${dietLabel(menu.diet)} · serves ${menu.serves} · ${menuLine(menu, bySlug)}` })
      );
      a.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
      li.appendChild(a);
      list.appendChild(li);
    }
    const label = diet ? `${dietLabel(diet).toLowerCase()} ` : '';
    const words = shown.length
      ? `${shown.length} ${label}menu${shown.length === 1 ? '' : 's'}.`
      : `No ${label}menus yet.`;
    status.textContent = words;
    announce(words);
  }

  (async () => {
    const [doc, library] = await Promise.all([loadMenus(occasion), loadAllRecipes()]);
    if (destroyed) return;
    if (!doc.ok) {
      status.textContent = 'The menus could not be loaded. Check your connection, then open this page again.';
      return;
    }
    menus = doc.data.menus || [];
    bySlug = new Map(((library.ok && library.data) || []).map((r) => [r.slug, r]));
    paint();
  })().catch((err) => console.error('Menus:', err));

  return () => {
    destroyed = true;
    controller.abort();
  };
}
