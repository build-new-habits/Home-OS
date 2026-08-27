# Home-OS — session start
27 Aug 2026

Paste the short version below into a new chat, then read this whole file.

---

## Short version — paste this

> You are the architect/builder for **Home-OS**, a single-user PWA (vanilla
> JS ES modules, no framework, GitHub Pages + Supabase). I am Graeme, the
> project coordinator.
>
> A GitHub fine-grained PAT is in this project's knowledge (file: `Token`).
> Use it to read and commit to `build-new-habits/Home-OS` on `main` via the
> GitHub API. Verify it works first.
>
> **Read `Docs/Current/` in the repo before doing anything else.** It is the
> canonical, versioned documentation and it is NEWER than the copies in this
> project's knowledge. Where they disagree, the repo wins. Start with
> `SESSION_START.md`, then `master_schedule.md`, then the newest
>  `PHASEn_HANDOFF.md` (newest is `PHASE7_PHASE9_HANDOFF.md`), then
> `schema.md` and `GEMINI_BUILD_CONVENTIONS.md`.
>
> **Read existing code before extending it.** Every significant defect this
> project has hit was found that way. Don't trust my summary of the code,
> and don't trust your memory of it. Read the file.
>
> Run `bash Tests/run-all.sh` before every push. Seven gates.

---

## Current state, 27 Aug 2026

- `main` @ **`4a808fe`**. Cache **`home-os-shell-v41`**, **63 precache
  entries**.
- **Schema is at revision 7.** Migrations 003–007 all applied and verified.
  18 tables.
- **Every phase except 10 (notifications) exists in code.**

**Before testing anything: Settings → This device names the installed
build.** Twice in one session a bug report turned out to be an older build
still being served. If a fix looks missing, check that first — force-close
the app and reopen twice, since the first reopen installs and the second
serves.

**Supabase:** project `vkjwwnjhizrlqcovpdco`, named **"Home OS"** in the
dashboard. There is a second, unrelated project called **`Alongside-Learn`**
on the same account. Running SQL against the wrong one has already happened
once. **Confirm the project name in the editor before running anything.**

---

## What is actually verified, and what is not

**Confirmed working on device:**
- Meals: create, ingredients, quantities, units (g/ml/item)
- Unit conversion — 2 items × 25 g = 50 g → 25 kcal, checked by hand
- Food categories, the searchable grouped ingredient picker
- Barcode scanning: reads a real product, fills name and macros
- Capturing a real cupboard — 65 pantry rows exist
- Migrations 003–007 applied; RLS `true`; 18 tables

**Built but NOT confirmed on device — this is most of the app right now:**
Everything from 27 Aug. Ten screens changed: pantry, chores, meals, foods,
holidays, shopping, dashboard, calendar, weekly plan, and the two hubs.

**The record that matters:** every previous session, a device pass found
something no gate could see — `[hidden]` defeated by the CSS cascade, a
stale stylesheet served against new JavaScript, seven scanned jars saved as
`0 g`. That record is unbroken. All seven gates passing is necessary and
nowhere near sufficient.

`PHASE7_PHASE9_HANDOFF.md` §8 lists what to test first, in dependency order.

---

## Gotchas that have already cost time

1. **Wrong Supabase project.** See above. `relation "foods" does not exist`

0. **A passing gate is not evidence until you have watched it fail.** Four
   harness defects were found on 27 Aug alone, including a trace that
   printed PASS before its last block ran — so a failure there printed FAIL
   and still exited 0. When you change a gate, make it fail on purpose and
   check it still fails for the right reason.

0b. **Precache must bypass the HTTP cache.** `cache.addAll()` uses the
   browser's HTTP cache, and GitHub Pages serves with a ten-minute max-age.
   Bump `CACHE_NAME` and redeploy inside that window and the "new" cache
   fills with stale files — new JavaScript against an old stylesheet, frozen
   until the next bump. `install()` uses `{ cache: 'reload' }` for this
   reason; do not remove it.

0c. **Never patch a large file with unasserted `replace()` calls.** That
   corrupted `views/chores.js` on 27 Aug: an anchor matched in the wrong
   place and duplicated a block. Restore from `main` and re-apply in ONE
   script where every replacement asserts its anchor is present AND unique.
   means you are in `Alongside-Learn`.
2. **`begin;`/`commit;` in the Supabase SQL editor silently rolls back.**
   The editor wraps each execution in its own transaction; the explicit
   COMMIT does not take effect and everything is undone on disconnect —
   while reporting *"Success. No rows returned"*. **Never trust "Success"
   for DDL. Verify in a SEPARATE execution.**
