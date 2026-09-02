# Home-OS: Phase 15 Handoff — Recipe Method Steps
01 Sep 2026 v1

**Schema revision 11.** Run the migration before pulling the app —
`views/meals.js` reads `meal_steps` on load.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/mealSteps.js` | v1 (new) | CRUD, reorder, style checks, tokens |
| `js/components/cookMode.js` | v1 (new) | Full-screen cook mode |
| `js/views/meals.js` | v16 | Method section, step editor |
| `js/data/meals.js` | v5 | `source` and `item_label` on the ingredient join |
| `css/components.css` | v28 | Steps and cook mode |
| `service-worker.js` | v50 | Two new paths |

**21 tables, 21 policies, 21 triggers.**

## Decisions worth knowing

**`meal_steps` is household-scoped**, because `meals` is. A recipe your
partner wrote has to be one you can cook.

**`step_number` has no unique constraint.** Reordering under one means a
temporary gap or a deferred constraint. The app renumbers contiguously on
every save; enforced in code.

**Reorder is up/down buttons, not drag and drop.** Dragging is poor with a
screen reader and awkward with wet hands, and this is a kitchen.

**Progress lives in localStorage, not the offline queue.** It is device
state, not data, and it must survive without a network round trip.
Discarded after six hours — you are not still cooking.

**An item label stands alone in a step.** `{{ing:egg-medium}}` renders as
"2 eggs", not "2 eggs (116 g) egg, medium". The label already is the noun,
and nobody needs the gram total of two eggs while holding two eggs. Caught
by writing the test before trusting the output.

**An unresolvable token renders as a plain name, never as braces.** Showing
`{{ing:butter}}` to someone mid-cook is worse than showing "butter".

**The style checker is advisory and never blocks a save.** A checker that
refuses your sentence is one you learn to turn off. It names the rule
number so the guidance is traceable to `RECIPE_STEP_STYLE.md`.

**Steps load in one query for all meals.** A query per meal would not
survive Phase 16's 300 recipes.

**Cook mode reads the timer aloud as text**, announces every step change
through a live region, and requests a wake lock where available
(feature-detected, no polyfill).

## Tests

Behaviour 271 → **291**. New: every style rule fires on a real example and
stays quiet on a clean step; all five shaming words flagged; tokens resolve,
scale, and degrade; no raw braces ever survive rendering; item labels stand
alone; slugs stable across punctuation and case.

The render gate caught a duplicate `confirmDialog` import before commit.

## Not yet done

- **No inline step editing.** Steps can be added, reordered and deleted, but
  changing wording means delete and re-add. `updateStep()` exists and is
  tested; the form is not wired.
- **`method_note` is displayed, not editable.** Column and rendering exist;
  no input yet.
- **Scaling is fixed at 1.** `resolveTokens` takes and honours a scale, and
  cook mode passes it, but nothing sets it above 1 until Phase 20 wires
  `portion_factor` through.

## Next

Phase 19 (ingredient options and swaps), then 20, 14, 16.
