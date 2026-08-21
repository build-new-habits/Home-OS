# Home-OS: Phase 6 Handoff — Meal Planner + Barcode Scanning
21 Aug 2026 v1

Commit: `4c7adbc` on `main`. Deployed to GitHub Pages.
Service worker `v15`, `CACHE_NAME = home-os-shell-v15`, **49 precache paths**.

## Process note

Built in the architect chat with direct repo access, as Phase 5 was. The
Phase 5 handoff asked for that separation to be *reconsidered rather than
assumed* for Phase 6; the decision was to keep it combined, because the
argument for a separate builder chat was that a builder needed files pasted
to it, and that argument no longer holds. Reading the repo directly is now
the thing that finds defects — it found one again this phase.

---

## The open question, resolved

The brief asked: `foods.barcode` has no unique constraint, so scanning the
same product twice creates a duplicate row. Look up by barcode before
insert — but *flag rather than guess if that read is not obviously correct
under RLS*.

**The read is correct under RLS.** The policy on `foods` is
`using (auth.uid() = user_id)`, so a `select ... where barcode = X` returns
only the signed-in user's own foods. That is exactly the scope in which a
duplicate is a problem. It cannot see anyone else's rows and does not need
to; there is no case where a correct answer requires a row RLS hides.

**But the select alone is not sufficient**, and this is the part worth
carrying forward. A food created offline sits in IndexedDB, invisible to any
query. Scanning the same tin twice in the same shop — the exact situation
the offline queue exists for — would produce two rows despite the check.
`findByBarcode()` therefore reads the queue as well and reports which of the
two it matched, so the user gets *"still waiting to upload from this device"*
rather than a mystery.

**Behaviour:** on a match the user chooses — "Use the saved one" or "Add a
separate entry". Neither silently de-duplicating nor silently duplicating.
A second entry is legitimate (a different pack size of the same product),
so it stays possible.

---

## Defect found in cleared code, and fixed

### `lib/offlineQueue.js` — a failed `openDb()` was memoised forever

```js
let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;   // <- returns the REJECTED promise
  dbPromise = new Promise(...);
  return dbPromise;
}
```

If `indexedDB.open()` ever failed, `dbPromise` stayed a rejected promise for
the life of the page. Every later `enqueue`, `list` and `flush` then failed
with **the same original error**, never retrying. The offline queue would be
silently dead for the rest of the session, so an offline water tap or food
save would be reported as a failure and rolled back rather than stored —
defeating the entire offline premise on the exact code path that exists to
protect it.

Real-world triggers: Firefox private browsing, storage pressure, a blocked
version upgrade, or a transient failure on a busy device.

Found by the new render gate, which runs in jsdom where `indexedDB` is
absent — the second module to call the queue inherited the first module's
stale rejection, complete with the first module's stack trace. That stack
mismatch is what gave it away.

**Fix (`v3`):** a rejected `dbPromise` is cleared so the next call retries.
Attaching `.catch()` also guarantees the rejection is always handled, so a
caller that never awaits cannot raise an unhandled rejection.

**Proven, not assumed.** Reverting the fix in a throwaway copy fails the new
test: one open attempt, no retry, ever. With the fix, two attempts and the
second succeeds. The Phase 5 table-scoping guarantee was re-verified after
touching the file — a foreign op is still skipped rather than consumed.

---

## What running the code found

The scanner engine was bundled and **decoded synthetic EAN-13 rasters in
Node before anything was built on top of it**. Two findings a spec-read
would have missed:

### 1. UPC-A decodes to twelve digits, not thirteen

A UPC-A symbol comes back as `123456789050`, not the EAN-13 form
`0123456789050` that Open Food Facts and our `foods` table key on.
`BarcodeDetector` behaves the same way. Unnormalised, the same tin scanned
on two devices — or looked up twice — produces two different strings and
therefore two rows, straight past the duplicate check above.

Every barcode leaving `lib/barcode.js` is now normalised to its EAN-13 form
where one exists (12 → leading zero; 14 starting `0` → trimmed; 8 left
alone, since UPC-E has no lossless expansion). `barcodeCandidates()` keeps
the raw form as a second attempt for the remote lookup, because Open Food
Facts does not store every product under the canonical form.

### 2. The full scanner library is 406 KB; we need 58 KB of it

