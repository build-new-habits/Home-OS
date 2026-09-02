-- Docs/Current/migrations/017_reorder_points.sql
-- Home-OS schema revision 17 — Phase 25, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- One nullable number: the level at which an item should reappear on the
-- shopping list.
--
-- Non-food has worked since Phase 6 — drink, household, personal, home and
-- pet are all valid categories, the shopping list is not filtered to
-- edible, and `usual` exists as a source. Shampoo and guinea pig hay could
-- always go on the list.
--
-- What was missing is a REASON for them to appear. Food reaches the list
-- because a meal plan needs it. Nothing plans your shampoo, so it only ever
-- appeared if you remembered — which is precisely the thing this product
-- exists not to require.
--
-- NULL MEANS NEVER REMIND, and null is the default. Opt-in, always: an app
-- that decides on its own that you need shampoo is an app that adds noise,
-- and noise is how a useful prompt gets ignored.

alter table pantry_stock add column if not exists reorder_at numeric;

alter table pantry_stock drop constraint if exists pantry_stock_reorder_at_check;
alter table pantry_stock add constraint pantry_stock_reorder_at_check
  check (reorder_at is null or reorder_at >= 0);

comment on column pantry_stock.reorder_at is
  'Put this back on the shopping list when current_qty drops to or below this. NULL = never remind. Opt-in only.';
