# Home-OS: Phase 19 Handoff — Ingredient Options and Swaps
01 Sep 2026 v1

**Schema revision 12.** Three columns on `meal_ingredients`. Run the
migration before pulling the app.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/meals.js` | v6 | Grouping, selection, alternatives, filtering |
| `js/views/meals.js` | v17 | Collapsed group row with a picker |
| `js/lib/shortfall.js` | v2 | Only chosen options reach the shop |
| `css/components.css` | v29 | Option row and select |
| `service-worker.js` | v51 | Bumped, no new paths |

## The one mechanism

"Build your own lunch" and "swap the tuna for hummus" are the same feature:
a named slot with alternatives, one chosen. A build-your-own is a swap whose
alternatives were written down in advance. Built once.

`option_group = null` means an ordinary required ingredient, which is what
every existing row defaults to. **Nothing changes until a group exists.**

## Decisions worth knowing

**No unique constraint on the selection.** A partial unique index on
`(meal_id, option_group) where is_selected` is the obvious move and it is
wrong: swapping becomes two statements with a window between them where the
recipe has no base at all. Under a constraint that window is a failed write;
without one it is a moment nobody sees. `selectOption()` clears siblings
first, then sets.

**An unselected option is not incomplete data.** It contributes nothing to
the totals AND is not counted as a gap. Those two ideas have to stay apart,
or the "N ingredients have no nutrition data" line fills with noise until
people stop reading it. Tested explicitly.

**A group renders as ONE row.** Five radio buttons per slot turns a
six-ingredient lunch into a wall of thirty and buries the ingredients that
are not choices. The picker is a `select` — a constrained control for a
constrained set — showing each option's kcal per 100 g so the choice is
informed rather than a name-only guess.

**A group with nothing selected falls back to its first option.** Deleting
the chosen row must not leave the recipe with no base at all.

**Only chosen options reach the shopping list.** Otherwise planning one
build-your-own lunch adds five things to your shop, four of which you
decided against.

## Tests

Behaviour 291 → **303**. New: grouping collapses correctly; a plain
ingredient stays plain; the orphaned-selection fallback; `option_label`
precedence; the shopping filter; and the one that matters — an unchosen
option with no nutrition data is **not** counted as incomplete.

The schema gate caught a documentation error: I had added the new columns
under a heading reading `### meal_ingredients (revision 12 additions)`,
which the gate correctly read as a different table. Moved into the canonical
section.

## Not yet done

- **`addAlternative()` is written and unwired.** The "Add an alternative"
  action on an ingredient row is not in the UI yet, so groups currently have
  to be created by hand or will arrive with Phase 16's seed data. The
  function exists, is documented, and promotes an existing row into a group
  without changing its selection.
- **`option_label` has no editor.** The column is read everywhere and can
  only be set by seed data or SQL.

## Next

Phase 20 (who's eating what), then 14, then 16.
