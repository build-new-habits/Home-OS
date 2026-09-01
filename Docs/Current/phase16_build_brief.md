# Home-OS: Phase 16 Build Brief — Recipe Library
01 Sep 2026 v1

**Schema revision 11.** Depends on Phases 12, 13 and 15 being cleared: pack
labels, reference weights and method steps all have to exist before a
seeded recipe is worth having.

## Revision 11

```sql
alter table meals add column cuisine text;
alter table meals add column budget_tier text
  check (budget_tier in ('budget','everyday','special'));
alter table meals add column dietary_tags text[] not null default '{}';
alter table meals add column default_slot text
  check (default_slot in ('breakfast','lunch','dinner','snack'));
alter table meals add column library_ref text;
```

`library_ref` holds the seed slug. It is what stops one recipe being added
twice, and what lets a later batch update a recipe you already have without
duplicating it.

`cuisine` is free text with a suggested list rather than a CHECK. The set of
cuisines is open, and a constraint you have to migrate every time you cook
something new is a constraint working against you.

`dietary_tags`: `vegetarian`, `vegan`, `gluten_free`, `dairy_free`,
`nut_free`. Array, because a dhal is three of them at once.

## Do not bulk-load

**The library is a browsable seed file. Adding a recipe is a deliberate tap,
and only then do its `foods` rows get created.**

Loading 300 recipes into `meals` on first run would create roughly 1,200
`foods` rows for things you will never buy. That wrecks the Phase 7
shortfall diff, buries the pantry, and blows straight past the standing
decision to defer finer food taxonomy until around 50 real foods exist.

## Adding a recipe

1. Skip if `library_ref` already exists in `meals`. Say so, offer to open it.
2. Insert the `meals` row with its metadata.
3. For each ingredient, resolve a `foods` row **in this order**:
   a. exact normalised name match on an existing food;
   b. alias match via `foodReference` (Phase 13);
   c. create from the reference entry, complete, `source = 'reference'`;
   d. create bare from the recipe's own name and quantity.
   Path (a) is what makes your existing scanned tin of tomatoes get reused
   rather than duplicated. This is Phase 11's principle applied to seeding.
4. Insert `meal_ingredients` with unit and quantity.
5. Insert `meal_steps`.
6. Report what happened: *"Added Puttanesca. 3 ingredients you already had,
   4 created."* Nothing happens invisibly.

Offline: this needs connectivity for the same reason meal creation does — a
meal insert must return a real id before its children can reference it. Say
so plainly rather than queueing something that would orphan.

## Seed file

`data/recipe_library/<cuisine>.json`, one file per cuisine so batches append
without touching shipped files, plus `index.json` listing them with counts.
Service worker precaches the index and lazy-fetches a cuisine file on
browse. **Do not precache 300 recipes.** Bump `CACHE_NAME`; verify every new
path returns 200 before shipping (the precache is all-or-nothing).

Recipe shape: `slug`, `name`, `cuisine`, `budget_tier`, `dietary_tags`,
`default_slot`, `default_serves`, `method_note`, `ingredients[]`
(`ref` slug or plain `name`, `quantity`, `unit`), `steps[]` per
`RECIPE_STEP_STYLE.md`.

## Browsing

Filter by cuisine, budget tier, dietary tags and slot; free-text search on
name and ingredient. Anything already added is marked as such, not hidden —
seeing that you own it is information.

## Content plan — read this honestly

The target is **300 recipes, built in batches of 40 to 60 per session.** Not
a thousand. A thousand recipes at ten well-written steps each is around a
quarter of a million words held to a strict style guide; promising it in one
go would deliver a thousand bad recipes, and a library you stop trusting is
worse than no library.

Batch order, most-used first:

| Batch | Content | ~n |
|---|---|---|
| 1 | British and Italian everyday dinners | 50 |
| 2 | Indian and Thai | 50 |
| 3 | Breakfast, lunch and packed food across all cuisines | 50 |
| 4 | Budget tier across all cuisines | 50 |
| 5 | Vegetarian and vegan | 50 |
| 6 | French, Caribbean, Mexican, Chinese, Middle Eastern | 50 |

Every recipe is written from scratch to the style guide, in generic
formulations, not lifted from any cookbook. See the copyright section of
`RECIPE_STEP_STYLE.md` — the eleven rules make a rewrite mandatory anyway.

Each batch ships as its own commit with its own row in `master_schedule.md`,
so the library's growth is auditable and a bad batch is revertable alone.

## Tests

Behaviour: adding twice is refused by `library_ref`; ingredient resolution
prefers an existing food over creating one; a reference-backed ingredient
arrives with macros; a bare ingredient arrives incomplete and is reported;
filters combine; offline add refuses clearly.

Schema gate: 19 tables, new columns and CHECKs present, `dietary_tags`
defaults to empty rather than null.

A JSON validity gate over every seed file: required fields, valid enums,
step count above zero, no step over 20 words, no banned words. A malformed
recipe must fail the build, not reach the app.

## Done when

You can browse to Puttanesca, add it, find a tin of tomatoes on your
shopping list because you have none, buy it, scan it, and open a complete
card with macros and ten steps.
