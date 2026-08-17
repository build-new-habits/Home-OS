# Home-OS: Phase 5 Handoff — Weight + Water Tracker
17 Aug 2026 v1

Commit: `860d2b3` (Phase 5 build) + follow-up commit (docs, password change).
Branch: `main`. Deployed to GitHub Pages.

## Process note (deviation)
Phase 5 was built in the PM/architect chat rather than a separate builder
chat — the same deviation as Phase 4, and for a different reason: the
coordinator supplied a GitHub token mid-session, so this chat read the repo
directly and committed to `main` via the API instead of returning whole files
for copy-paste. Two consequences worth carrying forward:

1. **Reference files were read from the repo, not pasted.** This removed the
   guessing that the brief warned about — and immediately surfaced two
   defects in already-cleared code (below) that a paste-based session would
   likely have built straight over.
2. **The "whole files in chat" convention did not apply**, since the files
   were written directly. The whole-file *discipline* was kept:
   `css/components.css` was rewritten complete and diffed against its
   previous content to prove nothing was dropped.

The normal builder-chat separation should be reconsidered rather than assumed
for Phase 6 — direct repo access changes the trade-off that made separation
useful.

---

## Defects found in cleared code (fixed this phase)

### 1. Offline queue was not table-scoped — **the significant one**
`offlineQueue.flush(applyFn)` replayed **every** pending op through whichever
`applyFn` it was handed. `data/exercises.js` never checked `op.table`, so on
reconnect it would attempt to insert queued chore / weight / water rows into
`exercise_logs`.

Reproduced in a runtime test before fixing: with five ops queued across four
tables, a single unscoped `flush()` was handed all five and **consumed the
other modules' queued writes**. NOT NULL constraints on the target tables
meant the DB rejected most of them rather than corrupting data, but the
outcome was still lost or endlessly-retried writes plus a race between two
`online` listeners. Adding two more tables in Phase 5 would have made it
materially worse.

**Fix — `lib/offlineQueue.js` v2:**
- `flush(applyFn, { tables })` replays only ops whose `op.table` is listed.
  Filtered ops are **left queued for their owner**.
- Deliberate design point: an `applyFn` must never *resolve* for an op it
  does not own. `flush()` removes an op as soon as `applyFn` resolves, so a
  silent "not mine, ignore" return would **delete another module's pending
  write**. Filtering happens in `flush`, not in the handler.
- `enqueue()` now requires `op.table`.
- Returns `{ ok, failed, skipped }`.

**Fix — consumers:**
- `data/exercises.js` v2 — flushes with `{ tables: ['exercise_logs'] }` and
  asserts `op.table`, throwing (not returning) on a foreign op.
- `data/chores.js` v2 — flushes with `{ tables: ['chore_tasks'] }`, and
  gained the missing `try/catch` so a rejected flush is logged rather than
  swallowed (the "no silent failures" rule).

This closes the "drift between data modules' offline-write patterns" item
that had been carried as non-blocking debt since Phase 4.

### 2. `units.js` rounding carry, and a missing conversion direction
- `kgToStoneLb()` applied `Math.round()` to the pounds remainder, which can
  reach 14 — so **69.8 kg rendered as "10st 14lb"** instead of "11st 0lb".
  Fixed with an explicit carry; verified by brute-forcing 30–200 kg in 13 g
  steps with zero out-of-range results.
- v1 had **no input direction at all** — it could format kg outward but
  offered no supported route from a display-unit entry back to canonical kg,
  which the Phase 5 brief's units contract requires. Added `stoneLbToKg()`,
  `lbToKg()`, `parseWeightToKg()` and `formatWeightDelta()`.

`lib/units.js` is not on the write-once list, so this was an extend-by-
addition change; no existing export changed signature.

---

## Files delivered

