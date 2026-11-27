-- Docs/Current/migrations/030_week_shapes.sql
-- Home-OS schema revision 30 — 27 Nov 2026 (Phase 37, Week Shaper)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT.
--
-- One new table, one row per household: the Week Shaper's rules and the
-- week's events.
--   rules  {"rhythm":true,"fish":2,"meat":1,"everyone":true,
--           "weeknights":"30","weekends":"any","useItUp":true,"variety":true}
--   events {"2026-11-29":["match"],"2026-11-26":["gym"]}
-- Nothing about a recipe is stored: the shaper works that out each time.
-- Before this runs, the app keeps both on the phone.

create table if not exists week_shapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  household_id uuid not null default my_household_id() references households(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rules jsonb not null default '{}'::jsonb,
  events jsonb not null default '{}'::jsonb,
  unique (household_id)
);

alter table week_shapes enable row level security;

drop policy if exists "household access only" on week_shapes;
create policy "household access only"
on week_shapes for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));

drop trigger if exists trg_set_updated_at on week_shapes;
create trigger trg_set_updated_at
  before update on week_shapes
  for each row execute function set_updated_at();
