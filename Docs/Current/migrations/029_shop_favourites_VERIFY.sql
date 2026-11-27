-- Docs/Current/migrations/029_shop_favourites_VERIFY.sql
-- Run AFTER 029. One query. Expected: three PASS rows.

select 'table exists' as check_name,
       case when to_regclass('public.shop_favourites') is not null then 'PASS' else 'FAIL' end as result
union all
select 'row level security on',
       case when (select relrowsecurity from pg_class where relname = 'shop_favourites') then 'PASS' else 'FAIL' end
union all
select 'one food once per household',
       case when exists (select 1 from pg_indexes where tablename = 'shop_favourites' and indexdef ilike '%unique%household_id%food_id%')
       then 'PASS' else 'FAIL' end;