| File | Status |
|---|---|
| `js/lib/offlineQueue.js` | v2 — table-scoped flush |
| `js/lib/units.js` | v2 — reverse conversion + rounding fix |
| `js/data/exercises.js` | v2 — scoped flush (Phase 3 file) |
| `js/data/chores.js` | v2 — scoped flush + error handling (Phase 4 file) |
| `js/data/weight.js` | **new** |
| `js/data/water.js` | **new** |
| `js/views/weight.js` | replaces Phase 2 stub, whole |
| `js/views/water.js` | replaces Phase 2 stub, whole |
| `css/components.css` | v5 — whole file, Phase 5 sections appended |
| `service-worker.js` | v7 — 2 new paths, `CACHE_NAME` bumped |
| `js/data/settings.js` | v3 — `changePassword()` (out-of-band, see below) |
| `js/views/settings.js` | v3 — change-password form (out-of-band) |

---

## Locked architectural decisions

**Weight target storage.** `weight_logs.weight_kg` is `NOT NULL`, so a target
cannot exist as a row of its own. Therefore:
- `target_weight_kg` / `target_date` ride on an **existing** log row.
- **Current target** = most recent row with a non-null `target_weight_kg`,
  ordered `log_date` desc then `created_at` desc.
- `setTarget()` **updates** the most recent log; it never inserts.
- With no logs at all it returns `{ ok: false, code: 'no-logs' }` and the view
  disables the control with neutral text ("Log a weight first to set a
  target") rather than inventing a weight value.

**Water constants.** `GLASS_ML = 250`, `DAILY_TARGET_ML = 2000`, exported
from `data/water.js`. No schema field exists for either; making them
configurable needs new `user_settings` columns and is out of scope. No DB
column was invented.

**Offline water totals.** `totalForDate()` adds queued millilitres to the
server total and returns `{ total, queuedMl, partial }`. A tap the user made
is a tap that happened; showing a total that silently drops queued glasses
would read as "my taps didn't count" (principle 1). `partial: true` lets the
view say so honestly rather than pretending.

---

## Verification performed

Beyond inspection — these were **executed**:

- **Units:** rounding carry regression across 13,000+ values (no `lb == 14`);
  round-trip kg→st/lb→kg worst drift 0.2268 kg (inside the half-pound floor);
  exact round-trip for user-entered stone/lb; input validation rejects blank,
  text, zero and negative.
- **Queue:** old bug reproduced, then proven fixed — a scoped flush sees only
  its own table, skips 3 of 4, and the other modules' ops **survive**. Failed
  ops are retained and reported, never dropped. `enqueue` rejects a missing
  `table`.
- **Data modules** against a mocked Supabase: two glasses = 500 ml; going
  offline mid-day still counts the queued glass and flags `partial`; back
  online, three glasses reconcile to 750 ml **counted once**; `setTarget`
  returns `no-logs` cleanly with no logs and succeeds once one exists.
- **Password flow:** 9/9 including "a failed attempt leaves the password
  unchanged".
- **Static:** every import resolved against the real tree and every named
  export confirmed to exist; `node --check` on all changed JS; all 42
  precache paths accounted for, no duplicates; no `user_id` on any insert; no
  cross-project references; five write-once files confirmed byte-identical
  before and after the commit.

**Not verified from here:** the live site. `*.github.io` is outside the build
sandbox's network allowlist (`x-deny-reason: host_not_allowed`), so live HTTP
checks and in-browser a11y testing remain the coordinator's smoke test.
Content was verified via `raw.githubusercontent.com` instead.

---

## Accessibility (WCAG 2.2 / 2.1 AA)

| Item | Result |
|---|---|
| One-tap water button ≥ 44×44 | **pass** — `--tap-min` + `--space-3` |
| Water tap announced with running total | **pass** — live region + `aria-live` on the total |
| Weight inputs labelled, display unit named in the label | **pass** |
| Errors in text via `aria-describedby` | **pass** — `role="alert"`, `aria-invalid` |
| Trend SVG not the sole carrier of information | **pass** — `aria-hidden`; text summary + real `<table>` |
| No colour-only meaning | **pass** — trend line has point markers, target line is dashed |
| Neutral status text, never red-for-missed | **pass** — no streaks, no best/worst |
| `prefers-reduced-motion` | **pass** — bar transition disabled |
| Contrast | **pass** — computed per token pair, all ≥ 4.5:1 text / ≥ 3:1 UI |

**Contrast defect found and fixed:** the water progress bar used
`--color-border`, which is **1.39:1** against the card, while the track
itself is 1.2:1 — the bar had no visible boundary at all. Moved to
`--color-text-muted` (6.54:1). Fill-vs-track is 5.66:1.

*Coordinator still to confirm in-browser:* keyboard-only pass, screen-reader
announcement, and contrast in the high-contrast and dusk themes (only the
default theme's tokens were computed here).

---

## Out-of-band addition: change password

Requested during this session, outside the Phase 5 brief. Recorded here
rather than folded in silently.

- `data/settings.js` v3 — `changePassword(current, new)`.
- `views/settings.js` v3 — form behind a `<details>` under Account.

**The current password is re-verified via `signInWithPassword` before the
change is applied.** Supabase's `updateUser()` would accept a new password on
the strength of the existing session alone, which means anyone reaching an
unlocked signed-in device could lock the owner out of their own health data.
Re-authentication costs one round trip and removes that.

Validation: current password required and verified; new password ≥ 8 chars;
must differ from current; confirmation must match. Correct `autocomplete`
values (`current-password` / `new-password`) so a password manager can offer
to store it. No credential is ever written to our tables — Supabase Auth owns
them.

**A password must never be hardcoded into this repo.** It is public, and
GitHub Pages serves the JS to anyone regardless. The publishable Supabase key
is safe there because RLS is the boundary; a password is the thing that gets
past RLS.

---

## Process miss caught in-session

The docs/password commit changed `js/data/settings.js` and
`js/views/settings.js` — both **precached** — without bumping `CACHE_NAME`.
That is a direct breach of standing rule 3, committed minutes after writing
that rule into the schedule. Caught on post-commit review and fixed in a
follow-up (`v7` → `v8`).

Worth recording rather than quietly correcting, because the failure mode is
instructive: the rule was front-of-mind for the *feature* files and forgotten
for files touched incidentally. The trigger is "did any precached file's
**content** change", not "was this the main thing I was working on".

## Integration points for later phases

- **`offlineQueue.flush(applyFn, { tables })`** — every future data module
  **must** pass `{ tables }` and assert `op.table` in its handler. A module
  that omits the filter reintroduces the Phase 5 bug for every table.
- **`data/weight.js`** — `getCurrentTarget()` returns `{ id,
  target_weight_kg, target_date, log_date }` or `null`. Phase 9's weight
  nudge reads this. `listLogs()` is oldest-first.
- **`data/water.js`** — exports `GLASS_ML` and `DAILY_TARGET_ML`; Phase 9
  should import these, not re-declare them. `totalForDate()` returns
  `{ total, queuedMl, partial }` — the dashboard should respect `partial`.
- **`lib/units.js`** — `parseWeightToKg()` is the only supported route from
  display-unit input to storage. `formatWeightDelta()` gives unsigned
  magnitudes; the caller supplies neutral wording.
- **`.data-table`** — reusable accessible table styling (caption, row
  headers), available to any phase needing a text equivalent for a chart.

---

## Tracked debt

| Item | Status |
|---|---|
| Data-module offline-write drift | **CLOSED** this phase |
| Offline linked-row creation for repeatable chores | Still open (Phase 4) |
| Phase 9 dashboard join: `chore_tasks` × `calendar_events` | Still open |
| Water glass size / daily target not user-configurable | New — needs `user_settings` columns |
| High-contrast and dusk theme contrast not computed | New — coordinator to confirm in-browser |

---

## Phase 5 status: **BUILT, AWAITING SMOKE TEST**

Not self-cleared. The `INTEGRATION_CHECKS.md` Phase 5 block must pass on the
live site and real Supabase project first. Priority check: **#4** — log
weight *and* water offline, reconnect, confirm both sync and IndexedDB is
empty. That is the check that exercises the queue fix.

Before testing: hard-refresh and confirm Cache Storage shows
**`home-os-shell-v7`** with 42 entries and that `v6` is gone.
