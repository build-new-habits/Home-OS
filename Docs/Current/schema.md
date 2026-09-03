# Home PWA: Schema (Canonical)
01 Sep 2026 v19

**This is the single source of truth for the database.** Every phase reads
this before writing code. If live code and this document disagree, stop and
reconcile before writing anything (PROJECT_BLUEPRINT.md §3). No field is
added, renamed, or removed anywhere without changing it here first.

Backend: Supabase (PostgreSQL, **EU region**). **22 tables, 22 RLS
policies**, 3 trigger functions, 22 update triggers.

**No longer single-owner.** Revision 8 moved 13 tables to household
ownership; 5 remain personal. See §0f and §4.

---

## 0q. Revision 19 — household invites (01 Sep 2026)

New table **`household_invites`**, plus `pantry_stock.level_set_at`.
**22 tables, 22 policies.**

### Why

The largest gap between what the app claimed and what it did. From the
persona trace, Priya — the organised partner of an ADHD dad:

> *"It looks good. I couldn't get in. So it's Dev's app, and that means the
> shopping is still Dev's job, which was rather the problem."*

Members without a sign-in have always worked, which is right for children. A
second **adult** could not join without somebody running SQL.

| Column | Type | Notes |
|---|---|---|
| household_id | uuid | not null, default my_household_id(), on delete cascade |
| created_by | uuid | not null, default auth.uid() |
| code | text | **unique**; check length 6–12 |
| expires_at | timestamptz | not null, default now() + 7 days |
| redeemed_at | timestamptz | nullable — single use |
| redeemed_by | uuid | nullable, references auth.users |

### The RLS problem, and its answer

To redeem a code you must read a row belonging to a household you are **not
yet a member of**. No household-scoped policy can allow that, and a policy
loose enough to allow it would let anyone enumerate invites.

So the table is household-scoped for **management** — an owner sees and
revokes their own codes — and redemption goes through
`redeem_household_invite(text)`, a **SECURITY DEFINER** function with a
pinned `search_path`. It takes a code and returns a **reason string, never
the invite row**. A wrong guess reveals nothing.

The code is marked used **after** the membership row lands, so a failed
insert does not burn the code.

### The alphabet excludes 0/O and 1/I/L

This code gets read aloud down a phone, written on paper, and typed by
someone in a hurry. A character that looks like another character is a
support ticket. Generated with `crypto.getRandomValues`, not `Math.random`:
a guessable invite is a stranger in your shopping list.

### `pantry_stock.level_set_at` rides along

Revision 18 gave the pantry rough levels. Nothing recorded **when** one was
set, so a level could never go stale — drift wearing a different hat.

`updated_at` cannot answer it: schema.md §1 warns it moves on every change,
so editing an item's location would report its level as fresh.

Migration: `migrations/019_household_invites.sql`.

---

## 0p. Revision 18 — a pantry that can be vague (01 Sep 2026)

`pantry_stock.level text`, nullable, **no default**, check in
`('plenty','low','none')`.

### Why

The persona trace lost a user to this. Jodie, 24, ADHD, £30 a week,
uninstalled on day 12:

> *"When it was right it was brilliant. But keeping the cupboard right is a
> job, and if I could reliably do that job I wouldn't have needed the app."*

The competitive research found the whole category fails the same way:
*"keeping quantities accurate takes discipline"*. Barcode scanning, the
claim step, bought-to-pantry and depletion-after-cooking all **reduced** the
upkeep. None removed it, because the model still asks for a **number**, and
a number requires counting.

### The change

Let the pantry be vague on purpose. `plenty` / `low` / `none`. One tap.

This is not a lesser mode for people who cannot manage the real one. For
most cupboard items **"have I got enough" is the only question anyone
actually asks**, and a number is a more precise answer to a question nobody
had.

### Precedence, decided once and honoured everywhere

| State | Read as |
|---|---|
| `current_qty` set | The number wins. Precision beats approximation. |
| `current_qty` null, `level` set | The level is used. |
| Both null | Unknown — never demotes a recipe (Phase 14). |

**NULL level means "nothing said". It is not `none`.** Collapsing those two
would put every unrecorded item on the shopping list at once — the same
mistake `reorder_at` avoids.

`plenty` reports as **comparable and enough**, not as a quantity. That is
what stops the list asking for things you already have without inventing a
number nobody gave.

Migration: `migrations/018_pantry_level.sql`.

---

## 0o. Revision 17 — reorder points (01 Sep 2026)

`pantry_stock.reorder_at numeric`, nullable, **no default**, check `>= 0`.

Non-food has worked since Phase 6: `drink`, `household`, `personal`, `home`
and `pet` are all valid categories, the shopping list is not filtered to
edible, and `usual` has always been a valid source. Shampoo and guinea pig
hay could always go on the list.

What was missing was a **reason for them to appear.** Food reaches the list
because a meal plan needs it. Nothing plans your shampoo, so it only ever
appeared if you remembered — which is precisely the thing this product
exists not to require.

### Null means never remind

And null is the default. Opt-in, always: an app that decides on its own that
you need shampoo is an app that adds noise, and noise is how a useful prompt
gets ignored.

**Zero is a real threshold**, meaning "tell me when it runs out". It must
never be collapsed into null by a falsy check — the data module tests for
`=== null` and `=== ''` explicitly.

An unrecorded `current_qty` never triggers a reminder, for the same reason
it never demotes a recipe in Phase 14: not knowing is not evidence of
running low.

Migration: `migrations/017_reorder_points.sql`.

---

## 0n. Revision 16 — onboarding (01 Sep 2026)

`user_settings.onboarded_at timestamptz`, nullable, **no default**.

Deliberately not localStorage. Onboarding state belongs to the person, not
the device: reinstalling or switching phones should not put you back through
it, and a second household member joining **should** get their own first run
rather than inheriting yours.

Null means "not yet", which is the honest reading for every existing row and
every new account. A default would make every account read as finished.

Used only to stop offering. **Never to nag.**

