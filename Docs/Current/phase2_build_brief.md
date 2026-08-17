# Home-OS: Phase 2 Build Brief — Application Shell
14 Jul 2026 v1

Paste this **below** the Builder Chat Preamble in a fresh chat.

## Precondition
Phase 1 (database) is complete and verified: 17 tables, 17 policies, 17
triggers, `updated_at` on all tables, deletion rules per `schema.md §2`. Do
not modify the database in this phase.

## What Phase 2 is
The shell every later phase hangs on. When it's done: the app loads on GitHub
Pages, authenticates the single user, applies their saved theme, navigates
between views, lets them edit settings live, exports all their data as JSON,
and opens offline. **No feature screens** — exercises, chores, meals, etc. are
empty stubs this phase; they're filled in Phases 3–9.

## What NOT to do this phase
- No feature logic (no exercise/chore/meal/etc. behaviour).
- No new database columns or tables.
- No third-party UI frameworks or bundlers — vanilla JS ES modules only.

---

## The gating-file architecture (build these to be written ONCE)

These files are created now and then **left alone** for the rest of the
build. Design them to be extended by *addition*, not editing:

- **`js/app.js`** — the single entry point. Boots the app: initialises the
  Supabase client, checks the session, loads settings, applies theme, starts
  the router. Later phases do **not** edit this.
- **`js/routes.js`** — a declarative **route registry** listing all ten
  routes up front (see spec below). Written complete now; **never edited
  again**. Later phases simply replace the stub view file each route points
  at.
- **`js/router.js`** — reads `routes.js`, handles hash navigation, mounts the
  matched view, and calls the previous view's cleanup. Write-once.
- **`css/tokens.css`** — the complete design-token set (colours, spacing,
  radius, font sizes) as `:root` custom properties, plus the
  `[data-theme]/[data-contrast]/[data-brightness]` overrides. Written
  complete now; later phases *use* tokens, they don't add to this file.

## Route registry spec (`js/routes.js`)

Export an array of route objects. Each entry:

```js
// { path, title, nav, navOrder, load }
{
  path: 'water',                          // hash route: #/water
  title: 'Water',                          // used for <h1> and nav label
  nav: true,                               // show in the persistent bottom nav
  navOrder: 3,                             // left-to-right order when nav:true
  load: () => import('./views/water.js')   // lazy-load the view module
}
```

Include **all ten** routes now, pointing at their view files:
`dashboard`, `exercises`, `chores`, `weight`, `water`, `meals`, `pantry`,
`shopping`, `holidays`, `settings`. Choose sensible `nav` items for daily use
(dashboard, plus the one-tap daily actions) and leave weekly/occasional ones
off the bottom nav (reachable another way) — you decide the nav set and note
it in the handoff. Default route is `dashboard`.

Each **view module** exports:
```js
export function render(mountEl, params) { /* build DOM */ return cleanupFn; }
```
For Phase 2, `settings.js` is fully built; `dashboard.js` shows a minimal
"today" placeholder; the other eight are **stubs** — a single `<h1>` with the
route title and a "Coming soon" line, correct and accessible, ready to be
replaced whole by their feature phase.

---

## Files to create (exhaustive)

Per `REPO_STRUCTURE.md`, using relative paths for the `/Home-OS/` subpath:

- `index.html` — shell: `<head>`, `<main id="app">`, live-region container,
  bottom-nav container; loads `./js/app.js` as `type="module"`.
- `manifest.webmanifest` — name, icons, theme colour, `display: standalone`,
  `start_url` and `scope` correct for the `/Home-OS/` subpath.
- `service-worker.js` — precache **only real Home-OS shell files** (list them
  explicitly); network-first for data, cache-first for the shell; correct
  relative scope. **No path from any other project.**
- `404.html` — redirect stub so hash-router deep links work on GitHub Pages.
- `css/tokens.css`, `css/base.css`, `css/components.css`.
- `js/config.js` — see values below.
- `js/supabaseClient.js` — creates and exports the single shared client.
- `js/app.js`, `js/router.js`, `js/routes.js`.
- `js/lib/store.js` (session state + subscribe), `js/lib/a11y.js`
  (focus move, `announce()`, reduced-motion), `js/lib/offlineQueue.js`
  (IndexedDB write queue scaffolding + flush-on-reconnect), `js/lib/dates.js`,
  `js/lib/units.js` (kg↔stone/lb, ml formatting — display only).
