-- Docs/Current/migrations/023_repair_pantry_columns.sql
-- Home-OS schema revision 23 — repair, 05 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING.
-- No outer BEGIN/COMMIT: the Supabase SQL editor runs each execution in its
-- own transaction, an explicit COMMIT does nothing, and everything silently
-- rolls back on disconnect while still reporting "Success. No rows returned".
--
-- ============================================================
-- WHY THIS EXISTS
-- ============================================================
-- Device test, 5 Sep 2026. The Pantry screen failed to load, every time,
-- while every sibling screen loaded fine in the same minute:
--
--   42703 — column pantry_stock.reorder_at does not exist
--
-- Migrations 017 and 018 were written, reviewed, committed, and never run
-- against the live database. 019 WAS run — household invites work — so the
-- gap is not a stalled sequence. Two files were simply skipped, and nothing
-- anywhere could tell.
--
-- The code has been selecting those columns ever since. Postgres rejects
-- the whole SELECT on the first missing one, so a single absent column took
-- out the entire screen. Twelve gates passed throughout: they check code
-- against schema.md, and schema.md was right. Nothing checks schema.md
-- against the database.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- Re-applies every pantry_stock column added by 017, 018 and 019. All three
-- are already idempotent, so running this where they DID land changes
-- nothing. That is the point: it is safe to run without first working out
-- which ones are missing.
--
-- This adds no new design. See the original files for the reasoning:
--   017_reorder_points.sql  — reorder_at,   NULL = never remind
--   018_pantry_level.sql    — level,        NULL = nothing said, not 'none'
--   019_household_invites.sql — level_set_at, when the level was set

-- ---- 017: reorder point --------------------------------------------------
alter table pantry_stock add column if not exists reorder_at numeric;

alter table pantry_stock drop constraint if exists pantry_stock_reorder_at_check;
alter table pantry_stock add constraint pantry_stock_reorder_at_check
  check (reorder_at is null or reorder_at >= 0);

comment on column pantry_stock.reorder_at is
  'Put this back on the shopping list when current_qty drops to or below this. NULL = never remind. Opt-in only.';

-- ---- 018: rough level ----------------------------------------------------
alter table pantry_stock add column if not exists level text;

alter table pantry_stock drop constraint if exists pantry_stock_level_check;
alter table pantry_stock add constraint pantry_stock_level_check
  check (level is null or level in ('plenty', 'low', 'none'));

comment on column pantry_stock.level is
  'Rough amount when no number is recorded: plenty / low / none. NULL = nothing said, which is not the same as none. current_qty wins when both are set.';

-- ---- 019: when the level was set ----------------------------------------
alter table pantry_stock add column if not exists level_set_at timestamptz;

comment on column pantry_stock.level_set_at is
  'When level was last set. Deliberately not updated_at, which moves on any edit.';
