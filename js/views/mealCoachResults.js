// js/views/mealCoachResults.js — 27 Nov 2026 v1
// Phase 39. Help me choose: the results (#/meal-coach-results?…).
//
// Five at a time, best first, each a card to the recipe with its reasons as
// chips. Show 5 more pages on. When the answers leave fewer than five, the
// coach says which answer to loosen and how many that brings back: one tap
// each, never a dead end. Change my answers is the one primary action.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { createActionBar } from '../components/actionBar.js';
import { loadCoachData, saveQuery } from '../data/mealCoachLoad.js';
import {
  fromQuery, toQuery, filterFacts, rankFacts, page as pageOf, loosen, applyLoosen, describeAnswers, tableTest, answeredCount, TOO_FEW
} from '../data/mealCoach.js';

const SIZE = 5;

function recipeHref(c) {
  if (c.meal && c.meal.id) return `#/recipe?m=${encodeURIComponent(c.meal.id)}`;
  if (c.recipe) return `#/recipe?r=${encodeURIComponent(c.recipe.slug)}`;
  return '#/meals-home';
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const answers = fromQuery(window.location.hash || '');
  const query = toQuery(answers);
  saveQuery(query);
  const backHref = `#/meal-coach${query ? `?${query}` : ''}`;

  mountEl.appendChild(el('a', { class: 'back-link', href: backHref, text: 'Your answers' }));
  const h1 = el('h1', { text: 'Best fits' });
  mountEl.appendChild(h1);
  const summary = el('p', { class: 'field-hint' });
  const words = describeAnswers(answers);
  summary.textContent = words.length ? words.join(' · ') : 'No answers yet, so these are the best of everything.';
  if (!answers.everyone) summary.textContent += ' · Any diet';
  const status = el('p', { class: 'coach-line', role: 'status', 'aria-live': 'polite', text: 'Choosing…' });
  const results = el('section', { class: 'shaper-section shaper-results', 'aria-labelledby': 'coach-results-h' });
  mountEl.append(summary, status, results);
  mountEl.appendChild(createActionBar({ label: 'Change my answers', href: backHref, signal }).element);

  let ranked = [];
  let shown = 0;
  let list = null;
  let more = null;

  async function load() {
    const data = await loadCoachData();
    if (destroyed) return;
    const table = tableTest(data.members);
    ranked = rankFacts(filterFacts(data.facts, answers, table), answers);
    const n = ranked.length;
    status.textContent = n === 0
      ? 'Nothing fits all of these answers.'
      : !answeredCount(answers) ? `The best five of ${n}. Answer a question or two for a closer fit.`
        : `${n} recipe${n === 1 ? ' fits' : 's fit'}, best first.`;
    results.replaceChildren(el('h2', { id: 'coach-results-h', text: n ? 'Recipes that fit' : 'Loosen one answer' }));
    if (n) {
      list = el('ul', { class: 'shaper-list' });
      results.appendChild(list);
      addPage();
    }
    if (n < TOO_FEW) {
      const ideas = loosen(data.facts, answers, table);
      if (ideas.length) {
        if (n) results.appendChild(el('h2', { id: 'coach-loosen-h', text: 'For more to choose from' }));
        const ul = el('ul', { class: 'hub-list' });
        for (const idea of ideas) {
          const next = applyLoosen(answers, idea);
          const q = toQuery(next);
          const li = el('li', { class: 'hub-item' });
          const a = el('a', { class: 'hub-link', href: `#/meal-coach-results${q ? `?${q}` : ''}` });
          const text = el('span', { class: 'hub-text' });
          text.append(el('span', { class: 'hub-title', text: idea.label }), el('span', { class: 'hub-blurb', text: `${idea.gain} more, ${idea.total} in all` }));
          a.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
          li.appendChild(a);
          ul.appendChild(li);
        }
        results.appendChild(ul);
      } else if (!n) {
        results.appendChild(el('p', { text: 'Your meals and the library did not load. Check your connection and try again.' }));
      }
    }
  }

  function card(r) {
    const li = el('li', { class: 'shaper-card' });
    const h = el('h3', { class: 'shaper-name' });
    h.appendChild(el('a', { href: recipeHref(r.f.c), text: r.f.c.name }));
    const chips = el('ul', { class: 'shaper-reasons' });
    for (const reason of r.reasons) chips.appendChild(el('li', { text: reason }));
    li.append(h, chips);
    return li;
  }

  function addPage() {
    const batch = pageOf(ranked, shown / SIZE, SIZE);
    const first = batch.length ? card(batch[0]) : null;
    batch.forEach((r, i) => list.appendChild(i === 0 ? first : card(r)));
    shown += batch.length;
    if (more) more.remove();
    more = null;
    if (shown < ranked.length) {
      more = el('button', { type: 'button', class: 'btn', text: `Show ${Math.min(SIZE, ranked.length - shown)} more` });
      more.addEventListener('click', () => {
        const before = shown;
        addPage();
        announce(`Showing ${shown} of ${ranked.length}.`);
        const link = list.children[before] && list.children[before].querySelector('a');
        if (link) link.focus();
      }, { signal });
      list.after(more);
    }
  }

  load().catch((error) => {
    if (destroyed) return;
    console.error('Help me choose results failed:', error);
    status.textContent = 'Something went wrong reading the recipes. Try again.';
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
