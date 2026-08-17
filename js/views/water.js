// js/views/water.js — 17 Aug 2026 v1
// Water tracker. Replaces the Phase 2 stub whole.
//
// Behavioural principle 2 (friction): logging a glass is ONE tap from the
// screen — no form, no confirm step, no date picker in the way. The custom
// amount lives behind an expander so the common case stays a single button.
// Principle 1 (no shame): the total is a plain "X of Y" fact. Being under
// target is not styled as a failure, and there is no streak.

import { createCard } from '../components/card.js';
import { announce, focusHeading } from '../lib/a11y.js';
import { todayIso, formatDateDisplay } from '../lib/dates.js';
import { formatMl } from '../lib/units.js';
import {
  logWater, totalForDate, listForDate, GLASS_ML, DAILY_TARGET_ML
} from '../data/water.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

export function render(mountEl) {
  let destroyed = false;
  const today = todayIso();
  let total = 0;
  let partial = false;

  mountEl.appendChild(el('h1', { text: 'Water' }));

  const { article, body, actions } = createCard({ title: `Today — ${formatDateDisplay(today)}` });

  // The running total. aria-live="polite" so the figure is announced when
  // it changes, without the user having to go looking for it.
  const totalEl = el('p', {
    class: 'water-total',
    id: 'water-total',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  body.appendChild(totalEl);

  // Progress conveyed as text AND a bar. The bar is aria-hidden because the
  // same information is already in the text above it — WCAG 1.4.1, nothing
  // by colour or graphic alone.
  const barWrap = el('div', { class: 'water-bar', 'aria-hidden': 'true' });
  const barFill = el('div', { class: 'water-bar-fill' });
  barWrap.appendChild(barFill);
  body.appendChild(barWrap);

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  body.appendChild(offlineNote);

  function paintTotal() {
    const glasses = Math.round((total / GLASS_ML) * 10) / 10;
    totalEl.textContent =
      `${formatMl(total)} of ${formatMl(DAILY_TARGET_ML)} today — ${glasses} ${glasses === 1 ? 'glass' : 'glasses'}.`;
    const pct = Math.max(0, Math.min(100, (total / DAILY_TARGET_ML) * 100));
    barFill.style.width = `${pct}%`;
    offlineNote.hidden = !partial;
    if (partial) {
      offlineNote.textContent = 'Showing what is saved on this device. It will sync when you are back online.';
    }
  }

  // ---- One-tap glass ----
  const glassBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary btn-block water-tap',
    text: `Log a glass (${GLASS_ML} ml)`
  });
  glassBtn.setAttribute('aria-label', `Log a glass of water, ${GLASS_ML} millilitres`);

  async function addWater(ml, sourceLabel) {
    glassBtn.disabled = true;
    const res = await logWater(ml, today);
    glassBtn.disabled = false;
    if (destroyed) return;
    if (!res.ok) {
      announce('That did not save. Try again.');
      return;
    }
    total += ml;
    partial = partial || !!res.queued;
    paintTotal();
    announce(res.queued
      ? `${formatMl(ml)} logged on this device, ${formatMl(total)} of ${formatMl(DAILY_TARGET_ML)} today. It will sync when you are back online.`
      : `${formatMl(ml)} logged, ${formatMl(total)} of ${formatMl(DAILY_TARGET_ML)} today.`);
  }

  glassBtn.addEventListener('click', () => addWater(GLASS_ML, 'glass'));
  actions.appendChild(glassBtn);

  // ---- Custom amount, behind an expander ----
  const details = el('details', { class: 'custom-amount' });
  details.appendChild(el('summary', { text: 'Log a different amount' }));

  const fieldWrap = el('div', { class: 'field' });
  const customInput = el('input', {
    id: 'water-custom',
    type: 'number',
    min: '1',
    step: '10',
    inputmode: 'numeric',
    'aria-describedby': 'water-custom-hint water-custom-error'
  });
  fieldWrap.append(
    el('label', { for: 'water-custom', text: 'Amount in millilitres' }),
    customInput,
    el('p', { class: 'field-hint', id: 'water-custom-hint', text: `A glass is ${GLASS_ML} ml.` })
  );
  const customErr = el('p', { class: 'field-error', id: 'water-custom-error', role: 'alert' });
  customErr.hidden = true;
  fieldWrap.appendChild(customErr);

  const customBtn = el('button', { type: 'button', class: 'btn', text: 'Log this amount' });
  customBtn.addEventListener('click', async () => {
    const ml = Number(customInput.value);
    if (!Number.isFinite(ml) || ml <= 0) {
      customErr.textContent = 'Enter an amount in millilitres, greater than zero.';
      customErr.hidden = false;
      customInput.setAttribute('aria-invalid', 'true');
      customInput.focus();
      return;
    }
    customErr.hidden = true;
    customInput.removeAttribute('aria-invalid');
    await addWater(Math.round(ml), 'custom');
    customInput.value = '';
  });

  details.append(fieldWrap, customBtn);
  body.appendChild(details);
  mountEl.appendChild(article);

  // ---- Today's entries ----
  const listSection = el('section');
  mountEl.appendChild(listSection);

  function paintList(rows) {
    listSection.textContent = '';
    if (!rows || rows.length === 0) return;
    const { article: lArt, body: lBody } = createCard({ title: "Today's entries" });
    const ul = el('ul', { class: 'card-list' });
    rows.forEach((r) => ul.appendChild(el('li', { text: formatMl(Number(r.ml_logged)) })));
    lBody.appendChild(ul);
    listSection.appendChild(lArt);
  }

  async function load() {
    const totals = await totalForDate(today);
    if (destroyed) return;
    if (totals.ok && totals.data) {
      total = totals.data.total;
      partial = totals.data.partial;
    }
    paintTotal();
    const rows = await listForDate(today);
    if (destroyed) return;
    if (rows.ok) paintList(rows.data);
  }

  paintTotal();
  focusHeading(mountEl);
  load();

  return () => { destroyed = true; };
}
