-- Docs/Current/migrations/025_recipe_notes_VERIFY.sql
--
-- Run AFTER 025.
--
-- ONE query, one result. The Supabase editor shows only the last
-- statement's output, so a file of separate SELECTs runs most of them
-- invisibly — that is how migrations 017 and 018 went a month believed-done
-- and how 024's first verification proved three-quarters of nothing.
--
-- Expected, exactly:
--   recipe_library_notes table   1
--   planning_notes table         1
--   recipe notes unique index    1
--   planning notes index         1
--   recipe notes RLS on          true
--   planning notes RLS on        true
--   recipe notes policy          1
--   planning notes policy        1

select 'recipe_library_notes table' as check_name,
       count(*)::text as result
  from information_schema.tables
 where table_name = 'recipe_library_notes'
union all
select 'planning_notes table',
       count(*)::text
  from information_schema.tables
 where table_name = 'planning_notes'
union all
select 'recipe notes unique index',
       count(*)::text
  from pg_indexes
 where tablename = 'recipe_library_notes'
   and indexname = 'recipe_library_notes_unique'
union all
select 'planning notes index',
       count(*)::text
  from pg_indexes
 where tablename = 'planning_notes'
   and indexname = 'planning_notes_household_idx'
union all
select 'recipe notes RLS on',
       relrowsecurity::text
  from pg_class
 where relname = 'recipe_library_notes'
union all
select 'planning notes RLS on',
       relrowsecurity::text
  from pg_class
 where relname = 'planning_notes'
union all
select 'recipe notes policy',
       count(*)::text
  from pg_policies
 where tablename = 'recipe_library_notes'
union all
select 'planning notes policy',
       count(*)::text
  from pg_policies
 where tablename = 'planning_notes';

-- RLS reading `false` is the one that matters. The table would exist, the
-- app would appear to work, and every household would be able to read every
-- other household's notes. Do not move on from that.
