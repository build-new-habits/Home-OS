# Parked areas

3 Oct 2026. Home-OS is now a kitchen app: Today, Plan, Recipes, Shop. Everything below is **parked, not deleted**. No file, route, table, row or policy was removed.

## How parking works

- One switch: `KITCHEN_ONLY` in `js/navConfig.js`.
- While it is on:
  - the bottom bar is `KITCHEN_NAV_ITEMS`;
  - Today hides water, chores and exercises;
  - "Everything else" lists Pantry and your meals, and Settings;
  - Settings does not offer the focus-area choice;
  - first run skips its focus step.
- Every parked route is still registered and opens if its address is typed, for example `#/chores`.
- **To bring everything back:** set `KITCHEN_ONLY` to false. The old bar, focus areas and dashboard return as they were.
- The full app as it stood before the change is saved on the branch `archive/pre-kitchen-2026-10`.
- The accessibility gate runs with `__HOME_OS_FULL_APP__`, so the parked screens stay tested while parked.

## What each area did

| Area | Routes | Views | Data modules | Tables |
| --- | --- | --- | --- | --- |
| Health hub | `health` | `views/health.js` | none of its own | none |
| Rehab exercises | `exercises` | `views/exercises.js` | `data/exercises.js` | `exercises`, `exercise_logs` |
| Weight | `weight` | `views/weight.js` | `data/weight.js` | `weight_logs` |
| Water | `water`, plus a one-tap card on Today | `views/water.js` | `data/water.js` | `water_logs` |
| Chores | `chores` | `views/chores.js` | `data/chores.js`, `data/completions.js` | `chore_projects`, `chore_tasks`, chore completions |
| Calendar | `calendar` | `views/calendar.js` | `data/calendar.js`, `lib/rrule.js` | `calendar_events` |
| Holidays | `holidays` | `views/holidays.js` | `data/holidays.js` | `holidays`, `holiday_checklist_items` |
| Notifications | none (settings and `lib/notify.js`) | settings section | `lib/notify.js` | `user_settings.notification_prefs` |

### What each one was for

- **Exercises:** a physio set with clearance to do them, logged per day. Today showed what was left.
- **Weight:** weigh-ins, a target and a trend.
- **Water:** a glass at a time against a daily target. The most frequent action in the full app, which is why it lived on Today.
- **Chores:** recurring tasks grouped into projects, due dates from the calendar's recurrence rules, ticked from Today.
- **Calendar:** a month grid of events, including chore recurrences and work locations.
- **Holidays:** trips with dated checklists. The holiday shopping source on `shopping_list_items.source` still exists.
- **Notifications:** reminders for water and exercises. Investigation was deferred to a laptop session and is still open.

## Open issues carried with them

- **Chores count mismatch.** The Chores tab showed project rows but no tasks, and its count disagreed with Due Now. Not resolved.
- **FIX_BACKLOG A5, A6, B10, C6 and D1** mention Chores or Calendar. D1 (intermittent blank screen) also affected Shopping, so it is still live for the kitchen.
- **Notifications** were never fully investigated on a device.
- **Holiday checklist and dashboard integration** were listed as ongoing concerns.

## Bringing one area back on its own

The old focus-area filter (`FOCUS_AREAS`, `visibleNav`) is still in `navConfig.js`. To return one area rather than all of them, add its item to `KITCHEN_NAV_ITEMS`, or replace `KITCHEN_ONLY` with a per-area setting.
