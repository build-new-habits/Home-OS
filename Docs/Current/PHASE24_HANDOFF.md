# Home-OS: Phase 24 Handoff — Plan The Week
01 Sep 2026 v1

**No schema change.** This is the phase that changes what the app is.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/views/planWeek.js` | v1 (new) | The four-step flow |
| `js/routes.js` | v3 | `plan-week` appended |
| `js/navConfig.js` | v6 | `PRIMARY_ACTION` |
| `js/views/dashboard.js` | v4 | One obvious thing to do, at the top |
| `css/components.css` | v34 | Flow styling |
| `service-worker.js` | v56 | One new path |

## The flow

`#/plan-week`, reachable as the dashboard's primary action.

1. **Who's eating** — untick anyone away. Sets `member_ids` for everything
   planned in this run.
2. **Fill the week** — "You could cook these right now" first, from the
   Phase 14 scorer, because cooking what you already have is the cheapest
   good decision available. Then all meals. Then what is planned so far.
3. **What you need** — the shortfall, computed and **written immediately**.
4. **Done** — meals planned, things to buy, a link to the list.

## Decisions worth knowing

**Every action writes as it happens.** There is no submit at the end. Leave
at step 2 and you have two meals planned; leave at step 3 and your shopping
list is already correct. A wizard that loses your work if you leave is a
wizard people learn not to start.

**"Finish later", not "Cancel".** Cancel implies the work is discarded. It
is not.

**Position, never a progress bar.** "Step 2 of 4" is a fact. A bar filling
toward completion is a small guilt machine. There is a test asserting no
`progress` element exists.

**Focus moves to the heading on every step**, not to the first control. You
need to know where you are before you are asked to do anything. The heading
carries `tabindex="-1"` for it.

**It never blocks on incompleteness.** You can reach step 4 having planned
two meals, and the app says "2 meals planned" without an opinion about the
number.

**Resumable on the same six-hour rule as Cook Mode.** The dashboard offers
"Carry on planning the week" and says which step you were on, plus *"Nothing
was lost."*

**Empty is never flagged.** "Nothing yet" is a statement of where you are,
not a nudge.

**It is a path through the existing screens, not a replacement.** Every
screen still works exactly as it did.

## The a11y gate caught a real design error

I hardcoded the dashboard link to `#/plan-week`. The gate failed with
`orphaned: plan-week` — a route with no declared way to reach it.

My first instinct was to widen the gate. That was the wrong instinct.
Navigation in this app is **declarative** in `navConfig.js` precisely so it
can be checked, and a hardcoded link is invisible to the check even when it
works. The route is now declared as `PRIMARY_ACTION` and the view reads its
label from there.

`PRIMARY_ACTION` is separate from `DASHBOARD_LINKS` on purpose: it is not a
tile in the "everything else" grid, it is the one thing to do. Putting it in
the grid would have rendered it twice.

## Tests

All eight gates. A11y 188 → **195**, with seven structural checks on the new
flow: one h1, focusable heading, position stated in words, **no progress
bar**, Back disabled on step 1, every step skippable, and leaving offered as
a normal option rather than a cancel.

Render gate now covers 16 route views.

## Not yet done

- **No "repeat last week".** In the brief and not built. It needs last
  week's plan kept somewhere, and `weekly_meal_plan` holds one rolling week
  with no history. That is a schema question, not an afternoon.
- **Step 3 lists the shortfall but you cannot tick things off there.** The
  brief wanted "anything you know you have, tick off here". The list is
  written correctly; the ticking is on the Shopping screen.
- **The dashboard is not yet fully task-led.** It has a primary action on
  top of the existing tiles rather than instead of them. That is the right
  order — prove the flow first — but the tile pass still stands.

## Next

Phase 22 — the list is never wrong. Which will remove the one manual step
still sitting inside this flow.
