# Home-OS: Competitive Position
01 Sep 2026 v1

Researched September 2026. Written to be useful, not flattering.

---

## The market splits in two, and nobody bridges it

**Neurodivergent-first apps.** Tiimo (iPhone App of the Year 2025, ~1M
users), Chore Focus, Inflow, RoutineFlow, Univi. These are genuinely good at
executive-function support: visual timelines, time made perceivable, gentle
transitions, no productivity shaming.

**They are schedulers and chore apps.** Not one of them does meal planning,
pantry inventory, or a shopping list. Tiimo plans *days*, and reviewers
consistently note it has no project or domain depth.

**Kitchen apps.** Cooklist, KitchenPal, Grocy, Pantryfy, Samsung Food,
MealBoard, NoWaste, FoodiePrep. Strong on pantry tracking, barcode scanning,
recipe volume, aisle-sorted lists.

**They are built for organised neurotypical users.** Dense lists,
feature-heavy settings, and an assumption that you will keep an inventory
accurate by discipline. Reviews of this whole category repeat one failure
mode: *"keeping quantities accurate takes discipline."*

**Home-OS sits in the gap between them**, and that gap is the whole
opportunity. Nobody is building kitchen and household logistics *to
neurodivergent design standards*.

---

## Where we already win

These are real, and mostly not copyable in a sprint.

**1. Cook mode with enforced step quality.** No competitor found does this.
`RECIPE_STEP_STYLE.md` is enforced by a build gate: one action per step,
≤20 words, a clock time AND a finish signal, no "meanwhile". Progress
survives a screen lock, a phone call, a reload. Recipe apps show you a wall
of prose; we show you one instruction.

**2. No-shame framing, enforced in CI.** "Simply", "just", "obviously",
"quickly", "easy" fail the build. Everyone else says they are ND-friendly;
we have a test.

**3. Honest data.** Unknown is never treated as zero. Estimates are labelled
as estimates and stop being labelled the moment you scan the real thing.
Every competitor guesses silently.

**4. Per-member portions driving the shopping list.** Two adults and two
children at 0.6 gives the right quantities. No competitor found does portion
scaling per household member.

**5. Household scoping with a privacy split.** Shared cupboard, private
weight log. RLS from day one.

**6. Offline-first PWA.** No app store tax, no install friction, works in a
shop with no signal.

**7. Accessibility as a gate, not an intention.** Contrast across four
themes, structure checks on rendered DOM, every view executed before commit.

---

## Where they beat us today

Stated plainly.

| Gap | Who does it | How bad |
|---|---|---|
| **Recipe volume** | Cooklist (~1M), Samsung Food | We have 10. Biggest visible gap. |
| **Receipt scanning** | Fango, NoWaste.ai, Pantry Persona | Captures loose produce a barcode never will. We have no answer. |
| **Aisle-sorted shopping list** | Cooklist | Cheap to build, high daily value. We sort by nothing. |
| **Auto list on running out** | MealBoard, KitchenPal | Items move to the list automatically. Ours needs a button. |
| **Visual, icon-led design** | Tiimo | We are text-heavy. For ND users this is not cosmetic. |
| **Expiry alerts** | NoWaste, KitchenPal | We compute freshness but do not notify. Phase 10. |

None of these is architectural. All are catch-up work.

---

## The positioning insight worth acting on

A Chore Focus reviewer, on hitting its paywall:

> *"I shouldn't have to pay extra for being ADHD friendly."*

That is the whole market's blind spot. Competitors treat ND-friendliness as
a premium feature. **It should be the base product**, and the paid tier
should be about scale (household members, library access, receipt scanning),
never about accessibility.

Second insight, from the reviews of the entire kitchen category: the apps do
not fail on features, they fail on **upkeep**. "Takes discipline" is a
death sentence for a user with executive-function differences. Every
decision that removes upkeep — the claim step, reference averages, bought →
pantry, unknown-is-not-zero — is worth more than a feature.

---

## What "smashing them" actually requires

Four things, in order of leverage:

**1. Zero-upkeep inventory.** The pantry must stay roughly accurate without
discipline. We have barcode + claim + bought-to-pantry. Missing: receipt
capture, and depletion when you cook a meal.

**2. One task, one place.** Currently plan → rebuild list → check pantry is
three screens. Every hop loses people. This is Phases 22–24.

**3. Visual, not textual.** Tiimo's advantage is that time is *visible*.
Ours should be that state is visible: what you have, what you need, what is
about to go off — at a glance, in colour and shape, not a list of sentences.

**4. Recipe volume with quality.** 300 recipes at our step standard beats a
million scraped ones nobody can follow. But 10 does not.

---

## Honest risk

The thing most likely to kill this is not a competitor. It is scope. The app
already covers rehab exercises, weight, water, chores, calendar, meals,
pantry, shopping, holidays and work location. Tiimo won its category by
doing **one thing** — days — extremely well.

The counter-argument, which I think holds: for the household-logistics user,
those domains genuinely are one job, and splitting them is what forces
people into five apps that do not talk to each other. But it means the
*entry point* has to be a task, not a menu of nine screens.
