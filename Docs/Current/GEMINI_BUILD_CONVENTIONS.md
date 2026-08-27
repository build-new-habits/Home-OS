# Home PWA: Build Conventions (for every code session)
27 Aug 2026 v2

Read this before writing any code, in every phase. These rules are fixed
across the whole build so that code produced in separate sessions slots
together without rework. If a phase instruction and this file ever conflict,
stop and flag it — do not silently pick one.

---

## 1. Golden rules

1. **Schema-first.** Never read or write a field that is not in `schema.md`.
   If a phase needs a new field, it goes into `schema.md` (and Supabase)
   first, then code.
2. **No framework, no bundler, no build step.** Vanilla JS (ES modules),
   HTML5, CSS3. Everything runs as static files on GitHub Pages.
3. **Every file carries a header:** first line comment `// DD Mon YYYY vN`
   (or `<!-- -->` / `/* */` for HTML/CSS). Missing header = fix before
   presenting.
4. **One concern per file.** A view file renders one screen; a data file
   owns one domain's queries; a component file exports one reusable piece.
5. **No secrets beyond the anon key.** The Supabase URL and anon key are
   public by design (RLS is the security boundary). They live in
   `js/config.js`. Never invent a service-role key in client code.
6. **Accessibility is not optional** (§7). Every interactive thing shipped
   in a phase passes that phase's a11y checklist before the phase is done.

---

## 2. Data access

- One shared Supabase client: `js/supabaseClient.js` creates it once and
  exports it. Every module imports that instance — never create a second.
- All database calls live in `js/data/<domain>.js` (e.g. `data/water.js`).
  Views call data functions; views never call Supabase directly.
- **Never pass `user_id` on insert.** The column defaults to `auth.uid()`.
  Passing it manually is redundant and a bug risk.
- Every call checks the error and returns a predictable shape:

  ```js
  // DD Mon YYYY v1
  export async function logWater(mlLogged, logDate) {
    const { data, error } = await sb
      .from('water_logs')
      .insert({ ml_logged: mlLogged, log_date: logDate })
      .select()
      .single();
    if (error) return { ok: false, error };
    return { ok: true, data };
  }
  ```

- `user_settings` is always **upsert** on the unique `user_id`, never a
  blind insert (one row per user).

## 3. Deletes (behavioural principle 9)

- Every delete goes through the shared `confirmDialog` component — no direct
  delete on tap.
- For a `restrict` relationship (see `schema.md` §2), first count dependents
  and show the number: "This food is used in 3 meals — remove anyway?"
- For a `cascade` relationship, name what else is removed: "This also removes
  4 checklist items."
- Where practical, show a short **undo** toast after deletion.

## 4. Rendering & safety

- Views are functions `render(mountEl, params)` that build DOM and return a
  cleanup function. No global mutable DOM assumptions.
- **Never** inject user or database text via `innerHTML`. Use `textContent`
  or `document.createElement`. `innerHTML` is only allowed for static,
  developer-authored markup with no interpolated data.
- No inline event handler attributes; attach listeners in JS.

## 5. Routing & state

- Hash-based routing in `js/router.js`: `#/dashboard`, `#/water`, etc. maps
  a route to a view's `render`. The router owns mount/unmount and calls the
  previous view's cleanup.
- State is deliberately minimal. A small `js/lib/store.js` holds session
  state (current user, settings) with a subscribe callback. No state library.

## 6. Theming contract (behavioural principle 7)

- All colour, spacing, radius, font-size tokens are CSS custom properties on
  `:root` in `css/tokens.css`. Components reference `var(--…)` only — never
  hardcode a colour or size.
- Theme, contrast, and brightness are applied by setting `data-theme`,
  `data-contrast`, `data-brightness` attributes on `<html>`, which swap
  token values. Setting them re-styles every view automatically; no view
  has its own theme logic.
- Settings changes apply immediately by updating those attributes — no
  save/reload step.

## 7. Accessibility — WCAG 2.2 & 2.1 AA (non-negotiable)

Applies to every component and view. Per-phase files list the specific
checks; these are the always-on baseline:

- **Semantic HTML first.** Real `<button>`, `<a>`, `<nav>`, `<main>`,
  `<h1>`–`<h3>` in order. ARIA only to fill genuine gaps, never to paper
  over a wrong element.
- **Keyboard operable.** Everything usable by tap is usable by keyboard;
  visible focus indicator on every interactive element; logical tab order.
- **Target size (2.2, 2.5.8).** Interactive targets ≥ 24×24 px. Daily
  one-tap actions (water, exercise tick, chore tick) target **≥ 44×44 px**.
- **Focus not obscured (2.2, 2.4.11).** Toasts, dialogs, and sticky bars
  must not cover the focused element.
- **Contrast (1.4.3 / 1.4.11).** Text ≥ 4.5:1 (large text ≥ 3:1); UI
  components and states ≥ 3:1. The high-contrast setting must still pass.
