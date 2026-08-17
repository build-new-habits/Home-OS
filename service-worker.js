// service-worker.js — 17 Aug 2026 v9
// Precaches only real Home-OS shell files (behavioural principle 10:
// every daily-use screen must open offline). No path from any other
// project belongs in this list — ever.
//
// v7: adds the two new Phase 5 data modules (js/data/weight.js,
// js/data/water.js). js/views/weight.js and js/views/water.js were already
// listed as Phase 2 stubs, so only their content changed — no new entry
// needed for them. CACHE_NAME bumped per the standing rule: bump on any
// precached *content* change, even when this script's own logic is
// untouched, or install never re-runs and stale files keep being served
// (see PHASE3_HANDOFF.md bug #3).
//
// v9: no path list change — bumped for the css/components.css v6 control-
// border fix and the views/weight.js + views/water.js cleanup. Standing
// rule 3 again: content changed, so the cache generation changes.
//
// v8: no path list change — bumped because js/data/settings.js and
// js/views/settings.js changed content (change-password form). Standing
// rule 3: bump on any precached *content* change or install never re-runs
// and the old settings screen keeps being served from cache indefinitely.
//
// Precache is all-or-nothing: cache.addAll() rejects the whole install if
// any single path 404s, so every path below must be verified to return 200.
const CACHE_NAME = 'home-os-shell-v9';
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
  './js/data/weight.js',
  './js/data/water.js',
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
