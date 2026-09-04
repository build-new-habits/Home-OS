-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'user_settings' and column_name = 'rotation_mode'
),
legacy as (
  select count(*)::int as n from user_settings where rotation_mode is not false
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — rotation_mode does not exist'
    when (select is_nullable from col) <> 'NO' then 'FAIL — rotation_mode must be NOT NULL'
    when (select column_default from col) not like '%false%'
      then 'FAIL — rotation_mode must default to false'
    when (select n from legacy) <> 0
      then 'FAIL — an account already has suggestions turned off'
    when (select tables from structure) <> 22
      then 'FAIL — expected 22 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 22
      then 'FAIL — expected 22 policies, found ' || (select policies from structure)
    else 'PASS — rotation_mode added, suggestions on by default'
  end as verdict;