- **Never colour alone (1.4.1).** Status is always carried by text or icon
  too — this also enforces the no-shame rule (a missed log reads as neutral
  text, never a red-only cue).
- **Labels & names (1.3.1 / 4.1.2).** Every input has a programmatic label;
  every control has an accessible name; icon-only buttons have `aria-label`.
- **Live regions.** Async results (saved, synced, offline) announce via an
  `aria-live="polite"` region.
- **Reduced motion.** Respect `prefers-reduced-motion`; the completion
  "stamp" animation degrades to an instant state change.
- **Forms.** Errors identified in text next to the field, associated via
  `aria-describedby`; never rely on placeholder as label.

## 8. No-shame & friction rules encoded (principles 1 & 2)

- Copy for anything missed/incomplete is neutral and factual ("2 of 6
  logged today"). No streaks, no "you missed", no red warning styling for a
  missed log.
- Daily actions (water, exercise tick, chore tick) are reachable in **one
  tap** from the dashboard or a persistent bottom bar — never behind a menu.
- Forms default to the fewest required fields; optional detail is behind an
  expander, not front-loaded.

## 9. Offline (behavioural principle 10)

- App shell (HTML/CSS/JS/icons) is precached by `service-worker.js` so the
  app opens offline.
- Daily-use reads (dashboard, water, exercise, chore) serve from cache when
  offline.
- Writes made offline are queued in `js/lib/offlineQueue.js` (IndexedDB) and
  flushed on reconnect; conflicts resolve by newest `updated_at`.
- Meal planning / shopping generation may require connectivity — if offline,
  say so clearly in the UI; never fail silently.

## 10. Errors & feedback

- Every user-visible failure produces a calm, specific message via the
  shared `toast` component ("Couldn't save — you're offline, this will sync
  later"), plus a `console.error` for debugging. No silent failures, no
  blame framing.

## 11. Done means done

A phase is complete only when: code runs on GitHub Pages, its a11y checklist
passes, the behavioural principles it touches are honoured, a
`session_handoff.md` is produced, and `master_schedule.md` is updated.

---

## 12. The shared interaction pattern (added 27 Aug 2026)

Every list screen follows one shape. A flat list stops working at about
thirty rows, and by 27 Aug every screen was heading there.

- **One compact row per thing.** Name on one line, detail beneath — never
  two spans run together, which produced "Amoy Dark soy sauce (150 ml e)
  Recorded as none" and "400 gfrom your weekly plan" on separate occasions.
- **Detail opens in the slide-out panel** (`components/detailSheet.js`).
  Pass `returnFocusTo` explicitly; do NOT let it infer from
  `document.activeElement`, because a tap does not reliably focus a button
  on mobile and focus then lands on `<body>`.
- **Filters live in the panel, and the button carries the active count.**
  A filtered list that looks unfiltered is how a user concludes something
  has vanished.
- **Groups collapse, one open at a time**, so a hundred rows never render.

### The panel keeps its DOM
A re-render that rebuilds the rows **behind** the panel does not touch the
panel. Two real bugs came from forgetting this: a tick that appeared to do
nothing, and a handler holding state captured when its row was *built*,
which went stale after the first tap. Repaint the control directly, and
track displayed state in the closure.

---

## 13. Reading data honestly (added 27 Aug 2026)

Three states, not two. `NULL` is not zero and not "fine".

| Column | NULL means | Never |
|---|---|---|
| `pantry_stock.current_qty` | amount not recorded | ...silently 0, which reads as "you have none" |
| `pantry_stock.use_by` | no printed date; use the estimate | ...backfilled from restocked + shelf life |
| `meals.meal_type` | not classified yet | ...defaulted to `dinner` |

**A guess must never be displayed in the same words as a fact.** "Use by 3
September 2026 — 7 days left" versus "Stocked today — about 365 days left".
The word *about* is load-bearing: an estimate shown as a hard date gets
trusted in front of an open fridge.

**Absent data reads as zero in exactly one place** — a food with no pantry
row, in the shortfall — and it carries a comment saying why, because the
macro rule is the opposite.

---

## 14. Patching large files (added 27 Aug 2026)

Applying edits one at a time to a file of over a thousand lines corrupted
`views/chores.js`: an anchor matched in the wrong place and duplicated a
block. Restoring from `main` and re-applying in ONE script, where every
replacement asserts its anchor is **present and unique**, is the working
method. An unasserted `replace()` also slipped a schema change past
`schema.md`'s table, which only the schema gate caught.

---

## 15. Changing a gate (added 27 Aug 2026)

**A passing gate is not evidence until you have watched it fail.** Four
harness defects were found on 27 Aug, including a trace that printed its
PASS summary before its final block ran — so a failure there printed FAIL
and still exited 0.

When a gate changes, make it fail deliberately and confirm it fails for the
right reason. When code moves to a new view, **move its checks with it**
rather than deleting them; they should fail loudly at the moment the code
leaves, and that is the gate working.
