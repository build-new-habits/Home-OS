# Home-OS: Remediation Schedule
01 Sep 2026 v1

Everything the persona trace found, scheduled, with the persona each fix
unblocks and the evidence that would close it.

**This is a loop, not a list.** The trace gets re-run after each round, and
the round is not finished until the re-run says so.

---

## State at the start of Round 1

The trace was run at `42aec3b`. One finding has already been fixed since:

| Finding | Status |
|---|---|
| Ten recipes | **CLOSED** — 100 recipes, 73 budget-tier |

Marcus said *"ask me at a hundred."* He gets asked again in the Round 1
re-trace.

**Two personas are currently not served at all:** Priya (locked out) and
Jodie (churned day 12). Everything in Round 1 exists to change that.

---

## Round 1 — the two who are not served

Nothing else matters until these are fixed. A product that loses the
organised partner and the person with the least executive function has not
failed at features; it has failed at the two things it claims.

### Phase 30 — Household invites *(Priya, Dev)*
**Schema: revision 18.** An `household_invites` table with a code, an
expiry and a single use.

- Owner generates a code from Settings; it is shareable by any means.
- Redeeming inserts one `household_members` row and links `user_id`.
- Leaving a household is possible and does not delete shared data.
- An expired or used code says which, plainly.

**Closes:** *"I couldn't get in."*
**Evidence:** two real accounts, one household, both seeing the same list —
the isolation test from PHASE18_HANDOFF run in reverse.

### Phase 31 — The pantry stops needing discipline *(Jodie, Dev)*
**Schema: revision 19.** The hardest problem in the product and the one the
whole category fails.

The current model asks for a number. Numbers require counting, counting
requires attention, and Jodie's line was: *"if I could reliably do that job
I wouldn't have needed the app."*

**The move: let the pantry be vague on purpose.**

`pantry_stock.level` — `plenty` / `low` / `none` / unset — usable *instead
of* `current_qty`, never as well. One tap, no counting, no scanning, and it
degrades honestly: a `low` item is short, a `none` item is missing, an unset
item stays unknown and never demotes a recipe.

- The shortfall diff already handles four states. This adds a fourth input,
  not a fourth output.
- A quick pass: one screen, every pantry item, three buttons each.
- Precise quantities still work exactly as now for anyone who wants them.

**Closes:** the drift that ends the app for the lowest-executive-function
user.
**Evidence:** a pantry usable after two weeks of no scanning.

### Phase 32 — Notifications that exist *(Tom, Eileen)*
**No schema.** Settings has a Notifications section and nothing behind it.
Tom reads it as broken, and he is right to.

- Wire the existing preferences to real notifications.
- Use-by warnings, a cook-time prompt, nothing else at first.
- **Everything off by default** (principle 8, already in schema.md).
- If notifications cannot be delivered, say so rather than showing controls
  that do nothing.

**Closes:** the only thing in the app that is visibly broken rather than
unbuilt.

### 🔁 Re-run the trace
All eight personas. Priya and Jodie must be using it. Marcus must be asked
about paying.

---

## Round 2 — first contact and the frictions

### Phase 33 — Ask what they came for *(Sarah)*
**No schema.** Sarah lost three days to a nine-domain dashboard. Most people
would have lost the install.

- One question at first run: *what would you like to sort out first?*
- Kitchen / home and chores / health / all of it.
- Hides the rest of the dashboard until asked. Reversible in Settings,
  never permanent, never a paywall.

**Closes:** *"I wanted to sort out dinner. Why is it asking about my
weight?"*

### Phase 34 — My rotation *(Tom)*
**Schema: revision 20**, one boolean on `user_settings`.

Tom eats six meals deliberately and the app keeps suggesting alternatives.
A "these are my meals, stop suggesting" switch hides Ready-now
recommendations and the library prompts.

Trivial to build. **No competitor offers it**, and the people who want it
want it badly.

### Phase 35 — Tins, not grams *(Marcus)*
**No schema.** The machinery landed in Phase 12; the data is empty because
nobody knows to fill it in.

