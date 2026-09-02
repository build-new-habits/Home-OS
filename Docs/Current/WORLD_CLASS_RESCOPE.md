# Home-OS: Rescope for World Class
01 Sep 2026 v1

The standard has changed from "correct" to "world class, end to end, every
page". This document says honestly where the app is short of that, and
reorders the remaining work accordingly.

---

## The audit that decided this

File headers, which do not lie about attention:

| File | Last touched | Reads as |
|---|---|---|
| `css/tokens.css` | **14 Jul, v1** | **The entire visual design was set in Phase 2 and never revisited** |
| `js/views/signin.js` | 17 Aug, v1 | The first screen anyone ever sees, never revised |
| `js/views/exercises.js` | 19 Jul, v3 | Six weeks untouched |
| `js/views/calendar.js` | 26 Aug, v1 | Never revised |
| `js/views/health.js` | 26 Aug, v1 | Never revised |
| `js/views/water.js` / `weight.js` | 18 Aug | Early, functional, unpolished |
| `js/views/meals.js` | 01 Sep, **v19, 2,046 lines** | Six features in one file |

Two findings matter.

**1. The design system predates almost the entire app.** `tokens.css` was
written for three screens and now serves sixteen. Everything since has been
styled *against* it rather than *by* it. That is exactly why the app reads
as text-heavy and why "visual state" keeps coming up as a gap against Tiimo.

**2. Half the screens have never had a UX pass.** Health, Calendar,
Exercises, Water, Weight and Sign-in were built to work and never revisited.
"World class on every page" cannot skip six pages.

---

## The tokens decision

`css/tokens.css` is on the **write-once list** (PROJECT_BLUEPRINT §3),
alongside `router.js`, `routes.js` and `rrule.js`. That rule has protected
the app well.

**It has to be lifted, once, deliberately.** Not quietly, not as a side
effect of another phase. A design system that cannot be revised is a
design system frozen at the ambition of its first month.

After the revision it goes back on the list at v2.

---

## Revised order

| Order | Phase | Name | Why here |
|---|---|---|---|
| 1 | **26** | Design foundations | Everything after inherits it. Retrofitting is the mistake we are already paying for |
| 2 | **24** | Plan the week | Changes what the app *is*. Biggest single leap |
| 3 | **22** | The list is never wrong | Removes the biggest "why is this wrong" moment |
| 4 | **23** | One pantry screen | The worst screen, fixed |
| 5 | **27** | Onboarding and first run | Only meaningful once the flows above exist |
| 6 | **25** | The whole home | Non-food staples |
| 7 | **28** | The six neglected screens | Health, Calendar, Exercises, Water, Weight, Sign-in |
| 8 | **29** | Split `meals.js` | Invisible to users, blocks everything after |
| 9 | **10** | Notifications | Needs the design language first |
| 10 | **21** | Productisation | Last, and needs commercial decisions |

Phase 17 (photo import) stays parked.

---

## Phase 26 — Design foundations (new)

The gap against Tiimo is not features, it is that **their state is visible
and ours is written down**. Time is a colour and a shape there; here,
everything is a sentence.

Scope:

- **Typography scale.** One scale, defined once. Currently sizes are
  ad-hoc per component.
- **Spacing rhythm.** `--space-1..6` exist; usage is inconsistent.
- **Semantic colour.** Colours for *meaning* (fresh / use soon / past best /
  unknown), defined once, never colour alone — always paired with text or
  shape.
- **An icon set.** Small, consistent, inline SVG, no dependency. Icons
  carry meaning for people who find dense text hard; this is accessibility,
  not decoration.
- **State-at-a-glance components.** A count chip, a freshness dot with
  label, a progress ring. Built once, used everywhere.
- **Motion.** One transition duration, and **honoured
  `prefers-reduced-motion`**. Sensory-friendly design is a named
  expectation in this market, not a nicety.
- **Density control in Settings.** Comfortable / compact. Sensory needs vary
  and a fixed density serves half the audience.

Contrast gate must pass across all four themes at the new tokens, and the
gate should be extended to cover any new semantic pairs.

---

## Phase 27 — Onboarding and first run (new)

Confirmed as needed. What it must be, and must not be.

**Must be:**

- **A guided first task, not a tour.** Not "here is the pantry, here is the
  shopping list". Instead: *"Let's plan one meal together"* — pick a recipe
  from the library, see it land on the plan, see the shopping list fill in.
  One real outcome, achieved, in about ninety seconds.
- **Skippable at every step**, and skipping never asks twice.
- **Resumable**, like Cook Mode and Plan The Week.
- **Honest about what it set up.** "You now have one meal planned and four
  things on your list."
- **Reachable again later** from Settings, because people forget and
  re-finding it should not require reinstalling.

**Must not be:**

- A carousel of screenshots. Nobody reads them and they teach nothing.
- A checklist of set-up chores before the app is usable.
- Anything that implies you are behind if you skip it.

Also in scope: **empty states on every screen.** Right now most screens
show an empty list under a form. Each should say, in one line, what this
screen is for and what the single next action is. That is onboarding that
keeps working after week one.

---

## Phase 28 — The six neglected screens (new)

Health, Calendar, Exercises, Water, Weight, Sign-in, brought to the Phase 26
language, each with:

- A real empty state
- Visible state rather than described state
- The same panel, sheet and confirm patterns as the kitchen screens
- An `undo` where anything is destructive

**Sign-in matters more than its size suggests.** It is the first impression,
it is `v1`, and it has never been revised.

---

## Phase 29 — Split `meals.js` (new)

2,046 lines holding: the meal list, ingredient picker, macros, method steps,
cook-from-pantry, and the recipe library. Six features.

Not a user-visible change, and it is not optional. Every future edit to any
of those six touches a file where the other five live, and the render gate
can only tell you it broke, not which feature broke it.

Split into `views/meals/` with one module per feature and a thin view that
composes them. Behaviour identical, gates unchanged, no schema change.

---

## What "world class" means concretely

Six tests to hold every phase against:

1. **Could someone use this screen having never seen it, with no
   explanation?**
2. **Is the state visible, or is it written down?**
3. **Is there one obvious next action?**
4. **Can every destructive thing be undone?**
5. **Does it work at 200% text size, in dark mode, with reduced motion, one-handed?**
6. **Does it ask for anything it could work out itself?**

Any screen failing one of these is not finished.

---

## On pricing

Not a recommendation to act on without your own commercial advice, but the
market shape is clear.

What is out there: Tiimo is freemium with a premium subscription. KitchenPal
is free. MealBoard is a one-off ~$4. MealThinker is $15/month. Chore Focus
puts core function behind a paywall and was reviewed with *"I shouldn't have
to pay extra for being ADHD friendly."*

**The structural decision that follows from your own goal:** accessibility
features must never be the paid tier. Step quality, cook mode, no-shame
framing, undo, reduced motion, density — all base. Charge for **scale and
convenience**: extra household members, the full recipe library, receipt
scanning, export.

A free tier that is genuinely useful alone is also the cheapest marketing
this category has, because the audience recommends tools to each other
constantly.

Costs to keep in view: Supabase is free at this size and is not free at
scale; anything per-use (Phase 17) becomes per-user; the recipe library
stays static JSON precisely so growth costs nothing to serve.

---

## The honest risk, again

Ten phases to world class, over nine domains. The failure mode is not
quality, it is finishing.

If the timeline gets tight, the defensible product is **the kitchen and
household loop** — meals, pantry, shopping, plan the week — done to this
standard, with health and holidays present but plainer. Do not spread the
polish thin across nine domains to avoid choosing.
