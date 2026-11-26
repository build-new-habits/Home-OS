# Home-OS: Phase 36a Handoff — Hearth switch and Free limits
26 Nov 2026 v1

Brief: `phase36_build_brief.md` (parts 1 and 2). Parts 3–5 (favourites and
regulars, three lists, the list built for you) are **36b**.

## What shipped
| Path | What |
|---|---|
| `migrations/028_hearth.sql` (+ VERIFY) | `household_entitlements`: select-only for members; every existing household made Hearth |
| `js/data/hearth.js` (new) | Tier from the database (cached offline), the Free limits table, counts, this month's ten library recipes |
| `js/components/hearthCard.js` (new) | The card at a limit: one sentence, **See Hearth** / **Not now** |
| `js/views/hearth.js` (new) | `#/hearth`: Free vs Hearth table, price, which tier you are on |
| recipe editor, Check and save, Make a plate | Free keeps 10 of your own recipes (library copies do not count) |
| Import a recipe | Free imports 3 a month (link or caption) |
| Pantry (Add) | Free keeps 30 things |
| Community library, recipe page | Free sees and plans this month's ten; all can still be read |
| Plan | Free plans dinners this week; Next week and Weeks ahead show what Hearth adds |
| Settings | "Your household has Hearth / is on Free", linked to `#/hearth` |
| `components/confirmDialog.js` v2 | `tone: 'primary'` for an invitation (the card), danger stays default |
| `Tests/hearth.mjs` (new) | 52 checks: tiers, limits, rotation, counter, kind words |

All gates pass. Snapshot updated for Settings only.

## For Graeme
1. Run `028_hearth.sql` on **Home OS**, then `028_hearth_VERIFY.sql`: four PASS rows.
2. Your household is Hearth after that, so nothing changes for you.
3. To see Free: sign up a second account (new households have no row, so
   are Free). To make any household Hearth by hand:
   `insert into household_entitlements (household_id, plan) values ('<id>', 'hearth') on conflict (household_id) do update set plan = 'hearth', hearth_until = null;`

## Decisions
- **A table of its own**, not a column on `households`, because members can
  update their households row and could make themselves Hearth.
- **No table yet → Hearth**, so the app does not shrink before 028 is run.
- **Limits are enforced in the app.** Fine while Hearth is switched on by
  hand; the AI import (Phase 17) checks the tier in its Edge Function.
- **Nothing is ever hidden or deleted** past a limit; only adding more is.

## Not yet (36b and later)
Calories-only nutrition and one-phone household for Free; Free's pantry not
filled from shopping; favourites and regulars; Groceries, Household and
Toiletries lists; the weekly list built for you.
