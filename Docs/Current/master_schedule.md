# Home-OS: Master Schedule
21 Aug 2026 v13

Supersedes v12. Older versions live in `Docs/Archive/`.

**This file now lives in the repo** (`Docs/Current/master_schedule.md`), not
only in project knowledge. The repo copy is canonical — if the two disagree,
the repo wins, because it is versioned alongside the code it describes.

## Canonical documents
All in `Docs/Current/`:
- `00_vision.md`, `01_behavioural_principles.md`, `PROJECT_BLUEPRINT.md`
- `schema.md` — **single source of truth for the database.**
- `GEMINI_BUILD_CONVENTIONS.md` — how code is written (incl. WCAG 2.2/2.1 AA).
- `REPO_STRUCTURE.md` — fixed repo layout.
- `INTEGRATION_CHECKS.md` — per-phase seam tests.
- `BUILD_PROCESS_CONTROL.md`, `BUILDER_CHAT_PREAMBLE.md` — the loop.
- `PHASE2_HANDOFF.md` … `PHASE6_HANDOFF.md` — records later phases read for
  the contracts they wire into.
- `phaseN_build_brief.md` — the task for phase N.

## Phase status

| Phase | Scope | Status | Brief |
|---|---|---|---|
| 1 | Supabase foundation | **Complete** | phase1_instructions.md |
| 2 | Shell + auth + nav + theming + settings + export + offline | **Complete** | phase2_build_brief.md |
| 3 | Exercise cards + logging | **Complete** | phase3_build_brief.md |
| 4 | Chores: projects, tasks, calendar, recurrence | **Complete** | phase4_build_brief.md |
| 5 | Weight + water tracker | **Complete — cleared 18 Aug** | phase5_build_brief.md |
| 6 | Meal planner + barcode scanning | **Built — awaiting smoke test** | phase6_build_brief.md |
| 7 | Pantry stock + shopping list | Brief written — **gated on Phase 6 clearing** | phase7_build_brief.md |
| 8 | Holidays + work-location calendar | Brief written — **buildable now, ahead of Phase 7** | phase8_build_brief.md |
| 9 | Dashboard | Ready | to write |
| 10 | Notifications (opt-in, per-type) | Ready | to write |

Phase 5 cleared 18 Aug 2026 after three rounds of smoke testing. Phase 6 was
built 21 Aug and is **awaiting the coordinator's smoke test** — built is not
cleared. Phase 7's **brief** is written (21 Aug); Phase 7's **build** is gated on
Phase 6 clearing, because Phase 7 reads straight through four Phase 6 tables
and would inherit any defect the smoke test finds.

## Completion log

**Phase 1 — Supabase.** Complete. 17/17/1/17; deletion rules verified.

**Phase 2 — Shell.** Complete, cleared 19 Jul. 7/7 smoke test. Supabase
vendored to `js/vendor/` for offline.

**Phase 3 — Exercises.** Complete, cleared 20 Jul. 5/5 smoke test. Reusable
`card.js` + `completionStamp.js` shipped.

**Phase 4 — Chores.** Complete, cleared 20 Jul. 6/6 smoke test. `rrule.js`
hand-verified across a year boundary. PM rulings: recurrence anchor on
`calendar_events.start_date` only — accepted, logged as tracked debt.

**Phase 5 — Weight + water.** Complete, cleared 18 Aug. Took three smoke-test
rounds; the offline path was wrong twice before it was right. Two defects in already-cleared code found by reading it before building
on it, and fixed:
- **Offline queue was not table-scoped** — `flush()` replayed every pending
  op through whichever handler it was given, so `exercises.js` would try to
  insert queued chore/weight/water rows into `exercise_logs`. Reproduced in a
  runtime test, then fixed via a `{ tables }` filter. Closes the "offline-
  write pattern drift" debt carried since Phase 4.
- **`units.js` rounding carry** — 69.8 kg rendered as "10st 14lb". Fixed, and
  the missing display-unit→kg input direction added.

Also this phase, all out-of-band: change-password with re-authentication and
a reset route for magic-link users; magic-link and password-reset sign-in
(`views/signin.js`); the `detectSessionInUrl` auth fix; an app-wide WCAG
1.4.11 control-contrast fix; `lib/net.js` offline/timeout guards; and
optimistic one-tap logging.

