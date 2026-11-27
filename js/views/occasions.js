// js/views/occasions.js — 27 Nov 2026 v2
// v2: Coming up next month, between In season now and the rest (Phase 42).
// Phase 40. Seasons and occasions (#/occasions).
//
// Graeme, 27 Nov 2026: "We need to have seasons. Summer, Spring, Winter,
// Autumn, Easter, Birthdays, Christmas, Halloween, BBQ, outdoor cooking."
//
// Every season and occasion, each a card to its menus (#/menus?o=…). What
// is in season this month comes first, under its own heading, so in July
// the barbecue is the first thing you see and in December it is Christmas.
// The rest follow in the order of a year.

import { el } from '../lib/dom.js';
import { createActionBar } from '../components/actionBar.js';
import { OCCASIONS, inSeason, comingUp, occasionOrder } from '../data/menus.js';

// One occasion's menus. A literal, so the reachability gate can see it.
const MENUS_PAGE = '#/menus';

function card(key) {
  const meta = OCCASIONS[key];
  const li = el('li', { class: 'hub-item' });
  const a = el('a', { class: 'hub-link', href: `${MENUS_PAGE}?o=${encodeURIComponent(key)}` });
  const text = el('span', { class: 'hub-text' });
  text.append(el('span', { class: 'hub-title', text: meta.title }), el('span', { class: 'hub-blurb', text: meta.blurb }));
  a.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
  li.appendChild(a);
  return li;
}

export function render(mountEl) {
  const controller = new AbortController();
  const now = new Date();
  const current = inSeason(now);

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/meals-home', text: 'Meals' }));
  mountEl.appendChild(el('h1', { text: 'Seasons and occasions' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Recipes and whole menus for each time of year, from starter to pudding, with drinks to match.'
  }));

  const nowSection = el('section', { 'aria-labelledby': 'occasions-now-h' });
  nowSection.appendChild(el('h2', { id: 'occasions-now-h', text: 'In season now' }));
  const nowList = el('ul', { class: 'hub-list' });
  for (const key of current) nowList.appendChild(card(key));
  nowSection.appendChild(nowList);
  mountEl.appendChild(nowSection);

  const soon = comingUp(now);
  if (soon.length) {
    const soonSection = el('section', { 'aria-labelledby': 'occasions-soon-h' });
    soonSection.appendChild(el('h2', { id: 'occasions-soon-h', text: 'Coming up next month' }));
    const soonList = el('ul', { class: 'hub-list' });
    for (const key of soon) soonList.appendChild(card(key));
    soonSection.appendChild(soonList);
    mountEl.appendChild(soonSection);
  }

  const restSection = el('section', { 'aria-labelledby': 'occasions-rest-h' });
  restSection.appendChild(el('h2', { id: 'occasions-rest-h', text: 'The rest of the year' }));
  const restList = el('ul', { class: 'hub-list' });
  for (const key of occasionOrder(now).filter((k) => !current.includes(k) && !soon.includes(k))) restList.appendChild(card(key));
  restSection.appendChild(restList);
  mountEl.appendChild(restSection);

  mountEl.appendChild(createActionBar({ label: 'Help me choose', href: '#/meal-coach', signal: controller.signal }).element);

  return () => controller.abort();
}
