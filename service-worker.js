// service-worker.js — 20 Jul 2026 v6
// Precaches only real Home-OS shell files (behavioural principle 10:
// every daily-use screen must open offline). No path from any other
// project belongs in this list — ever.
//
// v6: adds the three new Phase 4 files (js/lib/rrule.js, js/data/chores.js,
// js/data/calendar.js) to the precache list. js/views/chores.js was already
// present as a placeholder for the Phase 2 stub, so it needed no addition —
// only its content changed. CACHE_NAME bumped per the standing rule (bump
// on any precached content change, even when this script's own logic is
// untouched — see PHASE3_HANDOFF.md bug #3).
const CACHE_NAME = 'home-os-shell-v6';
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
  './js/lib/rrule.js',
  './js/data/settings.js',
  './js/data/exercises.js',
  './js/data/chores.js',
  './js/data/calendar.js',
  './js/components/bottomNav.js',
  './js/components/toast.js',
  './js/components/confirmDialog.js',
  './js/components/liveRegion.js',
  './js/components/card.js',
  './js/components/completionStamp.js',
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
  return url.origin === self.location.origin && url.pathname.startsWith(new URL(SCOPE).pathname);
}
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') {
    return;
  }
  if (isShellRequest(url)) {
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
