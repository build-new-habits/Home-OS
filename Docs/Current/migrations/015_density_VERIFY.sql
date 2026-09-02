-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'user_settings' and column_name = 'density'
),
legacy as (
  select count(*)::int as n from user_settings where density is distinct from 'comfortable'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — user_settings.density does not exist'
    when (select is_nullable from col) <> 'NO' then 'FAIL — density must be NOT NULL'
    when (select column_default from col) not like '%comfortable%'
      then 'FAIL — density must default to comfortable'
    when (select n from legacy) <> 0
      then 'FAIL — existing settings row did not default to comfortable'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — density added, defaults to comfortable'
  end as verdict;
