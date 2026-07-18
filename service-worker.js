// service-worker.js — 18 Jul 2026 v3
// Precaches only real Home-OS shell files (behavioural principle 10:
// every daily-use screen must open offline). No path from any other
// project belongs in this list — ever.

const CACHE_NAME = 'home-os-shell-v3';
const SCOPE = self.registration.scope; // e.g. https://<user>.github.io/Home-OS/

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './404.html',
  './assets/icons/icon.svg',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/config.js',
  './js/supabaseClient.js',
  './js/vendor/supabase-js.js',
  './js/app.js',
  './js/router.js',
  './js/routes.js',
  './js/lib/store.js',
  './js/lib/a11y.js',
  './js/lib/offlineQueue.js',
  './js/lib/dates.js',
  './js/lib/units.js',
  './js/data/settings.js',
  './js/components/bottomNav.js',
  './js/components/toast.js',
  './js/components/confirmDialog.js',
  './js/components/liveRegion.js',
  './js/views/settings.js',
  './js/views/dashboard.js',
  './js/views/exercises.js',
  './js/views/chores.js',
  './js/views/weight.js',
  './js/views/water.js',
  './js/views/meals.js',
  './js/views/pantry.js',
  './js/views/shopping.js',
  './js/views/holidays.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

function isShellRequest(url) {
  // Only same-origin requests inside this app's scope are ever considered
  // "shell" — the Supabase API itself always falls through to network-first
  // below, since its data changes and must not be served stale from cache.
  return url.origin === self.location.origin && url.pathname.startsWith(new URL(SCOPE).pathname);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return; // never intercept writes
  }

  if (isShellRequest(url)) {
    // Cache-first for the shell: fast offline open, background revalidate.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Network-first for everything else (Supabase data API calls). respondWith
  // always needs a real Response — if both network and cache miss (e.g.
  // genuinely offline and nothing was ever cached for this request), return
  // a synthetic error response instead of letting the promise reject, which
  // previously surfaced as an uncaught "Failed to convert value to Response".
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response(
        JSON.stringify({ error: 'offline', message: 'No network connection and nothing cached for this request.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    })
  );
});
