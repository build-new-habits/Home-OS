// js/views/health.js — 01 Sep 2026 v2
// A hub, not a screen full of controls.
//
// Exercises, weight and water occupied three of the four bottom-bar slots
// for what is one subject, leaving no room for the calendar. They sit
// behind this page now.
//
// ---- A hub must earn its tap ----
// A page of three links is worse than three links in the bar. So each card
// carries the one fact you would have opened the page to find — today's
// water, the last weigh-in, whether the exercises are done — and the tap is
// for acting on it, not discovering it.
//
// Nothing here is a logging control. Logging stays one tap from the
// dashboard, which is the whole reason this consolidation is affordable.

import { HEALTH_PAGES } from '../navConfig.js';
import { totalForDate, DAILY_TARGET_ML } from '../data/water.js';
import { listLogs } from '../data/weight.js';
import { listCleared, getLogsForDate } from '../data/exercises.js';
import { formatMl, formatWeight } from '../lib/units.js';
import { getState } from '../lib/store.js';

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function render(mountEl) {
  const controller = new AbortController();
  let destroyed = false;

  mountEl.appendChild(el('h1', { text: 'Health' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Exercises, weight and water. Logging stays one tap from the dashboard — '
      + 'this is for looking back.'
  }));

  const list = el('ul', { class: 'hub-list' });
  const statusById = new Map();

  for (const page of HEALTH_PAGES) {
    const item = el('li', { class: 'hub-item' });
    const link = el('a', { class: 'hub-link', href: `#/${page.path}` });

    const text = el('span', { class: 'hub-text' });
    text.appendChild(el('span', { class: 'hub-title', text: page.title }));
    text.appendChild(el('span', { class: 'hub-blurb', text: page.blurb }));

    // Filled in once the numbers arrive. Never left as a spinner that stays
    // forever if a request fails — the blurb above is the fallback.
    const status = el('span', { class: 'hub-status' });
    text.appendChild(status);
    statusById.set(page.path, { status, link, title: page.title });

    const chevron = el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' });
    link.append(text, chevron);
    item.appendChild(link);
    list.appendChild(item);
  }
  mountEl.appendChild(list);

  /** The accessible name carries the status too, or it is invisible to a
   *  screen reader that reads links out of context. */
  function setStatus(path, text) {
    const entry = statusById.get(path);
    if (!entry || !text) return;
    entry.status.textContent = text;
    entry.link.setAttribute('aria-label', `${entry.title}. ${text}`);
  }

  async function loadWater() {
    const result = await totalForDate(todayIso());
    if (destroyed || !result.ok) return;
    const ml = Number(result.data) || 0;
    // Phase 28. "Nothing logged today" tells you the page is empty, which
    // you find out by opening it. This says what the page is for.
    setStatus('water', ml === 0
      ? `Tap to log a glass — ${formatMl(DAILY_TARGET_ML)} is a normal day`
      : `${formatMl(ml)} of ${formatMl(DAILY_TARGET_ML)} today`);
  }

  async function loadWeight() {
    const result = await listLogs();
    if (destroyed || !result.ok) return;
    const rows = result.data || [];
    if (rows.length === 0) {
      setStatus('weight', 'Log a weight and the trend appears here');
      return;
    }
    // listLogs orders by date; take the most recent whichever way round.
    const latest = rows.reduce((a, b) => (a.log_date > b.log_date ? a : b));
    const unit = (getState().settings || {}).weight_unit_display || 'stone_lb';
    setStatus('weight', `Last weigh-in ${formatWeight(latest.weight_kg, unit)} on ${latest.log_date}`);
  }

  async function loadExercises() {
    const [all, logs] = await Promise.all([listCleared(), getLogsForDate(todayIso())]);
    if (destroyed || !all.ok) return;
    // listCleared already filters to cleared exercises — filtering again here
    // would silently return nothing if that contract ever changed shape.
    const cleared = all.data || [];
    if (cleared.length === 0) {
      setStatus('exercises', 'Add the exercises your physio has cleared');
      return;
    }
    const doneToday = logs.ok
      ? new Set((logs.data || []).filter((l) => l.completed).map((l) => l.exercise_id)).size
      : 0;
    setStatus('exercises', `${doneToday} of ${cleared.length} done today`);
  }

  Promise.allSettled([loadWater(), loadWeight(), loadExercises()]).then((results) => {
    for (const result of results) {
      // A hub that silently shows nothing is indistinguishable from a hub
      // with nothing to show, so failures are logged rather than swallowed.
      if (result.status === 'rejected') console.error('Health hub summary failed:', result.reason);
    }
  });

  return () => {
    destroyed = true;
    controller.abort();
  };
}
