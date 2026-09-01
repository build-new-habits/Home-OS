# Home-OS: Phase 19 Build Brief — Ingredient Options and Swaps
01 Sep 2026 v1

**Schema revision 12.** Depends on Phase 15 (steps) and Phase 13 (reference
data). Runs before Phase 16, because "Build your own lunch" is a library
recipe and the library cannot ship it without this.

## Two asks, one mechanism

> A selector option in the "build your own lunch" recipe. Or swap out one
> ingredient for another. Then the macros adapt to fit.

A build-your-own recipe is a swap where the alternatives were written down
in advance. A swap is a build-your-own with one option that you added a
second one to. Same feature. Build it once.

## Revision 12

```sql
alter table meal_ingredients add column option_group text;
alter table meal_ingredients add column is_selected boolean not null default true;
alter table meal_ingredients add column option_label text;
```

- `option_group` null → an ordinary required ingredient. Unchanged
  behaviour for every row that exists today, which is the point of doing it
  this way.
- `option_group` set → this row is one alternative within a named slot
  ("Base", "Protein", "Something crunchy").
- Exactly one row per group per meal has `is_selected = true`. **Enforced in
  application code, not by a constraint** — a partial unique index would
  make swapping a two-statement dance with a window where the recipe has no
  base at all.
- `option_label` overrides the food name for display where the food name is
  too literal: food "Cottage cheese, plain" shows as "Cottage cheese".

## Behaviour

**Macros count selected rows only.** `computeMacros()` filters
`is_selected` before anything else. Unselected alternatives contribute
nothing and are **not** counted as incomplete — they are not missing data,
they are roads not taken. Keep those two ideas apart or the incomplete
count becomes noise and people stop reading it.

**Swapping recomputes immediately**, in place, no save step. The macro table
updates under the selector. Watching protein move when you pick tuna over
hummus is the whole feature.

**The shortfall diff follows the selection.** Only the selected option
reaches the shopping list. Otherwise planning one lunch adds five things to
your list.

**Adding an alternative to an existing ingredient** is one action on the
ingredient row: "Add an alternative". It creates the group if there isn't
one, moves the existing row into it as selected, and adds the new one
unselected. No mode, no separate screen.

**Step substitution.** `{{ing:slug}}` from Phase 15 resolves against the
selected row. So "Spread the {{ing:protein}} on the {{ing:base}}" reads
correctly whichever way you built it. An option group needs a stable token,
so `{{opt:protein}}` resolves to whichever row in group "protein" is
selected. Add this to the Phase 15 resolver; do not fork it.

## UI

A group renders as one row with the selected option named and a control to
change it. Not five rows with radio buttons — that turns a six-ingredient
lunch into a wall of thirty.

The picker is a `select` or a sheet with radios, labelled by the group name,
showing each option's calorie figure alongside so the choice is informed.
Constrained control for a constrained set, per the standing rule.

Cook mode shows only selected ingredients. Nobody standing at the counter
needs the alternatives.

## Library shape

A seed recipe declares groups directly:

```json
"ingredients": [
  { "group": "Base", "options": [
      { "ref": "bagel-plain", "quantity": 1, "unit": "item", "default": true },
      { "ref": "pitta-wholemeal", "quantity": 1, "unit": "item" },
      { "ref": "wrap-tortilla", "quantity": 1, "unit": "item" }
  ]},
  { "ref": "cottage-cheese", "quantity": 100, "unit": "g" }
]
```

One option per group carries `default: true`. The Phase 16 JSON gate rejects
a group with no default or more than one.

## Tests

Behaviour: unselected rows excluded from macros; unselected rows not counted
incomplete; swapping changes totals and writes exactly one row to selected;
shortfall diff includes only selected; `{{opt:}}` resolves to the selected
row; adding an alternative to a plain ingredient preserves its selection;
a group whose selected row is deleted promotes the next option rather than
leaving the meal with no base.

Render gate: a collapsed group row, the option picker open, and cook mode
with a group present.

## Done when

You can build a lunch from a bagel or a pitta, swap the tuna for hummus,
and watch the protein figure move as you do it.
