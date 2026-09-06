# One Big Beautiful Build

<!-- Docs/Current/ONE_BIG_BEAUTIFUL_BUILD.md — 06 Sep 2026 v1 -->

The whole thing in one place: how every screen works, what is wired to
what, what the app does on its own, and how all of it is meant to look.

Supersedes `DESIGN_WORKLIST.md`, which stays as the short version.

**The standard is resolution, not decoration.** One idea per screen, one
primary action, no half-finished state, and nothing on screen that
contradicts anything else on screen.

**The method is: commit the law, then build to it.** Every phase below
starts by committing the rule — a token, a component, a gate — so that
what follows cannot drift from it. A rule that lives only in a person's
head gets applied four different ways, which is exactly how this app came
to have five button styles.

---

# PART 1 — THE LAW

## 1.1 Type

One scale. No view invents a size.

```
--text-xs    0.8125rem   meta, chips, timestamps
--text-sm    0.875rem    secondary lines, hints, blurbs
--text-base  1rem        body, list titles, controls
--text-lg    1.125rem    card titles, section headings (h3)
--text-xl    1.375rem    page section headings (h2)
--text-2xl   1.75rem     page title (h1)
```

Display face (serif) for h1 and h2 only. Everything else is the body
face. The serif is the app's voice; used below h2 it becomes decoration.

Line height 1.5 for anything longer than two words. Measure caps at
~60 characters — on a 640px column that happens naturally.

## 1.2 Space

A 4px rhythm, and only these steps:

```
--space-1   4px    inside a chip
--space-2   8px    between a label and its control
--space-3  12px    between rows in a card
--space-4  16px    card padding, gutters
--space-5  24px    between cards
--space-6  32px    between sections
--space-7  48px    above a page's last element
```

Vertical rhythm rule: **the gap between two things says how related they
are.** A title and its subtitle: `space-1`. A card and the next card:
`space-5`. A section and the next section: `space-6`. Where that rule is
broken the screen reads as a list of unrelated fragments, which is what
"cluttered" actually meant on 5 September.

## 1.3 Colour

```
--color-bg              page behind everything
--color-surface         a card
--color-surface-raised  the nav, the action bar, a sheet
--color-text            body
--color-text-muted      secondary; never for anything you must read
--color-accent-strong   links, chevrons, the primary button
--color-focus           focus ring, never used for anything else
--control-border        >= 3:1 against surface (WCAG 1.4.11)
--color-border          decorative edges only
--swatch-1..8           project colours, all >= 3:1, named not hex
```

Four theme combinations exist (light/dusk x normal/high contrast) and the
contrast gate checks every pair in all four. **Colour never carries
meaning alone** — overdue is a word as well as a tint, done is a word as
well as a tick.

## 1.4 Elevation

```
rest      --shadow-sm   + 1px border
hover     --shadow-md
pressed   --shadow-sm   + translateY(1px)
```

Border stays under the shadow always: shadows vanish in high contrast and
in forced-colours mode, and a card that relies on shadow alone stops
looking like a card for the people who most need it to.

Nested cards sit flat. A card inside a card is a box in a box.

## 1.5 Motion

120ms, `cubic-bezier(0.4, 0, 0.2, 1)`. Used for exactly three things:

1. A card pressing down.
2. A disclosure chevron rotating.
3. A row leaving a list when it is done.

(3) is the only one that is not decoration — it is the confirmation that a
tap did something, which is precisely what was missing when ticking a
chore silently wrote to the database and changed nothing.

`prefers-reduced-motion` removes all three. Nothing is only understandable
via motion.

## 1.6 The five components everything is built from

| Component | What it is | Rule |
|---|---|---|
| **Hub tile** `.hub-link` | A door to a page. Title, blurb, live count, chevron. | Count on the front, so you know before you open it. |
| **Card row** `.disclosure-row` | A list item that opens in place. | Name plus ONE line worth reading. |
| **Action bar** `.action-bar` | The one thing this screen is for. | Exactly one per screen. Bottom of the screen. |
| **Empty state** `emptyState()` | Nothing here, and what to do about it. | Says the next action, never just "nothing". |
| **Sheet** `detailSheet()` | Detail without leaving the list. | Returns focus to the row that opened it. |

