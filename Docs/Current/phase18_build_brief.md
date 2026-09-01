# Home-OS: Phase 18 Build Brief — Household Foundation
01 Sep 2026 v1

**Schema revision 8. The largest single change since Phase 1.** Runs second,
immediately after Phase 11, and before any new table or seeded content.

## The decision this implements

Home-OS is becoming a product with families in it. A family shares a pantry,
a shopping list and a meal plan, and does **not** share a weight log.

The current model is `user_id` with `auth.uid() = user_id` on all 18 tables.
That is correct for one person and wrong for a household: two accounts
cannot see one cupboard.

The trap is deferring this. Retrofitting a household after 300 seeded
recipes, per-member data and live users means migrating all of it under
load. Now it is a day's careful work against your data alone.

## The model

Two scopes, and every table belongs to exactly one:

**Household-scoped** — shared by everyone in the house:
`foods`, `pantry_stock`, `shopping_list_items`, `meals`, `meal_ingredients`,
`weekly_meal_plan`, `chore_projects`, `chore_tasks`, `calendar_events`,
`holidays`, `holiday_checklist_items`, `holiday_purchase_items`.

**Person-scoped** — yours alone, even inside a household:
`weight_logs`, `water_logs`, `exercises`, `exercise_logs`, `user_settings`.

Weight is the clearest case. A shared cupboard is a feature; a shared weight
log is a betrayal of the no-shame principle. Rehab exercises are personal
medical information and stay personal.

## Revision 8

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null default 'My household'
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'adult'
    check (role in ('owner','adult','child')),
  unique (household_id, user_id)
);
```

`household_members.user_id` is **nullable** on purpose. A child who eats the
meals and has portions planned for them does not need a login. A member
without an account is a real member; they simply cannot sign in.

Then, on all 18 existing tables:

```sql
alter table <t> add column household_id uuid references households(id);
```

Backfill from a household created for the existing owner, then
`set not null`, then `set default` — see the migration file for the exact
ordered script. `user_id` **stays on every table**: on person-scoped tables
it is the access key, and on household-scoped tables it becomes provenance
("who added this"), which is worth having in a shared house.

## RLS — all 18 policies rewritten

A helper, marked `stable` so the planner does not re-run it per row:

```sql
create or replace function my_household_ids()
returns setof uuid language sql stable security definer as $$
  select household_id from household_members where user_id = auth.uid()
$$;
```

Household-scoped tables:
```sql
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()))
```

Person-scoped tables keep `auth.uid() = user_id`, unchanged.

Add an index on `household_id` for every household-scoped table, and on
`household_members(user_id)`. Without them every read does a sequential
scan through the subquery.

**`with check` is never `true`.** Standing rule, no exceptions here.

## Signup

Every new account gets a household of one, created atomically: `households`
row, then `household_members` row with `role = 'owner'` and `display_name`
from the email local part. Handle this in a trigger on `auth.users` insert,
not in client code — a client that fails halfway leaves an account that can
see nothing and cannot recover.

A second member joins by invite: the owner generates a code, the invitee
redeems it, one `household_members` row. Keep the invite table out of this
phase; a manual insert is enough until Phase 21.

## App changes

- `js/data/household.js` — new module. Current household, member list,
  `{ ok, data | error }` like everything else. Cached in module scope,
  invalidated on sign-out.
- **Inserts do not pass `household_id`.** Add a column default the same way
  `user_id` has one, sourced from the member row, so the existing
  "RLS supplies it" convention holds and no data module changes shape.
- `views/settings.js` — household name, member list, add/remove member with
  confirm. Removing a member does not delete shared data they created.
- Sign-in flow needs no change. Auth is unchanged; only visibility moves.

## Testing this properly

**The Supabase SQL editor bypasses RLS and `auth.uid()` is null there.** It
proves structure only. Household isolation must be proven from two real
signed-in accounts:

1. Account A creates a food. Account B in a different household cannot see
   it. This is the test that matters and it cannot be faked from the editor.
2. Account B joins A's household. B now sees the food.
3. B logs a weight. A cannot see it.
4. B leaves. B loses the food, A keeps it, and B's weight log survives.

Schema gate: 20 tables, 20 policies, 20 triggers; `household_id` not null on
all 18; every household-scoped table indexed on it.

Behaviour gate: inserts omit `household_id` and it lands correctly;
`my_household_ids()` returns empty for a user with no membership and that
denies rather than errors.

## Risk

This touches every table and every policy at once. Run it as a single
ordered migration file with a verification query returning one row and one
verdict, per the mobile SQL-editor constraint. **Confirm the project is
"Home OS" before running anything.** No outer BEGIN/COMMIT wrapper.

Take a backup first. This is the one phase where that sentence is not
boilerplate.

## Done when

Two accounts share a cupboard, a shopping list and a meal plan, and neither
can see the other's weight.
