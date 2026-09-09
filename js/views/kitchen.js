// js/views/kitchen.js — 08 Sep 2026 v4
// v2: the shopping card carries a real count now the list exists.
// Meals, pantry and shopping behind one entry.
//
// These three are not peers the way exercises, weight and water are. They
// are one pipeline: plan a week, diff it against the cupboards, buy the
// difference, stock the cupboards, cook. They already cross-reference each
// other constantly, so three separate bottom-bar slots was describing the
// implementation rather than the job.
//
// ---- A hub of three links is worse than three links ----
// It costs a tap and returns nothing. So each card carries the fact that
// was usually the REASON for opening the page: how much is still to buy,
// what is on tonight, what is worth using up. If a card cannot say
// anything useful it says so plainly rather than showing a hopeful blank.
//
// ---- Counts must never be guessed ----
// A number here that turns out to be wrong is worse than no number: it gets
// trusted at exactly the moment it matters, standing in a shop. Where the
// data is not there yet — the shopping list is still a Phase 7 stub — the
// card says what it is for and offers no count at all.

import { KITCHEN_PAGES } from '../navConfig.js';
import { listPlan, DAYS } from '../data/mealPlan.js';
import { listMeals } from '../data/meals.js';
import { listStock, useSoon, needsAmount } from '../data/pantry.js';
import { listItems as listShoppingItems } from '../data/shopping.js';
import { icon } from '../lib/icons.js';

import { el } from '../lib/dom.js';
import { SLOTS } from '../data/mealPlan.js';
/** Monday-first index of today, matching mealPlan.DAYS. */
function todayDayIndex() {
  const day = new Date().getDay(); // 0 = Sunday
  return day === 0 ? 6 : day - 1;
}

export function render(mountEl) {
  const controller = new AbortController();
  let destroyed = false;

  mountEl.appendChild(el('h1', { text: 'Kitchen' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Plan a week, check the cupboards, buy the difference.'
  }));

  // ---- Today's meals, across the top ---------------------------------
  // The Kitchen was six doors and nothing else, so the commonest question —
  // what am I eating today — took two taps and a scroll. This answers it
  // before you have decided where to go.
  //
  // It is a link, not a card with links inside it: one target, the whole
  // thing, which is easier to hit than four small rows and behaves properly
  // with a keyboard.
  const todayCard = el('a', { class: 'today-meals', href: '#/plan-today' });
  const todayHead = el('span', { class: 'today-meals-head' });
  todayHead.appendChild(el('span', { class: 'today-meals-title', text: "Today's meals" }));
  todayHead.appendChild(el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
  todayCard.appendChild(todayHead);
  const todayRows = el('span', { class: 'today-meals-rows' });
  todayCard.appendChild(todayRows);
  mountEl.appendChild(todayCard);

  const list = el('ul', { class: 'hub-list hub-grid' });
  const cards = new Map();

  for (const page of KITCHEN_PAGES) {
    const item = el('li', { class: 'hub-item' });
    const link = el('a', { class: 'hub-link', href: `#/${page.path}` });
    const mark = icon(page.path === 'meal-plan' ? 'plan' : page.path, { size: 24 });
    if (mark) link.appendChild(mark);

    const text = el('span', { class: 'hub-text' });
    text.appendChild(el('span', { class: 'hub-title', text: page.title }));
    text.appendChild(el('span', { class: 'hub-blurb', text: page.blurb }));
    const status = el('span', { class: 'hub-status' });
    text.appendChild(status);
    cards.set(page.path, { status, link, title: page.title });
    link.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
    item.appendChild(link);
    list.appendChild(item);
  }
  mountEl.appendChild(list);

  /** The status goes into the accessible name too, or a screen reader
   *  reading links out of context never hears it. */
  function setStatus(path, text) {
    const card = cards.get(path);
    if (!card || !text) return;
    card.status.textContent = text;
    card.link.setAttribute('aria-label', `${card.title}. ${text}`);
  }

  /**
   * Every slot today, named. Empty slots are shown rather than hidden:
   * "Lunch — nothing planned" is the line that makes you plan a lunch, and
   * a card that silently omits it just looks like a shorter day.
   */
  function renderToday(entries, meals, today) {
    todayRows.replaceChildren();
    let any = false;
    for (const slot of SLOTS) {
      const here = (entries || []).filter((e) =>
        e.day_of_week === today.value && e.slot === slot.value);
      const row = el('span', { class: 'today-meals-row' });
      row.appendChild(el('span', { class: 'today-meals-slot', text: slot.label }));
      if (here.length === 0) {
        row.appendChild(el('span', { class: 'today-meals-none', text: 'Nothing planned' }));
      } else {
        any = true;
        const names = here
          .map((e) => (meals.get(e.meal_id) || {}).name || 'A meal')
          .join(', ');
        row.appendChild(el('span', { class: 'today-meals-name', text: names }));
      }
      todayRows.appendChild(row);
    }
    todayCard.setAttribute('aria-label', any
      ? `Today's meals. ${today.label}.`
      : `Today's meals. Nothing planned for ${today.label} yet.`);
  }

  async function loadMeals() {
    const [planResult, mealResult] = await Promise.all([listPlan(), listMeals()]);
    if (destroyed) return;
    if (!mealResult.ok) return;
    const meals = new Map((mealResult.data || []).map((m) => [m.id, m]));

    if (!planResult.ok || (planResult.data || []).length === 0) {
      setStatus('meals', meals.size === 0
        ? 'No recipes yet'
        : `${meals.size} recipe${meals.size === 1 ? '' : 's'}, nothing planned this week`);
      return;
    }

    const entries = planResult.data;
    const today = DAYS[todayDayIndex()];
    renderToday(entries, meals, today);
    const tonight = entries.find((entry) =>
      entry.day_of_week === today.value && entry.slot === 'dinner');

    // Days with anything planned at all, so "unplanned" means genuinely
    // empty rather than missing one slot.
    const plannedDays = new Set(entries.map((entry) => entry.day_of_week)).size;
    const bits = [];
    if (tonight) {
      const meal = meals.get(tonight.meal_id);
      bits.push(`Tonight: ${meal ? meal.name : 'planned'}`);
    }
    bits.push(`${plannedDays} of 7 days planned`);
    setStatus('meals', bits.join(' · '));
  }

  async function loadPantry() {
    const result = await listStock();
    if (destroyed || !result.ok) return;
    const rows = result.data || [];
    if (rows.length === 0) {
      setStatus('pantry', 'Nothing captured yet');
      return;
    }
    const bits = [`${rows.length} item${rows.length === 1 ? '' : 's'}`];
    const soon = useSoon(rows).length;
    if (soon > 0) bits.push(`${soon} worth using up`);
    const missing = needsAmount(rows).length;
    // Stated because it silently breaks the shortfall: no amount reads as
    // "you have none", and the shopping list would rebuy the lot.
    if (missing > 0) bits.push(`${missing} still needs an amount`);
    setStatus('pantry', bits.join(' · '));
  }

  async function loadShopping() {
    const result = await listShoppingItems();
    if (destroyed || !result.ok) return;
    const rows = result.data || [];
    if (rows.length === 0) {
      setStatus('shopping', 'Nothing on the list');
      return;
    }
    const outstanding = rows.filter((row) => row.status === 'needed').length;
    setStatus('shopping', outstanding === 0
      ? `${rows.length} item${rows.length === 1 ? '' : 's'}, all got`
      : `${outstanding} still to get`);
  }

  Promise.allSettled([loadShopping(), loadMeals(), loadPantry()]).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') console.error('Kitchen summary failed:', result.reason);
    }
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
