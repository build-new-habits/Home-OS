// js/components/cookMode.js — 01 Sep 2026 v1
// Phase 15. One instruction at a time, on the counter, hands busy.
//
// ---- What this is for ----
// Recipes in books are written to be READ. These are written to be
// EXECUTED: one step, standing up, distracted, possibly holding a hot pan.
// Everything below follows from that.
//
// ---- Progress persists ----
// The single most important behaviour here. A screen lock, a phone call,
// answering the door, or an accidental reload must not lose your place.
// Held in localStorage rather than the offline queue: it is device state,
// not data, and it must survive without a network round trip.
//
// Anything older than six hours is discarded. You are not still cooking.

import { resolveTokens } from '../data/mealSteps.js';
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

function writeProgress(mealId, stepIndex, startedAt) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ mealId, stepIndex, startedAt }));
  } catch {
    // A full or blocked storage must not stop you cooking.
  }
}

export function clearProgress() {
  try { window.localStorage.removeItem(PROGRESS_KEY); } catch { /* nothing to do */ }
}

/**
 * @param {{ meal: object, steps: object[], ingredients: object[], scale?: number }} options
 * @returns {Promise<void>} Resolves when the user leaves.
 */
export function openCookMode({ meal, steps = [], ingredients = [], scale = 1 } = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const saved = readProgress(meal.id);
    const startedAt = saved ? saved.startedAt : Date.now();
    let index = saved ? Math.min(saved.stepIndex, steps.length - 1) : 0;
    let timerId = null;
    let remaining = 0;
    let wakeLock = null;

    const overlay = document.createElement('div');
    overlay.className = 'cook-mode';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Cooking ${meal.name}`);

    const header = document.createElement('div');
    header.className = 'cook-header';
    const title = document.createElement('h2');
    title.className = 'cook-title';
    title.textContent = meal.name;
    const counter = document.createElement('p');
    counter.className = 'cook-counter';
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'btn cook-exit';
    exit.textContent = 'Close';
    header.append(title, counter, exit);

    const groupLabel = document.createElement('p');
    groupLabel.className = 'cook-group';

    // The live region carries the step text on every change. Without it a
    // screen reader user advances and hears nothing.
    const body = document.createElement('div');
    body.className = 'cook-body';
    body.setAttribute('role', 'status');
    body.setAttribute('aria-live', 'polite');

    const instruction = document.createElement('p');
    instruction.className = 'cook-instruction';
    const note = document.createElement('p');
    note.className = 'cook-note';
    const parallel = document.createElement('p');
    parallel.className = 'cook-parallel';
    body.append(instruction, note, parallel);

    const timerWrap = document.createElement('div');
    timerWrap.className = 'cook-timer';
    const timerButton = document.createElement('button');
    timerButton.type = 'button';
    timerButton.className = 'btn';
    // The remaining time is TEXT, not only a visual countdown.
    const timerText = document.createElement('p');
    timerText.className = 'cook-timer-text';
    timerText.setAttribute('role', 'status');
    timerWrap.append(timerButton, timerText);

    const nav = document.createElement('div');
    nav.className = 'cook-nav';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn';
    back.textContent = 'Back';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-primary btn-large';
    nav.append(back, next);

    overlay.append(header, groupLabel, body, timerWrap, nav);
    document.body.appendChild(overlay);
    document.body.classList.add('cook-mode-open');

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      timerText.textContent = '';
    }

    function startTimer(minutes) {
      stopTimer();
      remaining = minutes * 60;
      tick();
      timerId = setInterval(tick, 1000);
    }

    function tick() {
      if (remaining <= 0) {
        stopTimer();
        timerText.textContent = 'Time is up.';
        announce('Timer finished.');
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerText.textContent = `${mins}:${String(secs).padStart(2, '0')} left`;
      remaining -= 1;
    }

    function render() {
      const step = steps[index];
      if (!step) return;

      counter.textContent = `Step ${index + 1} of ${steps.length}`;
      groupLabel.textContent = step.step_group || '';
      groupLabel.hidden = !step.step_group;

      instruction.textContent = resolveTokens(step.instruction, ingredients, scale);
      note.textContent = step.note || '';
      note.hidden = !step.note;

      // A while_waiting step is shown beside the timer it runs alongside,
      // not after it. Rule 2 has to survive into the UI or it was just a
      // writing convention.
      const upcoming = steps[index + 1];
      if (upcoming && upcoming.while_waiting) {
        parallel.textContent = `While that cooks: ${resolveTokens(upcoming.instruction, ingredients, scale)}`;
        parallel.hidden = false;
      } else {
        parallel.textContent = '';
        parallel.hidden = true;
      }

      stopTimer();
      if (step.duration_min) {
        timerWrap.hidden = false;
        timerButton.textContent = `Start ${step.duration_min} minute timer`;
        timerButton.onclick = () => startTimer(step.duration_min);
      } else {
        timerWrap.hidden = true;
        timerButton.onclick = null;
      }

      back.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? 'Finish' : 'Done — next step';
      writeProgress(meal.id, index, startedAt);
    }

    function close({ finished = false } = {}) {
      stopTimer();
      if (finished) clearProgress();
      if (wakeLock) { try { wakeLock.release(); } catch { /* already gone */ } }
      document.removeEventListener('keydown', onKeydown, true);
      document.body.classList.remove('cook-mode-open');
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...overlay.querySelectorAll('button:not([disabled])')]
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

    next.addEventListener('click', () => {
      if (index >= steps.length - 1) {
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

    // Feature-detected, no polyfill. A phone that dims mid-step is a small
    // disaster with wet hands.
    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request('screen').then((lock) => { wakeLock = lock; }).catch(() => {});
    }

    render();
    if (saved) announce(`Picking up at step ${index + 1}.`);
    next.focus();
  });
}