3. **A gate that drives the UI in JavaScript does not test what the browser
   enforces.** `min="0.1"` with `step="1"` made every round number
   unenterable and all seven gates passed it, because jsdom does not run
   constraint validation and the trace bypasses it by setting values
   directly. Attributes the platform enforces need a structural check.
4. **A guard made of a boolean is not a guard.** Android's native `<select>`
   fires `change` on dismissal even when the same option is re-selected, so
   opening a dropdown defeated a "must confirm" flag. Use a sentinel value
   the user can see, not a variable tracking intent.
5. **A memoised promise must not cache a rejection.** `openDb()` did, and
   one transient IndexedDB failure disabled offline writes for the session.
6. **`lib/rrule.js` silently ignores `UNTIL` and `COUNT`.** A bounded range
   encoded as a recurrence rule runs forever. `assertSupportedRule()` in
   `data/calendar.js` guards the boundary; `rrule.js` is write-once.
7. **A UPC-A barcode decodes to TWELVE digits, not thirteen.** Both scanner
   engines do this. `normaliseBarcode()` is the only supported route from a
   raw scan to a stored barcode.
8. **`calendar_events` is shared** by chores, holidays, work locations and
   custom entries. `listEvents()` requires an explicit `eventTypes` filter.
9. **`meal_ingredients.quantity_g` is a historical name.** Since revision 4
   it holds whatever `unit` says. Read `unit` before using it.
10. **The vendored scanner reads UPC/EAN only** — deliberately, 58 KB rather
    than 406 KB. It will not read QR, Code 128 or DataMatrix.
11. **`node_modules` is not committed.** `bash Tests/run-all.sh` will tell
    you how to install jsdom. `NODE_PATH` does not work for ES modules.

---

## The seven gates

```
bash Tests/run-all.sh      # all seven
bash Tests/self-test.sh    # proves the render gate still catches its bug
```

| Gate | Covers |
|---|---|
| `render-gate.mjs` | every view executed in jsdom, no runtime errors |
| `behaviour.mjs` | 130 assertions — macros, units, barcodes, freshness |
| `queue.mjs` | 17 — offline queue retry and table scoping |
| `a11y.mjs` | 63 structural checks on the **rendered DOM** |
| `contrast.mjs` | 31 pairs × 4 themes = 124 checks |
| `schema-conformance.mjs` | every column name vs `schema.md` |
| `trace.mjs` | 59 interactions, every database write inspected |

**Extend them with the code.** A gate that does not cover the new path is
not protecting it. And when a gate finds a real bug, add the assertion that
would have caught it earlier and say in the comment which bug it was — the
comments are why these files are worth keeping.

**They do not replace the smoke test.** Every significant defect this
project has hit was found by Graeme on a real device.

---

## Decisions settled, so they are not relitigated

- **Phases run in the architect chat**, not a separate builder chat.
- **Supabase free tier is fine** — Graeme uses the app most days, so it
  will not idle out.
- **`foods` is "things you buy"**, not food. Nine categories. `household`
  is consumable, `home` is durable.
- **Quantities carry units** everywhere. Nothing is grams by assumption.
- **A finer taxonomy (fruit/dairy/meat/fish) is deferred, not dropped.**
  Revisit at ~50 real foods. A half-filled taxonomy filters unreliably,
  which is worse than none.
- **Nothing derived is stored.** Macro totals are computed on every read.
- **A missing value is INCOMPLETE, never zero and never guessed.** This
  applies to macros, to conversion factors, and to freshness.

---

## Outstanding for the coordinator

- Smoke test the pantry, scanning into it, and Phase 8.
- Decide whether `meal_ingredients` needs the fine-grained food taxonomy.
- The GitHub token is scoped to all 13 org repos — narrow to `Home-OS` and
  rotate.

---

## What later phases should reuse rather than reimplement

- `computeMacros()` and `toGrams()` in `data/meals.js` — pure, and
  `toGrams()` is the ONLY supported unit conversion. Two implementations of
  one rule drift, and this one decides what ends up in the basket.
- `freshness()` / `useSoon()` in `data/pantry.js` — pure, fixed-date
  testable.
- `formatQuantity()` in `lib/units.js` — always emits the unit.
- `FOOD_CATEGORIES`, `isEdible()`, `groupByCategory()` in `data/foods.js`.
- `openScanner()` in `components/scannerDialog.js` — shared by meals and
  pantry; releases the camera on every path.
- `normaliseBarcode()` in `lib/barcode.js`.
- `DAYS` / `SLOTS` in `data/mealPlan.js` — canonical enum values.
