-- Run SEPARATELY. One row, one verdict.
with col as (
  select is_nullable, data_type, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'weekly_meal_plan'
    and column_name = 'member_ids'
),
-- Every existing entry must still mean "everyone".
legacy as (
  select count(*)::int as n from weekly_meal_plan
  where member_ids is null or array_length(member_ids, 1) is not null
),
idx as (
  select count(*)::int as n from pg_indexes
  where schemaname = 'public' and tablename = 'weekly_meal_plan'
    and indexdef like '%member_ids%'
),
-- Revision 8 should already have supplied these. Checked here because
-- Phase 20 depends on them and a missing one would fail silently.
member_cols as (
  select count(*)::int as n from information_schema.columns
  where table_schema = 'public' and table_name = 'household_members'
    and column_name in ('portion_factor', 'dietary_tags')
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from col) = 0 then 'FAIL — member_ids does not exist'
    when (select is_nullable from col) <> 'NO' then 'FAIL — member_ids must be NOT NULL'
    when (select column_default from col) is null then 'FAIL — member_ids must default to an empty array'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' existing plan entry(s) did not default to everyone'
    when (select n from idx) < 1 then 'FAIL — no member_ids index'
    when (select n from member_cols) <> 2
      then 'FAIL — household_members is missing portion_factor or dietary_tags'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — member_ids added, every existing entry still means everyone'
  end as verdict;
