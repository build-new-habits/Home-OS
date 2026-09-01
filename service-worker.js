// service-worker.js — 01 Sep 2026 v46
// v46 (Phase 18): ONE new path, js/data/household.js. Also bumped for
// views/settings.js v7, data/settings.js v5 and components.css v26.
// v45: no path changes. Bumped for the conversion-factor prompt —
// views/meals.js v13, data/meals.js v4, components.css v25.
// v44 (Phase 11): THREE new paths — js/data/foodClaim.js, js/data/restock.js
// and js/components/claimDialog.js. The precache is all-or-nothing, so all
// three were verified to return 200 before this was bumped.
// v43: no path changes. Bumped for views/meals.js v12 — the open panel now
// rebuilds when the meal changes.
// v42: no path changes. Bumped for views/meals.js v11 — ingredients can be
// created from the recipe.
// v41: no path changes. Bumped for the Phase 9 dashboard — views/dashboard.js
// v3 and components.css v23.
// v40: no path changes. Bumped for the holiday bridge and the per-recipe
// stock check — views/holidays.js, views/meals.js v10, lib/shortfall.js.
// v39: TWO new paths — lib/shortfall.js and data/shopping.js. The shopping
// list stub is replaced by the real view (same path, new content).
// v38: no path changes. Bumped for use_by (revision 7) — data/pantry.js v3,
// views/pantry.js, lib/openFoodFacts.js pack-size parsing.
// v37: no path changes. Bumped for the holidays rework — views/holidays.js
// v3, data/holidays.js, components.css v21.
// v36: ONE new path, js/views/foods.js — the library is its own page.
// v35: no path changes. Bumped for the recipe rework — views/meals.js v9,
// data/meals.js v3, components.css v20.
// v34: ONE new path, js/views/mealPlan.js — the weekly plan is its own page.
// v33: no path changes. Bumped for the chores rework — views/chores.js v4,
// lib/rrule.js v2, components.css v19.
// v32: ONE new path, js/views/kitchen.js.
// v31: no path changes. Bumped for dashboard v2 (one-tap water, curated
// link list), navConfig v2 and components.css v18.
// v30: FOUR new paths — navConfig.js, data/completions.js,
// views/calendar.js, views/health.js. The calendar becomes its own page and
// Health absorbs exercises/weight/water in the bottom bar.
// v29: no path changes. Bumped for views/settings.js v6, which reports the
// installed build so an out-of-date device can be identified by looking.
// v28: ONE new path, js/components/detailSheet.js. Also fixes install() to
// fetch every precache entry with { cache: 'reload' } — see the comment on
// the install listener. A precache that trusts the HTTP cache can freeze a
// mix of old and new files, which is exactly what shipped in v27.
// v27: no path changes. Bumped for the pantry rework — views/pantry.js v3,
// data/pantry.js v2, components.css v15 all changed content.
// v26: no path changes. CACHE_NAME bumped because css/base.css content
// changed (the global [hidden] rule). Bumping on precached *content*
// changes, not just script changes, is the standing rule.
// v25: ONE new path, js/components/scannerDialog.js — the scanner dialog
// extracted from views/meals.js so the pantry can scan a shelf too.
// v24 (Phase 7, part one): ONE new path, js/data/pantry.js.
// js/views/pantry.js was already listed as a Phase 2 stub.
// v23: no path change — bumped for the category sentinel and select spacing.
// v22: no path change — bumped for the scan category confirmation and the
// inline conversion-factor prompt.
// v21: no path change — bumped for the food category controls and the
// searchable grouped picker (data/foods.js v3, views/meals.js v5,
// components.css v11).
// v20: no path change — bumped for views/meals.js v4 (the quantity input
// min/step fix; every round number was unenterable).
// v19: no path change — bumped for schema revision 4 (ingredient units and
// food conversion factors) touching data/meals.js, data/foods.js,
// views/meals.js and components.css.
// v18 (Phase 8): ONE new path, js/data/holidays.js. js/views/holidays.js
// was already listed as a Phase 2 stub, and work location lives inside
// data/calendar.js rather than a module of its own, so the count goes
// 49 -> 50 rather than the 51 the brief estimated.
// v17: no path change — bumped for data/calendar.js v2 and views/chores.js
// v3 (the calendar_events event_type filter).
// v16: no path change — bumped for views/meals.js v2 (barcode validation
// feedback and focus restoration). CACHE_NAME must be bumped on any
// precached CONTENT change, not only when this script changes, or the old
// meals.js is served from cache forever (standing rule 3).
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
// v15 (Phase 6): SIX new paths — js/lib/barcode.js, js/lib/openFoodFacts.js,
// js/vendor/zxing-upcean.js, js/data/foods.js, js/data/meals.js and
// js/data/mealPlan.js. js/views/meals.js was already listed as a Phase 2
// stub, so only its content changed. Every new path must return 200 or the
// whole precache install fails silently and the shell stays on v14.
//
// zxing-upcean.js is precached even though it is dynamically imported and
// most devices never load it: the fallback exists FOR the offline case, and
// an engine fetched on demand from a network that is not there is no
// fallback at all.
//
// v14: no path change — bumped for views/water.js v3 (optimistic logging).
//
// v13: no path change — bumped for the views/settings.js ReferenceError
// fix. The broken file is precached, so without a bump the settings screen
// would stay broken no matter what was deployed.
//
// v12: adds js/lib/net.js (offline + timeout guards). NEW path — must 200
// or the entire precache install fails.
//
// v11: no path change — bumped for the supabaseClient.js detectSessionInUrl
// fix. This one matters more than most: the old client is precached, so
// without a bump the browser would keep serving the broken auth config and
// the magic link would keep failing no matter what was deployed.
//
// v10: adds js/views/signin.js (sign-in UI extracted out of app.js so auth
// can change without editing a write-once gating file). New path, so this
// MUST be verified to 200 or the whole precache install fails.
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
const CACHE_NAME = 'home-os-shell-v46';
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
  './js/vendor/zxing-upcean.js',
  './js/app.js',
  './js/router.js',
  './js/routes.js',
  './js/navConfig.js',
  './js/lib/store.js',
  './js/lib/a11y.js',
  './js/lib/offlineQueue.js',
  './js/lib/net.js',
  './js/lib/dates.js',
  './js/lib/units.js',
  './js/lib/shortfall.js',
  './js/lib/rrule.js',
  './js/lib/barcode.js',
  './js/lib/openFoodFacts.js',
  './js/data/settings.js',
  './js/data/exercises.js',
  './js/data/chores.js',
  './js/data/calendar.js',
  './js/data/completions.js',
  './js/data/shopping.js',
  './js/data/weight.js',
  './js/data/holidays.js',
  './js/data/pantry.js',
  './js/data/water.js',
  './js/data/foods.js',
  './js/data/meals.js',
  './js/data/mealPlan.js',
  './js/data/household.js',
  './js/data/foodClaim.js',
  './js/data/restock.js',
  './js/components/bottomNav.js',
  './js/components/toast.js',
  './js/components/confirmDialog.js',
  './js/components/liveRegion.js',
  './js/components/card.js',
  './js/components/scannerDialog.js',
  './js/components/claimDialog.js',
  './js/components/detailSheet.js',
  './js/components/completionStamp.js',
  './js/views/signin.js',
  './js/views/settings.js',
  './js/views/dashboard.js',
  './js/views/exercises.js',
  './js/views/chores.js',
  './js/views/weight.js',
  './js/views/water.js',
  './js/views/meals.js',
  './js/views/pantry.js',
  './js/views/shopping.js',
  './js/views/holidays.js',
  './js/views/calendar.js',
  './js/views/health.js',
  './js/views/kitchen.js',
  './js/views/mealPlan.js',
  './js/views/foods.js'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    // ---- Every precache fetch MUST bypass the HTTP cache ----
    // cache.addAll() goes through the browser's normal HTTP cache, and
    // GitHub Pages serves these files with a ten-minute max-age. Bump
    // CACHE_NAME and redeploy inside that window and the "new" cache is
    // filled with whatever the HTTP cache still holds — so the app can end
    // up running new JavaScript against an old stylesheet, frozen that way
    // until the next bump. That happened: the pantry shipped with v15 CSS
    // and rendered with v14, as unstyled boxes and default bullets.
    // { cache: 'reload' } makes each precache request go to the network.
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_FILES.map((url) => new Request(url, { cache: 'reload' })))
    )
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