Anything that does not fit these five is a sixth component and needs
arguing for in the file that adds it.

## 1.7 Six rules that are gated

These are not style preferences. Each has a test that fails the build.

| Rule | Gate |
|---|---|
| One primary action per screen | `render-gate`: one `.action-bar`, one control in it |
| A claimed state is the real state | `render-gate`: `aria-expanded` matches `hidden` |
| Every page is reachable | `a11y`: no route unlinked from a hub or a `navigate()` |
| Every colour is a token | `contrast`: 42 pairs x 4 themes |
| Numbers on a screen agree | `a11y`: the count equals what the list below shows |
| Every migration is accounted for | `platform`: ledger coverage |

---

# PART 2 — HOW IT ALL WIRES TOGETHER

## 2.1 The shape of the app

```
  index.html
      |
   app.js ............ session, shell, offline banner, bottom nav
      |
  router.js .......... hash route -> dynamic import -> render(main)
      |
  routes.js .......... 24 routes, append-only
      |
  js/views/* ......... one file per screen, returns a cleanup fn
      |
  js/components/* .... the five above, plus dialogs
      |
  js/data/* .......... one module per table; every call returns
      |                { ok, data } or { ok:false, error }
      |
  supabaseClient.js .. RLS supplies user_id; never sent by the client
      |
   Supabase (EU) ..... Postgres + auth
```

Offline writes go to an IndexedDB queue and flush on reconnect
(`lib/queue.js`, `data/listSync.js`). Reads fall back to the service
worker cache. **Nothing in the UI layer knows whether it is online** —
that is `lib/net.js`'s job, and views subscribe to it.

## 2.2 The five automations — the actual product

Everything above is plumbing. This is what the app *does for you* while
you are not looking.

### A1 — Plan a week, get a shopping list

```
weekly_meal_plan ──> meal_ingredients ──> pantry_stock
                            │                  │
                            └──── subtract ────┘
                                     │
                                     v
                             shopping_list_items
```

You plan six dinners. The app expands every recipe into ingredients,
scales them by the servings for that night, subtracts what the pantry
already holds, and writes only the difference. "Build from the plan."

*Why you will like it:* the shopping list is the one artefact you
actually carry into a shop, and you never had to write it.

### A2 — Cook something, the pantry goes down

```
Cook Mode ──> mark cooked ──> pantry_stock decremented by what was used
```

*Why:* a stock count that only ever goes up is a stock count you stop
trusting within a fortnight.

### A3 — The pantry watches its own dates

```
last_restocked + shelf_life  ─┐
use_by (if printed)  ─────────┼──> "Worth using up" ──> dashboard card
                              │
reorder_at (opt-in)  ─────────┴──> back onto the shopping list
```

Two different claims, deliberately worded differently: a printed use-by is
stated as a date, an estimate says it is an estimate. An estimate dressed
as a hard date gets trusted at the fridge, and that is how food gets
thrown away that was fine.

### A4 — A repeating chore appears on the calendar for months

```
chore_tasks.recurrence_rule ──> rrule.expand() ──> calendar_events
                                       │
                                       └──> "Due now" ──> dashboard
```

Completions are **per occurrence**, not per task. Ticking this Monday
does not tick every Monday. This is the rule that was broken until 6
September and it is the one most worth protecting.

### A5 — A barcode fills in the blanks

```
scan ──> Open Food Facts ──> pack size, unit name, nutrition
                                     │
                                     └──> only fills EMPTY fields
```

Never overwrites anything you typed. The backfill offer says exactly what
it will change before it changes it.

## 2.3 The offline contract

| | |
|---|---|
| Read | Service worker cache. Screens render from it, silently. |
| Write | Optimistic on screen, queued to IndexedDB, flushed on reconnect. |
| Conflict | Last write wins. Single household, so this is honest rather than lazy. |
| Failure | The UI rolls back and says so. It never leaves a tick that did not save. |

---

# PART 3 — THE SCREENS

Each: what it looks like, what it is wired to, what it does on its own,
and why it is like that.

## 3.1 Dashboard — "Today"

