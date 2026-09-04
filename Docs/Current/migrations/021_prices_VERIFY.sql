-- Run SEPARATELY. One row, one verdict.
with cols as (
  select column_name, is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'foods'
    and column_name in ('typical_price', 'price_updated_at')
),
con as (
  select count(*)::int as n from pg_constraint where conname = 'foods_typical_price_check'
),
-- Nobody may start with a price. A default would put invented numbers on
-- the first shopping list somebody opens.
legacy as (
  select count(*)::int as n from foods where typical_price is not null
),
structure as (
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_policies where schemaname = 'public')::int as policies
)
select
  case
    when (select count(*) from cols) <> 2
      then 'FAIL — expected both price columns, found ' || (select count(*) from cols)
    when exists (select 1 from cols where is_nullable <> 'YES')
      then 'FAIL — both price columns must be nullable'
    when exists (select 1 from cols where column_default is not null)
      then 'FAIL — neither price column may have a default'
    when (select n from con) <> 1 then 'FAIL — the price range CHECK is missing'
    when (select n from legacy) <> 0
      then 'FAIL — ' || (select n from legacy) || ' food(s) already carry a price'
    when (select tables from structure) <> 22
      then 'FAIL — expected 22 tables, found ' || (select tables from structure)
    when (select policies from structure) <> 22
      then 'FAIL — expected 22 policies, found ' || (select policies from structure)
    else 'PASS — prices added, nullable, nothing priced by accident'
  end as verdict;
