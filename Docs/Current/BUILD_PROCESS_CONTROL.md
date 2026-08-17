# Home-OS: Build Process Control
14 Jul 2026 v1

How the build runs. This is for you (the human coordinator). It defines who
does what, and the gates that stop a shaky phase reaching the next one.

## Roles

- **PM / integration owner (this chat).** Holds the whole build and the
  wiring. Writes each phase's build brief. Reconciles every handoff against
  the master plan before a phase is declared sound. Issues corrections.
  Never loses the big picture.
- **Builder (a fresh chat per phase).** Takes one brief, writes the whole
  files for that phase, **self-reviews and refines before presenting**, and
  returns a completed handoff. Knows only what its brief and the frozen docs
  tell it — it does not carry history between phases.
- **You.** Move briefs and handoffs between the two, commit files to the
  repo, and run the live Supabase/browser smoke test that proves a phase is
  sound before the next begins.

## The loop, per phase

1. PM writes the **build brief** → you paste it into a new builder chat.
2. Builder produces **whole files**, self-reviews them, and returns a
   **handoff report** (fixed template).
3. You commit the files and run the **live smoke test** in the brief.
4. You bring the handoff (and any test results) back to the PM.
5. PM reconciles: clears the phase, or issues a correction.
6. Only when a phase is cleared does the next brief get written.

## Gate rules (a phase is not "done" until all true)

- Every file in the brief's file list was delivered, whole, with a version
  header.
- The builder's self-review checklist passed (stated in the handoff).
- The live smoke test in the brief passed on your real Supabase + browser.
- Any deviation from the brief is named in the handoff with a reason.
- The PM has reconciled the handoff and explicitly cleared the phase.

If any of these is missing, the phase stays open and nothing is built on it.

## Two kinds of error, handled differently

- **Avoidable mistakes** (contradicting the frozen schema, a missing
  `user_id`, wrong paths, stray brackets): these are designed out by the
  brief and caught by the builder's mandatory self-review. They should be
  exceedingly rare, and are the PM's responsibility to prevent.
- **Live-environment truths** (a browser/Supabase behaviour only the real
  runtime reveals): these are *why* you smoke-test each phase before moving
  on. Finding one is the process working, not a failure.

## Architecture principle that keeps files stable

The build uses **write-once, extend-by-addition**:

- A small number of **gating/shared files** (the entry point, the theme
  tokens, the route registry, the router) are written **once** in Phase 2
  and then left alone.
- Every later phase adds **new, self-contained files** (its own data module,
  its own view) or **replaces a whole stub file** with the real one — it does
  not surgically edit shared files.
- This is what prevents "edit the same file ten times, introduce a bug on
  edit seven."

## Document set the builder always reads

`00_vision.md`, `01_behavioural_principles.md`, `PROJECT_BLUEPRINT.md`,
`schema.md`, `GEMINI_BUILD_CONVENTIONS.md` (the build conventions — they
apply to any builder, Claude included, despite the name), `REPO_STRUCTURE.md`,
`INTEGRATION_CHECKS.md`, plus that phase's build brief. Keep these current in
project knowledge; remove superseded versions so nothing stale is read.
