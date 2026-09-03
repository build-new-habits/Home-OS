-- Docs/Current/migrations/018_pantry_level.sql
-- Home-OS schema revision 18 — Phase 31, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHY THIS EXISTS
-- ============================================================
-- The persona trace lost a user to this exact problem. Jodie, 24, ADHD,
-- £30 a week, uninstalled on day 12:
--
--   "When it was right it was brilliant. But keeping the cupboard right is
--    a job, and if I could reliably do that job I wouldn't have needed the
--    app."
--
-- The competitive research found the whole category fails the same way:
-- "keeping quantities accurate takes discipline". Barcode scanning, the
-- claim step, bought-to-pantry and depletion-after-cooking all REDUCED the
-- upkeep. None of them removed it, because the model still asks for a
-- NUMBER, and a number requires counting.
--
-- ============================================================
-- THE CHANGE
-- ============================================================
-- Let the pantry be vague on purpose.
--
--   plenty / low / none
--
-- One tap. No counting, no scanning, no weighing. Usable INSTEAD of
-- current_qty, never as well.
--
-- This is not a lesser mode for people who cannot manage the real one. For
-- most cupboard items "have I got enough" is the only question anyone
-- actually asks, and a number is a more precise answer to a question nobody
-- had.
--
-- ---- Precedence, decided here and honoured everywhere ----
--   current_qty set    -> the number wins. Precision beats approximation.
--   current_qty null   -> level is used.
--   both null          -> unknown, which never demotes a recipe (Phase 14).
--
-- NULL level is the default and means "nothing said". It is NOT 'none'.
-- Collapsing those two would put every unrecorded item on the shopping
-- list at once, which is the same mistake reorder_at avoids.

alter table pantry_stock add column if not exists level text;

alter table pantry_stock drop constraint if exists pantry_stock_level_check;
alter table pantry_stock add constraint pantry_stock_level_check
  check (level is null or level in ('plenty', 'low', 'none'));

comment on column pantry_stock.level is
  'Rough amount when no number is recorded: plenty / low / none. NULL = nothing said, which is not the same as none. current_qty wins when both are set.';
