# Home-OS: Phase 7 Handoff (part one) — Pantry
21 Aug 2026 v1

Covers the pantry build, scanning into it, and the six corrections made to
Phase 6 during device testing on the same day.

`main` @ `0cb4a8e`. Cache **`home-os-shell-v25`**, 52 precache paths.
Schema **revision 4**, applied and verified.

**Status: BUILT, NOT CLEARED.** The pantry has never been used on a device.

---

## The Phase 6 gate was relaxed, deliberately

Phase 7 was gated on Phase 6 *clearing*, because it reads through
`foods`, `meals`, `meal_ingredients` and `weekly_meal_plan`. It was built
before that gate was met. The reasoning, so it can be judged rather than
assumed:

- The foods layer has now been **exercised hard on a real device** — meals,
  ingredients, units, conversion, macros, categories — finding and fixing
  three genuine bugs. The part Phase 7 leans on most is the part best
  tested.
- **The search picker cannot be tested with one food.** Graeme's own point.
  Capturing a real cupboard puts fifty foods in, which is the scale test
  that could not otherwise be run. Building the pantry *enables* the Phase 6
  test rather than jumping it.
- Graeme asked for it: he had cupboards to capture.

**Residual risk, accepted and recorded:** the scan-confirm path and barcode
duplicate detection remain unverified. Neither is load-bearing for the
pantry.

---

## Six corrections to Phase 6, all found on a real device

Worth reading as a set: **not one was caught by the seven gates**, and two
of them changed how the gates work.

### 1. Every round number was unenterable

The ingredient quantity input had `min="0.1"` with `step="1"`. HTML
validity requires `(value - min) % step === 0`, so the only valid values
were 0.1, 1.1, 2.1 … and the browser rejected `100`, offering 99.1.

**Why no gate caught it:** jsdom does not run constraint validation, and
`Tests/trace.mjs` sets `input.value` directly then calls `submit()`, which
bypasses validation entirely. The trace even asserted "add ingredient issues
an insert" — and it did, because nothing was validating.

`Tests/a11y.mjs` now checks number inputs structurally: given `min` and
`step`, can any ordinary round number be typed? **New standing rule 13:**
attributes the browser enforces need a structural check on the attributes,
or a real device.

### 2. The scan category guard did not guard

The "confirm the category before saving" block was a mutable boolean,
cleared by any `change` event on the select. **Android's native select fires
`change` on dismissal even when the same option is re-selected** — so merely
opening the dropdown satisfied it. Graeme opened it because he was checking
the option spacing he also reported. **The two bug reports were the same
event.**

Replaced with a **sentinel option**: a blank "Choose one — we guessed
Drinks" is inserted and selected, so the select genuinely has no value.
Nothing to save until a real choice is made.

**The general lesson, and the second of this shape in a day:** state you can
see beats a flag you cannot. Where the browser is a participant, assert on
the observable thing — the value, the attribute — never a variable tracking
intent.

### 3. Recipes were grams-only

Graeme: *"how do we know how much of an ingredient to put in?"* Correct, and
the earlier note logging it as "a revision 4 conversation if it annoys in
use" was too relaxed. "200 g of milk" is not how anyone cooks, and `item` is
just as common.

**The consequence had to be solved in the same breath.** Nutrition is per
100 **grams**, so adding `unit` alone would have produced silently wrong
calorie totals — a worse bug than the one being fixed. Hence
`foods.grams_per_ml` and `foods.grams_per_item`, with a missing factor
making the ingredient **incomplete, never guessed**.

### 4. `foods.category` was dead weight

Revision 3 added the column; nothing ever wrote it, because the UI control
had been assigned to Phase 7. Every food was `food_ambient`, so grouping or
filtering by it would have done nothing. The control moved to Phase 6 where
the food form is.

### 5. The ingredient picker did not scale

