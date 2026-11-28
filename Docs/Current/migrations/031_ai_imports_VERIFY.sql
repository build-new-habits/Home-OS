-- Docs/Current/migrations/031_ai_imports_VERIFY.sql — every row should say PASS.
select 'table exists' as check_name,
       case when to_regclass('public.ai_imports') is not null then 'PASS' else 'FAIL' end as result
union all
select 'row level security on',
       case when exists (select 1 from pg_class where relname = 'ai_imports' and relrowsecurity)
       then 'PASS' else 'FAIL' end
union all
select 'read-only for members',
       case when (select count(*) from pg_policies where tablename = 'ai_imports') = 1
             and (select cmd from pg_policies where tablename = 'ai_imports' limit 1) = 'SELECT'
       then 'PASS' else 'FAIL' end
union all
select 'month index',
       case when to_regclass('public.ai_imports_household_month') is not null then 'PASS' else 'FAIL' end;
