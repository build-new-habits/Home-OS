# Home-OS: Phase 14 Handoff — Cook From What You Have
01 Sep 2026 v1

**No schema change.** Nothing to run — pull and it works.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/pantryMatch.js` | v1 (new) | Classify, score, rank, word it |
| `js/views/meals.js` | v18 | Search field and three bands |
| `css/components.css` | v31 | Bands and rows |
| `service-worker.js` | v53 | One new path |

## What it does

Above the recipe list: a search field and three bands, ranked by how little
you would have to buy.

- **Ready now** — nothing missing, nothing short
- **Nearly there** — one or two gaps, named
- **Needs a shop** — three or more, collapsed by default

Type "salmon" and it narrows to recipes using it. Each row with gaps has
one action: add exactly the shortfall to the shopping list.

## Decisions worth knowing

**UNKNOWN never demotes a meal.** `current_qty` null means "amount not
recorded" (schema.md), which is a different and truer thing than zero. You
not having written down how much rice is in the jar is not evidence that
there is none, and treating it as a failure is the framing this app rejects.
So an unrecorded ingredient still lands in Ready now, with a quiet
footnote: *"Assumes you have rice — amount not recorded."*

**That footnote is worded as an assumption the app is making**, never as
something you failed to do. There is a test asserting the string contains
no "you have not" / "missing" phrasing. The difference between "assumes you
have rice" and "you have not recorded your rice" is the whole principle in
one sentence.

**Units that cannot be reconciled are UNKNOWN, not MISSING.** Same reason:
the app not being able to compare is not evidence of an empty cupboard.

**A meal with no ingredients is not scored at all.** It is not "ready now" —
nobody said what it takes. Silently ranking it top would be the most
confident possible statement about the least information.

**An unchosen Phase 19 option is not a gap.** An alternative you decided
against is not a reason to say you cannot cook something.

**`scoreMeals()` is pure.** It takes already-fetched data and returns a
ranked list, no queries and no awaits. That is what makes it testable
against hand-worked examples, and it keeps the caller honest about fetching
in one query rather than one per meal — which matters before the 300-recipe
library lands.

## Tests

Behaviour 322 → **341**. New: all four classification states including both
routes to UNKNOWN; cross-unit comparison via `grams_per_item`; band
thresholds; unknown not demoting; unscored empty meals; unchosen options
ignored; the assumption wording asserted positively *and* negatively; filter
minimum length.

The render gate caught a duplicate `listStock` import and a `stock`
variable that would have shadowed a local one in another function. Renamed
to `pantryStock` with the reason in a comment.

## Not yet done

- **No dashboard tile.** The Phase 9 review flagged tile clutter, and this
  earns its place on the Meals screen where you are already thinking about
  food. Worth revisiting once it has been used for a week.
- **Shortfall quantities are approximate for cross-unit cases.**
  `gapsToShoppingItems` writes grams; where the pantry and recipe units
  differed, the number is the converted difference. Correct, but it will
  read as grams on a list where you might expect tins.

## Next

Phase 16 — the recipe library, batches 1 to 8.