Migration: `migrations/016_onboarding.sql`.

---

## 0m. Revision 15 — density (01 Sep 2026)

`user_settings.density text not null default 'comfortable'`, check in
`('comfortable','compact')`.

A fourth display preference alongside theme, contrast and brightness.
Sensory needs vary, and a fixed density serves half the audience.

**Compact scales spacing only.** Type size, tap targets and line height are
untouched. A compact mode that shrinks text or drops below 44px targets is
an accessibility regression wearing a preference's clothes — and the
Settings hint says so out loud, because the fear with any "compact" control
is exactly that.

Migration: `migrations/015_density.sql`.

---

## 0l. Revision 14 — the recipe library (01 Sep 2026)

Five columns on `meals`, so a browsable catalogue can be filtered and so
adding a recipe twice is impossible.

| Column | Type | Notes |
|---|---|---|
| cuisine | text | free text with a suggested list; **deliberately not a CHECK** |
| budget_tier | text | check in ('budget','everyday','special') |
| default_slot | text | check in ('breakfast','lunch','dinner','snack') |
| dietary_tags | text[] | not null default '{}' |
| library_ref | text | the seed slug; null for your own recipes |

`cuisine` carries no CHECK on purpose. The set of cuisines is open, and a
constraint you have to migrate every time you cook something new is a
constraint working against you.

`dietary_tags` says what a meal **is**. Absence is not a claim that it is
not — see revision 13's dietary rule.

### The library is not in the database

It ships as static JSON under `data/recipe_library/`: free to serve at any
number of users, cacheable, offline-capable, and needing no RLS reasoning.
Database rows would cost a read per browse per user for content identical
for everyone.

**Nothing is bulk-loaded.** Seeding 300 recipes would create roughly 1,200
`foods` rows for things you will never buy, wrecking the shortfall diff and
burying the pantry. A recipe becomes rows only when you tap add.

### Ingredient resolution order, on add

1. An existing food with the same name — **this is what makes your already
   scanned tin of tomatoes get reused rather than duplicated.** Phase 11's
   principle applied to seeding; skipping it would reintroduce the exact
   defect Phase 11 fixed.
2. The reference file (revision 10), creating the food complete with macros
   and `source = 'reference'`.
3. A bare row from the recipe's own wording.

Adding needs connectivity: a meal insert must return a real id before its
ingredients and steps can reference it, so queueing it offline would orphan
the children.

### Gate 8

`Tests/library.mjs` validates every seeded recipe against
`RECIPE_STEP_STYLE.md` and against the reference file. A malformed recipe
fails the build rather than reaching a phone.

Migration: `migrations/014_recipe_library.sql`.

---

## 0k. Revision 13 — who is eating (01 Sep 2026)

`weekly_meal_plan` gains **`member_ids uuid[] not null default '{}'`**.

Several meals in one cell already worked: there is no unique constraint on
day+slot and the view already rendered a list. Sea bass for the adults and
sausage and chips for the children on the same Tuesday was already
possible. What was missing is recording **who each one is for**, so the
shopping list can scale to the people actually eating.

`portion_factor` and `dietary_tags` were put on `household_members` back in
revision 8 precisely so this is one column rather than three.

### Empty means everyone, forever

Most meals in a house are for the whole house. If planning required naming
people, it would tax the common case six or seven times a day to capture
information that only matters occasionally — which for most families is
lunches. So the default is empty, and empty means everyone.

Storing "everyone ticked" as an empty array rather than a full list also
means a member added later is included automatically.

### No foreign key is possible

An array element cannot carry an FK. A member removed after a plan was made
leaves a stale id, and reading code **ignores** unknown ids rather than
treating them as a missing person. Past plans keep their record of who ate
what.

### Servings order

1. `serves_override` — the manual escape hatch, wins outright.
2. Sum of `portion_factor` across whoever it is for, **rounded up** to the
   nearest half, floored at 1.
3. The meal's own `default_serves`.

Rounding up is deliberate and asymmetric: cooking slightly too much is a
leftover, cooking slightly too little is somebody going without. A null
`portion_factor` counts as a full adult — it must never silently shrink the
shop.

### Not built, deliberately

No household view of everyone's intake, and no macro targets for children.
`role = 'child'` members are never offered targets. Handing someone a number
the app invented for them is the opposite of this project.

Migration: `migrations/013_plan_members.sql`.

---

## 0j. Revision 12 — ingredient options (01 Sep 2026)

`meal_ingredients` gains `option_group`, `is_selected`, `option_label`.

"Build your own lunch" and "swap the tuna for hummus" are the same feature:
a named slot with alternatives, one chosen. One mechanism, three columns.

| Column | Type | Notes |
|---|---|---|
| option_group | text | nullable; check length 1–40. **Null = an ordinary required ingredient** |
| is_selected | boolean | not null default true |
| option_label | text | nullable; check length 1–60. Overrides the food name for display |

Every existing row defaults to `option_group = null, is_selected = true`,
which is exactly how it behaves today. **No behaviour change** until a group
is created.

### No unique constraint on the selection

Tempting and wrong. A partial unique index on
`(meal_id, option_group) where is_selected` would make swapping two
statements with a window between them where the recipe has **no base at
all**. Under a constraint that window is a failed write; without one it is a
moment nobody sees. Enforced in application code (`selectOption` clears
siblings first, then sets).

### Two ideas kept apart

An unselected option contributes nothing to the macro totals **and is not
counted as incomplete**. It is not missing data, it is a road not taken.
Conflating them would fill the incomplete line with noise until people
stopped reading it.

Only selected options reach the shopping list, or planning one lunch would
add five things to the shop.

Migration: `migrations/012_ingredient_options.sql`.

---

## 0i. Revision 11 — method steps (01 Sep 2026)

New table **`meal_steps`**, one row per instruction, plus
`meals.method_note`. **21 tables, 21 policies, 21 triggers.**

