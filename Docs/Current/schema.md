# Home PWA: Schema (Canonical)
27 Aug 2026 v7

**This is the single source of truth for the database.** Every phase reads
this before writing code. If live code and this document disagree, stop and
reconcile before writing anything (PROJECT_BLUEPRINT.md §3). No field is
added, renamed, or removed anywhere without changing it here first.

Backend: Supabase (PostgreSQL, **EU region**, fresh project). **18 tables,
18 RLS policies**, 1 trigger function, 18 update triggers, single owner.
(17 until revision 5, which added the first new table since Phase 1.)

---

## 0e. Revision 7 — a real use-by date (27 Aug 2026)

`pantry_stock` gains **`use_by`** — a nullable `date`.

`shelf_life_days` is a guess dressed as data: 365 days from whenever you
happened to stock it. The jar has the real answer printed on it.

**Both are kept, and freshness prefers the fact:**

| State | Reads as |
|---|---|
| `use_by` present | "Use by 3 September — 7 days left" |
| `use_by` absent | "Stocked today — about 365 days left" |

**The two must never read the same.** That wording is not decoration: the
moment an estimate is displayed as a hard date it gets trusted in front of
an open fridge. "About" is doing real work in that sentence.

**Deliberately not backfilled.** Filling `use_by` with
`last_restocked + shelf_life_days` would store a fabricated date that is
then indistinguishable from one read off a label — and it would flow into
the shopping shortfall, where "this expires before you would cook it" would
rest on a number the app invented. NULL means "not recorded", exactly as it
does for `current_qty`.

A CHECK refuses a use-by earlier than `last_restocked`; that is a typo, not
a fact. A partial index on non-null `use_by` serves "what is going off
soon", which is asked on every pantry load.

---

## 0d. Revision 6 — things to DO on holiday (26 Aug 2026)

A holiday now has three lists: things to **buy**, things to **pack**, and
things to **do** while you are there.

`holiday_checklist_items` gains **`kind`** — `pack` / `do`, not null,
**default `pack`**, CHECK-constrained.

**Why a column rather than a third table.** Buying is genuinely different:
`holiday_purchase_items` carries `send_to_shopping`, which bridges into the
shopping list, and nothing else does. Packing and doing are the *same
shape* — a title and whether it is done. A separate table would mean a
fourth RLS policy, a fourth trigger, a fourth branch in every loader, and
two code paths that must be kept identical forever.

**`default 'pack'` is what makes it safe**: every row written before now was
a packing item, and that is exactly what it stays.

**The table name becomes historical** — it now holds two kinds of checklist.
Not renamed, for the same reason `quantity_g` was not in revision 4: a
rename breaks any client still running cached JavaScript from before the
deploy, and additive-only is the property that has kept every migration here
safe. Recorded as debt.

---

## 0c. Revision 5 — occurrences and classification (26 Aug 2026)

Three additions, driven by the app finally being used with real data.

### `chore_task_completions` — the first new TABLE since Phase 1

Completing a repeating chore marked **the task** complete, not **this
occurrence**. With four chores nobody notices; with a dashboard driving the
day it is fatal — clean the fridge on 1 September and the whole series reads
as done forever, because there was nowhere to record that one occurrence
happened.

A completion is a fact about *a task on a date*, not a property of the task,
so it gets its own row:

| Column | Type | Notes |
|---|---|---|
| task_id | uuid | not null; references chore_tasks(id) **on delete cascade** |
| occurrence_date | date | not null |
| completed_at | timestamptz | not null; default now() |

**`unique (task_id, occurrence_date)` is the point of the table.** Ticking
the same occurrence twice — a double tap, or an offline replay landing after
the live write — must be harmless rather than a second row.

"Is this due today?" becomes a question with an answer instead of a guess,
and history comes for free.

### `meals.is_favourite` — boolean, not null, default false

A recipe list grows and is never re-sorted by hand. Without this, reaching a
weeknight regular means scrolling past everything ever entered — the failure
the pantry hit at seven items. Not-a-favourite is the honest state of every
existing row, and a nullable boolean would give three meanings to a
two-state fact.

### `meals.meal_type` — nullable text, CHECK breakfast/lunch/dinner/snack/drink

