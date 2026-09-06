# Design work list — towards something worth handing over

<!-- Docs/Current/DESIGN_WORKLIST.md — 06 Sep 2026 v1 -->

Written after the 5–6 September device tests, when the vision's "no
marketing polish" line was struck. See `00_vision.md`.

The standard is **resolution**, not decoration: one idea per screen, one
primary action, no half-finished state, and nothing on screen that
contradicts anything else on screen.

Ordered by how much each one is costing the person using the app today.

---

## D1 — Primary actions into the thumb zone

**Why this is first.** The app is used by somebody managing a right-side
injury from wrist to collarbone. Almost every primary control currently
sits at the TOP of the screen — "Back to the plan", "Filter",
"Previous/Next" on the calendar, "Scan a barcode" — which is the hardest
place on a phone to reach and the worst place to ask a sore shoulder to go.

Read at the top, press at the bottom. Nobody would call this styling and
it is the largest single improvement available.

| | |
|---|---|
| D1.1 | An `actionBar` component: fixed above the bottom nav, holds one primary action, gets out of the way when there isn't one. |
| D1.2 | Chores, Pantry pages, Kitchen pages, Choose a meal — primary action moves into it. |
| D1.3 | Calendar month navigation moves off the top edge. |
| D1.4 | Gate: no view puts its only primary action in the top third. |

## D2 — One button vocabulary

Four or five idioms are in use: filled, outlined, text-link, chevron row,
and a filled-button-containing-an-underlined-link. Nothing tells you which
are equal in weight.

| | |
|---|---|
| D2.1 | `.btn-primary` / `.btn-secondary` / `.btn-quiet` / `.btn-destructive`, defined once. |
| D2.2 | One primary per screen, enforced by gate. |
| D2.3 | Anything that navigates is a link styled as a button, never a button wrapping a link. |

## D3 — Every empty state says what to do next

"Nothing due" is right. "Nothing on the list" above four competing buttons
is not. `emptyState.js` exists and is barely used.

| | |
|---|---|
| D3.1 | Shopping list, Meals, each pantry page, each Chores project, Calendar day. |
| D3.2 | Gate: a list that renders zero rows must render an empty state. |

## D4 — Motion only where it explains a change

One place earns it: a row leaving Due now when ticked, so the tap has a
visible consequence. Until 6 Sep that tick silently did nothing, which is
exactly the case where a person needs to SEE the result.

Respects `prefers-reduced-motion` everywhere, no exceptions.

## D5 — Consistency sweep

| | |
|---|---|
| D5.1 | Dates: one house format via one helper. `2026-09-01` and `Tue 1 Sept` still appear two taps apart. |
| D5.2 | Kitchen hub: Meals and Things you buy have no icon; the rest do. |
| D5.3 | Dashboard: demote the tour, give Chores and Calendar cards, move Holidays and Settings out of prime position. |
| D5.4 | Calendar: a panel for the selected day, defaulting to today. Today currently shows nothing. |

## D6 — Splitting the remaining stacked screens

Pantry is done. Same treatment, same reasoning:

| | |
|---|---|
| D6.1 | Meals — "Add a meal" to its own route. |
| D6.2 | Exercises — "Add an exercise" and "Pending confirmation" off the daily list. |
| D6.3 | Weight — Target off the logging screen. |
| D6.4 | Shopping list — "Add a staple" to its own route. |
| D6.5 | Settings — section doors rather than one scroll of seven. |

## D7 — Still open, unchanged

- **Notifications deliver nothing on Android.** Needs a laptop session.
- Offline dashboard drops Exercises and Eating today rather than showing
  cached values.
- "TODAY" touches both edges of its calendar cell at 200% text.

---

## What is deliberately NOT on this list

**Delight for its own sake.** This app is used by someone in pain,
managing rehab and a weight goal, on days when both are tiring. The
no-shame framing in `01_behavioural_principles.md` is the most
award-worthy thing in the codebase. Nothing here should get cute, and no
streaks, badges or congratulation are to be added under the heading of
"polish".
