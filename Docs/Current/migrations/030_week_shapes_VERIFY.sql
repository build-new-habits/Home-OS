-- Docs/Current/migrations/030_week_shapes_VERIFY.sql — every row should say PASS.
select 'table exists' as check_name,
       case when to_regclass('public.week_shapes') is not null then 'PASS' else 'FAIL' end as result
union all
select 'row level security on',
       case when exists (select 1 from pg_class where relname = 'week_shapes' and relrowsecurity)
       then 'PASS' else 'FAIL' end
union all
select 'one row per household',
       case when exists (
         select 1 from pg_constraint con join pg_class rel on rel.oid = con.conrelid
          where rel.relname = 'week_shapes' and con.contype = 'u')
       then 'PASS' else 'FAIL' end;
