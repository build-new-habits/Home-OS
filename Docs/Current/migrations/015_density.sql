-- Docs/Current/migrations/015_density.sql
-- Home-OS schema revision 15 — Phase 26, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- One display preference, alongside theme, contrast and brightness.
--
-- Sensory needs vary, and a fixed density serves half the audience.
-- Comfortable is the default because generous spacing is the safer
-- failure: too tight is unusable, too loose is only more scrolling.
--
-- Compact scales SPACING only. Type size, tap targets and line height are
-- untouched — a compact mode that shrinks text or drops below 44px targets
-- is an accessibility regression wearing a preference's clothes.

alter table user_settings add column if not exists density text
  not null default 'comfortable'
  check (density in ('comfortable', 'compact'));

comment on column user_settings.density is
  'Spacing density. Scales spacing only; never type size or tap targets.';
