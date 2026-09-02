# Home-OS: Phase 24 Build Brief — Plan The Week
01 Sep 2026 v1

**No schema change.** This is the phase that changes what the app *is*.

## The problem, stated once

The app is built as a set of correct screens rather than a set of tasks.
Planning a week means: Meals → Meal plan → Shopping → Pantry, knowing which
screen does what and in what order.

Every hop is a place to lose the thread. For the users this product is aimed
at, that is not an inconvenience; it is the failure mode.

Tiimo won its category by making one job effortless. Ours is **"sort out
food for the week"**.

## The flow

One route, `#/plan-week`, reachable from the dashboard as the primary
action. Four steps, one screen at a time, with a visible position
("Step 2 of 4") and free movement backwards.

**1. Who's in.** Which members are around this week, prefilled from the
household. One tap to drop someone who is away. Sets `member_ids` defaults
for everything planned in this run.

**2. Fill the week.** The day-and-slot grid, but with real help:
- **Ready now** recipes from Phase 14 offered first, because cooking what
  you already have is the cheapest good decision available.
- **Repeat last week** copies the previous plan in one tap. Most households
  are repetitive and re-choosing seven dinners from scratch is the thing
  people stop doing in week three.
- Leaving slots empty is fine and is never flagged. An empty Thursday is a
  choice, not a gap.

**3. What you need.** The shortfall, already computed, grouped by aisle.
Anything you know you have gets ticked off here rather than after you get
home. This is also where non-food staples from Phase 25 get offered.

**4. Done.** One screen: what is planned, what to buy, and a link to the
list. Nothing else.

## Rules this flow must obey

**Every step is skippable and the flow is abandonable at any point.**
Whatever you did up to that point is saved. A wizard that loses your work if
you leave is a wizard people learn not to start.

**No progress bar that implies obligation.** "Step 2 of 4" states position.
A bar that fills toward completion is a small guilt machine.

**Never blocks on incompleteness.** You can reach step 4 having planned two
meals. Two is better than none and the app does not get an opinion.

**Resumable.** Leave halfway and the dashboard offers to carry on, the same
way Cook Mode does. Same six-hour rule.

**It is not the only route.** Every screen keeps working exactly as it does
now. This is a path through them, not a replacement.

## Dashboard change

The dashboard becomes task-led rather than a set of tiles: one primary
action ("Plan the week" / "Carry on planning"), then today's summary.

Phase 9 flagged tile clutter. This is the answer to it.

## Tests

Render gate: all four steps, plus the resume state.

Behaviour: abandoning saves what was done; resume within six hours and not
after; "repeat last week" copies entries and member ids but not stale
serves_override; skipping every step is valid and writes nothing.

A11y: position announced on each step; back never disabled except on step 1;
focus moves to the step heading on advance.

## Done when

Someone who has never used the app can sort out a week's food from one
button, and stopping halfway costs them nothing.
