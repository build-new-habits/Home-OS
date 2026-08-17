# Home PWA: Repository Structure
02 Jul 2026 v1

Fixed layout for the GitHub Pages repo. Every phase creates files in these
locations and nowhere else. The repo root is what GitHub Pages serves, so
`index.html` sits at the top level.

```
/                             repo root (served by GitHub Pages)
├── index.html                app shell: <head>, root containers, script entry
├── manifest.webmanifest      PWA manifest (name, icons, theme colour, display)
├── service-worker.js         precache app shell; offline strategy (Phase 2)
├── 404.html                  redirect stub for hash-router deep links on Pages
│
├── css/
│   ├── tokens.css            :root custom properties + theme/contrast/brightness
│   ├── base.css              reset, typography, layout primitives
│   └── components.css        component styles (reference var(--…) only)
│
├── js/
│   ├── config.js             SUPABASE_URL + SUPABASE_ANON_KEY (public)
│   ├── supabaseClient.js     creates + exports the single shared client
│   ├── app.js                bootstrap: load settings, apply theme, start router
│   ├── router.js             hash routing; mount/unmount + cleanup
│   │
│   ├── data/                 one module per domain; the only place Supabase is queried
│   │   ├── settings.js
│   │   ├── exercises.js
│   │   ├── chores.js
│   │   ├── calendar.js
│   │   ├── weight.js
│   │   ├── water.js
│   │   ├── foods.js
│   │   ├── meals.js
│   │   ├── mealPlan.js
│   │   ├── pantry.js
│   │   ├── shopping.js
│   │   └── holidays.js
│   │
│   ├── views/                one module per screen; export render(mountEl, params)
│   │   ├── dashboard.js
│   │   ├── exercises.js
│   │   ├── chores.js
│   │   ├── weight.js
│   │   ├── water.js
│   │   ├── meals.js
│   │   ├── pantry.js
│   │   ├── shopping.js
│   │   ├── holidays.js
│   │   └── settings.js
│   │
│   ├── components/           reusable UI pieces; export a factory or render fn
│   │   ├── card.js
│   │   ├── completionStamp.js
│   │   ├── confirmDialog.js
│   │   ├── toast.js
│   │   ├── bottomNav.js
│   │   └── liveRegion.js
│   │
│   └── lib/                  framework-free helpers
│       ├── store.js          minimal session state + subscribe
│       ├── dates.js          date/ISO helpers
│       ├── units.js          kg↔stone/lb, ml formatting (display only)
│       ├── rrule.js          recurrence expansion (Phase 4)
│       ├── offlineQueue.js   IndexedDB write queue + sync (Phase 2)
│       └── a11y.js           focus trap, announce(), reduced-motion helper
│
└── assets/
    └── icons/                PWA + UI icons (SVG preferred)
```

## Rules

- **No file is created outside this tree.** New domain → new `data/` module;
  new screen → new `views/` module; new reusable UI → new `components/`
  module.
- **A file is owned by one phase per block** (PROJECT_BLUEPRINT.md §3). If a
  later phase must change an earlier file, note it in that phase's handoff.
- **Import direction is one-way:** `views` import `data`, `components`, and
  `lib`. `data` imports `supabaseClient` and `lib` only. `components` and
  `lib` import nothing from `views` or `data` (keeps them reusable and
  prevents cycles).
- **Which files each phase creates** is listed at the top of that phase's
  instruction file, so no two sessions collide on the same file unplanned.
