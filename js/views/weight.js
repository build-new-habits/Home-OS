// js/views/weight.js — 17 Aug 2026 v1
// Weight tracker. Replaces the Phase 2 stub whole.
//
// Behavioural principle 1 (no shame): every reading is stated as a fact.
// No "best"/"worst", no streaks, no red-for-missed, no praise or scolding.
// A gain and a loss are rendered identically — only the wording differs.
//
// Canonical units: kg in the database, always. The form accepts the user's
// display unit and converts via lib/units.js before any write.

import { createCard } from '../components/card.js';
import { announce, focusHeading } from '../lib/a11y.js';
import { todayIso, formatDateDisplay } from '../lib/dates.js';
import { formatWeight, formatWeightDelta, parseWeightToKg, kgToStoneLb } from '../lib/units.js';
import { getSettings } from '../data/settings.js';
import { listLogs, logWeight, getCurrentTarget, setTarget } from '../data/weight.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

/** Labelled field. The unit is named in the label, not just the placeholder. */
function field(id, labelText, inputProps = {}, hintText = '') {
  const wrap = el('div', { class: 'field' });
  const label = el('label', { for: id, text: labelText });
  const input = el('input', { id, ...inputProps });
  wrap.append(label, input);
  const describedBy = [];
  if (hintText) {
    const hint = el('p', { class: 'field-hint', id: `${id}-hint`, text: hintText });
    wrap.appendChild(hint);
    describedBy.push(`${id}-hint`);
  }
  const err = el('p', { class: 'field-error', id: `${id}-error`, role: 'alert' });
  err.hidden = true;
  wrap.appendChild(err);
  describedBy.push(`${id}-error`);
  input.setAttribute('aria-describedby', describedBy.join(' '));
  return { wrap, input, err };
}

function showError(fieldObj, message) {
  fieldObj.err.textContent = message;
  fieldObj.err.hidden = false;
  fieldObj.input.setAttribute('aria-invalid', 'true');
}

function clearError(fieldObj) {
  fieldObj.err.textContent = '';
  fieldObj.err.hidden = true;
  fieldObj.input.removeAttribute('aria-invalid');
}

/**
 * Inline SVG trend line. The SVG is aria-hidden and the information it
 * carries is repeated in the adjacent text summary and the data table, so
 * nothing is conveyed by the graphic (or by colour) alone — WCAG 1.1.1 /
 * 1.4.1. The line is drawn with an explicit stroke AND point markers so it
 * remains legible in high-contrast and for colour-vision differences.
 */
function buildTrend(logs, unitPref, targetKg) {
  const wrap = el('div', { class: 'trend' });
  if (logs.length < 2) {
    wrap.appendChild(el('p', {
      class: 'trend-empty',
      text: logs.length === 0
        ? 'No weights logged yet. The trend line appears once there are two entries.'
        : 'One weight logged. The trend line appears once there are two entries.'
    }));
    return wrap;
  }

  const W = 320;
  const H = 140;
  const PAD = 8;
  const values = logs.map((l) => Number(l.weight_kg));
  const candidates = targetKg != null ? values.concat([targetKg]) : values;
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  const span = max - min || 1;

  const x = (i) => PAD + (i * (W - PAD * 2)) / (logs.length - 1);
  const y = (v) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'trend-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  if (targetKg != null) {
    const tLine = document.createElementNS(SVG_NS, 'line');
    tLine.setAttribute('x1', PAD);
    tLine.setAttribute('x2', W - PAD);
    tLine.setAttribute('y1', y(targetKg));
    tLine.setAttribute('y2', y(targetKg));
    tLine.setAttribute('class', 'trend-target');
    tLine.setAttribute('stroke-dasharray', '4 3');
    svg.appendChild(tLine);
  }

  const path = document.createElementNS(SVG_NS, 'polyline');
  path.setAttribute('points', values.map((v, i) => `${x(i)},${y(v)}`).join(' '));
  path.setAttribute('class', 'trend-line');
  path.setAttribute('fill', 'none');
  svg.appendChild(path);

  values.forEach((v, i) => {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', x(i));
    dot.setAttribute('cy', y(v));
    dot.setAttribute('r', '3');
    dot.setAttribute('class', 'trend-point');
    svg.appendChild(dot);
  });

  wrap.appendChild(svg);
  return wrap;
}

