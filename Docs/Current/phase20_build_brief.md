# Home-OS: Phase 20 Build Brief — Per-Member Portions and Targets
01 Sep 2026 v1

**Schema revision 13.** Depends on Phase 18 (households) and Phase 19
(options).

## The question this answers

> What would a family plan look like for different members?

Three real differences between people in one house, and they are separable:

1. **They eat different amounts.** A nine-year-old is not an adult portion.
2. **They eat different things.** One is vegetarian; one will not touch fish.
3. **They have different targets.** Yours is a weight goal; a child's is not
   a target at all, and should never be shown as one.

The third is where this could go wrong, so it is constrained deliberately.

## Revision 13

```sql
alter table household_members add column portion_factor numeric not null default 1.0
  check (portion_factor > 0 and portion_factor <= 3);
alter table household_members add column dietary_tags text[] not null default '{}';
alter table household_members add column macro_targets jsonb;

alter table weekly_meal_plan add column member_ids uuid[] not null default '{}';
```

`portion_factor` — 1.0 adult, around 0.6 for a younger child. One number,
not a per-meal override. Per-meal portions are a level of fiddliness nobody
sustains.

`member_ids` empty means **everybody**, which is the common case and keeps
the existing planning flow at zero extra taps. Naming members is the
exception, for the Tuesday one of you is out.

`macro_targets` nullable jsonb: `{ "calories": 2000, "protein_g": 120 }`.
Null means no targets, and null is the default. **Never auto-calculated from
weight, height or age.** Handing someone a number the app invented for them
is the opposite of this project.

`role = 'child'` members: targets are not offered in the UI at all. Not
greyed out, not empty — absent. Behavioural principle 1 says missed logs are
facts and never failures; the same logic says a child should not meet a
calorie budget with their name on it.

## Serving maths

Servings needed for a planned meal become:

```
sum(portion_factor) over the members it is planned for
```

Rounded up to the nearest 0.5 and floored at 1. Two adults and one child at
0.6 is 2.6, cooked as 3. `serves_override` still wins outright when set —
it is the manual escape hatch and this must not quietly overrule it.

That number then drives the Phase 7 shortfall diff, so the shopping list
scales to who is actually eating. That is the payoff.

## Dietary filtering

`household_members.dietary_tags` against `meals.dietary_tags` (Phase 16).
Planning a meal for someone whose tags conflict shows an inline note —
*"Contains fish. Sam does not eat fish."* — and **does not block**. It is
your kitchen; maybe Sam is having something else. Stating the fact and
letting you decide is the pattern used everywhere else in the app.

The library browser gains a filter: "suitable for everyone", computed as the
intersection of household members' tags.

## What is shown, and to whom

- The dashboard shows **your** targets and **your** logs only. A household
  view of everyone's intake is not being built and is not a gap.
- The meal plan shows who each meal is for, when it is not everyone.
- Macro figures on a recipe card show per serving, and additionally "your
  portion" when your `portion_factor` is not 1.0.

## Tests

Behaviour: empty `member_ids` means all members; portion sum rounds up to
0.5 and floors at 1; `serves_override` beats the computed figure; shortfall
scales with membership; a `child` role never returns targets; conflicting
dietary tags produce a note and still allow the write; removing a member
from the household removes them from future plans but leaves past ones
intact as a record of what happened.

Schema gate: `portion_factor` CHECK rejects 0 and 4; `member_ids` defaults
to empty array not null.

Render gate: meal plan cell for a subset of members; a recipe card showing
"your portion"; the member editor for an adult and for a child.

## Done when

Planning Tuesday's dinner for two adults and one child puts the right
quantities on the shopping list, and nobody under sixteen is shown a
calorie target.
