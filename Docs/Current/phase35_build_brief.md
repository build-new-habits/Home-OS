# Home-OS: Phase 35 Build Brief — Shopping List Sections
25 Nov 2026 v1

Built directly in the architect chat. Read `SESSION_START.md` first.

## Why
Graeme, 25 Nov 2026:
> An aisle-sorted shopping list — let's make this an option, but I like
> organising by fridges, freezers, fruit, veg, cupboards, home. There could
> be sub categories in meat, fish, dairy etc.

The list is grouped today by `foods.category`, nine storage-state values.
`food_fresh` lumps fruit, veg, meat, fish, dairy and bakery into one heading.
That is the gap.

## What Phase 35 is
Two ways to order the same list, chosen once and remembered:

**By where it goes (default)** — how the shop gets put away.

| Section | Sub-sections, shown only when they have something |
|---|---|
| Fruit | — |
| Veg | — |
| Fridge | Meat · Fish · Dairy & eggs · Ready meals & deli · Other |
| Freezer | — |
| Bakery | — |
| Cupboard | Tins & jars · Pasta, rice & grains · Baking · Herbs, spices & stock · Sauces & oils · Snacks & cereal |
| Drinks | — |
| Home | Cleaning & household · Personal care · Pet · Home & other |

**By aisle (option)** — the order of a typical UK supermarket walk: fruit
and veg, bakery, meat and fish, dairy, chilled, tins and dry, world foods,
baking, drinks, frozen, household, personal, pet.

Both orders use the same sections; aisle order only re-sorts them and
flattens Fridge's sub-sections into their own aisles. One switch, at the top
of the list: **Sort: Where it goes / Aisle order**.

## How a line finds its section
No schema change this phase. A pure classifier, `js/lib/shopSections.js`:

1. `foods.category` decides the top level outside the fresh grey area:
   `food_frozen` → Freezer, `drink` → Drinks, `household`/`personal`/
   `home`/`pet` → Home sub-sections, `food_ambient` → Cupboard.
2. Within `food_fresh` and `food_ambient`, the food's reference data decides
   the sub-section: the UK food tables' group code (fruit, veg, meat, fish,
   milk/eggs, cereals) carried on reference and table-matched foods, then a
   keyword list on the name (chicken, mince → Meat; salmon, prawns → Fish;
   milk, yoghurt, cheese, butter, eggs → Dairy & eggs; bread, rolls,
   wraps → Bakery).
3. Anything still unsure goes to the section's "Other", never guessed into a
   wrong sub-section.

A later phase can add `foods.shop_section` so a person can move an item and
have it stick (one tap: "Move to Fridge › Dairy"). Not this phase.

## Where the choice is kept
`localStorage['home-os-shop-sort']` (`where` | `aisle`), so it works offline
and needs no migration. Moving it to `user_settings` follows if sorting needs
to match across a household's phones.

## Files
| Path | Change |
|---|---|
| `js/lib/shopSections.js` | **new**: `sectionFor(food)`, `SECTION_ORDER`, `AISLE_ORDER` |
| `js/views/shopping.js` | group by section and sub-section; the sort switch |
| `js/data/shopping.js` | `aisleRank` reads `AISLE_ORDER` from the new module |
| `Tests/shopSections.mjs` | **new** gate: 60 everyday foods to their expected section, both orders, unknowns to Other |
| `css/components.css` | sub-section headings |
| `service-worker.js` | precache the new module; bump shell |

## Principles in scope
- **2 Friction:** the switch is one tap, remembered; nothing to set up.
- **1 No shame:** empty sections are not shown; nothing says "uncategorised".
- **Accessibility:** sections are real headings (h2, sub-sections h3), the
  switch is a two-option radio group with a visible label, and the order
  change is announced.

## Verification
- New gate passes; existing shopping gates pass; snapshots updated for the
  new headings only.
- On the phone: build a list from a week's plan; check chicken, salmon,
  milk, apples, carrots, peas (frozen), tinned tomatoes, pasta, washing-up
  liquid land where expected in both orders.