A text column cannot be ticked off, cannot hold a timer, and cannot keep
your place when the screen locks. The requirement — small, clear,
followable steps — needs each step to be something the app knows about
individually.

`meal_steps` is **household-scoped**, because `meals` is (revision 8). A
recipe your partner wrote has to be one you can cook.

`step_number` is **not** unique-constrained. Reordering under a unique
constraint means a temporary gap or a deferred constraint, and the app
renumbers contiguously on every save anyway. Enforced in code.

`on delete cascade` on `meal_id`: steps are part of the meal, matching
`meal_ingredients` (§2).

### Ingredient tokens

`instruction` may contain `{{ing:<slugified-food-name>}}`. It resolves
against that meal's `meal_ingredients` at render time, formats through
`lib/units.js`, and scales with the serving size — so rule 3 of
`RECIPE_STEP_STYLE.md` ("restate the quantity inside the step") survives a
recipe being scaled from 4 to 6.

An unresolvable token renders as the plain name with no quantity. **Never**
as raw braces: showing `{{ing:butter}}` to someone mid-cook is worse than
showing "butter".

Migration: `migrations/011_meal_steps.sql`.

---

## 0h. Revision 10 — reference averages (01 Sep 2026)

`foods.source` CHECK widened to `('manual','openfoodfacts','reference')`.
Widening only; no existing row becomes invalid.

A food filled from `data/food_reference.json` is neither manual (nobody
typed it) nor Open Food Facts (no barcode was scanned). It is a **published
average**, and the app marks estimates as estimates, so the column has to be
able to say so.

`computeMacros()` returns `estimatedCount` and `estimatedNames` alongside
the incomplete counts. The meal card states them as a fact in the same quiet
style as everything else — an estimate is not a mistake and gets no warning
colour. Scanning the real packet rewrites `source` to `openfoodfacts` via
the Phase 11 merge, and the line disappears on its own.

Estimated figures **do** contribute to the totals. Excluding them would put
us back where Phase 13 started.

Reference data fills **blanks only**. A published average never overwrites a
figure read off a packet or typed by hand.

Migration: `migrations/010_reference_source.sql`.

---

## 0g. Revision 9 — the word for one of them (01 Sep 2026)

`foods` gains **`item_label`** — nullable `text`, the singular noun for one
item of this food.

Everything needed to say "4 tins of tomatoes, 1.6 kg" already existed.
`grams_per_item` has been there since Phase 1 and `computeMacros()` already
converts a recipe's "1 item" into 400 g correctly. The only missing piece
was the **word**, so the screen said `4 item`, which reads as broken, and
the pantry form pushed people toward grams to avoid it.

| Column | Type | Notes |
|---|---|---|
| item_label | text | nullable; check length 1–30 when present |

NULL means the generic word "item" — which is exactly what every existing
row already displays, so there is **no backfill and no behaviour change**
until a label is typed.

The length CHECK is not fussiness. This string is pluralised and
concatenated into shopping list lines; a 200-character "label" would wreck
every row it appeared in.

### Teaspoons and tablespoons add nothing to the schema

A teaspoon is 5 ml and a tablespoon is 15 ml, always. They are **display
units for ml**, in exactly the way stone/lb is a display unit for kg, and §8
forbids storing display units. So:

- No new value in any `unit` CHECK. Stored unit stays `ml`.
- Entry converts on the way in: 2 tbsp is written as `30` with unit `ml`.
- Display converts on the way out, and **only** when the stored value is an
  exact multiple of 15 or 5 and under 60 ml. 200 ml of milk stays 200 ml; it
  is not 13⅓ tbsp.

Density does the rest. Soy sauce at `grams_per_ml` 1.2 makes a tablespoon
18 g; peanut butter at 1.07 makes it 16 g. Both correct, with no
special-casing of solids.

Migration: `migrations/009_pack_labels.sql`.

---

## 0f. Revision 8 — households (01 Sep 2026)

Home-OS is being built as a product with families in it. A family shares a
cupboard, a shopping list and a meal plan. It does **not** share a weight
log.

Two new tables — `households` and `household_members` — and `household_id`
on thirteen existing ones.

### The split

**Household-scoped (13).** Access is `household_id in (select
my_household_ids())`:

`foods`, `pantry_stock`, `shopping_list_items`, `meals`, `meal_ingredients`,
`weekly_meal_plan`, `chore_projects`, `chore_tasks`,
`chore_task_completions`, `calendar_events`, `holidays`,
`holiday_checklist_items`, `holiday_purchase_items`

**Person-scoped (5).** Unchanged, still `auth.uid() = user_id`:

`weight_logs`, `water_logs`, `exercises`, `exercise_logs`, `user_settings`

Weight is the clearest case. A shared cupboard is a feature; a shared weight
log would be a betrayal of principle 1. Rehab exercises are personal medical
information and stay personal.

### `user_id` stays on all 18

On the personal five it remains the access key. On the household thirteen it
becomes **provenance** — who added this — which is worth having in a shared
house and costs nothing to keep.

### `household_members.user_id` is nullable, deliberately

A child who eats the meals and has portions planned for them is a real
member. They do not need a login. A member without an account simply cannot
sign in.

| Column | Type | Notes |
|---|---|---|
| household_id | uuid | not null, references households, on delete cascade |
| user_id | uuid | **nullable**, references auth.users, on delete cascade |
| display_name | text | not null |
| role | text | check in ('owner','adult','child'); default 'adult' |
| portion_factor | numeric | not null default 1.0; check > 0 and <= 3 |
| dietary_tags | text[] | not null default '{}' |

`unique (household_id, user_id)`.

`portion_factor` and `dietary_tags` land here now rather than in Phase 20,
because adding two columns to a table created in this migration is free and
a second migration over the same table is not.

### Inserts still pass nothing

`household_id` carries `default my_household_id()`, exactly mirroring
`default auth.uid()` on `user_id`. The standing rule — **no `user_id` on
inserts, RLS supplies it** — now covers `household_id` too, and no data
module changed shape.

