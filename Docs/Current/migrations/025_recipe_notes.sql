-- Docs/Current/migrations/025_recipe_notes.sql
-- Home-OS schema revision 25 — 08 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING.
-- No outer BEGIN/COMMIT: the Supabase SQL editor runs each execution in its
-- own transaction, an explicit COMMIT does nothing, and everything silently
-- rolls back on disconnect while still reporting "Success. No rows returned".
--
-- ============================================================
-- WHY
-- ============================================================
-- Two things the recipe card and the plan were promised and cannot have:
--
--   1. Favouriting and annotating a LIBRARY recipe. meals.is_favourite
--      exists, but a library recipe is not a meal until you import it — so
--      the only way to mark one was to add it to your meals first, which is
--      choosing a dinner in order to say you like it.
--
--   2. Planning notes. Somewhere to put "Christmas: do the ham the night
--      before" with the recipes attached, months from any week the plan
--      knows about.
--
-- ============================================================
-- TWO TABLES, NOT ONE
-- ============================================================
-- A note on a recipe and a note about a future occasion look similar and
-- behave nothing alike. One is keyed to a slug and is at most one per
-- recipe; the other is free-standing, has a title, and may point at several
-- recipes or none. Forcing them into one table would mean a nullable slug,
-- a nullable title, and a check constraint explaining which combinations
-- are legal — which is three ways of saying they are two tables.

-- ============================================================
-- 1. NOTES AND FAVOURITES ON LIBRARY RECIPES
-- ============================================================
create table if not exists recipe_library_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default my_household_id() references households(id) on delete cascade,

  -- The library's own slug. Deliberately NOT a foreign key: the library is
  -- JSON shipped with the app, not a table. A slug that disappears in a
  -- future library update leaves an orphan note, which is a far smaller
  -- problem than being unable to note a recipe at all.
  recipe_slug text not null,

  is_favourite boolean not null default false,

  -- Nullable. A favourite with no note is the common case, and an empty
  -- string pretending to be "no note" is the kind of thing that later reads
  -- as a note somebody wrote and then deleted.
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per recipe per household. Without this, favouriting twice makes
-- two rows and the second note silently hides the first.
create unique index if not exists recipe_library_notes_unique
  on recipe_library_notes (household_id, recipe_slug);

alter table recipe_library_notes enable row level security;

drop policy if exists "household access only" on recipe_library_notes;
create policy "household access only"
  on recipe_library_notes for all
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

comment on table recipe_library_notes is
  'Favourites and personal notes against library recipes, which are JSON and not rows. One per recipe per household. Added revision 25.';

-- ============================================================
-- 2. PLANNING NOTES
-- ============================================================
create table if not exists planning_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default my_household_id() references households(id) on delete cascade,

  title text not null,
  body text,

  -- Recipes pinned to this note, by library slug or meal id, as text. Same
  -- reasoning as above: the library is not a table, so this cannot be a
  -- foreign key array without excluding exactly the recipes it is for.
  recipe_refs text[] not null default '{}',

  -- Optional. "Christmas" has a date; "ideas for when Sam visits" does not,
  -- and forcing one would turn a scratchpad into a calendar.
  occasion_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_notes_household_idx
  on planning_notes (household_id, occasion_date);

alter table planning_notes enable row level security;

drop policy if exists "household access only" on planning_notes;
create policy "household access only"
  on planning_notes for all
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

comment on table planning_notes is
  'Free-standing notes for future meals and occasions, with recipes optionally attached. Not tied to a week. Added revision 25.';

-- ============================================================
-- WHAT THIS DOES NOT DO
-- ============================================================
-- No cooked-log, so "Regular" recipes still cannot exist. That needs a row
-- every time a meal is actually cooked, which is a behaviour change in Cook
-- Mode rather than a table on its own, and it should be designed with the
-- screen that writes it rather than ahead of it.
