# Home-OS: Phase 4 Build Brief — Chores: Projects, Tasks, Calendar, Recurrence
20 Jul 2026 v1

Paste this **below** the Builder Chat Preamble in a fresh chat.

## Precondition
Phases 1–3 complete and cleared. Do not modify the database or any shared
write-once file (`app.js`, `router.js`, `routes.js`, `tokens.css`,
`supabaseClient.js`). This is the **trust-critical** phase: recurrence bugs
erode confidence in the whole app (principle 4), so the recurrence engine is
built to be verified, not assumed.

## Existing code you must wire into (coordinator pastes these — read, do not modify)
- `js/lib/offlineQueue.js` — use its real API for offline writes.
- `js/components/card.js` — `createCard({ title, headingLevel, className }) →
  { article, heading, body, actions }`. Reuse it; do not rebuild a card.
- `js/components/completionStamp.js` — `showCompletionStamp(cardEl, { label })`
  / `hideCompletionStamp(cardEl)`. Reuse for task completion.
- `js/components/confirmDialog.js` — for the restrict-delete confirm.
- `js/views/exercises.js` — reference for the view `render()` contract, the
  offline-write pattern, and how it announces via the live region.
- `css/components.css` — **the coordinator pastes its current full content.**
  You will add rules for projects/tasks/calendar; return the **whole file**
  complete, never a fragment (this dropped the file in Phase 3).
Also read `PHASE2_HANDOFF.md` and `PHASE3_HANDOFF.md` in project knowledge.

## What Phase 4 is
Projects group tasks. Tasks can repeat. A repeatable task's occurrences are
expanded and **shown for the user to confirm across a 3-month window at
creation time**. Completing a task leaves a visible "Complete" stamp.
Recurring tasks surface on a calendar.

## What NOT to do
- No other feature screens (weight/meals/etc. stay stubs).
- No new DB columns/tables. Use only `chore_projects`, `chore_tasks`, and
  `calendar_events` columns from `schema.md §3`.
- No editing of shared write-once files. You **replace** `views/chores.js`;
  you **add** new self-contained files; `components.css` is the one shared
  stylesheet you extend (whole-file).

## Files this phase creates
- `js/lib/rrule.js` — **new, shared, write-once.** The recurrence engine
  (expand a rule into dates over a window). Phase 8 reuses it.
- `js/data/chores.js` — **new.** Projects + tasks queries.
- `js/data/calendar.js` — **new.** `calendar_events` queries + range read.
- `js/views/chores.js` — **replaces the stub**, whole file (projects, tasks,
  recurrence builder, and a calendar rendering).

## Schema fields in scope (from `schema.md` — spell exactly)
- `chore_projects`: `title`, `colour` (hex), `sort_order`.
- `chore_tasks`: `project_id` (FK → chore_projects **on delete restrict**),
  `title`, `details`, `is_repeatable`, `recurrence_rule`, `status`
  ('pending'|'complete'), `completed_at`.
- `calendar_events`: `event_type` ('chore'|'holiday'|'work_location'|
  'custom'), `source_id` (nullable soft pointer — **not** a FK), `title`,
  `start_date`, `recurrence_rule`, `location_label`.
- Never pass `user_id`.

## The recurrence model (define once, here — do not improvise a format)
Store `recurrence_rule` as a **constrained RRULE subset** string. Support
exactly these, and nothing more this phase:
- `FREQ=DAILY;INTERVAL=n`
- `FREQ=WEEKLY;INTERVAL=n;BYDAY=MO,TU,WE,TH,FR,SA,SU` (any subset of days)
- `FREQ=MONTHLY;INTERVAL=n;BYMONTHDAY=d` (d = 1–28; reject 29–31 this phase to
  avoid month-length edge cases, and say so in the UI)

`js/lib/rrule.js` exposes:
- `expand(rule, startDateISO, windowStartISO, windowEndISO) → [ISO dates]` —
  all occurrences in the window, inclusive, correct across month boundaries.
