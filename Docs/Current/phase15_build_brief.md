# Home-OS: Phase 15 Build Brief — Recipe Method Steps
01 Sep 2026 v1

**Schema revision 10.** New table. Read `RECIPE_STEP_STYLE.md` before
writing a single step of content — it is canonical and this phase implements
it.

## Why a table and not a text column

A blob of instructions cannot be ticked off, cannot hold a timer, and cannot
keep your place when the screen locks. The whole point of the requirement —
clear, small, followable steps — needs each step to be a thing the app knows
about individually.

## Revision 10

```sql
create table meal_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete cascade,
  step_number int not null,
  instruction text not null,
  note text,
  duration_min int,
  step_group text,
  while_waiting boolean not null default false
);

alter table meals add column method_note text;
```

Plus RLS (`owner access only`), the `set_updated_at` trigger, and an index
on `(meal_id, step_number)`. **19 tables, 19 policies, 19 triggers** after
this. Update the counts at the top of `schema.md`.

`on delete cascade` — steps are part of the meal, matching
`meal_ingredients` (schema.md §2).

`step_number` is not unique-constrained. Reordering a list under a unique
constraint means either a temporary gap or a deferred constraint, and the
app renumbers contiguously on every save anyway. Enforce in code, not in the
database.

## Ingredient substitution in steps

Rule 3 of the style guide says every step restates its quantity. Doing that
by hand breaks the moment you scale a recipe from 4 servings to 6.

So `instruction` may contain `{{ing:<food-slug>}}`. At render time it
resolves against that meal's `meal_ingredients`, formats through
`lib/units.js` (Phase 12), and scales by the serving override. Written once,
correct at every serving size.

An unresolvable token renders as the plain food name with no quantity, and
the meal is flagged in the edit view. It **never** renders as raw braces.

## Cook mode

The thing this phase exists for.

- Full-screen from the meal card, one step at a time, large type.
- Step number and total always visible ("Step 4 of 11").
- Tick to advance. Back is always available.
- `duration_min` renders a timer button using the existing timer facility.
- `while_waiting` steps show alongside the running timer rather than after.
- `note` is present but visually secondary, never inside the instruction.
- `step_group` shows as a quiet heading when it changes.
- **Progress persists.** Write `{ mealId, stepIndex, startedAt }` to the
  offline store on every advance. Restore on load if `startedAt` is within
  6 hours. A screen lock, a phone call or a reload must not lose your place.
- Wake lock via `navigator.wakeLock` where available, released on exit.
  Feature-detect; no polyfill.

## Editing

A simple ordered editor: add, edit, delete with confirm, reorder by
up/down buttons. **Not drag and drop** — drag reordering is poor with a
screen reader and awkward with wet hands, and this is a kitchen.

A live style check as you type, advisory only, never blocking:
over 20 words; contains " and " joining two verbs; contains "meanwhile";
contains "simply", "just", "obviously", "quickly", "easy". Each shows the
rule number from the style guide.

## A11y

Cook mode is the highest-risk screen in the app for this. Requirements:
step changes announce through the live region; the tick control is a real
button with an accessible name including the step number; the timer's
remaining time is available as text, not only as a visual countdown; nothing
depends on colour alone; target sizes meet 2.5.8 comfortably given the
hands-in-use context.

## Tests

Behaviour: steps ordered by `step_number`; renumbering after a delete is
contiguous; `{{ing:}}` resolves and scales with `serves_override`;
unresolvable token degrades to the name; progress restores within 6 hours
and is discarded after; deleting a meal cascades its steps.

Schema gate: 19/19/19, `meal_steps` RLS present.

Render gate: cook mode at first step, a middle step with a timer, a
`while_waiting` step, and the step editor.

A11y gate: cook mode heading order and live region announcements.

## Done when

You can cook Puttanesca from your phone on the counter, one instruction at a
time, and answering the door does not lose your place.
