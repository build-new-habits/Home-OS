-- Home-OS schema revision 6 — things to DO on holiday
-- 26 Aug 2026. Matches Docs/Current/schema.md v6 §0d.
--
-- Run in the Supabase SQL editor for project vkjwwnjhizrlqcovpdco.
-- CONFIRM THE PROJECT IS "Home OS" before running.
--
-- NO `begin;` / `commit;`. The editor runs each execution in its own
-- transaction; an explicit COMMIT does not take effect and the whole
-- migration is silently rolled back on disconnect while still reporting
-- "Success. No rows returned". Learned the hard way on migration 003.
--
-- SAFE TO RUN: one nullable-with-default column. Nothing dropped, renamed
-- or narrowed. Every existing checklist row keeps its exact meaning.
--
-- IDEMPOTENT: safe to run twice.
--
-- ---------------------------------------------------------------------
-- WHY A COLUMN, NOT A THIRD TABLE
--
-- A holiday now has three lists: things to buy, things to pack, and things
-- to DO while you are there.
--
-- Buying is genuinely different — `holiday_purchase_items` carries
-- send_to_shopping, which bridges into the shopping list, and nothing else
-- has that. So it stays its own table.
--
-- Packing and doing are the SAME SHAPE: a title, and whether it is done.
-- A separate table for to-dos would mean a fourth RLS policy, a fourth
-- trigger, a fourth branch in every loader, and two code paths that must
-- be kept identical forever. A `kind` column on the existing table gives
-- one path and one policy.
--
-- DEFAULT 'pack' is what makes this safe: every row written before now was
-- a packing item, and that is exactly what it stays.
--
-- The table name `holiday_checklist_items` becomes slightly historical —
-- it now holds two kinds of checklist. Renaming it would break any client
-- still running cached JavaScript from before the deploy, and this app is
-- offline-first with an aggressive precache. Additive-only is the property
-- that has made every migration here safe, and it is worth more than a
-- tidy table name. Recorded as debt, same as `quantity_g` in revision 4.
-- ---------------------------------------------------------------------
alter table holiday_checklist_items
  add column if not exists kind text not null default 'pack';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holiday_checklist_items_kind_check') then
    alter table holiday_checklist_items add constraint holiday_checklist_items_kind_check
      check (kind in ('pack', 'do'));
  end if;
end $$;

-- Both lists are always read together for one holiday, so the index covers
-- the holiday first and the kind second.
create index if not exists holiday_checklist_items_holiday_kind_idx
  on holiday_checklist_items (holiday_id, kind);

-- ---------------------------------------------------------------------
-- VERIFICATION — RUN AS A SEPARATE EXECUTION, NOT WITH THE ABOVE.
-- One row, seven columns, no horizontal scrolling on a phone.
-- ---------------------------------------------------------------------
select case when
  (select count(*) from information_schema.columns
     where table_name = 'holiday_checklist_items' and column_name = 'kind') = 1
  and (select column_default from information_schema.columns
     where table_name = 'holiday_checklist_items' and column_name = 'kind') like '%pack%'
  and (select is_nullable from information_schema.columns
     where table_name = 'holiday_checklist_items' and column_name = 'kind') = 'NO'
  and (select count(*) from pg_constraint
     where conname = 'holiday_checklist_items_kind_check') = 1
  and (select count(*) from pg_indexes
     where indexname = 'holiday_checklist_items_holiday_kind_idx') = 1
  -- Still 18 tables: this revision adds a column, never a table.
  and (select count(*) from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE') = 18
  then 'ALL GOOD' else 'SOMETHING MISSING' end as verdict;

-- And every existing item should still be a packing item.
select kind, count(*) from holiday_checklist_items group by kind order by kind;
