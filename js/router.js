// js/router.js — 18 Jul 2026 v2
// Write-once router. Reads routes.js, handles hash navigation, mounts the
// matched view's render(), and calls the previous view's cleanup before
// mounting the next one. Later phases never edit this file.

import { routes, findRoute, DEFAULT_ROUTE } from './routes.js';
import { focusHeading } from './lib/a11y.js';

let mountEl = null;
let currentCleanup = null;
let onAfterRender = null; // (path) => void — app.js uses this to update bottom-nav state
let listenerAttached = false; // prevents startRouter() being called twice
// from stacking a second 'hashchange' listener, which would otherwise fire
// renderRoute() twice per navigation on its own.
let renderToken = 0; // bumped on every renderRoute() call; a stale in-flight
// call (e.g. one still awaiting its dynamic import when a newer one starts)
// checks this after each await and abandons instead of writing into a
// mount point a newer render already owns — this is what actually stops
// two renders ever painting into the same view at once.

function parseHash() {
  const hash = window.location.hash || '';
  const match = hash.match(/^#\/([a-z-]+)/i);
  return match ? match[1] : DEFAULT_ROUTE;
}

async function renderRoute() {
  const token = ++renderToken;
  const targetEl = mountEl; // capture now — a later startRouter() call could
  // reassign the module-level mountEl before this async function resumes.
  const path = parseHash();
  const route = findRoute(path) || findRoute(DEFAULT_ROUTE);

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (err) { console.error('View cleanup failed:', err); }
    currentCleanup = null;
  }

  targetEl.replaceChildren();
  targetEl.setAttribute('aria-busy', 'true');

  try {
    const mod = await route.load();
    if (token !== renderToken) return; // superseded by a newer render — bail out
    document.title = `${route.title} · Home-OS`;
    currentCleanup = mod.render(targetEl, {});
  } catch (err) {
    if (token !== renderToken) return;
    console.error(`Failed to load route "${route.path}":`, err);
    targetEl.replaceChildren();
    const h1 = document.createElement('h1');
    h1.textContent = 'Something went wrong loading this page';
    const p = document.createElement('p');
    p.textContent = 'Try again, or use the navigation to go elsewhere.';
    targetEl.append(h1, p);
  } finally {
    if (token === renderToken) targetEl.removeAttribute('aria-busy');
  }

  if (token !== renderToken) return;
  focusHeading(targetEl);
  if (typeof onAfterRender === 'function') onAfterRender(route.path);
}

/**
 * Starts the router. `el` is the <main> mount point. `afterRender` is an
 * optional callback invoked with the resolved path after every render,
 * used by app.js to keep the bottom nav's aria-current in sync.
 */
export function startRouter(el, afterRender) {
  mountEl = el;
  onAfterRender = afterRender || null;
  if (!listenerAttached) {
    listenerAttached = true;
    window.addEventListener('hashchange', renderRoute);
  }
  if (!window.location.hash) {
    window.location.hash = `#/${DEFAULT_ROUTE}`;
  } else {
    renderRoute();
  }
}

export function navigate(path) {
  window.location.hash = `#/${path}`;
}

export { routes };
