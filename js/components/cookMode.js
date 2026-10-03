// js/components/cookMode.js — 03 Oct 2026 v3
// v3 (kitchen rebuild, "at the hob"):
//   * Timers keep running when you move on. Before, moving to the next step
//     stopped the timer — so the 25-minute simmer died the moment you went
//     to chop the next thing, which is exactly when you need it. Timers are
//     now a strip at the top, several at once, each named for its step, and
//     stored as END TIMES so a sleeping screen or a reload cannot lose them.
//   * When one finishes: the words "Time is up", a buzz where the phone can,
//     and an announcement. Never only a sound or only a colour.
//   * Ingredients, scaled, one tap away, without leaving the step.
//   * A progress bar beside "Step 3 of 9", and a bigger instruction.
// v2: Phase 15. One instruction at a time, on the counter, hands busy.
//
// ---- What this is for ----
// Recipes in books are written to be READ. These are written to be
// EXECUTED: one step, standing up, distracted, possibly holding a hot pan.
// Everything below follows from that.
//
// ---- Progress persists ----
// A screen lock, a phone call, answering the door, or an accidental reload
// must not lose your place — or your timers. Held in localStorage: it is
// device state, not data. Anything older than six hours is discarded.

import { resolveTokens, slugifyFoodName } from '../data/mealSteps.js';
import { announce } from '../lib/a11y.js';

const PROGRESS_KEY = 'home-os:cook-progress';
const PROGRESS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function readProgress(mealId) {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.mealId !== mealId) return null;
    if (Date.now() - Number(saved.startedAt || 0) > PROGRESS_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function writeProgress(mealId, stepIndex, startedAt, timers) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ mealId, stepIndex, startedAt, timers }));
  } catch {
    // A full or blocked storage must not stop you cooking.
  }
}

export function clearProgress() {
  try { window.localStorage.removeItem(PROGRESS_KEY); } catch { /* nothing to do */ }
}

/** "4:05" from milliseconds; never negative. Pure. */
export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** What a timer is called: the step's group, else its number. Pure. */
export function timerLabel(step, index) {
  const group = step && step.step_group ? String(step.step_group) : '';
  return group ? `${group} (step ${index + 1})` : `Step ${index + 1}`;
}

/**
 * @param {{ meal: object, steps: object[], ingredients: object[], scale?: number }} options
 * @returns {Promise<boolean>} True when the recipe was cooked through to
 *   the end, false when it was left.
 */
