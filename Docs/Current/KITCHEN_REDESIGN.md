# Kitchen redesign — mockups and what it costs

<!-- Docs/Current/KITCHEN_REDESIGN.md — 07 Sep 2026 v1 -->

From the 7 Sep 2026 spec. Mockups first, then an honest account of what the
data already supports, what needs a migration, and what I would argue with.

---

# 1. WHAT THE DATA ALREADY DOES

Free today, no schema change:

| Asked for | Already there |
|---|---|
| Ingredients and amounts | `recipe.ingredients` — all 110 complete |
| Instructions | `recipe.steps` |
| Prep and cook time | Derived from the steps — `lib/recipeTime.js` |
| Macros per serving | `food_reference.json` — calories, protein, fat, carbs, and now density for every ingredient |
| Cost band £–££££ | `budget_tier` — budget / everyday / special. Three bands, not four |
| Favourites (your own meals) | `meals.is_favourite` |
| Portions | `default_serves`, plus `serves_override` per plan entry |

# 2. WHAT NEEDS A MIGRATION

Nothing below can be faked, and each is a real database change.

| Feature | Needs |
|---|---|
| **Next week** | `weekly_meal_plan` is keyed by `day_of_week` — an enum of mon..sun. One week, and it does not know which. Needs a date, a backfill, and every read of the plan rewritten. **Two of the three Weekly Plan pages depend on this.** |
| **Swap a meal to another day / next week** | Same change. A swap is a date move |
| **Send to Shopping for next week** | Same change |
| **Planning notes** | A new table. Notes plus attached recipes, not tied to a week |
| **Favourite a library recipe** | `is_favourite` is on `meals`; a library recipe is not a meal until imported. Either import-on-favourite, or a small `library_favourites` table |
| **"Regular" — most used** | Nothing records that a meal was cooked. Needs a cooked-log, or a counter on `meals` |
| **Equipment needed** | Not in any of the 110 recipes. Either author it, or derive from steps ("wide pan", "oven") — derivable, but it would be a guess dressed as a fact |
| **Default portions in Settings** | One column on `settings` |

# 3. MOCKUPS

## 3.1 Kitchen

```
┌────────────────────────────────┐
│ Kitchen                        │
│ Plan a week, check the         │
│ cupboards, buy the difference. │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ TODAY'S MEALS              │ │  full-width, top
│ │ Breakfast  Overnight oats  │ │  the day at a glance
│ │ Lunch      —               │ │
│ │ Dinner     Veg Lasagna     │ │
│ │                          › │ │
│ └────────────────────────────┘ │
│ ┌─────────────┐ ┌────────────┐ │
│ │ Weekly plan │ │ Pantry     │ │  2 x 2 grid
│ │ 6 of 7 days │ │ 128 things │ │
│ └─────────────┘ └────────────┘ │
│ ┌─────────────┐ ┌────────────┐ │
│ │ Shopping    │ │ Recipe     │ │
│ │ 15 to get   │ │ library    │ │
│ └─────────────┘ └────────────┘ │
└────────────────────────────────┘
```

Tapping a meal inside Today's Meals opens the recipe card (3.6).

## 3.2 Weekly plan

```
┌────────────────────────────────┐
│ Weekly plan                    │
├────────────────────────────────┤
│ This week            6 meals › │
│ Next week           nothing  › │
│ Future plans        2 notes  › │
├────────────────────────────────┤
│ TODAY — Monday                 │
│ Breakfast  Overnight oats    › │
│ Dinner     Veg Lasagna       › │
├────────────────────────────────┤
│ TOMORROW — Tuesday             │
│ Dinner     Beef in red wine  › │
│ ⚠ Take beef out of the freezer │
└────────────────────────────────┘
```

Tomorrow at the bottom is the best idea in the spec. It is the only screen
in the app that would tell you to defrost something, and nothing else in
this market does it.

## 3.3 This week / Next week

```
┌────────────────────────────────┐
│ Next week                      │
│ [ Send to shopping ]           │  action bar, top or bottom
├────────────────────────────────┤
│ › Monday          2 meals      │
│ ⌄ Tuesday         1 meal       │
│     Dinner  Puttanesca         │
│       Serves 4    [Swap] [×]   │
│     + Add a meal to Tuesday    │
│     + Add a second meal        │  the kids-eating-differently case
│ › Wednesday       nothing      │
└────────────────────────────────┘
```

