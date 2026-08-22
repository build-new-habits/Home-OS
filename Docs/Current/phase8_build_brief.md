# Home-OS: Phase 8 Build Brief — Holidays + Work Location
21 Aug 2026 v1

**Built out of order, deliberately.** The schedule puts Phase 7 first, but
Phase 7 is gated on Phase 6 clearing and Phase 8 is not: it touches
`holidays`, `holiday_checklist_items`, `holiday_purchase_items` and
`calendar_events`, and **not one Phase 6 table**. It builds on Phase 4,
which is cleared. So it stacks testable work without compounding the
unverified foundation. Record the deviation in the handoff
(`BUILD_PROCESS_CONTROL.md`).

## Scope

Holidays with checklist and purchase items, and the work-location calendar.

*"...and a work schedule you can't see from home"* — `00_vision.md`. That is
the whole point of the second half: knowing where you are meant to be next
Tuesday without asking anyone.

---

## Read this first: the recurrence engine cannot express an end date

`lib/rrule.js` supports `FREQ` (DAILY/WEEKLY/MONTHLY), `INTERVAL` and
`BYDAY`. It **silently ignores `UNTIL` and `COUNT`** — it does not reject
them, it does not warn, it just carries on.

Verified against the real engine:

```
FREQ=DAILY;UNTIL=20260828  over a 15-day window  ->  15 dates, not 5
FREQ=DAILY;COUNT=7         over a 15-day window  ->  15 dates, not 7
```

A holiday is a **bounded date range**, so the obvious encoding — one
`calendar_events` row with `FREQ=DAILY;UNTIL=<end_date>` — produces a
holiday that never ends, spreading across the calendar forever. It would
look right for the first fortnight and wrong thereafter, which is the worst
kind of bug to find.

`rrule.js` is **write-once** and must not be edited to fix this.

### Consequences, all three of them

**1. Holidays get ONE `calendar_events` row with `recurrence_rule` NULL.**
`start_date` is the holiday's start; `source_id` is the holiday's id (a soft
pointer, not a FK — schema.md §2); `title` is the holiday title. That row
marks where the holiday begins. **Never encode the span as a daily rule.**

The full span is rendered from the `holidays` table itself, which has both
`start_date` and `end_date`. Any view wanting the range reads it there. This
is not a workaround — `holidays` is the source of truth for the range and
`calendar_events` is a projection of it.

`views/chores.js` already handles a null `recurrence_rule` correctly (a
one-off on `start_date`, inside a try/catch), so this is safe for anything
that later reads all event types.

**2. Work-location rules must be open-ended.** "In the office every Tuesday"
is expressible. "Every Tuesday until Christmas" is not. Do not offer an end
date in the UI that the engine will ignore — ending a pattern means editing
or deleting the row, and the UI should say so plainly rather than presenting
a field that does nothing.

**3. Add a guard so this cannot be got wrong again.** `data/calendar.js`
gains an exported `assertSupportedRule(rule)` that returns
`{ ok: false, error }` for any rule containing `UNTIL` or `COUNT`, naming
what is unsupported and why. Call it on every write path in this phase.

**Already checked (21 Aug), so you do not need to.** `views/chores.js`
`buildRuleFromForm()` emits only three shapes:

```
FREQ=WEEKLY;INTERVAL=n;BYDAY=...
FREQ=MONTHLY;INTERVAL=n;BYMONTHDAY=n
FREQ=DAILY;INTERVAL=n
```

No `UNTIL`, no `COUNT`. The guard cannot break cleared Phase 4 code. This
was verified by reading the call site rather than assuming, because the
guard would otherwise have broken working chores recurrence — and *almost
certainly* is not a standard this project uses.

---

## The second thing the frozen schema does not support

`INTEGRATION_CHECKS.md` currently says a purchase item with
`send_to_shopping = true` should create a `shopping_list_items` row with
`source = 'holiday'`.

**It cannot, as written.** `shopping_list_items.food_id` is
`uuid NOT NULL references foods(id)`. A holiday purchase item is a bare
`title` — "sun cream", "euros", "travel adaptor". None of those has a
`foods` row, and most should not have one.

