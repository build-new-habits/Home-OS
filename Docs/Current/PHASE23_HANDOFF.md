# Home-OS: Phase 23 Handoff — One Pantry Screen
01 Sep 2026 v1

**No schema change.**

## What shipped

| Path | Version | What |
|---|---|---|
| `js/views/pantry.js` | v9 | The mode switcher is gone |
| `css/components.css` | v37 | Search panel, place buttons, empty state |
| `service-worker.js` | v58 | Bumped, no new paths |

## The change

**The three-way segmented control is deleted.** The Pantry used to open in
"Add" mode, so the default screen was a form for adding stock — when most
visits are "have I got X". Worse, search was a *mode you had to switch to*,
which means you had to know it was there.

Looking for something is not a mode. It is what you came for.

New order, one screen:

1. Anything needing fixing (unchanged)
2. **Search, pinned, always visible**
3. Use soon (unchanged)
4. Locations
5. **Add**, behind one button

## "No location recorded" is now a to-do

Until locations are set, every item falls into that group — which for a new
pantry is *everything*. It sorted alphabetically to the bottom, where nobody
scrolls, and that is why it read as one enormous list.

Now it sorts **first**, and above five items it is titled **"Not put away
yet (12)"** rather than "No location recorded". A dustbin becomes a task.

**And it is one tap to fix.** Each unplaced row carries buttons for the
places you already use — no form, no sheet. A form here is exactly why that
group stayed full for weeks.

## A real empty state

The empty pantry used to show an empty list under a form. It now says what
the screen is for and gives one action: *"Nothing in your pantry yet. Scan
or add a few things you already have, and your shopping list will stop
asking you to buy them again."*

## The a11y gate had to be rewritten, not widened

It asserted `pantry: a browse mode is offered` — a check on the design that
was the problem. Deleting it would have lost the coverage, so it was
**replaced** with five checks on the new design: no segmented control
exists, the search input is visible *without a hidden ancestor* (present in
the DOM is not the same as reachable), the search input is labelled, Add is
behind a collapsed button, and locations render directly. Plus one asserting
unplaced items sort first.

That is the pattern worth keeping: when a design changes, the gate changes
with it and gets stricter, never quieter.

## Tests

All eight gates. A11y 195 → **199**.

## Not yet done

- **No at-a-glance summary per location.** The brief wanted a count and a
  past-best count on each group heading. The count is there; the freshness
  roll-up is not. Small, and better done with the Phase 28 visual pass.
- **Only four places are offered per row.** More than four buttons is a
  wall; a fifth place needs the detail sheet. Fine for a real household,
  worth revisiting if anyone has more.
- **Search still lives below the "needs fixing" section.** That section is
  usually empty, so search is effectively at the top — but on a bad day it
  is not.

## Next

Phase 27 — onboarding and first run. The flows it would teach now exist.
