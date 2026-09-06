// js/components/toast.js — 06 Sep 2026 v3
// v3: a close button, swipe-to-dismiss, and seven seconds instead of ten.
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
    // ---- Seven seconds, not ten (device test 6 Sep 2026) ----------------
    // "The banner with undo remains for ages and can't be got rid of. It's
    // in the way of doing anything."
    //
    // v2 argued for ten seconds because an undo you have to catch is not an
    // undo. That reasoning was right about undo and wrong about the person:
    // it treated the only exit as waiting. Ten seconds of sitting on your
    // hands is a long time when you are deleting six things in a row.
    //
    // The fix is not really the number. It is that there are now three ways
    // out — the close button, a swipe, or the timer — so the timer stops
    // being the only one. Seven is still comfortably longer than the moment
    // it takes to notice a mistake.
    duration = Math.max(duration, 7000);

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

  // ---- A way out that is not waiting -----------------------------------
  // Every toast gets a close control, including ones without an undo. A
  // message that covers what you are reading and offers no way to move it
  // is an obstacle, however briefly it lasts.
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss this message');
  // The glyph is decorative; the accessible name above carries the meaning.
  close.innerHTML = '<span aria-hidden="true">\u00d7</span>';
  close.addEventListener('click', remove);
  el.appendChild(close);

  region.appendChild(el);

  // ---- Swipe it away ---------------------------------------------------
  // The gesture people already try on a notification. Horizontal only, and
  // it gives up the moment the drag looks vertical, so it never fights the
  // page scroll underneath.
  let startX = 0;
  let dx = 0;
  let swiping = false;
  el.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    dx = 0;
    swiping = true;
    el.style.transition = 'none';
  }, { passive: true });

  el.addEventListener('touchmove', (event) => {
    if (!swiping) return;
    dx = event.touches[0].clientX - startX;
    el.style.transform = `translateX(${dx}px)`;
    el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 200));
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    if (Math.abs(dx) > 80) {
      remove();
      return;
    }
    // Not far enough: put it back rather than leaving it half off-screen.
    el.style.transition = prefersReducedMotion() ? 'none' : 'transform 150ms ease, opacity 150ms ease';
    el.style.transform = '';
    el.style.opacity = '';
  }, { passive: true });

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