Graeme, with one ingredient, named what one ingredient hides: a real kitchen
has hundreds and a flat `<select>` is unusable one-handed. Now filtered to
edible categories, grouped by `<optgroup>`, with a type-ahead box whose
match count is announced politely.

### 6. The pantry shipped without scanning

Graeme: *"Shouldn't I be able to scan items into the pantry?"* A plain
oversight — typing names for a cupboard of packaged goods is exactly the
friction that screen exists to remove, and the scanner was one view away.

---

## What was built

| File | Status |
|---|---|
| `js/data/pantry.js` | **new** — stock CRUD, pure `freshness()` / `useSoon()` |
| `js/views/pantry.js` | replaces the Phase 2 stub, whole; **v2** adds scanning |
| `js/components/scannerDialog.js` | **new** — extracted from `views/meals.js` |
| `js/lib/units.js` | **v3** — `formatQuantity()` |
| `js/views/meals.js` | **v8** — uses the shared scanner; v4–v7 are the fixes above |
| `js/data/foods.js` | **v3** — category written and read |
| `js/data/meals.js` | **v2** — units and `toGrams()` |
| `js/lib/openFoodFacts.js` | **v2** — `suggestCategory()` |
| `css/components.css` | **v14** |
| `service-worker.js` | **v25**, 52 paths |

---

## Design decisions worth keeping

**The pantry is built for STOCKTAKING, not for adding one thing.** The first
real use is a whole cupboard in one sitting, one-handed, standing up:

- **Location and restock date persist between saves.** Only the item and
  amount clear. Re-typing "Kitchen cupboard" sixty times is the friction
  that stops a stocktake finishing.
- **A new item can be created without leaving the screen.** Bouncing to
  Meals and back would make capture unusable.
- **Shelf life pre-fills from the category and stays editable** — a visible
  default, never a silent one. Fresh 5, frozen 90, ambient 365, home blank
  (bulbs do not expire).
- **Already-stocked foods are excluded from the picker**, with a second
  check on save. A duplicate row splits the count and makes the shortfall
  wrong.
- **"Restocked today"** is one tap on each card — it is what you do when
  you get home.

**Freshness is `last_restocked + shelf_life_days`. Never `updated_at`** —
the workaround revision 3 existed to kill, and it must not creep back.
"Unknown" is a first-class state: without both fields there is nothing to
work out, and the UI says so rather than implying the item is fine. The
warning window is a fifth of the shelf life with a two-day floor, so a tin
gets proportional notice rather than the same two days as a salad.

`freshness()` is **pure and tested against fixed dates**, not whatever today
happens to be.

**A scan stops wherever it would have to guess.** Already in the pantry →
sent to that card with the amount selected. Known but not stocked →
preselected, jump to "how much". Unknown → name and macros filled, category
still required.

---

## Verification

All seven gates pass. `bash Tests/run-all.sh`.

behaviour 130 · a11y 63 (now rendering meals, holidays **and** pantry) ·
queue 17 · contrast 31 pairs × 4 themes · trace 59 · schema conformance ·
render gate 10 views. 112 imports resolve; 52 precache paths all present.

**Not verified from here:** the live site, the camera, and any real database
round trip. The sandbox has no camera and cannot reach `*.github.io`.

---

## Next

1. **Smoke test the pantry** — the checklist is in `INTEGRATION_CHECKS.md`.
   The scan loop (scan → amount → save → scan) is the thing that decides
   whether a stocktake is bearable.
2. **Build the shopping list**, the shortfall diff and the holiday bridge —
   the rest of Phase 7. `phase7_build_brief.md` v3 is current and already
   reworked around revision 3 and 4.
3. Phase 8 has never been smoke-tested at all.

**Still open for the coordinator:** whether the finer food taxonomy
(fruit/dairy/meat/fish) is wanted. Deferred deliberately — revisit at ~50
real foods, because a half-filled taxonomy filters unreliably and that is
worse than none.