The only thing the frozen schema permits is creating a `foods` row for each,
which puts sun cream in the meal planner's food list and in every ingredient
picker. `foods.source` is CHECK-constrained to `('manual','openfoodfacts')`,
so there is no way to tag such a row as "not really a food" and filter it
back out.

**Decision: Phase 8 stores the `send_to_shopping` flag and does NOT create
shopping rows.** The bridge is deferred to the Phase 7 build, which owns
`shopping_list_items` and its UI, and can answer the question with the
shopping list actually on screen. Move that integration check from the
Phase 8 block to the Phase 7 block, with a note saying why it moved.

Building it now would write rows into a table with no UI — an untestable
feature, which is exactly what this phase is meant to avoid.

**For the coordinator, not the builder:** the real fix is either accepting
non-food items in `foods`, or a schema change (a nullable `title` on
`shopping_list_items`, or a `kind` column on `foods`). That is the **second**
place the frozen schema has blocked the blueprint — the first was Phase 7's
missing purchase date. Two is a pattern worth a decision rather than two
more workarounds.

---

## There is no work-location route, and `routes.js` is write-once

The routes are: dashboard, water, exercises, chores, weight, meals, pantry,
shopping, holidays, settings. There is no work route and none can be added.

**Work location lives in `views/holidays.js`**, as a second `<h2>` section
below holidays. Retitle the page *"Holidays & work"* — the `<h1>` is the
view's own and can change; the nav label comes from `routes.js` and cannot.
Note the mismatch in the handoff so it is not read as a bug later.

---

## Files to create

| File | Purpose |
|---|---|
| `js/data/holidays.js` | `holidays` + both child tables |
| `js/data/workLocation.js` | `calendar_events` where `event_type='work_location'` |
| `js/views/holidays.js` | replaces the Phase 2 stub, whole — both sections |

`js/data/calendar.js` v3 — add `assertSupportedRule()`. It is shared and not
write-once; extend by addition, change no existing signature.
`css/components.css` whole file, diffed. `service-worker.js`: two new paths,
**`CACHE_NAME` v18**, taking the precache to **51**.

`data/workLocation.js` may not import `data/calendar.js` — `REPO_STRUCTURE`
forbids `data/` importing `data/`. Either duplicate the small amount of
query code with a comment saying why, or lift the shared helper into
`lib/`. Prefer the second if it is more than a few lines.

---

## Behaviour

**Holidays.** Create with title, start and end date. Validate `end_date >=
start_date` **before** the insert — the schema has no CHECK for it, so a
backwards holiday would be accepted and then render as nothing.

Checklist and purchase items are both `pending`/`complete` with a CHECK
constraint, so use constrained controls, never free text (standing rule 1).
Ticking one is a light, repeated action: **optimistic**, following
`views/water.js` v3. Queue offline — packing happens away from wifi.

**Deleting a holiday cascades both child tables.** Count both and name them
in the confirm before acting — *"This also removes 8 checklist items and 5
things to buy"* — the same discipline as the Phase 6 restrict deletes,
though here it cascades rather than restricts, so the wording is "will also
be deleted", not "must be removed first".

Also delete the holiday's `calendar_events` row. It is a **soft pointer**,
not a FK, so nothing cascades it for you and an orphan would sit on the
calendar forever pointing at a holiday that no longer exists. Do the
calendar delete *after* the holiday delete succeeds, and if it fails, say so
rather than leaving it silently.

**Work location.** A named location with a recurrence rule — "Office,
Tuesdays and Thursdays". `location_label` carries the place;
`recurrence_rule` the pattern; `start_date` the anchor. Reuse Phase 4's
`expand()` and `describe()`, and show the same 3-month forward preview
before saving (principle 4 — recurrence gets verified at creation time, not
assumed).

Nothing here is a mapping feature. `location_label` is a text label and the
integration checks say to ignore map styling.

---

## Accessibility (WCAG 2.2 / 2.1 AA)

