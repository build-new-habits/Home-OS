// js/views/hearth.js — 26 Nov 2026 v1
// Phase 36a. "Hearth" (#/hearth): what the paid tier adds, and which one
// this household is on.
//
// Hearth is named for Hestia's domain, the hearth: home, food, family.
// £2.99 a month or £24.99 a year for the whole household
// (COMPETITIVE_POSITION.md v3). Not on sale yet: until the app stores,
// Hearth is switched on by hand. The page says so plainly rather than
// showing a buy button that goes nowhere.
//
// The comparison is a real table (caption, column and row headers) so a
// screen reader reads "Pantry, Free: a simple list, up to 30 things".

import { el } from '../lib/dom.js';
import { createActionBar } from '../components/actionBar.js';
import { loadHearth, isHearth, FREE_LIMITS } from '../data/hearth.js';

export const ROWS = [
  ['Plan', 'Dinners, this week', 'All meals, any week ahead, repeat a week'],
  ['Week Shaper', '—', 'Your rules and the week’s events: five ideas a day, or one picked from your pantry'],
  ['Shopping list', 'One list from the plan', 'Groceries, Household and Toiletries; favourites and regulars; built for you each week; shared live'],
  ['Pantry', `A simple list, up to ${FREE_LIMITS.pantryItems} things`, 'Everything, with use-by dates, filled from your shopping'],
  ['Your recipes', `Up to ${FREE_LIMITS.recipes}`, 'As many as you like'],
  ['Import', `${FREE_LIMITS.importsPerMonth} a month, from a link or a caption`, 'As many as you like, plus Instagram, TikTok and cookbook photos'],
  ['Community library', `${FREE_LIMITS.libraryPerMonth} recipes each month`, 'The whole library'],
  ['Nutrition', 'Calories', 'Full macros, daily amounts, per person'],
  ['Household', 'One phone', 'The whole family, on every phone'],
  ['Cook mode', 'Yes', 'Yes'],
  ['Text size, contrast and themes', 'Always', 'Always'],
  ['Export and backup', 'Always', 'Always']
];

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let gone = false;

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/meals-home', text: 'Meals' }));
  mountEl.appendChild(el('h1', { text: 'Hearth' }));
  const status = el('p', { class: 'hearth-status', role: 'status', text: 'Checking your household…' });
  mountEl.append(
    el('p', { class: 'hearth-lead', text: 'Everything in Home-OS, for the whole household. £2.99 a month or £24.99 a year.' }),
    status
  );

  const table = el('table', { class: 'hearth-table' });
  table.appendChild(el('caption', { text: 'What Free and Hearth include' }));
  const head = el('tr');
  head.append(el('th', { scope: 'col', text: 'Part of the app' }), el('th', { scope: 'col', text: 'Free' }), el('th', { scope: 'col', text: 'Hearth' }));
  table.appendChild(el('thead', {}, [head]));
  const body = el('tbody');
  for (const [part, free, hearth] of ROWS) {
    const tr = el('tr');
    tr.append(el('th', { scope: 'row', text: part }), el('td', { text: free }), el('td', { text: hearth }));
    body.appendChild(tr);
  }
  table.appendChild(body);
  mountEl.appendChild(el('div', { class: 'hearth-table-wrap' }, [table]));

  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Moving between Free and Hearth never deletes anything. Past a Free limit, everything you made is still there to open and cook.'
  }));

  mountEl.appendChild(createActionBar({ label: 'Back to Meals', href: '#/meals-home', signal }).element);

  loadHearth({ force: true }).then(() => {
    if (gone) return;
    status.textContent = isHearth()
      ? 'Your household has Hearth. Everything here is switched on.'
      : 'Your household is on Free. Hearth is not on sale yet; it will be when Home-OS is in the app stores.';
  });

  return () => { gone = true; controller.abort(); };
}