```
┌──────────────────────────────┐
│ Today                        │  h1, serif
│ Sun 6 Sept                   │  muted
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ Water                    │ │  card
│ │ 250 ml of 2 L            │ │  the number, big
│ │ [ Add a glass (250 ml) ] │ │  primary, full width
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Exercises   0 of 3       │ │
│ │ [ Open exercises ▸ ]     │ │
│ ├──────────────────────────┤ │
│ │ Chores      2 due        │ │  NEW — it is in the nav,
│ │ [ Open chores ▸ ]        │ │  it belongs here
│ ├──────────────────────────┤ │
│ │ Eating today             │ │
│ │ Veg Lasagna · serves 4   │ │
│ ├──────────────────────────┤ │
│ │ Worth using up      1    │ │
│ ├──────────────────────────┤ │
│ │ Shopping     15 to get   │ │
│ └──────────────────────────┘ │
│ Holidays ▸    Settings ▸     │  quiet, one line each
└──────────────────────────────┘
```

**Wired to:** `water`, `exercises` + `completions`, `chores` +
`rrule`, `mealPlan`, `pantry` (use-soon), `shopping`.

**Automation:** every card is a live count computed at render, not a
stored counter. Nothing to go stale.

**Changes from today:** "Show me how this works" stops being the largest
element on the screen and moves to Settings, where a tour belongs after
the first week. Chores and Calendar earn cards. Holidays and Settings
lose theirs and become one quiet line each.

**Why you will like it:** the vision says the dashboard tells you what is
true today without going to look for it. Six live counts, one tap each,
nothing you have to interpret.

## 3.2 Health hub, Kitchen hub, Pantry hub

All three are the same object: a page of doors with counts on the front.

```
┌──────────────────────────────┐
│ Kitchen                      │
│ Plan a week, check the       │
│ cupboards, buy the difference│
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 🧺 Shopping list       ▸ │ │  card, elevated
│ │    15 still to get       │ │  live count
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 📅 Weekly plan         ▸ │ │
│ │    6 of 7 days planned   │ │
│ └──────────────────────────┘ │
│  ... Meals, Library, Pantry, │
│      Things you buy          │
└──────────────────────────────┘
```

**Fix outstanding:** two of the six Kitchen tiles have no icon. Every
tile gets one or none of them do.

**Why:** you can see the state of the whole kitchen without opening
anything. That is the difference between a menu and a dashboard.

## 3.3 Meals — TO BE SPLIT

Today it is one scroll: filter, ingredient search, three collapsible
result groups, six recipe rows, a library section, and a full add form.
Six jobs on one page.

```
BECOMES

  meals            Your recipes. A list. One action: Add a meal.
  meals-match      "What could I make?" — the pantry-matching screen
  meals-add        The add form, its own page
  library          (already done)
```

```
┌──────────────────────────────┐
│ 🍽 Meals                      │
│ 6 recipes                    │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ Tandoori Salmon        ☆ │ │
│ │ Dinner · 3 of 4 in       │ │
│ └──────────────────────────┘ │
│ ... five more                │
├──────────────────────────────┤
│ What could I make?         ▸ │  door to meals-match
│ Recipe library             ▸ │  door to library
├──────────────────────────────┤
│ [    Add a meal            ] │  action bar
└──────────────────────────────┘
```

**Wired to:** `meals`, `pantryMatch` (the "x of y in the pantry" count),
`mealPlan` (tonight), `recipeLibrary`.

**Automation:** the pantry count on each row is live. "Ready now" and
"Nearly there" on the match screen are computed by subtracting the pantry
from the recipe, the same maths as the shopping list, so the two can
never disagree.

**Why:** "what could I make" is a completely different question from
"manage my recipes", and answering both on one screen means answering
neither well.

## 3.4 Weekly plan — THE HARDEST SCREEN

Today: a table wider than the phone. The day column scrolls away, so you
lose which row you are in.

**Proposal: one card per day, no sideways scrolling at all.**

```
┌──────────────────────────────┐
│ 📅 Weekly plan                │
│ 6 meals across 6 days        │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ Monday                   │ │
│ │ Breakfast   — nothing  + │ │
│ │ Lunch       — nothing  + │ │
│ │ Dinner    Fish and chips │ │
│ │           serves 4    ⋯  │ │
│ │ Snack       — nothing  + │ │
│ └──────────────────────────┘ │
│ ┌── Tuesday ───────────────┐ │
│ ...                          │
├──────────────────────────────┤
│ [    Plan a meal           ] │
└──────────────────────────────┘
```

