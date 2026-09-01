-- Run SEPARATELY. One row, one verdict.
with acc as (
  select
    -- The constraint must ACCEPT the new value and still REJECT junk.
    (select pg_get_constraintdef(oid) from pg_constraint
      where conname = 'foods_source_check') as def
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select def from acc) is null then 'FAIL — foods_source_check does not exist'
    when (select def from acc) not like '%reference%' then 'FAIL — reference not allowed by the CHECK'
    when (select def from acc) not like '%manual%' then 'FAIL — manual no longer allowed'
    when (select def from acc) not like '%openfoodfacts%' then 'FAIL — openfoodfacts no longer allowed'
    when (select tables from structure) <> 20
      then 'FAIL — expected 20 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 20
      then 'FAIL — expected 20 policies, found ' || (select policies from structure)
    else 'PASS — foods.source accepts manual, openfoodfacts and reference'
  end as verdict;
