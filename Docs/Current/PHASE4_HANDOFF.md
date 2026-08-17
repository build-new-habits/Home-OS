# Home-OS Handoff — Phase 4: Chores (Projects, Tasks, Recurrence, Calendar)
20 Jul 2026 v1 — Phase cleared, live smoke test passed

## Process note
This phase was built directly in the PM/architect chat rather than through
the normal PM → fresh builder chat → handoff loop (BUILD_PROCESS_CONTROL.md).
The coordinator supplied the required existing-code files
(`offlineQueue.js`, `card.js`, `completionStamp.js`, `confirmDialog.js`,
`views/exercises.js`, `components.css`, `service-worker.js`) directly in
chat instead. Self-review and reconciliation below cover the same ground
the normal loop would have.

## Live smoke test results (INTEGRATION_CHECKS.md, Phase 4 block)

| # | Check | Result |
|---|---|---|
| 1 | Repeatable task confirmation preview shows correct dates (daily, weekly multi-day, monthly) | ✅ Pass |
| 2 | Occurrences appear on the calendar; one `calendar_events` row per task | ✅ Pass |
| 3 | Complete → status/completed_at set, stamp shows, card stays visible | ✅ Pass |
| 4 | Delete a project with tasks → confirm reports task count, blocks deletion | ✅ Pass |
| 5 | Offline create/complete → syncs on reconnect | ✅ Pass |
| 6 | Keyboard-only pass; contrast default + high-contrast | ✅ Pass |

Run against the real deployed site and real Supabase project.

## What shipped (final file list)
- `js/lib/rrule.js` (v1) — new, shared, write-once
- `js/data/chores.js` (**v2**) — new; v2 fixes a silent-failure bug (see below)
- `js/data/calendar.js` (v1) — new
- `js/views/chores.js` (**v2**) — replaces the Phase 2 stub; v2 adds task
  editing, which v1 shipped without
- `css/components.css` (v4) — whole file, additive rules for projects/
  tasks/recurrence preview/calendar
- `service-worker.js` (**v6**) — precache list extended with the three new
  files; `js/views/chores.js` needed no list addition (already present as
  the stub's placeholder), only its content changed

## Locked architectural decision (made this session, not pre-specified)
`chore_tasks` has no `start_date` column in `schema.md`, but recurrence
needs an anchor date and `calendar_events.start_date` is `not null`.
Resolved by collecting the "Starts on" date in the recurrence builder UI
and storing it **only** in `calendar_events.start_date` — `chore_tasks`
itself is untouched, no schema change needed. Reversible if the PM/
coordinator would rather add the column instead; flagged rather than
silently decided.

## Bugs found and fixed before live testing (self-caught, via parity check)
**1. Silent-failure bug in the offline replay path (`data/chores.js` v1 → v2).**
`applyQueuedOp()` returned the Supabase call directly instead of checking
its `error` field. Since `supabase-js` resolves (doesn't reject) on a
database-level error such as a check-constraint violation, `offlineQueue.flush()`
would have treated a failed queued write as successful and silently
deleted it from the queue — a direct violation of the project's "no silent
failures" rule (`GEMINI_BUILD_CONVENTIONS.md` §10). Caught by diffing
against the coordinator-supplied `data/exercises.js`, which already
handled this correctly (`if (error) throw error;` after every Supabase
call before treating it as done). Fixed to match.

## Known limitations, documented rather than hidden
- **Offline + repeatable task creation:** the task itself queues and syncs
  correctly, but its `calendar_events` row is not created until the task
  is reopened and re-saved after the sync completes. `data/chores.js`
  deliberately does not import `data/calendar.js` to create it inline —
  doing so would violate `REPO_STRUCTURE.md`'s "data imports
  `supabaseClient` and `lib` only" rule. Surfaced to the user via toast at
  save time. A cleaner fix (e.g. a reconciliation step after flush) is a
  candidate for a future small polish pass, not blocking for this phase.
- Two minor asymmetries between `data/chores.js`'s offline-write pattern
  and `data/exercises.js`'s: a queued **update** doesn't return synthetic
  `data` (only `exercises.js`'s does, for its inserts), and a failed
  `enqueue()` call surfaces the original write error rather than the
  queue error. Neither affects current behaviour since the view doesn't
  depend on either; noted for consistency if this pattern gets reused in
  Phase 5+.

## Self-review (final state)
- Schema fidelity: **pass** — only `chore_projects`/`chore_tasks`/
  `calendar_events` columns from `schema.md §3`; no `user_id` on any insert.
- One `calendar_events` row per repeatable task, not one per occurrence: **pass**.
- `rrule.expand()` hand-verified (not just read) on a daily, a multi-day
  weekly, and a monthly rule crossing a year boundary — dates confirmed
  correct by running the code, not by inspection. Invalid `BYMONTHDAY`
  input correctly rejected.
- Imports resolve, relative `/Home-OS/`; no edits to write-once shared
  files (`app.js`, `router.js`, `routes.js`, `tokens.css`,
  `supabaseClient.js`): **pass**.
- `css/components.css` returned whole each time, not a fragment (the
  Phase 3 mistake, deliberately avoided): **pass**.
- Offline write path uses the real `offlineQueue` API as supplied,
  confirmed working live (bug above notwithstanding, since caught and
  fixed pre-deployment): **pass**.
- Accessibility: keyboard-only pass and contrast (default + high-contrast)
  confirmed live by the coordinator, not just by construction.
- No cross-project contamination: **pass**.
- Precache paths: all verified present via the deployed `home-os-shell-v6`
  Cache Storage entry (40 files, matching the full `SHELL_FILES` list) —
  confirmed by the coordinator directly in DevTools rather than the
  curl-script route.

## Deviations from the original brief
- Task **edit** form shipped in a v2 pass after being initially missed in
  v1 — closed same-session, not carried forward as a gap.
- Recurrence anchor date (`start_date`) lives only on `calendar_events`,
  per the locked decision above — the brief didn't specify where this
  should live.

## Phase 4: CLEARED
Live smoke test passed on the real deployed site and Supabase project.
Every deviation and bug is named above with cause and fix. Ready for
Phase 5 (`Weight + water tracker`) brief to be written.
