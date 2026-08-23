# Home PWA: Schema (Canonical)
21 Aug 2026 v3

**This is the single source of truth for the database.** Every phase reads
this before writing code. If live code and this document disagree, stop and
reconcile before writing anything (PROJECT_BLUEPRINT.md §3). No field is
added, renamed, or removed anywhere without changing it here first.

Backend: Supabase (PostgreSQL, **EU region**, fresh project). 17 tables,
17 RLS policies, 1 trigger function, 17 update triggers, single owner.

---

## 0. Revision 3 — the shopping revision (21 Aug 2026)

The **first schema change since Phase 1**, and the reasoning matters more
than the columns.

Phases 1–8 were built against a frozen schema, and the freeze was right: it
forced workarounds to be recorded rather than the schema to sprawl. Two of
those workarounds were then found to rest on a false assumption, and a third
would have been built on top of it in Phase 7.

**The false assumption: that `foods` is what a supermarket shop is made of.**
It is not. A real shop is shampoo, toilet roll, light bulbs, guinea pig
bedding, birthday cards, razors and batteries. `shopping_list_items.food_id`
was `not null references foods(id)`, so none of those could be listed at
all — and the only schema-legal route, inventing a `foods` row for shower
gel, would have put shower gel in the meal planner's ingredient picker.

**The consequence: grams are not a universal unit.** Phase 7's brief locked
"all quantities are grams" because it was the only reading the frozen schema
supported. You do not buy 400 g of light bulbs. Quantities need a unit.

So `foods` becomes *things you buy*. Its nutrition columns were already
nullable, so a light bulb is simply a row with a name, a barcode and no
macros. What was missing was a way to say **what kind of thing it is**, so
non-food can be kept out of ingredient pickers.

Three additions, all non-destructive — every column has a default, nothing
is dropped or renamed, and every existing row stays valid:

1. `foods.category` — nine values, splitting food by **storage state**
   (fresh / frozen / ambient), because that is what actually determines
   shelf life. A single `food` value would have lumped fresh salmon with
   tinned beans and made expiry meaningless.
2. `unit` on `pantry_stock` and `shopping_list_items` — `g` / `ml` / `item`.
   `item` is what makes non-food work: 3 light bulbs, 1 shower gel.
3. `pantry_stock.last_restocked` — a real date, replacing the `updated_at`
   proxy for near-expiry. The proxy was wrong whenever a row was edited for
   an unrelated reason, such as fixing a typo in its location.

**`household` vs `home` is consumable vs durable.** Cleaning products,
toilet roll and foil are `household` — you restock them. Cleaning
equipment, light bulbs, batteries and stationery are `home` — you replace
them when they die. That is the test for anything new.

**Known debt, deliberately not fixed here:** the table is still named
`foods` while holding razors. Renaming is clean in Postgres but would churn
every data module, every test fixture and every doc — and Phase 6 is built
but not yet smoke-tested, so this is the wrong moment. Recorded, not
forgotten.

**Phase 6 is unaffected.** Nothing in Phase 6 reads `category`, and the
column arrives with a default, so foods added through the meals screen land
as `food_ambient` until Phase 7 provides a picker. The Phase 6 smoke test
remains valid and does not need re-running because of this.

---

## 1. Conventions that apply to every table

Do not restate these per-table; they are universal:

- **`id uuid primary key default gen_random_uuid()`**.
- **`user_id uuid not null default auth.uid() references auth.users(id)`**.
  The default means inserts never pass `user_id`; RLS still enforces it.
- **`created_at timestamptz not null default now()`** — set once on insert.
- **`updated_at timestamptz not null default now()`** — auto-maintained by
  the `set_updated_at` trigger (§5). This is the column offline sync uses to
  resolve which version of a row is newest.
- **RLS enabled**, exactly one policy per table (§4). Never `WITH CHECK (true)`.
- Enum-style `text` columns always carry a `CHECK` constraint.

## 2. Foreign-key deletion rules (fixed)

