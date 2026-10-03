// js/views/pantry/start.js — 03 Oct 2026 v1
// Kitchen rebuild. Pantry quick start: tick what you already have.
//
// ---- Why ----
// Persona trace, 3 Oct 2026: "Setting up the pantry the first time is a
// wall." Until the pantry knows about the salt, the rice and the tins, the
// shopping list buys them every week, and nobody types in forty jars one
// at a time. So: one screen of everyday things, ticked in a minute, each
// added as "plenty" (a level, not an amount: nobody knows how many grams
// of flour they have, and the shopping list reads "plenty" as enough).
//
// Anything already in the pantry is shown as already in, not offered again.

import { el } from '../../lib/dom.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
import { listStock, addStock, updateStock, defaultUnitFor, todayIso } from '../../data/pantry.js';
import { foodsForReference } from '../../data/recipeLibrary.js';
import { referenceBySlug } from '../../data/foodReference.js';
import { everydayName } from '../../lib/foodNames.js';

export const STARTER_GROUPS = [
  { title: 'Cupboard', slugs: ['salt', 'black-pepper-ground', 'olive-oil', 'vegetable-oil', 'flour-plain', 'sugar-caster',
    'rice-basmati-dry', 'spaghetti-dry', 'penne-dry', 'chopped-tomatoes-tinned', 'baked-beans', 'stock-cube', 'soy-sauce',
    'honey', 'oats-rolled', 'tomato-ketchup', 'mayonnaise', 'tea-bags', 'coffee-instant'] },
  { title: 'Spices', slugs: ['cumin-ground', 'paprika', 'curry-powder', 'chilli-powder', 'cinnamon-ground', 'dried-oregano'] },
  { title: 'Fridge', slugs: ['egg-medium', 'milk-semi-skimmed', 'butter-block', 'cheddar-cheese'] },
  { title: 'Vegetable rack and bread bin', slugs: ['onion-medium', 'garlic-clove', 'potato-medium', 'carrot-medium', 'lemon', 'bread-white-sliced-loaf'] }
];

const PLACE = { Cupboard: 'Cupboard', Spices: 'Spice rack', Fridge: 'Fridge', 'Vegetable rack and bread bin': 'Cupboard' };

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Starter slugs whose food is already in the pantry (matched by name). Pure. */
export function alreadyIn(stock = [], refMap = new Map()) {
  const names = new Set(stock.map((r) => normalise(r.foods && r.foods.name)));
  const out = new Set();
  for (const group of STARTER_GROUPS) {
    for (const slug of group.slugs) {
      const entry = refMap.get(slug);
      // "Oats, rolled" is also "rolled oats", which is how people name it.
      const turned = entry && entry.name.includes(',')
        ? entry.name.split(',').map((p) => p.trim()).reverse().join(' ') : null;
      const candidates = [entry && entry.name, turned, ...((entry && entry.aliases) || [])].map(normalise);
      if (candidates.some((n) => n && names.has(n))) out.add(slug);
    }
  }
  return out;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('a', { class: 'back-link', href: '#/pantry', text: 'Pantry' }));
  mountEl.appendChild(el('h1', { text: 'What do you already have?' }));
  mountEl.appendChild(el('p', { class: 'field-hint', text: 'Tick the everyday things in your kitchen now. They go into the pantry as "plenty", so the shopping list stops adding them. No amounts needed.' }));
  const body = el('div', { class: 'pantry-start' });
  body.appendChild(el('p', { class: 'field-hint', text: 'Getting the list ready…' }));
  mountEl.appendChild(body);

  (async () => {
    const [refMap, stock] = await Promise.all([referenceBySlug().catch(() => new Map()), listStock()]);
    if (destroyed) return;
    body.replaceChildren();
    const have = alreadyIn(stock.ok ? stock.data || [] : [], refMap);
    const boxes = [];

    for (const [g, group] of STARTER_GROUPS.entries()) {
      const set = el('fieldset', { class: 'pantry-start-group' });
      set.appendChild(el('legend', { text: group.title }));
      const allId = `start-all-${g}`;
      const all = el('button', { type: 'button', class: 'btn btn-small btn-quiet', id: allId, text: `Tick all of these` });
      set.appendChild(all);
      const grid = el('div', { class: 'pantry-start-grid' });
      const groupBoxes = [];
      for (const slug of group.slugs) {
        const entry = refMap.get(slug);
        if (!entry) continue;
        const id = `start-${slug}`;
        const row = el('div', { class: 'checkbox-row' });
        if (have.has(slug)) {
          row.appendChild(el('span', { class: 'pantry-start-have', text: `${everydayName(entry.name)}: already in` }));
        } else {
          const box = el('input', { type: 'checkbox', id, value: slug });
          box.dataset.place = PLACE[group.title] || 'Cupboard';
          row.append(box, el('label', { for: id, text: everydayName(entry.name) }));
          boxes.push(box);
          groupBoxes.push(box);
          box.addEventListener('change', paintCount, { signal });
        }
        grid.appendChild(row);
      }
      all.hidden = groupBoxes.length === 0;
      all.addEventListener('click', () => {
        const allOn = groupBoxes.every((b) => b.checked);
        for (const b of groupBoxes) b.checked = !allOn;
        paintCount();
        announce(allOn ? `${group.title}: unticked.` : `${group.title}: all ticked.`);
      }, { signal });
      set.appendChild(grid);
      body.appendChild(set);
    }

    const go = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Add to the pantry' });
    const status = el('p', { class: 'field-hint', role: 'status' });
    body.append(go, status);

    function paintCount() {
      const n = boxes.filter((b) => b.checked).length;
      go.textContent = n ? `Add ${n} to the pantry` : 'Add to the pantry';
    }
    paintCount();

    go.addEventListener('click', async () => {
      const chosen = boxes.filter((b) => b.checked);
      if (!chosen.length) { status.textContent = 'Tick at least one thing first.'; return; }
      go.disabled = true;
      status.textContent = 'Adding…';
      const foods = await foodsForReference(chosen.map((b) => b.value));
      if (destroyed) return;
      if (!foods.ok) {
        go.disabled = false;
        status.textContent = 'That did not save. Check your connection and try again.';
        return;
      }
      let added = 0;
      for (const box of chosen) {
        const food = foods.data.get(box.value);
        if (!food) continue;
        const row = await addStock({
          food_id: food.id,
          unit: defaultUnitFor(food.category),
          default_location: box.dataset.place,
          last_restocked: todayIso()
        });
        if (row.ok) {
          await updateStock(row.data.id, { level: 'plenty' });
          added += 1;
        }
        if (destroyed) return;
      }
      const words = added === chosen.length
        ? `${added} added to the pantry.`
        : `${added} of ${chosen.length} added. Try again for the rest.`;
      showToast(words);
      announce(words);
      window.location.hash = '#/pantry';
    }, { signal });
  })().catch((error) => {
    console.error('Pantry quick start failed:', error);
    if (!destroyed) body.replaceChildren(el('p', { text: 'Something went wrong. Check your connection and try again.' }));
  });

  return () => { destroyed = true; controller.abort(); };
}