export function openCookMode({ meal, steps = [], ingredients = [], scale = 1 } = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const saved = readProgress(meal.id);
    const startedAt = saved ? saved.startedAt : Date.now();
    let index = saved ? Math.min(saved.stepIndex, steps.length - 1) : 0;
    // { step, label, endsAt, done }
    let timers = saved && Array.isArray(saved.timers) ? saved.timers.filter((t) => t && t.endsAt) : [];
    let ticker = null;
    let wakeLock = null;

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    const overlay = el('div', 'cook-mode');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Cooking ${meal.name}`);

    const header = el('div', 'cook-header');
    const title = el('h2', 'cook-title', meal.name);
    const counter = el('p', 'cook-counter');
    const exit = el('button', 'btn cook-exit', 'Close');
    exit.type = 'button';
    const progress = el('div', 'cook-progress');
    progress.setAttribute('aria-hidden', 'true');
    const progressFill = el('span', 'cook-progress-fill');
    progress.appendChild(progressFill);
    header.append(title, counter, exit, progress);

    // Running timers, always visible whatever step is showing.
    const strip = el('ul', 'cook-timers');
    strip.setAttribute('aria-label', 'Timers');
    const alertRegion = el('p', 'visually-hidden');
    alertRegion.setAttribute('role', 'alert');

    // Ingredients, scaled, without leaving the step.
    const ingWrap = el('details', 'cook-ingredients');
    const ingSummary = el('summary', '', `Ingredients (${ingredients.length})`);
    const ingList = el('ul', 'cook-ingredients-list');
    for (const row of ingredients) {
      const name = (row.foods && row.foods.name) || '';
      const slug = slugifyFoodName(name);
      const text = slug ? resolveTokens(`{{ing:${slug}}}`, ingredients, scale) : name;
      ingList.appendChild(el('li', '', text));
    }
    ingWrap.append(ingSummary, ingList);
    ingWrap.hidden = ingredients.length === 0;

    const groupLabel = el('p', 'cook-group');

    // The live region carries the step text on every change.
    const body = el('div', 'cook-body');
    body.setAttribute('role', 'status');
    body.setAttribute('aria-live', 'polite');
    const instruction = el('p', 'cook-instruction');
    const note = el('p', 'cook-note');
    const parallel = el('p', 'cook-parallel');
    body.append(instruction, note, parallel);

    const timerWrap = el('div', 'cook-timer');
    const timerButton = el('button', 'btn cook-timer-start');
    timerButton.type = 'button';
    timerWrap.append(timerButton);

    const nav = el('div', 'cook-nav');
    const back = el('button', 'btn', 'Back');
    back.type = 'button';
    const next = el('button', 'btn btn-primary btn-large');
    next.type = 'button';
    nav.append(back, next);

    overlay.append(header, strip, alertRegion, ingWrap, groupLabel, body, timerWrap, nav);
    document.body.appendChild(overlay);
    document.body.classList.add('cook-mode-open');

    function save() { writeProgress(meal.id, index, startedAt, timers); }

    function paintTimers() {
      strip.replaceChildren();
      strip.hidden = timers.length === 0;
      const now = Date.now();
      for (const t of timers) {
        const left = t.endsAt - now;
        const li = el('li', left <= 0 ? 'cook-timer-chip is-done' : 'cook-timer-chip');
        li.appendChild(el('span', 'cook-timer-label', t.label));
        li.appendChild(el('span', 'cook-timer-left', left <= 0 ? 'Time is up' : `${formatRemaining(left)} left`));
        const stop = el('button', 'btn btn-small', left <= 0 ? 'Done' : 'Stop');
        stop.type = 'button';
        stop.setAttribute('aria-label', `${left <= 0 ? 'Dismiss' : 'Stop'} the ${t.label} timer`);
        stop.addEventListener('click', () => {
          timers = timers.filter((x) => x !== t);
          save();
          paintTimers();
          paintTimerButton();
          next.focus();
        });
        li.appendChild(stop);
        strip.appendChild(li);
      }
    }

    function tick() {
      const now = Date.now();
      for (const t of timers) {
        if (!t.done && t.endsAt <= now) {
          t.done = true;
          alertRegion.textContent = `Time is up: ${t.label}.`;
          announce(`Time is up: ${t.label}.`);
          if ('vibrate' in navigator) { try { navigator.vibrate([300, 150, 300, 150, 300]); } catch { /* not allowed */ } }
          save();
        }
      }
      paintTimers();
    }

    function paintTimerButton() {
      const step = steps[index];
      if (!step || !step.duration_min) {
        timerWrap.hidden = true;
        timerButton.onclick = null;
        return;
      }
      timerWrap.hidden = false;
      const running = timers.find((t) => t.step === index && !t.done);
      timerButton.disabled = false;
      if (running) {
        timerButton.textContent = `Timer running: ${step.duration_min} minutes`;
        timerButton.onclick = null;
        timerButton.setAttribute('aria-disabled', 'true');
      } else {
        timerButton.removeAttribute('aria-disabled');
        timerButton.textContent = `Start ${step.duration_min} minute timer`;
        timerButton.onclick = () => {
          timers = timers.filter((t) => !(t.step === index && t.done));
          timers.push({ step: index, label: timerLabel(step, index), endsAt: Date.now() + step.duration_min * 60000, done: false });
          save();
          paintTimers();
          paintTimerButton();
          announce(`${step.duration_min} minute timer started. It keeps going when you move on.`);
        };
      }
    }

    function render() {
      const step = steps[index];
      if (!step) return;
      counter.textContent = `Step ${index + 1} of ${steps.length}`;
      progressFill.style.width = `${Math.round(((index + 1) / steps.length) * 100)}%`;
      groupLabel.textContent = step.step_group || '';
      groupLabel.hidden = !step.step_group;

      instruction.textContent = resolveTokens(step.instruction, ingredients, scale);
      note.textContent = step.note || '';
      note.hidden = !step.note;

      // A while_waiting step is shown beside the timer it runs alongside.
      const upcoming = steps[index + 1];
      if (upcoming && upcoming.while_waiting) {
        parallel.textContent = `While that cooks: ${resolveTokens(upcoming.instruction, ingredients, scale)}`;
        parallel.hidden = false;
      } else {
        parallel.textContent = '';
        parallel.hidden = true;
      }

      paintTimerButton();
      back.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? 'Finish' : 'Done — next step';
      save();
    }

    function close({ finished = false } = {}) {
      if (ticker) clearInterval(ticker);
      if (finished) clearProgress(); else save();
      if (wakeLock) { try { wakeLock.release(); } catch { /* already gone */ } }
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('visibilitychange', onVisible);
      document.body.classList.remove('cook-mode-open');
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(finished);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...overlay.querySelectorAll('button:not([disabled]), summary')]
        .filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }

    // The screen lock releases on hiding; ask again on return.
    function requestWake() {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then((lock) => { wakeLock = lock; }).catch(() => {});
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible') { requestWake(); tick(); }
    }

    next.addEventListener('click', () => {
      if (index >= steps.length - 1) {
        const running = timers.filter((t) => !t.done).length;
        if (running) {
          // Finishing with a timer still going would throw it away.
          announce(`A timer is still running. Stop it, or wait for it, before finishing.`);
          alertRegion.textContent = 'A timer is still running. Stop it, or wait for it, before finishing.';
          strip.querySelector('button')?.focus();
          return;
        }
        announce(`${meal.name} finished.`);
        close({ finished: true });
        return;
      }
      index += 1;
      render();
    });
    back.addEventListener('click', () => {
      if (index === 0) return;
      index -= 1;
      render();
    });
    exit.addEventListener('click', () => close());
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('visibilitychange', onVisible);

    requestWake();
    render();
    paintTimers();
    ticker = setInterval(tick, 1000);
    if (saved) announce(`Picking up at step ${index + 1}.`);
    next.focus();
  });
}
