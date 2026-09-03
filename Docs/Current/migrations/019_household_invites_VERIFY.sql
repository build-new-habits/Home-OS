-- Run SEPARATELY. One row, one verdict.
with cols as (
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'household_invites'
),
required as (
  select unnest(array['id','household_id','created_by','code','expires_at',
                      'redeemed_at','redeemed_by']) as c
),
missing as (
  select string_agg(r.c, ', ') as v from required r
  where not exists (select 1 from cols c where c.column_name = r.c)
),
pol as (
  select count(*)::int as n from pg_policies
  where schemaname = 'public' and tablename = 'household_invites'
),
fn as (
  select p.prosecdef, p.proconfig::text as cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'redeem_household_invite'
),
uniq as (
  select count(*)::int as n from pg_constraint
  where conrelid = 'household_invites'::regclass and contype = 'u'
),
levelcol as (
  select count(*)::int as n from information_schema.columns
  where table_schema = 'public' and table_name = 'pantry_stock' and column_name = 'level_set_at'
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from cols) = 0 then 'FAIL — household_invites does not exist'
    when (select v from missing) is not null
      then 'FAIL — columns missing: ' || (select v from missing)
    when (select n from uniq) < 1 then 'FAIL — code is not unique'
    when (select n from pol) <> 1 then 'FAIL — expected exactly one RLS policy'
    when (select count(*) from fn) = 0 then 'FAIL — redeem_household_invite does not exist'
    when not (select prosecdef from fn) then 'FAIL — redeem function must be SECURITY DEFINER'
    when (select cfg from fn) is null or (select cfg from fn) not like '%search_path%'
      then 'FAIL — redeem function must pin search_path'
    when (select n from levelcol) <> 1 then 'FAIL — pantry_stock.level_set_at missing'
    when (select tables from structure) <> 22
      then 'FAIL — expected 22 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 22
      then 'FAIL — expected 22 policies, found ' || (select policies from structure)
    else 'PASS — invites table, single-use codes, definer redemption, level_set_at'
  end as verdict;
