# Home-OS: Phase 36b Handoff — Favourites, three lists, the weekly list
27 Nov 2026 v1

Brief: `phase36_build_brief.md` parts 3–5. Hearth only.

## What shipped
| Path | What |
|---|---|
| `migrations/029_shop_favourites.sql` (+ VERIFY) | `shop_favourites`: one row per food per household; `every` empty = favourite, set = regular |
| `js/data/favourites.js` (new) | Favourites and regulars; regulars due on time (a few days early counts); three lists by kind; the weekly build, once per slot |
| `js/views/shopFavourites.js` (new) | `#/shop-favourites`: your favourites (Add to list, make it a regular, how many), add favourites from your list and pantry, and **Your weekly list** (day, time, Build it now) |
| `js/views/kitchenShop.js` v10 | **Groceries · Household · Toiletries** tabs with counts (Hearth); Favourites and regulars button; the weekly list built the first time the list opens after the chosen time |
| `Tests/favourites.mjs` (new) | 30 checks |

All gates pass. Snapshot updated for Shopping only.

## How the weekly list works
- Set it in Favourites and regulars → Your weekly list: e.g. Thursday 19:00.
- The first time the Shop list opens after that, it adds everything the plan
  needs (minus the pantry — same as "Add everything from the plan") and any
  regulars that are due. A toast says what went on.
- Building twice adds nothing twice. A regular is skipped if it is already on
  the list, or the pantry has plenty or enough of it.
- Kept on the phone (one setting per phone). A notification at that time is
  a later step (opt-in, principle 8).

## For Graeme
1. Run `029_shop_favourites.sql` on **Home OS**, then the VERIFY: three PASS rows.
2. **Also outstanding: migration 026** (kitchen rebuild: courses, shelves,
   fibre) is still recorded as not applied. Your "kind" corrections in the
   pantry are kept on the phone until it is run.
