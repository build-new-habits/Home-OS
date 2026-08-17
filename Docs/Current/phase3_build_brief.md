# Home-OS: Phase 3 Build Brief — Exercise Cards + Logging
19 Jul 2026 v1

Paste this **below** the Builder Chat Preamble in a fresh chat.

## Precondition
Phase 2 (shell) is complete and cleared: shell loads, auth works, router +
`routes.js` registry live, theming, settings, export, offline queue and
service worker all in place. Do not modify the database or any Phase 2 shared
file (`app.js`, `router.js`, `routes.js`, `tokens.css`, `supabaseClient.js`).

## Existing code you must wire into (the coordinator will paste these into the
chat — read them, do not modify them)
- `js/lib/offlineQueue.js` — use its **actual** delivered API for offline
  writes. Do not assume a signature; match what's in the file.
- `js/data/settings.js` and `js/views/settings.js` — your reference for the
  data-module shape (`{ ok, data|error }` returns, no `user_id` on insert)
  and the view `render(mountEl, params) → cleanupFn` contract, including how
  they use the live region / toast for announcements.
- Also read `PHASE2_HANDOFF.md` from project knowledge for the frozen
  integration contracts.

If the offline-queue API or the announce/toast helpers aren't clear from
those files, **stop and ask** — do not guess.