### `my_household_ids()` is SECURITY DEFINER, and that is load-bearing

`household_members` carries a policy expressed in terms of this function.
Without definer rights the policy consults the function, which consults the
policy, and Postgres raises infinite recursion. `search_path` is pinned,
because a definer function with a mutable search path is a
privilege-escalation hole. `STABLE` lets the planner evaluate it once per
statement rather than once per row.

### Every shared table is indexed on `household_id`

Not optional. Without it every policy check is a sequential scan through the
subquery, on every read, on every screen.

### Signup creates a household of one

A trigger on `auth.users`, not client code. A client that fails halfway
leaves an account belonging to no household, and no household means
`my_household_ids()` returns empty, which denies everything. The account
would be alive and unable to see a single row.

### What the SQL editor cannot prove

`auth.uid()` is null in the Supabase SQL editor and RLS is bypassed there.
The verification query proves **structure** only. Household isolation must
be proven from two real signed-in accounts — see PHASE18_HANDOFF.md.

Migration: `migrations/008_household_foundation.sql`, verified with
`008_household_foundation_VERIFY.sql`.

---

## 0e. Revision 7 — a real use-by date (27 Aug 2026)

`pantry_stock` gains **`use_by`** — a nullable `date`.

`shelf_life_days` is a guess dressed as data: 365 days from whenever you
happened to stock it. The jar has the real answer printed on it.

**Both are kept, and freshness prefers the fact:**

| State | Reads as |
|---|---|
| `use_by` present | "Use by 3 September — 7 days left" |
| `use_by` absent | "Stocked today — about 365 days left" |

**The two must never read the same.** That wording is not decoration: the
moment an estimate is displayed as a hard date it gets trusted in front of
an open fridge. "About" is doing real work in that sentence.

**Deliberately not backfilled.** Filling `use_by` with
`last_restocked + shelf_life_days` would store a fabricated date that is
then indistinguishable from one read off a label — and it would flow into
the shopping shortfall, where "this expires before you would cook it" would
rest on a number the app invented. NULL means "not recorded", exactly as it
does for `current_qty`.

A CHECK refuses a use-by earlier than `last_restocked`; that is a typo, not
a fact. A partial index on non-null `use_by` serves "what is going off
soon", which is asked on every pantry load.

---

## 0d. Revision 6 — things to DO on holiday (26 Aug 2026)

A holiday now has three lists: things to **buy**, things to **pack**, and
things to **do** while you are there.

`holiday_checklist_items` gains **`kind`** — `pack` / `do`, not null,
**default `pack`**, CHECK-constrained.

**Why a column rather than a third table.** Buying is genuinely different:
`holiday_purchase_items` carries `send_to_shopping`, which bridges into the
shopping list, and nothing else does. Packing and doing are the *same
shape* — a title and whether it is done. A separate table would mean a
fourth RLS policy, a fourth trigger, a fourth branch in every loader, and
two code paths that must be kept identical forever.

**`default 'pack'` is what makes it safe**: every row written before now was
a packing item, and that is exactly what it stays.

**The table name becomes historical** — it now holds two kinds of checklist.
Not renamed, for the same reason `quantity_g` was not in revision 4: a
rename breaks any client still running cached JavaScript from before the
deploy, and additive-only is the property that has kept every migration here
safe. Recorded as debt.

---

## 0c. Revision 5 — occurrences and classification (26 Aug 2026)

Three additions, driven by the app finally being used with real data.

### `chore_task_completions` — the first new TABLE since Phase 1

Completing a repeating chore marked **the task** complete, not **this
occurrence**. With four chores nobody notices; with a dashboard driving the
day it is fatal — clean the fridge on 1 September and the whole series reads
as done forever, because there was nowhere to record that one occurrence
happened.

A completion is a fact about *a task on a date*, not a property of the task,
so it gets its own row:

| Column | Type | Notes |
|---|---|---|
| task_id | uuid | not null; references chore_tasks(id) **on delete cascade** |
| occurrence_date | date | not null |
| completed_at | timestamptz | not null; default now() |

**`unique (task_id, occurrence_date)` is the point of the table.** Ticking
the same occurrence twice — a double tap, or an offline replay landing after
the live write — must be harmless rather than a second row.

"Is this due today?" becomes a question with an answer instead of a guess,
and history comes for free.

### `meals.is_favourite` — boolean, not null, default false

A recipe list grows and is never re-sorted by hand. Without this, reaching a
weeknight regular means scrolling past everything ever entered — the failure
the pantry hit at seven items. Not-a-favourite is the honest state of every
existing row, and a nullable boolean would give three meanings to a
two-state fact.

### `meals.meal_type` — nullable text, CHECK breakfast/lunch/dinner/snack/drink

**Distinct from `weekly_meal_plan.slot`, which already exists and means
something else.** Slot is where a meal sits in one week; meal_type is what
the recipe inherently *is*. Porridge is a breakfast whether or not it is
planned for Tuesday, and eating it at 9pm does not reclassify it. Conflating
them would mean planning a meal for dinner silently rewrote the recipe.

**Nullable on purpose**: "not said yet" is a real state and every existing
recipe is in it. Defaulting to `dinner` would invent an answer, and a
half-filled classification filters worse than none.

`drink` is a valid meal_type but is **not** added to
`weekly_meal_plan.slot`. Widening that CHECK is a separate decision with its
own consequences for the planner grid.

### Deliberately NOT added: a chore cadence column

Daily / weekly / monthly / seasonal is already fully determined by
`chore_tasks.recurrence_rule` — FREQ plus INTERVAL. Storing it as well
creates two sources for one fact that can silently disagree the moment a
rule is edited. It is derived in `js/lib/rrule.js`, where the rule is
already parsed. **Seasonal means MONTHLY with an interval of three or more.**

---

## 0b. Revision 4 — units on recipe ingredients (21 Aug 2026)

