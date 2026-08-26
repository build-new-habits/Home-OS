-- Home-OS schema revision 5 — occurrence completions, favourites, meal types
-- 26 Aug 2026. Matches Docs/Current/schema.md v5 §0c.
--
-- Run in the Supabase SQL editor for project vkjwwnjhizrlqcovpdco.
-- CONFIRM THE PROJECT IS "Home OS" before running. The account holds a
-- second, unrelated project.
--
-- NO `begin;` / `commit;`. The editor runs each execution in its own
-- transaction; an explicit COMMIT does not take effect and the whole
-- migration is silently rolled back on disconnect while still reporting
-- "Success. No rows returned". Learned the hard way on migration 003.
-- Run the migration, then run the verification as a SEPARATE execution.
--
-- SAFE TO RUN: additive only. One new table, two new nullable/defaulted
-- columns. Nothing dropped, renamed or narrowed; every existing row stays
-- valid and keeps its current meaning.
--
-- IDEMPOTENT: safe to run twice.
--
-- ---------------------------------------------------------------------
-- WHY 1: completing a repeating chore currently completes it FOREVER
--
-- `chore_tasks` carries a single `status` and `completed_at`. With four
-- chores nobody notices. The moment a "what's due today" view drives the
-- day, it is fatal: clean the fridge on 1 September and the whole series
-- reads as done from then on, because there is nowhere to record that ONE
-- occurrence happened.
--
-- A completion is not a property of the task. It is a fact about a task on
-- a date, so it needs its own row. That also gives history for free, and
-- makes "is this due?" a question with an answer instead of a guess.
--
-- The UNIQUE constraint is the point of the table: ticking the same
-- occurrence twice — a double tap, an offline replay landing after the
-- live write — must be harmless, not a second row.
-- ---------------------------------------------------------------------
create table if not exists chore_task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  task_id uuid not null references chore_tasks(id) on delete cascade,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);

-- Same single-owner policy as every other table. Never WITH CHECK (true).
alter table chore_task_completions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chore_task_completions'
      and policyname = 'owner access only'
  ) then
    create policy "owner access only"
      on chore_task_completions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- The updated_at trigger, as on all 17 existing tables. Offline sync uses
-- this column to decide which version of a row is newest.
do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    where c.relname = 'chore_task_completions' and t.tgname = 'trg_set_updated_at'
  ) then
    create trigger trg_set_updated_at
      before update on chore_task_completions
      for each row execute function set_updated_at();
  end if;
end $$;

-- "Was this occurrence done?" is the dashboard's hottest query.
create index if not exists chore_task_completions_date_idx
  on chore_task_completions (occurrence_date);

-- ---------------------------------------------------------------------
-- WHY 2: meals.is_favourite — finding the ten recipes you actually cook
--
-- A recipe list grows monotonically and is never re-sorted by hand. Without
-- a favourite flag the only way to reach a weeknight regular is to scroll
-- past everything ever entered, which is the same failure the pantry just
-- had at seven items.
--
-- NOT NULL DEFAULT false: "not a favourite" is the honest state of every
-- existing row, and a nullable boolean would give three meanings to a
-- two-state fact.
-- ---------------------------------------------------------------------
alter table meals
  add column if not exists is_favourite boolean not null default false;

-- ---------------------------------------------------------------------
-- WHY 3: meals.meal_type — what KIND of thing a recipe is
--
-- Distinct from `weekly_meal_plan.slot`, which already exists and means
-- something different: slot is where a meal sits in one week, meal_type is
-- what the recipe inherently IS. Porridge is a breakfast whether or not it
-- is planned for Tuesday, and eating it at 9pm does not reclassify it.
-- Conflating the two would mean planning a meal for dinner silently
-- rewrote the recipe.
--
-- NULLABLE on purpose. "I have not said yet" is a real state and every
-- existing recipe is in it. Defaulting to 'dinner' would be inventing an
-- answer, and a half-filled classification filters worse than none —
-- the same reasoning that deferred the finer food taxonomy.
--
-- 'drink' is included here but NOT added to weekly_meal_plan.slot: the
-- slot column is a frozen CHECK on planning positions, and widening it is
-- a separate decision with its own consequences for the planner grid.
-- ---------------------------------------------------------------------
alter table meals
  add column if not exists meal_type text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meals_meal_type_check') then
    alter table meals add constraint meals_meal_type_check
      check (meal_type is null or meal_type in
        ('breakfast', 'lunch', 'dinner', 'snack', 'drink'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- DELIBERATELY NOT ADDED: a chore cadence column
--
-- Daily / weekly / monthly / seasonal is already fully determined by
-- `chore_tasks.recurrence_rule` — FREQ plus INTERVAL. Storing it as well
-- would create two sources for one fact that can silently disagree the
-- moment a rule is edited. It is derived in js/lib/rrule.js instead, where
-- the rule is already parsed. Seasonal means MONTHLY with an interval of
-- three or more.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- VERIFICATION — RUN AS A SEPARATE EXECUTION, NOT WITH THE ABOVE.
-- On mobile the editor shows only the last result set, so run one at a time.
-- ---------------------------------------------------------------------

-- Expect 18 now, not 17. This is the first revision to add a TABLE.
select count(*) as tables from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';

-- Expect 18 policies and rowsecurity = true for the new table.
select count(*) as policies from pg_policies where schemaname = 'public';

select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'chore_task_completions';

-- Expect 6 columns on the new table.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'chore_task_completions'
order by ordinal_position;

-- Expect the unique constraint on (task_id, occurrence_date).
select conname, contype from pg_constraint
where conrelid = 'chore_task_completions'::regclass and contype in ('u', 'p', 'f');

-- Expect two new columns on meals: boolean not null false, and nullable text.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'meals' and column_name in ('is_favourite', 'meal_type')
order by column_name;

-- Expect the CHECK to exist.
select conname, contype from pg_constraint where conname = 'meals_meal_type_check';

-- Every existing recipe should be unclassified and not a favourite.
select meal_type, is_favourite, count(*) from meals
group by meal_type, is_favourite order by meal_type nulls first;

-- The updated_at trigger exists on the new table.
select t.tgname from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where c.relname = 'chore_task_completions' and not t.tgisinternal;
