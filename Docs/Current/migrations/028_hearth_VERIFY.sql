-- Docs/Current/migrations/028_hearth_VERIFY.sql
-- Run AFTER 028. One query. Expected, exactly:
--   table exists                     PASS
--   row level security on            PASS
--   read-only for members            PASS
--   every existing household hearth  PASS

select 'table exists' as check_name,
       case when to_regclass('public.household_entitlements') is not null then 'PASS' else 'FAIL' end as result
union all
select 'row level security on',
       case when (select relrowsecurity from pg_class where relname = 'household_entitlements') then 'PASS' else 'FAIL' end
union all
select 'read-only for members',
       case when (select count(*) from pg_policies where tablename = 'household_entitlements') = 1
             and (select cmd from pg_policies where tablename = 'household_entitlements' limit 1) = 'SELECT'
       then 'PASS' else 'FAIL' end
union all
select 'every existing household hearth',
       case when not exists (
         select 1 from households h
         left join household_entitlements e on e.household_id = h.id
         where e.plan is distinct from 'hearth')
       then 'PASS' else 'FAIL' end;