## What Phase 3 is
The exercises screen: show today's **cleared** exercises as cards, let the
user mark each done for today with one tap, stamp completed cards while
keeping them visible, and let the user add an exercise (defaulting to
"needs confirmation" unless it's from their physio). First feature to write
through the offline queue — so this also proves that Phase 2 seam under a
real feature.

## What NOT to do
- No other feature screens (chores, meals, etc. stay stubs).
- No new DB columns/tables. Use only `exercises` and `exercise_logs` columns
  from `schema.md §3`.
- No editing of Phase 2 shared files. You **replace** the `views/exercises.js`
  stub with the real view; you **add** new self-contained files.

## Files this phase creates
- `js/data/exercises.js` — **new.** All Supabase queries for this domain.
- `js/views/exercises.js` — **replaces the Phase 2 stub**, whole file.
- `js/components/card.js` — **new, shared, write-once.** Reusable accessible
  card container (chores and dashboard reuse it later).
- `js/components/completionStamp.js` — **new, shared, write-once.** The
  visible "Complete" done-state treatment; reduced-motion aware.

## Schema fields in scope (from `schema.md` — spell exactly)
- `exercises`: `name`, `side`, `target_reps`, `target_sets`, `instructions`,
  `youtube_search_query`, `body_region`, `source` ('physio'|'suggested'),
  `clearance_status` ('cleared'|'pending_confirmation').
- `exercise_logs`: `exercise_id` (FK, on delete cascade), `log_date`,
  `completed`, `notes`.
- Never pass `user_id` — it defaults to `auth.uid()`.

## Build steps

### 1. `js/data/exercises.js`
- `listCleared()` → exercises where `clearance_status = 'cleared'`, ordered by
  name; `{ ok, data }`.
- `listPending()` → exercises where `clearance_status = 'pending_confirmation'`.
- `getLogsForDate(logDate)` → `exercise_logs` for that date.
- `setDone(exerciseId, logDate, completed, existingLogId?)` → if a log exists
  for that exercise+date, update its `completed`; else insert one. Return
  `{ ok, data }`. **Offline:** if the write can't reach the network, enqueue
  through `offlineQueue` (its real API) and return a shape the view can treat
  as optimistic success.
- `addExercise({ name, side, target_reps, target_sets, instructions,
  youtube_search_query, body_region, fromPhysio })` → sets
  `source = fromPhysio ? 'physio' : 'suggested'` and
  `clearance_status = fromPhysio ? 'cleared' : 'pending_confirmation'`.
- `clearExercise(exerciseId)` → set `clearance_status = 'cleared'`.

### 2. `js/components/card.js`
A reusable presentational card: an `<article>` (or `<section>`) with a
programmatic accessible name from its heading, a content region, and an
actions region. No colour-only meaning. No business logic.

### 3. `js/components/completionStamp.js`
A visible "Complete" mark (text + optional icon, never colour alone), applied
to a card. Under `prefers-reduced-motion` it appears instantly with no
animation. Exposes a simple API to show the done state on a card element.

### 4. `js/views/exercises.js` (replaces stub)
- One `<h1>` "Exercises"; focus moves here on route entry (per Phase 2
  pattern).
- **Cleared list:** one `card` per cleared exercise showing name, side (if
  set), `target_sets` × `target_reps`, an expandable `instructions`, and a
  "Watch" link built **at render time** from `youtube_search_query`
  (`https://www.youtube.com/results?search_query=<encoded query>`) — never a
  stored URL.
- **One-tap Done** per card (≥ 44×44 px), writing today's `exercise_logs`
  via the data module. On success the card shows the `completionStamp` and
  **stays visible** (principle 3). Toggling off updates the log. Announce the
  result via the live region ("<name> marked done").
- Optional per-log `notes` behind an expander (principle 2 — not
  front-loaded).
- **Pending section:** exercises with `clearance_status =
  'pending_confirmation'` render in a separate, clearly **text-labelled**
  "Pending confirmation" group (not colour-only), each with a "Clear for use"
  action calling `clearExercise`. They are excluded from the cleared list
  until cleared (principle 6).
- **Add exercise** form (minimal required fields; rest behind an expander),
  including a labelled checkbox "This exercise was given by my physiotherapist"
  that drives `fromPhysio`. Default unchecked (cautious — stays pending).
- Never present anything as clinical advice (principle 6).
- Return a cleanup function that removes listeners.

## Principles in scope
3 (completion is physical; cards stay visible), 6 (health-data clearance),
2 (minimal fields, one-tap), 1 (neutral, no shame), 10 (offline logging).

## Offline availability of the new files
Daily-use screens must work offline. Read how the delivered
`service-worker.js` makes assets available offline:
- If it **precaches an explicit list**, add this phase's new files
  (`data/exercises.js`, `views/exercises.js`, `components/card.js`,
  `components/completionStamp.js`) to that list and bump the `CACHE_NAME`.
  Verify each path is correct — a single wrong path silently fails the whole
  precache (this happened in Phase 2).
- If it already does **runtime cache-first for same-origin modules**, no
  precache edit is needed.
State which path applied, and the exact change if any, in the handoff.

## Accessibility checklist (WCAG 2.2 / 2.1 AA) — gate
- Each card is an `<article>`/`<section>` with an accessible name (its
  heading). Headings in order under the single `<h1>`.
- Done is a real button, ≥ 44×44 px, visible focus, clear name
  ("Mark <name> done" / reflects done state, e.g. `aria-pressed`).
- Done state conveyed by the stamp's **text/icon**, not colour alone;
  announced via the live region.
- Pending-confirmation state carried by **text**, not colour alone.
- "Watch" links have descriptive names (not "click here").
- Add-exercise inputs have real `<label>`s; the physio checkbox is labelled;
  errors in text via `aria-describedby`.
- `prefers-reduced-motion`: stamp appears without animation.

## Builder self-review before presenting (state in handoff)
- Schema fidelity: only the listed columns; exact spelling; no `user_id` on
  insert.
- Imports resolve, relative paths for `/Home-OS/`; no edits to Phase 2 shared
  files.
- Offline write path uses the **real** `offlineQueue` API.
- Every a11y item above named pass/n-a/issue.
- No cross-project contamination.

## Live smoke test — coordinator runs before Phase 3 is cleared
(from `INTEGRATION_CHECKS.md`, Phase 3 block)
1. Mark an exercise Done → an `exercise_logs` row appears in Supabase with
   the right `exercise_id`, `log_date`, `completed=true`, and `user_id`
   populated on its own.
2. Completed card shows the stamp **and stays visible**.
3. Offline: mark Done offline → back online → the row syncs (proves the
   Phase 2 queue under a real feature).
4. A suggested (non-physio) add stays `pending_confirmation` and is
   **excluded** from the cleared list until cleared.
5. Keyboard-only pass; contrast on default + high-contrast; done state
   announced.

## Handoff
Fill in the handoff template. In "integration points", note the reusable
`card` and `completionStamp` component APIs (Phase 4 and Phase 9 reuse them)
and confirm the offline-availability approach you used for the new files.
