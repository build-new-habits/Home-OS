# Home-OS: Phase 20 Handoff — Who's Eating What
01 Sep 2026 v1

**Schema revision 13.** One column. Run the migration before pulling.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/mealPlan.js` | v2 | `member_ids`, servings, diners, conflicts |
| `js/views/mealPlan.js` | v2 | Diner line and picker |
| `js/lib/shortfall.js` | v3 | Scales the shop to who is eating |
| `js/views/shopping.js` | v5 | Passes the household in |
| `css/components.css` | v30 | Diner picker |
| `service-worker.js` | v52 | Bumped, no new paths |

## What was already there

Several meals in one cell already worked — no unique constraint on
day+slot, and `buildPlanCell(day, slot, entries)` already took a list. Sea
bass for the adults and sausage and chips for the children on the same
Tuesday was already possible. The phase is about recording **who each one
is for** and making the shopping list follow.

`portion_factor` and `dietary_tags` went onto `household_members` in
revision 8 specifically so this would be one column, not three.

## Decisions worth knowing

**Empty means everyone, and that is the default forever.** If planning
required naming people it would tax the common case six or seven times a
day to capture information that only matters for lunches. Storing "everyone
ticked" as an empty array also means a member added later is included
automatically — the picker normalises a full selection back to empty.

**The diner line is only rendered when it is not everyone.** Printing
"Everyone" on six meals a day is noise that buries the one line that
matters.

**Servings round UP, asymmetrically.** Too much is a leftover; too little is
somebody going without. `serves_override` still wins outright — it is the
manual escape hatch and nothing here quietly overrules it. A null
`portion_factor` counts as a full adult, because a null must never silently
shrink the shop.

**A stale member id is ignored, not treated as a missing person.** No FK is
possible from an array element. Past plans keep their record of who ate
what.

**A household read failure is not fatal** in either the plan or the
shopping rebuild. Falling back to an empty member list restores the exact
pre-Phase-20 behaviour.

## The dietary rule changed while writing the tests

My first version flagged every untagged meal against a vegetarian. The test
failed, and the test was right to.

**Tags say what a meal IS, not what it isn't.** A meal tagged
`['gluten_free']` is not thereby "not vegetarian" — it may simply never have
been tagged. So the function reports **unconfirmed**, not conflict, and an
entirely untagged meal reports nothing at all. Otherwise the warning would
fire on every meal in the app until the whole library were tagged, and a
warning that appears everywhere is one nobody reads.

## Dropped from the original brief

**Macro targets.** You said this is about planning meals and shopping, not
tracking, and a jsonb column of targets nobody asked for is exactly the sort
of thing that quietly becomes clutter. `role = 'child'` members were never
going to be offered targets anyway.

## Tests

Behaviour 303 → **322**. New: servings for adults, children, mixed and
unnamed entries; upward rounding at 1.2 → 1.5; override precedence; null
portion safety; stale ids ignored and not distorting the count; "Everyone"
for both empty and fully-named; name joining; the cell-split remainder; and
the corrected dietary rule.

## Not yet done

- **The cell split is not automatic yet.** `remainingMembers()` is written
  and tested, but adding a second meal to a cell does not yet narrow the
  first one to the remainder. That is the one-action-not-two behaviour from
  the brief and it is the obvious next small piece.
- **Dietary notes are computed, not displayed.** `dietaryConflicts()` needs
  `meals.dietary_tags`, which arrives with Phase 16.
- **No "usual lunch".** Repeating a child's lunch across the week is still
  five taps. Worth doing once there are library recipes to repeat.

## Next

Phase 14 (cook from what you have), then 16 (the recipe library).
