# Home PWA: Phase 1 Instructions — Supabase Setup
01 Jul 2026 v1

Follow this exactly. Do not add tables, columns, or policies not listed
here. If something seems missing, stop and flag it rather than improvising.

## 1. Create the Supabase project

- New project, **EU region** (cannot be changed after creation — confirm
  before clicking create).
- Enable email auth (single user — this account is you).

## 2. Create all tables

Run the following, in order, in the Supabase SQL editor:

```sql
-- exercises
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  side text check (side in ('left','right','both')),
  target_reps int,
  target_sets int,
  instructions text,
  youtube_search_query text,
  body_region text,
  source text check (source in ('physio','suggested')) not null,
  clearance_status text check (clearance_status in ('cleared','pending_confirmation')) not null default 'pending_confirmation',
  created_at timestamptz default now()
);

-- exercise_logs
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  exercise_id uuid references exercises(id) not null,
  log_date date not null,
  completed boolean default false,
  notes text
);

-- chore_projects
create table chore_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  colour text not null,
  sort_order int default 0
);

-- chore_tasks
create table chore_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  project_id uuid references chore_projects(id) not null,
  title text not null,
  details text,
  is_repeatable boolean default false,
  recurrence_rule text,
  status text check (status in ('pending','complete')) default 'pending',
  completed_at timestamptz
);

-- calendar_events
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event_type text check (event_type in ('chore','holiday','work_location','custom')) not null,
  source_id uuid,
  title text not null,
  start_date date not null,
  recurrence_rule text,
  location_label text
);

-- weight_logs
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  log_date date not null,
  weight_kg numeric not null,
  target_weight_kg numeric,
  target_date date
);

-- water_logs
create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  log_date date not null,
  ml_logged int not null
);

-- foods
create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  barcode text,
  calories_per_100g numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  source text check (source in ('manual','openfoodfacts')) default 'manual'
);

-- meals
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  default_serves int not null default 4
);

-- meal_ingredients
create table meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  meal_id uuid references meals(id) not null,
  food_id uuid references foods(id) not null,
  quantity_g numeric not null
);

-- weekly_meal_plan
create table weekly_meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  meal_id uuid references meals(id) not null,
  day_of_week text not null,
  slot text check (slot in ('breakfast','lunch','dinner','snack')) not null,
  serves_override int
);

-- pantry_stock
create table pantry_stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  food_id uuid references foods(id) not null,
  default_location text,
  shelf_life_days int,
  current_qty numeric default 0
);

-- shopping_list_items
create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  food_id uuid references foods(id) not null,
  qty_needed numeric,
  source text check (source in ('usual','meal_plan','holiday')) not null,
  status text check (status in ('needed','have','bought')) default 'needed'
);

-- holidays
create table holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  start_date date not null,
  end_date date not null
);

-- holiday_checklist_items
create table holiday_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  holiday_id uuid references holidays(id) not null,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending'
);

-- holiday_purchase_items
create table holiday_purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  holiday_id uuid references holidays(id) not null,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending',
  send_to_shopping boolean default false
);

-- user_settings
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null unique,
  theme text default 'default',
  contrast_mode text default 'standard',
  brightness_pref text default 'standard',
  weight_unit_display text check (weight_unit_display in ('stone_lb','kg')) default 'stone_lb',
  notification_prefs jsonb default '{}'::jsonb
);
```

## 3. Enable RLS and add policies

For **every table above**, run:

```sql
alter table <table_name> enable row level security;

create policy "owner access only"
on <table_name>
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Repeat for all 16 tables. Do not use `WITH CHECK (true)` on any table.

## 4. Confirm before closing this phase

- All 16 tables exist and are visible in the Supabase table editor.
- RLS is enabled on all 16 (check the shield icon in the table editor).
- Log in with your account and confirm you can insert a test row into
  `user_settings` and read it back — this proves auth + RLS are wired
  correctly end to end.
- Delete the test row once confirmed.

## 5. On completion

Report back: which tables were created, confirm RLS + policy count matches
(16 tables, 16 policies), and flag anything that didn't match this brief
exactly. This gets logged in master_schedule.md before Phase 2 starts.
