-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, data_type, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'user_settings' and column_name = 'onboarded_at'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — onboarded_at does not exist'
    when (select is_nullable from col) <> 'YES'
      then 'FAIL — onboarded_at must be nullable; null means "not yet"'
    when (select column_default from col) is not null
      then 'FAIL — onboarded_at must have no default, or every account reads as finished'
    when (select data_type from col) not like 'timestamp%'
      then 'FAIL — onboarded_at must be a timestamp'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — onboarded_at added, nullable, no default'
  end as verdict;