Revision 3 gave the pantry and shopping list units and stopped there.
Recipes were left grams-only, which is not how anyone cooks: "200 g of milk"
is wrong, and `item` is just as common — 2 eggs, 1 onion, 3 rashers. The
ingredient form could not express most real recipes.

**And the consequence had to be solved in the same breath.** Nutrition is
stored per 100 **grams**. The moment an ingredient is in ml or items, the
macro maths has nothing to work from.

Three additions, all purely additive:

1. `meal_ingredients.unit` — `g`/`ml`/`item`, default `g`.
2. `foods.grams_per_ml` — nullable. Milk ~1.03, oil ~0.92, water 1.0.
3. `foods.grams_per_item` — nullable. One egg ~60 g, one onion ~150 g.

**A missing conversion factor makes the ingredient INCOMPLETE, never
guessed.** This reuses the existing "N of M ingredients have no nutrition
data" machinery rather than inventing a second failure mode. Nothing is
assumed: 1 ml of water is 1 g, oil is about 0.9, flour is neither, and a
plausible-looking wrong total is worse than an admitted gap.

The same factors let Phase 7's shortfall compare a pantry stocked in `ml`
against a recipe in `g` — again, only where the factor is known.

**`quantity_g` is deliberately NOT renamed**, even though the name becomes
historical once it can hold ml. A rename would break any client still
running cached JavaScript from before the deploy, and this app is
offline-first with an aggressive precache. **Additive-only is the property
that has made every migration here safe**, and it is worth more than a tidy
column name. Recorded as debt.

---

## 0. Revision 3 — the shopping revision (21 Aug 2026)

The **first schema change since Phase 1**, and the reasoning matters more
than the columns.

Phases 1–8 were built against a frozen schema, and the freeze was right: it
forced workarounds to be recorded rather than the schema to sprawl. Two of
those workarounds were then found to rest on a false assumption, and a third
would have been built on top of it in Phase 7.

**The false assumption: that `foods` is what a supermarket shop is made of.**
It is not. A real shop is shampoo, toilet roll, light bulbs, guinea pig
bedding, birthday cards, razors and batteries. `shopping_list_items.food_id`
was `not null references foods(id)`, so none of those could be listed at
all — and the only schema-legal route, inventing a `foods` row for shower
gel, would have put shower gel in the meal planner's ingredient picker.

**The consequence: grams are not a universal unit.** Phase 7's brief locked
"all quantities are grams" because it was the only reading the frozen schema
supported. You do not buy 400 g of light bulbs. Quantities need a unit.

So `foods` becomes *things you buy*. Its nutrition columns were already
nullable, so a light bulb is simply a row with a name, a barcode and no
macros. What was missing was a way to say **what kind of thing it is**, so
non-food can be kept out of ingredient pickers.

Three additions, all non-destructive — every column has a default, nothing
is dropped or renamed, and every existing row stays valid:

1. `foods.category` — nine values, splitting food by **storage state**
   (fresh / frozen / ambient), because that is what actually determines
   shelf life. A single `food` value would have lumped fresh salmon with
   tinned beans and made expiry meaningless.
2. `unit` on `pantry_stock` and `shopping_list_items` — `g` / `ml` / `item`.
   `item` is what makes non-food work: 3 light bulbs, 1 shower gel.
3. `pantry_stock.last_restocked` — a real date, replacing the `updated_at`
   proxy for near-expiry. The proxy was wrong whenever a row was edited for
   an unrelated reason, such as fixing a typo in its location.

**`household` vs `home` is consumable vs durable.** Cleaning products,
toilet roll and foil are `household` — you restock them. Cleaning
equipment, light bulbs, batteries and stationery are `home` — you replace
them when they die. That is the test for anything new.

**Known debt, deliberately not fixed here:** the table is still named
`foods` while holding razors. Renaming is clean in Postgres but would churn
every data module, every test fixture and every doc — and Phase 6 is built
but not yet smoke-tested, so this is the wrong moment. Recorded, not
forgotten.

**Phase 6 is unaffected.** Nothing in Phase 6 reads `category`, and the
column arrives with a default, so foods added through the meals screen land
as `food_ambient` until Phase 7 provides a picker. The Phase 6 smoke test
remains valid and does not need re-running because of this.

---

## 1. Conventions that apply to every table

Do not restate these per-table; they are universal:

- **`id uuid primary key default gen_random_uuid()`**.
- **`user_id uuid not null default auth.uid() references auth.users(id)`**.
  The default means inserts never pass `user_id`; RLS still enforces it.
- **`created_at timestamptz not null default now()`** — set once on insert.
- **`updated_at timestamptz not null default now()`** — auto-maintained by
  the `set_updated_at` trigger (§5). This is the column offline sync uses to
  resolve which version of a row is newest.
- **RLS enabled**, exactly one policy per table (§4). Never `WITH CHECK (true)`.
- Enum-style `text` columns always carry a `CHECK` constraint.

## 2. Foreign-key deletion rules (fixed)

| Relationship | On delete | Why |
|---|---|---|
| exercise_logs → exercises | **cascade** | a log is meaningless without its exercise |
| meal_ingredients → meals | **cascade** | ingredients are part of the meal |
| holiday_checklist_items → holidays | **cascade** | belong to the holiday |
| holiday_purchase_items → holidays | **cascade** | belong to the holiday |
| chore_tasks → chore_projects | **restrict** | deleting a project with tasks must be deliberate |
| meal_ingredients → foods | **restrict** | a food used in a recipe must not vanish |
| pantry_stock → foods | **restrict** | as above |
| shopping_list_items → foods | **restrict** | as above |
| weekly_meal_plan → meals | **restrict** | a planned meal must not disappear from the week |

