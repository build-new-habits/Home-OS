-- Docs/Current/migrations/026_kitchen_rebuild_VERIFY.sql
--
-- Run AFTER 026. ONE query: the Supabase editor shows only the last result.
--
-- Expected, exactly:
--   plan slot allows drink        PASS
--   meal default_slot allows drink PASS
--   foods.fibre_g                 PASS
--   show_nutrition                PASS
--   nutrition_targets             PASS
--   is_leftover                   PASS

select 'plan slot allows drink' as check_name,
       case when exists (
         select 1 from pg_constraint con join pg_class rel on rel.oid = con.conrelid
          where rel.relname = 'weekly_meal_plan' and con.conname = 'weekly_meal_plan_slot_check'
            and pg_get_constraintdef(con.oid) ilike '%drink%')
       then 'PASS' else 'FAIL' end as result
union all
select 'meal default_slot allows drink',
       case when exists (
         select 1 from pg_constraint con join pg_class rel on rel.oid = con.conrelid
          where rel.relname = 'meals' and con.conname = 'meals_default_slot_check'
            and pg_get_constraintdef(con.oid) ilike '%drink%')
       then 'PASS' else 'FAIL' end
union all
select 'foods.fibre_g',
       case when exists (select 1 from information_schema.columns
                          where table_name = 'foods' and column_name = 'fibre_g')
       then 'PASS' else 'FAIL' end
union all
select 'show_nutrition',
       case when exists (select 1 from information_schema.columns
                          where table_name = 'user_settings' and column_name = 'show_nutrition'
                            and column_default = 'true')
       then 'PASS' else 'FAIL' end
union all
select 'nutrition_targets',
       case when exists (select 1 from information_schema.columns
                          where table_name = 'user_settings' and column_name = 'nutrition_targets')
       then 'PASS' else 'FAIL' end
union all
select 'is_leftover',
       case when exists (select 1 from information_schema.columns
                          where table_name = 'weekly_meal_plan' and column_name = 'is_leftover')
       then 'PASS' else 'FAIL' end
union all
select 'meals.course',
       case when exists (select 1 from information_schema.columns
                          where table_name = 'meals' and column_name = 'course')
       then 'PASS' else 'FAIL' end;
