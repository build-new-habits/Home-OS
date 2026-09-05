// service-worker.js — 01 Sep 2026 v84
// v84 (worklist G1): ONE new path, js/views/meals/method.js.
// meals.js 2,123 -> 1,777.
// v83 (worklist G1): TWO new paths — js/views/meals/library.js and
// js/views/meals/cookNow.js. meals.js 2,421 -> 2,123.
// v82 (worklist F2/F3/F4): empty states, page icons across six screens,
// calendar event kinds by shape — lib/icons.js v4, views/calendar.js v3,
// shopping/meals/mealPlan/pantry/foods headings.
// v81 (worklist F1/F5/F6/F7/F8/F10): undo on step and member removal, the
// claim step in the Foods scan, the food link landing on the food, the cell
// split prompt, a resumable first run, and ticking off inside Plan The
// Week — views/foods.js v6, meals.js v26, mealPlan.js v5, settings.js v17,
// firstRun.js v3, planWeek.js v2.
// v80 (worklist E2/E8): 10 special-tier recipes (library 100 -> 110) and
// bulk shopping reminders — views/pantry.js v17.
// v79 (worklist E1/E3/E4/E5/E6): settings grouping, rotation mode, pantry
// search first, freshness per location, cooking lowers a level —
// views/settings.js v16, views/pantry.js v16, views/meals.js v25,
// data/restock.js v3, data/settings.js v9, components.css v51.
// v78 (worklist D1): ONE new path, js/data/cost.js. Prices —
// data/foods.js v5, data/shopping.js v3, views/foods.js v5,
// views/shopping.js v9, components.css v50.
// v77 (worklist C2/C3/C7/C9): alternatives, option names, reference foods
// in the picker, method notes — views/meals.js v24, data/meals.js v7,
// components.css v49.
// v76 (worklist C1/C4/C8/C10): dietary filter, dietary notes, in-place step
// editing, cook-for-a-number — views/meals.js v23, views/mealPlan.js v4,
// data/mealPlan.js v3, components.css v48.
// v75 (worklist B1/B2): tins not grams — lib/units.js v5,
// data/mealSteps.js v2, data/foodReference.js v2, views/foods.js v4,
// components.css v47.
// v74 (worklist A3): water and exercise reminders restored —
// lib/notify.js v3, views/dashboard.js v6, views/settings.js v14.
// v73 (worklist A2): the health screens — lib/icons.js v3, views/water.js
// v3, weight.js v5, exercises.js v5, health.js v4, components.css v46.
// v72: recipe library made findable (views/meals.js v22, navConfig v9) and
// worklist A1 — focus areas (bottomNav v3, firstRun v2, settings v13).
// v71: no code change — gate 9 added to the harness.
// v70 (Phase 32 part two): notificationclick handler, and delivery moved to
// registration.showNotification() — the v1 constructor does not work on
// Android at all, so Phase 32 shipped delivering nothing on a phone.
// v69 (Phase 31 part three): no path changes. Levels go stale —
// data/pantry.js v7, data/pantryMatch.js v3, lib/shortfall.js v5,
// views/pantry.js v15.
// v68 (Phase 30): no path changes. Household invites —
// data/household.js v2, views/settings.js v11, components.css v43.
// v67 (Phase 31 part two): no path changes. The stock sweep —
// views/pantry.js v14, components.css v42.
// v66 (Phase 31): no path changes. Bumped for rough pantry levels —
// data/pantry.js v6, data/pantryMatch.js v2, lib/shortfall.js v4,
// views/pantry.js v13, components.css v41.
// v65 (Phase 32): ONE new path, js/lib/notify.js. Bumped for
// views/settings.js v10, views/pantry.js v12, data/listSync.js v3.
// v64: recipe library 10 -> 100 across 14 cuisine files. Only index.json is
// precached; the cuisine files are still fetched on demand, which is why
// growing the library tenfold costs the precache nothing.
// v63 (Phase 25): ONE new path, js/data/staples.js. Also bumped for
// food_reference.json v2 (241 entries, +31 drinks and non-food),
// data/pantry.js v5, data/listSync.js v2, views/pantry.js v11,
// views/shopping.js v8.
// v62 (Phase 29): ONE new path, js/lib/dom.js. Twelve views changed to
// import from it rather than carrying their own copy.
// v61 (Phase 28, part two): no path changes. Bumped for the visual pass —
// lib/icons.js v2, views/health.js v3, kitchen.js v3, chores.js v5,
// pantry.js v10, components.css v40.
// v60 (Phase 28): ONE new path, js/components/emptyState.js. Also bumped
// for views/signin.js v2, health.js v2, calendar.js v2, exercises.js v4,
// weight.js v3, holidays.js v4, meals.js v21, shopping.js v7,
// components.css v39.
// v59 (Phase 27): ONE new path, js/views/firstRun.js. Also bumped for
// routes.js v4, navConfig.js v7, views/dashboard.js v5,
// views/settings.js v9, data/settings.js v7, components.css v38.
// v58 (Phase 23): no path changes. Bumped for the pantry restructure —
// views/pantry.js v9 and components.css v37.
// v57 (Phase 22): ONE new path, js/data/listSync.js. Also bumped for
// toast.js v2, restock.js v2, cookMode.js v2, views/mealPlan.js v3,
// views/shopping.js v6, views/meals.js v20, components.css v35.
// v56 (Phase 24): ONE new path, js/views/planWeek.js. Also bumped for
// routes.js v3, navConfig.js v6, views/dashboard.js v4, components.css v34.
// v55 (Phase 26): ONE new path, js/lib/icons.js. Bumped for tokens.css v2 —
// the first revision to that file since July — plus components.css v33,
// app.js v5, views/pantry.js v8 and views/settings.js v8.
// v54 (Phase 16): TWO new paths — js/data/recipeLibrary.js and
// data/recipe_library/index.json. The CUISINE FILES ARE NOT PRECACHED:
// the precache is all-or-nothing, and putting a growing library inside it
// would mean one bad path breaks the entire app. They are fetched on
// demand when the library panel is opened.
// v53 (Phase 14): ONE new path, js/data/pantryMatch.js. Also bumped for
// views/meals.js v18 and components.css v31.
// v52 (Phase 20): no path changes. Bumped for who-is-eating —
// data/mealPlan.js v2, views/mealPlan.js v2, lib/shortfall.js v3,
// views/shopping.js v5, components.css v30.
// v51 (Phase 19): no path changes. Bumped for ingredient options —
// data/meals.js v6, views/meals.js v17, lib/shortfall.js v2,
// components.css v29.
// v50 (Phase 15): TWO new paths — js/data/mealSteps.js and
// js/components/cookMode.js. Also bumped for views/meals.js v16,
// data/meals.js v5 and components.css v28.
// v49 (Phase 13): TWO new paths — js/data/foodReference.js and
// data/food_reference.json. The JSON is precached deliberately: it is the
// thing that makes the food form useful with no signal, and it is one file.
// v48: no path changes. Bumped for views/pantry.js v7 — the pantry FORM
// label now uses item_label, which v47 missed.
// v47 (Phase 12): no path changes. Bumped for pack labels — lib/units.js v4,
// data/foods.js v4, data/pantry.js v4, data/shopping.js v2, views/foods.js
// v2, views/pantry.js v6, views/shopping.js v4, views/meals.js v14.
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
const CACHE_NAME = 'home-os-shell-v84';
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
  './js/lib/icons.js',
  './js/lib/dom.js',
  './js/lib/notify.js',
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
  './js/data/foodReference.js',
  './js/data/mealSteps.js',
  './js/data/pantryMatch.js',
  './js/data/recipeLibrary.js',
  './data/food_reference.json',
  './data/recipe_library/index.json',
  './js/data/foodClaim.js',
  './js/data/restock.js',
  './js/data/listSync.js',
  './js/data/staples.js',
  './js/data/cost.js',
  './js/components/bottomNav.js',
  './js/components/toast.js',
  './js/components/confirmDialog.js',
  './js/components/liveRegion.js',
  './js/components/card.js',
  './js/components/scannerDialog.js',
  './js/components/claimDialog.js',
  './js/components/cookMode.js',
  './js/components/emptyState.js',
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
// ---- Phase 32 part two: tapping a notification ----
// Without this, a tap on Android opens a NEW window on the start URL, so
// somebody who was mid-recipe loses their place. Focus an existing window
// where there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('./');
    return undefined;
  })());
});

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
