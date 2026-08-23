-- Home-OS schema revision 4 — units on recipe ingredients
-- 21 Aug 2026. Matches Docs/Current/schema.md v4 §0.
--
-- Run in the Supabase SQL editor for project vkjwwnjhizrlqcovpdco.
--
-- NO `begin;` / `commit;`. The editor runs each execution in its own
-- transaction; an explicit COMMIT does not take effect and the whole
-- migration is silently rolled back on disconnect while still reporting
-- "Success. No rows returned". Learned the hard way on migration 003.
-- Run the migration, then run the verification as a SEPARATE execution.
--
-- WHY: revision 3 gave the pantry and shopping list units, but recipes were
-- left grams-only. "200 g of milk" is not how anyone cooks, and `item` is
-- just as common: 2 eggs, 1 onion, 3 rashers. Without this, the ingredient
-- form cannot express most real recipes.
--
-- AND ITS CONSEQUENCE: nutrition is stored per 100 GRAMS. The moment an
-- ingredient is measured in ml or items, the macro maths has nothing to
-- work from. So this revision also adds two optional conversion factors to
-- `foods`. Both are nullable, and when one is missing the ingredient is
-- reported as INCOMPLETE — reusing the existing "N of M ingredients have no
-- nutrition data" machinery rather than inventing a second failure mode.
-- Nothing is ever guessed: 1 ml of water is 1 g, oil is about 0.9, and
-- flour is neither.
--
-- SAFE TO RUN: purely additive. Every column has a default or is nullable;
-- nothing is dropped, renamed or narrowed. Existing rows stay valid and
-- every existing ingredient keeps its current meaning as grams.
--
-- DELIBERATELY NOT RENAMING `quantity_g`. The name becomes historical once
-- the column can hold ml — but a rename would break any client still
-- running cached JavaScript from before the deploy, and this app is
-- offline-first with an aggressive precache. Additive-only is the property
-- that has made every migration here safe, and it is worth more than a
-- tidy column name. Recorded as debt in master_schedule.
--
-- IDEMPOTENT: safe to run twice.

-- ---------------------------------------------------------------------
-- 1. meal_ingredients.unit — recipes can express ml and items
--
-- Default 'g' preserves the meaning of every ingredient written before now.
-- ---------------------------------------------------------------------
alter table meal_ingredients
  add column if not exists unit text not null default 'g';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_ingredients_unit_check') then
    alter table meal_ingredients add constraint meal_ingredients_unit_check
      check (unit in ('g', 'ml', 'item'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. foods conversion factors — how to get from ml or items back to grams
--
-- Both NULLABLE and both optional. Filled in once per food, by the user,
-- when they care about macros for that food:
--   grams_per_ml    milk ~1.03, oil ~0.92, water 1.0
--   grams_per_item  1 egg ~60, 1 onion ~150
--
-- When null, that ingredient simply cannot contribute to the totals and is
-- counted as incomplete. That is the honest outcome and it is already how
-- a missing macro behaves.
--
-- These also let the Phase 7 shortfall compare a pantry stocked in ml
-- against a recipe in grams — again, only where the factor is known.
-- ---------------------------------------------------------------------
alter table foods
  add column if not exists grams_per_ml numeric;

alter table foods
  add column if not exists grams_per_item numeric;

-- Guard against nonsense that would silently corrupt every total using it.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'foods_grams_per_ml_positive') then
    alter table foods add constraint foods_grams_per_ml_positive
      check (grams_per_ml is null or grams_per_ml > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'foods_grams_per_item_positive') then
    alter table foods add constraint foods_grams_per_item_positive
      check (grams_per_item is null or grams_per_item > 0);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- VERIFICATION — RUN AS A SEPARATE EXECUTION, NOT WITH THE ABOVE.
-- On mobile the editor shows only the last result set, so run one at a time.
-- ---------------------------------------------------------------------

-- Expect: unit | text | 'g'::text | NO
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'meal_ingredients' and column_name = 'unit';

-- Expect 2 rows, both numeric and nullable.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'foods' and column_name in ('grams_per_ml', 'grams_per_item')
order by column_name;

-- Expect 3 rows, all contype = 'c'.
select conname, contype from pg_constraint
where conname in ('meal_ingredients_unit_check',
                  'foods_grams_per_ml_positive',
                  'foods_grams_per_item_positive');

-- Every existing ingredient should still be grams, and nothing else.
select unit, count(*) from meal_ingredients group by unit order by unit;

-- RLS untouched.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('meal_ingredients', 'foods');

-- Still 17 tables. This revision adds columns, never tables.
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';
