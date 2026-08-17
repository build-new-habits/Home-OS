# Home-OS: Phase 5 Build Brief — Weight + Water Tracker
20 Jul 2026 v1

Paste this **below** the Builder Chat Preamble in a fresh chat.

## Precondition
Phases 1–4 complete and cleared. Do not modify the database or any shared
write-once file (`app.js`, `router.js`, `routes.js`, `tokens.css`,
`supabaseClient.js`, `lib/rrule.js`).

## Existing code you must wire into (coordinator pastes these — read, do not modify)
- `js/lib/offlineQueue.js` — real offline-write API.
- `js/lib/units.js` — kg↔stone/lb conversion and ml formatting. Use it; do
  not reimplement conversions. If a needed function is missing, flag it.
- `js/data/exercises.js` — the **reference** for the correct offline-write
  pattern, including the mandatory `error`-check before an op is treated as
  done (see standing rule 5). Match this behaviour exactly.
- `js/views/exercises.js` — reference for the `render()` contract and
  live-region announcements.
- `js/components/card.js` — reuse for any card layout.
- `css/components.css` — coordinator pastes current full content; you extend
  it and return the **whole file**.
Also read `PHASE3_HANDOFF.md` and `PHASE4_HANDOFF.md`.

## What Phase 5 is
Two simple daily trackers:
- **Weight** — log weight over time with a plain trend line and an optional
  target, shown with strictly neutral framing (no shame, no "best day").
- **Water** — true one-tap logging, with today's total shown as a plain
  "X of Y" fact.
Canonical units only; display units are a UI concern.

## What NOT to do
- No other feature screens (meals/pantry/etc. stay stubs).
- No new DB columns/tables. Use only `weight_logs` and `water_logs` columns
  from `schema.md §3`.
- No external chart library (offline dependency risk — inline SVG only).
- No editing of shared write-once files. Replace the `weight` and `water`
  stub views; add new self-contained data files; extend `components.css`
  whole.

## Files this phase creates
- `js/data/weight.js` — **new.**
- `js/data/water.js` — **new.**
- `js/views/weight.js` — **replaces stub**, whole file.
- `js/views/water.js` — **replaces stub**, whole file.

## Schema fields in scope (from `schema.md` — spell exactly)
- `weight_logs`: `log_date`, `weight_kg` (**canonical kg**),
  `target_weight_kg`, `target_date`.
- `water_logs`: `log_date`, `ml_logged` (**canonical millilitres**).
- Never pass `user_id`.

## Canonical-units contract (schema §8 — do not violate)
- **Store** weight in **kg** and water in **ml**, always.
- **Display** weight in stone/lb or kg per `user_settings.weight_unit_display`,
  converting at render via `lib/units.js`. The user may enter weight in their
  display unit; convert to kg before writing.
- Nothing display-formatted is ever written back to the database.

## Fixed constants this phase (no schema field exists for these yet)
- **Glass size:** 250 ml (the one-tap amount).
- **Daily water target:** 2000 ml (used only for the "X of Y" display).
Define both as named constants with a comment that making them
user-configurable is a future settings addition (would need a new
`user_settings` field — out of scope now). Do not invent a DB column.

## Build steps

### 1. `js/data/weight.js`
- `listLogs()` → `weight_logs` ordered by `log_date`.
- `logWeight(weightKg, logDate)` → insert (offline-write pattern).
- `setTarget(targetWeightKg, targetDate)` → recorded on the weight log per
  `schema.md` (target columns live on `weight_logs`); define clearly how the
  current target is read back (e.g. most-recent non-null target). Flag if the
  single-target-per-user intent is ambiguous rather than guessing.
- All writes follow the `exercises.js` offline-write pattern incl. the
  `error`-check before dequeue.

### 2. `js/data/water.js`
- `logWater(mlLogged, logDate)` → insert.
- `totalForDate(logDate)` → sum of `ml_logged` for the date.
- Offline-write pattern as above; today's total must read from cache when
  offline.

### 3. `js/views/weight.js` (replaces stub)
- `<h1>` "Weight"; focus moves here on entry.
- Log form: weight input **in the user's display unit** (label states which),
  converted to kg via `lib/units.js` before writing; date defaults to today.
- Optional target (weight + date) with a labelled form.
- **Trend:** an inline-SVG line of logged weights over time, in the display
  unit. Provide a **readable text summary next to the graph** (latest value,
  change since first/previous, distance to target) — do not rely on the SVG
  alone.
- **Neutral framing (principle 1):** progress is stated as fact — "3.2 kg to
  target" or "0.4 kg since last week" — never "best", never a shame cue, no
  red-for-missed. No streaks.

### 4. `js/views/water.js` (replaces stub)
- `<h1>` "Water"; focus moves here on entry.
- **One-tap add** of a glass (250 ml) — a single large button that logs
  immediately, closer to "tap a glass" than "open a form" (principle 2).
- Today's total shown factually: "1250 of 2000 ml" (or glasses), neutral.
- A custom amount behind an expander (labelled input).
- Offline-capable; each tap announced via the live region ("250 ml logged,
  1250 of 2000 today").

## Principles in scope
1 (no shame / neutral progress), 2 (friction — water one-tap), 10 (offline),
plus canonical units (schema §8).

## Offline availability of the new files
Per standing rules 3 & 4: if the SW precaches an explicit list, add
`data/weight.js`, `data/water.js`, `views/weight.js`, `views/water.js` and
**bump `CACHE_NAME`**; verify each path 200s. If runtime cache-first is used,
no edit needed. State which in the handoff.

## Accessibility checklist (WCAG 2.2 / 2.1 AA) — gate
- One-tap water button ≥ 44×44 px, clear name ("Log a glass of water, 250
  millilitres"), visible focus; each tap announced with the running total.
- Weight inputs labelled; the display unit stated in the label; errors in
  text via `aria-describedby`.
- Trend SVG has an adjacent text summary; data not conveyed by colour alone;
  the SVG has an accessible name/role or is marked decorative with the text
  carrying the information.
- All status text neutral; never red-for-missed; no colour-only meaning.
- `prefers-reduced-motion` respected in any transition.

## Builder self-review before presenting (state in handoff)
- Canonical units: weight stored in kg, water in ml; display conversion via
  `lib/units.js`; nothing display-formatted written back — confirmed.
- Schema fidelity: only listed columns; exact spelling; no `user_id` on insert.
- Offline-write path matches `exercises.js` incl. the `error`-check (rule 5).
- Water total reads correctly offline.
- Imports resolve, relative `/Home-OS/`; no shared write-once file edits;
  `components.css` returned whole.
- Every a11y item named pass/n-a/issue. No cross-project contamination.

## Live smoke test — coordinator runs before Phase 5 is cleared
(from `INTEGRATION_CHECKS.md`, Phase 5 block)
1. One-tap water logs instantly; today's total reads "X of Y" and is accurate;
   works offline; total survives reload.
2. Log a weight → stored as **kg** in Supabase regardless of stone/lb display;
   toggling `weight_unit_display` changes the shown value but not the stored
   number.
3. Trend renders and its text summary matches the data.
4. Offline: log weight + water offline → back online → both sync.
5. Keyboard-only pass; contrast default + high-contrast; water tap announced.

## Handoff
Fill in the template. In "integration points", note how the current weight
target is read back (Phase 9 dashboard shows a weight nudge), and the water
glass-size / daily-target constants (Phase 9 shows today's water total).