/** The text that carries the trend's meaning. Plain statements of fact. */
function buildSummary(logs, unitPref, target) {
  const list = el('ul', { class: 'summary-list' });
  if (logs.length === 0) {
    list.appendChild(el('li', { text: 'No weights logged yet.' }));
    return list;
  }
  const latest = logs[logs.length - 1];
  const latestKg = Number(latest.weight_kg);

  list.appendChild(el('li', {
    text: `Latest: ${formatWeight(latestKg, unitPref)} on ${formatDateDisplay(latest.log_date)}.`
  }));

  if (logs.length >= 2) {
    const prevKg = Number(logs[logs.length - 2].weight_kg);
    const delta = latestKg - prevKg;
    const word = delta === 0 ? 'No change' : delta > 0 ? 'Up' : 'Down';
    list.appendChild(el('li', {
      text: delta === 0
        ? `No change since ${formatDateDisplay(logs[logs.length - 2].log_date)}.`
        : `${word} ${formatWeightDelta(delta, unitPref)} since ${formatDateDisplay(logs[logs.length - 2].log_date)}.`
    }));

    const firstKg = Number(logs[0].weight_kg);
    const total = latestKg - firstKg;
    list.appendChild(el('li', {
      text: total === 0
        ? `No change since the first entry on ${formatDateDisplay(logs[0].log_date)}.`
        : `${total > 0 ? 'Up' : 'Down'} ${formatWeightDelta(total, unitPref)} since the first entry on ${formatDateDisplay(logs[0].log_date)}.`
    }));
  }

  if (target && target.target_weight_kg != null) {
    const tKg = Number(target.target_weight_kg);
    const gap = latestKg - tKg;
    const onDate = target.target_date ? ` by ${formatDateDisplay(target.target_date)}` : '';
    list.appendChild(el('li', {
      text: Math.abs(gap) < 0.05
        ? `Target ${formatWeight(tKg, unitPref)}${onDate}: reached.`
        : `Target ${formatWeight(tKg, unitPref)}${onDate}: ${formatWeightDelta(gap, unitPref)} to go.`
    }));
  }
  return list;
}

/** Full history as a real table — the accessible equivalent of the graph. */
function buildTable(logs, unitPref) {
  const table = el('table', { class: 'data-table' });
  const caption = el('caption', { text: 'All logged weights, oldest first' });
  const thead = el('thead', {}, [
    el('tr', {}, [
      el('th', { scope: 'col', text: 'Date' }),
      el('th', { scope: 'col', text: 'Weight' })
    ])
  ]);
  const tbody = el('tbody');
  logs.forEach((l) => {
    tbody.appendChild(el('tr', {}, [
      el('th', { scope: 'row', text: formatDateDisplay(l.log_date) }),
      el('td', { text: formatWeight(Number(l.weight_kg), unitPref) })
    ]));
  });
  table.append(caption, thead, tbody);
  return table;
}

