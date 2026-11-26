# Home-OS: Phase 37 Build Brief — Week Shaper (Hearth)
26 Nov 2026 v1

Precondition: Phase 36 done (the Hearth switch exists). Built in the
architect chat. Read `SESSION_START.md` first.

## What Graeme asked for (26 Nov 2026)
> I want fish twice a week, meat once a week, veg the rest of the time. I
> want to cook something for everybody. We've got a football match on
> Sunday, so Saturday needs to help build energy. We did a training session
> in the gym; I need to build protein.
> AI should only be used in the app for the import of meals, not the week
> shaper. The coach works heuristically from rules.
> It never says "you're going to cook puttanesca tonight". It says "here are
> 5 things you might want to cook".
> Someone might go: I don't want to make a choice, you tell me what I'm
> making. Then it reads from what you've got in your pantry.

## The three non-negotiables
1. **No AI.** Rules, filters and scores, all in plain JS, all testable.
2. **It suggests; you decide.** Nothing goes on the plan without a tap.
3. **No shame.** Rules are shown as facts ("Fish: 1 of 2 this week"),
   never as failures; no red, no "you missed".

## What it reads
- **Every recipe you could cook:** your meals (typed, imported, copied) and
  the full Community library (Hearth).
- **The week so far:** what is already planned.
- **Your rules** (set once, by tapping).
- **This week's events** (added per day, by tapping).
- **The household:** who is eating, `dietary_tags`, dislikes and allergies.
- **The pantry:** what you have, and what is close to its use-by.
- **History:** what you cooked in the last 14 days, for variety.

## Rules (set once)
| Rule | Control | Example |
|---|---|---|
| Rhythm | a stepper per kind: fish, meat, veggie | Fish 2, meat 1, veggie the rest |
| Everyone eats | on/off | one meal that suits every member eating |
| Time | weeknights / weekends: any, under 30, under 45 | weeknights under 30 |
| Use it up | on/off | food near its use-by comes first |
| Variety | on/off | not cooked in the last 14 days |

## Events (per day)
| Event | Shapes | How |
|---|---|---|
| Match or race | the day before | carb-led dinner |
| Match or race | the day itself | a lighter, familiar lunch |
| Gym or training | that day, and breakfast next day | protein-led |
| Busy evening | that day | quick (under 20 min) or leftovers |
| Guests | that day | serves more; a "special" tag counts |

Copy says what the shaping is, plainly ("carb-led for energy before the
match") and never gives anyone a target. General eating patterns only, not
medical or diet advice (principle 6).

## How a recipe is read (pure, from data the app already has)
- **Kind:** fish if any ingredient's shelf is fish; else meat if any is meat;
  else veggie (`data/shelves.js`).
- **Time:** `prep_minutes + cook_minutes`; unknown counts as not quick.
- **Carb-led:** carbohydrate ≥ 50% of energy per serving. **Protein-led:**
  protein ≥ 25% of energy, or ≥ 30 g, per serving (`data/nutrition.js`).
  Recipes with incomplete nutrition are not labelled either way.
- **Suits everyone:** no member eating has a dietary tag or dislike it
  breaks. A hard allergy always excludes; it is never scored.
- **Pantry fit:** share of its ingredients you have; which of those are
  near their use-by.

## Two ways in

### 1. Show me options (default)
For a chosen day: the 5 best fits, each a card with its reasons as chips
("Fish · 25 min · uses spinach · everyone"). Tap **Plan it** or leave it.
"Show 5 more" pages on. Rules that are already met stop adding weight; the
tally shows where the week is ("Fish: 1 of 2").

### 2. You choose for me
One meal, chosen mostly from what is in the pantry, with the same rules,
events and family respected. Shown with why ("Uses the salmon and spinach
going off tomorrow · fish night 2 of 2 · 25 min"). **Plan it** or
**Something else** (the next best). If the pantry is thin, it says what is
missing ("You'd need: lemon, crème fraîche") and those go to the list with
one tap. Builds on the existing **What can I make?** pantry matcher rather
than a second engine.

## Scoring (one function, used by both)
Hard filters first (allergy, a member's "never", time limit for the day).
Then a score, each part 0–1, weighted, with the weights in one table so
they can be tuned:
- rule need (a kind the week still needs) — 3
- event fit (carb-led / protein-led / quick) — 3
- use-soon pantry use — 2 (4 in "You choose for me")
- pantry fit — 1 (3 in "You choose for me")
- variety (not in the last 14 days) — 1
- everyone eats — 1
Ties broken by name, so the same inputs always give the same list (testable,
and nobody sees the list shuffle on a refresh).

## Data
- Rules and events: `household_settings` JSON (or a small `week_rules` /
  `week_events` pair). Decide at build start; schema first, migration 029.
- Nothing about a recipe is stored for the shaper: kind, time, carb-led and
  protein-led are worked out on the fly from data that already exists.

## Files (indicative)
`js/data/weekShaper.js` (pure: read recipes, filter, score, explain),
`js/views/weekShaper.js` (rules, events, suggestions, You choose for me),
the plan screen gains a **Shape my week** entry, `Tests/weekShaper.mjs`.

## Verification
- Gate: a fixture week (Graeme's example: fish 2, meat 1, match Sunday, gym
  Thursday, four people, one vegetarian) gives Saturday a carb-led top 5,
  Thursday a protein-led top 5, never suggests meat to the vegetarian when
  "everyone eats" is on, and reaches fish 2 before suggesting a third.
- Same inputs give the same suggestions, every time.
- Free: the Shape my week entry shows what Hearth adds, once, without nagging.
