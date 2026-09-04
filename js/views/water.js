// js/views/water.js — 01 Sep 2026 v3
// v3: logging is OPTIMISTIC. v2 still awaited the network before moving the
// total, so a tap with no connection showed 'Saving…' with the button
// disabled until the request resolved — meaning you could log one glass
// offline and then were stuck. That fails the one-tap premise exactly when
// it matters most.
//
// Now the tap is counted immediately and the write happens behind it. This
// is safe because the offline queue already guarantees durability: the only
// question was ever whether the UI should wait, and it should not. If the
// write ultimately fails outright the count is rolled back and said so
// plainly — a silently wrong total would be worse than a visible failure.
//
// v2: failures are now VISIBLE. v1 reported them only through announce(),
// which writes to a visually-hidden live region — a sighted user saw the
// total simply not move, with no indication why. Smoke test found exactly
// that. Also shows a pending state while the write is in flight, so a slow
// network reads as 'working' rather than 'broken'.
// Water tracker. Replaces the Phase 2 stub whole.
//
// Behavioural principle 2 (friction): logging a glass is ONE tap from the
// screen — no form, no confirm step, no date picker in the way. The custom
// amount lives behind an expander so the common case stays a single button.
// Principle 1 (no shame): the total is a plain "X of Y" fact. Being under
// target is not styled as a failure, and there is no streak.

import { createCard } from '../components/card.js';
import { announce } from '../lib/a11y.js';
import { todayIso, formatDateDisplay } from '../lib/dates.js';
import { formatMl } from '../lib/units.js';
import { pageHeading } from '../lib/icons.js';
import {
  logWater, totalForDate, listForDate, GLASS_ML, DAILY_TARGET_ML
} from '../data/water.js';

// NOT the shared el() from lib/dom.js. This one has no null/undefined
// guard. Harmless here, but not provably equivalent, so it was left alone
// in Phase 29 rather than unified — see lib/dom.js.
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
  let inFlight = 0;   // writes still settling; suppresses reconciliation races

  mountEl.appendChild(pageHeading('Water', 'water'));

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

  // Visible failure surface. role="status" rather than "alert": a queued
  // write is not an emergency, and the wording stays neutral either way.
  const errorNote = el('p', { class: 'field-error' });
  errorNote.setAttribute('role', 'status');
  errorNote.hidden = true;
  body.appendChild(errorNote);

  function showError(message) {
    errorNote.textContent = message;
    errorNote.hidden = false;
    announce(message);
  }
  function clearError() {
    errorNote.hidden = true;
    errorNote.textContent = '';
  }

  function paintTotal() {
    const glasses = Math.round((total / GLASS_ML) * 10) / 10;
    totalEl.textContent =
      `${formatMl(total)} of ${formatMl(DAILY_TARGET_ML)} today — ${glasses} ${glasses === 1 ? 'glass' : 'glasses'}.`;
    const pct = Math.max(0, Math.min(100, (total / DAILY_TARGET_ML) * 100));
    barFill.style.width = `${pct}%`;
    offlineNote.hidden = !partial;
    if (partial) {
      // Wording matters: the total IS correct, it just is not uploaded yet.
      // "showing what is saved on this device" would imply something is
      // missing from the number, which would read as a fault.
      offlineNote.textContent = 'Some of today\'s total is saved on this device only. It will upload when you are back online.';
    }
  }

  // ---- One-tap glass ----
  // Worklist A2. Eileen: "the rest looks like it was built for somebody
  // younger and busier than me." The kitchen screens carry shape as well as
  // words; these three carried words only.
  const glassBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary btn-block water-tap',
    text: `Log a glass (${GLASS_ML} ml)`
  });
  glassBtn.setAttribute('aria-label', `Log a glass of water, ${GLASS_ML} millilitres`);

  function addWater(ml) {
    clearError();

    // Count it now. The button is never disabled, so repeated taps all land.
    total += ml;
    inFlight += 1;
    paintTotal();
    announce(`${formatMl(ml)} logged, ${formatMl(total)} of ${formatMl(DAILY_TARGET_ML)} today.`);

    // Sync behind the UI. Deliberately not awaited.
    logWater(ml, today)
      .then((res) => {
        inFlight -= 1;
        if (destroyed) return;
        if (!res.ok) {
          // Neither stored nor queued — the only case where the count is wrong.
          total -= ml;
          paintTotal();
          showError(`That ${formatMl(ml)} could not be saved and has not been counted. Tap again to retry.`);
          return;
        }
        if (res.queued) partial = true;
        paintTotal();
      })
      .catch((err) => {
        inFlight -= 1;
        if (destroyed) return;
        console.error('Unexpected error logging water:', err);
        total -= ml;
        paintTotal();
        showError(`That ${formatMl(ml)} could not be saved and has not been counted. Tap again to retry.`);
      });
  }

  glassBtn.addEventListener('click', () => addWater(GLASS_ML));
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
    addWater(Math.round(ml));
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
    // Only adopt the server figure when nothing is still settling, otherwise
    // a slow read could overwrite a tap the user has already seen counted.
    if (totals.ok && totals.data && inFlight === 0) {
      total = totals.data.total;
      partial = totals.data.partial;
    }
    paintTotal();
    const rows = await listForDate(today);
    if (destroyed) return;
    if (rows.ok) paintList(rows.data);
  }

  // Reconnection: data/water.js flushes the queue on the same event, so wait
  // a moment for that to settle before re-reading, otherwise the totals come
  // back mid-flush and the 'will sync' note lingers after it has synced.
  let reconcileTimer = null;
  function onOnline() {
    clearTimeout(reconcileTimer);
    reconcileTimer = setTimeout(() => {
      if (!destroyed) load();
    }, 1200);
  }
  window.addEventListener('online', onOnline);

  paintTotal();
  load();

  return () => {
    destroyed = true;
    clearTimeout(reconcileTimer);
    window.removeEventListener('online', onOnline);
  };
}
