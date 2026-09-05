# Fix backlog — from the 5 Sept 2026 device test

<!-- Docs/Current/FIX_BACKLOG.md — 05 Sep 2026 v1 -->

Source: `Docs/Current/DEVICE_TEST_2026-09-05.md`.

Ordered so that the shared components land before the screens that use
them. Do not start B before A is committed and green.

---

## A — Design system foundation

Nothing in B or C should introduce a new button, card or empty state. These
land first, in `css/components.css` (delivered whole, never appended) and
`js/components/`.

| Job | What | Kills |
|---|---|---|
| **A1** | One button scale: `.btn-primary`, `.btn-secondary`, `.btn-quiet`, `.btn-destructive`. Delete the filled-with-underlined-link hybrid ("Plan the week"). Anything that navigates is a link styled as a button, not a button containing a link. | Five idioms → four roles |
| **A2** | `disclosureRow.js` — collapsed list row: name, one summary line, chevron. Expands in place. `<button aria-expanded>` + region, not `<details>` (needs consistent styling and keyboard behaviour under the a11y gate). | Pre-expanded cards everywhere |
| **A3** | `iconButton.js` — icon plus visually-hidden accessible name. Accessible name still carries the item ("Delete <food name>"); the visible glyph does not. 44×44 minimum target. | Three-line Delete buttons |
| **A4** | `emptyState.js` — heading, one plain line, at most one primary action. | Screens that never say they are empty |
| **A5** | Swatch token set `--swatch-1…8` in `tokens.css`, all ≥3:1 against `--color-surface` and paired with a text label. Chores stops using raw CSS colour names. | Pure yellow on off-white |
| **A6** | Global scroll padding below the fixed bottom nav, in `base.css`, so the last row of any list clears it at rest. | Last Chores row under the nav |
| **A7** | `js/lib/formatDate.js` — one function, one house format ("Tue 1 Sept"). Every view uses it. | `2026-09-01` next to `Tue 1 Sept` |
| **A8** | Cell content at 200% text: Calendar "TODAY" needs padding or a shorter marker. | Text touching cell borders |

---

## B — Information architecture: doors, not scrolls

The principle from the device test: **a screen does one job.** Browse is one
screen. Adding is another. Admin is a third. A hub lists doors.

Target pattern already in the app: the **Health hub** and the **Calendar**.

| Job | What |
|---|---|
| **B1** | Pantry becomes a hub of *locations* — Cupboard, Fridge, Freezer, Elsewhere — each with a count. Tapping one opens that location's contents and nothing else. |
| **B2** | "Add to the pantry" moves off the browse screen to its own route. |
| **B3** | "Quick stock check" gets its own route, reachable from the Pantry hub. Needed for things eaten loose (an apple) rather than cooked from a recipe. |
| **B4** | Things you buy: rows collapse to name + category (A2). Nutrition and the Edit/Delete pair live inside the expanded row (A3). Category doors, same shape as B1. |
| **B5** | Meals: "Add a meal" to its own route. Make the Filter button actually filter — it currently reads as inert. |
| **B6** | Shopping list: "Add a staple" to its own route. Browse screen shows the list and the two things you do to it. |
| **B7** | Exercises: "Add an exercise" and "Pending confirmation" to their own routes. Daily list stands alone. |
| **B8** | Weight: Target moves off the daily-logging screen. Log and trend stay. |
| **B9** | Settings becomes a list of section doors: Household, What you use it for, Notifications, How it looks, Your data, Account, About this device. |
| **B10** | Chores: the screen called Chores shows chores. Projects become a filter, not the content. |

---

## C — Content and correctness

| Job | What |
|---|---|
| **C1** | "How it looks" renders a heading and no controls. Find out whether the section failed to render or was never built, then ship dark mode, high contrast and compact spacing. Blocks tests 9.1 and 9.2. |
| **C2** | Household invite: "Invite someone with their own phone" and "I have a code" become real controls. Generated code renders *below* the button that made it. Add a copy control. |
| **C3** | "Add someone" Role must not default to Owner. |
| **C4** | Empty states via A4: shopping list, pantry locations, chores, meals. |
| **C5** | Calendar: a panel below the grid for the selected day, defaulting to today. Today currently shows nothing at all. |
| **C6** | Dashboard: demote "Show me how this works" (it is the largest element on the screen, above the day). Chores and Calendar earn cards; Holidays and Settings do not need dashboard real estate. |
| **C7** | Offline copy: the sync sentence appends even at 0 ml with nothing queued. Make it conditional, and lift it out of the display-size number into its own line. |
| **C8** | Offline dashboard drops Exercises and Eating today entirely. Show cached values with a staleness note instead of vanishing. |
| **C9** | Kitchen hub: Meals and Things you buy have no icon; the other three do. |

---

## D — Reliability

| Job | What |
|---|---|
| **D1** | Intermittent blank main region — Shopping list, Chores, Calendar, all recovered later in the same session. Suspect the data-arrival path, not the templates. Highest-value bug in the list: it makes the app look broken at random. |
| **D2** | Pantry "Couldn't load your pantry" on a good 5G connection while sibling screens loaded fine. May share a root cause with D1. |
| **D3** | **Notifications deliver nothing on Android.** Deferred to a dedicated session with a laptop attached; needs remote debugging, not screenshots. |

---

## E — Gates

Each of these should land *with* the fix it would have caught, per the
build rules.

| Job | Assertion | Catches |
|---|---|---|
| **E1** | Every view yields a non-empty main landmark, including under a slow or empty data response — not just the happy path | D1 |
| **E2** | Every rendered section heading has at least one interactive descendant | C1 |
| **E3** | No text styled at control weight without a button, link or summary role | C2 |
| **E4** | Every rendered colour resolves to a token | A5 |
| **E5** | Last scrollable item does not overlap the fixed nav at a known viewport | A6 |

---

## Order of work

1. **A** — foundation. Nothing visible changes much; everything after gets cheaper.
2. **D1 / D2** — the app looking broken at random outranks it looking untidy.
3. **B** — the doors. Biggest visible change.
4. **C** — content and correctness, folded into each B screen as it is rebuilt.
5. **D3** — notifications, dedicated session.

E jobs ship with their partner fix, never separately.
