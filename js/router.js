// js/router.js — 14 Jul 2026 v1
// Write-once router. Reads routes.js, handles hash navigation, mounts the
// matched view's render(), and calls the previous view's cleanup before
// mounting the next one. Later phases never edit this file.

import { routes, findRoute, DEFAULT_ROUTE } from './routes.js';
import { focusHeading } from './lib/a11y.js';

let mountEl = null;
let currentCleanup = null;
let onAfterRender = null; // (path) => void — app.js uses this to update bottom-nav state

function parseHash() {
  const hash = window.location.hash || '';
  const match = hash.match(/^#\/([a-z-]+)/i);
  return match ? match[1] : DEFAULT_ROUTE;
}

async function renderRoute() {
  const path = parseHash();
  const route = findRoute(path) || findRoute(DEFAULT_ROUTE);

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (err) { console.error('View cleanup failed:', err); }
    currentCleanup = null;
  }

  mountEl.replaceChildren();
  mountEl.setAttribute('aria-busy', 'true');

  try {
    const mod = await route.load();
    document.title = `${route.title} · Home-OS`;
    currentCleanup = mod.render(mountEl, {});
  } catch (err) {
    console.error(`Failed to load route "${route.path}":`, err);
    mountEl.replaceChildren();
    const h1 = document.createElement('h1');
    h1.textContent = 'Something went wrong loading this page';
    const p = document.createElement('p');
    p.textContent = 'Try again, or use the navigation to go elsewhere.';
    mountEl.append(h1, p);
  } finally {
    mountEl.removeAttribute('aria-busy');
  }

  focusHeading(mountEl);
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
  window.addEventListener('hashchange', renderRoute);
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