**Phase 5 smoke test — what it caught.** Three rounds. Round 1: offline
water logging did nothing (fetch hangs rather than failing, so the queue was
never reached); entry unit wrongly tied to display unit; password change
impossible for magic-link users. Round 2: a `ReferenceError` shipped to
`main` and broke the settings route — `node --check` passes undefined
identifiers. Round 3: the offline fix still awaited the network, disabling
the button after one tap; replaced with optimistic logging.

Worth stating plainly: **every one of those was found by testing on the real
device, not by any check run before commit.** The gates were strengthened
each round (rules 10–12), but the smoke test remains the thing that finds
what the gates do not.

**Phase 6 — Meals + barcode.** Built 21 Aug, commit `4c7adbc`. Awaiting
smoke test. Full record in `PHASE6_HANDOFF.md`.

*The open question resolved.* `foods.barcode` has no unique constraint and
the schema is frozen, so de-duplication is an application concern.
`findByBarcode()` looks up before every insert; that read **is** correct
under RLS, because `using (auth.uid() = user_id)` scopes it to exactly the
rows where a duplicate matters. It is not sufficient alone, though — a food
created offline is invisible to any query, so the queue is checked too. On a
match the user chooses; nothing is silently de-duplicated or duplicated.

*Defect found in cleared code and fixed.* `offlineQueue.js` memoised a
**rejected** `openDb()` promise, so one transient IndexedDB failure left the
queue silently dead for the rest of the session — offline writes rolled back
instead of stored, on the exact path that exists to prevent that. Found by
the new render gate; proven by reverting the fix in a throwaway copy and
watching the retry test fail. `v3`.

*Two findings from executing the scanner before building on it.* A UPC-A
symbol decodes to twelve digits, not the thirteen-digit EAN-13 form the
databases key on — unnormalised, that is a duplicate straight past the check
above. And the full scanner library bundles to 406 KB; only the UPC/EAN
readers are needed, at 58 KB. Both are recorded in the handoff.

*Also this phase:* `countFoodDependents()` counts all three
restrict-referencing tables rather than only meals, because counting only
meals would say "used in 0 meals" and then hit a raw foreign-key error.

## Phase 8 brief written (21 Aug 2026) — and a recurrence trap found

Written before Phase 7 deliberately. Phase 8 touches `holidays`, its two
child tables and `calendar_events` — **not one Phase 6 table** — and builds
on cleared Phase 4, so it stacks testable work without compounding the
unverified Phase 6 foundation. Phase 7 stays gated. Deviation from schedule
order recorded here per `BUILD_PROCESS_CONTROL.md`.

**`lib/rrule.js` silently ignores `UNTIL` and `COUNT`.** Not rejected, not
warned — ignored. Verified: `FREQ=DAILY;UNTIL=20260828` over a 15-day window
returns 15 dates, not 5. A holiday is a bounded range, so the obvious
encoding would have produced a holiday that never ends — looking correct for
a fortnight and wrong forever after. `rrule.js` is write-once and must not
be edited to fix it.

Decided: a holiday gets **one `calendar_events` row with a NULL recurrence
rule**, marking its start. The span is read from `holidays.start_date` /
`end_date`, which is the source of truth. Work-location patterns must be
open-ended, and the UI must not offer an end date the engine will ignore.
Phase 8 adds `assertSupportedRule()` to `data/calendar.js` to reject
`UNTIL`/`COUNT` at the boundary — verified safe first by reading
`buildRuleFromForm()` in `views/chores.js`, which emits only
`FREQ`/`INTERVAL`/`BYDAY`/`BYMONTHDAY`.

**The holiday → shopping bridge cannot be built yet.**
`shopping_list_items.food_id` is `NOT NULL references foods(id)`, and a
holiday purchase item is a bare title — "sun cream", "euros". The only
schema-legal route is creating a `foods` row for each, which puts sun cream
in the meal planner's ingredient picker, and `foods.source` is
CHECK-constrained so such rows cannot be tagged and filtered back out.
Deferred to the Phase 7 build, which owns the table and its UI; that
integration check moves to the Phase 7 block.

**This is the second place the frozen schema has blocked the blueprint** —
the first was Phase 7's missing purchase date. Two is a pattern, and worth a
coordinator decision rather than two more workarounds.

