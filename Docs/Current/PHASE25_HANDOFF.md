# Home-OS: Phase 25 Handoff — The Whole Home
01 Sep 2026 v1

**Schema revision 17.** One nullable column. Run before pulling.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/staples.js` | v1 (new) | Reorder points, intervals, starter list |
| `data/food_reference.json` | **v2** | 210 → **241** entries |
| `js/data/pantry.js` | v5 | Carries `reorder_at` |
| `js/data/listSync.js` | v2 | Running-low items join the list |
| `js/views/pantry.js` | v11 | "Remind me at" control |
| `js/views/shopping.js` | v8 | Starter staples on an empty list |
| `service-worker.js` | v63 | One new path |

## What already worked, and what did not

Non-food has worked since **Phase 6**. `drink`, `household`, `personal`,
`home` and `pet` are all valid categories, the shopping list is not filtered
to edible, and `usual` has always been a valid source. Shampoo, kitchen
spray and guinea pig hay could always go on the list.

What was missing was a **reason for them to appear.** Food reaches the list
because a meal plan needs it. Nothing plans your shampoo, so it only ever
appeared if you remembered — precisely what this product exists not to
require.

That is the whole phase.

## Decisions worth knowing

**Null means never remind, and null is the default.** Opt-in, always. An app
that decides on its own that you need shampoo is an app that adds noise, and
noise is how a useful prompt gets ignored.

**Zero is a real threshold**, meaning "tell me when it runs out", and must
never be collapsed into null by a falsy check. Both the data module and the
tests check `=== null` and `=== ''` explicitly.

**An unrecorded amount never triggers a reminder** — the same rule as Phase
14. Not knowing is not evidence of running low.

**Running-low items are written as `usual`, not `meal_plan`**, so the next
rebuild does not sweep them away again.

**Added once.** Anything already on the list as `needed` is skipped, because
something sitting at zero would otherwise be re-added on every rebuild, and
a list that grows on its own is one you stop trusting.

**The quantity is not guessed.** You said "remind me at 1"; how many you
want is your business, and an invented number on a shopping list gets
trusted standing in an aisle.

**The starter list is offered, never automatic.** Sixteen things nearly
every household buys, on an empty list only, and everything is removable.

## Predicted intervals: deliberately dull

*"You usually buy this about every 3 weeks. Last bought 24 days ago."*

No machine learning, no confidence score. An average interval and a plain
sentence. **Nothing is claimed below three restocks** — a prediction from
one or two data points is a fabrication, and there are tests for both.

Tidy intervals read in weeks; untidy ones read in days rather than a
fraction of a week.

## The reference file grew

210 → **241 entries**: tea, coffee, squash, fizzy drinks, juice, beer, wine;
laundry detergent, surface cleaner, bleach, foil, cling film; deodorant,
razors, sun cream, plasters; cat and dog food.

**One alias collision, resolved the same way as "pepper".** "Squash" matched
both the vegetable and the drink. Removed from both rather than guessed;
butternut keeps `butternut`, the drink keeps `cordial`. The library gate
asserts no alias points at two foods, so this could not have shipped.

## Tests

All eight gates. Behaviour 374 → **392**. New: every reorder branch
including the two that would be catastrophic if wrong (null triggering
everything, zero being treated as an opt-out); interval predictions refusing
to speak below three data points; duplicate restock dates not distorting an
average; the starter list being household-first rather than a food list.

## Not yet done

- **No UI for the "you usually buy this" line.** `describeUsualInterval` is
  written and tested but nothing renders it: `pantry_stock` keeps only the
  latest `last_restocked`, not a history, so there is nothing to compute
  from yet. It needs a restock log — a schema question, not an afternoon.
- **No bulk way to set reminder levels.** One item at a time through the
  pantry sheet. Fine for a dozen staples, tedious for fifty.

## Next

Phase 10 (notifications, still unbriefed) or Phase 21 (productisation).
The library is still ten recipes.
