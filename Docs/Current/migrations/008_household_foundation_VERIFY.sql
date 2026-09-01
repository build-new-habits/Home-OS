-- Docs/Current/migrations/008_household_foundation_VERIFY.sql
-- Run SEPARATELY, after 008_household_foundation.sql.
--
-- The Supabase SQL editor on mobile only shows the FINAL result set, so
-- this returns exactly one row with one verdict column. Anything other
-- than 'PASS' lists what is wrong.

with expected_shared as (
  select unnest(array[
    'foods', 'pantry_stock', 'shopping_list_items',
    'meals', 'meal_ingredients', 'weekly_meal_plan',
    'chore_projects', 'chore_tasks', 'chore_task_completions',
    'calendar_events',
    'holidays', 'holiday_checklist_items', 'holiday_purchase_items'
  ]) as t
),
expected_personal as (
  select unnest(array[
    'weight_logs', 'water_logs', 'exercises', 'exercise_logs', 'user_settings'
  ]) as t
),

-- Every shared table has household_id, NOT NULL, with a default.
col_check as (
  select e.t,
         c.is_nullable,
         c.column_default
  from expected_shared e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.t
   and c.column_name = 'household_id'
),
missing_col as (
  select string_agg(t, ', ') as v from col_check where is_nullable is null
),
nullable_col as (
  select string_agg(t, ', ') as v from col_check where is_nullable = 'YES'
),
no_default as (
  select string_agg(t, ', ') as v from col_check
  where is_nullable is not null and column_default is null
),

-- Every shared table has the household policy and NOT the old one.
pol as (
  select e.t,
         bool_or(p.policyname = 'household access only') as has_new,
         bool_or(p.policyname = 'owner access only')     as has_old
  from expected_shared e
  left join pg_policies p on p.schemaname = 'public' and p.tablename = e.t
  group by e.t
),
missing_policy as (
  select string_agg(t, ', ') as v from pol where has_new is not true
),
stale_policy as (
  select string_agg(t, ', ') as v from pol where has_old
),

-- The personal five must be UNCHANGED. Sweeping them into the household
-- by accident is the failure that would matter most and show up least.
personal_pol as (
  select e.t,
         bool_or(p.policyname = 'owner access only') as ok
  from expected_personal e
  left join pg_policies p on p.schemaname = 'public' and p.tablename = e.t
  group by e.t
),
personal_broken as (
  select string_agg(t, ', ') as v from personal_pol where ok is not true
),
personal_leaked as (
  select string_agg(c.table_name::text, ', ') as v
  from information_schema.columns c
  join expected_personal e on e.t = c.table_name
  where c.table_schema = 'public' and c.column_name = 'household_id'
),

-- Index per shared table, or every policy check is a sequential scan.
missing_index as (
  select string_agg(e.t, ', ') as v
  from expected_shared e
  where not exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public' and i.tablename = e.t
      and i.indexdef like '%household_id%'
  )
),

-- Nobody is stranded. A user with no membership can see nothing at all.
orphan_users as (
  select count(*)::text as v
  from auth.users u
  where not exists (select 1 from household_members m where m.user_id = u.id)
),

-- Every shared row landed in a household.
orphan_rows as (
  select string_agg(t, ', ') as v from (
    select 'foods' as t where exists (select 1 from foods where household_id is null)
    union all select 'meals' where exists (select 1 from meals where household_id is null)
    union all select 'pantry_stock' where exists (select 1 from pantry_stock where household_id is null)
    union all select 'shopping_list_items' where exists (select 1 from shopping_list_items where household_id is null)
  ) x
),

structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)

select
  case
    when (select v from missing_col) is not null
      then 'FAIL — household_id missing on: ' || (select v from missing_col)
    when (select v from nullable_col) is not null
      then 'FAIL — household_id still nullable on: ' || (select v from nullable_col)
    when (select v from no_default) is not null
      then 'FAIL — no default on: ' || (select v from no_default)
    when (select v from missing_policy) is not null
      then 'FAIL — household policy missing on: ' || (select v from missing_policy)
    when (select v from stale_policy) is not null
      then 'FAIL — old owner policy still present on: ' || (select v from stale_policy)
    when (select v from personal_broken) is not null
      then 'FAIL — personal table lost its owner policy: ' || (select v from personal_broken)
    when (select v from personal_leaked) is not null
      then 'FAIL — personal table wrongly given household_id: ' || (select v from personal_leaked)
    when (select v from missing_index) is not null
      then 'FAIL — no household_id index on: ' || (select v from missing_index)
    when (select v from orphan_users) <> '0'
      then 'FAIL — ' || (select v from orphan_users) || ' user(s) belong to no household'
    when (select v from orphan_rows) is not null
      then 'FAIL — rows with no household in: ' || (select v from orphan_rows)
    when (select tables from structure) <> 20
      then 'FAIL — expected 20 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 20
      then 'FAIL — expected 20 policies, found ' || (select policies from structure)
    else 'PASS — 20 tables, 20 policies, 13 shared, 5 personal, no orphans'
  end as verdict;
