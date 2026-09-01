# Home-OS: Phase 18 Handoff — Household Foundation
01 Sep 2026 v1

**Shipped. Migration run and verified on live DB. All seven gates pass.**

Verdict returned: `PASS — 20 tables, 20 policies, 13 shared, 5 personal, no
orphans`. Project confirmed as "Home OS".

## Schema revision 8

**20 tables, 20 RLS policies, 20 update triggers.** Two access patterns
where there was one.

**Household-scoped (13)** — `household_id in (select my_household_ids())`:
`foods`, `pantry_stock`, `shopping_list_items`, `meals`, `meal_ingredients`,
`weekly_meal_plan`, `chore_projects`, `chore_tasks`,
`chore_task_completions`, `calendar_events`, `holidays`,
`holiday_checklist_items`, `holiday_purchase_items`.

**Person-scoped (5)** — unchanged, `auth.uid() = user_id`:
`weight_logs`, `water_logs`, `exercises`, `exercise_logs`, `user_settings`.

`user_id` stays on all 18. On the personal five it is the access key; on the
shared thirteen it is provenance.

Migration: `migrations/008_household_foundation.sql`.
Verification: `008_household_foundation_VERIFY.sql`.

## Code shipped

| Path | Version | What |
|---|---|---|
| `js/data/household.js` | v1 (new) | Household, members, servings maths |
| `js/views/settings.js` | v7 | The Household section |
| `js/data/settings.js` | v5 | Clears the household cache on sign-out |
| `css/components.css` | v26 | Member list and form |
| `service-worker.js` | v46 | One new path, `CACHE_NAME` v46 |

## Decisions worth knowing

**Inserts still pass no `household_id`.** The column carries
`default my_household_id()`, mirroring `default auth.uid()`. The standing
rule is unchanged and **no existing data module changed shape**.

**One exception, documented in schema.md §3:** `household_members` passes
`household_id` explicitly, because that row *defines* membership rather
than depending on it. A default there would be circular.

**`my_household_ids()` is SECURITY DEFINER.** `household_members` carries a
policy written in terms of the function; without definer rights the policy
consults the function which consults the policy, and Postgres raises
infinite recursion. `search_path` is pinned, since a definer function with a
mutable search path is a privilege-escalation hole. `STABLE` so the planner
evaluates once per statement, not once per row.

**Signup creates the household in a trigger on `auth.users`.** Client code
failing halfway would leave an account belonging to no household — and no
household means the function returns empty, which denies everything. The
account would be alive and unable to see a single row.

**The household cache is cleared before sign-out, not after.** It is
module-scoped and survives a sign-out, so on a shared device the next person
in would briefly see the previous household's name and members.

**Removing a member deletes nothing shared.** The rows they created belong
to the household. A person leaving must not empty the cupboard. The confirm
says what is *not* lost as well as what is.

**The last owner cannot be removed.** A household nobody can administer has
no in-app recovery.

**Settings states what is shared, above the Add button.** Adding someone
changes what another human can see about you. Leaving that implicit would be
a privacy decision made by omission.

**Servings round UP to the nearest half, floored at 1.** Cooking slightly
too much is a leftover; cooking slightly too little is someone going
without. A null `portion_factor` counts as a full adult — a null must never
silently shrink the shop.

## Tests

Behaviour 221 → **232**. New: servings across mixed households, upward
rounding, null portion safety, lone child floors at 1, empty set cooks for
one, member descriptions naming sign-in status and non-default portions,
default portion deliberately *not* mentioned, role enum order.

All seven gates green.

**The schema gate caught a real defect during this phase.** The two new
tables were described in the revision notes but not added to §3 as column
tables, so eight column references in `household.js` were unverifiable. That
is exactly the class of drift the gate exists for.

## Not yet done

- **No invite flow.** A second *account* joining a household still needs a
  manual `household_members` row. Members without sign-ins can be added from
  Settings today, and that is the case that matters for meal planning.
  Invites belong in Phase 21.
- **Nothing consumes `portion_factor` yet.** The column and the maths exist
  and are tested; the meal plan and shortfall diff wire into them in
  Phase 20.
- **Isolation is unproven.** Structure is verified; RLS is bypassed in the
  SQL editor, where `auth.uid()` is null. Two real accounts are needed:
  A creates a food, B in another household cannot see it, B joins and can,
  B logs a weight and **A cannot see it**, B leaves and keeps the weight
  log while losing the food. Worth doing before Phase 12.

## Next

Phase 12 — pack sizes and household measures. `foods.item_label` so the
pantry reads "4 tins (1.6 kg)" rather than "4 item", plus tsp/tbsp as
display units for ml. Note the correction in that brief: `js/lib/units.js`
already exists and is extended, not created.
