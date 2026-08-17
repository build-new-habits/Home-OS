# Home PWA: Behavioural Principles
01 Jul 2026 v1

This document defines how the system should behave — not what tables it
has, but what it does and doesn't do in response to you. Any AI session
building a feature should check new behaviour against this before writing
code.

## 1. No shame architecture

- No streaks, no "you broke your streak" messaging, no red/warning colours
  for missed logs.
- A missed water target, an unmarked chore, or a skipped exercise day is
  displayed neutrally — as a fact ("2 of 6 logged today"), never as a
  failure state.
- Nothing compares today to a "best" day or to any external benchmark.

## 2. Friction budget

- Any action you'll do daily (water log, exercise complete, chore tick)
  must be reachable in one tap from the dashboard or a persistent bottom
  element — not through a menu.
- Anything done weekly or less (meal planning, shopping list generation,
  holiday setup) can live behind a normal navigation tap — friction budget
  is spent on daily actions, not occasional ones.
- Forms default to the fewest required fields possible; optional detail
  (notes, macros overrides) is expandable, not front-loaded.

## 3. Completion is a physical event

- Completed chore tasks get a visible "Complete" stamp treatment — this
  was explicitly requested and matters: completion should feel like a real
  mark on a real card, not a quiet checkbox tick.
- Completed exercise cards for the day show a clear done state but remain
  visible (not removed from view) so the day's full picture is still
  readable at a glance.

## 4. Recurrence must be trustworthy

- Any task marked repeatable is verified against the calendar for at least
  a 3-month forward window at creation time, not just "next occurrence."
  Recurrence bugs erode trust in the whole system fast — this gets tested
  explicitly, not assumed to work because the RRULE looks right.

## 5. Adaptive by context, not by prompt

- Meal serving sizes adjust from a per-meal default, overridable per
  planned instance, without you having to re-enter ingredient quantities
  each time.
- Shopping list generation diffs meal-plan needs against pantry stock
  automatically — it doesn't ask you to manually check what's already
  in the cupboard.
- Perishables flagged by shelf-life proximity surface in both the shopping
  list (don't rebuy) and meal planner (use this up) — one underlying signal,
  two surfaces.

## 6. Health data is handled carefully, not casually

- Rehab exercises sourced from your physio are treated as cleared for use.
  Any exercise added by an AI session that wasn't physio-sourced is flagged
  pending confirmation and excluded from the "cleared" set until you say
  otherwise.
- The app tracks pain/function trend data if you choose to log it, but
  never generates advice framed as clinical guidance — it reflects what
  you and your physio have already decided.

## 7. Personalisation is structural

- Theme, contrast, and brightness settings apply via CSS custom properties
  set at the root — every view inherits them automatically. No view should
  need its own theme-handling logic.
- Settings changes apply immediately, no save/reload step.

## 8. Notifications are opt-in and specific

- No notification is on by default. Each notification type (water
  reminder, chore due, exercise day, shopping list ready) is toggled
  individually in settings.
- Notification copy follows the no-shame rule above — reminders, not
  nags ("Water check-in" not "You haven't logged water yet").

## 9. Data belongs to you

- Full data export (JSON, human-readable) available from settings at any
  time — no reason to ever feel locked in.
- Nothing is deleted silently. Deletions (a project, a meal, a holiday)
  require a confirm step and, where practical, a short undo window.

## 10. Offline is the default assumption

- Every daily-use screen (dashboard, water log, exercise log, chore tick)
  must function fully offline and sync when back online. Meal planning and
  shopping list generation may reasonably require connectivity, but the
  app should say so clearly rather than fail silently.
