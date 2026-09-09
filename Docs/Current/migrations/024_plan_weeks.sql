-- Docs/Current/migrations/024_plan_weeks.sql
-- Home-OS schema revision 24 — 07 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING.
-- No outer BEGIN/COMMIT: the Supabase SQL editor runs each execution in its
-- own transaction, an explicit COMMIT does nothing, and everything silently
-- rolls back on disconnect while still reporting "Success. No rows returned".
--
-- ============================================================
-- WHY
-- ============================================================
-- weekly_meal_plan is keyed by day_of_week — an enum of mon..sun. The table
-- holds exactly one week and has no idea which one it is.
--
-- That is why the plan hub shipped on 7 Sep with two tiles instead of
-- three. A "next week" tile over this data would show THIS week's meals
-- under next week's heading: a screen that lies, rather than a feature that
-- is missing.
--
-- It also blocks swapping a meal to another day of another week, and
-- sending next week's ingredients to the shopping list.
--
-- ============================================================
-- THE SHAPE, AND WHY NOT A PLAIN DATE
-- ============================================================
-- The obvious move is to replace day_of_week with a date. This does not do
-- that, deliberately.
--
--   * Every query, every group-by, the whole seven-card view and the
--     recurrence code read day_of_week. Replacing it is a rewrite of the
--     plan's entire read path in one commit.
--   * "Tuesday" is genuinely how a person talks about a meal plan. The
--     weekday is not an implementation detail to be normalised away.
--
-- So: ADD week_start, KEEP day_of_week. A row is (week_start, day_of_week).
-- Same day, different week is a different week_start. A swap between days
-- changes day_of_week; a swap between weeks changes week_start. Existing
-- grouping code keeps working unchanged.
--
-- ============================================================
-- THE BACKFILL IS AN ASSUMPTION, AND IT IS THE ONLY ONE AVAILABLE
-- ============================================================
-- Existing rows carry no date of any kind, so there is nothing to derive
-- from. They are assigned to the CURRENT week. That is a guess. It is the
-- only guess that leaves the app showing what it showed yesterday, which is
-- the outcome least likely to surprise anyone.
--
-- If the plan is stale — laid out three weeks ago and never revisited —
-- those meals will land on this week. Nothing is lost; the dates are simply
-- more confident than the data deserves. Rebuilding the week fixes it.
--
-- ============================================================
-- SAFE TO RUN AGAINST THE LIVE APP
-- ============================================================
-- The column arrives with a DEFAULT, so every insert from the currently
-- deployed code — which knows nothing about week_start — keeps working and
-- lands on the current week. The app can be updated afterwards, at leisure,
-- rather than in the same breath as the schema.

-- ---- The column -----------------------------------------------------------
alter table weekly_meal_plan
  add column if not exists week_start date;

-- Monday of the current week, in the database's own reckoning.
-- date_trunc('week', ...) is ISO in Postgres: weeks start on Monday.
alter table weekly_meal_plan
  alter column week_start set default (date_trunc('week', now())::date);

-- ---- Backfill -------------------------------------------------------------
-- Only rows that have nothing. Re-running this changes nothing, which is
-- what makes the file safe to run twice.
update weekly_meal_plan
   set week_start = date_trunc('week', now())::date
 where week_start is null;

alter table weekly_meal_plan
  alter column week_start set not null;

-- ---- A week starts on a Monday -------------------------------------------
-- Without this, "next week" can silently become "eight days from a
-- Wednesday" and two rows that should share a week do not.
alter table weekly_meal_plan
  drop constraint if exists weekly_meal_plan_week_start_monday;
alter table weekly_meal_plan
  add constraint weekly_meal_plan_week_start_monday
  check (extract(isodow from week_start) = 1);

-- ---- Reading one week must stay cheap -------------------------------------
-- Every screen that shows a plan filters on this.
create index if not exists weekly_meal_plan_week_idx
  on weekly_meal_plan (week_start, day_of_week);

comment on column weekly_meal_plan.week_start is
  'Monday of the week this meal belongs to. Added revision 24. With day_of_week it identifies one slot: same weekday, different week is a different week_start. Existing rows were assigned to the week the migration ran, because the old schema recorded no date at all.';

-- ============================================================
-- WHAT THIS DOES NOT DO
-- ============================================================
-- No RLS change: the existing policies key on the household, and a new
-- column inherits them.
--
-- No uniqueness added. Several meals in one slot is a supported case —
-- sea bass for the adults and sausages for the children on the same
-- Tuesday — and revision 8's member_ids exists precisely to record who each
-- one is for. A unique constraint on (week_start, day_of_week, slot) would
-- quietly destroy that.
