# Migrations applied to the live database

<!-- Docs/Current/MIGRATIONS_APPLIED.md — 08 Sep 2026 v5 -->

## Why this file exists

Device test, 5 Sep 2026. The Pantry screen failed to load on every visit:

```
42703 — column pantry_stock.reorder_at does not exist
```

Migrations 017 and 018 were written, reviewed, committed — and never run
against the live database. 019 **was** run, so this was not a stalled
sequence that stopped at a point. Two files were skipped, and there was no
place where that fact could be noticed.

The code had been selecting those columns since Phase 25. Postgres rejects
the whole SELECT on the first missing column, so one absent column took out
an entire screen for weeks.

Twelve gates passed the whole time. They check the code against
`schema.md`, and `schema.md` was correct. **Nothing checked `schema.md`
against the database**, and nothing can — the gates have no network and no
credentials, by design.

So the check is this file. A migration that exists in the repo and is not
recorded here fails the platform gate. That does not prove it ran; it
proves somebody looked and said so, which is the most a repo can honestly
assert about a database it cannot see.

## How to use it

1. Run the migration in the Supabase SQL editor. **Confirm the project is
   "Home OS"** — the account has a second, unrelated project.
2. Run its `_VERIFY.sql`. Do not trust "Success. No rows returned": that
   message appears even when everything rolled back on disconnect.
3. Only once verified, add the row below and commit.

Status values are deliberately blunt:

- **applied** — run and verified against the live database.
- **NOT APPLIED** — known to be missing.
- **unverified** — believed run, never confirmed with its VERIFY query.

`unverified` is not a soft pass. It is the state that produced this file.

## Ledger

| Migration | Status | Verified on | Note |
|---|---|---|---|
| 003_shopping_revision | unverified | — | predates this ledger |
| 004_recipe_units | unverified | — | predates this ledger |
| 005_occurrences_and_classification | unverified | — | predates this ledger |
| 006_holiday_todo_items | unverified | — | predates this ledger |
| 007_pantry_use_by | unverified | — | predates this ledger |
| 008_household_foundation | unverified | — | predates this ledger |
| 009_pack_labels | unverified | — | predates this ledger |
| 010_reference_source | unverified | — | predates this ledger |
| 011_meal_steps | unverified | — | predates this ledger |
| 012_ingredient_options | unverified | — | predates this ledger |
| 013_plan_members | unverified | — | predates this ledger |
| 014_recipe_library | unverified | — | predates this ledger |
| 015_density | unverified | — | predates this ledger |
| 016_onboarding | unverified | — | predates this ledger |
| 017_reorder_points | applied | 6 Sep 2026 | was missing; repaired by 023 and confirmed by query |
| 018_pantry_level | applied | 6 Sep 2026 | repaired by 023 and confirmed by query |
| 019_household_invites | applied | 6 Sep 2026 | invites work on device; its `level_set_at` column confirmed present, though 023 would also have added it |
| 020_focus_areas | unverified | — | |
| 021_prices | unverified | — | |
| 022_rotation_mode | unverified | — | |
| 023_repair_pantry_columns | applied | 6 Sep 2026 | run against "Home OS"; VERIFY returned all three columns |
| 024_plan_weeks | applied | 8 Sep 2026 | week_start present and NOT NULL, Monday constraint on, index created; 6 existing meals backfilled to Monday 2026-09-07 |
| 025_recipe_notes | **NOT APPLIED** | — | recipe_library_notes and planning_notes; favourites and notes on library recipes, and free-standing planning notes |

## The honest caveat

Most rows say `unverified`, and that is the true state of knowledge rather
than an oversight. Marking them `applied` because the app mostly works
would be inventing evidence — exactly the assumption that hid this bug.

They will turn into `applied` or `NOT APPLIED` as each one is actually
checked. A screen that works is weak evidence: it only exercises the
columns it happens to select.

## Verified, 8 Sep 2026 — revision 24

```
not null           NO
monday constraint  1
week index         1

week_start   day_number  meals
2026-09-07   1           6
```

Every check queried rather than assumed. Note the shape of the verify that
worked: the Supabase editor shows only the LAST statement's result, so a
file of four separate SELECTs reports three of them invisibly. Rolling them
into one UNION is what actually proved anything.

## Resolved, 6 Sep 2026

023 was run against the "Home OS" project and verified:

```
level_set_at
reorder_at
level
```

Three rows. The pantry query can now succeed. 017 and 018 are marked
applied on the strength of that query rather than on the strength of the
app appearing to work — which is the distinction this whole file exists
to hold on to.
