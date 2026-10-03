// js/views/kitchenToday.js — 03 Oct 2026 v4
// v4: your own meals open the recipe page too (#/recipe?m=<id>).
// v3: "We cooked it" on the next meal takes what it used out of the pantry
// (Phase 22's depletion, which the new screens had not offered).
// v2: Use soon items open the item sheet (new one in, gone, details, ideas).
// Kitchen rebuild K7. Today, for the kitchen-only app.
//
// dashboard.js hands over to this when navConfig.KITCHEN_ONLY is on, and
// keeps its own full-app screen for when it is off. Two screens rather than
// one full of conditions: the parked dashboard stays exactly as tested.
//
// ---- What it answers, in order ----
// 1. What is next to eat?        The next planned meal by the clock.
// 2. What else is planned today? Every other meal, or "Nothing planned".
// 3. What does that add up to?   Nutrition for the day as planned.
// 4. What should I use up?       Up to three things near their date.
// 5. What do I need to buy?      One number and a way to the list.
//
// Nothing here is a verdict. An empty meal says "Nothing planned", never
// "missed"; a day over its reference intake shows the number, nothing more.

import { el } from '../lib/dom.js';
import { todayIso } from '../lib/dates.js';
import { listPlan, servesFor } from '../data/mealPlan.js';
import { listIngredients, groupByMeal, computeMacros } from '../data/meals.js';
import { dayNutrition } from '../data/nutrition.js';
import { listStock, useSoon, describeFreshness } from '../data/pantry.js';
import { planDepletion, applyDepletion, describeDepletion } from '../data/restock.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { listItems as listShoppingItems } from '../data/shopping.js';
import { mealGlyph, mealIcon, MEAL_SLOTS } from '../components/mealGlyph.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { openItemSheet } from '../components/itemSheet.js';
import { dashboardLinks, FIRST_RUN_ACTION } from '../navConfig.js';
import { getState } from '../lib/store.js';

const DAY_VALUES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TONIGHT_ROUTE = '#/tonight';

/**
 * Which meal is "next" at this time of day. Fixed boundaries rather than a
 * setting: breakfast until half ten, lunch until half two, dinner after.
 * Snacks and drinks are never "next" — they are not what anyone means by
 * "what are we having?".
 */
export function nextSlotAt(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 14 * 60 + 30) return 'lunch';
  return 'dinner';
}

/**
 * The meal to feature: the slot for now if it has something planned, else
 * the next main meal later today that does. Null when nothing is left.
 */
export function pickNext(entries, now = new Date()) {
  const order = ['breakfast', 'lunch', 'dinner'];
  const from = order.indexOf(nextSlotAt(now));
  for (const slot of order.slice(from)) {
    const hit = entries.find((e) => e.slot === slot);
    if (hit) return hit;
  }
  return null;
}

function recipeHref(meal) {
  if (meal && meal.library_ref) return `#/recipe?r=${encodeURIComponent(meal.library_ref)}`;
  if (meal && meal.id) return `#/recipe?m=${encodeURIComponent(meal.id)}`;
  return '#/meals';
}

