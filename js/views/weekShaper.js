// js/views/weekShaper.js — 27 Nov 2026 v1
// Phase 37 (Hearth). Shape my week (#/week-shaper?week=this|next).
//
// Pick a day and a meal, say what is on that day (a match, the gym, a busy
// evening, guests), and either:
//   Show me options   the five best fits, each with its reasons, Plan it
//                     or leave it; Show 5 more pages on
//   You choose for me one meal, mostly from the pantry, with why, and what
//                     you would need; Plan it or Something else
// Your rules sit underneath, set once by tapping.
//
// Rules, not AI (data/weekShaper.js). Nothing is planned without a tap.
// Free sees what Hearth adds here, once, and nothing else.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { createActionBar } from '../components/actionBar.js';
import { loadHearth, isHearth, WHAT_HEARTH_ADDS } from '../data/hearth.js';
import { listPlan, addPlanEntry } from '../data/mealPlan.js';
import { listMeals, listIngredients, groupByMeal } from '../data/meals.js';
import { loadAllRecipes, addLibraryRecipe, addMissingToList } from '../data/recipeLibrary.js';
import { referenceBySlug } from '../data/foodReference.js';
import { listStock, useSoon } from '../data/pantry.js';
import { haveNames, normaliseName } from '../data/recipeCoverage.js';
import { getHousehold } from '../data/household.js';
import { requestListSync } from '../data/listSync.js';
import { foodWeekDays, mondaysOf, inDays } from '../lib/foodWeek.js';
import { loadShape, saveShape } from '../data/weekShape.js';
import {
  prepare, rank, options, chooseOne, describeMissing, describeTally, tally,
  shapesFor, toggleEvent, recentKeysFrom, normaliseRules,
  EVENTS, TIME_CHOICES
} from '../data/weekShaper.js';

const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' }
];

function isoToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function recipeHref(c) {
  if (c.meal && c.meal.id) return `#/recipe?m=${encodeURIComponent(c.meal.id)}`;
  if (c.recipe) return `#/recipe?r=${encodeURIComponent(c.recipe.slug)}`;
  return '#/meals-home';
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const week = /[?&]week=next\b/.test(window.location.hash || '') ? 'next' : 'this';
  const backHref = week === 'next' ? '#/plan-next-week' : '#/plan-this-week?week=this';
  const todayIso = isoToday();
  const allDays = foodWeekDays(new Date(), week === 'next' ? 1 : 0);
  const days = week === 'this' ? allDays.filter((d) => d.iso >= todayIso) : allDays;

  mountEl.appendChild(el('a', { class: 'back-link', href: backHref, text: week === 'next' ? 'Next week' : 'This week' }));
  mountEl.appendChild(el('h1', { text: 'Shape my week' }));
  const status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const body = el('div', { class: 'shaper' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Reading your meals, the library and the pantry…' }));
  mountEl.append(status, body);
  mountEl.appendChild(createActionBar({ label: 'Back to the plan', href: backHref, signal }).element);

  const say = (words) => { status.textContent = words; announce(words); };

  // ---- State ----------------------------------------------------------------
  let rules = normaliseRules({});
  let events = {};
  let entries = [];
  let history = [];
  let candidates = [];
  let members = [];
  let pick = { iso: (days[0] || allDays[0]).iso, slot: 'dinner' };
  let mode = 'options';
  let page = 0;
  const skip = new Set();
  let saveTimer = null;
  let shapesLine = null;

  // ---- Sections, built once, painted many times ------------------------------
  const tallyBox = el('section', { class: 'shaper-section', 'aria-labelledby': 'shaper-tally-h' });
  const whenBox = el('section', { class: 'shaper-section', 'aria-labelledby': 'shaper-when-h' });
  const eventsBox = el('section', { class: 'shaper-section', 'aria-labelledby': 'shaper-events-h' });
  const modeBox = el('div', { class: 'shaper-modes', role: 'group', 'aria-label': 'How to choose' });
  const results = el('section', { class: 'shaper-section shaper-results', 'aria-labelledby': 'shaper-results-h' });
  const rulesBox = el('details', { class: 'shaper-rules' });

  async function load() {
    await loadHearth();
    if (destroyed) return;
    if (!isHearth()) {
      body.replaceChildren(
        el('p', { text: `Shape my week comes with Hearth. ${WHAT_HEARTH_ADDS.weekShaper}` }),
        el('a', { class: 'btn btn-primary', href: '#/hearth', text: 'See Hearth' })
      );
      return;
    }
    if (!days.length) {
      body.replaceChildren(el('p', { text: 'This food week has no days left. Next week is ready to shape.' }),
        el('a', { class: 'btn btn-primary', href: '#/week-shaper?week=next', text: 'Shape next week' }));
      return;
    }

    // This food week, and the two before it for variety.
    const weeks = [allDays, foodWeekDays(new Date(), (week === 'next' ? 1 : 0) - 1), foodWeekDays(new Date(), (week === 'next' ? 1 : 0) - 2)];
    const mondays = [...new Set(weeks.flatMap(mondaysOf))];
    const [reads, mealList, ingredients, library, refMap, stock, household, shape] = await Promise.all([
      Promise.all(mondays.map((m) => listPlan(m).then((r) => (r.ok ? (r.data || []).map((e) => (e.week_start ? e : { ...e, week_start: m })) : [])).catch(() => []))),
      listMeals().catch(() => ({ ok: false })),
      listIngredients().catch(() => ({ ok: false })),
      loadAllRecipes().catch(() => ({ ok: false })),
      referenceBySlug().catch(() => new Map()),
      listStock().catch(() => ({ ok: false })),
      getHousehold().catch(() => null),
      loadShape()
    ]);
    if (destroyed) return;
    const seen = new Set();
    const all = reads.flat().filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
    entries = all.filter((e) => inDays(e, allDays));
    history = all;
    members = household && household.ok ? ((household.data && household.data.members) || []) : [];
    rules = shape.rules;
    events = shape.events;
    const stockRows = stock && stock.ok ? (stock.data || []) : [];
    const haveSet = haveNames(stockRows, new Date().toISOString());
    const soonSet = new Set(useSoon(stockRows).map(({ row }) => normaliseName(row.foods && row.foods.name)));
    candidates = prepare({
      meals: mealList && mealList.ok ? (mealList.data || []) : [],
      recipes: library && library.ok ? (library.data || []) : [],
      ingredientsByMeal: ingredients && ingredients.ok ? groupByMeal(ingredients.data || []) : new Map(),
      referenceMap: refMap instanceof Map ? refMap : new Map(),
      haveSet,
      soonSet
    });
    body.replaceChildren(tallyBox, whenBox, eventsBox, modeBox, results, rulesBox);
    buildWhen();
    buildModes();
    buildRules();
    paintAll();
  }

  function paintAll() {
    paintTally();
    paintEvents();
    paintResults();
  }

  // ---- This week so far -------------------------------------------------------
  function paintTally() {
    tallyBox.replaceChildren(el('h2', { id: 'shaper-tally-h', text: week === 'next' ? 'Next week so far' : 'This week so far' }));
    const ul = el('ul', { class: 'shaper-tally' });
    for (const line of describeTally(tally(entries, candidates), rules)) ul.appendChild(el('li', { text: line }));
    tallyBox.appendChild(ul);
  }

  // ---- Which day, which meal ----------------------------------------------------
  function buildWhen() {
    whenBox.replaceChildren(el('h2', { id: 'shaper-when-h', text: 'Which meal' }));
    const row = el('div', { class: 'shaper-when' });
    const dayWrap = el('div', { class: 'field' });
    dayWrap.appendChild(el('label', { for: 'shaper-day', text: 'Day' }));
    const daySel = el('select', { id: 'shaper-day' });
    for (const d of days) {
      const opt = el('option', { value: d.iso, text: d.iso === todayIso ? `Today (${d.label})` : d.label });
      if (d.iso === pick.iso) opt.selected = true;
      daySel.appendChild(opt);
    }
    dayWrap.appendChild(daySel);
    const slotWrap = el('div', { class: 'field' });
    slotWrap.appendChild(el('label', { for: 'shaper-slot', text: 'Meal' }));
    const slotSel = el('select', { id: 'shaper-slot' });
    for (const s of SLOTS) {
      const opt = el('option', { value: s.value, text: s.label });
      if (s.value === pick.slot) opt.selected = true;
      slotSel.appendChild(opt);
    }
    slotWrap.appendChild(slotSel);
    row.append(dayWrap, slotWrap);
    whenBox.appendChild(row);
    const changed = () => {
      pick = { iso: daySel.value, slot: slotSel.value };
      page = 0;
      skip.clear();
      paintEvents();
      paintResults();
    };
    daySel.addEventListener('change', changed, { signal });
    slotSel.addEventListener('change', changed, { signal });
  }

  function dayLabel(iso) {
    const d = allDays.find((x) => x.iso === iso);
    return d ? (iso === todayIso ? 'today' : d.label) : iso;
  }

  // ---- What is on that day ------------------------------------------------------
  function paintEvents() {
    eventsBox.replaceChildren(el('h2', { id: 'shaper-events-h', text: `What is on ${dayLabel(pick.iso)}` }));
    const chips = el('div', { class: 'shaper-chips', role: 'group', 'aria-label': `Events on ${dayLabel(pick.iso)}` });
    const on = new Set(events[pick.iso] || []);
    for (const ev of EVENTS) {
      const btn = el('button', { type: 'button', class: 'chip-toggle', text: ev.label, 'aria-pressed': String(on.has(ev.value)) });
      btn.addEventListener('click', () => {
        events = toggleEvent(events, pick.iso, ev.value);
        const pressed = (events[pick.iso] || []).includes(ev.value);
        btn.setAttribute('aria-pressed', String(pressed));
        queueSave();
        page = 0;
        skip.clear();
        paintShapes();
        paintResults();
        say(`${ev.label} ${pressed ? 'added to' : 'taken off'} ${dayLabel(pick.iso)}.`);
      }, { signal });
      chips.appendChild(btn);
    }
    eventsBox.appendChild(chips);
    shapesLine = el('p', { class: 'field-hint shaper-shapes' });
    eventsBox.appendChild(shapesLine);
    paintShapes();
  }
  function paintShapes() {
    if (!shapesLine) return;
    const shapes = shapesFor(pick.iso, pick.slot, events);
    shapesLine.textContent = shapes.length
      ? `${shapes.map((s) => s.reason).join('. ')}.`
      : 'A match shapes the dinner the night before; training shapes that day and the next breakfast.';
  }

  // ---- How to choose --------------------------------------------------------------
  let modeButtons = [];
  function buildModes() {
    modeBox.replaceChildren();
    modeButtons = [['options', 'Show me options'], ['chooseForMe', 'You choose for me']].map(([value, label]) => {
      const btn = el('button', { type: 'button', class: 'chip-toggle shaper-mode', text: label, 'aria-pressed': String(mode === value) });
      btn.addEventListener('click', () => {
        mode = value;
        page = 0;
        skip.clear();
        for (const b of modeButtons) b.btn.setAttribute('aria-pressed', String(b.value === mode));
        paintResults();
        say(value === 'options' ? 'Showing five options.' : 'One meal chosen for you.');
      }, { signal });
      modeBox.appendChild(btn);
      return { value, btn };
    });
  }

  function ranked() {
    return rank({
      candidates, date: pick.iso, slot: pick.slot, rules, events, entries, members,
      recentKeys: recentKeysFrom(history, todayIso), mode, skip
    });
  }

  function chipList(reasons) {
    const ul = el('ul', { class: 'shaper-reasons' });
    for (const r of reasons) ul.appendChild(el('li', { text: r }));
    return ul;
  }

  function paintResults() {
    results.replaceChildren();
    const when = `${dayLabel(pick.iso)} ${pick.slot}`;
    const list = ranked();
    if (mode === 'options') {
      results.appendChild(el('h2', { id: 'shaper-results-h', text: `Ideas for ${when}` }));
      const shown = options(list, page);
      if (!shown.length) {
        results.appendChild(el('p', { text: page ? 'That is every idea that fits. Change a rule or the day for more.' : 'Nothing fits every rule for this meal. Try a longer time or turning off Everyone eats.' }));
        if (page) results.appendChild(moreButton('Back to the first five', 0));
        return;
      }
      const ul = el('ul', { class: 'shaper-list' });
      shown.forEach((s) => ul.appendChild(card(s, when)));
      results.appendChild(ul);
      if (list.length > (page + 1) * 5) results.appendChild(moreButton('Show 5 more', page + 1));
      else if (page) results.appendChild(moreButton('Back to the first five', 0));
      return;
    }
    results.appendChild(el('h2', { id: 'shaper-results-h', text: `For ${when}` }));
    const one = chooseOne(list);
    if (!one) {
      results.appendChild(el('p', { text: skip.size ? 'That is every meal that fits. Start again from the best one?' : 'Nothing fits every rule for this meal. Try a longer time or turning off Everyone eats.' }));
      if (skip.size) {
        const again = el('button', { type: 'button', class: 'btn', text: 'Start again' });
        again.addEventListener('click', () => { skip.clear(); paintResults(); }, { signal });
        results.appendChild(again);
      }
      return;
    }
    const box = el('article', { class: 'shaper-card shaper-chosen', 'aria-labelledby': 'shaper-chosen-h' });
    const h = el('h3', { id: 'shaper-chosen-h', class: 'shaper-name' });
    h.appendChild(el('a', { href: recipeHref(one.c), text: one.c.name }));
    box.append(h, chipList(one.reasons));
    box.appendChild(el('p', { class: 'shaper-need', text: describeMissing(one.missing) }));
    const buttons = el('div', { class: 'shaper-buttons' });
    buttons.appendChild(planButton(one, when));
    if (one.missing.length) {
      const n = one.missing.length;
      const add = el('button', { type: 'button', class: 'btn', text: `Add the ${n} to the list` });
      add.addEventListener('click', async () => {
        add.disabled = true;
        const done = await addMissingToList(one.missing.map((i) => ({ ref: i.ref || i.name, name: i.name, quantity: i.quantity, unit: i.unit })));
        if (destroyed) return;
        if (done.ok) { add.textContent = 'On the list'; say(`${done.added} added to the shopping list.`); }
        else { add.disabled = false; showToast('That did not reach the list. Check your connection and try again.'); }
      }, { signal });
      buttons.appendChild(add);
    }
    const other = el('button', { type: 'button', class: 'btn', text: 'Something else' });
    other.addEventListener('click', () => {
      skip.add(one.c.key);
      paintResults();
      const next = chooseOne(ranked());
      say(next ? `Instead: ${next.c.name}.` : 'That is every meal that fits.');
      const focus = results.querySelector('h3 a') || results.querySelector('button');
      if (focus) focus.focus();
    }, { signal });
    buttons.appendChild(other);
    box.appendChild(buttons);
    results.appendChild(box);
  }

  function moreButton(label, toPage) {
    const btn = el('button', { type: 'button', class: 'btn', text: label });
    btn.addEventListener('click', () => {
      page = toPage;
      paintResults();
      say(toPage ? 'Five more ideas.' : 'The first five ideas.');
      const first = results.querySelector('h3 a');
      if (first) first.focus();
    }, { signal });
    return btn;
  }

  function card(s, when) {
    const li = el('li', { class: 'shaper-card' });
    const h = el('h3', { class: 'shaper-name' });
    h.appendChild(el('a', { href: recipeHref(s.c), text: s.c.name }));
    li.append(h, chipList(s.reasons), planButton(s, when));
    return li;
  }

  function planButton(s, when) {
    const btn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Plan it', 'aria-label': `Plan ${s.c.name} for ${when}` });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Planning…';
      let meal = s.c.meal;
      if (!meal && s.c.recipe) {
        const made = await addLibraryRecipe(s.c.recipe);
        if (destroyed) return;
        meal = made.ok ? made.data : (made.existing || null);
      }
      const day = allDays.find((d) => d.iso === pick.iso);
      const result = meal && day
        ? await addPlanEntry({ meal_id: meal.id, day_of_week: day.value, slot: pick.slot, week_start: day.weekStart })
        : { ok: false };
      if (destroyed) return;
      if (!result.ok) {
        btn.disabled = false;
        btn.textContent = 'Plan it';
        showToast('That did not save. Check your connection and try again.');
        return;
      }
      const libraryRef = (s.c.recipe && s.c.recipe.slug) || (meal && meal.library_ref) || null;
      entries = [...entries, { ...result.data, meals: { ...meal, library_ref: libraryRef } }];
      requestListSync();
      skip.clear();
      paintTally();
      paintResults();
      const words = `${s.c.name} planned for ${when}. The shopping list will follow.`;
      say(words);
      showToast(words);
      const head = results.querySelector('h2');
      if (head) { head.setAttribute('tabindex', '-1'); head.focus(); }
    }, { signal });
    return btn;
  }

  // ---- Your rules -----------------------------------------------------------------
  function buildRules() {
    rulesBox.replaceChildren(el('summary', { text: 'Your rules' }));
    const form = el('div', { class: 'shaper-rules-body' });
    form.appendChild(el('p', { class: 'field-hint', text: 'Set once. Everyone at home sees the same rules.' }));

    form.appendChild(checkbox('shaper-rhythm', 'Fish, meat and veggie nights', rules.rhythm, (v) => { rules.rhythm = v; stepRow.hidden = !v; }));
    const stepRow = el('div', { class: 'shaper-steppers' });
    stepRow.hidden = !rules.rhythm;
    stepRow.append(stepper('fish', 'Fish nights a week'), stepper('meat', 'Meat nights a week'));
    stepRow.appendChild(el('p', { class: 'field-hint', text: 'Veggie the rest.' }));
    form.appendChild(stepRow);

    form.appendChild(checkbox('shaper-everyone', 'Everyone eats the same meal', rules.everyone, (v) => { rules.everyone = v; }));
    form.appendChild(select('shaper-weeknights', 'Monday to Thursday dinners', rules.weeknights, (v) => { rules.weeknights = v; }));
    form.appendChild(select('shaper-weekends', 'Friday to Sunday dinners', rules.weekends, (v) => { rules.weekends = v; }));
    form.appendChild(checkbox('shaper-use', 'Use up what needs using first', rules.useItUp, (v) => { rules.useItUp = v; }));
    form.appendChild(checkbox('shaper-variety', 'Something not cooked in the last two weeks', rules.variety, (v) => { rules.variety = v; }));
    if (members.some((m) => (m.dietary_tags || []).includes('nut_free'))) {
      form.appendChild(el('p', { class: 'field-hint', text: 'Nut free is always kept to, whatever these say.' }));
    }
    rulesBox.appendChild(form);
  }

  function ruleChanged() {
    page = 0;
    skip.clear();
    queueSave();
    paintTally();
    paintResults();
  }

  function checkbox(id, label, checked, set) {
    const row = el('div', { class: 'checkbox-row' });
    const box = el('input', { type: 'checkbox', id });
    box.checked = Boolean(checked);
    box.addEventListener('change', () => { set(box.checked); ruleChanged(); }, { signal });
    row.append(box, el('label', { for: id, text: label }));
    return row;
  }

  function select(id, label, value, set) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { for: id, text: label }));
    const sel = el('select', { id });
    for (const t of TIME_CHOICES) {
      const opt = el('option', { value: t.value, text: t.label });
      if (t.value === value) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => { set(sel.value); ruleChanged(); }, { signal });
    wrap.appendChild(sel);
    return wrap;
  }

  function stepper(kind, label) {
    const wrap = el('div', { class: 'shaper-stepper', role: 'group', 'aria-labelledby': `shaper-${kind}-label` });
    wrap.appendChild(el('span', { id: `shaper-${kind}-label`, class: 'shaper-stepper-label', text: label }));
    const less = el('button', { type: 'button', class: 'btn btn-small', text: '−', 'aria-label': `Fewer ${kind} nights` });
    const out = el('output', { class: 'shaper-count', 'aria-live': 'polite', text: String(rules[kind]) });
    const more = el('button', { type: 'button', class: 'btn btn-small', text: '+', 'aria-label': `More ${kind} nights` });
    const change = (delta) => {
      rules = normaliseRules({ ...rules, [kind]: rules[kind] + delta });
      out.textContent = String(rules[kind]);
      ruleChanged();
    };
    less.addEventListener('click', () => change(-1), { signal });
    more.addEventListener('click', () => change(1), { signal });
    wrap.append(less, out, more);
    return wrap;
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const result = await saveShape({ rules, events }, todayIso);
      if (!destroyed && !result.ok) showToast('Saved on this phone. It will reach everyone at home when the connection is back.');
    }, 600);
  }

  load().catch((error) => {
    if (destroyed) return;
    console.error('Week shaper failed:', error);
    body.replaceChildren(el('p', { text: 'Something went wrong reading your week. Try again.' }));
  });

  return () => {
    destroyed = true;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveShape({ rules, events }, todayIso).catch(() => {});
    }
    controller.abort();
  };
}