- `js/data/settings.js` — get/upsert the single `user_settings` row; export
  all 17 tables as JSON.
- `js/components/bottomNav.js`, `components/toast.js`,
  `components/confirmDialog.js`, `components/liveRegion.js`.
- `js/views/settings.js` (full), `views/dashboard.js` (minimal), and stub
  `views/` files for exercises, chores, weight, water, meals, pantry,
  shopping, holidays.

## Config values (`js/config.js`)

```js
// 14 Jul 2026 v1
export const SUPABASE_URL = 'https://vkjwwnjhizrlqcovpdco.supabase.co';
export const SUPABASE_ANON_KEY = 'REPLACE_WITH_PUBLISHABLE_KEY';
```
Leave the key as this placeholder; the coordinator pastes the real
publishable key. Do not invent a key. (Publishable/anon key is public-safe;
RLS is the security boundary. Never reference a service/secret key.)

## Auth

- Supabase **email + password**, single user. Session **persists** (default),
  so the user logs in once and stays in.
- If no session: render a minimal, accessible sign-in view (email + password,
  labelled inputs, text errors). If session exists: render the shell.
- Provide a sign-out control in settings.

## Theming contract (behavioural principle 7)

- All theme state lives as `data-theme`, `data-contrast`, `data-brightness`
  attributes on `<html>`, driving token overrides in `tokens.css`.
- `app.js` applies them from `user_settings` on boot.
- The settings view changes them **live** (no save button); each change
  upserts `user_settings` and updates the attribute immediately.

## Data export (behavioural principle 9)

- A button in settings exports **all 17 tables** for the user as one
  human-readable JSON file (pretty-printed) and triggers a download.

## Offline (behavioural principle 10)

- `service-worker.js` precaches the shell so the app opens with no network.
- `offlineQueue.js`: stand up the IndexedDB queue and the reconnect flush now
  (feature phases will enqueue through it). It doesn't need feature writes
  yet — just the working mechanism and a clear API (e.g.
  `enqueue(op)` / `flush()`).

---

## Accessibility checklist (WCAG 2.2 / 2.1 AA) — gate

- One `<h1>` per view; headings in order; `<main>` and `<nav>` landmarks.
- Sign-in and settings inputs have real associated `<label>`s; errors in text
  tied via `aria-describedby`; no placeholder-as-label.
- Bottom-nav items are real links/buttons, ≥ 44×44 px, visible focus, current
  marked `aria-current="page"`.
- On route change, focus moves to the new view's `<h1>`; focus is never
  trapped or hidden behind sticky elements (2.4.11).
- `liveRegion` (`aria-live="polite"`) announces "settings saved",
  "exported", "offline", sign-in errors.
- Every theme + the high-contrast setting pass contrast (text ≥ 4.5:1,
  UI ≥ 3:1). Status never conveyed by colour alone.
- `prefers-reduced-motion` respected on any transition.

## Builder self-review before presenting (state results in handoff)
Run the mandatory self-review from the preamble, and specifically confirm:
- `routes.js` lists all ten routes and `router.js` resolves each without
  error; stub views render.
- No file imports a path that doesn't exist; all paths relative.
- `service-worker.js` precache list contains only files you actually created;
  no foreign/`alongside` paths.
- No `user_id` passed on any insert/upsert; `user_settings` uses upsert.

## Live smoke test — the coordinator runs this before Phase 2 is cleared
(from `INTEGRATION_CHECKS.md`, Phase 2 block)
1. Log in → shell loads; sign out → gated again; session survives reload.
2. Change theme / contrast / brightness → whole app restyles instantly and
   persists across reload.
3. Bottom nav switches views; current item marked; focus moves to the new
   `<h1>` on route change.
4. Export JSON → downloads, contains rows from all 17 tables.
5. **Auth + RLS proof (deferred from Phase 1):** in the Supabase table
   editor, the settings row the app wrote has `user_id` populated on its own,
   matching your auth user id.
6. Network offline → the app shell still opens and navigates.
7. Full keyboard-only pass from load to changing a setting; contrast check on
   default and high-contrast.

## Handoff
Fill in the handoff template from the preamble. In "integration points",
document the `routes.js` entry shape, the view `render()` contract, and the
`offlineQueue` API, since Phases 3+ depend on them.
