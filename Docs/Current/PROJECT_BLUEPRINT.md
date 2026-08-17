# Home PWA: Project Blueprint
01 Jul 2026 v2

## 1. What this is

See `00_vision.md` and `01_behavioural_principles.md` for the why and the
behaviour rules — this document covers the how: schema, phases, and session
discipline. All three documents together are the single source of truth.
Any new AI session reads all three before doing anything else.

**Tech stack**
- Frontend: Vanilla JS (ES Modules), HTML5, CSS3 — no framework, no bundler
- Backend: Supabase (PostgreSQL, EU region) — **new project, built from
  scratch**, no carryover from the earlier Gemini build
- Architecture: PWA, Service Worker for offline caching, hash-based routing
- Deployment: GitHub Pages

## 2. Security posture (fixed from the earlier build)

This app holds personal health, schedule, and shopping data for a single
user. RLS policies must be scoped to the authenticated user, not open anon
access:

```sql
-- pattern for every table
create policy "owner access only"
on <table>
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Every table gets a `user_id uuid` column referencing `auth.users.id`,
defaulting via a trigger or set explicitly on insert. No table uses
`WITH CHECK true`. This is a deliberate departure from Alongside's
multi-tenant-with-auth pattern — appropriate there, wrong here for a
single-user store of sensitive data behind a client-exposed anon key.

## 3. Session start checklist (run every session, no exceptions)

1. Read `00_vision.md`, `01_behavioural_principles.md`, this blueprint.
2. Read `master_schedule.md` — confirm current active phase and task status.
3. Read `schema.md` — confirm any live code matches it. If mismatched, stop
   and reconcile before writing anything.
4. List every file to be touched this session. No file touched in more than
   one scheduled session per block.
5. Schema first: any new/changed field goes into `schema.md` (and Supabase)
   before any code reads it.
6. Every file produced carries a `DD Mon YYYY vN` header. Reject and fix
   before presenting if missing.
7. At session close: produce `session_handoff.md`, update
   `master_schedule.md`, upload both, remove old versions.

## 4. Schema (Supabase — EU region, fresh project)

*(all tables include `user_id uuid` per the security policy above — omitted
per-row below for brevity)*

### exercises
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| side | text | 'left' \| 'right' \| 'both' \| null |
| target_reps | int | |
| target_sets | int | |
| instructions | text | |
| youtube_search_query | text | search link built at render time, never a stored URL |
| body_region | text | e.g. 'glute', 'hamstring', 'core' |
| source | text | 'physio' \| 'suggested' — physio-sourced = cleared by default |
| clearance_status | text | 'cleared' \| 'pending_confirmation' |

### exercise_logs
| id PK | exercise_id FK | log_date | completed boolean | notes |

### chore_projects
| id PK | title | colour (hex) | sort_order |

### chore_tasks
| id PK | project_id FK | title | details | is_repeatable boolean | recurrence_rule (RRULE text) | status ('pending'|'complete') | completed_at |

### calendar_events
| id PK | event_type ('chore'|'holiday'|'work_location'|'custom') | source_id (nullable FK) | title | start_date | recurrence_rule | location_label |

### weight_logs
| id PK | log_date | weight_kg numeric | target_weight_kg | target_date |

### water_logs
| id PK | log_date | ml_logged int |

### foods
| id PK | name | barcode text (nullable) | calories_per_100g | protein_g | fat_g | carbs_g | source ('manual'|'openfoodfacts') |

### meals
| id PK | name | default_serves int |

### meal_ingredients
| id PK | meal_id FK | food_id FK | quantity_g numeric |

### weekly_meal_plan
| id PK | meal_id FK | day_of_week | slot ('breakfast'|'lunch'|'dinner'|'snack') | serves_override int |

### pantry_stock
| id PK | food_id FK | default_location | shelf_life_days | current_qty |

### shopping_list_items
| id PK | food_id FK | qty_needed | source ('usual'|'meal_plan'|'holiday') | status ('needed'|'have'|'bought') |

### holidays
| id PK | title | start_date | end_date |

### holiday_checklist_items / holiday_purchase_items
| id PK | holiday_id FK | title | status | send_to_shopping boolean |

### user_settings
| id PK | theme | contrast_mode | brightness_pref | weight_unit_display ('stone_lb'|'kg') | notification_prefs jsonb |

## 5. Barcode scanning (Phase 6)

- `BarcodeDetector` browser API where supported (Chrome/Android), falling
  back to `zxing-js` for iOS/Safari.
- Scan → barcode lookup against Open Food Facts API (free, no key) → auto-
  fill a new `foods` row (`source: 'openfoodfacts'`) → manual-edit fallback
  when not found.
- Applies to both pantry stock entry and meal ingredient creation — one
  scan flow, two entry points.

## 6. Notifications & data export

- Notification types (water, chore due, exercise day, shopping list ready)
  are individually toggled in `user_settings.notification_prefs`, all off
  by default, per behavioural principle 8.
- Full JSON export available from settings at any time (principle 9) —
  build this in Phase 2 alongside settings, not deferred to the end.

## 7. Build phases

| Phase | Scope |
|---|---|
| 1 | Supabase project (fresh), all tables, user-scoped RLS, schema.md finalised |
| 2 | Shell + auth + navigation + theming + settings + data export |
| 3 | Exercise cards + logging (physio set cleared by default; additions flagged pending) |
| 4 | Chores: projects, tasks, calendar integration, recurrence (test 3-month forward window), completion stamp |
| 5 | Weight + water tracker, simple graphs, one-tap water logging |
| 6 | Meal planner: foods, meals, macros calc, weekly plan, barcode scanning |
| 7 | Pantry stock + shopping list generation |
| 8 | Holidays + work-location calendar |
| 9 | Dashboard (last — pulls from everything above) |
| 10 | Notifications (opt-in, per-type) |

## 8. Non-goals

See `00_vision.md` "What this is not" — kept here as a pointer so build
sessions don't quietly reintroduce multi-user assumptions, gamification,
or Alongside's coaching voice.
