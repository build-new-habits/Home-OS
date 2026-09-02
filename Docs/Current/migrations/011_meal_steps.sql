-- Docs/Current/migrations/011_meal_steps.sql
-- Home-OS schema revision 11 — Phase 15, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- Adds meal_steps: one row per instruction, not a blob of prose.
--
-- A text column cannot be ticked off, cannot hold a timer, and cannot keep
-- your place when the screen locks. The requirement is small, clear,
-- followable steps — which needs each step to be a thing the app knows
-- about individually.
--
-- meal_steps is HOUSEHOLD-scoped, because meals are (revision 8). A recipe
-- your partner wrote has to be one you can cook.
--
-- After this: 21 tables, 21 policies, 21 update triggers.

create table if not exists meal_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  household_id uuid not null default my_household_id() references households(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete cascade,

  -- Not unique-constrained. Reordering under a unique constraint means a
  -- temporary gap or a deferred constraint, and the app renumbers
  -- contiguously on every save anyway. Enforce in code, not here.
  step_number int not null,

  instruction text not null check (length(trim(instruction)) between 1 and 300),

  -- Why, what it should look like, what to do if it has gone wrong. Kept
  -- OUT of the instruction so a step can be read without it.
  note text,

  duration_min int check (duration_min is null or duration_min between 1 and 1440),

  -- 'Prep', 'Sauce', 'To serve'. Groups the list without nesting it.
  step_group text,

  -- Rule 2 of RECIPE_STEP_STYLE.md: no "meanwhile". Parallel work is its
  -- own numbered step, flagged so the card can show it beside a running
  -- timer rather than after it.
  while_waiting boolean not null default false
);

create index if not exists idx_meal_steps_meal on meal_steps (meal_id, step_number);
create index if not exists idx_meal_steps_household on meal_steps (household_id);

alter table meal_steps enable row level security;

drop policy if exists "household access only" on meal_steps;
create policy "household access only"
on meal_steps for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));

drop trigger if exists trg_set_updated_at on meal_steps;
create trigger trg_set_updated_at
  before update on meal_steps
  for each row execute function set_updated_at();

-- The one-line caveat that belongs to no single step: "this makes a wet
-- sauce, do not panic".
alter table meals add column if not exists method_note text;
