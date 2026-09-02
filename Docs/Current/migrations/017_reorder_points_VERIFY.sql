-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'pantry_stock' and column_name = 'reorder_at'
),
con as (
  select count(*)::int as n from pg_constraint where conname = 'pantry_stock_reorder_at_check'
),
-- Every existing row must mean "never remind", or the next shopping list
-- fills with things nobody asked to be reminded about.
legacy as (
  select count(*)::int as n from pantry_stock where reorder_at is not null
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — reorder_at does not exist'
    when (select is_nullable from col) <> 'YES'
      then 'FAIL — reorder_at must be nullable; null means never remind'
    when (select column_default from col) is not null
      then 'FAIL — reorder_at must have no default'
    when (select n from con) <> 1 then 'FAIL — the non-negative CHECK is missing'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' existing row(s) already opted in'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — reorder_at added, nullable, nobody opted in by accident'
  end as verdict;
