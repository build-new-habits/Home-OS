# Home PWA: Master Schedule
18 Jul 2026 v3

## Canonical documents (read all before any session)
- `00_vision.md` — why this exists, what "good" looks like.
- `01_behavioural_principles.md` — how it behaves (10 principles).
- `PROJECT_BLUEPRINT.md` — the how: session discipline, security posture.
- `schema.md` — **single source of truth for the database.**
- `GEMINI_BUILD_CONVENTIONS.md` — how code is written, every phase (incl.
  WCAG 2.2/2.1 AA baseline).
- `REPO_STRUCTURE.md` — fixed repo layout (now includes `js/vendor/` —
  added in Phase 2, see completion log).
- `master_schedule.md` — this file: active phase + status.
- `phaseN_instructions.md` / `phaseN_build_brief.md` — the task for phase N.
- `PHASE2_HANDOFF.md` — full record of the Phase 2 build, reconciliation,
  and the four live-testing bugs found and fixed.

## Standard prompt — paste at the start of every builder session

> I'm working on the Home-OS project. Before doing anything, read
> `00_vision.md`, `01_behavioural_principles.md`, `PROJECT_BLUEPRINT.md`,
> `schema.md`, `GEMINI_BUILD_CONVENTIONS.md`, `REPO_STRUCTURE.md`, and
> `master_schedule.md` from project knowledge. Confirm the current active
> phase and its status. Today's task is in `[phase]_build_brief.md` —
> follow it exactly. Do not deviate from `schema.md` or add anything not in
> this session's instructions. Every file you produce carries a
> `DD Mon YYYY vN` header stating its own repo path, and follows the build
> conventions, including the accessibility checklist. When done, tell me
> what you built and what still needs manual verification, then produce a
> handoff and the `master_schedule.md` update.

## Phase status

| Phase | Scope | Status | Instructions file |
|---|---|---|---|
| 1 | Supabase project (fresh): 17 tables, updated_at trigger, user-scoped RLS | **Complete** | phase1_instructions.md |
| 2 | Shell + auth + navigation + theming + settings + data export | **Complete** | phase2_build_brief.md |
| 3 | Exercise cards + logging | Active | phase3_instructions.md (to be written) |
| 4 | Chores: projects, tasks, calendar, recurrence, completion stamp | Ready | phase4_instructions.md |
| 5 | Weight + water tracker | Ready | phase5_instructions.md |
| 6 | Meal planner + barcode scanning | Ready | phase6_instructions.md |
| 7 | Pantry stock + shopping list | Ready | phase7_instructions.md |
| 8 | Holidays + work-location calendar | Ready | phase8_instructions.md |
| 9 | Dashboard | Ready | phase9_instructions.md |
| 10 | Notifications (opt-in, per-type) | Ready | phase10_instructions.md |

## Completion log

**Phase 1 — Supabase setup.** Complete. 17 tables, 17 policies, 1 trigger
function, 17 update triggers. Structural counts confirmed in the SQL
editor; auth + RLS end-to-end proof deferred to Phase 2 by design (the
editor runs as an admin role, `auth.uid()` is null there).

**Phase 2 — Application shell.** Complete 18 Jul 2026. Full live smoke
test (7/7 checks) passed against the real deployed site and real Supabase
project — see `PHASE2_HANDOFF.md` for the complete record. Four real bugs
were found during live testing and fixed, not just simulated:
1. A double-rendered dashboard on first sign-in (Supabase firing a
   duplicate auth event; router had no protection against overlapping
   renders) — fixed in `app.js` and `router.js`.
2. A deploy-only issue (a file uploaded as `settings.j` instead of
   `settings.js`) that cascaded into failing the entire offline precache
   — not a code defect, fixed by renaming the file in the repo.
3. An accessibility gap — the bottom nav's active-item state relied on
   colour alone — fixed with a non-colour indicator (border + weight).
4. A complete offline failure caused by a runtime CDN dependency
   (`esm.sh`) in `supabaseClient.js` — fixed by vendoring
   `@supabase/supabase-js` locally as a same-origin, precached file. This
   also closes the "CDN vs vendored" open question from the original
   handoff.

`REPO_STRUCTURE.md` gained one new folder as a result: `js/vendor/`, for
the vendored Supabase bundle — not in the original canonical structure,
flagged as a deviation.

## Rules
- No phase starts until the previous phase is marked complete here and any
  schema change it introduced is reflected in `schema.md` first.
- Each phase gets its own `phaseN_instructions.md` (or `_build_brief.md`),
  written before that session — not live during it.
- Every file carries a `DD Mon YYYY vN` header stating its own repo path.
- At the end of any session that changes scope, produces new specs, or
  completes a phase: update this table + completion log, bump the version,
  remove superseded files from project knowledge, upload the new ones.
