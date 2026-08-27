-- Home-OS schema revision 7 — a real use-by date
-- 27 Aug 2026. Matches Docs/Current/schema.md v7 §0e.
--
-- Run in the Supabase SQL editor for project vkjwwnjhizrlqcovpdco.
-- CONFIRM THE PROJECT IS "Home OS" before running.
--
-- NO `begin;` / `commit;`. The editor runs each execution in its own
-- transaction; an explicit COMMIT does not take effect and the whole
-- migration is silently rolled back on disconnect while still reporting
-- "Success. No rows returned".
--
-- SAFE TO RUN: one nullable column. Nothing dropped, renamed or narrowed.
-- IDEMPOTENT: safe to run twice.
--
-- ---------------------------------------------------------------------
-- WHY
--
-- `shelf_life_days` is a GUESS dressed as data: 365 days from the day you
-- happened to stock it. The jar has the real answer printed on it.
--
-- So `use_by` is a FACT you read off the label, and shelf_life_days stays
-- as the ESTIMATE for when there is no label or you did not look.
--
-- BOTH ARE KEPT, and freshness prefers the fact:
--     use_by present      -> "Use by 3 September — 7 days left"
--     use_by absent       -> "Stocked today — about 365 days left"
--
-- THE TWO MUST NEVER READ THE SAME. The wording above is not decoration:
-- the moment an estimate is displayed as a hard date, it gets trusted in
-- front of an open fridge. "About" is doing real work in that sentence.
--
-- ---------------------------------------------------------------------
-- DELIBERATELY NOT BACKFILLED
--
-- The obvious move is to fill use_by with last_restocked + shelf_life_days
-- for existing rows. It is refused, for one reason: a fabricated date is
-- indistinguishable from one read off a label the moment it is stored.
-- It would then flow into the shopping shortfall, where "this expires
-- before you would cook it" would rest on a number the app invented.
--
-- NULL means "not recorded", exactly as it does for pantry_stock.current_qty
-- since revision 5's sibling fix. The estimate still shows; it just stays
-- visibly an estimate.
-- ---------------------------------------------------------------------
alter table pantry_stock
  add column if not exists use_by date;

-- A use-by before the day it was stocked is a typo, not a fact. Rejecting
-- it here means the UI cannot quietly store something impossible.
-- NULLs pass, which is the normal case.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pantry_stock_use_by_sane') then
    alter table pantry_stock add constraint pantry_stock_use_by_sane
      check (use_by is null or last_restocked is null or use_by >= last_restocked);
  end if;
end $$;

-- "What is going off soon?" is asked on every pantry load and by the
-- shortfall. Partial index: rows without a date are not candidates.
create index if not exists pantry_stock_use_by_idx
  on pantry_stock (use_by) where use_by is not null;

-- ---------------------------------------------------------------------
-- VERIFICATION — RUN AS A SEPARATE EXECUTION, NOT WITH THE ABOVE.
-- One row, no horizontal scrolling.
-- ---------------------------------------------------------------------
select case when
  (select count(*) from information_schema.columns
     where table_name = 'pantry_stock' and column_name = 'use_by') = 1
  and (select data_type from information_schema.columns
     where table_name = 'pantry_stock' and column_name = 'use_by') = 'date'
  and (select is_nullable from information_schema.columns
     where table_name = 'pantry_stock' and column_name = 'use_by') = 'YES'
  and (select count(*) from pg_constraint
     where conname = 'pantry_stock_use_by_sane') = 1
  and (select count(*) from pg_indexes
     where indexname = 'pantry_stock_use_by_idx') = 1
  -- Still 18 tables. A column, never a table.
  and (select count(*) from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE') = 18
  then 'ALL GOOD' else 'SOMETHING MISSING' end as verdict;

-- Expect every existing row to have a NULL use_by — nothing was invented.
select count(*) as rows_total,
       count(use_by) as rows_with_a_real_date
from pantry_stock;
