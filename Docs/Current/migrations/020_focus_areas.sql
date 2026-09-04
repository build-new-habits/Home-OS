-- Docs/Current/migrations/020_focus_areas.sql
-- Home-OS schema revision 20 — Phase 33 (worklist A1), 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHY
-- ============================================================
-- Sarah, from three persona traces, unmoved in all three:
--
--   "I wanted to sort out dinner. Why is it asking about my weight?"
--   "I've got used to ignoring most of it. That's not the same as it
--    being better."
--
-- A correction to the trace, worth recording: the DASHBOARD is not the
-- problem. Its cards only appear when they have something to say, and
-- "Everything else" is two links.
--
-- The breadth she meets is the NAV BAR: Health, Kitchen, Chores, Calendar,
-- and two hubs behind those. Five domains before she has done anything.
--
-- ============================================================
-- THE CHANGE
-- ============================================================
-- Let someone say what they came for, and put the rest away.
--
-- EMPTY MEANS EVERYTHING, and that is the default. This is a way of asking
-- for less, never a thing you have to configure before the app works.
--
-- Nothing is deleted, disabled or paywalled. A hidden area is one tap to
-- bring back in Settings, and Dashboard and Settings are never hideable —
-- an app you can navigate yourself out of is a bug.

alter table user_settings add column if not exists focus_areas text[] not null default '{}';

comment on column user_settings.focus_areas is
  'Which areas to show in the nav. Empty = all of them, which is the default. Never used to restrict, only to quieten.';
