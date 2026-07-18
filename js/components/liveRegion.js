// js/components/liveRegion.js — 14 Jul 2026 v1
import { registerLiveRegion } from '../lib/a11y.js';

/**
 * Creates the single aria-live="polite" region for the whole app and
 * mounts it into the given container. Call once from app.js.
 */
export function mountLiveRegion(containerEl) {
  const el = document.createElement('div');
  el.id = 'live-region';
  el.className = 'visually-hidden';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  containerEl.appendChild(el);
  registerLiveRegion(el);
  return el;
}