Also noted: there is **no work-location route** and `routes.js` is
write-once, so work location lives as a second section inside
`views/holidays.js`.

## Defect found in cleared Phase 4 code while preparing Phase 8 (21 Aug 2026)

`data/calendar.js` v1 `listEvents()` returned **every row** in
`calendar_events` regardless of `event_type`, and `views/chores.js` rendered
all of them as chore occurrences. Invisible while chores were the only
writer; it would have started silently corrupting the chores calendar the
moment Phase 8 wrote its first `work_location` row.

Found by reading Phase 4 code before writing the Phase 8 brief — the fourth
consecutive phase where reading existing code found a defect that no gate
caught.

`listEvents()` now **requires** an explicit `eventTypes` filter and
validates it against the CHECK constraint. Required rather than defaulted,
because forgetting the filter is precisely the failure being fixed and a
default would let the next caller repeat it quietly. `data/calendar.js` v2,
`views/chores.js` v3, `CACHE_NAME` v17, regression test in
`Tests/behaviour.mjs`.

*Also checked and NOT a defect:* `rrule.expand()` throws on a null
recurrence rule, which looked like a second Phase 8 landmine. The chores
view already handles a null rule as a one-off on `start_date` and wraps the
call in a try/catch. Worth recording that the call site was read rather than
the behaviour inferred from the library — the inference would have been
wrong. `rrule.js` is write-once and was not touched.

## Two fixes before the Phase 6 smoke test (21 Aug 2026)

Found by re-reading the riskiest paths once more, not by any gate. Both
would have wasted the coordinator's testing time. `views/meals.js` v2,
`CACHE_NAME` **v16**.

1. **A typed barcode that could not be normalised was silently dropped to
   null on save.** Correct for the database — an empty string would be a
   distinct value and would break barcode matching — and wrong to do without
   saying so (standing rule 8). Now reported on both the add and edit forms.
2. **Inline quantity and servings edits dropped focus to `<body>`.** The
   change handler re-renders the whole list, destroying the field the user
   is standing in. Ids are stable across renders, so focus is now restored
   (WCAG 3.2.2).

`PHASE6_SMOKE_ROUTE.md` added: the ordered route through the Phase 6 checks,
sequenced so anything that would invalidate later steps fails first, with a
"rule out the environment" step at the top covering the paused-Supabase and
stale-cache traps that have each already cost a session.

Note that `CACHE_NAME` was bumped for a **content-only** change. No path
moved; standing rule 3 still applies.

## Phase 7 brief written (21 Aug 2026) — two schema gaps decided

Written ahead of the Phase 6 smoke test because a brief is cheap to revise
and code built on an unverified foundation is not. Two problems the frozen
schema does not solve had to be decided in it:

**No unit on either quantity column.** `pantry_stock.current_qty` and
`shopping_list_items.qty_needed` are bare `numeric`. "Plan needs minus
pantry stock" is arithmetic between them and `meal_ingredients.quantity_g`,
which is grams. **Decided: both are grams** — the only option the frozen
schema supports, since the pack-count reading cannot be diffed against grams
without a pack size and `foods` has no such column. This needs a
**documentation** amendment to `schema.md` (a canonical-unit note in the
Notes cell, exactly as `weight_kg` and `ml_logged` already carry), not a
schema change. Phase 7 makes that edit first, before any code.

**No purchase date, so "near expiry" has no honest source.**
`shelf_life_days` exists; nothing records when an item was bought.
**Decided: use `updated_at` as a "last restocked" proxy and never present it
as an expiry date** — the UI says "stocked about 9 days ago; this usually
keeps about 14", never "expires Tuesday". Principle 5 requires the signal on
two surfaces, so dropping it is not an option. The proxy is wrong when a row
is edited for an unrelated reason; if that proves misleading in use, the
honest fix is **a schema change to add a purchase date, which is the
coordinator's call, not a builder's** — it would be the first since Phase 1.

Also settled in the brief: the shortfall maths goes in `lib/shortfall.js` as
a pure function with the **view** orchestrating, because
`REPO_STRUCTURE.md` forbids `data/` importing `data/` and the calculation
spans three domains. And Phase 7's "use these up" section in
`views/meals.js` is a declared cross-phase edit — additive, last, and
re-gated afterwards.

## Verification harness committed (21 Aug 2026)