**Wired to:** `weekly_meal_plan`, `meals`, `plan_members` (portion
scaling), `planDraft` (the handoff to Choose a meal).

**Automation:** servings default from the recipe, then from who is home
that day. "Build from the plan" turns the whole week into a shopping list
in one press.

**Why:** a table is for comparing columns. You never compare Tuesday
breakfast with Thursday dinner — you look at one day. The card is the
shape of the question.

*This is the biggest single change on the list and it needs your yes.*

## 3.5 Shopping list — ROWS TO REBUILD

Today each row prints the quantity twice and carries two full-width
buttons.

```
BECOMES

┌──────────────────────────────┐
│ ☐ Plant Chef Firm Tofu       │
│   99 g · Fresh food       ⋯  │
└──────────────────────────────┘
```

Tap the row to tick it off. Everything else behind the ⋯. A shopping list
is used one-handed, in a shop, with a trolley in the other hand: the
whole row is the target.

**Automation:** built from the plan minus the pantry (A1). Staples are
never touched by a rebuild.

## 3.6 Pantry — DONE, holds as the pattern

Hub of five doors plus two actions. Cupboards inside "What's in", one
open at a time. This is the model the rest of the app is being brought to.

## 3.7 Chores — nearly done

Due now, then projects as cards, one action bar. Remaining: project
colours are chosen from the palette but the existing ones need changing
by hand, and the Filter control belongs in the same place on every screen
that has one.

## 3.8 Calendar

```
┌──────────────────────────────┐
│ Calendar                     │
│ September 2026        ‹    › │  month nav moves DOWN
├──────────────────────────────┤
│  M  T  W  T  F  S  S         │
│  ...  [6 TODAY] ...          │
├──────────────────────────────┤
│ Sunday 6 September           │  NEW — selected day panel,
│ Nothing on today.            │  defaults to today
└──────────────────────────────┘
```

**Why:** today is the day you care about and it currently shows nothing
at all until you tap it.

## 3.9 Settings — section doors

Seven sections in one scroll becomes seven doors: Household, What you use
it for, Notifications, How it looks, Your data, Account, About this
device.

---

# PART 4 — THE PLAN

Each phase: **commit the law first, then build to it.** The law is a
token, a component or a gate — something that makes the next screen
impossible to get wrong.

| Phase | Commit first (the law) | Then build |
|---|---|---|
| **P1** Type & space | The scale in `tokens.css`; a gate failing any hard-coded px or rem in `components.css` | Sweep every view onto the scale |
| **P2** Buttons | `.btn-primary/-secondary/-quiet/-destructive`; gate: one primary per screen | Replace all five idioms |
| **P3** Empty states | `emptyState()` mandatory; gate: a list rendering zero rows renders one | Shopping, meals, chores, pantry pages, calendar |
| **P4** Action bars | (done — component + gate) | Roll across Kitchen, Pantry pages, Meals, Calendar, Choose a meal |
| **P5** Meals split | Route conventions doc: hub + list + add + task pages | `meals`, `meals-match`, `meals-add` |
| **P6** Shopping rows | Row spec: whole row is the target, detail behind ⋯ | Rebuild the list |
| **P7** Weekly plan | Day-card spec | Replace the table *(needs your yes)* |
| **P8** Calendar & Settings | — | Day panel; section doors |
| **P9** Dashboard | — | Reorder, demote the tour, add Chores |
| **P10** Motion | The three permitted uses, gated on reduced-motion | Row-leaves-list on tick |

Notifications (D3) sit outside this and wait for a laptop.

---

# WHAT IS DELIBERATELY NOT HERE

No streaks. No badges. No congratulation. No "you missed a day".

This app is used by someone managing rehab, a weight goal and a household
on days when all three are tiring. A missed water log is a fact, not a
failure. The no-shame framing in `01_behavioural_principles.md` is the
best thing in this codebase and nothing arriving under the heading of
"polish" gets to erode it.
