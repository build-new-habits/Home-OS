// js/views/shopFavourites.js — 27 Nov 2026 v1
// Phase 36b (Hearth). "Favourites and regulars" (#/shop-favourites).
//
// Three things on one page, each in its own section with its own heading:
//   Your favourites   one tap onto the list; each can be a regular
//                     (every week, fortnight or month, with an amount)
//   Add favourites    from what is on the list now and what is in the pantry
//   Your weekly list  build it for me on [day] at [time] (Graeme: Thursday
//                     evening, for Friday click and collect), or now
//
// Free sees what Hearth adds here, once, and nothing else.

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { createActionBar } from '../components/actionBar.js';
import { listItems } from '../data/shopping.js';
import { listStock } from '../data/pantry.js';
import { loadHearth, isHearth, WHAT_HEARTH_ADDS } from '../data/hearth.js';
import {
  listFavourites, addFavourite, removeFavourite, setRegular, addFavouriteToList,
  EVERY, DAYS, readBuild, saveBuild, runWeeklyBuild
} from '../data/favourites.js';

const UNITS = ['item', 'g', 'kg', 'ml', 'l'];

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/shopping', text: 'Shopping list' }));
  mountEl.appendChild(el('h1', { text: 'Favourites and regulars' }));
  const status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const body = el('div', { class: 'favs' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Getting your favourites…' }));
  mountEl.append(status, body);
  mountEl.appendChild(createActionBar({ label: 'Back to the list', href: '#/shopping', signal }).element);

  const say = (words) => { status.textContent = words; announce(words); };

  async function load() {
    await loadHearth();
    if (destroyed) return;
    if (!isHearth()) {
      body.replaceChildren(
        el('p', { text: `Favourites, regulars and a list built for you each week come with Hearth. ${WHAT_HEARTH_ADDS.pantry}` }),
        el('a', { class: 'btn btn-primary', href: '#/hearth', text: 'See Hearth' })
      );
      return;
    }
    const [favs, list, stock] = await Promise.all([listFavourites(), listItems(), listStock()]);
    if (destroyed) return;
    body.replaceChildren();
    if (!favs.ok) {
      body.appendChild(el('p', {
        text: favs.missing
          ? 'Favourites are not set up in the database yet. Migration 029 switches them on.'
          : 'Your favourites could not be loaded. Check your connection and try again.'
      }));
      body.appendChild(weeklySection());
      return;
    }
    const items = list.ok ? list.data : [];
    body.append(favouritesSection(favs.data, items), addSection(favs.data, items, stock.ok ? stock.data : []), weeklySection());
  }

  // ---- Your favourites ---------------------------------------------------------
  function favouritesSection(favs, items) {
    const section = el('section', { class: 'favs-section', 'aria-labelledby': 'favs-mine-h' });
    section.appendChild(el('h2', { id: 'favs-mine-h', text: 'Your favourites' }));
    if (!favs.length) {
      section.appendChild(el('p', { class: 'field-hint', text: 'Nothing here yet. Add some from your list or your pantry below.' }));
      return section;
    }
    const ul = el('ul', { class: 'favs-list' });
    for (const fav of favs) {
      const name = (fav.foods && fav.foods.name) || 'Something';
      const li = el('li', { class: 'favs-item' });
      li.appendChild(el('h3', { class: 'favs-name', text: name }));

      const row = el('div', { class: 'favs-controls' });
      const everyId = `fav-every-${fav.id}`;
      const every = el('select', { id: everyId });
      for (const o of EVERY) {
        const opt = el('option', { value: o.value, text: o.label });
        if ((fav.every || '') === o.value) opt.selected = true;
        every.appendChild(opt);
      }
      const qtyId = `fav-qty-${fav.id}`;
      const qty = el('input', { type: 'number', id: qtyId, min: '0.1', step: 'any', inputmode: 'decimal', value: String(fav.qty || 1) });
      const unitId = `fav-unit-${fav.id}`;
      const unit = el('select', { id: unitId });
      for (const u of UNITS) {
        const opt = el('option', { value: u, text: u === 'item' ? 'items' : u });
        if ((fav.unit || 'item') === u) opt.selected = true;
        unit.appendChild(opt);
      }
      const amount = el('div', { class: 'favs-amount' });
      amount.append(
        el('label', { for: qtyId, text: 'How many' }), qty,
        el('label', { for: unitId, class: 'visually-hidden', text: 'Unit' }), unit
      );
      const showAmount = () => { amount.hidden = !every.value; };
      showAmount();
      const saveRegular = async () => {
        const result = await setRegular(fav.id, { every: every.value, qty: qty.value, unit: unit.value });
        if (destroyed) return;
        if (!result.ok) { say(`${name} did not save. Try again.`); return; }
        say(every.value ? `${name}: ${EVERY.find((o) => o.value === every.value).label.toLowerCase()}.` : `${name}: only when you tap it.`);
      };
      every.addEventListener('change', () => { showAmount(); saveRegular(); }, { signal });
      qty.addEventListener('change', saveRegular, { signal });
      unit.addEventListener('change', saveRegular, { signal });
      const everyWrap = el('div', { class: 'field' });
      everyWrap.append(el('label', { for: everyId, text: 'Goes on the list' }), every);
      row.append(everyWrap, amount);
      li.appendChild(row);

      const buttons = el('div', { class: 'favs-buttons' });
      const onList = items.some((i) => i.food_id === fav.food_id && i.status === 'needed');
      const add = el('button', {
        type: 'button', class: 'btn', text: onList ? 'On the list' : 'Add to list',
        'aria-label': onList ? `${name} is on the list` : `Add ${name} to the list`
      });
      add.disabled = onList;
      add.addEventListener('click', async () => {
        add.disabled = true;
        const result = await addFavouriteToList(fav, items);
        if (destroyed) return;
        if (!result.ok) { add.disabled = false; say(`${name} did not go on the list. Try again.`); return; }
        add.textContent = 'On the list';
        add.setAttribute('aria-label', `${name} is on the list`);
        say(`${name} is on the list.`);
      }, { signal });
      const remove = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Remove', 'aria-label': `Remove ${name} from favourites` });
      remove.addEventListener('click', async () => {
        const result = await removeFavourite(fav.id);
        if (destroyed) return;
        if (!result.ok) { say(`${name} is still a favourite. Try again.`); return; }
        showToast(`${name} is no longer a favourite.`);
        load();
      }, { signal });
      buttons.append(add, remove);
      li.appendChild(buttons);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    return section;
  }

  // ---- Add favourites -------------------------------------------------------------
  function addSection(favs, items, stock) {
    const have = new Set(favs.map((f) => f.food_id));
    const seen = new Set();
    const candidates = [];
    for (const row of [...items, ...stock]) {
      const food = row.foods;
      if (!food || !row.food_id || have.has(row.food_id) || seen.has(row.food_id)) continue;
      seen.add(row.food_id);
      candidates.push({ id: row.food_id, name: food.name });
    }
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    const section = el('section', { class: 'favs-section', 'aria-labelledby': 'favs-add-h' });
    section.appendChild(el('h2', { id: 'favs-add-h', text: 'Add favourites' }));
    if (!candidates.length) {
      section.appendChild(el('p', { class: 'field-hint', text: 'Things on your list and in your pantry appear here to choose from.' }));
      return section;
    }
    section.appendChild(el('p', { class: 'field-hint', text: 'From your list and your pantry.' }));
    const ul = el('ul', { class: 'favs-pick' });
    for (const c of candidates) {
      const li = el('li');
      const star = el('button', { type: 'button', class: 'btn favs-star', text: `☆ ${c.name}`, 'aria-label': `Add ${c.name} to favourites` });
      star.addEventListener('click', async () => {
        star.disabled = true;
        const result = await addFavourite(c.id);
        if (destroyed) return;
        if (!result.ok) {
          star.disabled = false;
          say(result.missing ? 'Favourites need migration 029 first.' : `${c.name} did not save. Try again.`);
          return;
        }
        showToast(`${c.name} is a favourite.`);
        load();
      }, { signal });
      li.appendChild(star);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    return section;
  }

  // ---- Your weekly list ----------------------------------------------------------
  function weeklySection() {
    const setting = readBuild();
    const section = el('section', { class: 'favs-section', 'aria-labelledby': 'favs-week-h' });
    section.appendChild(el('h2', { id: 'favs-week-h', text: 'Your weekly list' }));
    section.appendChild(el('p', {
      class: 'field-hint',
      text: 'Built from your plan, with your regulars, the first time you open the list after this time. Nothing goes on twice.'
    }));
    const onWrap = el('div', { class: 'checkbox-row' });
    const on = el('input', { type: 'checkbox', id: 'week-build-on' });
    on.checked = setting.on;
    onWrap.append(on, el('label', { for: 'week-build-on', text: 'Build my list each week' }));
    const when = el('div', { class: 'favs-when' });
    const day = el('select', { id: 'week-build-day' });
    DAYS.forEach((d, i) => {
      const opt = el('option', { value: String(i), text: d });
      if (i === setting.day) opt.selected = true;
      day.appendChild(opt);
    });
    const time = el('input', { type: 'time', id: 'week-build-time', value: setting.time });
    const dayField = el('div', { class: 'field' });
    dayField.append(el('label', { for: 'week-build-day', text: 'Day' }), day);
    const timeField = el('div', { class: 'field' });
    timeField.append(el('label', { for: 'week-build-time', text: 'Time' }), time);
    when.append(dayField, timeField);
    const save = () => {
      saveBuild({ ...readBuild(), on: on.checked, day: Number(day.value), time: time.value || '19:00' });
      say(on.checked ? `Your list will be built on ${DAYS[Number(day.value)]}s at ${time.value || '19:00'}.` : 'Your list will not be built by itself.');
    };
    for (const control of [on, day, time]) control.addEventListener('change', save, { signal });
    const now = el('button', { type: 'button', class: 'btn', text: 'Build it now' });
    now.addEventListener('click', async () => {
      now.disabled = true;
      now.textContent = 'Building your list…';
      const result = await runWeeklyBuild();
      if (destroyed) return;
      now.disabled = false;
      now.textContent = 'Build it now';
      const words = !result.ok
        ? 'The plan could not be read. Check your connection and try again.'
        : `${result.fromPlan} from your plan and ${result.regulars.length} regular${result.regulars.length === 1 ? '' : 's'} on the list.`;
      say(words);
      showToast(words);
    }, { signal });
    section.append(onWrap, when, now);
    return section;
  }

  load().catch((err) => {
    console.error('Favourites:', err);
    if (!destroyed) body.replaceChildren(el('p', { text: 'Your favourites could not be loaded. Try again.' }));
  });

  return () => { destroyed = true; controller.abort(); };
}