- At scan time, one question: *how does this come?* — tin, bottle, pack —
  and how much is in one.
- Back-fill from the reference file where the name matches.
- Shopping list then reads "2 tins" rather than "800 g".

**Closes:** *"I keep having to work out how many tins 800 grams is."*

### 🔁 Re-run the trace

---

## Round 3 — the neglected half

### Phase 36 — Health gets the kitchen's care *(Eileen)*
**No schema.** A third of the app had one visual pass in six weeks.

Icons and state badges on Water, Weight, Exercises. A weight trend worth
looking at. Empty states. Undo on anything destructive.

### Phase 37 — Planned macros *(Ren, Graeme)*
**No schema.** Sum the plan for a day and a week, scaled by servings and
portion factor.

**Labelled "planned" everywhere.** The app knows what you meant to eat, not
what you ate, and must never imply otherwise.

### Phase 38 — Split `meals.js` *(Ren)*
**No schema.** 2,081 lines, seven features, and it reads as a wall.

Needs a context object designed properly rather than a script. **Not to be
attempted alongside anything else** — the lesson from Phase 29.

### 🔁 Re-run the trace

---

## Round 4 — productisation

### Phase 39 — Accounts and plans
Free tier genuinely useful. **Accessibility never behind the paywall** —
step quality, cook mode, undo, reduced motion, density all free. Charge for
household members beyond two, the full library, export.

### Phase 40 — Notifications, part two
Chore reminders, plan-the-week nudge. Only after Phase 32 has been lived
with, because the fastest way to lose this audience is to become another app
that buzzes.

---

## Still open, unscheduled

Small items logged across the handoffs, none of which any persona hit:
`addAlternative()` has no button; the macro-gap Edit link does not land on
the right food; the claim step is missing from the Foods scan path; the
cell-split does not auto-narrow; `describeUsualInterval` has no restock
history to read; `option_label` has no editor; step wording cannot be
edited without delete-and-re-add.

**Deliberately unscheduled.** They are real and they are not what is
stopping anyone using the product. They go in a cleanup phase when a round
finishes early.

---

## What "serviceable" means

The loop ends for a persona when all five are true:

1. Still using it at three weeks
2. Would recommend it to someone like them
3. Would pay something
4. Names a specific way it helped
5. **Their biggest complaint is a wish, not a blocker**

Point 5 is the real test. "I wish there were more Thai recipes" is finished.
"I couldn't get my wife on it" is not.

### Scoreboard

| Persona | Using | Recommend | Pay | Helped | Wish not blocker |
|---|---|---|---|---|---|
| Dev | ✅ | ⚠️ caveat | ⚠️ part | ✅ | ❌ invite |
| Priya | ❌ | ❌ | ❌ | ❌ | ❌ invite |
| Marcus | ✅ | ✅ | ⚠️ retest | ✅ | ⚠️ tins |
| Sarah | ⚠️ | ⚠️ | ✅ £3 | ✅ | ❌ scope |
| Tom | ✅ | ✅ | ✅ £5 | ✅ | ❌ notifications |
| Eileen | ⚠️ | ⚠️ | ❌ | ✅ | ❌ health |
| Jodie | ❌ | ❌ | ❌ | ❌ | ❌ drift |
| Ren | ✅ | ✅ | ✅ £6 | ✅ | ⚠️ meals page |

**Currently 0 of 8 serviceable.** Three are close and two are absent.

---

## How the trace gets re-run

Not from memory. Each re-run:

1. Re-reads the code at the current commit, the way the first one did.
2. Walks each persona through the flows they actually use.
3. Records the same five verdicts.
4. **Adds any new friction found** — a fix that creates a friction is not a
   fix.
5. Updates the scoreboard in this file.

The personas do not get more forgiving because work has been done. Priya
does not soften because the invite flow was hard.

**Rounds 1 to 3 are roughly the work already delivered in this session, so
the sequence is realistic rather than aspirational.** The unknown is Phase
31: nobody in this category has solved pantry drift, and the vague-level
idea might not survive contact with real use. If it does not, that is worth
finding out in Round 1 rather than Round 4.
