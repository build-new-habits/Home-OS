-- Docs/Current/migrations/024_plan_weeks_VERIFY.sql
--
-- Run AFTER 024. Do not trust "Success. No rows returned" on its own —
-- that message appears even when the whole thing rolled back on
-- disconnect. This is what proved migrations 017 and 018 had never run.

-- 1. The column exists, is a date, and is required.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'weekly_meal_plan'
  and column_name = 'week_start';

-- Expected: exactly one row.
--   week_start | date | NO | (date_trunc('week'::text, now()))::date
--
-- is_nullable = YES means the backfill did not finish and the NOT NULL
-- never applied. Run 024 again before going any further.

-- 2. The Monday constraint is on.
select conname
from pg_constraint
where conrelid = 'weekly_meal_plan'::regclass
  and conname = 'weekly_meal_plan_week_start_monday';

-- Expected: one row.

-- 3. The index is there.
select indexname
from pg_indexes
where tablename = 'weekly_meal_plan'
  and indexname = 'weekly_meal_plan_week_idx';

-- Expected: one row.

-- 4. Every existing meal landed on a Monday, and on one week.
select week_start,
       extract(isodow from week_start) as day_number,
       count(*) as meals
from weekly_meal_plan
group by week_start
order by week_start;

-- Expected: day_number is 1 on every row — that is Monday.
--
-- Before any planning is done for another week there should be exactly one
-- row here, holding however many meals the plan currently has. Two or more
-- rows at this point would mean the backfill ran twice against differently
-- dated data, which is worth understanding before adding anything.