`MultiFormatOneDReader` drags in Code128, Code39, Code93, ITF, Codabar and
RSS Expanded. Packaged food carries EAN-13, EAN-8, UPC-A or UPC-E and
nothing else, so only `MultiFormatUPCEANReader` is vendored: **58 KB, 15 KB
gzipped**, and dynamically imported so a device with `BarcodeDetector` never
parses it.

**Deliberate narrowing, recorded so a later phase does not trip over it:**
the fallback engine will *not* read QR, Code 128 or DataMatrix. If Phase 7
or later needs those, rebuild from the real package rather than hand-editing
the vendored file — the header says how.

The bundle uses `RGBLuminanceSource` (core) rather than
`HTMLCanvasElementLuminanceSource` (browser), so the decode path takes a
plain byte array and **can be exercised in Node**. That is what made
verifying it possible at all from here.

---

## Open Food Facts

Isolated behind `lookupBarcode()` in one module. Three traps absorbed, two
of them confirmed against the live API documentation rather than assumed:

1. **A 200 with `status: 1` can still carry an empty `product` object.**
   Trusting the HTTP status yields a food with a null name. Both are checked,
   and a product with no usable name is refused rather than saved blank.
2. **Energy is not reliably kcal.** Products carry `energy-kcal_100g`,
   `energy-kj_100g`, or a bare `energy_100g` whose unit is stated separately.
   Reading `energy_100g` blind stores kilojoules in a kcal column — a
   plausible-looking number wrong by 4.184×. A bare value with no stated unit
   is treated as kJ, because that is what OFF stores by default; guessing
   kcal would overstate every such product more than fourfold.
3. **Values arrive as strings** often enough to matter.

**Cannot comply, and does not pretend to:** Open Food Facts asks clients to
send an identifying `User-Agent`. Browsers forbid setting that header from
`fetch()`. Recorded in the module header rather than silently ignored.

Timeout is 5s — shorter than the 6s write budget, because a lookup is an
accelerator and a save is not. Not-found, offline, timeout and error are all
ordinary outcomes that open the manual form pre-filled. **Food creation is
never blocked on this call.**

---

## Files delivered

| File | Status |
|---|---|
| `js/lib/barcode.js` | **new** — one `scan()`, two engines, normalisation |
| `js/lib/openFoodFacts.js` | **new** — remote lookup, isolated |
| `js/vendor/zxing-upcean.js` | **new** — vendored fallback engine, 58 KB |
| `js/data/foods.js` | **new** |
| `js/data/meals.js` | **new** — includes the pure `computeMacros()` |
| `js/data/mealPlan.js` | **new** |
| `js/views/meals.js` | replaces the Phase 2 stub, whole |
| `js/lib/offlineQueue.js` | **v3** — failed-open retry (Phase 2 file) |
| `css/components.css` | **v8** — whole file, Phase 6 sections appended |
| `service-worker.js` | **v15** — 6 new paths, `CACHE_NAME` bumped |

---

## Locked architectural decisions

**Nothing derived is stored.** Macro totals are computed on every read:
`sum(quantity_g / 100 × per_100g_value)`. There is no column for a total and
one must not be added — the schema is frozen, and a stored total rots the
moment an ingredient's quantity or a food's nutrition data changes.
`computeMacros()` is a **pure function**, which is what makes checking it
against a hand calculation possible.

**A null macro is incomplete, not zero.** A food added by hand with no
nutrition data must not quietly drag a meal's protein total to a confidently
wrong number. Every result carries `incompleteCount` and `incompleteNames`
so the view says *"2 of 5 ingredients have no nutrition data (X, Y)"*.
**Zero is a real measurement** — water genuinely has zero protein — and is
never conflated with unknown.

**Foods queue offline; meals and the plan do not.** Scanning happens in
shops, which is where signal fails, so refusing to save there would defeat
the feature. Meals cannot queue: a meal insert must return a real id before
its ingredients can reference it, and a queued insert has no id, so the rows
would be orphaned. The view says so plainly rather than pretending.

**A queued food is not a usable ingredient.** It has no real id, so
`meal_ingredients.food_id` would be rejected. Queued foods appear under
"waiting to upload" and are excluded from ingredient pickers until they
sync. This is the same class of gap as the Phase 4 offline linked-row debt,
handled up front this time rather than discovered in a smoke test.

