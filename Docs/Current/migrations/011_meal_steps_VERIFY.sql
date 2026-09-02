-- Run SEPARATELY. One row, one verdict.
with cols as (
  select column_name, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'meal_steps'
),
required as (
  select unnest(array['id','user_id','household_id','meal_id','step_number',
                      'instruction','note','duration_min','step_group','while_waiting']) as c
),
missing as (
  select string_agg(r.c, ', ') as v from required r
  where not exists (select 1 from cols c where c.column_name = r.c)
),
pol as (
  select count(*)::int as n from pg_policies
  where schemaname = 'public' and tablename = 'meal_steps'
    and policyname = 'household access only'
),
trg as (
  select count(*)::int as n from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where c.relname = 'meal_steps' and t.tgname = 'trg_set_updated_at'
),
idx as (
  select count(*)::int as n from pg_indexes
  where schemaname = 'public' and tablename = 'meal_steps'
    and indexdef like '%household_id%'
),
cascade_ok as (
  -- A meal deleted must take its steps with it. Orphan steps would be
  -- invisible rows accumulating forever.
  select count(*)::int as n from pg_constraint
  where conrelid = 'meal_steps'::regclass and contype = 'f' and confdeltype = 'c'
),
note_col as (
  select count(*)::int as n from information_schema.columns
  where table_schema = 'public' and table_name = 'meals' and column_name = 'method_note'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from cols) = 0 then 'FAIL — meal_steps does not exist'
    when (select v from missing) is not null
      then 'FAIL — columns missing: ' || (select v from missing)
    when (select n from pol) <> 1 then 'FAIL — household policy missing on meal_steps'
    when (select n from trg) <> 1 then 'FAIL — updated_at trigger missing'
    when (select n from idx) < 1 then 'FAIL — no household_id index'
    when (select n from cascade_ok) < 1 then 'FAIL — meal_id is not ON DELETE CASCADE'
    when (select n from note_col) <> 1 then 'FAIL — meals.method_note missing'
    when (select tables from structure) <> 21
      then 'FAIL — expected 21 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 21
      then 'FAIL — expected 21 policies, found ' || (select policies from structure)
    else 'PASS — meal_steps created, 21 tables, 21 policies, cascade and index in place'
  end as verdict;
