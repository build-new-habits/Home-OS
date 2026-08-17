# Home-OS: Master Schedule
17 Aug 2026 v7

Supersedes v6. Older versions live in `Docs/Archive/`.

**This file now lives in the repo** (`Docs/Current/master_schedule.md`), not
only in project knowledge. The repo copy is canonical — if the two disagree,
the repo wins, because it is versioned alongside the code it describes.

## Canonical documents
All in `Docs/Current/`:
- `00_vision.md`, `01_behavioural_principles.md`, `PROJECT_BLUEPRINT.md`
- `schema.md` — **single source of truth for the database.**
- `GEMINI_BUILD_CONVENTIONS.md` — how code is written (incl. WCAG 2.2/2.1 AA).
- `REPO_STRUCTURE.md` — fixed repo layout.
- `INTEGRATION_CHECKS.md` — per-phase seam tests.
- `BUILD_PROCESS_CONTROL.md`, `BUILDER_CHAT_PREAMBLE.md` — the loop.
- `PHASE2_HANDOFF.md` … `PHASE5_HANDOFF.md` — records later phases read for
  the contracts they wire into.
- `phaseN_build_brief.md` — the task for phase N.

## Phase status

| Phase | Scope | Status | Brief |
|---|---|---|---|
| 1 | Supabase foundation | **Complete** | phase1_instructions.md |
| 2 | Shell + auth + nav + theming + settings + export + offline | **Complete** | phase2_build_brief.md |
| 3 | Exercise cards + logging | **Complete** | phase3_build_brief.md |
| 4 | Chores: projects, tasks, calendar, recurrence | **Complete** | phase4_build_brief.md |
| 5 | Weight + water tracker | **Built — awaiting smoke test** | phase5_build_brief.md |
| 6 | Meal planner + barcode scanning | Next | to write |
| 7 | Pantry stock + shopping list | Ready | to write |
| 8 | Holidays + work-location calendar | Ready | to write |
| 9 | Dashboard | Ready | to write |
| 10 | Notifications (opt-in, per-type) | Ready | to write |

Phase 5 is **not cleared**. Phase 6's brief is gated on the Phase 5 smoke
test passing on the live site and real Supabase project.

## Completion log

**Phase 1 — Supabase.** Complete. 17/17/1/17; deletion rules verified.

**Phase 2 — Shell.** Complete, cleared 19 Jul. 7/7 smoke test. Supabase
vendored to `js/vendor/` for offline.

**Phase 3 — Exercises.** Complete, cleared 20 Jul. 5/5 smoke test. Reusable
`card.js` + `completionStamp.js` shipped.

**Phase 4 — Chores.** Complete, cleared 20 Jul. 6/6 smoke test. `rrule.js`
hand-verified across a year boundary. PM rulings: recurrence anchor on
`calendar_events.start_date` only — accepted, logged as tracked debt.

**Phase 5 — Weight + water.** Built 17 Aug, commit `860d2b3`. Awaiting smoke
test. Two defects in already-cleared code found by reading it before building
on it, and fixed:
- **Offline queue was not table-scoped** — `flush()` replayed every pending
  op through whichever handler it was given, so `exercises.js` would try to
  insert queued chore/weight/water rows into `exercise_logs`. Reproduced in a
  runtime test, then fixed via a `{ tables }` filter. Closes the "offline-
  write pattern drift" debt carried since Phase 4.
- **`units.js` rounding carry** — 69.8 kg rendered as "10st 14lb". Fixed, and
  the missing display-unit→kg input direction added.

Also this phase: a **change-password** form in settings (out-of-band request,
outside the brief) with re-authentication before the change is applied.

## Process change — direct repo access (from 17 Aug 2026)

The coordinator supplied a GitHub token, so the architect chat now reads the
repo and commits to `main` directly. This replaces copy-paste deployment.

What this changes:
- **Reference files are read, not pasted.** This is why Phase 5 found two
  defects in cleared code — the paste-based flow only ever showed the files a
  brief thought to ask for.
- **Whole-file delivery in chat no longer applies**, but the discipline does:
  any file rewritten in full is diffed against its previous content to prove
  nothing was dropped.
- **Verification moved earlier.** Import/export resolution, contrast maths,
  syntax and behavioural tests now run before the commit, not after deploy.

What this does **not** change:
- The coordinator still runs the live smoke test. The build sandbox cannot
  reach `*.github.io` (`host_not_allowed`), so nothing here substitutes for
  testing in a real browser against real Supabase.
- Phases are still gated. Built ≠ cleared.

**Open question for Phase 6:** whether separate builder chats are still
worth the overhead now that the architect chat can read and commit directly.
Decide deliberately rather than defaulting.

## Write-once rule amended (17 Aug 2026)

`js/app.js` was declared write-once in Phase 2, but it also owned the entire
sign-in UI — so *any* change to authentication forced an edit to it. The rule
was unworkable as written.

Amended: **`app.js` owns bootstrap and auth state; auth UI lives in
`js/views/signin.js`.** The sign-in screen was extracted there whole. app.js
retains only the state machine (`getSession`, `onAuthStateChange`).

Write-once files are now: `router.js`, `routes.js`, `tokens.css`,
`supabaseClient.js`, `lib/rrule.js`. `app.js` is *restricted*, not frozen:
bootstrap and auth-state changes only.

## Standing rules (apply to every later phase)

1. **Constrain UI inputs to the schema** — enum/`CHECK` columns get a
   `<select>`/constrained control, never free text. (P3 bug #1)
2. **`css/components.css` delivered whole**, never a fragment. (P3 bug #2)
3. **Bump `CACHE_NAME` on any precached content change**, even if the SW
   script is otherwise unchanged. (P3 bug #3)
4. **Precache is all-or-nothing** — every path must 200, or install fails
   silently and the whole shell stays stale.
5. **Check the `error` field on every Supabase call** before treating an op
   as done — `supabase-js` resolves rather than rejects on DB errors.
6. **No silent failures** — queue failures are logged explicitly.
7. **Every data module must pass `{ tables }` to `flush()`** and assert
   `op.table` in its handler. Omitting the filter reintroduces the Phase 5
   bug for every table in the queue. *(New — P5)*
8. **Never hardcode a credential.** The repo is public and Pages serves the
   JS to anyone; the publishable key is safe only because RLS is the
   boundary. *(New — P5)*
9. **File version headers increment within a session** when content changes,
   not only across days.
10. **A control's boundary must clear 3:1** where nothing else identifies it.
    Use `--control-border`, not `--color-border`, for anything interactive.
    Container borders stay decorative. *(New — P5 audit)*
11. **Compute contrast for all four theme combinations**, not just the
    default. The 1.4.11 failure below sat undetected from Phase 2 because
    only the default theme was ever checked by eye. *(New — P5 audit)*

## Tracked debt

| Item | Origin | Status |
|---|---|---|
| Data-module offline-write drift | P4 | **Closed P5** |
| Offline linked-row creation for repeatable chores | P4 | Open |
| Phase 9 join: `chore_tasks` × `calendar_events`, large future-dated volumes | P4 | Open — address in the P9 brief |
| Water glass size / daily target not configurable | P5 | Open — needs `user_settings` columns |
| High-contrast + dusk theme contrast | P5 | **Closed P5** — all four combinations computed |
| Control-boundary contrast, 1.4.11 (pre-existing, P2) | P5 audit | **Closed P5** — `--control-border` |
| GitHub token scoped to all 13 org repos | P5 | Open — narrow to `Home-OS` and rotate |
