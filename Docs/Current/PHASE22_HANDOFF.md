# Home-OS: Phase 22 Handoff — The List Is Never Wrong
01 Sep 2026 v1

**No schema change.**

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/listSync.js` | v1 (new) | Debounced automatic recompute |
| `js/components/toast.js` | v2 | Undo action |
| `js/data/restock.js` | v2 | Depletion after cooking |
| `js/components/cookMode.js` | v2 | Reports whether the recipe finished |
| `js/views/mealPlan.js` | v3 | Triggers the sync, says what happened |
| `js/views/shopping.js` | v6 | Undo instead of a silent remove |
| `js/views/meals.js` | v20 | Offers depletion after cooking |
| `service-worker.js` | v57 | One new path |

## 1. The list follows the plan

Every plan change asks for a recompute. The timer resets on each change, so
a burst of edits while laying out a week produces **one** recompute, not
seven. Leaving the plan screen flushes immediately — you are on your way to
the kitchen, and waiting out a debounce there is the moment the list would
be wrong.

**Never silent.** A live line on the plan screen says *"Shopping list
updated — 6 things to buy."* A list that changes under you without saying so
is worse than one you rebuild by hand.

**Offline skips rather than writing.** Computing from a plan whose last
change never reached the server would produce a wrong list with no sign it
was wrong. The message says *"Your list will update when you are back
online"* — a delay, not a failure, and there is a test asserting the wording
contains no "error" or "failed".

**Never two at once**, and hand-added items are untouched:
`replaceGeneratedItems` only replaces `source = 'meal_plan'`.

## 2. Aisle grouping — my brief was wrong

The brief said "the list is currently flat". **It was not.** The shopping
view has grouped by aisle in walk order since Phase 7, with counts on the
headings.

I wrote a duplicate `AISLE_ORDER` before checking, which would have been a
**duplicate `export const` in the same module — a syntax error that would
have broken the whole app**. Caught by reading the file rather than by a
gate, which is worth noting: no gate would have caught it until the next
run, and I had already run them clean before the edit.

Removed. Nothing to build here.

## 3. Undo replaces the confirm

Removing a shopping item no longer asks first — it removes, and offers
**Undo for ten seconds**.

A confirm asks you to predict your own mistake *before* making it. Undo lets
you notice it a moment later, which is how mistakes actually get noticed. It
is also the less interrupting of the two: a confirm stops everyone to
protect the few.

Toasts carrying an action **never fade** — an undo you have to catch is not
an undo — and ten seconds is the floor regardless of what the caller asks
for. The announcement includes "Undo available", so the option is not
visual-only.

## 4. Depletion after cooking

Finish Cook Mode and it offers once: *"Take rice and tin of tomatoes out of
the pantry?"*

**Offered, never automatic.** You may have used the bag from the shop rather
than the one in the cupboard, and a pantry that silently empties itself is
worse than one that lags. Declining is fine and is never mentioned again.

**Only when the recipe was finished.** `openCookMode` now resolves `true`
only if you reached the end; offering after someone abandoned at step 2
would be wrong and annoying.

It refuses to guess: an unrecorded amount is left alone, a unit mismatch is
left alone, an unchosen Phase 19 option was never cooked, and nothing can go
below zero — a negative cupboard would make the shortfall diff ask for more
than you need.

## Tests

Behaviour 358 → **374**. New: sync wording including the offline phrasing
asserted both positively and negatively; coalesced calls saying nothing;
depletion across grams, items, unrecorded amounts, unit mismatches, unchosen
options, scaling, and the zero floor.

All eight gates.

## Not yet done

- **Undo is only on shopping removal.** The brief also wanted it on ticking
  bought, deleting a step and removing a member. Same pattern, three more
  call sites.
- **The manual "Build from the plan" button stays.** It is now a
  "rebuild now" for certainty rather than the only route, which is right,
  but its label still reads as the primary path.

## Next

Phase 23 — one pantry screen.