Expanding in place, not a page per day: you are comparing days here, which
is the one job a list beats a set of pages at.

## 3.4 Pantry

```
┌────────────────────────────────┐
│ Pantry                         │
├────────────────────────────────┤
│ Stock take                   › │
│ What's inside                › │
├────────────────────────────────┤

  Stock take
  ┌──────────────────────────┐
  │ ⌄ Restock                │  change, reduce, remove
  │ › Add new stock          │  scan or by hand
  └──────────────────────────┘

  What's inside
  ┌───────────┐ ┌───────────┐
  │ Fridge 30 │ │ Freezer 7 │
  ├───────────┤ ├───────────┤
  │ Veg    12 │ │ Fruit   6 │
  ├───────────┤ ├───────────┤
  │ Tins   18 │ │ Packets 24│
  └───────────┘ └───────────┘
```

## 3.5 Shopping and Recipe library

```
  Shopping                    Recipe library
  ┌──────────────────┐        ┌──────────────────┐
  │ Shopping list  › │        │ Search         › │
  │ 15 still to get  │        │ Favourites     › │
  ├──────────────────┤        │ Create         › │
  │ Favourites     › │        └──────────────────┘
  │ the regulars     │
  └──────────────────┘
```

## 3.6 The recipe card — the thing the whole spec is really about

```
┌────────────────────────────────┐
│ Mushroom risotto             ♡ │
│ Italian · dinner · serves 4    │
├────────────────────────────────┤
│ 10 min prep · 35 min cooking   │
│ 480 kcal · 12g protein         │
│ ££ everyday                    │
├────────────────────────────────┤
│ YOU WILL NEED                  │
│ A wide pan, a saucepan         │
├────────────────────────────────┤
│ INGREDIENTS                    │
│ 300 g  Arborio rice            │
│ 250 g  Chestnut mushrooms      │
│ ...                            │
├────────────────────────────────┤
│ METHOD                         │
│ 1. Heat the stock in a pan.    │
│    Keep it on a low heat.      │
│ 2. Chop the onion finely.      │
│ ...                            │
├────────────────────────────────┤
│ YOUR NOTES                     │
│ [                            ] │
├────────────────────────────────┤
│ [ Add to my meals ]            │
└────────────────────────────────┘
```

"Beginner's instructions" is the requirement worth taking most seriously.
The steps are already written that way — "until soft and see-through",
"until the grains look glassy at the edges" — a state to look for rather
than a time to trust. That is the house style and it should be defended in
anything added.

# 4. WHAT I WOULD ARGUE WITH

**Four doors to the same 110 recipes.** Search, Favourites, Regular,
Create. Three of those are the same list with a different filter, and
"Regular" cannot exist until something records what you cook. I would ship
Search and Create, put Favourites as a filter inside Search, and add
Regular only once there is a cooked-log worth reading.

**"Equipment needed" is not in the data.** It can be derived from the steps
— a step saying "put a wide pan on a medium heat" clearly needs a wide pan
— but a derived list will miss things a cook would not, and a recipe card
that omits the sieve you need is worse than one that says nothing. Either
author it for 110 recipes, or derive it and label it as read from the
method.

**Cost is three bands, not four.** `budget_tier` is budget / everyday /
special. £ ££ £££ maps cleanly; ££££ would be invented.

**Two routes to today's meals** — the Kitchen section and the Weekly plan
page. That duplication is fine and probably right: one is a glance, the
other is the plan.

# 5. ORDER

1. **Migration 024: the plan gets dates.** Unblocks next week, swaps, and
   send-to-shopping. Nothing else in section 3.3 can start until it lands.
2. **Kitchen shell** — today's meals section, 2x2 tiles. No new data.
3. **The recipe card** — macros, equipment, notes, favourite. Mostly free.
4. **Pantry split** — stock take and what's inside. Existing data, new IA.
5. **Notes and favourites tables.**
6. **Regular**, once a cooked-log exists.
