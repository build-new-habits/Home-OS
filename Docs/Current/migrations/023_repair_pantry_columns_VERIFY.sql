-- Docs/Current/migrations/023_repair_pantry_columns_VERIFY.sql
--
-- Run this AFTER 023. Do not trust "Success. No rows returned" on its own —
-- that message appears even when the whole thing rolled back on disconnect.
--
-- Expect exactly three rows.

select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'pantry_stock'
  and column_name in ('reorder_at', 'level', 'level_set_at')
order by column_name;

-- Expected:
--   level         | text                        | YES
--   level_set_at  | timestamp with time zone    | YES
--   reorder_at    | numeric                     | YES
--
-- Fewer than three rows means the migration did not land. Run 023 again and
-- re-verify; do not move on.

-- And the constraints, which are the half people forget to check:
select conname
from pg_constraint
where conrelid = 'pantry_stock'::regclass
  and conname in ('pantry_stock_reorder_at_check', 'pantry_stock_level_check')
order by conname;

-- Expected: both names present.