- `describe(rule) → string` — a plain-English summary ("Every 2 weeks on Mon,
  Wed") for display and the confirmation preview.
Keep it pure (no DOM, no network) so it is unit-checkable and offline-safe.
Do **not** pull an RRULE library from a CDN (offline dependency risk — see
Phase 2). If you believe the constrained subset is insufficient, **stop and
flag it**, don't widen it silently.

## Build steps

### 1. `js/lib/rrule.js`
Implement `expand` and `describe` for the three FREQ types above. `expand`
must be correct across month/year boundaries and return dates in order.

### 2. `js/data/chores.js`
- `listProjects()` ordered by `sort_order` then title.
- `createProject` / `updateProject`.
- `countTasksInProject(projectId)` — for the restrict-delete confirm.
- `deleteProject(projectId)` — only after the confirm; DB rule is **restrict**,
  so a project with tasks must not be deletable without the count-confirm.
- `listTasks(projectId?)`.
- `createTask` / `updateTask` (incl. `is_repeatable`, `recurrence_rule`).
- `completeTask(taskId)` → `status='complete'`, `completed_at=now()`;
  `uncompleteTask(taskId)` → back to `pending`, `completed_at=null`.
- `deleteTask(taskId)`.
- All writes follow the offline-write pattern (live → `enqueue` on failure).

### 3. `js/data/calendar.js`
- When a task is saved as repeatable, write **one** `calendar_events` row for
  it: `event_type='chore'`, `source_id = task.id`, `title`, `start_date`,
  `recurrence_rule`. Update/remove it when the task's recurrence changes or
  the task is deleted. **Do not materialise one row per occurrence** — store
  the rule once and expand at render.
- `listEvents(rangeStartISO, rangeEndISO)` → events whose expansion intersects
  the range. Expansion is done in the view via `rrule.js`.

### 4. `js/views/chores.js` (replaces stub)
- One `<h1>` "Chores"; focus moves here on entry.
- **Projects:** each a `card`; `colour` shown as a swatch **paired with the
  title text** (colour never the sole carrier of meaning). Create/edit form
  with a labelled colour input. Delete → `confirmDialog` that reports the task
  count for a non-empty project (restrict) and blocks silent deletion.
- **Tasks:** listed under their project; create/edit form with title,
  optional details, project `<select>`, and an `is_repeatable` toggle that
  reveals a **recurrence builder** (frequency select + interval + weekday
  checkboxes / month-day select as appropriate). Status uses only the
  schema's allowed values.
- **Recurrence confirmation (principle 4):** when a repeatable task is created
  or its rule changed, expand it across **≥ 3 months** from the start date and
  **show the concrete upcoming dates plus the `describe()` summary** for the
  user to confirm before the save is finalised. This is the trust gate — the
  user sees the real dates, not just a rule that "looks right".
- **Completion:** complete → `showCompletionStamp` on the card, sets
  `status`/`completed_at`; the card **stays visible** (principle 3).
- **Calendar:** a month (or week) view rendering expanded occurrences from
  `listEvents` + `rrule.expand` for the visible range. Keyboard-navigable;
  today marked with text/`aria-current`, not colour alone.
- Offline: create/complete via the queue. Return a cleanup function.

## Principles in scope
4 (trustworthy recurrence — the 3-month confirmation), 3 (completion stamp,
cards stay visible), 9 (restrict-delete confirm with counts), 1 (neutral
framing), 10 (offline).

## Offline availability of the new files
Per the standing rule: if `service-worker.js` precaches an explicit list, add
`lib/rrule.js`, `data/chores.js`, `data/calendar.js`, `views/chores.js` to it
and **bump `CACHE_NAME`** (bump it for any content change, per Phase 3 bug #3).
Verify each path returns 200. If the SW does runtime cache-first for
same-origin modules, no precache edit is needed. State which in the handoff.

## Accessibility checklist (WCAG 2.2 / 2.1 AA) — gate
- Calendar is keyboard-operable; day cells are buttons with dated accessible
  names; today carried by text/`aria-current`, not colour.
- Complete is a real button ≥ 44×44 px, `aria-pressed` reflects state, visible
  focus; completion announced via the live region; stamp carries text.
- Project colour is paired with text; never colour-alone meaning.
- Recurrence builder inputs are labelled; the confirmation preview is readable
  text associated with the form; interval/day controls have accessible names.
- Restrict-delete confirm states the count in text.
- Enum inputs (status, event type, frequency) are constrained controls, not
  free text (Phase 3 bug #1).
- `prefers-reduced-motion`: stamp appears without animation.

## Builder self-review before presenting (state in handoff)
- `rrule.expand` verified by hand on a daily, a weekly-multi-day, and a
  monthly rule across a month boundary — show the dates you got.
- Schema fidelity: only listed columns; exact spelling; no `user_id` on insert;
  one `calendar_events` row per repeatable task (not per occurrence).
- Imports resolve, relative `/Home-OS/`; no edits to shared write-once files;
  `components.css` returned whole.
- Offline write path uses the real `offlineQueue` API.
- Every a11y item named pass/n-a/issue. No cross-project contamination.

## Live smoke test — coordinator runs before Phase 4 is cleared
(from `INTEGRATION_CHECKS.md`, Phase 4 block)
1. Create a repeatable task → the confirmation preview shows correct dates
   across a 3-month window; test a daily, a weekly (multi-day), and a monthly
   rule.
2. Those occurrences appear on the calendar (`calendar_events` written with
   `source_id` = task id; one row, not many).
3. Complete a task → `status=complete`, `completed_at` set, stamp shows and
   the card stays visible.
4. Delete a project that has tasks → confirm reports the task count and blocks
   silent deletion (restrict).
5. Offline: create/complete offline → back online → syncs.
6. Keyboard-only pass; contrast default + high-contrast; completion announced.

## Handoff
Fill in the template. In "integration points", document the `rrule.js` API
(`expand`, `describe`) since Phase 8 reuses it, and the `calendar_events`
one-row-per-recurring-source convention.
