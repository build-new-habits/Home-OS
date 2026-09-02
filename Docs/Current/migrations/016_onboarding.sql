-- Docs/Current/migrations/016_onboarding.sql
-- Home-OS schema revision 16 — Phase 27, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- Records that this ACCOUNT has been through the first run.
--
-- Deliberately not localStorage. Onboarding state belongs to the person,
-- not the device: reinstalling or switching phones should not put you back
-- through it, and a second household member joining SHOULD get their own
-- first run rather than inheriting yours.
--
-- Nullable, no default. Null means "not yet", which is the honest reading
-- for every existing row and for every new account.

alter table user_settings add column if not exists onboarded_at timestamptz;

comment on column user_settings.onboarded_at is
  'When this account finished the first run. Null = not yet. Never used to nag; only to stop offering.';
