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

## Not yet done

- **Chores has no empty state.** It was the one screen I did not reach.
- **Water has none either**, though it is arguably fine — the screen is four
  buttons and their purpose is obvious.
- **The six screens got copy, not a visual pass.** Health, Calendar,
  Exercises, Water and Weight still do not use the Phase 26 icons or state
  badges. That was the larger half of this brief and it is not done.
- **No undo added.** The brief wanted it on destructive actions in these
  screens; only shopping removal has it.

## Next

Honestly: finish this one. The copy pass landed, the visual pass did not.
