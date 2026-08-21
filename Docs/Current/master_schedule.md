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
| 5 | Weight + water tracker | **Complete — cleared 18 Aug** | phase5_build_brief.md |
| 6 | Meal planner + barcode scanning | **Active** | phase6_build_brief.md |
| 7 | Pantry stock + shopping list | Ready | to write |
| 8 | Holidays + work-location calendar | Ready | to write |
| 9 | Dashboard | Ready | to write |
| 10 | Notifications (opt-in, per-type) | Ready | to write |

Phase 5 cleared 18 Aug 2026 after three rounds of smoke testing. Phase 6 is
active; its brief is written. Phase 7's brief is gated on Phase 6 clearing.

## Completion log

**Phase 1 — Supabase.** Complete. 17/17/1/17; deletion rules verified.

**Phase 2 — Shell.** Complete, cleared 19 Jul. 7/7 smoke test. Supabase
vendored to `js/vendor/` for offline.

**Phase 3 — Exercises.** Complete, cleared 20 Jul. 5/5 smoke test. Reusable
`card.js` + `completionStamp.js` shipped.

**Phase 4 — Chores.** Complete, cleared 20 Jul. 6/6 smoke test. `rrule.js`
hand-verified across a year boundary. PM rulings: recurrence anchor on
`calendar_events.start_date` only — accepted, logged as tracked debt.

**Phase 5 — Weight + water.** Complete, cleared 18 Aug. Took three smoke-test
rounds; the offline path was wrong twice before it was right. Two defects in already-cleared code found by reading it before building
on it, and fixed:
- **Offline queue was not table-scoped** — `flush()` replayed every pending
  op through whichever handler it was given, so `exercises.js` would try to
  insert queued chore/weight/water rows into `exercise_logs`. Reproduced in a
  runtime test, then fixed via a `{ tables }` filter. Closes the "offline-
  write pattern drift" debt carried since Phase 4.
- **`units.js` rounding carry** — 69.8 kg rendered as "10st 14lb". Fixed, and
  the missing display-unit→kg input direction added.

Also this phase, all out-of-band: change-password with re-authentication and
a reset route for magic-link users; magic-link and password-reset sign-in
(`views/signin.js`); the `detectSessionInUrl` auth fix; an app-wide WCAG
1.4.11 control-contrast fix; `lib/net.js` offline/timeout guards; and
optimistic one-tap logging.

**Phase 5 smoke test — what it caught.** Three rounds. Round 1: offline
water logging did nothing (fetch hangs rather than failing, so the queue was
never reached); entry unit wrongly tied to display unit; password change
impossible for magic-link users. Round 2: a `ReferenceError` shipped to
`main` and broke the settings route — `node --check` passes undefined
identifiers. Round 3: the offline fix still awaited the network, disabling
the button after one tap; replaced with optimistic logging.

Worth stating plainly: **every one of those was found by testing on the real
device, not by any check run before commit.** The gates were strengthened
each round (rules 10–12), but the smoke test remains the thing that finds
what the gates do not.

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
`lib/rrule.js`. `supabaseClient.js` left the list on 17 Aug when its auth
config turned out to contain a bug (see below); it is *restricted* — client
configuration only. `app.js` is *restricted*, not frozen:
bootstrap and auth-state changes only.

## Auth bug, 17 Aug 2026 — `detectSessionInUrl`

Sign-in was broken end to end and the cause was one line in
`supabaseClient.js`: `detectSessionInUrl: false`.

supabase-js 2.45.4 defaults to implicit flow, so magic-link and
password-reset links return tokens in the URL hash. With detection off the
client never read them — the link "worked", then dropped the user back on
sign-in with no session and no error. Almost certainly set false in Phase 2
out of a reasonable fear of colliding with the hash router.

It does not collide: the client only treats a hash as a grant when it parses
an `access_token` or `error_description`, and `#/dashboard` parses to a
single valueless key. Verified against the vendored bundle before changing
it. `flowType` is now pinned to `implicit` explicitly, because that is what
preserves `type=recovery` — switching to `pkce` would silently turn every
password-reset link into an ordinary sign-in.

Lesson: **a defensive setting that is never exercised is a bug waiting for
the day the feature ships.** Phase 2 had no magic link and no reset, so
nothing tested this flag for a month.

## Verification gap found 18 Aug 2026 — `node --check` is not enough

A `ReferenceError` (`el is not defined`) shipped to `main` and broke the
settings screen. The pre-commit gate ran `node --check` on every changed
file and passed it, because `node --check` only parses syntax — an undefined
identifier is perfectly valid syntax and only fails when the line executes.
The call sat inside a click-adjacent branch that nothing exercised before
deploy.

Cause: a helper (`el()`) was copied from `views/weight.js` into
`views/settings.js`, which builds nodes with `document.createElement`
directly and has no such helper.

**Gate added:** every view is now rendered in jsdom against a stubbed
Supabase client before commit, which executes the module top to bottom and
surfaces exactly this class of error. Confirmed it catches the bug it was
written for. Static syntax checks stay, but they are no longer the last word.

Standing rule 12 below follows from this.

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
12. **Execute the code before committing it.** `node --check` proves syntax,
    not that a module runs. Render each changed view in jsdom against a
    stubbed client. Never copy a helper between files without confirming the
    destination defines it. *(New — 18 Aug)*

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