export function render(mountEl) {
  const controller = new AbortController();
  let destroyed = false;

  const now = new Date();
  const today = todayIso();
  const dayValue = DAY_VALUES[now.getDay()];

  const header = el('header', { class: 'today-header' });
  header.appendChild(el('h1', {
    class: 'today-day',
    text: now.toLocaleDateString('en-GB', { weekday: 'long' })
  }));
  header.appendChild(el('p', {
    class: 'today-date',
    text: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  }));
  mountEl.appendChild(header);

  // First run, offered not forced (Phase 27).
  const settings = getState().settings || {};
  if (!settings.onboarded_at) {
    const offer = el('p', { class: 'today-offer' });
    offer.appendChild(el('a', { class: 'btn', href: `#/${FIRST_RUN_ACTION.path}`, text: FIRST_RUN_ACTION.label }));
    mountEl.appendChild(offer);
  }

  const nextWrap = el('div');
  mountEl.appendChild(nextWrap);

  // What could be cooked from what is here (3 Oct 2026).
  const tonightLink = el('p', { class: 'today-tonight' });
  tonightLink.appendChild(el('a', { class: 'btn btn-block', href: TONIGHT_ROUTE, text: 'What can I make with what I have?' }));
  mountEl.appendChild(tonightLink);

  const restSection = el('section', { class: 'today-section', 'aria-labelledby': 'today-rest-h' });
  const restHead = el('div', { class: 'today-section-head' });
  restHead.appendChild(el('h2', { id: 'today-rest-h', text: 'The rest of today' }));
  restHead.appendChild(el('a', { href: '#/plan-this-week', text: 'Change' }));
  restSection.appendChild(restHead);
  const restList = el('ul', { class: 'today-meals' });
  restSection.appendChild(restList);
  mountEl.appendChild(restSection);

  const nutritionWrap = el('div');
  mountEl.appendChild(nutritionWrap);

  const soonSection = el('section', { class: 'today-section', 'aria-labelledby': 'today-soon-h' });
  soonSection.hidden = true;
  soonSection.appendChild(el('h2', { id: 'today-soon-h', text: 'Use soon' }));
  const soonList = el('ul', { class: 'today-soon' });
  soonSection.appendChild(soonList);
  mountEl.appendChild(soonSection);

  const shopLink = el('a', { class: 'today-shop', href: '#/shopping' });
  const shopCount = el('span', { class: 'today-shop-count', text: '…' });
  const shopText = el('span', { class: 'today-shop-text' });
  const shopTitle = el('span', { class: 'today-shop-title', text: 'Things to buy' });
  const shopHint = el('span', { class: 'today-shop-hint', text: 'Your shopping list' });
  shopText.append(shopTitle, shopHint);
  shopLink.append(shopCount, shopText, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
  mountEl.appendChild(shopLink);

  mountEl.appendChild(el('h2', { class: 'today-more-h', text: 'Everything else' }));
  const links = el('ul', { class: 'hub-list' });
  for (const entry of dashboardLinks()) {
    const item = el('li', { class: 'hub-item' });
    const link = el('a', { class: 'hub-link', href: `#/${entry.path}` });
    const text = el('span', { class: 'hub-text' });
    text.append(el('span', { class: 'hub-title', text: entry.title }), el('span', { class: 'hub-blurb', text: entry.blurb }));
    link.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
    item.appendChild(link);
    links.appendChild(item);
  }
  mountEl.appendChild(links);

  // ---------------------------------------------------------------- data

  async function loadMeals() {
    const [plan, ingredients] = await Promise.all([listPlan(), listIngredients()]);
    if (destroyed) return;
    const entries = plan.ok ? (plan.data || []).filter((e) => e.day_of_week === dayValue) : [];
    const next = pickNext(entries, now);
    paintNext(next);
    paintRest(entries, next);

    // Nutrition: each planned meal's per-serving figures, one portion each.
    const byMeal = ingredients.ok ? groupByMeal(ingredients.data) : new Map();
    const items = entries.map((entry) => {
      const meal = entry.meals || {};
      const rows = byMeal.get(entry.meal_id) || [];
      if (rows.length === 0) return null;
      const m = computeMacros(rows, { serves: meal.default_serves || 1 });
      return { perServing: m.perServing, complete: m.complete };
    }).filter(Boolean);
    nutritionWrap.replaceChildren();
    if (items.length > 0) {
      const day = dayNutrition(items);
      const skipped = entries.length - items.length;
      let note = 'An estimate for what is planned, one portion of each, against UK adult reference intakes.';
      if (skipped > 0) note += ` ${skipped} planned meal${skipped === 1 ? ' has' : 's have'} no ingredients yet, so ${skipped === 1 ? 'it is' : 'they are'} not counted.`;
      nutritionWrap.appendChild(nutritionBars({ id: 'today-nutrition-h', title: "Today's nutrition", totals: day.totals, complete: day.complete, note }));
    }
  }

  function paintNext(entry) {
    nextWrap.replaceChildren();
    if (!entry) {
      const empty = el('section', { class: 'today-next today-next-empty', 'aria-labelledby': 'today-next-h' });
      empty.appendChild(el('h2', { id: 'today-next-h', text: 'Nothing else planned today' }));
      empty.appendChild(el('a', { class: 'btn btn-primary', href: '#/plan-this-week', text: 'Plan a meal' }));
      nextWrap.appendChild(empty);
      return;
    }
    const meal = entry.meals || {};
    const label = (MEAL_SLOTS.find((s) => s.value === entry.slot) || {}).label || 'Next';
    const card = el('section', { class: `today-next meal-${entry.slot}`, 'aria-labelledby': 'today-next-h' });
    const when = el('p', { class: 'today-next-when' });
    when.appendChild(mealIcon(entry.slot, 20));
    when.appendChild(document.createTextNode(` ${label} is next`));
    card.appendChild(when);
    card.appendChild(el('h2', { id: 'today-next-h', class: 'today-next-name', text: meal.name || 'Planned' }));
    const facts = el('ul', { class: 'today-next-facts' });
    facts.appendChild(el('li', { text: `Serves ${servesFor(entry)}` }));
    for (const tag of meal.dietary_tags || []) facts.appendChild(el('li', { text: tag.replace(/_/g, ' ') }));
    card.appendChild(facts);
    const buttons = el('div', { class: 'today-next-buttons' });
    buttons.appendChild(el('a', { class: 'btn today-next-open', href: recipeHref(meal), text: 'Open recipe' }));
    const cooked = el('button', { type: 'button', class: 'btn today-next-cooked', text: 'We cooked it', 'aria-haspopup': 'dialog' });
    cooked.addEventListener('click', () => offerDepletion(entry, cooked), { signal: controller.signal });
    buttons.appendChild(cooked);
    card.appendChild(buttons);
    nextWrap.appendChild(card);
  }

  /**
   * Cooking is the one moment the app knows what left the cupboard. Offer to
   * take it out, show exactly what will change, and never do it silently.
   */
  async function offerDepletion(entry, returnFocusTo) {
    const meal = entry.meals || {};
    const [ings, stock] = await Promise.all([listIngredients(entry.meal_id), listStock()]);
    if (destroyed) return;
    if (!ings.ok || !stock.ok) { showToast('The pantry could not be read. Try again.'); return; }
    const scale = servesFor(entry) / (meal.default_serves || 1);
    const changes = planDepletion(ings.data || [], stock.data || [], scale);
    if (changes.length === 0) {
      const words = `Enjoy ${meal.name || 'it'}. Nothing it uses is tracked in the pantry.`;
      showToast(words);
      announce(words);
      return;
    }
    openDetailSheet({
      title: 'We cooked it',
      subtitle: describeDepletion(changes),
      returnFocusTo,
      build(body, api) {
        const list = el('ul', { class: 'cooked-changes' });
        for (const c of changes) {
          const name = (c.food && c.food.name) || 'Something';
          const text = c.toLevel !== undefined
            ? `${name}: plenty to low`
            : `${name}: ${c.before} to ${c.after} ${c.unit}`;
          list.appendChild(el('li', { text }));
        }
        body.appendChild(list);
        const row = el('div', { class: 'item-sheet-buttons' });
        const yes = el('button', { type: 'button', class: 'btn btn-primary', text: 'Take them out' });
        const no = el('button', { type: 'button', class: 'btn', text: 'Not this time' });
        yes.addEventListener('click', async () => {
          yes.disabled = true;
          const done = await applyDepletion(changes);
          if (!done.ok) { yes.disabled = false; showToast('That did not save. Try again.'); return; }
          api.close();
          const words = `Pantry updated: ${done.applied} thing${done.applied === 1 ? '' : 's'}.`;
          showToast(words);
          announce(words);
          if (!destroyed) loadUseSoon();
        });
        no.addEventListener('click', () => api.close());
        row.append(yes, no);
        body.appendChild(row);
      }
    });
  }

  function paintRest(entries, next) {
    restList.replaceChildren();
    for (const slot of MEAL_SLOTS) {
      const here = entries.filter((e) => e.slot === slot.value && e !== next);
      // The featured meal is already above; its slot is listed only if it
      // holds something else too.
      if (next && slot.value === next.slot && here.length === 0) continue;
      // Drinks have no slot in the database until migration 026. Not
      // shown until they can hold anything, rather than as a row that can
      // only ever say "nothing".
      if (slot.value === 'drink' && !entries.some((e) => e.slot === 'drink')) continue;
      const li = el('li', { class: 'today-meal' });
      li.appendChild(mealGlyph(slot.value, 20));
      const text = el('span', { class: 'today-meal-text' });
      text.appendChild(el('span', { class: 'today-meal-slot', text: slot.label }));
      if (here.length === 0) {
        text.appendChild(el('span', { class: 'today-meal-none', text: 'Nothing planned' }));
      } else {
        const names = el('span', { class: 'today-meal-names' });
        here.forEach((entry, i) => {
          if (i) names.appendChild(document.createTextNode(', '));
          names.appendChild(el('a', { href: recipeHref(entry.meals), text: (entry.meals && entry.meals.name) || 'Planned' }));
        });
        text.appendChild(names);
      }
      li.appendChild(text);
      restList.appendChild(li);
    }
  }

  async function loadUseSoon() {
    const result = await listStock();
    if (destroyed || !result.ok) return;
    const stock = result.data || [];
    const soon = useSoon(stock, today);
    soonList.replaceChildren();
    if (soon.length === 0) { soonSection.hidden = true; return; }
    const places = [...new Set(stock.map((r) => r.default_location).filter(Boolean))];
    for (const { row, freshness } of soon.slice(0, 4)) {
      const li = el('li');
      // A button: tapping a thing near its date is how you say a new one
      // came in, that it went, or find a way to use it (itemSheet.js).
      const name = (row.foods && row.foods.name) || 'Something';
      const btn = el('button', { type: 'button', class: 'today-soon-item', 'aria-haspopup': 'dialog' });
      btn.appendChild(el('span', { class: 'today-soon-name', text: name }));
      btn.appendChild(el('span', { class: 'today-soon-when', text: describeFreshness(freshness) }));
      btn.addEventListener('click', () => {
        openItemSheet(row, { returnFocusTo: btn, places, onChanged: () => { if (!destroyed) loadUseSoon(); } });
      }, { signal: controller.signal });
      li.appendChild(btn);
      soonList.appendChild(li);
    }
    soonSection.hidden = false;
  }

  async function loadShopping() {
    const result = await listShoppingItems();
    if (destroyed) return;
    if (!result.ok) { shopCount.textContent = '–'; shopHint.textContent = 'Could not load the list'; return; }
    const outstanding = (result.data || []).filter((item) => item.status === 'needed').length;
    shopCount.textContent = String(outstanding);
    shopTitle.textContent = outstanding === 1 ? 'Thing to buy' : 'Things to buy';
    shopHint.textContent = outstanding === 0 ? 'The list is clear' : 'Open the shopping list';
  }

  Promise.allSettled([loadMeals(), loadUseSoon(), loadShopping()]).then((results) => {
    for (const r of results) if (r.status === 'rejected') console.error('A Today section failed:', r.reason);
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
