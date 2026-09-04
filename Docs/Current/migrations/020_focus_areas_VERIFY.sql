-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'user_settings' and column_name = 'focus_areas'
),
-- Every existing account must still see everything. A row that defaulted
-- to a narrowed set would hide areas somebody is already using.
legacy as (
  select count(*)::int as n from user_settings
  where focus_areas is null or array_length(focus_areas, 1) is not null
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — focus_areas does not exist'
    when (select is_nullable from col) <> 'NO' then 'FAIL — focus_areas must be NOT NULL'
    when (select column_default from col) is null
      then 'FAIL — focus_areas must default to an empty array'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' account(s) no longer see everything'
    when (select tables from structure) <> 22
      then 'FAIL — expected 22 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 22
      then 'FAIL — expected 22 policies, found ' || (select policies from structure)
    else 'PASS — focus_areas added, everyone still sees everything'
  end as verdict;
