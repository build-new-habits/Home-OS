// js/views/mealCoach.js — 27 Nov 2026 v1
// Phase 39. Help me choose (#/meal-coach).
//
// A few questions, each a row of taps, every one optional. Each choice says
// how many recipes it would leave, so you can see the library narrow before
// you commit. The coach line says how many fit and which question would
// narrow it most. The one primary action, in thumb reach, carries the
// count: "Show 34 recipes".
//
// Nothing here is a fold: every question is on the page, and the results
// are their own page (#/meal-coach-results), so Back keeps your answers.
// Rules, not AI (data/mealCoach.js).

import { el } from '../lib/dom.js';
import { createActionBar } from '../components/actionBar.js';
import { loadCoachData, readSavedQuery, saveQuery } from '../data/mealCoachLoad.js';
import {
  QUESTIONS, blankAnswers, fromQuery, toQuery, filterFacts, countsFor, coachLine, tableTest, answeredCount
} from '../data/mealCoach.js';
import { householdDiet } from '../data/weekIdeas.js';

const DIET_WORDS = { vegetarian: 'vegetarian', vegan: 'vegan', gluten_free: 'gluten free', dairy_free: 'dairy free', nut_free: 'nut free' };

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const hash = window.location.hash || '';
  let answers = hash.includes('?') ? fromQuery(hash) : fromQuery(readSavedQuery());

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/meals-home', text: 'Meals' }));
  mountEl.appendChild(el('h1', { text: 'Help me choose' }));
  mountEl.appendChild(el('p', { class: 'field-hint', text: 'Tap what matters today and skip the rest. The number on each answer is how many recipes it leaves.' }));
  const line = el('p', { class: 'coach-line', role: 'status', 'aria-live': 'polite', text: 'Reading your meals and the library…' });
  const body = el('div', { class: 'coach' });
  mountEl.append(line, body);
  const bar = createActionBar({ label: 'Show recipes', href: '#/meal-coach-results', signal });
  mountEl.appendChild(bar.element);
  const barLink = bar.element.querySelector('a');

  let data = null;
  let table = () => true;
  const rows = new Map(); // question id → [{ value, btn, label }]
  let everyoneBox = null;

  async function load() {
    data = await loadCoachData();
    if (destroyed) return;
    table = tableTest(data.members);
    build();
    paint();
  }

  function build() {
    body.replaceChildren();
    if (!data.hearth && data.libraryAll > data.libraryShown) {
      const note = el('p', { class: 'field-hint' });
      note.append(`Choosing from your meals and this month's ${data.libraryShown} library recipes. Hearth opens all ${data.libraryAll}. `,
        el('a', { href: '#/hearth', text: 'See Hearth' }));
      body.appendChild(note);
    }
    if (data.partial) body.appendChild(el('p', { class: 'field-hint', text: 'Part of the library or your meals did not load, so there may be fewer than usual.' }));

    const tableDiet = [...householdDiet(data.members)].filter((t) => t !== 'nut_free');
    if (tableDiet.length) {
      const row = el('div', { class: 'checkbox-row' });
      everyoneBox = el('input', { type: 'checkbox', id: 'coach-everyone' });
      everyoneBox.checked = answers.everyone;
      everyoneBox.addEventListener('change', () => {
        answers = { ...answers, everyone: everyoneBox.checked };
        paint();
      }, { signal });
      row.append(everyoneBox, el('label', { for: 'coach-everyone', text: `Suits everyone at home (${tableDiet.map((t) => DIET_WORDS[t] || t).join(', ')})` }));
      body.appendChild(row);
    }
    if (householdDiet(data.members).has('nut_free')) body.appendChild(el('p', { class: 'field-hint', text: 'Nut free is always kept to.' }));

    for (const q of QUESTIONS) {
      const set = el('fieldset', { class: 'coach-question' });
      set.appendChild(el('legend', { text: q.label }));
      const chips = el('div', { class: 'shaper-chips' });
      const list = [{ value: 'any', label: 'Any' }, ...q.choices].map((c) => {
        const btn = el('button', { type: 'button', class: 'chip-toggle' });
        btn.addEventListener('click', () => choose(q, c), { signal });
        chips.appendChild(btn);
        return { value: c.value, label: c.label, btn };
      });
      rows.set(q.id, list);
      set.appendChild(chips);
      body.appendChild(set);
    }
    const again = el('button', { type: 'button', class: 'btn', text: 'Start again' });
    again.addEventListener('click', () => {
      answers = blankAnswers();
      if (everyoneBox) everyoneBox.checked = true;
      paint();
    }, { signal });
    body.appendChild(again);
  }

  function choose(q, c) {
    answers = { ...answers, [q.id]: c.value };
    paint(); // the coach line is a live region: it says the new count
  }

  function paint() {
    if (!data) return;
    const fitting = filterFacts(data.facts, answers, table);
    line.textContent = coachLine(fitting, answers, { total: data.facts.length });
    for (const q of QUESTIONS) {
      const counts = countsFor(data.facts, answers, q.id, table);
      for (const r of rows.get(q.id) || []) {
        const n = counts[r.value] || 0;
        const on = answers[q.id] === r.value;
        r.btn.setAttribute('aria-pressed', String(on));
        r.btn.replaceChildren(el('span', { text: r.label }), el('span', { class: 'coach-count', text: ` ${n}` }));
        r.btn.setAttribute('aria-label', `${r.label}, ${n} recipe${n === 1 ? '' : 's'}`);
      }
    }
    const query = toQuery(answers);
    saveQuery(query);
    const n = fitting.length;
    const href = `#/meal-coach-results${query ? `?${query}` : ''}`;
    if (barLink) barLink.setAttribute('href', href);
    bar.setLabel(n === 0 ? 'Nothing fits yet' : !answeredCount(answers) ? 'Show the best five' : `Show ${n} recipe${n === 1 ? '' : 's'}`);
    bar.setDisabled(n === 0);
  }

  load().catch((error) => {
    if (destroyed) return;
    console.error('Help me choose failed:', error);
    line.textContent = 'Something went wrong reading the recipes. Try again.';
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
