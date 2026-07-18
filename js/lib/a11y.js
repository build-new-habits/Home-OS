// js/lib/a11y.js — 14 Jul 2026 v1
// Shared accessibility helpers used across views and components.

let liveRegionEl = null;

/** Register the live region element created by components/liveRegion.js */
export function registerLiveRegion(el) {
  liveRegionEl = el;
}

/**
 * Announce a message via the polite aria-live region (settings saved,
 * exported, offline, sign-in errors, etc).
 */
export function announce(message) {
  if (!liveRegionEl) return;
  // Clear then set on a microtask so repeated identical messages still
  // fire a fresh announcement in most screen readers.
  liveRegionEl.textContent = '';
  window.requestAnimationFrame(() => {
    liveRegionEl.textContent = message;
  });
}

/**
 * Move focus to a view's <h1> on route change (2.4.3 / 2.4.11).
 * Adds tabindex="-1" temporarily so a non-interactive heading can
 * receive programmatic focus, then removes it on blur.
 */
export function focusHeading(mountEl) {
  const heading = mountEl.querySelector('h1');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus();
  heading.addEventListener('blur', () => {
    heading.removeAttribute('tabindex');
  }, { once: true });
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