export function render(mountEl) {
  let destroyed = false;
  mountEl.appendChild(el('h1', { text: 'Weight' }));

  const status = el('p', { class: 'view-status', text: 'Loading…' });
  mountEl.appendChild(status);

  const logSection = el('section');
  const trendSection = el('section');
  const targetSection = el('section');
  mountEl.append(logSection, trendSection, targetSection);

  let unitPref = 'stone_lb';
  let logs = [];
  let target = null;

  async function loadAll() {
    const [settingsRes, logsRes, targetRes] = await Promise.all([
      getSettings(), listLogs(), getCurrentTarget()
    ]);
    if (destroyed) return;
    if (settingsRes.ok && settingsRes.data) {
      unitPref = settingsRes.data.weight_unit_display || 'stone_lb';
    }
    if (logsRes.ok) logs = logsRes.data || [];
    if (targetRes.ok) target = targetRes.data;
    status.hidden = true;
    paint();
  }

  function paint() {
    logSection.textContent = '';
    trendSection.textContent = '';
    targetSection.textContent = '';
    buildLogForm();
    buildTrendSection();
    buildTargetForm();
  }

  function buildLogForm() {
    const { article, body, actions } = createCard({ title: 'Log a weight' });
    const inKg = unitPref === 'kg';

    const dateF = field('weight-date', 'Date', { type: 'date', value: todayIso() });
    body.appendChild(dateF.wrap);

    let stoneF = null; let lbF = null; let kgF = null;
    if (inKg) {
      kgF = field('weight-kg', 'Weight in kilograms', {
        type: 'number', step: '0.1', min: '0', inputmode: 'decimal'
      });
      body.appendChild(kgF.wrap);
    } else {
      stoneF = field('weight-stone', 'Weight — stone', {
        type: 'number', step: '1', min: '0', inputmode: 'numeric'
      });
      lbF = field('weight-lb', 'Weight — pounds', {
        type: 'number', step: '0.1', min: '0', inputmode: 'decimal'
      }, 'Leave blank for a whole number of stone.');
      body.append(stoneF.wrap, lbF.wrap);
    }

    const btn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Save weight' });
    btn.addEventListener('click', async () => {
      [kgF, stoneF, lbF].forEach((f) => f && clearError(f));
      const kg = inKg
        ? parseWeightToKg({ kg: kgF.input.value }, 'kg')
        : parseWeightToKg({ stone: stoneF.input.value, lb: lbF.input.value }, 'stone_lb');
      if (kg == null) {
        const t = inKg ? kgF : stoneF;
        showError(t, inKg
          ? 'Enter a weight in kilograms, greater than zero.'
          : 'Enter a weight in stone and pounds, greater than zero.');
        t.input.focus();
        announce('Weight not saved. Check the weight you entered.');
        return;
      }
      if (!dateF.input.value) {
        showError(dateF, 'Choose a date.');
        dateF.input.focus();
        return;
      }
      btn.disabled = true;
      const res = await logWeight(kg, dateF.input.value);
      btn.disabled = false;
      if (destroyed) return;
      if (!res.ok) {
        showError(inKg ? kgF : stoneF, 'Could not save that weight. Try again.');
        announce('Weight not saved.');
        return;
      }
      logs = logs.concat([{ log_date: dateF.input.value, weight_kg: kg }])
        .sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)));
      announce(res.queued
        ? `${formatWeight(kg, unitPref)} saved on this device and will sync when you are back online.`
        : `${formatWeight(kg, unitPref)} logged for ${formatDateDisplay(dateF.input.value)}.`);
      paint();
    });
    actions.appendChild(btn);
    logSection.appendChild(article);
  }

  function buildTrendSection() {
    const { article, body } = createCard({ title: 'Trend' });
    const targetKg = target && target.target_weight_kg != null ? Number(target.target_weight_kg) : null;
    body.appendChild(buildTrend(logs, unitPref, targetKg));
    body.appendChild(buildSummary(logs, unitPref, target));
    if (logs.length > 0) {
      const details = el('details', { class: 'history-details' });
      details.appendChild(el('summary', { text: `All entries (${logs.length})` }));
      details.appendChild(buildTable(logs, unitPref));
      body.appendChild(details);
    }
    trendSection.appendChild(article);
  }

  function buildTargetForm() {
    const { article, body, actions } = createCard({ title: 'Target' });
    const inKg = unitPref === 'kg';
    const hasLogs = logs.length > 0;

    if (target && target.target_weight_kg != null) {
      body.appendChild(el('p', {
        text: `Current target: ${formatWeight(Number(target.target_weight_kg), unitPref)}` +
          (target.target_date ? ` by ${formatDateDisplay(target.target_date)}.` : '.')
      }));
    } else {
      body.appendChild(el('p', { text: 'No target set.' }));
    }

    if (!hasLogs) {
      // Locked decision: weight_kg is NOT NULL, so a target needs a log row
      // to attach to. Stated as a neutral next step, not an error.
      body.appendChild(el('p', {
        class: 'field-hint',
        text: 'Log a weight first to set a target.'
      }));
      targetSection.appendChild(article);
      return;
    }

    let tStone = null; let tLb = null; let tKg = null;
    if (inKg) {
      tKg = field('target-kg', 'Target weight in kilograms', {
        type: 'number', step: '0.1', min: '0', inputmode: 'decimal'
      });
      body.appendChild(tKg.wrap);
    } else {
      tStone = field('target-stone', 'Target weight — stone', {
        type: 'number', step: '1', min: '0', inputmode: 'numeric'
      });
      tLb = field('target-lb', 'Target weight — pounds', {
        type: 'number', step: '0.1', min: '0', inputmode: 'decimal'
      }, 'Leave blank for a whole number of stone.');
      body.append(tStone.wrap, tLb.wrap);
    }
    const tDate = field('target-date', 'Target date (optional)', { type: 'date' });
    body.appendChild(tDate.wrap);

    // Pre-fill from the existing target so it can be adjusted, not retyped.
    if (target && target.target_weight_kg != null) {
      const tk = Number(target.target_weight_kg);
      if (inKg) tKg.input.value = tk.toFixed(1);
      else {
        const { stone, lb } = kgToStoneLb(tk);
        tStone.input.value = String(stone);
        tLb.input.value = String(lb);
      }
      if (target.target_date) tDate.input.value = target.target_date;
    }

    const btn = el('button', { type: 'button', class: 'btn', text: 'Save target' });
    btn.addEventListener('click', async () => {
      [tKg, tStone, tLb].forEach((f) => f && clearError(f));
      const kg = inKg
        ? parseWeightToKg({ kg: tKg.input.value }, 'kg')
        : parseWeightToKg({ stone: tStone.input.value, lb: tLb.input.value }, 'stone_lb');
      if (kg == null) {
        const t = inKg ? tKg : tStone;
        showError(t, 'Enter a target weight greater than zero.');
        t.input.focus();
        return;
      }
      btn.disabled = true;
      const res = await setTarget(kg, tDate.input.value || null);
      btn.disabled = false;
      if (destroyed) return;
      if (!res.ok) {
        showError(inKg ? tKg : tStone,
          res.code === 'no-logs' ? 'Log a weight first to set a target.' : 'Could not save that target. Try again.');
        return;
      }
      target = { target_weight_kg: kg, target_date: tDate.input.value || null };
      announce(res.queued
        ? 'Target saved on this device and will sync when you are back online.'
        : `Target set to ${formatWeight(kg, unitPref)}.`);
      paint();
    });
    actions.appendChild(btn);
    targetSection.appendChild(article);
  }

  focusHeading(mountEl);
  loadAll();

  return () => { destroyed = true; };
}