- Holiday date ranges read as text — *"24 to 31 August 2026"* — never as a
  coloured bar alone.
- The work-location pattern is described in words next to the control, via
  `describe()`, so the rule is legible without decoding an RRULE.
- Checklist tap targets **≥ 44×44**: ticking items while packing is a
  repeated one-tap action.
- Item state is a word — "Packed" / "To do" — never colour alone, and the
  live region announces the item name with its new state.
- An unticked item is **not** a failure. Neutral framing, no red, no
  counting down at the user (principle 1).
- Two `<h2>` sections under one `<h1>`; never skip a level.
- New colour pairs: contrast across **all four theme combinations**, added
  to `Tests/contrast.mjs`.

---

## Verification before commit

```
bash Tests/run-all.sh
```

Extend it — a gate that does not cover the new code protects nothing:

- `Tests/behaviour.mjs` — `end_date` before `start_date` refused;
  `assertSupportedRule()` rejecting `UNTIL` and `COUNT` and accepting a
  plain weekly rule. **Add a characterisation test recording that
  `expand()` ignores `UNTIL`/`COUNT`**, so the next person finds the trap
  documented rather than discovering it in production.
- `Tests/render-gate.mjs` — `holidays` is already in `VIEWS`; extend the
  stub fixtures to cover the three new tables.
- `Tests/queue.mjs` — the new tables' scoped flush.
- `Tests/a11y.mjs`, `Tests/contrast.mjs` — as above.

Then: imports resolved, named exports confirmed, 51 precache paths all
returning 200, `CACHE_NAME` bumped, write-once files byte-identical
(`router.js`, `routes.js`, `tokens.css`, `rrule.js`).

**Re-run the Phase 4 chores check by hand.** This phase writes a second
event type into `calendar_events` for the first time, which is exactly what
the 21 Aug `listEvents()` fix was for. The chores calendar showing a
work-location shift would mean that fix is incomplete.

---

## Smoke test (replaces the Phase 8 block in `INTEGRATION_CHECKS.md`)

- [ ] Cache Storage shows `home-os-shell-v18` with **51 entries**.
- [ ] Create a holiday spanning two weeks. It reads as a date range in text.
- [ ] **Open Chores. The work-location and holiday entries do NOT appear in
      the chores calendar.** This is the check that matters most — it is the
      first time anything else writes to `calendar_events`.
- [ ] A holiday appears on the calendar at its **start date**, once — not
      repeating forever. If it repeats past the end date, the `UNTIL` trap
      has been walked into.
- [ ] Add checklist and purchase items; tick them; they persist across a
      reload.
- [ ] Offline: tick three checklist items. Each counts immediately, no
      button disables, all sync on reconnect.
- [ ] Delete the holiday. The confirm **names** how many checklist and
      purchase items go with it, and the calendar entry disappears too.
- [ ] A recurring work-location pattern renders across the full 3-month
      window and the preview matched what was saved.
- [ ] Try to save a holiday ending before it starts → refused with a clear
      message, not accepted silently.
- *Ignore:* map or location styling — this is a label, not a mapping
  feature. Also ignore the nav still reading "Holidays" while the page reads
  "Holidays & work"; `routes.js` is write-once.
- *Moved to Phase 7:* the `send_to_shopping` → `shopping_list_items` check.
  See the brief for why it cannot be built yet.

---

## Open question for the architect

**Should a holiday's `calendar_events` row exist at all?**

The argument for: `event_type` includes `'holiday'`, so the schema clearly
intends it, and Phase 9's dashboard will want one place to ask "what is on".

The argument against: `holidays` already has `start_date` and `end_date`,
which is strictly more information than the projection can carry — the
calendar row cannot express the span at all. A projection that loses the
main fact about the thing it projects may be worse than no projection,
because a future reader will trust it.

Decide it deliberately, and if the row stays, make sure every consumer knows
it marks the **start** and is not the range. If the answer is that Phase 9
should read `holidays` directly, say so in the handoff so Phase 9 does not
rediscover this.