**Distinct from `weekly_meal_plan.slot`, which already exists and means
something else.** Slot is where a meal sits in one week; meal_type is what
the recipe inherently *is*. Porridge is a breakfast whether or not it is
planned for Tuesday, and eating it at 9pm does not reclassify it. Conflating
them would mean planning a meal for dinner silently rewrote the recipe.

**Nullable on purpose**: "not said yet" is a real state and every existing
recipe is in it. Defaulting to `dinner` would invent an answer, and a
half-filled classification filters worse than none.

`drink` is a valid meal_type but is **not** added to
`weekly_meal_plan.slot`. Widening that CHECK is a separate decision with its
own consequences for the planner grid.

### Deliberately NOT added: a chore cadence column

Daily / weekly / monthly / seasonal is already fully determined by
`chore_tasks.recurrence_rule` — FREQ plus INTERVAL. Storing it as well
creates two sources for one fact that can silently disagree the moment a
rule is edited. It is derived in `js/lib/rrule.js`, where the rule is
already parsed. **Seasonal means MONTHLY with an interval of three or more.**

---

## 0b. Revision 4 — units on recipe ingredients (21 Aug 2026)

Revision 3 gave the pantry and shopping list units and stopped there.
Recipes were left grams-only, which is not how anyone cooks: "200 g of milk"
is wrong, and `item` is just as common — 2 eggs, 1 onion, 3 rashers. The
ingredient form could not express most real recipes.

**And the consequence had to be solved in the same breath.** Nutrition is
stored per 100 **grams**. The moment an ingredient is in ml or items, the
macro maths has nothing to work from.

Three additions, all purely additive:

1. `meal_ingredients.unit` — `g`/`ml`/`item`, default `g`.
2. `foods.grams_per_ml` — nullable. Milk ~1.03, oil ~0.92, water 1.0.
3. `foods.grams_per_item` — nullable. One egg ~60 g, one onion ~150 g.

**A missing conversion factor makes the ingredient INCOMPLETE, never
guessed.** This reuses the existing "N of M ingredients have no nutrition
data" machinery rather than inventing a second failure mode. Nothing is
assumed: 1 ml of water is 1 g, oil is about 0.9, flour is neither, and a
plausible-looking wrong total is worse than an admitted gap.

The same factors let Phase 7's shortfall compare a pantry stocked in `ml`
against a recipe in `g` — again, only where the factor is known.

**`quantity_g` is deliberately NOT renamed**, even though the name becomes
historical once it can hold ml. A rename would break any client still
running cached JavaScript from before the deploy, and this app is
offline-first with an aggressive precache. **Additive-only is the property
that has made every migration here safe**, and it is worth more than a tidy
column name. Recorded as debt.

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

### chore_task_completions
| Column | Type | Notes |
|---|---|---|
| task_id | uuid | not null; references chore_tasks(id) **on delete cascade** |
| occurrence_date | date | not null |
| completed_at | timestamptz | not null; default now() |

**`unique (task_id, occurrence_date)`** — one row per occurrence actually
done. Re-ticking is harmless rather than duplicated. Added in revision 5.

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
| grams_per_ml | numeric | nullable; `> 0`. How many grams one millilitre weighs (milk ~1.03, oil ~0.92). **Null means ml cannot be converted** — the ingredient is reported incomplete, never guessed |
| grams_per_item | numeric | nullable; `> 0`. How many grams one item weighs (egg ~60, onion ~150). Same rule when null |
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
| is_favourite | boolean | not null; default false (revision 5) |
| meal_type | text | nullable; check in ('breakfast','lunch','dinner','snack','drink') (revision 5) — what the recipe IS, not where it is planned |

### meal_ingredients

**`quantity_g` is a historical name.** Since revision 4 it holds a quantity
in whatever `unit` says — grams, millilitres or items. It was not renamed
because a rename breaks clients running cached JavaScript, and additive-only
migrations are what have kept this app safe. Read `unit` before using it.

| Column | Type | Notes |
|---|---|---|
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
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
| shelf_life_days | int | the ESTIMATE — how long it usually keeps once bought. Used only when `use_by` is null |
| use_by | date | nullable (revision 7). The FACT, read off the label. Never backfilled from restocked + shelf life |
| current_qty | numeric | **nullable — NULL means "amount not recorded"**, which is distinct from 0 ("you have none"). Interpret with `unit` |
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
| kind | text | not null; default 'pack'; check in ('pack','do') (revision 6) — packing list vs things to do there |

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
