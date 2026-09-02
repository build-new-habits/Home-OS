# Home-OS: Phase 25 Build Brief — The Whole Home
01 Sep 2026 v1

**No schema change.** Most of this already exists and is unreachable.

## What already works

`foods` has covered non-food since Phase 6. The nine categories include
`drink`, `household`, `personal`, `home` and `pet`. The shopping list is
**not** filtered to edible, and `shopping_list_items.source = 'usual'`
exists for staples you always buy.

`data/food_reference.json` already ships toilet roll, kitchen roll, bin
bags, washing up liquid, light bulbs, AA batteries, shampoo, toothpaste,
shower gel, guinea pig hay and guinea pig nuggets — each with an
`item_label` and no calories.

**So deodorant, kitchen spray and hay can all go on the list today.** The
model was right from Phase 6.

## What is actually missing

**Nothing ever reminds you.** Food reaches the list because a meal plan
needs it. Nothing plans your shampoo. So non-food only appears if you
remember, which is precisely the thing this product exists not to require.

That is the whole phase: **a reason for non-food to appear.**

## 1. Running low

`pantry_stock` already has `current_qty` and `last_restocked`. Add a
per-food, opt-in **reorder point**: "tell me when I am down to 1".

When stock falls to or below it, the item appears on the shopping list with
`source = 'usual'`, once, and does not come back until restocked.

Stored where? `pantry_stock` has no column for it. Rather than a migration,
Phase 25 uses the existing `shopping_list_items` + `usual` source and a
per-food flag held in... **this needs one column.** Revise: add
`pantry_stock.reorder_at numeric` in a small revision 15. Honest correction
to "no schema change" — it is one nullable numeric.

**Null means never remind.** Opt-in, always. An app that decides on its own
that you need shampoo is an app that adds noise.

## 2. Predicted staples

For anything with a history of restocking, offer — never assert — a line on
the shopping list: *"You usually buy toilet roll about every 3 weeks. Last
bought 24 days ago."*

Computed from `last_restocked` history. No machine learning, no confidence
scores: an average interval and a plain sentence. If there is not enough
history, say nothing at all rather than guessing from one data point.

## 3. Aisle grouping covers it

Phase 22's grouping already puts Household, Personal care, Home and Pet at
the end, in walk-round order. Nothing more needed.

## 4. Drinks

`drink` is a category and is already on the list. The gap is the reference
file: it has water, milks, juice and stock, and almost no actual drinks.
Add squash, fizzy drinks, tea, coffee, beer, wine — with `item_label` and
macros where meaningful.

## 5. A starter list

First run offers a one-tap **"Add my usual staples"**: about 25 things
nearly every household buys — toilet roll, washing up liquid, bin bags,
toothpaste, shampoo, milk, bread, tea. Each one added as `usual`, each one
removable.

Not automatic. Offered once, dismissible forever.

## Tests

Behaviour: a reorder point fires once and not again until restocked; null
never fires; the predicted line needs at least three restocks before it says
anything; the starter list is idempotent and skips anything you already
have.

Library gate: every new reference entry has a label, and non-food entries
still carry no calories.

## Done when

Your shopping list knows about shampoo, guinea pig hay and washing up
liquid without you having thought about any of them.
