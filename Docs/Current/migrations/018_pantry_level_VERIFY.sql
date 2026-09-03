-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'pantry_stock' and column_name = 'level'
),
con as (
  select pg_get_constraintdef(oid) as def from pg_constraint
  where conname = 'pantry_stock_level_check'
),
-- Every existing row must read as "nothing said". If any defaulted to
-- 'none', the next shopping list would fill with the whole cupboard.
legacy as (
  select count(*)::int as n from pantry_stock where level is not null
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — pantry_stock.level does not exist'
    when (select is_nullable from col) <> 'YES'
      then 'FAIL — level must be nullable; null means nothing said'
    when (select column_default from col) is not null
      then 'FAIL — level must have no default'
    when (select def from con) is null then 'FAIL — the level CHECK is missing'
    when (select def from con) not like '%plenty%' then 'FAIL — CHECK does not allow plenty'
    when (select def from con) not like '%none%' then 'FAIL — CHECK does not allow none'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' existing row(s) already carry a level'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — level added, nullable, every existing row still says nothing'
  end as verdict;
