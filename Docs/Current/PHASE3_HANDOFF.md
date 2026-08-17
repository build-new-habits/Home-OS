# Home-OS Handoff — Phase 3: Exercise Cards + Logging (final)
20 Jul 2026 v1 — Phase cleared, all live smoke test checks pass

## Live smoke test results (INTEGRATION_CHECKS.md, Phase 3 block)

| # | Check | Result |
|---|---|---|
| 1 | Mark Done → `exercise_logs` row appears with correct `exercise_id`, `log_date`, `completed=true`, `user_id` auto-populated | ✅ Pass |
| 2 | Completed card shows the stamp and stays visible | ✅ Pass |
| 3 | Offline: mark Done offline → back online → row syncs via the Phase 2 queue | ✅ Pass (confirmed via IndexedDB `pending-writes`: 0 entries post-sync) |
| 4 | Suggested (non-physio) add stays `pending_confirmation`, excluded from cleared list until cleared | ✅ Pass |
| 5 | Keyboard-only pass; contrast (default + high-contrast); done state announced via live region | ✅ Pass |

All run against the real deployed site and real Supabase project.

## What shipped (final file list)
- `js/data/exercises.js` (v2) — new
- `js/views/exercises.js` (v3) — replaces Phase 2 stub
- `js/components/card.js` (v1) — new, shared, write-once
- `js/components/completionStamp.js` (v2) — new, shared, write-once
- `css/components.css` (v3) — additive rules for cards/fields; no existing rules changed
- `service-worker.js` (v5) — precache list extended with the four new files

## Bugs found during live testing (all fixed, all now verified passing)

**1. `side` check-constraint violation (real schema bug, not simulated).**
The "Side" field was free text; the DB column has `CHECK (side in ('left','right','both'))`, lowercase only. Entering "Both" produced a 400. Fixed two ways: the Side field is now a `<select>` constrained to exactly the schema's allowed values (can no longer submit an invalid one), and `data/exercises.js` also lowercases defensively before insert as a second line of defence.

**2. Build mistake — `components.css` "additive" append silently dropped the whole file.**
When first asked to add card/form spacing rules, I appended to a file that didn't exist yet in my workspace, so the file I delivered contained only the new rules — none of your existing button/field/nav/toast/dialog CSS. This broke the bottom nav (lost icons/active-state styling) and all form spacing across the app, not just the new exercise cards. Root-caused from your screenshots (nav rendering as plain text links) and fixed by rebuilding the complete file (your v2 content + the new rules, nothing removed). Flagging clearly since this was my error, not a live-environment finding — a full-file diff check before presenting would have caught it.

**3. Service worker cache not refreshing after a components.css-only change.**
Related to #2: fixing the CSS wasn't enough on its own — since `service-worker.js`'s own bytes hadn't changed, the browser never re-ran `install` and kept serving the old cached (broken) CSS indefinitely, not just on the first load. Fixed by bumping `CACHE_NAME` whenever any precached file's *content* changes, even if the service worker script itself is otherwise untouched. Worth carrying forward as a rule for future phases.

**4. Pending exercises showed name + status only, not full details.**
Not a defect against the brief's letter, but a real gap against principle 6 (health data handled carefully) — a suggested exercise should be reviewable before clearing it for use, same as a cleared one. Fixed by factoring detail rendering into a shared `appendExerciseDetails()` used by both cleared and pending cards.

**5. Offline queue failures were silently swallowed.**
`flush()`'s per-op failures were caught internally and never logged, which violates the "no silent failures" rule regardless of whether this specific run hit it. Fixed: the `online` listener now logs each failed op with its error individually.

## Self-review (final state)
- Schema fidelity: **pass** — only `exercises`/`exercise_logs` columns from `schema.md §3`; no `user_id` on any insert.
- Imports resolve, relative, `/Home-OS/`: **pass**.
- No edits to Phase 2 shared files (`app.js`, `router.js`, `routes.js`, `tokens.css`, `supabaseClient.js`): **pass**.
- Offline write path uses the real `offlineQueue` API (`enqueue`/`flush` with caller-supplied `applyFn`), confirmed working live, not just by construction.
- Accessibility: keyboard-only pass, contrast (default 14.1:1 body / 21:1 high-contrast, all component colours checked ≥ 4.5:1 text / ≥ 3:1 UI), live-region announcement — all confirmed live in-browser this session.
- No cross-project contamination: pass.

## Deviations from the original brief
- `setDone()` gained a 5th `notes` parameter (brief specified 4) to support the notes expander — additive, not breaking.
- Side field implemented as a `<select>` rather than free text — tighter than the brief asked for, but necessary to prevent the schema violation in bug #1.
- Pending cards show full exercise details, not just name/status (brief was silent on this; added per principle 6, see bug #4).

## Integration points this phase exposes for later phases
- `components/card.js` — `createCard({ title, headingLevel, className })` → `{ article, heading, body, actions }`. Reused as-is by Phase 4 (chores) and Phase 9 (dashboard).
- `components/completionStamp.js` — `showCompletionStamp(cardEl, { label })` / `hideCompletionStamp(cardEl)`, built on the existing `.stamp` CSS class.
- `data/exercises.js` establishes the offline-write pattern (try live write → on failure `enqueue()` → `online` listener calls `flush(applyOpFn)`) — later phases writing through the queue should follow the same shape.

## Phase 3: CLEARED
All gate conditions from `BUILD_PROCESS_CONTROL.md` are met: files delivered whole with version headers, self-review stated, live smoke test passed on real Supabase + browser, every deviation and bug named with cause and fix, this handoff reconciles and clears the phase.

Ready for Phase 4 (`Chores: projects, tasks, calendar, recurrence, completion stamp`) brief to be written.