**App-layer rule:** every delete gets a confirm step. For `restrict`
relationships the confirm reports the dependent count ("used in 3 meals —
remove anyway?"). For `cascade` the confirm names what else goes ("this also
removes 4 checklist items"). This is behavioural principle 9 made literal —
nothing is ever deleted silently.

`calendar_events.source_id` is **not** a foreign key — it is a nullable
`uuid` pointing at a row in whichever table `event_type` names, resolved in
application code.

---

## 3. Tables

Columns below are *in addition to* the universal `id`, `user_id`,
`created_at`, `updated_at` from §1.

### exercises
| Column | Type | Constraint / notes |
|---|---|---|
| name | text | not null |
| side | text | check in ('left','right','both'); nullable |
| target_reps | int | |
| target_sets | int | |
| instructions | text | |
| youtube_search_query | text | search terms only — link built at render time, never stored as URL |
| body_region | text | e.g. 'glute', 'hamstring', 'core' |
| source | text | not null; check in ('physio','suggested') |
| clearance_status | text | not null; check in ('cleared','pending_confirmation'); default 'pending_confirmation' |

Physio-sourced = set `cleared` by the app on insert. Anything an AI session
adds stays `pending_confirmation` until the user clears it (principle 6).

### exercise_logs
| Column | Type | Notes |
|---|---|---|
| exercise_id | uuid | not null; references exercises(id) **on delete cascade** |
| log_date | date | not null |
| completed | boolean | default false |
| notes | text | |

### chore_projects
| Column | Type | Notes |
|---|---|---|
| title | text | not null |
| colour | text | not null; hex string |
| sort_order | int | default 0 |

### chore_tasks
| Column | Type | Notes |
|---|---|---|
| project_id | uuid | not null; references chore_projects(id) **on delete restrict** |
| title | text | not null |
| details | text | |
| is_repeatable | boolean | default false |
| recurrence_rule | text | RRULE string |
| status | text | check in ('pending','complete'); default 'pending' |
| completed_at | timestamptz | |

### chore_task_completions
| Column | Type | Notes |
|---|---|---|
| task_id | uuid | not null; references chore_tasks(id) **on delete cascade** |
| occurrence_date | date | not null |
| completed_at | timestamptz | not null; default now() |

**`unique (task_id, occurrence_date)`** — one row per occurrence actually
done. Re-ticking is harmless rather than duplicated. Added in revision 5.

### calendar_events
| Column | Type | Notes |
|---|---|---|
| event_type | text | not null; check in ('chore','holiday','work_location','custom') |
| source_id | uuid | nullable soft pointer (see §2), **not** a FK |
| title | text | not null |
| start_date | date | not null |
| recurrence_rule | text | RRULE string |
| location_label | text | |

### weight_logs
| Column | Type | Notes |
|---|---|---|
| log_date | date | not null |
| weight_kg | numeric | not null; **canonical unit kg** — stone/lb is display only |
| target_weight_kg | numeric | |
| target_date | date | |

### water_logs
| Column | Type | Notes |
|---|---|---|
| log_date | date | not null |
| ml_logged | int | not null; **canonical unit millilitres** |

### foods

Despite the name, this is **anything you buy**, not only food (see §0).
Nutrition columns are nullable throughout: a light bulb is a row with a name
and no macros. `category` is what keeps non-food out of ingredient pickers.

| Column | Type | Notes |
|---|---|---|
| name | text | not null |
| barcode | text | nullable |
| category | text | not null; check in the 9 values below; default `'food_ambient'` |
| calories_per_100g | numeric | **canonical unit kcal per 100 g** |
| grams_per_ml | numeric | nullable; `> 0`. How many grams one millilitre weighs (milk ~1.03, oil ~0.92). **Null means ml cannot be converted** — the ingredient is reported incomplete, never guessed |
| item_label | text | nullable; singular noun for one item ('tin', 'egg', 'slice'). NULL reads as "item" (revision 9) |
| grams_per_item | numeric | nullable; `> 0`. How many grams one item weighs (egg ~60, onion ~150). Same rule when null |
| protein_g | numeric | **per 100 g** |
| fat_g | numeric | **per 100 g** |
| carbs_g | numeric | **per 100 g** |
| source | text | check in ('manual','openfoodfacts','reference'); default 'manual' (revision 10) |

**`category` values** (order is display order; `other` sits last so it does
not become the lazy default):

| Value | Covers |
|---|---|
| `food_fresh` | fruit, veg, meat, fish, dairy, bakery |
| `food_frozen` | anything from the freezer aisle |
| `food_ambient` | dried, tinned, jarred, packets, herbs, snacks, bars |
| `drink` | tea, coffee, squash, bottles, cans |
| `household` | **consumable**: cleaning products, toilet roll, kitchen roll, foil, bin bags |
| `personal` | shower gel, shampoo, conditioner, toothpaste, razors, shaving gel, deodorant, hair products |
| `home` | **durable**: light bulbs, fuses, batteries, kitchen equipment, cleaning equipment, cards, stationery |
| `pet` | pet food, bedding, hay, litter |
| `other` | anything genuinely uncategorised |

Meal-ingredient pickers must filter to `food_fresh`, `food_frozen`,
`food_ambient` and `drink`. Offering shower gel mid-recipe is the failure
this column exists to prevent.

### meals
| Column | Type | Notes |
|---|---|---|
| name | text | not null |
| method_note | text | nullable — the one-line caveat belonging to no single step (revision 11) |
| cuisine | text | nullable; free text, no CHECK — the set is open (revision 14) |
| budget_tier | text | nullable; check in ('budget','everyday','special') (revision 14) |
| default_slot | text | nullable; check in ('breakfast','lunch','dinner','snack') (revision 14) |
| dietary_tags | text[] | not null default '{}'; what the meal IS (revision 14) |
| library_ref | text | nullable; seed slug, stops a recipe being added twice (revision 14) |
| default_serves | int | not null; default 4 |
| is_favourite | boolean | not null; default false (revision 5) |
| meal_type | text | nullable; check in ('breakfast','lunch','dinner','snack','drink') (revision 5) — what the recipe IS, not where it is planned |

### meal_ingredients

**`quantity_g` is a historical name.** Since revision 4 it holds a quantity
in whatever `unit` says — grams, millilitres or items. It was not renamed
because a rename breaks clients running cached JavaScript, and additive-only
migrations are what have kept this app safe. Read `unit` before using it.

| Column | Type | Notes |
|---|---|---|
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
| meal_id | uuid | not null; references meals(id) **on delete cascade** |
| option_group | text | nullable; check length 1–40. **Null = ordinary required ingredient** (revision 12) |
| is_selected | boolean | not null default true; exactly one true per group, enforced in code (revision 12) |
| option_label | text | nullable; check length 1–60; overrides the food name for display (revision 12) |
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| quantity_g | numeric | not null |

### weekly_meal_plan
| Column | Type | Notes |
|---|---|---|
| meal_id | uuid | not null; references meals(id) **on delete restrict** |
| day_of_week | text | not null; check in ('mon','tue','wed','thu','fri','sat','sun') |
| slot | text | not null; check in ('breakfast','lunch','dinner','snack') |
| member_ids | uuid[] | not null default '{}'. **Empty = everyone.** No FK possible; unknown ids ignored on read (revision 13) |
| serves_override | int | nullable; overrides meals.default_serves for this instance (principle 5) |

### pantry_stock

Holds **non-food as well as food** — 3 spare light bulbs is a legitimate row.

| Column | Type | Notes |
|---|---|---|
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| default_location | text | which cupboard. Distinct from `foods.category`: category is *what the thing is*, location is *where it lives*, and non-food needs locations like "bathroom cabinet" and "garage" |
| level_set_at | timestamptz | nullable; when `level` was last set. NOT `updated_at`, which moves on any edit (revision 19) |
| level | text | nullable, no default; check in ('plenty','low','none'). NULL = nothing said, which is not 'none' (revision 18) |
| reorder_at | numeric | nullable, no default; check >= 0. Null = never remind (revision 17) |
| shelf_life_days | int | the ESTIMATE — how long it usually keeps once bought. Used only when `use_by` is null |
| use_by | date | nullable (revision 7). The FACT, read off the label. Never backfilled from restocked + shelf life |
| current_qty | numeric | **nullable — NULL means "amount not recorded"**, which is distinct from 0 ("you have none"). Interpret with `unit` |
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
| last_restocked | date | nullable. When it was actually bought. **Near-expiry is `last_restocked + shelf_life_days`** — never `updated_at`, which moves whenever the row is edited for any reason |

### shopping_list_items
| Column | Type | Notes |
|---|---|---|
| food_id | uuid | not null; references foods(id) **on delete restrict** |
| qty_needed | numeric | **interpret with `unit`** |
| unit | text | not null; check in ('g','ml','item'); default `'g'` |
| source | text | not null; check in ('usual','meal_plan','holiday') |
| status | text | check in ('needed','have','bought'); default 'needed' |

`food_id` stays `not null`: with `foods` now covering everything you buy,
every list item has a real row behind it. A holiday purchase item reaches
the list by creating (or matching) a `foods` row with the right `category` —
"sun cream" is `personal`, not an invented food.

### holidays
| Column | Type | Notes |
|---|---|---|
| title | text | not null |
| start_date | date | not null |
| end_date | date | not null |

### holiday_checklist_items
| Column | Type | Notes |
|---|---|---|
| holiday_id | uuid | not null; references holidays(id) **on delete cascade** |
| title | text | not null |
| status | text | check in ('pending','complete'); default 'pending' |
| kind | text | not null; default 'pack'; check in ('pack','do') (revision 6) — packing list vs things to do there |

### holiday_purchase_items
| Column | Type | Notes |
|---|---|---|
| holiday_id | uuid | not null; references holidays(id) **on delete cascade** |
| title | text | not null |
| status | text | check in ('pending','complete'); default 'pending' |
| send_to_shopping | boolean | default false |

### user_settings
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | **unique** — one settings row per user (adds `unique` to the universal definition) |
| theme | text | default 'default' |
| contrast_mode | text | default 'standard' |
| brightness_pref | text | default 'standard' |
| density | text | not null; check in ('comfortable','compact'); default 'comfortable' (revision 15) |
| onboarded_at | timestamptz | nullable, no default. Null = not yet (revision 16) |
| weight_unit_display | text | check in ('stone_lb','kg'); default 'stone_lb' |
| notification_prefs | jsonb | default '{}'::jsonb — every notification type off by default (principle 8) |

App **upserts** this single row, keyed on the unique `user_id`. Settings
apply immediately, no save step (principle 7).

### households
| Column | Type | Notes |
|---|---|---|
| name | text | not null, default 'My household' |

No `user_id`. Membership is what grants access, and it lives in
`household_members`. Access policy keys on `id in (select
my_household_ids())` rather than on the universal owner pattern.

### household_members
| Column | Type | Notes |
|---|---|---|
| household_id | uuid | not null, references households, on delete cascade |
| user_id | uuid | **nullable**, references auth.users, on delete cascade — a member does not need a sign-in |
| display_name | text | not null |
| role | text | not null, check in ('owner','adult','child'); default 'adult' |
| portion_factor | numeric | not null default 1.0; check > 0 and <= 3 |
| dietary_tags | text[] | not null default '{}' |

`unique (household_id, user_id)`.

**`household_id` is passed explicitly on insert here**, and only here. This
row *defines* membership rather than depending on it, so the column
deliberately carries no `my_household_id()` default — a default would be
circular. Everywhere else the standing rule holds: inserts pass nothing.

`portion_factor` scales the shopping list, never a nutrition target.
Members with `role = 'child'` are not offered macro targets at all
(Phase 20).

### household_invites
| Column | Type | Notes |
|---|---|---|
| household_id | uuid | not null, default my_household_id(), on delete cascade |
| created_by | uuid | not null, default auth.uid() |
| code | text | not null, **unique**; check length 6–12 |
| expires_at | timestamptz | not null, default now() + 7 days |
| redeemed_at | timestamptz | nullable; non-null means used |
| redeemed_by | uuid | nullable, references auth.users |

Redemption is **not** a direct insert. It goes through
`redeem_household_invite(text)`, SECURITY DEFINER with a pinned
`search_path`, which returns a reason string and never the row.

### meal_steps
| Column | Type | Notes |
|---|---|---|
| household_id | uuid | not null, default my_household_id() (revision 8 pattern) |
| meal_id | uuid | not null, references meals, **on delete cascade** |
| step_number | int | not null; contiguous from 1, renumbered in code, **not** unique-constrained |
| instruction | text | not null; check length 1–300 |
| note | text | nullable — why, what it looks like, what to do if wrong. Kept out of the instruction |
| duration_min | int | nullable; check 1–1440. Drives the timer button |
| step_group | text | nullable — 'Prep', 'Sauce', 'To serve' |
| while_waiting | boolean | not null default false — rule 2, no "meanwhile" |

Style is canonical in `RECIPE_STEP_STYLE.md` and applies to every recipe in
the app, seeded or typed.

---

## 4. Row-level security

**Two patterns since revision 8.** Which one a table uses is not a
judgement call — see the lists in §0f.

**Household-scoped (13 tables):**

```sql
alter table <table_name> enable row level security;

create policy "household access only"
on <table_name>
for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));
```

**Person-scoped (5 tables), plus `households` and `household_members`
which key on their own id:**

```sql
create policy "owner access only"
on <table_name>
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

20 tables → 20 policies. **Never `WITH CHECK (true)`.**

---

## 5. updated_at trigger

One shared function, one trigger per table (full DDL in §6):

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at
before update on <table_name>
for each row execute function set_updated_at();
```

---

## 6. Full DDL (paste target for Phase 1)

Run in order in the Supabase SQL editor.

```sql
-- 1. tables ---------------------------------------------------------------

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  side text check (side in ('left','right','both')),
  target_reps int,
  target_sets int,
  instructions text,
  youtube_search_query text,
  body_region text,
  source text check (source in ('physio','suggested')) not null,
  clearance_status text check (clearance_status in ('cleared','pending_confirmation')) not null default 'pending_confirmation'
);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  log_date date not null,
  completed boolean default false,
  notes text
);

create table chore_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  colour text not null,
  sort_order int default 0
);

create table chore_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references chore_projects(id) on delete restrict,
  title text not null,
  details text,
  is_repeatable boolean default false,
  recurrence_rule text,
  status text check (status in ('pending','complete')) default 'pending',
  completed_at timestamptz
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_type text check (event_type in ('chore','holiday','work_location','custom')) not null,
  source_id uuid,
  title text not null,
  start_date date not null,
  recurrence_rule text,
  location_label text
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  log_date date not null,
  weight_kg numeric not null,
  target_weight_kg numeric,
  target_date date
);

create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  log_date date not null,
  ml_logged int not null
);

create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  barcode text,
  calories_per_100g numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  category text not null default 'food_ambient'
    check (category in ('food_fresh','food_frozen','food_ambient','drink',
                        'household','personal','home','pet','other')),
  source text check (source in ('manual','openfoodfacts')) default 'manual'
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  default_serves int not null default 4
);

create table meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid not null references foods(id) on delete restrict,
  quantity_g numeric not null
);

create table weekly_meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references meals(id) on delete restrict,
  day_of_week text not null check (day_of_week in ('mon','tue','wed','thu','fri','sat','sun')),
  slot text check (slot in ('breakfast','lunch','dinner','snack')) not null,
  serves_override int
);

create table pantry_stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  food_id uuid not null references foods(id) on delete restrict,
  default_location text,
  shelf_life_days int,
  current_qty numeric default 0,
  unit text not null default 'g' check (unit in ('g','ml','item')),
  last_restocked date
);

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  food_id uuid not null references foods(id) on delete restrict,
  qty_needed numeric,
  unit text not null default 'g' check (unit in ('g','ml','item')),
  source text check (source in ('usual','meal_plan','holiday')) not null,
  status text check (status in ('needed','have','bought')) default 'needed'
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  start_date date not null,
  end_date date not null
);

create table holiday_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  holiday_id uuid not null references holidays(id) on delete cascade,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending'
);

create table holiday_purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  holiday_id uuid not null references holidays(id) on delete cascade,
  title text not null,
  status text check (status in ('pending','complete')) default 'pending',
  send_to_shopping boolean default false
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  theme text default 'default',
  contrast_mode text default 'standard',
  brightness_pref text default 'standard',
  weight_unit_display text check (weight_unit_display in ('stone_lb','kg')) default 'stone_lb',
  notification_prefs jsonb default '{}'::jsonb
);

-- 2. updated_at trigger ---------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at before update on exercises               for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on exercise_logs           for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on chore_projects          for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on chore_tasks             for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on calendar_events         for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on weight_logs             for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on water_logs              for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on foods                   for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on meals                   for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on meal_ingredients        for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on weekly_meal_plan        for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on pantry_stock            for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on shopping_list_items     for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holidays                for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holiday_checklist_items for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on holiday_purchase_items  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on user_settings           for each row execute function set_updated_at();
```

RLS statements (§4) are run separately in Phase 1, once per table.

---

## 7. Changes from Phase 1 SQL v1

1. **Table count corrected to 17** (v1 said 16 twice, listed 17).
2. **`default auth.uid()` on every `user_id`** — simpler, safer inserts.
3. **`created_at` on every table** (was inconsistent).
4. **`updated_at` on every table + `set_updated_at` trigger** — offline
   sync conflict resolution, baked in from Phase 1.
5. **Explicit `on delete` on every FK** per §2.
6. **`weekly_meal_plan.day_of_week` check constraint** (was free text).

No columns removed or renamed.

---

## 8. Canonical units (never store display units)

- Weight in **kg** (`weight_kg`); stone/lb is display only.
- Water in **millilitres** (`ml_logged`).
- Food macros per **100 g**.

Everything shown differently is converted at render time from these
canonical values, driven by `user_settings`. Nothing display-formatted is
written back.