`Tests/` now holds the render gate, behavioural tests, queue tests,
structural a11y checks and contrast maths, behind one entry point:
`bash Tests/run-all.sh`.

Until now these were rebuilt from scratch in every session and died with it.
That is wasteful, but the real cost is that each rebuild re-derived the same
lessons — and a gate is only worth what its comments record about the bug it
was written for.

`Tests/self-test.sh` proves the render gate still catches the 18 Aug
`ReferenceError`: it injects an undefined identifier, confirms `node --check`
passes it, and confirms the gate does not. **Run it after any change to the
gate.** A gate nobody has proven is a gate nobody should trust.

Not for the coordinator — deployment is still copy-paste through the GitHub
web UI, and none of this runs there. `node_modules` is gitignored; the
harness resolves jsdom from wherever the session installed it. Note that
`NODE_PATH` does **not** work for ES modules, so the modules are linked into
the shadow copy rather than exported.

**These gates do not replace the smoke test** and must never be cited as
though they had. Every significant defect this project has hit was found on
a real device.

## Process change — direct repo access (from 17 Aug 2026)

The coordinator supplied a GitHub token, so the architect chat now reads the
repo and commits to `main` directly. This replaces copy-paste deployment.

What this changes:
- **Reference files are read, not pasted.** This is why Phase 5 found two
  defects in cleared code — the paste-based flow only ever showed the files a
  brief thought to ask for.
- **Whole-file delivery in chat no longer applies**, but the discipline does:
  any file rewritten in full is diffed against its previous content to prove
  nothing was dropped.
- **Verification moved earlier.** Import/export resolution, contrast maths,
  syntax and behavioural tests now run before the commit, not after deploy.

What this does **not** change:
- The coordinator still runs the live smoke test. The build sandbox cannot
  reach `*.github.io` (`host_not_allowed`), so nothing here substitutes for
  testing in a real browser against real Supabase.
- Phases are still gated. Built ≠ cleared.

**Open question for Phase 6 — decided 21 Aug: keep it combined.** The case
for a separate builder chat was that a builder needed files pasted to it.
That is no longer how the work happens, and reading the repo directly is now
the thing that finds defects — it found one in cleared code again this phase.
Separation would reintroduce the guessing it was meant to prevent. Revisit
only if a phase is large enough that context becomes the binding constraint.

## Write-once rule amended (17 Aug 2026)

`js/app.js` was declared write-once in Phase 2, but it also owned the entire
sign-in UI — so *any* change to authentication forced an edit to it. The rule
was unworkable as written.

Amended: **`app.js` owns bootstrap and auth state; auth UI lives in
`js/views/signin.js`.** The sign-in screen was extracted there whole. app.js
retains only the state machine (`getSession`, `onAuthStateChange`).

Write-once files are now: `router.js`, `routes.js`, `tokens.css`,
`lib/rrule.js`. `supabaseClient.js` left the list on 17 Aug when its auth
config turned out to contain a bug (see below); it is *restricted* — client
configuration only. `app.js` is *restricted*, not frozen:
bootstrap and auth-state changes only.

## Auth bug, 17 Aug 2026 — `detectSessionInUrl`

Sign-in was broken end to end and the cause was one line in
`supabaseClient.js`: `detectSessionInUrl: false`.

supabase-js 2.45.4 defaults to implicit flow, so magic-link and
password-reset links return tokens in the URL hash. With detection off the
client never read them — the link "worked", then dropped the user back on
sign-in with no session and no error. Almost certainly set false in Phase 2
out of a reasonable fear of colliding with the hash router.

It does not collide: the client only treats a hash as a grant when it parses
an `access_token` or `error_description`, and `#/dashboard` parses to a
single valueless key. Verified against the vendored bundle before changing
it. `flowType` is now pinned to `implicit` explicitly, because that is what
preserves `type=recovery` — switching to `pkce` would silently turn every
password-reset link into an ordinary sign-in.

Lesson: **a defensive setting that is never exercised is a bug waiting for
the day the feature ships.** Phase 2 had no magic link and no reset, so
nothing tested this flag for a month.

## Verification gap found 18 Aug 2026 — `node --check` is not enough

