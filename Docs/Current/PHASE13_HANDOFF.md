# Home-OS: Phase 13 Handoff — Reference Food Data
01 Sep 2026 v1

**Schema revision 10.** Migration written; run it before pulling the app.

## What shipped

| Path | Version | What |
|---|---|---|
| `data/food_reference.json` | v1 (new) | 210 published averages |
| `js/data/foodReference.js` | v1 (new) | Load, index, lookup, patch |
| `js/views/foods.js` | v3 | The "use typical values" offer |
| `js/data/meals.js` | v5 | `estimatedCount` / `estimatedNames` |
| `js/views/meals.js` | v15 | States which figures are averages |
| `service-worker.js` | v49 | Two new paths, `CACHE_NAME` v49 |

## The file

210 entries: eggs by size, veg and fruit by size, standard tin and pack
sizes, liquids with densities, spoonable solids with densities, dry goods
per 100 g, herbs and spices, staple proteins, and non-food items with item
labels but no calories.

Sourced from published composition tables (USDA FoodData Central, McCance
and Widdowson). Factual measurements, rounded — false precision on an
average is its own kind of lie.

## Decisions worth knowing

**Matching is exact, not fuzzy.** A near-match that silently fills in
somebody else's calorie figures is worse than no match. The user is typing a
name they already know.

**"Pepper" is not an alias of anything.** It matched both the vegetable and
the spice. Rather than pick one, it was removed from both — the same refusal
to guess that `toGrams()` makes. A test asserts no alias points at two
foods, so a future batch cannot reintroduce the problem.

**Reference values fill blanks only, and only on a tap.** A published
average never overwrites a figure read off a packet or typed by hand, and
nothing is written without the button.

**A category copied from the reference does not claim a source.** Only a
nutrition or conversion figure sets `source = 'reference'`, so a toilet roll
picking up `item_label` does not get labelled an estimate.

**Estimates count toward the totals.** Excluding them would put us back at
empty macro tables, which is the problem this phase exists to solve. They
are labelled instead, in the same quiet style as the incomplete line. No
warning colour: an estimate is not a mistake.

**The JSON is precached.** It is one file and it is what makes the food form
useful with no signal.

## The render gate earned its keep again

`const URL = new URL(...)` shadows the global inside its own initialiser and
dies in the temporal dead zone. It ran fine in isolation and killed three
views in jsdom. Renamed to `REFERENCE_URL`, with the reason in a comment.

That is the second time in three phases a gate has caught something before
it reached `main`.

## Tests

Behaviour 252 → **271**. New: the file parses; slugs unique; **no alias
collisions**; every item weight comes with a word for the item; macros are
all-or-nothing per entry (a half-filled entry would report a false total);
non-food entries carry no calories; blanks-only patching; scanned figures
survive; empty string counts as empty; a non-food does not claim a nutrition
source; the offer text says both that the values are averages and how to
replace them.

## Not yet done

- **The ingredient picker does not offer reference foods yet.** Typing a
  food not in your list still creates a bare row. Wiring `search()` into
  that picker is a small follow-on and belongs before Phase 16.
- **Nothing backfills existing foods.** Your chopped tomatoes will not
  acquire `grams_per_item` on their own. Open the food and tap the offer.

## Next

Phase 15 (recipe method steps) per `ROADMAP.md`, then 19, 20, 14, 16.
