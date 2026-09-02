// js/components/toast.js — 01 Sep 2026 v2
// v2 (Phase 22): adds an optional undo action.
//
// ---- Why undo, and why it replaces the confirm ----
// A confirm dialog asks you to predict your own mistake BEFORE making it.
// Undo lets you notice it afterwards, which is how mistakes actually get
// noticed. It is also the less interrupting of the two: a confirm stops
// everyone to protect the few, an undo costs nothing until it is needed.
//
// So where undo exists, the confirm goes. Two safety nets is a tax.
import { announce, prefersReducedMotion } from '../lib/a11y.js';

let regionEl = null;

function ensureRegion() {
  if (regionEl) return regionEl;
  regionEl = document.createElement('div');
  regionEl.className = 'toast-region';
  document.body.appendChild(regionEl);
  return regionEl;
}

/**
 * Shows a short-lived visible toast AND announces it via the shared
 * aria-live region — the toast is a visible echo, not the a11y channel
 * itself, so screen-reader users get the announcement even if the toast
 * is missed visually.
 */
export function showToast(message, { duration = 4000, undo = null, undoLabel = 'Undo' } = {}) {
  announce(undo ? `${message} ${undoLabel} available.` : message);
  const region = ensureRegion();
  const el = document.createElement('div');
  el.className = 'toast';

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  el.appendChild(text);

  let done = false;
  const remove = () => { if (!done) { done = true; el.remove(); } };

  if (undo) {
    // Ten seconds, not four. An undo you have to catch is not an undo, and
    // the whole point is that you notice the mistake a moment later.
    duration = Math.max(duration, 10000);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-undo';
    button.textContent = undoLabel;
    button.addEventListener('click', async () => {
      button.disabled = true;
      remove();
      try {
        await undo();
      } catch (error) {
        console.error('Undo failed:', error);
        showToast('That could not be undone.');
      }
    });
    el.appendChild(button);
  }

  region.appendChild(el);

  // A toast carrying an action must never fade out from under a thumb, and
  // fading text is harder to read for anyone who reads slowly.
  if (prefersReducedMotion() || undo) {
    setTimeout(remove, duration);
  } else {
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(remove, duration);
  }
}
