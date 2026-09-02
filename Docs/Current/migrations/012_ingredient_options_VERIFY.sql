-- Run SEPARATELY. One row, one verdict.
with cols as (
  select column_name, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'meal_ingredients'
    and column_name in ('option_group', 'is_selected', 'option_label')
),
sel as (
  select is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'meal_ingredients'
    and column_name = 'is_selected'
),
-- Every existing row must still behave as a plain required ingredient.
legacy as (
  select count(*)::int as n from meal_ingredients
  where is_selected is not true or option_group is not null
),
idx as (
  select count(*)::int as n from pg_indexes
  where schemaname = 'public' and tablename = 'meal_ingredients'
    and indexdef like '%option_group%'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from cols) <> 3
      then 'FAIL — expected 3 new columns, found ' || (select count(*) from cols)
    when (select is_nullable from sel) <> 'NO' then 'FAIL — is_selected must be NOT NULL'
    when (select column_default from sel) not like '%true%'
      then 'FAIL — is_selected must default to true'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' existing ingredient(s) did not default cleanly'
    when (select n from idx) < 1 then 'FAIL — no option_group index'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — option_group, is_selected and option_label added; existing ingredients unchanged'
  end as verdict;
