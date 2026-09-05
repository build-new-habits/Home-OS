# Device test run — 5 Sept 2026

<!-- Docs/Current/DEVICE_TEST_2026-09-05.md — 05 Sep 2026 v1 -->

Real Android phone. Live GitHub Pages build `home-os-shell-v85`.

The run began as the scripted functional pass in `DEVICE_TESTING_PROMPT.md`.
After test 1.2 failed it was redirected, at the owner's direction, into a
styling and information-architecture review. Tests 2, 3, 5, 6 and most of 7
were never attempted.

---

## Pass / fail / skipped

| # | Test | Result |
|---|---|---|
| 1.1 | Permission prompt appears at the moment the switch is flipped | Pass |
| 1.2 | Notification delivers on Android | **Fail** — deferred to a dedicated session |
| 1.3–1.6 | Allow, tap-through, deny-and-revert | Skipped — blocked by 1.2 |
| 2.1–2.4 | Rough pantry levels | Skipped |
| 3.1–3.3 | Shopping reminders | Skipped |
| 4.1 | Create a code | Pass |
| 4.2 | Code readable, no 0/O/1/I/L | Pass |
| 4.3–4.5 | Second account joins, shares list, weight stays private | Skipped — needs a second device |
| 5.1–5.5 | Cook Mode | Skipped |
| 6.1–6.3 | Scanning | Skipped |
| 7.1 | Backfill offer appears | Pass — observed, "Fill in 5 foods" |
| 7.2–7.3 | Tap it, tins appear on the list | Skipped |
| 8.1 | Aeroplane mode, offline banner | Pass |
| 8.2 | Log water offline, says saved locally | Pass |
| 8.3 | Back online, syncs | Pass |
| 9.1 | Dark mode, high contrast, compact spacing | **Fail** — no controls found |
| 9.2 | Compact did not shrink text | Skipped — blocked by 9.1 |
| 9.3 | System text at 200%, nothing cut off | Partial pass — nothing clipped, two overflow issues |
| 9.4 | Invite findable without hunting | **Fail** |

---

## Failures — what was seen

**1.2 — Notifications deliver nothing.** Permission granted, switch on, no
notification arrived. Same symptom as the notification bug that shipped
previously. Device-only; no gate can reach it.

**9.1 — "How it looks" renders a heading with nothing under it.** No dark
mode, high contrast or compact spacing control anywhere in Settings.

**9.4 — "Invite someone with their own phone" and "I have a code" are bold
text, not controls.** Visually identical to the "Household name" field label
above them. The real control is a "Create a code" button below the
descriptive paragraph, out of view on first scroll.

**Blank views.** Shopping list blank at 11:07. Chores and Calendar blank at
11:23. All three rendered correctly later in the same session with no
rebuild. Nav bar present, main region empty. Intermittent, not a missing
template.

**Pantry load error.** "Couldn't load your pantry. Check your connection,
then reload this page." on 5G, while other Kitchen screens loaded data in
the same minute.

---

## Findings, by weight

### Information architecture — the main finding

Every screen stacks browse, search, add and admin into one scroll: Pantry,
Meals, Things you buy, Shopping list, Exercises, Weight, Settings.

The owner's framing: a pantry should be *doors* — cupboard, fridge, freezer
— that you open, with adding and stock-checking as their own screens rather
than the tail of the browse screen.

### Cards render pre-expanded

Exercises, Meals, Things you buy, Pantry. Full detail and every action
button on every row at once. Things you buy shows 42 foods, each with four
nutrition rows and two full-width buttons repeating the food's entire name
("Delete müller Strawberry Shortcake x3 Milk Chocolate Digestive x3
deliciously creamy yogurts (6 x 124 g)" is three lines of button).

### The two screens that work

Health hub — three cards, one job each, nothing stacked.
Calendar — clear grid, today marked, counts on days, one instruction line.

These are the target pattern.

### Inconsistencies

- Five button idioms across the app: filled, outlined,
  filled-with-underlined-link ("Plan the week"), bold text, chevron row.
- Three disclosure idioms inside Settings alone.
- Kitchen hub: Shopping list, Weekly plan and Pantry have icons; Meals and
  Things you buy do not.
- Dates render as both "2026-09-01" (Health hub) and "Tue 1 Sept" (Weight),
  two taps apart.

### Colour

Chores project colours are raw saturated primaries — pure yellow, blue,
magenta, green, cyan, red — not from the token palette. Pure yellow on the
off-white background will fail contrast for anyone with low vision.

### Content problems

- **Chores shows no chores.** "2 tasks, 2 still to do" above seven project
  rows and no task visible.
- **Calendar shows nothing for today.** Sat 5 marked TODAY with no count and
  no panel below for the selected day.
- **Dashboard.** "Show me how this works" is the largest, boldest element,
  above the day itself. Chores and Calendar are in the nav but absent from
  the dashboard; Holidays and Settings, neither a today thing, get cards.
- **Empty states missing.** Shopping list with nothing on it gives four
  calls to action and an add form, and never says the list is empty.

### Household invite

Code renders *above* the button that generates it; Cancel also above Create.
No copy or share control on the code. Role defaults to Owner when adding a
household member, in the section that explains this is how children get
added without an account.

### At 200% text

Nothing clipped, layout holds. Two problems: "TODAY" touches both edges of
its Calendar cell; the last Chores row sits under the fixed bottom nav with
no clearance.

### Offline — the best-behaved part of the app

8.1–8.3 all pass. Banner, immediate optimistic count, local-save message,
clean sync on return. Three wording and layout problems:

- "0 ml today, of 2 L. Some of this is saved on this device" — the sync
  sentence is appended even when nothing is queued.
- Sync status runs inline in the big display type, pushing the button down
  the card.
- Exercises and Eating today disappear entirely offline rather than showing
  cached values.

---

## Gate candidates

Failures here that a static gate could have caught:

| Finding | Assertion |
|---|---|
| Blank main region on three views | Every view yields a non-empty main landmark — must fail on slow/empty data, not just the happy path |
| "How it looks" heading with no controls | Every rendered section heading has at least one interactive descendant |
| Bold text acting as an affordance | Text at control weight with no button/link/summary role |
| Chores raw primaries | Every rendered colour resolves to a token |
| Last row under the fixed nav | Last scrollable item does not overlap the fixed nav at a known viewport |

Notifications remain the one thing no gate can reach: `new Notification()`
behaviour on Android is device-only.
