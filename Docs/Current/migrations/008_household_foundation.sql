-- Docs/Current/migrations/008_household_foundation.sql
-- Home-OS schema revision 8 — Phase 18, 01 Sep 2026
--
-- ============================================================
-- READ BEFORE RUNNING
-- ============================================================
-- 1. CONFIRM THE SUPABASE PROJECT IS "Home OS". Not Alongside-Learn.
--    This has gone wrong before and this migration touches every table.
-- 2. TAKE A BACKUP FIRST. This is the one migration where that sentence
--    is not boilerplate.
-- 3. There is NO outer BEGIN/COMMIT. The Supabase SQL editor runs each
--    execution in its own transaction; an explicit COMMIT silently rolls
--    everything back on disconnect while reporting success.
-- 4. Run this whole file as ONE execution, then run the verification
--    block at the bottom SEPARATELY. It returns a single row with a
--    single verdict, because the mobile editor only shows the last
--    result set.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- Moves 13 of the 18 tables from per-user ownership to per-household
-- ownership, so a family can share a cupboard, a shopping list and a
-- meal plan. Five tables stay personal:
--
--   weight_logs, water_logs, exercises, exercise_logs, user_settings
--
-- A shared cupboard is a feature. A shared weight log would be a
-- betrayal of the no-shame principle, and rehab exercises are medical
-- information. Those five keep auth.uid() = user_id, untouched.
--
-- user_id STAYS on all 18 tables. On the personal five it remains the
-- access key. On the household thirteen it becomes provenance — who
-- added this — which is worth having in a shared house.
--
-- Idempotent throughout: safe to re-run if it fails partway.


-- ============================================================
-- 1. The two new tables
-- ============================================================

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null default 'My household'
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null references households(id) on delete cascade,
  -- NULLABLE ON PURPOSE. A child who eats the meals and has portions
  -- planned for them is a real member and does not need a login.
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'adult'
    check (role in ('owner', 'adult', 'child')),
  portion_factor numeric not null default 1.0
    check (portion_factor > 0 and portion_factor <= 3),
  dietary_tags text[] not null default '{}',
  unique (household_id, user_id)
);

create index if not exists idx_household_members_user
  on household_members (user_id);
create index if not exists idx_household_members_household
  on household_members (household_id);

drop trigger if exists trg_set_updated_at on households;
create trigger trg_set_updated_at
  before update on households
  for each row execute function set_updated_at();

drop trigger if exists trg_set_updated_at on household_members;
create trigger trg_set_updated_at
  before update on household_members
  for each row execute function set_updated_at();


-- ============================================================
-- 2. The membership helper
-- ============================================================
-- SECURITY DEFINER is load-bearing, not laziness. household_members
-- will itself carry an RLS policy expressed in terms of this function.
-- Without definer rights the policy would consult the function, which
-- would consult the policy, and Postgres would raise infinite
-- recursion. Definer rights break that loop by reading the table
-- directly.
--
-- search_path is pinned. A SECURITY DEFINER function with a mutable
-- search_path is a privilege-escalation hole.
--
-- STABLE lets the planner evaluate it once per statement rather than
-- once per row, which is the difference between a fast policy and one
-- that makes every list view crawl.

create or replace function my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid()
$$;

-- The single household used as a column default on insert. Mirrors the
-- existing `default auth.uid()` convention exactly, so no data module
-- has to start passing household_id and the standing rule "no user_id
-- on inserts — RLS supplies it" now covers household_id too.
create or replace function my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from household_members
  where user_id = auth.uid()
  order by created_at
  limit 1
$$;


-- ============================================================
-- 3. Give every existing user a household of one
-- ============================================================

insert into households (name)
select 'My household'
from auth.users u
where not exists (
  select 1 from household_members m where m.user_id = u.id
);

-- Pair each freshly created household with the user who needed one.
-- Ordering both sides by creation keeps the pairing deterministic when
-- more than one user is backfilled at once.
with needy as (
  select u.id as user_id, u.email,
         row_number() over (order by u.created_at) as rn
  from auth.users u
  where not exists (
    select 1 from household_members m where m.user_id = u.id
  )
),
fresh as (
  select h.id as household_id,
         row_number() over (order by h.created_at desc) as rn
  from households h
  where not exists (
    select 1 from household_members m where m.household_id = h.id
  )
)
insert into household_members (household_id, user_id, display_name, role)
select f.household_id,
       n.user_id,
       coalesce(nullif(split_part(n.email, '@', 1), ''), 'Me'),
       'owner'
from needy n
join fresh f on f.rn = n.rn;


-- ============================================================
-- 4. Add household_id to the thirteen shared tables
-- ============================================================
-- Added nullable, backfilled, then constrained. Adding it NOT NULL in
-- one step would fail on the first existing row.

do $$
declare
  t text;
  shared text[] := array[
    'foods', 'pantry_stock', 'shopping_list_items',
    'meals', 'meal_ingredients', 'weekly_meal_plan',
    'chore_projects', 'chore_tasks', 'chore_task_completions',
    'calendar_events',
    'holidays', 'holiday_checklist_items', 'holiday_purchase_items'
  ];
begin
  foreach t in array shared loop
    execute format(
      'alter table %I add column if not exists household_id uuid references households(id)', t);

    -- Backfill from the row's own owner.
    execute format(
      'update %I r set household_id = m.household_id
         from household_members m
        where m.user_id = r.user_id and r.household_id is null', t);

    execute format('alter table %I alter column household_id set not null', t);
    execute format(
      'alter table %I alter column household_id set default my_household_id()', t);

    -- Without this every policy check is a sequential scan through the
    -- subquery. Not optional.
    execute format(
      'create index if not exists idx_%s_household on %I (household_id)', t, t);
  end loop;
end $$;


-- ============================================================
-- 5. Rewrite the thirteen policies
-- ============================================================
-- WITH CHECK is never `true`. Standing rule, no exception here.

do $$
declare
  t text;
  shared text[] := array[
    'foods', 'pantry_stock', 'shopping_list_items',
    'meals', 'meal_ingredients', 'weekly_meal_plan',
    'chore_projects', 'chore_tasks', 'chore_task_completions',
    'calendar_events',
    'holidays', 'holiday_checklist_items', 'holiday_purchase_items'
  ];
begin
  foreach t in array shared loop
    execute format('drop policy if exists "owner access only" on %I', t);
    execute format('drop policy if exists "household access only" on %I', t);
    execute format(
      'create policy "household access only" on %I for all
         using (household_id in (select my_household_ids()))
         with check (household_id in (select my_household_ids()))', t);
  end loop;
end $$;


-- ============================================================
-- 6. RLS on the two new tables
-- ============================================================

alter table households enable row level security;
alter table household_members enable row level security;

drop policy if exists "household access only" on households;
create policy "household access only"
on households for all
using (id in (select my_household_ids()))
with check (id in (select my_household_ids()));

drop policy if exists "household access only" on household_members;
create policy "household access only"
on household_members for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));


-- ============================================================
-- 7. Every new account gets a household of one
-- ============================================================
-- In a trigger, not in client code. A client that fails halfway leaves
-- an account that can see nothing and cannot recover — no household
-- means my_household_ids() is empty, which denies everything.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household uuid;
begin
  insert into households (name) values ('My household')
  returning id into new_household;

  insert into household_members (household_id, user_id, display_name, role)
  values (
    new_household,
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'Me'),
    'owner'
  );

  return new;
end $$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
