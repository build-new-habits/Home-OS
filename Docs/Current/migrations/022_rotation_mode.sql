-- Docs/Current/migrations/022_rotation_mode.sql
-- Home-OS schema revision 22 — worklist E3, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- Tom, autistic, lives alone, daily user, across three traces:
--
--   "I'd like it to stop suggesting things."
--
-- He eats a rotation of six meals DELIBERATELY. The app offers him "you
-- could cook these right now" and a hundred library recipes, which for
-- somebody whose routine is the point is not helpfulness, it is noise.
--
-- No competitor found offers this. The people who want it want it badly,
-- and it is one boolean.
--
-- FALSE is the default, because suggestions are useful to most people. This
-- is a way of asking for quiet, never something to switch on before the app
-- behaves.

alter table user_settings add column if not exists rotation_mode boolean not null default false;

comment on column user_settings.rotation_mode is
  'True = stop offering recipe suggestions. The library stays reachable; it just stops being pushed.';
