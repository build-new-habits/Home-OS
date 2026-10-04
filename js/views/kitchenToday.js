// js/views/kitchenToday.js — 04 Oct 2026 v13
// v13: Plan tomorrow follows your food week.
// v12: foods with no nutrition are filled in once a day, and Today says so.
// v11: nutrition reads only the planned meals' ingredients (data/plannedIngredients.js), and a library meal left with none is counted from its recipe and repaired.
// v10: calmer (persona re-trace 3). The next meal says how many portions in
// one line, with Change opening the portion choices in a sheet; drinks show
// the four you add most, the rest one tap away; "Nothing planned today"
// when nothing is.
// v9: today's links ask for this week by name, so the weekend look-ahead on Plan does not move them.
// v8: portions — the next meal says how many it makes, with − and + and
// "Double, freeze half"; Eaten and We cooked it take from the pantry once,
// between them (data/pantryTaken.js), and spare portions are offered to the freezer.
// v7: Drinks today — one tap per drink (data/drinks.js), counted in nutrition.
// v6: an Eaten tick on each of today's meals; nutrition eaten so far beside
// the day as planned; "Take them out" after cooking ticks the meal too.
// v5: Tomorrow — what is planned and what to take out of the freezer tonight;
// the next meal shows its photo when it has one.
// v4: leftovers — labelled, never taken from the pantry again, and the
// next meal offers "Plan leftovers" once the database can store them.
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
import { listPlan, servesFor, isLeftover, leftoversReady } from '../data/mealPlan.js';
import { getHousehold } from '../data/household.js';
import { portionsControl } from '../components/portionsControl.js';
import { eatenTick } from '../components/eatenTick.js';
import { wasTaken, planForEntry, takeForEntry, markTaken } from '../data/pantryTaken.js';
import { sparePortions, entryPortions, portionWords } from '../data/portions.js';
import { openSpareSheet } from '../components/spareSheet.js';
import { openLeftoverSheet } from '../components/leftoverSheet.js';
import { nextWeekStart, thisWeekStart } from '../lib/weeks.js';
import { listDrinks, drinkNutritionItems } from '../data/drinks.js';
import { drinksQuickAdd } from '../components/drinksQuickAdd.js';
import { everydayName } from '../lib/foodNames.js';
import { loadImages } from '../data/recipeImages.js';
import { recipePhoto } from '../components/recipePhoto.js';
import { groupByMeal, computeMacros } from '../data/meals.js';
import { ingredientsForEntries } from '../data/plannedIngredients.js';
import { dayNutrition } from '../data/nutrition.js';
import { listStock, useSoon, describeFreshness } from '../data/pantry.js';
import { describeDepletion } from '../data/restock.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { listItems as listShoppingItems } from '../data/shopping.js';
import { mealGlyph, mealIcon, MEAL_SLOTS } from '../components/mealGlyph.js';
import { nutritionBars } from '../components/nutritionBars.js';
import { openItemSheet } from '../components/itemSheet.js';
import { dashboardLinks, FIRST_RUN_ACTION } from '../navConfig.js';
import { getState } from '../lib/store.js';
import { eatenOf, setEaten } from '../data/eaten.js';
import { repairNutrition, unseenFixes } from '../data/nutritionRepair.js';
import { looksAhead } from '../lib/foodWeek.js';

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
  // Nutrition filled in by itself (4 Oct 2026, data/nutritionRepair.js):
  // said once, with a way to see and change what was done.
  const fixesNote = el('p', { class: 'today-fixes' });
  fixesNote.hidden = true;
  mountEl.appendChild(fixesNote);
  function paintFixesNote() {
    const n = unseenFixes();
    fixesNote.hidden = n === 0;
    if (!n) return;
    fixesNote.replaceChildren(el('a', { class: 'btn btn-block', href: '#/nutrition-fixes', text: `${n} food${n === 1 ? ' now has its' : 's now have their'} nutrition. See what was filled in` }));
  }
  paintFixesNote();

  const tonightLink = el('p', { class: 'today-tonight' });
  tonightLink.appendChild(el('a', { class: 'btn btn-block', href: TONIGHT_ROUTE, text: 'What can I make with what I have?' }));
  mountEl.appendChild(tonightLink);

  const restSection = el('section', { class: 'today-section', 'aria-labelledby': 'today-rest-h' });
  const restHead = el('div', { class: 'today-section-head' });
  restHead.appendChild(el('h2', { id: 'today-rest-h', text: 'The rest of today' }));
  restHead.appendChild(el('a', { href: '#/plan-this-week?week=this', text: 'Change' }));
  restSection.appendChild(restHead);
  const restList = el('ul', { class: 'today-meals' });
  restSection.appendChild(restList);
  mountEl.appendChild(restSection);

  // Drinks today (4 Oct 2026): a tap per drink, nothing to plan.
  const drinksSection = el('section', { class: 'today-section', 'aria-labelledby': 'today-drinks-h' });
  drinksSection.appendChild(el('h2', { id: 'today-drinks-h', text: 'Drinks today' }));
  drinksSection.appendChild(drinksQuickAdd({
    weekStart: thisWeekStart(), day: dayValue, signal: controller.signal, compact: true,
    onChange: () => paintNutrition()
  }));
  mountEl.appendChild(drinksSection);

  // Tomorrow (4 Oct 2026): what is planned, and anything to take out of
  // the freezer tonight. Seeing tomorrow's dinner the night before is when
  // there is still time to defrost it or buy the one missing thing.
  const tomorrowSection = el('section', { class: 'today-section', 'aria-labelledby': 'today-tomorrow-h' });
  tomorrowSection.hidden = true;
  tomorrowSection.appendChild(el('h2', { id: 'today-tomorrow-h', text: 'Tomorrow' }));
  const tomorrowBody = el('div', { class: 'today-tomorrow' });
  tomorrowSection.appendChild(tomorrowBody);
  mountEl.appendChild(tomorrowSection);

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

  let weekEntries = [];
  let members = [];
  async function loadMeals() {
    const [plan, household] = await Promise.all([listPlan(), getHousehold().catch(() => null)]);
    if (destroyed) return;
    // Only the planned meals' ingredients, so no row limit can drop any;
    // tomorrow's (next week's Monday on a Sunday) come with them.
    const tomorrowPlan = now.getDay() === 0 ? await listPlan(nextWeekStart()) : { ok: true, data: [] };
    if (destroyed) return;
    const ingredients = await ingredientsForEntries([...(plan.ok ? plan.data || [] : []), ...(tomorrowPlan.ok ? tomorrowPlan.data || [] : [])]);
    if (destroyed) return;
    members = household && household.ok ? ((household.data && household.data.members) || []) : [];
    weekEntries = plan.ok ? (plan.data || []) : [];
    const entries = weekEntries.filter((e) => e.day_of_week === dayValue);
    const next = pickNext(entries, now);
    paintNext(next, entries.length > 0);
    paintRest(entries, next);
    paintTomorrow(byMealFor(ingredients)).catch(() => {});

    todayEntries = entries;
    todayByMeal = byMealFor(ingredients);
    paintNutrition();
  }

  let todayEntries = [];
  let todayByMeal = new Map();

  // Nutrition: each planned meal's per-serving figures, one portion each.
  // Once anything is ticked as eaten, what has been eaten so far comes
  // first, then the day as planned.
  function paintNutrition() {
    const entries = todayEntries;
    const itemFor = (entry) => {
      const meal = entry.meals || {};
      const rows = todayByMeal.get(entry.meal_id) || [];
      if (rows.length === 0) return null;
      const m = computeMacros(rows, { serves: meal.default_serves || 1 });
      return { perServing: m.perServing, complete: m.complete };
    };
    // Drinks are had, not planned, so they count in both.
    const drinks = listDrinks(thisWeekStart(), dayValue);
    const drinkItems = drinkNutritionItems(drinks);
    const drinkNote = drinks.length ? ` Includes ${drinks.length} drink${drinks.length === 1 ? '' : 's'}.` : '';
    const items = entries.map(itemFor).filter(Boolean).concat(drinkItems);
    nutritionWrap.replaceChildren();
    const eaten = eatenOf(entries);
    const eatenItems = eaten.map(itemFor).filter(Boolean);
    if (eatenItems.length > 0) {
      const day = dayNutrition(eatenItems.concat(drinkItems));
      const note = `${eaten.length} of ${entries.length} planned meal${entries.length === 1 ? '' : 's'} ticked as eaten. One portion of each, against UK adult reference intakes.${drinkNote}`;
      nutritionWrap.appendChild(nutritionBars({ id: 'today-eaten-h', title: 'Eaten so far today', totals: day.totals, complete: day.complete, note }));
    }
    if (items.length > 0) {
      const day = dayNutrition(items);
      const skipped = entries.length - (items.length - drinkItems.length);
      let note = 'An estimate for what is planned, one portion of each, against UK adult reference intakes.';
      note += drinkNote;
      if (skipped > 0) note += ` ${skipped} planned meal${skipped === 1 ? ' has' : 's have'} no ingredients yet, so ${skipped === 1 ? 'it is' : 'they are'} not counted.`;
      nutritionWrap.appendChild(nutritionBars({ id: 'today-nutrition-h', title: eatenItems.length ? 'Today as planned' : "Today's nutrition", totals: day.totals, complete: day.complete, note }));
    }
  }

  function byMealFor(ingredients) {
    return ingredients && ingredients.ok ? groupByMeal(ingredients.data) : new Map();
  }

  async function paintTomorrow(byMeal) {
    const tomorrowIndex = (now.getDay() + 1) % 7;
    const tomorrowValue = DAY_VALUES[tomorrowIndex];
    // Sunday's tomorrow is next week's Monday.
    let entries = weekEntries;
    if (now.getDay() === 0) {
      const next = await listPlan(nextWeekStart());
      if (destroyed) return;
      entries = next.ok ? next.data || [] : [];
    }
    // Which Plan page tomorrow is on depends on YOUR food week (lib/foodWeek.js).
    const planHref = looksAhead(now) ? '#/plan-next-week' : '#/plan-this-week?week=this';
    const planned = entries.filter((e) => e.day_of_week === tomorrowValue);
    tomorrowBody.replaceChildren();
    tomorrowSection.hidden = false;
    if (planned.length === 0) {
      const p = el('p', { class: 'field-hint' });
      p.appendChild(document.createTextNode('Nothing planned yet. '));
      p.appendChild(el('a', { href: planHref, text: 'Plan tomorrow' }));
      tomorrowBody.appendChild(p);
      return;
    }
    const ul = el('ul', { class: 'today-tomorrow-list' });
    for (const slot of MEAL_SLOTS) {
      const here = planned.filter((e) => e.slot === slot.value);
      if (!here.length) continue;
      const li = el('li');
      li.appendChild(el('span', { class: 'today-meal-slot', text: `${slot.label}: ` }));
      here.forEach((entry, i) => {
        if (i) li.appendChild(document.createTextNode(', '));
        li.appendChild(el('a', { href: recipeHref(entry.meals), text: `${(entry.meals && entry.meals.name) || 'Planned'}${isLeftover(entry) ? ' (leftovers)' : ''}` }));
      });
      ul.appendChild(li);
    }
    tomorrowBody.appendChild(ul);

    // Anything tomorrow's cooking needs that lives in the freezer.
    const stock = await listStock();
    if (destroyed || !stock.ok) return;
    const frozen = new Map();
    for (const row of stock.data || []) {
      if (/freez/i.test(String(row.default_location || ''))) frozen.set(row.food_id, row);
    }
    const toDefrost = new Set();
    for (const entry of planned) {
      if (isLeftover(entry)) continue;
      for (const ing of byMeal.get(entry.meal_id) || []) {
        if (frozen.has(ing.food_id)) toDefrost.add((ing.foods && ing.foods.name) || 'Something');
      }
    }
    if (toDefrost.size) {
      tomorrowBody.appendChild(el('p', { class: 'today-defrost', text: `Take out of the freezer tonight: ${[...toDefrost].map((n) => everydayName(n).toLowerCase()).join(', ')}.` }));
    }
  }

  /** "Making 4 portions" and a Change button that opens the choices. */
  function portionsLine(entry) {
    const row = el('div', { class: 'today-portions' });
    const words = el('span', { class: 'today-portions-words' });
    const paint = () => { words.textContent = `Making ${portionWords(entryPortions(entry, members))}`; };
    paint();
    const change = el('button', { type: 'button', class: 'btn btn-small today-portions-change', text: 'Change', 'aria-haspopup': 'dialog' });
    change.setAttribute('aria-label', `Change portions of ${(entry.meals && entry.meals.name) || 'this meal'}`);
    change.addEventListener('click', () => openDetailSheet({
      title: 'Portions',
      subtitle: (entry.meals && entry.meals.name) || '',
      returnFocusTo: change,
      build(body, api) {
        body.appendChild(portionsControl(entry, { members, signal: controller.signal, onChange: () => paint() }));
        const done = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Done' });
        done.addEventListener('click', () => api.close());
        body.appendChild(done);
      },
      onClose: () => { paint(); paintNutrition(); }
    }), { signal: controller.signal });
    row.append(words, change);
    return row;
  }

  function paintNext(entry, anyToday = true) {
    nextWrap.replaceChildren();
    if (!entry) {
      const empty = el('section', { class: 'today-next today-next-empty', 'aria-labelledby': 'today-next-h' });
      empty.appendChild(el('h2', { id: 'today-next-h', text: anyToday ? 'Nothing else planned today' : 'Nothing planned today' }));
      empty.appendChild(el('a', { class: 'btn btn-primary', href: '#/plan-this-week?week=this', text: 'Plan a meal' }));
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
    // The photo, once library recipes have one (4 Oct 2026).
    if (meal.library_ref) {
      loadImages().then((images) => {
        const image = images.get(meal.library_ref);
        if (!image || destroyed) return;
        const photo = recipePhoto({ default_slot: entry.slot }, image, 'hero');
        photo.classList.add('today-next-photo');
        card.insertBefore(photo, card.children[1]);
      }).catch(() => {});
    }
    const facts = el('ul', { class: 'today-next-facts' });
    if (isLeftover(entry)) facts.appendChild(el('li', { text: `Leftovers, ${servesFor(entry)}` }));
    for (const tag of meal.dietary_tags || []) facts.appendChild(el('li', { text: tag.replace(/_/g, ' ') }));
    card.appendChild(facts);
    // v10: one line and a Change button, not nine controls on the card.
    if (!isLeftover(entry)) card.appendChild(portionsLine(entry));
    card.appendChild(eatenTick(entry, tickOptions()));
    const buttons = el('div', { class: 'today-next-buttons' });
    buttons.appendChild(el('a', { class: 'btn today-next-open', href: recipeHref(meal), text: 'Open recipe' }));
    const cooked = el('button', { type: 'button', class: 'btn today-next-cooked', text: 'We cooked it', 'aria-haspopup': 'dialog' });
    cooked.addEventListener('click', () => offerDepletion(entry, cooked), { signal: controller.signal });
    if (!isLeftover(entry)) buttons.appendChild(cooked);
    if (leftoversReady() && !isLeftover(entry)) {
      const lo = el('button', { type: 'button', class: 'btn today-next-leftovers', text: 'Plan leftovers', 'aria-haspopup': 'dialog' });
      lo.addEventListener('click', () => openLeftoverSheet({
        entry, entries: weekEntries, weekStart: entry.week_start, returnFocusTo: lo,
        onAdded: () => { if (!destroyed) loadMeals(); }
      }), { signal: controller.signal });
      buttons.appendChild(lo);
    }
    card.appendChild(buttons);
    nextWrap.appendChild(card);
  }

  /**
   * Cooking is the one moment the app knows what left the cupboard. Offer to
   * take it out, show exactly what will change, and never do it silently.
   */
  function tickOptions() {
    return {
      signal: controller.signal, members, entries: weekEntries,
      onChange: () => { paintNutrition(); loadUseSoon(); },
      onLeftovers: () => { if (!destroyed) loadMeals(); }
    };
  }

  async function offerDepletion(entry, returnFocusTo) {
    const meal = entry.meals || {};
    if (wasTaken(entry.id)) {
      const words = `${meal.name || 'It'} has already come out of the pantry.`;
      showToast(words);
      announce(words);
      return;
    }
    const plan = await planForEntry(entry, members);
    if (destroyed) return;
    if (!plan.ok) { showToast('The pantry could not be read. Try again.'); return; }
    const changes = plan.data;
    const afterwards = async () => {
      await setEaten(entry, true);
      if (destroyed) return;
      const box = nextWrap.querySelector('.eaten-tick input');
      if (box) box.checked = true;
      paintNutrition();
      loadUseSoon();
      const spare = sparePortions(entry, members);
      if (spare > 0) openSpareSheet({ entry, spare, entries: weekEntries, returnFocusTo, onLeftovers: () => { if (!destroyed) loadMeals(); } });
    };
    if (changes.length === 0) {
      markTaken(entry);
      const words = `Enjoy ${meal.name || 'it'}. Nothing it uses is tracked in the pantry.`;
      showToast(words);
      announce(words);
      await afterwards();
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
          const done = await takeForEntry(entry, changes);
          if (!done.ok) { yes.disabled = false; showToast('That did not save. Try again.'); return; }
          api.close();
          const words = `Pantry updated: ${done.applied} thing${done.applied === 1 ? '' : 's'}.`;
          showToast(words);
          announce(words);
          await afterwards();
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
        for (const entry of here) {
          const one = el('span', { class: 'today-meal-entry' });
          one.appendChild(el('a', { href: recipeHref(entry.meals), text: `${(entry.meals && entry.meals.name) || 'Planned'}${isLeftover(entry) ? ' (leftovers)' : ''}` }));
          one.appendChild(eatenTick(entry, tickOptions()));
          names.appendChild(one);
        }
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
      btn.appendChild(el('span', { class: 'today-soon-name', text: everydayName(name) }));
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

  // Once a day, after Today has drawn: fill in foods with no nutrition, and
  // redraw the figures if anything changed.
  setTimeout(() => {
    if (destroyed) return;
    repairNutrition().then((result) => {
      if (destroyed || !result || !result.fixed || !result.fixed.length) return;
      paintFixesNote();
      loadMeals();
    }).catch((error) => console.error('Nutrition pass failed:', error));
  }, 2500);

  return () => {
    destroyed = true;
    controller.abort();
  };
}