A `ReferenceError` (`el is not defined`) shipped to `main` and broke the
settings screen. The pre-commit gate ran `node --check` on every changed
file and passed it, because `node --check` only parses syntax — an undefined
identifier is perfectly valid syntax and only fails when the line executes.
The call sat inside a click-adjacent branch that nothing exercised before
deploy.

Cause: a helper (`el()`) was copied from `views/weight.js` into
`views/settings.js`, which builds nodes with `document.createElement`
directly and has no such helper.

**Gate added:** every view is now rendered in jsdom against a stubbed
Supabase client before commit, which executes the module top to bottom and
surfaces exactly this class of error. Confirmed it catches the bug it was
written for. Static syntax checks stay, but they are no longer the last word.

Standing rule 12 below follows from this.

## Standing rules (apply to every later phase)

1. **Constrain UI inputs to the schema** — enum/`CHECK` columns get a
   `<select>`/constrained control, never free text. (P3 bug #1)
2. **`css/components.css` delivered whole**, never a fragment. (P3 bug #2)
3. **Bump `CACHE_NAME` on any precached content change**, even if the SW
   script is otherwise unchanged. (P3 bug #3)
4. **Precache is all-or-nothing** — every path must 200, or install fails
   silently and the whole shell stays stale.
5. **Check the `error` field on every Supabase call** before treating an op
   as done — `supabase-js` resolves rather than rejects on DB errors.
6. **No silent failures** — queue failures are logged explicitly.
7. **Every data module must pass `{ tables }` to `flush()`** and assert
   `op.table` in its handler. Omitting the filter reintroduces the Phase 5
   bug for every table in the queue. *(New — P5)*
8. **Never hardcode a credential.** The repo is public and Pages serves the
   JS to anyone; the publishable key is safe only because RLS is the
   boundary. *(New — P5)*
9. **File version headers increment within a session** when content changes,
   not only across days.
10. **A control's boundary must clear 3:1** where nothing else identifies it.
    Use `--control-border`, not `--color-border`, for anything interactive.
    Container borders stay decorative. *(New — P5 audit)*
11. **Compute contrast for all four theme combinations**, not just the
    default. The 1.4.11 failure below sat undetected from Phase 2 because
    only the default theme was ever checked by eye. *(New — P5 audit)*
12. **Execute the code before committing it.** `node --check` proves syntax,
    not that a module runs. Render each changed view in jsdom against a
    stubbed client. Never copy a helper between files without confirming the
    destination defines it. *(New — 18 Aug)*

13. **Vendor the narrowest thing that works.** The full scanner library is
    406 KB because one convenience class pulls in every 1D format; the four
    product formats need 58 KB. Check what a dependency actually costs before
    precaching it, and record the narrowing so a later phase does not assume
    capabilities that were deliberately left out. *(New — P6)*
14. **Execute a third-party decoder against known input before building on
    it.** Running the scanner over synthetic EAN-13 rasters in Node exposed
    that UPC-A returns twelve digits rather than thirteen — a silent
    duplicate-row bug that no amount of reading the docs would have surfaced.
    *(New — P6)*
15. **A memoised promise must not cache a rejection.** `openDb()` did, and
    one transient failure disabled offline writes for the whole session.
    Anywhere a promise is cached for reuse, clear it on failure. *(New — P6)*

## Tracked debt

| Item | Origin | Status |
|---|---|---|
| Data-module offline-write drift | P4 | **Closed P5** |
| Offline linked-row creation for repeatable chores | P4 | Open |
| Phase 9 join: `chore_tasks` × `calendar_events`, large future-dated volumes | P4 | Open — address in the P9 brief |
| Water glass size / daily target not configurable | P5 | Open — needs `user_settings` columns |
| High-contrast + dusk theme contrast | P5 | **Closed P5** — all four combinations computed |
| Control-boundary contrast, 1.4.11 (pre-existing, P2) | P5 audit | **Closed P5** — `--control-border` |
| GitHub token scoped to all 13 org repos | P5 | Open — narrow to `Home-OS` and rotate |
| Offline queue permanently dead after one failed IndexedDB open | P2 (found P6) | **Closed P6** — `offlineQueue.js` v3 |
| Vendored scanner reads UPC/EAN only, not QR or Code 128 | P6 | Open by design — rebuild from the package if a later phase needs more |
| No `User-Agent` sent to Open Food Facts (browsers forbid it) | P6 | Open — unfixable from a browser, documented in the module |
