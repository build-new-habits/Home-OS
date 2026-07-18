// js/components/toast.js — 14 Jul 2026 v1
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
export function showToast(message, { duration = 4000 } = {}) {
  announce(message);
  const region = ensureRegion();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  region.appendChild(el);

  const remove = () => el.remove();
  if (prefersReducedMotion()) {
    setTimeout(remove, duration);
  } else {
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(remove, duration);
  }
}
