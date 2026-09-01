-- Docs/Current/migrations/009_pack_labels_VERIFY.sql
-- Run SEPARATELY. One row, one verdict — the mobile SQL editor only shows
-- the final result set.

with col as (
  select is_nullable, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'foods' and column_name = 'item_label'
),
con as (
  select count(*)::int as n
  from pg_constraint
  where conname = 'foods_item_label_check'
),
-- The column must NOT have quietly acquired a NOT NULL or a default:
-- every existing food is unlabelled and must stay valid.
defaulted as (
  select count(*)::int as n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'foods'
    and column_name = 'item_label' and column_default is not null
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — foods.item_label does not exist'
    when (select is_nullable from col) <> 'YES' then 'FAIL — item_label must be nullable'
    when (select data_type from col) <> 'text' then 'FAIL — item_label must be text'
    when (select n from defaulted) <> 0 then 'FAIL — item_label must have no default'
    when (select n from con) <> 1 then 'FAIL — length CHECK missing'
    when (select tables from structure) <> 20
      then 'FAIL — expected 20 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 20
      then 'FAIL — expected 20 policies, found ' || (select policies from structure)
    else 'PASS — foods.item_label added, nullable, no default, length checked'
  end as verdict;
