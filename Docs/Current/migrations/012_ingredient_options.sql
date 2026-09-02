-- Docs/Current/migrations/012_ingredient_options.sql
-- Home-OS schema revision 12 — Phase 19, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- "Build your own lunch" and "swap the tuna for hummus" are the same
-- feature. A build-your-own is a swap where the alternatives were written
-- down in advance; a swap is a build-your-own you added a second option to.
-- So: one mechanism, three columns.
--
-- Every existing row gets option_group = null and is_selected = true, which
-- is exactly how they behave today. No behaviour change until a group is
-- created.

alter table meal_ingredients add column if not exists option_group text
  check (option_group is null or length(trim(option_group)) between 1 and 40);

alter table meal_ingredients add column if not exists is_selected boolean
  not null default true;

-- Overrides the food name for display where the food name is too literal:
-- 'Cottage cheese, plain' shows as 'Cottage cheese'.
alter table meal_ingredients add column if not exists option_label text
  check (option_label is null or length(trim(option_label)) between 1 and 60);

create index if not exists idx_meal_ingredients_group
  on meal_ingredients (meal_id, option_group);

-- NO partial unique index enforcing one selection per group.
--
-- It is tempting and it is wrong. Swapping would become two statements —
-- deselect the old, select the new — with a window in between where the
-- recipe has NO base at all. Under a constraint that window is a failed
-- write; without one it is a moment nobody sees. The app enforces exactly
-- one selection per group in code, and a repair query fixes any drift.

comment on column meal_ingredients.option_group is
  'Null = an ordinary required ingredient. Set = one alternative within a named slot. Exactly one row per group has is_selected, enforced in application code.';
