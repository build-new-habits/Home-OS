# Home-OS: Phase 22 Build Brief — The List Is Never Wrong
01 Sep 2026 v1

**No schema change.** Highest-leverage change available.

## The problem

Putting a meal in the plan does not touch the shopping list. You have to go
to Shopping and press "Rebuild from my plan". A list that silently
disagrees with your plan is exactly the failure this app exists to prevent,
and for a user with executive-function differences a hidden manual step on
another screen is the same as no feature at all.

## 1. Automatic recompute

`computeShortfall()` + `replaceGeneratedItems()` already work and already
replace rather than append, which is correct — removing a meal must remove
what it needed.

**Trigger it automatically**, debounced:

- 2.5 seconds after the last meal-plan change, or immediately on leaving the
  meal plan view, whichever comes first.
- Coalesce: a burst of edits while laying out a week produces ONE recompute,
  not seven. Cancel any in-flight timer on each change.
- Offline: skip and mark the list stale rather than writing a wrong list.

**Say what happened, on the plan screen**, in the existing live region:
*"Shopping list updated — 6 things to buy."* Never silent. A list that
changes under you without saying so is worse than one you rebuild by hand.

Keep the manual button. It becomes "Rebuild now" for when you want certainty.

**Never clobber hand-edits.** `replaceGeneratedItems` only touches
`source = 'meal_plan'`. Anything you added yourself (`usual`) or a holiday
added survives untouched. Verify this holds under the new trigger.

## 2. Aisle grouping

The list is currently flat. Group it by where things are in a shop, using
`foods.category`, in walk-round order:

Fresh → Bakery → Frozen → Cupboard → Drinks → Household → Personal care →
Home → Pet → Other

Categories with no items are not rendered. This is a display-only change and
must not alter `source` or status semantics.

Grouping is the single cheapest thing in this brief and probably the most
noticed: it turns a list you scan repeatedly into one you walk once.

## 3. Undo

Currently: confirm dialogs, no way back. Confirms interrupt; undo does not,
and undo is the more accessible pattern — it does not require you to predict
your own mistake before making it.

Add a 10-second undo to the toast for: removing a list item, ticking bought
(which now also writes pantry stock), deleting a step, removing a member.

Implementation: keep the deleted row in memory and re-insert on undo. Do not
build a general undo stack; four call sites, four explicit handlers.

Where undo exists, **drop the confirm**. Two safety nets is a tax.

## 4. Depletion on cook

When you finish Cook Mode, offer once: *"Take these ingredients out of the
pantry?"* One tap decrements `pantry_stock` by the recipe amounts.

This is the "zero-upkeep inventory" point from the competitive analysis and
it is what stops the pantry drifting away from reality after a fortnight.

**Offer, never automatic.** You may have used the bag from the shop rather
than the one in the cupboard, and a pantry that silently empties itself is
worse than one that lags.

Skipped or dismissed is fine and is never mentioned again.

## Tests

Behaviour: debounce coalesces N changes into one recompute; offline skips
and marks stale; hand-added items survive a recompute; aisle order is
stable and empty groups are omitted; undo restores an exact row; depletion
decrements by the right amount and is a no-op when declined.

## Done when

You plan a week, walk to the kitchen, and the list is already right and
already in the order you walk the shop.