**`countFoodDependents()` counts all three restrict tables.** `foods` is
referenced with `ON DELETE RESTRICT` by `meal_ingredients`, `pantry_stock`
**and** `shopping_list_items`. Counting only meals would produce *"used in 0
meals — remove anyway?"* followed by a raw foreign-key error, which is
precisely what `schema.md` §2 forbids. Phase 7 owns the pantry and shopping
*features*; this is a read for an honest confirm message and nothing more.
No Phase 7 table is ever written to.

**More than one meal per day+slot is allowed.** There is no unique
constraint on `(day_of_week, slot)`, and a dinner can legitimately be two
dishes. Cells hold a list rather than a single value.

**The plan is a recurring week, not dated.** There is no `start_date` column
on `weekly_meal_plan`; "this week" means the same rows every week until
changed. No date was invented.

---

## Verification performed

Everything below was **executed**, not inspected.

**Render gate (standing rule 12), now stronger.** 10 route views plus both
`signin.js` builders execute in jsdom against a stubbed Supabase client. The
stub is injected by swapping `supabaseClient.js` in a *shadow copy* of the
repo, so every module imports through its real path and nothing about the
graph is faked. `signin.js` is covered too, despite not being a route — the
18 Aug ReferenceError was in exactly that kind of non-route path.

**The gate was proven to catch its bug.** An injected
`elementHelperThatDoesNotExist(...)` in `views/meals.js` **passes
`node --check`** and **fails the gate** with
`ReferenceError: elementHelperThatDoesNotExist is not defined`.

**51 behavioural assertions.** Macro totals against a hand calculation
(80 g oats + 200 g milk = 403.2 kcal, 17.8 g protein, 10.1 g fat, 57.7 g
carbs); an unknown ingredient not changing the total but being counted and
named; zero treated as known; `serves_override` changing per-serving only;
`serves: 0` falling back to 1 rather than dividing by zero; barcode
normalisation including the UPC-A case; the kJ→kcal conversion and the
kcal-wins-over-kJ precedence; OFF mapping including brand de-duplication and
refusal of a nameless product; dependent-count wording.

**12 queue assertions.** The old bug reproduced and the fix proven; an op
without a table refused; table-scoped flush skipping rather than consuming a
foreign op; the other module's queued write surviving; a failed op retained
and reported, never dropped.

**22 structural a11y checks on the rendered DOM**, not on the source: all 17
form controls have a resolvable label; all 42 buttons have an accessible
name; no duplicate ids; every `aria-describedby` target exists; the plan is a
real `<table>` with a caption and `scope` on all 12 headers, 7 row headers
and 5 column headers, 7×4 cells; all 28 cell buttons name **day and meal
time**; the scroll region is focusable and named; every macro figure states
a unit or says "not known"; heading levels never skip.

**Contrast: 17 new pairs × 4 theme combinations = 68 checks, all pass.**
Worst case is 6.00:1 for muted text on the page background (needs 4.5:1) and
6.00:1 for a bare control's boundary (needs 3:1). Two new controls appear
this phase that do **not** sit inside `.field` — `.plan-serves-input` and the
ingredient quantity input — so both carry `--control-border` explicitly
rather than inheriting nothing (standing rule 10).

**Static.** 87 import specifiers resolved against the real tree, every named
export confirmed to exist; the vendored bundle's `BarcodeFormat` enum values
(7/6/14/15) checked against the actual module rather than assumed; `node
--check` on all 42 JS files; 49 precache paths all present on disk, no
duplicates, no JS file unlisted; no `user_id` on any insert; no hardcoded
credential; no cross-project reference; write-once files (`router.js`,
`routes.js`, `tokens.css`, `rrule.js`) byte-identical, and the restricted
`app.js` and `supabaseClient.js` untouched.

**`components.css` delivered whole** and diffed byte-for-byte against v7:
220 insertions, 0 deletions, original prefix identical.

**Not verified from here:** the live site. `*.github.io` is outside the build
sandbox's network allowlist, and **no camera exists in this environment** —
so the scan path itself has been verified only at the decode layer (real
EAN-13 rasters through the real bundle) and the plumbing layer (jsdom). The
camera, permission prompt, and a live Open Food Facts round trip are the
coordinator's smoke test and nothing here substitutes for them.

