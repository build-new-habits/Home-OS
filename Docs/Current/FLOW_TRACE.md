# Home-OS: Flow Trace — what actually happens
01 Sep 2026 v1

Traced against the code at commit `ef140c6`, not from memory. Where a flow
does not do what you would expect, it says so.

---

## 1. Creating a recipe ✅ works

**Meals → "Add a meal"** → `createMeal()` writes name + default_serves.

**Add ingredients.** The picker (`foodPicker`) has a text filter above a
`<select>` grouped by category, so it narrows as you type. If the food is
not in your list, "It is not on the list yet" creates it inline without
leaving the form.

**Phase 13** offers typical values if the name matches one of 210 reference
foods — one tap fills weight and macros.

**Phase 11** asks for a weight if you pick ml or items and the food has no
conversion factor. Saved to the food, so every recipe benefits.

**Phase 15** adds method steps, with the live style checker.

The recipe now sits in Meals, ready to be pulled into a plan. **This flow is
sound.**

---

## 2. Plan → shopping list ⚠️ NOT automatic

**This is the biggest gap between the app and your mental model.**

You expect: put a meal in the plan → the shopping list updates.

What happens: putting a meal in the plan writes one `weekly_meal_plan` row
and **nothing else**. The shopping list does not change. You have to go to
Shopping and press **"Rebuild from my plan"**, which then runs
`computeShortfall()` across the whole week and replaces every
`source = 'meal_plan'` row.

So the trigger exists and works correctly — it is just on the wrong screen,
behind a button you have to know about.

### Why it was built that way, and whether that still holds

`replaceGeneratedItems()` **replaces** all generated rows rather than adding
to them. That is right: if you remove a meal from the plan, the things it
needed should come off the list. A per-add trigger would need to be a
recompute anyway.

The real reason it is manual is that recomputing on every plan change means
a full read of plan + ingredients + pantry + foods on each tap while you are
laying out a week — six or seven times in a minute.

**But that is solvable**, and the current behaviour is worse: a shopping
list that silently disagrees with your plan is exactly the thing this app is
supposed to prevent.

**Recommendation.** Recompute automatically, debounced, when the meal plan
screen is left or after a few seconds of no changes, and show a line on the
plan screen: *"Shopping list updated — 6 things to buy."* Keep the manual
button for when you want it now.

---

## 3. Planning from existing recipes ✅ works (same manual trigger)

Meal plan → choose a day and slot → pick from your meals (favourites first)
→ `addPlanEntry()`.

**Phase 20** then decides servings: `serves_override` if set, otherwise the
sum of `portion_factor` for whoever it is for, rounded up. Empty member list
means everyone.

`computeShortfall()` scales each meal by that number, compares against
`pantry_stock`, and writes only the gaps. Unrecorded amounts are **not**
treated as zero.

Same caveat as flow 2: it runs when you press the button, not when you plan.

---

## 4. Scan → fills the recipe ✅ works, one gap

