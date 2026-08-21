# Home-OS: Phase 6 Build Brief — Meal Planner + Barcode Scanning
18 Aug 2026 v1

Gated on: Phase 5 **cleared** 18 Aug 2026 (all checks passed).

## Scope

Foods, meals, meal ingredients, macros calculation, the weekly plan, and
barcode scanning. Four tables: `foods`, `meals`, `meal_ingredients`,
`weekly_meal_plan`.

**Out of scope.** `pantry_stock` and `shopping_list_items` are Phase 7 —
their tables exist and reference `foods`, but nothing here writes to them.
Do not build "add to shopping list" in this phase; the generation logic
belongs with the list itself, and building half of it here would leave a
seam Phase 7 has to unpick.

## Files to create

| File | Purpose |
|---|---|
| `js/data/foods.js` | `foods` CRUD + barcode lookup |
| `js/data/meals.js` | `meals` + `meal_ingredients`, macro totals |
| `js/data/mealPlan.js` | `weekly_meal_plan` |
| `js/lib/barcode.js` | scanner abstraction (see below) |
| `js/lib/openFoodFacts.js` | remote lookup, isolated behind one function |
| `js/views/meals.js` | replaces the Phase 2 stub, whole |

`css/components.css` extended (whole file). `service-worker.js`: add every
new path **and bump `CACHE_NAME`**.

Route `meals` already exists in `routes.js` — that file is write-once and
must not be touched.

## Contracts to honour

Read these before writing anything. Phase 5 found two defects in cleared
code by doing so.

- **`{ ok, data|error }`** from every data module. Nothing thrown at views.
  No `user_id` on inserts — RLS handles scoping.
- **`flush(applyFn, { tables })`** — standing rule 7. Every module with an
  `online` listener passes its own tables and asserts `op.table` in the
  handler, throwing (not returning) on a foreign op. Returning would delete
  another module's queued write.
- **`lib/net.js`** — writes go through `attemptWrite()`. Do not await a bare
  Supabase call: a request with no connection can hang rather than fail.
- **Optimistic UI for any one-tap control** — count the action immediately,
  sync behind it, roll back visibly on outright failure. See
  `views/water.js` v3. This is the Phase 5 lesson and it is not optional.
- **`--control-border`** for any interactive boundary, not `--color-border`
  (standing rule 10).
- **Constrained controls for enum columns** (standing rule 1). `slot` and
  `day_of_week` have CHECK constraints — use `<select>`, never free text.

## Macros

`foods` stores macros **per 100g**; `meal_ingredients.quantity_g` is grams.
A meal's totals are therefore `sum(quantity_g / 100 * per_100g_value)`.

Store nothing derived. Macro totals are computed at read time, every time.
There is no column for them and one must not be added — the schema is
frozen, and a stored total silently rots the moment an ingredient changes.

Per-serving figures divide by `serves_override ?? default_serves`. Any macro
field may be null (a food added manually without nutrition data); a total
containing a null is **incomplete, not zero**. Say so — "2 of 5 ingredients
have no nutrition data" — rather than quietly reporting a wrong number.

## Barcode scanning

**Two implementations behind one interface.** `lib/barcode.js` exports a
single `scan()`; nothing else in the app knows which engine ran.

- `BarcodeDetector` where available (Chrome/Android — the primary target).
- `zxing-js` fallback otherwise. **Vendor it** into `js/vendor/`, as
  supabase-js was. No CDN at runtime: the app is offline-first and a runtime
  CDN dependency breaks that premise.
- Neither available → the manual-entry form, which must be reachable
  **without** attempting a scan at all. Scanning is an accelerator, never
  the only route in.

**Camera permission is a hard boundary.** Ask only when the user taps scan,
never on view load. A refusal is a normal answer, not an error — fall back
to manual entry with no scolding and no repeat prompt.

**Open Food Facts** (`lib/openFoodFacts.js`): free, no key, rate-limited by
courtesy. Lookup by barcode, map to our columns, set `source:
'openfoodfacts'`. It is a **third-party network call and will fail** — time
it out via `withTimeout()`, and treat "not found" as an ordinary outcome
that opens the manual form pre-filled with the barcode. Never block food
creation on it.

Products often carry partial or absent nutrition data. Import what exists,
leave the rest null, and let the user fill in the gaps.

## Deletion

`meal_ingredients.food_id` and `weekly_meal_plan.meal_id` are **on delete
restrict**. Deleting a food used in a meal, or a meal used in the plan, will
be refused by the database.

Per schema §2, the confirm step must report the dependent count *before*
attempting it — "used in 3 meals — remove anyway?" — not surface a raw
foreign-key error afterwards. That means counting dependents first.

## Accessibility (WCAG 2.2 / 2.1 AA)

- The weekly plan is a **grid of relationships**: use a real `<table>` with
  `scope` on headers, or an explicit grid role. Do not build it from divs.
  A 7×4 grid conveyed only by position is unusable non-visually.
- The scanner is a camera viewfinder — inherently visual. It needs a text
  status (`aria-live`) reporting scanning / found / not found, and manual
  entry must be operable without it.
- Macro figures need units in text, never colour-coded alone.
- Test all four theme combinations (standing rule 11), not just default.

## Verification before commit

- Render every changed view in jsdom against a stubbed client (standing
  rule 12). `node --check` alone is not sufficient — it passed a
  `ReferenceError` straight to production on 18 Aug.
- Resolve every import and confirm each named export exists.
- Compute contrast for every new token pair, all four themes.
- Confirm every precache path returns 200. Precache is all-or-nothing.

## Smoke test (add to `INTEGRATION_CHECKS.md`)

- [ ] Scan a real barcode → food created with `source: 'openfoodfacts'`;
      macros populated where the product has them.
- [ ] Unknown barcode → manual form opens pre-filled with the barcode, no
      dead end.
- [ ] Camera denied → manual entry still fully usable.
- [ ] Meal macros correct against hand calculation; a meal containing a
      food with null macros reports incomplete rather than a wrong total.
- [ ] `serves_override` changes per-serving figures without touching
      `meals.default_serves`.
- [ ] Deleting a food used in a meal reports the dependent count and is
      refused cleanly.
- [ ] Weekly plan navigable by keyboard and announces day + slot.

## Open question for the architect

`foods.barcode` has no unique constraint, so scanning the same product twice
creates a duplicate row. The schema is frozen, so this is an application
concern: look up by barcode before insert and offer the existing food.

Flag rather than guess if that read is not obviously correct under RLS.
