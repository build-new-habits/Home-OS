-- Docs/Current/migrations/013_plan_members.sql
-- Home-OS schema revision 13 — Phase 20, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- One column. weekly_meal_plan already supports several meals in one cell
-- (no unique constraint on day+slot, and the view already renders a list),
-- so sea bass for the adults and sausage and chips for the kids on the same
-- Tuesday already works. What is missing is recording WHO each one is for,
-- so the shopping list can scale to the people actually eating.
--
-- portion_factor and dietary_tags already live on household_members
-- (revision 8) — put there at the time precisely so this migration is one
-- column rather than three.

alter table weekly_meal_plan
  add column if not exists member_ids uuid[] not null default '{}';

-- EMPTY MEANS EVERYONE, and that is the default forever.
--
-- Most meals in a house are for the whole house. If planning required
-- naming people, it would tax the common case seven times a day to capture
-- information that only matters occasionally. You name members only when
-- you diverge — which for most families is lunches.
--
-- No FK is possible from an array element, so a removed member can leave a
-- stale id behind. Reading code treats an unknown id as "no longer here"
-- and ignores it; past plans keep their record of who ate what.

comment on column weekly_meal_plan.member_ids is
  'Empty = everyone in the household. Otherwise the members this entry is for. Stale ids from removed members are ignored on read.';

create index if not exists idx_weekly_meal_plan_members
  on weekly_meal_plan using gin (member_ids);