Scan an unknown barcode in the **Pantry** → Open Food Facts lookup → if
nothing matches, the **claim step** offers unbarcoded foods you are already
expecting (on the shopping list, or in this week's meals), ranked by name.

Tap the right one and it **merges into that existing row** — barcode,
macros, pack size. The row id never changes, so every recipe pointing at it
fills in immediately. Marking something bought also puts it in the pantry.

**The gap:** the claim step is only wired into the Pantry scan. The Foods
screen has its own scan path and still creates a new row. Logged, not fixed.

---

## 5. Daily and weekly macros ❌ does not exist

Macros exist **per recipe** only: totals and per-serving, with counts of
incomplete and estimated ingredients. There is no daily view, no weekly
view, and nothing on Health.

### The honest problem underneath

The app knows what you **planned** to eat. It does not know what you **ate**.
There is no meal log. `weekly_meal_plan` is an intention, and intentions and
consumption diverge constantly.

So there are two different features here:

**A. Planned macros** — sum the plan for a day or week, scaled by servings
and portion factor. Cheap, honest if labelled as *planned*, and genuinely
useful for "does this week look roughly how I want it to". No schema change:
everything needed already exists.

**B. Eaten macros** — needs a `meal_log` table and a tap per meal. More
accurate, much more friction, and the kind of daily-logging burden that
people abandon in three weeks.

**Recommendation: build A, and label it "planned" everywhere.** Never let it
read as a record of what you ate. If B is ever wanted, the honest version is
a single "ate this" tick on a planned meal, not a separate food diary.

A per-day macro strip on the meal plan is probably better than a Health page
— it is where the decisions get made.

---

## 6. Finding things in the pantry ⚠️ real usability problem

Your reaction was right. Tracing it:

The Pantry has three modes behind a segmented control: **Capture**, **What's
in**, **Find something**. It opens in **Capture** — the add form.

- **Capture** leads with adding stock, which is right when you are unpacking
  shopping and wrong the rest of the time.
- **What's in** groups by location, one open at a time. Reasonable, but only
  if your locations are set. Anything without one falls into "No location
  recorded", which for a new pantry is *everything* — so it reads as one
  enormous list.
- **Find something** has exactly what you want (text search, category,
  location) but you have to know the mode switcher exists to reach it.

**The problems, in order:**

1. **Wrong default mode.** Most visits are "have I got X", not "add stock".
2. **Search is a mode, not a persistent control.** Search should be at the
   top of the pantry always, not somewhere you switch to.
3. **"No location recorded" swallows everything** until locations are set,
   and nothing prompts you to set them.

**Recommendation.** One screen: a search box pinned at the top, then the
location groups, then Add behind a button. Delete the mode switcher.

---

## Is this usable by neurodivergent people?

Partly by design, and better than most. But there are real gaps, and the
honest answer is "the foundations are good, the surface is not finished".

### What is genuinely good

- **One action per step**, ≤20 words, enforced by a gate — not a guideline.
- **A clock time AND a finish signal** on every cooking step, so the step
  works whether you track time well or not.
- **Cook mode keeps your place** through a screen lock, a call, a reload.
  Losing your place because you answered the door is precisely the failure
  this design targets.
- **No shaming language**, enforced: "simply", "just", "obviously",
  "quickly", "easy" fail the build.
- **Unknown is never treated as failure.** An unrecorded pantry amount does
  not demote a recipe; it says *"assumes you have rice"*.
- **Constrained controls** for constrained sets, so you cannot type
  something invalid and find out later.
- **Explicit state**: filter counts on buttons, so hidden state is never
  silent.

### What is not good enough yet

1. **Too many screens for one task.** Plan a meal → different screen to
   rebuild the list → different screen to check the pantry. Every hop is a
   place to lose the thread. This is the single biggest accessibility
   problem in the app, and it is the same finding as flow 2 and flow 6.
2. **Hidden mode switchers** (pantry) and **panels that must be opened**
   (library, method, diners). Discoverability is poor.
3. **No task-level entry point.** There is no "I want to plan next week"
   path that walks you through it. You have to know the sequence.
4. **Long undifferentiated lists** once real data arrives.
5. **No undo.** Confirm dialogs, but no way back after a mistake.

---

## Can it be a high-quality product?

Yes, and the parts that are hardest to retrofit are already right: the data
model, RLS from day one, household scoping, offline behaviour, accessibility
gates, and a test harness that has caught four real defects in this session
alone.

What is missing is **finish**, and it is mostly one theme: **the app is
built as a set of correct screens rather than as a set of tasks.**

The three changes with the most effect, in order:

1. **Automatic shopping list.** Removes the single biggest "why is this
   wrong" moment.
2. **Pantry search always visible; kill the mode switcher.**
3. **A "plan the week" flow** that goes plan → what you need → list, in one
   place, without you knowing which screen does what.

Then: planned macros on the plan screen, undo on destructive actions, and a
visual pass on typography and spacing.

Those are roughly three phases. None needs a schema change.
