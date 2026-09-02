-- Run SEPARATELY. One row, one verdict.
with required as (
  select unnest(array['cuisine','budget_tier','dietary_tags','default_slot','library_ref']) as c
),
missing as (
  select string_agg(r.c, ', ') as v from required r
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'meals' and c.column_name = r.c
  )
),
tags as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'meals' and column_name = 'dietary_tags'
),
-- Your own recipes must remain untouched: no library_ref, no tags.
legacy as (
  select count(*)::int as n from meals
  where dietary_tags is null or library_ref is not null
),
idx as (
  select count(*)::int as n from pg_indexes
  where schemaname = 'public' and tablename = 'meals' and indexdef like '%library_ref%'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select v from missing) is not null
      then 'FAIL — columns missing: ' || (select v from missing)
    when (select is_nullable from tags) <> 'NO' then 'FAIL — dietary_tags must be NOT NULL'
    when (select column_default from tags) is null
      then 'FAIL — dietary_tags must default to an empty array, not null'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' existing meal(s) did not default cleanly'
    when (select n from idx) < 1 then 'FAIL — no library_ref index'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — library columns added, your own recipes untouched'
  end as verdict;
