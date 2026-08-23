-- Home-OS schema revision 3 — the shopping revision
-- 21 Aug 2026. Matches Docs/Current/schema.md v3 §0.
--
-- Run this in the Supabase SQL editor for project vkjwwnjhizrlqcovpdco.
-- Paste the whole thing and run once.
--
-- WHY: `foods` was treated as what a supermarket shop is made of. It is not
-- — a real shop is shampoo, toilet roll, light bulbs, guinea pig bedding,
-- birthday cards, razors and batteries. shopping_list_items.food_id is
-- `not null references foods(id)`, so none of those could be listed at all.
-- And "all quantities are grams" cannot survive contact with light bulbs.
--
-- SAFE TO RUN: every column is added WITH A DEFAULT and nothing is dropped,
-- renamed or narrowed. Existing rows stay valid; existing foods become
-- 'food_ambient'. There is no data loss path in this script.
--
-- IDEMPOTENT: safe to run twice. Column adds use IF NOT EXISTS; constraint
-- adds are guarded, because ALTER TABLE ... ADD CONSTRAINT has no
-- IF NOT EXISTS in PostgreSQL and would error on a second run.
--
-- ---------------------------------------------------------------------
-- NO `begin;` / `commit;` HERE, AND THIS MATTERS.
--
-- The first version of this file wrapped everything in an explicit
-- transaction. In the Supabase SQL editor that FAILS SILENTLY: the editor
-- runs each execution inside its own transaction, the explicit COMMIT does
-- not take effect, and the whole migration is rolled back on disconnect --
-- while the editor still reports "Success. No rows returned".
--
-- Applied 21 Aug 2026. It was caught only because the verification block
-- was run separately and errored with `column "category" does not exist`.
-- Had the verification been pasted into the same execution, it would have
-- run inside the doomed transaction, passed, and reported a migration that
-- was about to vanish.
--
-- SO: run the migration, then run the verification as a SEPARATE execution.
-- Never trust "Success" from the editor for DDL. Verify in a new run.
-- ---------------------------------------------------------------------
--
-- RLS is untouched. No policy is added, altered or dropped: these are new
-- columns on tables whose existing `auth.uid() = user_id` policies already
-- cover every row.

-- ---------------------------------------------------------------------
-- 1. foods.category — `foods` is now "things you buy"
--
-- Food is split by STORAGE STATE (fresh / frozen / ambient) because that is
-- what determines shelf life. A single 'food' value would lump fresh salmon
-- with tinned beans and make near-expiry meaningless.
--
-- household vs home is CONSUMABLE vs DURABLE: cleaning products and toilet
-- roll are restocked (household); cleaning equipment, bulbs and stationery
-- are replaced when they die (home). That is the test for anything new.
-- ---------------------------------------------------------------------
alter table foods
  add column if not exists category text not null default 'food_ambient';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'foods_category_check'
  ) then
    alter table foods add constraint foods_category_check
      check (category in (
        'food_fresh',    -- fruit, veg, meat, fish, dairy, bakery
        'food_frozen',   -- freezer aisle
        'food_ambient',  -- dried, tinned, jarred, packets, herbs, snacks, bars
        'drink',         -- tea, coffee, squash, bottles, cans
        'household',     -- CONSUMABLE: cleaning products, toilet roll, foil, bin bags
        'personal',      -- shower gel, shampoo, toothpaste, razors, deodorant, hair
        'home',          -- DURABLE: bulbs, fuses, batteries, equipment, cards, stationery
        'pet',           -- pet food, bedding, hay, litter
        'other'
      ));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. unit on both quantity-bearing tables
--
-- 'item' is what makes non-food work: 3 light bulbs, 1 shower gel.
-- Default 'g' preserves the meaning of every row written before this.
-- ---------------------------------------------------------------------
alter table pantry_stock
  add column if not exists unit text not null default 'g';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pantry_stock_unit_check'
  ) then
    alter table pantry_stock add constraint pantry_stock_unit_check
      check (unit in ('g', 'ml', 'item'));
  end if;
end $$;

alter table shopping_list_items
  add column if not exists unit text not null default 'g';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shopping_list_items_unit_check'
  ) then
    alter table shopping_list_items add constraint shopping_list_items_unit_check
      check (unit in ('g', 'ml', 'item'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. pantry_stock.last_restocked
--
-- Replaces the updated_at proxy for near-expiry. updated_at moves whenever
-- a row is edited for ANY reason — fixing a typo in its location would have
-- silently reset an item's apparent freshness.
--
-- Nullable on purpose: "I do not know when I bought this" is a real state,
-- and the app must show "date not recorded" rather than invent one.
-- Near-expiry is last_restocked + shelf_life_days, and is simply not
-- calculated when either is null.
-- ---------------------------------------------------------------------
alter table pantry_stock
  add column if not exists last_restocked date;

-- ---------------------------------------------------------------------
-- VERIFICATION -- RUN AS A SEPARATE EXECUTION, NOT WITH THE ABOVE.
-- Run one statement at a time on mobile: the editor shows only the last
-- result set.
--
-- Result when applied, 21 Aug 2026:
--   foods.category        text, default 'food_ambient', not null   OK
--   pantry_stock.unit     text, default 'g', not null              OK
--   pantry_stock.last_restocked  date, nullable                    OK
--   shopping_list_items.unit     text, default 'g', not null       OK
--   3 CHECK constraints present                                    OK
--   foods: 0 rows (empty table, nothing added through the app yet) OK
--   RLS true on all three tables                                   OK
--   17 tables in public, matching schema.md                        OK
-- ---------------------------------------------------------------------

-- Expect exactly: category | text | 'food_ambient'::text | NO
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'foods' and column_name = 'category';

-- Expect 4 rows: pantry_stock.unit, pantry_stock.last_restocked,
--                shopping_list_items.unit  (last_restocked only on pantry)
select table_name, column_name, column_default, is_nullable
from information_schema.columns
where (table_name = 'pantry_stock' and column_name in ('unit', 'last_restocked'))
   or (table_name = 'shopping_list_items' and column_name = 'unit')
order by table_name, column_name;

-- Expect 3 rows, all CHECK constraints.
select conname, contype
from pg_constraint
where conname in ('foods_category_check',
                  'pantry_stock_unit_check',
                  'shopping_list_items_unit_check');

-- Every pre-existing food should now be 'food_ambient' and nothing else.
-- Recategorising them is a job for the Phase 7 UI, not this script.
select category, count(*) from foods group by category order by category;

-- RLS untouched: every table should still report rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('foods', 'pantry_stock', 'shopping_list_items');

-- Whole-schema sanity: should be 17, matching schema.md.
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';
