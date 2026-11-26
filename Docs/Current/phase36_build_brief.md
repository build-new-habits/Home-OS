# Home-OS: Phase 36 Build Brief — Hearth, Free limits, and the weekly shop
26 Nov 2026 v1

Built in the architect chat. Read `SESSION_START.md` first. The full
Free/Hearth split is in `COMPETITIVE_POSITION.md` v3.

## What this phase is
1. **The Hearth switch.** Each household is Free or Hearth.
2. **Free limits**, shown kindly, never as nagging.
3. **Favourites and regulars** in the shop and the pantry.
4. **Groceries, Household and Toiletries** as separate lists.
5. **The list built for you each week** at a time you choose.

No AI. No billing yet: Hearth is switched on per household by hand until
the store phase. Graeme's household is Hearth.

## 1. The switch
- `households.plan` text, check `free | hearth`, default `free`;
  `households.hearth_until` timestamptz, nullable (trial and lapses).
  Migration 028, schema revision 28, schema first.
- `js/data/hearth.js` (not `plan.js`, which would clash with the meal
  plan): `isHearth()`, `limits()`, read once per session, cached offline.
- One table of limits in `hearth.js`, so changing a number is one line:

| Limit | Free |
|---|---|
| Plan | dinners, this week |
| Own recipes | 10 |
| Imports | 3 a month (link or caption) |
| Pantry items | 30 |
| Community library | 10 this month |
| Nutrition | calories per serving |
| Household | one phone |

- **Never limited:** accessibility settings, export and backup, cook mode,
  reading anything already saved. Nothing a Free household made is ever
  hidden or deleted if they drop from Hearth: past the limit, it is still
  there to read and cook; only adding more is limited.
- Enforced in the app for now. The AI import (Phase 17) is enforced
  server-side in its Edge Function, because that is the one that costs money.

## 2. How a limit looks
- At the limit, the add button stays and opens a short card: what Hearth
  adds here, in one sentence, and **See Hearth** / **Not now**. Shown when
  tapped, never as a pop-up on its own.
- No counters on screen ("7 of 10 recipes") until 8 of 10, then a quiet
  line of fact.
- No-shame copy gate covers every new string. No "upgrade now", no urgency.

## 3. Favourites and regulars (Hearth)
- Any food can be a **favourite** (a star on the list row and the pantry
  row): one tap adds it to the list from a Favourites page.
- A favourite can be a **regular**: every week, fortnight or month, with an
  amount. Regulars go onto the list automatically when the weekly list is
  built (part 5), unless the pantry already has enough.
- Table `shop_regulars` (household_id, food_id, every, qty, unit,
  last_added_on). Migration 028.

## 4. Three lists (Hearth)
- **Groceries, Household, Toiletries** as tabs on the Shop screen.
- No new column: the list follows the food's kind (`data/shelves.js`):
  household → Household; personal → Toiletries; everything else Groceries.
  Pet goes under Household.
- "Add something" asks which list, defaulting to the tab you are on.
- Free keeps one list; household and toiletry items still appear on it,
  grouped by kind as today.

## 5. The list built for you (Hearth)
- Settings: **Build my list on** [day] **at** [time] (Graeme: Thursday
  evening, for Friday click and collect).
- A web app has no server alarm, so the list is built the first time the
  app opens after that time (and a notification, if turned on, says it is
  ready — opt-in, principle 8). Built = everything planned for the coming
  week, minus the pantry, plus regulars that are due.
- Idempotent: building twice adds nothing twice.

## Verification
- Gate: the limits table; a Free household at each limit sees the card and
  keeps everything it already has; Hearth sees no card; regulars due only
  once per period; the weekly build twice gives one list; lists split by
  kind.
- On the phone: Graeme's household is Hearth; a test household is Free.
