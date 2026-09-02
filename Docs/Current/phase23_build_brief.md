# Home-OS: Phase 23 Build Brief — One Pantry Screen
01 Sep 2026 v1

**No schema change.**

## The problem

The Pantry has three modes behind a segmented control — Capture, What's in,
Find something — and opens in **Capture**. So the default screen is a form
for adding stock, when most visits are "have I got X".

Search exists and is good. It is a *mode you have to switch to*, which means
you have to know it is there.

And until locations are set, every item falls into "No location recorded",
which is why it reads as one enormous list.

## The change

**Delete the mode switcher.** One screen, in this order:

1. **Search, pinned at the top, always.** Text, plus category and location
   as optional narrowing. Typing filters immediately.
2. **Use soon** — the existing freshness section, unchanged.
3. **Locations**, one open at a time (the existing browse behaviour).
4. **Add stock**, behind a single button that opens the existing capture
   form as a panel.

Search is not a mode because looking for something is not a mode. It is what
you came for.

## Fixing "No location recorded"

Two changes:

- When more than five items share it, the group renders as **"Not put away
  yet (12)"** and sits **first**, not last. It is a to-do, not a dustbin.
- Each row inside it gets a one-tap location assignment from the locations
  you already use. No form, no sheet — a row of buttons.

Never nag. Stating the count and making it one tap to fix is enough.

## Empty and first-run states

A new pantry currently shows an empty browse list under a form. It should
say what to do first, in one line, with the scan button under it.

## Visual state, not sentences

From the competitive analysis: our advantage should be that **state is
visible**. Each location group gets a small at-a-glance summary — item
count, and how many are past their best — rather than requiring a read.

No new colour semantics beyond what `tokens.css` already defines, and
nothing may depend on colour alone.

## Tests

Render gate: search-first layout, a location group open, the "not put away"
group, the empty state.

A11y: the search input keeps its label and live count; one-tap location
buttons carry accessible names including the item; heading order survives
removing the mode switcher.

Behaviour: filtering by text, category and location combines; the
unlocated group sorts first and only above the threshold.

## Done when

You open the Pantry, type three letters, and know whether you have it —
without switching anything.
