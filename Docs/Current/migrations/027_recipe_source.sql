-- Docs/Current/migrations/027_recipe_source.sql
-- Home-OS schema revision 27 — 24 Nov 2026 (Phase 33, share a recipe in)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT: the Supabase SQL editor runs each execution in its
-- own transaction.
--
-- Independent of 026: either can be run first.
--
-- ============================================================
-- WHAT AND WHY — one column, one index, nothing renamed or dropped
-- ============================================================
-- meals.source_url: the web page an imported recipe came from. Shown as
-- credit on the recipe ("From BBC Good Food"), and used to stop the same
-- page being imported twice into one household.
--
-- The site's NAME goes in the existing meals.source column (13 Sep 2026,
-- "book and page"), which already means "where this recipe came from".
-- A second name column would be two places for one fact.
--
-- The index is partial: recipes typed in or added from the library have no
-- source_url and are not constrained by it.
--
-- ============================================================
-- SAFE TO RUN AGAINST THE LIVE APP
-- ============================================================
-- Nullable column, so deployed code keeps working unchanged. The app
-- detects the column on save and writes it only once it exists.

alter table meals add column if not exists source_url text;

alter table meals drop constraint if exists meals_source_url_check;
alter table meals
  add constraint meals_source_url_check
  check (source_url is null or (source_url ~* '^https?://' and length(source_url) <= 2000));

create unique index if not exists meals_household_source_url_key
  on meals (household_id, source_url)
  where source_url is not null;