| Relationship | On delete | Why |
|---|---|---|
| exercise_logs → exercises | **cascade** | a log is meaningless without its exercise |
| meal_ingredients → meals | **cascade** | ingredients are part of the meal |
| holiday_checklist_items → holidays | **cascade** | belong to the holiday |
| holiday_purchase_items → holidays | **cascade** | belong to the holiday |
| chore_tasks → chore_projects | **restrict** | deleting a project with tasks must be deliberate |
| meal_ingredients → foods | **restrict** | a food used in a recipe must not vanish |
| pantry_stock → foods | **restrict** | as above |
| shopping_list_items → foods | **restrict** | as above |
| weekly_meal_plan → meals | **restrict** | a planned meal must not disappear from the week |

**App-layer rule:** every delete gets a confirm step. For `restrict`
relationships the confirm reports the dependent count ("used in 3 meals —
remove anyway?"). For `cascade` the confirm names what else goes ("this also
removes 4 checklist items"). This is behavioural principle 9 made literal —
nothing is ever deleted silently.

`calendar_events.source_id` is **not** a foreign key — it is a nullable
`uuid` pointing at a row in whichever table `event_type` names, resolved in
application code.

---

## 3. Tables

Columns below are *in addition to* the universal `id`, `user_id`,
`created_at`, `updated_at` from §1.

### exercises
| Column | Type | Constraint / notes |
|---|---|---|
| name | text | not null |
| side | text | check in ('left','right','both'); nullable |
| target_reps | int | |
| target_sets | int | |
| instructions | text | |
| youtube_search_query | text | search terms only — link built at render time, never stored as URL |
| body_region | text | e.g. 'glute', 'hamstring', 'core' |
| source | text | not null; check in ('physio','suggested') |
| clearance_status | text | not null; check in ('cleared','pending_confirmation'); default 'pending_confirmation' |

Physio-sourced = set `cleared` by the app on insert. Anything an AI session
adds stays `pending_confirmation` until the user clears it (principle 6).

### exercise_logs
| Column | Type | Notes |
|---|---|---|
| exercise_id | uuid | not null; references exercises(id) **on delete cascade** |
| log_date | date | not null |
| completed | boolean | default false |
| notes | text | |

### chore_projects
| Column | Type | Notes |
|---|---|---|
| title | text | not null |
| colour | text | not null; hex string |
| sort_order | int | default 0 |

### chore_tasks
| Column | Type | Notes |
|---|---|---|
| project_id | uuid | not null; references chore_projects(id) **on delete restrict** |
| title | text | not null |
| details | text | |
| is_repeatable | boolean | default false |
| recurrence_rule | text | RRULE string |
| status | text | check in ('pending','complete'); default 'pending' |
| completed_at | timestamptz | |

### calendar_events
| Column | Type | Notes |
|---|---|---|
| event_type | text | not null; check in ('chore','holiday','work_location','custom') |
| source_id | uuid | nullable soft pointer (see §2), **not** a FK |
| title | text | not null |
| start_date | date | not null |
| recurrence_rule | text | RRULE string |
| location_label | text | |

### weight_logs
| Column | Type | Notes |
|---|---|---|
| log_date | date | not null |
| weight_kg | numeric | not null; **canonical unit kg** — stone/lb is display only |
| target_weight_kg | numeric | |
| target_date | date | |

### water_logs
| Column | Type | Notes |
|---|---|---|
| log_date | date | not null |
| ml_logged | int | not null; **canonical unit millilitres** |

### foods

Despite the name, this is **anything you buy**, not only food (see §0).
Nutrition columns are nullable throughout: a light bulb is a row with a name
and no macros. `category` is what keeps non-food out of ingredient pickers.

| Column | Type | Notes |
|---|---|---|
| name | text | not null |
| barcode | text | nullable |
| category | text | not null; check in the 9 values below; default `'food_ambient'` |
| calories_per_100g | numeric | **canonical unit kcal per 100 g** |
| protein_g | numeric | **per 100 g** |
| fat_g | numeric | **per 100 g** |
| carbs_g | numeric | **per 100 g** |
| source | text | check in ('manual','openfoodfacts'); default 'manual' |

**`category` values** (order is display order; `other` sits last so it does
not become the lazy default):

| Value | Covers |
|---|---|
| `food_fresh` | fruit, veg, meat, fish, dairy, bakery |
| `food_frozen` | anything from the freezer aisle |
| `food_ambient` | dried, tinned, jarred, packets, herbs, snacks, bars |
| `drink` | tea, coffee, squash, bottles, cans |
| `household` | **consumable**: cleaning products, toilet roll, kitchen roll, foil, bin bags |
| `personal` | shower gel, shampoo, conditioner, toothpaste, razors, shaving gel, deodorant, hair products |
| `home` | **durable**: light bulbs, fuses, batteries, kitchen equipment, cleaning equipment, cards, stationery |
| `pet` | pet food, bedding, hay, litter |
| `other` | anything genuinely uncategorised |

Meal-ingredient pickers must filter to `food_fresh`, `food_frozen`,
`food_ambient` and `drink`. Offering shower gel mid-recipe is the failure
this column exists to prevent.

### meals
| Column | Type | Notes |
|---|---|---|
| name | text | not null |
| default_serves | int | not null; default 4 |

### meal_ingredients
| Column | Type | Notes |
|---|---|---|
| meal_id | uuid | not null; references meals(id) **on delete cascade** |
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| quantity_g | numeric | not null |

### weekly_meal_plan
| Column | Type | Notes |
|---|---|---|
| meal_id | uuid | not null; references meals(id) **on delete restrict** |
| day_of_week | text | not null; check in ('mon','tue','wed','thu','fri','sat','sun') |
| slot | text | not null; check in ('breakfast','lunch','dinner','snack') |
| serves_override | int | nullable; overrides meals.default_serves for this instance (principle 5) |

### pantry_stock

Holds **non-food as well as food** — 3 spare light bulbs is a legitimate row.

| Column | Type | Notes |
|---|---|---|
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| default_location | text | which cupboard. Distinct from `foods.category`: category is *what the thing is*, location is *where it lives*, and non-food needs locations like "bathroom cabinet" and "garage" |
| shelf_life_days | int | how long it keeps once bought |
| current_qty | numeric | default 0; **interpret with `unit`** |
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
| last_restocked | date | nullable. When it was actually bought. **Near-expiry is `last_restocked + shelf_life_days`** — never `updated_at`, which moves whenever the row is edited for any reason |

### shopping_list_items
| Column | Type | Notes |
|---|---|---|
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| qty_needed | numeric | **interpret with `unit`** |
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
| source | text | not null; check in ('usual','meal_plan','holiday') |
| status | text | check in ('needed','have','bought'); default 'needed' |

`food_id` stays `not null`: with `foods` now covering everything you buy,
every list item has a real row behind it. A holiday purchase item reaches
the list by creating (or matching) a `foods` row with the right `category` —
"sun cream" is `personal`, not an invented food.

### holidays
| Column | Type | Notes |
|---|---|---|
| title | text | not null |
| start_date | date | not null |
| end_date | date | not null |

### holiday_checklist_items
| Column | Type | Notes |
|---|---|---|
| holiday_id | uuid | not null; references holidays(id) **on delete cascade** |
| title | text | not null |
| status | text | check in ('pending','complete'); default 'pending' |

### holiday_purchase_items
| Column | Type | Notes |
|---|---|---|
| holiday_id | uuid | not null; references holidays(id) **on delete cascade** |
| title | text | not null |
| status | text | check in ('pending','complete'); default 'pending' |
| send_to_shopping | boolean | default false |

### user_settings
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | **unique** — one settings row per user (adds `unique` to the universal definition) |
| theme | text | default 'default' |
| contrast_mode | text | default 'standard' |
| brightness_pref | text | default 'standard' |
| weight_unit_display | text | check in ('stone_lb','kg'); default 'stone_lb' |
| notification_prefs | jsonb | default '{}'::jsonb — every notification type off by default (principle 8) |

App **upserts** this single row, keyed on the unique `user_id`. Settings
apply immediately, no save step (principle 7).

---

## 4. Row-level security

For all 17 tables:

```sql
alter table <table_name> enable row level security;

create policy "owner access only"
on <table_name>
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

17 tables → 17 policies. Never `WITH CHECK (true)`.

---

## 5. updated_at trigger

One shared function, one trigger per table (full DDL in §6):

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at
before update on <table_name>
for each row execute function set_updated_at();
```

---

## 6. Full DDL (paste target for Phase 1)

Run in order in the Supabase SQL editor.

```sql
-- 1. tables ---------------------------------------------------------------

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  side text check (side in ('left','right','both')),
  target_reps int,
  target_sets int,
  instructions text,
  youtube_search_query text,
  body_region text,
  source text check (source in ('physio','suggested')) not null,
  clearance_status text check (clearance_status in ('cleared','pending_confirmation')) not null default 'pending_confirmation'
);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  log_date date not null,
  completed boolean default false,
  notes text
);

create table chore_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  colour text not null,
  sort_order int default 0
);

create table chore_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references chore_projects(id) on delete restrict,
  title text not null,
  details text,
  is_repeatable boolean default false,
  recurrence_rule text,
  status text check (status in ('pending','complete')) default 'pending',
  completed_at timestamptz
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_type text check (event_type in ('chore','holiday','work_location','custom')) not null,
  source_id uuid,
  title text not null,
  start_date date not null,
  recurrence_rule text,
  location_label text
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  log_date date not null,
  weight_kg numeric not null,
  target_weight_kg numeric,
  target_date date
);

create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  log_date date not null,
  ml_logged int not null
);

create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  barcode text,
  calories_per_100g numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  category text not null default 'food_ambient'
    check (category in ('food_fresh','food_frozen','food_ambient','drink',
                        'household','personal','home','pet','other')),
  source text check (source in ('manual','openfoodfacts')) default 'manual'
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  default_serves int not null default 4
);

create table meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid not null references foods(id) on delete restrict,
  quantity_g numeric not null
);

create table weekly_meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete restrict,
  day_of_week text not null check (day_of_week in ('mon','tue','wed','thu','fri','sat','sun')),
  slot text check (slot in ('breakfast','lunch','dinner','snack')) not null,
  serves_override int
);

create table pantry_stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  food_id uuid not null references foods(id) on delete restrict,
  default_location text,
  shelf_life_days int,
  current_qty numeric default 0,
  unit text not null default 'g' check (unit in ('g','ml','item')),
  last_restocked date
);

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  food_id uuid not null references foods(id) on delete restrict,
  qty_needed numeric,
  unit text not null default 'g' check (unit in ('g','ml','item')),
  source text check (source in ('usual','meal_plan','holiday')) not null,
  status text check (status in ('needed','have','bought')) default 'needed'
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  start_date date not null,
  end_date date not null
);

create table holiday_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  holiday_id uuid not null references holidays(id) on delete cascade,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending'
);

create table holiday_purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  holiday_id uuid not null references holidays(id) on delete cascade,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending',
  send_to_shopping boolean default false
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  theme text default 'default',
  contrast_mode text default 'standard',
  brightness_pref text default 'standard',
  weight_unit_display text check (weight_unit_display in ('stone_lb','kg')) default 'stone_lb',
  notification_prefs jsonb default '{}'::jsonb
);

-- 2. updated_at trigger ---------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at before update on exercises               for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on exercise_logs           for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on chore_projects          for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on chore_tasks             for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on calendar_events         for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on weight_logs             for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on water_logs              for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on foods                   for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on meals                   for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on meal_ingredients        for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on weekly_meal_plan        for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on pantry_stock            for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on shopping_list_items     for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holidays                for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holiday_checklist_items for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holiday_purchase_items  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on user_settings           for each row execute function set_updated_at();
```

RLS statements (§4) are run separately in Phase 1, once per table.

---

## 7. Changes from Phase 1 SQL v1

1. **Table count corrected to 17** (v1 said 16 twice, listed 17).
2. **`default auth.uid()` on every `user_id`** — simpler, safer inserts.
3. **`created_at` on every table** (was inconsistent).
4. **`updated_at` on every table + `set_updated_at` trigger** — offline
   sync conflict resolution, baked in from Phase 1.
5. **Explicit `on delete` on every FK** per §2.
6. **`weekly_meal_plan.day_of_week` check constraint** (was free text).

No columns removed or renamed.

---

## 8. Canonical units (never store display units)

- Weight in **kg** (`weight_kg`); stone/lb is display only.
- Water in **millilitres** (`ml_logged`).
- Food macros per **100 g**.

Everything shown differently is converted at render time from these
canonical values, driven by `user_settings`. Nothing display-formatted is
written back.
