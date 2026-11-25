# Home-OS: Competitive Position
25 Nov 2026 v2

v2 adds the November 2026 update below: the recipe-import apps (ReciMe and
others), current prices and ratings, pricing and freemium for Home-OS, and
an honest rating forecast. The September analysis follows it unchanged,
because its positioning still holds.

---

# November 2026 update

## What changed in the market since September

- **Mealime closed on 21 October 2026.** Its owner (Albertsons) folded the
  recipes into a section of its grocery apps and deleted every account, with
  no export. Its users are looking for a new home, and "will this app still
  exist?" is now a question people ask before paying.
- **The leaders now sell recipe import, not recipes.** ReciMe calls itself
  the #1 app for saving recipes from Instagram, TikTok, Facebook and YouTube.
  Its free tier allows 5 smart imports a week; ReciMe Plus unlocks unlimited
  imports, nutrition and cookbook scanning. Flavorish gates social imports
  and AI generation behind its paid plan "because they are costly to run".
- **Prices settled around $40–60 a year in the US** for full-featured
  recipe and planning apps, with cheap list-first apps far lower.

## Price and rating snapshot (US list prices, checked 25 Nov 2026)

| App | Free tier | Paid | Rating | Notes |
|---|---|---|---|---|
| ReciMe | Yes, 5 smart imports a week | Plus $39.99/yr (seen from $34.99 to $119.99 in tests); student and 60+ discount 30% | 4.7 on Google Play (32k reviews); ~4.8 App Store | Social/photo import, plan, list. A paid-user import bug in May 2026 sank that version's reviews to ~2.5 stars until fixed |
| Samsung Food | Yes, with ads | Food+ $59.99/yr or $6.99/mo | — | 240,000 public recipes; AI plans in Food+ |
| Plan to Eat | No (14-day trial) | $49/yr or $5.95/mo | 4.8 App Store, 4.7 Google Play | Own-recipe cooks; one plan, every feature |
| AnyList | Yes | $9.99/yr individual, $14.99/yr household | — | List-first; household pricing |
| BigOven | Yes, with ads | Pro $24.99/yr | — | |
| Tiimo (ND planner) | Yes | ~$48–80/yr; family plan reported | iPhone App of the Year 2025 | No kitchen features |

Ratings for the big apps sit at **4.7–4.8**. That is the bar a new app is
measured against in the store, not 5.0.

## Where Home-OS stands against ReciMe (after Phases 33–34)

**Level:** share a recipe page in (Android), paste a link or a caption,
one-screen Check and save, nutrition worked out from food tables, kitchen
measures to grams, a Meals tab with My meals, Community library and Recently
added, credit to the source, no duplicate imports.

**Ahead:** the list merges quantities and subtracts the pantry (a ReciMe
reviewer cancelled over three rows of "1 lemon"); honest nutrition, unknown
never shown as zero; per-member portions; enforced cook-mode step quality;
no-shame copy gated in CI; offline; accessibility gated on every build.

**Behind:** reading Instagram/TikTok posts and videos for you, photo and
cookbook import (all Phase 17, now unparked for Premium); shopping list
sections (Phase 35, next); iPhone share menu (native app needed); in-app
grocery ordering; sharing collections with friends; recipe volume.

## Pricing and freemium for Home-OS

The September insight still decides the line: **accessibility, no-shame
design and the core loop are free. Premium is for things that cost money to
run or that scale with use.** Charging for being usable is the complaint
that sank Chore Focus's reviews.

**Free — the whole kitchen loop, for one household**
- Plan, shopping list (every sort option), pantry, cook mode
- Your own recipes, unlimited
- Import from a web link or pasted caption, with nutrition (no AI cost:
  the Edge Function and food tables are effectively free to run)
- The monthly rotating Community library recipes

**Premium — £2.99 a month or £24.99 a year, per household**
- AI import (Phase 17): Instagram/TikTok posts read for you, photos of a
  cookbook page or a handwritten card, video captions
- Plain-language rewrite and swaps (vegetarian, vegan, missing ingredient)
- The full Community library, not just the month's rotation
- Fair use on AI imports (e.g. 100 a month) so one heavy user cannot cost
  more than they pay

**Why these numbers.** £24.99 a year sits under ReciMe Plus ($39.99) and
Samsung Food+ ($59.99), above AnyList's list-only household plan, and
covers AI imports at pennies each with room to spare. Per household, not
per person, because Home-OS is household-scoped already and families are
the users who feel the shopping-list pain. Offer a 14-day Premium trial
rather than a hard paywall, and the ReciMe-style student and over-60
discount fits the Build New Habits audience.

**Store maths.** Google Play and the App Store take 15% on subscriptions
for small developers in their reduced-fee programmes. Inside a store app,
digital features generally have to be sold through the store's own billing;
selling on the website as well is allowed in more places than before but
varies by country and store. Decide this per store at submission.

## Getting onto Google Play and the App Store

- **Google Play:** wrap the existing PWA as a Trusted Web Activity
  (Bubblewrap). Same code, a real store listing, and the share target
  keeps working.
- **Apple:** a plain website in a wrapper is commonly rejected (minimum
  functionality guideline). Plan a thin native shell (e.g. Capacitor) that
  adds what web apps cannot: the iOS Share menu, widgets, notifications.
  This is also what closes the iPhone sharing gap.

## Rating forecast — honest

**Expected: 4.4–4.6 in the first year, 4.7+ is reachable but not automatic.**

What earns it: the no-shame, low-upkeep design is exactly what reviewers of
this whole category say they want; the import and list are now genuinely
good; Mealime refugees are looking for somewhere that won't vanish.

What costs stars, in order:
1. **Billing and sync bugs.** ReciMe's one entitlement bug in May 2026 took
   that version's reviews from the 4s to about 2.5. Payment and sync must be
   the most-tested code in the app.
2. **Expectation gap on recipe volume.** People compare with 240,000
   recipes. Lead the store listing with "your recipes, imported and planned",
   not "a recipe library".
3. **Install and offline quirks** of a web app inside a store wrapper.
4. **Paywall timing.** Ask for a review after a success (first list built,
   first recipe cooked), never after a paywall.

---

# September 2026 baseline
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