---

## Accessibility (WCAG 2.2 / 2.1 AA)

| Item | Result |
|---|---|
| Weekly plan is a real table with `scope` on every header | **pass** — verified on the rendered DOM |
| Cell actions name day **and** slot, not just "Add" | **pass** — all 28 |
| Overflowing table keyboard-reachable and named | **pass** — `role="region"`, `tabindex="0"`, `aria-label` |
| Scanner status in text via `role="status"` | **pass** — the `<video>` is `aria-hidden`; it carries nothing without sight |
| Manual entry reachable **without** attempting a scan | **pass** — a `<details>` form, always present |
| Macro figures carry units in text | **pass** — or say "not known" |
| No colour-only meaning | **pass** — "Nothing planned", "not known", incomplete counts are all words |
| Every control labelled | **pass** — 17/17 resolvable |
| Every button named | **pass** — 42/42 |
| Target size (2.5.8) | **pass** — `.btn-small` is 36×36, over the 24×24 minimum; the 44px floor stays reserved for daily one-tap actions |
| Contrast (1.4.3 / 1.4.11) | **pass** — 68 checks across four themes |
| Neutral framing throughout | **pass** — no streaks, no red-for-missed, no "you haven't" |

*Coordinator still to confirm in-browser:* keyboard-only pass, screen-reader
announcement of the plan grid, and the scanner's live-region behaviour with
a real camera.

---

## Integration points for later phases

- **`data/foods.js`** — `findByBarcode()` returns `{ ok, data|null, pending }`.
  Phase 7 should use it before creating a food from a shopping list.
  `countFoodDependents()` already counts `pantry_stock` and
  `shopping_list_items`, so Phase 7 gets the delete confirm for free.
  `listQueuedFoods()` exposes unsynced foods; anything that needs a real
  `food_id` must exclude them.
- **`data/meals.js`** — `computeMacros(ingredients, { serves })` is pure and
  reusable; Phase 9's dashboard should call it rather than re-implementing
  the maths. `listIngredients()` with no argument returns every meal's
  ingredients in **one** query — use `groupByMeal()` rather than N+1.
- **`data/mealPlan.js`** — `DAYS` and `SLOTS` are the canonical enum values
  and match the CHECK constraints; import them, do not re-declare.
  `servesFor(entry)` resolves override-or-default. `groupByCell()` keys on
  `` `${day}:${slot}` ``.
- **`lib/barcode.js`** — `scan()` is the only entry point; `normaliseBarcode()`
  is the only supported route from a raw scan to a stored barcode. Phase 7's
  pantry can reuse both unchanged.
- **`lib/openFoodFacts.js`** — `lookupBarcode()` never throws and never
  blocks a save.

---

## Tracked debt

| Item | Status |
|---|---|
| Offline linked-row creation for repeatable chores | Still open (Phase 4) |
| Phase 9 dashboard join: `chore_tasks` × `calendar_events` | Still open — address in the P9 brief |
| Water glass size / daily target not user-configurable | Still open — needs `user_settings` columns |
| GitHub token scoped to all 13 org repos | Still open — narrow to `Home-OS` and rotate |
| Offline queue permanently dead after one failed open | **Closed P6** — `offlineQueue.js` v3 |
| **New:** vendored scanner reads UPC/EAN only | Open, by design — see above before adding QR |
| **New:** no `User-Agent` sent to Open Food Facts | Open, unfixable from a browser — documented |

---

## Phase 6 status: **BUILT, AWAITING SMOKE TEST**

Not self-cleared. The `INTEGRATION_CHECKS.md` Phase 6 block must pass on the
live site, on a real device with a real camera, against the real Supabase
project.

**Before testing:** hard-refresh and confirm Cache Storage shows
`home-os-shell-v15` with **49 entries** and that `v14` is gone.

**Priority checks: the duplicate path and the restrict delete.** Those are
the two places this phase can quietly corrupt data rather than merely
misbehave. Everything else is recoverable by editing a row.

Worth repeating from Phase 5, because it has not stopped being true: every
defect that phase found was found on a real device, not by any check run
before commit. The gates are better again this phase — they caught a real
bug in cleared code — but they are still not sufficient.
