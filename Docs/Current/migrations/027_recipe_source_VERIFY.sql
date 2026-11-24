-- Docs/Current/migrations/027_recipe_source_VERIFY.sql
--
-- Run AFTER 027. ONE query: the Supabase editor shows only the last result.
--
-- Expected, exactly:
--   meals.source_url      PASS
--   source_url check      PASS
--   unique per household  PASS

select 'meals.source_url' as check_name,
       case when exists (select 1 from information_schema.columns
                          where table_name = 'meals' and column_name = 'source_url'
                            and is_nullable = 'YES')
       then 'PASS' else 'FAIL' end as result
union all
select 'source_url check',
       case when exists (
         select 1 from pg_constraint con join pg_class rel on rel.oid = con.conrelid
          where rel.relname = 'meals' and con.conname = 'meals_source_url_check')
       then 'PASS' else 'FAIL' end
union all
select 'unique per household',
       case when exists (
         select 1 from pg_indexes
          where tablename = 'meals' and indexname = 'meals_household_source_url_key'
            and indexdef ilike '%household_id%' and indexdef ilike '%where%')
       then 'PASS' else 'FAIL' end;
