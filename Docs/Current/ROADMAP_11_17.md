# Home-OS: Roadmap, Phases 11–17 — Kitchen Completion
01 Sep 2026 v1

Seven phases that close the kitchen loop: build a recipe from things you do
not own, buy them, scan them, and watch the card complete itself. Then do it
across a library of recipes with real cooking instructions.

## The loop, stated once

1. You add a meal (yours, or one lifted from the library).
2. Its ingredients become `foods` rows whether or not you own any.
3. The Phase 7 shortfall diff puts the gaps on the shopping list.
4. You buy them and scan them in the shop or at the cupboard.
5. **The scan reconciles into the row the recipe already points at** —
   barcode, macros, pack size. The card fills in. Nothing is duplicated.
6. `pantry_stock` goes up. Next week's diff does not ask again.

Step 5 is the joint that is currently broken, which is why Phase 11 is
first and everything else waits behind it.

## Phases

| # | Name | Schema | Depends on |
|---|---|---|---|
| 11 | Reconcile on scan | none | — |
| 12 | Pack sizes and household measures | rev 8 | 11 |
| 13 | Reference food data | rev 9 | 12 |
| 14 | Cook from what you have | none | 12 |
| 15 | Recipe method steps | rev 10 | — |
| 16 | Recipe library | rev 11 | 12, 13, 15 |
| 17 | Recipe photo import | none (edge fn) | 15 |

Phase 10 (notifications) is still unbriefed and is not blocked by any of
this. It can slot in anywhere.

### Why this order

- **11 before everything.** Until a scan merges rather than duplicates, every
  other feature multiplies the duplicate rows instead of fixing them.
- **12 before 16.** A library recipe reading "1 item of chopped tomatoes"
  is unusable. `item_label` is what makes it read "1 tin".
- **13 before 16.** Library recipes call for eggs, carrots and tablespoons of
  soy sauce. Without reference weights those ingredients contribute nothing
  to the macro totals and every seeded card looks empty.
- **15 before 16.** A library row without method steps is just a shopping
  list with a name on it.
- **14 is independent** of 13 and 16 and can run in parallel if convenient.

## Schema revisions summarised

Each is applied at the start of its own phase, `schema.md` updated first,
`Docs/Current/migrations/` gets the SQL. Additive only, except rev 9 which
**widens** a CHECK constraint (safe: no existing row becomes invalid).

**Revision 8 (Phase 12)** — `foods.item_label text` nullable. The singular
noun for one item of this food: "tin", "egg", "slice", "carrot". Null means
the generic word "item" is used.

**Revision 9 (Phase 13)** — `foods.source` CHECK widened to
`('manual','openfoodfacts','reference')`.

**Revision 10 (Phase 15)** — new table `meal_steps`; `meals` gains
`method_note text` nullable (the one-line "this makes a wet sauce, do not
panic" caveat that belongs to no single step).

**Revision 11 (Phase 16)** — `meals` gains `cuisine text`, `budget_tier
text`, `dietary_tags text[]`, `default_slot text`, `library_ref text`.
`library_ref` is the seed slug and is what stops a recipe being added twice.

## Honest note on volume

Graeme's ask is "hundreds, maybe a thousand" library recipes. A thousand
recipes with proper step-by-step method is roughly a quarter of a million
words written to a strict style guide. That is not one session's work and
pretending otherwise would produce a thousand bad recipes.

**The plan is 300, built in batches of 40–60 per session**, starting with
the cuisines and tiers that get used most. The library is a seed file with a
stable format, so batches append without touching anything already shipped.

Phase 17 then matters more than the library does. Your own cookbooks
photographed in are worth more than any generic catalogue, and they arrive
at whatever rate you photograph them.
