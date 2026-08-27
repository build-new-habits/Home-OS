// js/views/dashboard.js — 26 Aug 2026 v2
// v2: the link list no longer mirrors the route table.
//
// v1 generated a link for every route, so the dashboard listed the four
// things already one tap away in the bottom bar and the three now behind
// Health. What belongs here is a judgement, not "everything that exists",
// so the list is declared in navConfig.js.
//
// ---- The water control is not decoration, it is the deal ----
// Putting water behind the Health hub only works if logging stays one tap.
// Without this control, the most frequent action in the app would be
// Dashboard → Health → Water → tap, which is three taps to record a glass
// of water. That is exactly the friction principle 2 exists to prevent, so
// the control ships in the same change that removed the link.
//
// Optimistic, following views/water.js: the count moves on the tap, the
// write happens behind it, and it is only rolled back if the write was
// neither stored NOR queued. The button is never disabled — a dead control
// reads as a crash, and this one gets tapped eight times a day.

import { DASHBOARD_LINKS } from '../navConfig.js';
import { formatDateDisplay, todayIso } from '../lib/dates.js';
import { totalForDate, logWater, GLASS_ML, DAILY_TARGET_ML } from '../data/water.js';
import { formatMl } from '../lib/units.js';
import { announce } from '../lib/a11y.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  children.forEach((child) => node.appendChild(child));
  return node;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  const today = todayIso();
  let total = 0;
  let partial = false;

  mountEl.appendChild(el('h1', { text: 'Dashboard' }));
  mountEl.appendChild(el('p', { class: 'field-hint', text: formatDateDisplay(today) }));

  // ---- Today: water ---------------------------------------------------
  const waterCard = el('section', { class: 'card' });
  waterCard.appendChild(el('h2', { class: 'card-title', text: 'Water' }));

  const waterTotal = el('p', { class: 'water-total', role: 'status' });
  waterTotal.setAttribute('aria-live', 'polite');
  waterCard.appendChild(waterTotal);

  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary btn-block',
    text: `Add a glass (${formatMl(GLASS_ML)})`
  });
  waterCard.appendChild(addBtn);

  const waterError = el('p', { class: 'field-error', role: 'alert' });
  waterError.hidden = true;
  waterCard.appendChild(waterError);

  const waterLink = el('a', { class: 'card-link', href: '#/water', text: 'See the week' });
  waterCard.appendChild(waterLink);
  mountEl.appendChild(waterCard);

  function paintTotal() {
    // Stated as a fact, never as a shortfall to feel bad about
    // (principle 1: no-shame framing). No red, no "you have failed to".
    const base = `${formatMl(total)} today, of ${formatMl(DAILY_TARGET_ML)}`;
    waterTotal.textContent = partial
      ? `${base}. Some of this is saved on this device and will sync when you are back online.`
      : `${base}.`;
    addBtn.setAttribute('aria-label',
      `Add a glass of water, ${formatMl(GLASS_ML)}. ${formatMl(total)} logged today.`);
  }

  addBtn.addEventListener('click', () => {
    waterError.hidden = true;
    total += GLASS_ML;
    paintTotal();
    announce(`Glass logged. ${formatMl(total)} today.`);

    logWater(GLASS_ML, today)
      .then((result) => {
        if (destroyed) return;
        if (!result.ok) {
          // Neither stored nor queued — the only case where the count lies.
          total -= GLASS_ML;
          paintTotal();
          waterError.textContent =
            `That ${formatMl(GLASS_ML)} could not be saved and has not been counted. Tap again to retry.`;
          waterError.hidden = false;
          return;
        }
        if (result.queued) partial = true;
        paintTotal();
      })
      .catch((err) => {
        if (destroyed) return;
        console.error('Unexpected error logging water:', err);
        total -= GLASS_ML;
        paintTotal();
        waterError.textContent =
          `That ${formatMl(GLASS_ML)} could not be saved and has not been counted. Tap again to retry.`;
        waterError.hidden = false;
      });
  }, { signal });

  paintTotal();

  totalForDate(today).then((result) => {
    if (destroyed || !result.ok) return;
    total = result.data.total;
    partial = result.data.partial;
    paintTotal();
  });

  // ---- Everything else ------------------------------------------------
  mountEl.appendChild(el('h2', { text: 'Everything else' }));
  const list = el('ul', { class: 'hub-list' });
  for (const entry of DASHBOARD_LINKS) {
    const item = el('li', { class: 'hub-item' });
    const link = el('a', { class: 'hub-link', href: `#/${entry.path}` });
    const text = el('span', { class: 'hub-text' });
    text.append(
      el('span', { class: 'hub-title', text: entry.title }),
      el('span', { class: 'hub-blurb', text: entry.blurb })
    );
    link.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
    item.appendChild(link);
    list.appendChild(item);
  }
  mountEl.appendChild(list);

  return () => {
    destroyed = true;
    controller.abort();
  };
}
