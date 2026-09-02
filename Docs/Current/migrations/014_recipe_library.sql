-- Docs/Current/migrations/014_recipe_library.sql
-- Home-OS schema revision 14 — Phase 16, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- Five columns on meals, so a browsable library of recipes can be filtered
-- and so adding one twice is impossible.
--
-- The library itself is NOT in the database. It ships as static JSON on
-- GitHub Pages: free to serve at any user count, cacheable, works offline,
-- and needs no RLS reasoning. A recipe only becomes rows when you tap add.

alter table meals add column if not exists cuisine text;

-- Free text with a suggested list, deliberately NOT a CHECK. The set of
-- cuisines is open, and a constraint you have to migrate every time you
-- cook something new is a constraint working against you.

alter table meals add column if not exists budget_tier text
  check (budget_tier is null or budget_tier in ('budget', 'everyday', 'special'));

alter table meals add column if not exists default_slot text
  check (default_slot is null or default_slot in ('breakfast', 'lunch', 'dinner', 'snack'));

-- An array, because a dhal is vegetarian AND vegan AND gluten free at once.
alter table meals add column if not exists dietary_tags text[] not null default '{}';

-- The seed slug. This is what stops a recipe being added twice, and what
-- lets a later batch update one you already have without duplicating it.
alter table meals add column if not exists library_ref text;

create index if not exists idx_meals_library_ref on meals (library_ref);
create index if not exists idx_meals_cuisine on meals (cuisine);

comment on column meals.library_ref is
  'Seed slug when this meal came from the shipped recipe library. Null for your own recipes.';
comment on column meals.dietary_tags is
  'What the meal IS (vegetarian, vegan, gluten_free, dairy_free, nut_free). Absence is not a claim that it is not.';
