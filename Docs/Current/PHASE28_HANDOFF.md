# Home-OS: Phase 28 Handoff — The Neglected Screens
01 Sep 2026 v1

**No schema change.**

## What shipped

| Path | Version | What |
|---|---|---|
| `js/components/emptyState.js` | v1 (new) | Shared empty state + forbidden words |
| `js/views/signin.js` | **v2** | First revision since 17 Aug |
| `js/views/health.js` | v2 | Statuses say what the page offers |
| `js/views/calendar.js` | v2 | Empty month explains itself |
| `js/views/exercises.js` | v4 | Real empty states |
| `js/views/weight.js` | v3 | Empty states |
| `js/views/holidays.js` | v4 | Empty states |
| `js/views/meals.js` | v21 | Empty state with two ways in |
| `js/views/shopping.js` | v7 | Empty state points at the cause |
| `css/components.css` | v39 | Empty state, sign-in strap |
| `service-worker.js` | v60 | One new path |

## Empty states are the onboarding that keeps working

Phase 27's first run happens once. An empty state appears exactly when
someone arrives somewhere new and disappears the moment they do not need it.

Every one now follows the same shape: **what the screen is for**, then **one
next action**, then optionally why it is worth doing.

"No weights logged yet" is technically true and completely useless — it
tells you the screen is empty, which you found out by opening it. It now
reads *"Your weight and its trend appear here once you log one."*

**Two examples worth calling out:**

- **Shopping** used to say "press Build from the plan". Since Phase 22 the
  list builds itself, so the action is now **Plan the week** — the thing
  that *causes* a list, not the button that rebuilds one.
- **Meals** offers the library first and writing your own second. Browsing
  is one tap; writing a recipe is a job. The cheaper way in goes first.

**Not every empty state gets an action.** "Nothing waiting to be confirmed"
on pending exercises is genuinely fine, and an action there would be
inventing work.

## The forbidden words are now enforced

`FORBIDDEN_EMPTY_WORDS` is exported and the a11y gate asserts **every empty
state rendered across the app** against it: "haven't", "you should", "you
need to", "don't forget", "sorry", "oops", "unfortunately", "failed",
"missing".

"You haven't logged anything yet" is a small accusation. Empty is not a
failure and must never be worded as one. That is now a build failure rather
than a good intention.

Also asserted: navigation uses a **link**, an in-place action uses a
**button**. A button that navigates breaks opening in a new tab and lies to
a screen reader about what will happen.

## Sign-in, finally revised

`v1` since 17 August, and the first thing anyone ever sees. It said "Sign in
to Home-OS" and nothing about what Home-OS is. It now carries one plain
line: *"Meals, shopping, the cupboard and the week — in one place, without
having to hold it all in your head."*

No marketing, no exclamation mark.

## A mistake caught before it shipped

The exercises empty state pointed its action at `#add-exercise-name`, an id
I had invented. The gates all passed — nothing checks that a
`querySelector` resolves — and the button would have silently done nothing.
Found by grepping for the real id, which is `#new-exercise-name`.

Worth noting as a gap: **no gate catches a selector that matches nothing.**

## Tests

All eight gates. A11y 207 → **212**.

## Part two — the visual pass (same day)

The first commit landed the copy and left the visual half undone. This
finishes it.

**Hub icons.** `icons.js` v2 adds exercises, weight, water, chores and
calendar, each a distinct silhouette rather than a variation on a circle —
these sit in a list read at a glance, which is the whole reason for having
them. Health and Kitchen hubs now lead each row with one.

They are `aria-hidden`: the title beside them is the accessible name, and
announcing both is noise.

**Contrast covers them.** A hub icon carries meaning at a glance, so it is
held to the 3:1 required of a meaningful graphic (WCAG 1.4.11) rather than
left untested because it is "just an icon". Two new pairs, gate now
**42 pairs x 4 themes = 168 checks**.

**Chores has an empty state**, naming three real examples — Kitchen,
Garden, Car — because that beats explaining what a project is.

**Undo replaces the confirm on removing pantry stock.** The full row is
snapshotted and re-inserted on undo, including location, shelf life and
use-by.

## The gate that should have existed

I invented a non-existent element id **twice in one phase** — once in
exercises, once in chores. Every gate passed both times, because nothing
checked that a `querySelector` resolves. Both buttons would have silently
done nothing.

`Tests/a11y.mjs` now scans every view for `querySelector('#id')` and asserts
the id is one the app actually creates somewhere. Checked **statically
against the source**, not the rendered DOM, because an element may only
exist once a panel is open — asserting on the DOM would fail perfectly good
code.

**Verified by deliberately breaking it**: pointing chores at a fake id fails
the gate and names the file and the id. A gate that never fires is worthless,
so it was proved before being trusted.

## Still not done

- **Water and Weight got copy but no icons.** Their screens are small and
  the case is weaker, but it is an inconsistency.
- **Calendar has no state colour.** Event types are distinguished by text.
  The Phase 26 palette exists for this and is unused there.
- **Undo is on shopping and pantry removal only.** Deleting a step, removing
  a member and removing a chore project still confirm.

## Next

Phase 29 — split `meals.js`, now 2,100 lines holding seven features.
