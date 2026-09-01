-- Docs/Current/migrations/010_reference_source.sql
-- Home-OS schema revision 10 — Phase 13, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- Widens one CHECK. A food whose figures came from a published reference
-- average is neither 'manual' (nobody typed them) nor 'openfoodfacts'
-- (no barcode was scanned). It is an estimate, and the app marks estimates
-- as estimates — so the column has to be able to say so.
--
-- Widening only: no existing row becomes invalid.

alter table foods drop constraint if exists foods_source_check;
alter table foods add constraint foods_source_check
  check (source in ('manual', 'openfoodfacts', 'reference'));

comment on column foods.source is
  'Where the nutrition figures came from. reference = a published average, shown to the user as an estimate.';
