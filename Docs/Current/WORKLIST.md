# Home-OS: The Worklist
01 Sep 2026 v1

Everything outstanding, in the order to do it, with what "done" means for
each. Work down it. **At the bottom is a full diagnostic**, and nothing
below the line starts until the line is reached.

Sources: three persona traces, 46 items logged across the phase handoffs,
and the remediation schedule.

---

## The amendment worth arguing for

The obvious order is cheapest-first. **Do not use it.**

Across three traces, Sarah and Eileen have not moved once. Both times the
roadmap said "later" while four things shipped for people who were already
reasonably happy — because those things were smaller. Cheapest-first is
precisely the rule that produced that outcome, and it will produce it again.

**So Block A is the two personas who have never been served**, even though
both are larger than most of what follows.

---

## BLOCK A — the people who have been deferred twice

### ~~A1. Ask what they came for~~ ✅ *(Sarah)*
Phase 33. One question at first run: kitchen / home and chores / health /
all of it. Hides the rest of the dashboard until asked, reversible in
Settings, never a paywall.
**Done when:** a new account sees one domain, and Sarah's usability score
moves off 5.

**Shipped.** Schema revision 20. First run asks as step 2 of 5; Settings has
"What you use it for". Empty means everything and is the default. Dashboard
and Settings can never be hidden. Correction recorded: the dashboard was not
the problem, the nav bar was.

**Also fixed alongside:** the recipe library was unfindable — built last on
the Meals page, after the add form, behind a collapsed `<details>`. A
hundred recipes nobody could reach. Moved above the add form with a heading,
a description and a count, the Kitchen hub blurb rewritten, and an a11y
check added so it cannot drift back down the page.

### ~~A2. Health gets the kitchen's care~~ ✅ *(Eileen)*
Phase 36, **brought forward from Round 3**. Icons and state badges on Water,
Weight, Exercises. A weight trend worth looking at. Empty states. Undo on
anything destructive.
**Done when:** Eileen would pay something.

**Shipped.** No schema. `pageHeading()` added to `lib/icons.js`; Water,
Weight and Exercises now lead with an icon. The weight trend went from
320x140 with 8px padding — a thumbnail with points touching the edges — to a
full-width chart with the latest reading marked by size and a ring, plus its
range in words because the SVG is `aria-hidden`. Exercises show a "Done
today" badge, and the Health hub badges only when everything is done.

**Deliberately not built:** any "not done" state. An undone exercise is a
fact about today, not a failing, and this is the screen where alarm framing
would do most harm.

**Two gate findings:**

- **`weight.js` had never been rendered by the a11y gate.** The Supabase
  stub had no `.not()`, so `getCurrentTarget()` threw and the screen was
  simply absent from the coverage line rather than failing. The quieter kind
  of gap. Stub extended; a11y 222 → **237 checks**.
- The new anti-shaming check flagged the app for the sentence *"nothing here
  is a streak."* The pattern was matching vocabulary rather than framing.
  Tightened — a gate that punishes a sentence for disavowing the thing it
  forbids is one people learn to work around.

### ~~A3. Water and exercise reminders~~ ✅
Removed in Phase 32 because nothing sent them. Eileen and Tom both want a
gentle daily prompt. Build the senders, restore the switches.
**Done when:** the two switches are back and both deliver.

**Shipped.** No schema. Four switches now, all four with delivery behind
them — the Phase 32 rule held: a switch is only offered once something
sends it.

**Both fire from the DASHBOARD, not from their own screens.** On the
Exercises screen a notification tells you what you are already looking at,
which is Tom's exact complaint about labels dressed as reminders. From the
dashboard it is useful: you opened the app for the shopping list and are
reminded of something you came in for a different reason.

**The wording is the whole design.** Exercises say *"3 of 5 still to do
today"* — not "don't forget" (a nag) and not "you've only done 2" (a
scoreline). Water says what you **have** had: *"500 ml so far today, of 2
litres"*. "500 ml so far" and "you are 1.5 litres short" are the same
arithmetic and completely different sentences, and only one is a fact about
water rather than a verdict on you.

Tested in both directions — the presence of the fact and the absence of
nagging, scorelines, duty framing and shortfall language.

Water does not fire once the target is met: telling somebody who has already
finished is a buzz with no content.

---

## ✅ BLOCK A COMPLETE

The two personas deferred across three traces have both been served.

---

## BLOCK B — the longest-standing friction

### B1. Tins, not grams *(Marcus)*
Phase 35. Three traces, unfixed, costs him every shop. At scan time: *how
does this come?* — tin, bottle, pack — and how much is in one. Back-fill
from the reference file where the name matches.
**Done when:** the shopping list says "2 tins".

### B2. Backfill existing foods from the reference file
Logged at Phase 13. Chopped tomatoes will not acquire `grams_per_item` on
their own, which is half of why B1 bites.
**Done when:** a one-tap "fill in what we know" pass exists.

---

## BLOCK C — written, tested, unwired

Each of these is a function that already exists with tests, missing only its
control. Cheap, and visible.

- **C1.** Dietary filter in the library *(Ren — 72 vegetarian recipes, no
  way to ask)*
- **C2.** `addAlternative()` — no button *(Phase 19)*
- **C3.** `option_label` — no editor *(Phase 19)*
- **C4.** Dietary conflict notes — computed, never displayed *(Phase 20)*
- **C5.** `portion_factor` on the meal plan — maths done, unused in the UI
- **C6.** "You usually buy this every 3 weeks" — needs restock history first
- **C7.** Ingredient picker offering reference foods *(Phase 13)*
- **C8.** Inline step editing — `updateStep()` exists, no form
- **C9.** `method_note` editable
- **C10.** Recipe scaling above 1 — `resolveTokens` honours it, nothing sets it

---

## BLOCK D — the new question

### D1. What did the week cost? *(Jodie)*
> *"Ask me if it saved me money, not if I liked it."*

She is right, and the app cannot answer. **There is no price anywhere in the
schema.** This needs its own design, not a column: where a price comes from
(typed, scanned, remembered), how it ages, what a week's figure means when
half the pantry was bought last month, and how to show it without turning
into a budgeting app that shames people.

**Do not start this inside another block.** It is the only genuinely new
feature in three traces.

---

## BLOCK E — friction found by the traces, not yet placed

- **E1.** Settings grouping *(Priya — nine sections, 974 lines)*
- **E2.** ~20 `special` tier recipes — **zero of 100** today
- **E3.** Rotation mode: "these are my meals, stop suggesting" *(Tom)*
- **E4.** Search above "needs fixing" in the pantry *(Phase 23)*
- **E5.** At-a-glance freshness per location *(Phase 23)*
- **E6.** Cooking lowers a level, not only a number *(Phase 31)*
- **E7.** Quiet hours for notifications
- **E8.** Bulk reminder levels — one at a time today

---

## BLOCK F — consistency debt

Real, invisible to users until it bites.

- **F1.** Undo on the remaining destructive actions — step delete, member
  remove, project delete *(only shopping and pantry have it)*
- **F2.** Empty states on the screens Phase 28 did not reach
- **F3.** Icons beyond the pantry and hubs
- **F4.** Calendar state colour — event types are text only
- **F5.** Claim step in the Foods scan path *(pantry only today)*
- **F6.** Macro-gap Edit link landing on the right food
- **F7.** Cell split auto-narrowing *(`remainingMembers()` unwired)*
- **F8.** First-run resumability
- **F9.** Repeat last week / usual lunch — **needs plan history, so schema**
- **F10.** Tick shortfall items off inside Plan The Week step 3

---

## BLOCK G — structural

### G1. Split `meals.js`
2,081 lines, seven features. Needs a context object designed properly rather
than a script. **Not to be attempted alongside anything else** — the Phase
29 lesson.

### G2. Unify the four DOM helper variants
Documented and gated. Only worth doing with G1.

### G3. Visual regression testing
Nine gates prove structure, contrast and platform hazards. None proves a
screen looks right.

---

## BLOCK H — before anyone else uses it

### H1. Prove household isolation on two real accounts
Logged since Phase 18 and **still unproven**. The SQL editor bypasses RLS,
so structure is verified and behaviour is not. A creates a food, B in
another household cannot see it; B joins and can; B logs a weight and A
cannot see it.
**This is the one that must not ship unproven.**

### H2. Run the device smoke test
`DEVICE_SMOKE_TEST.md`. Notifications first — that is where the last real
bug was.

### H3. Accounts and plans
Free tier genuinely useful, **accessibility never behind the paywall**.

---

## ═══ THE LINE ═══

**Nothing below starts until Blocks A–H are done or explicitly dropped.**

---

## THE FULL DIAGNOSTIC

Not a re-trace. A complete audit, and the terms are set here so they cannot
soften later.

**1. Re-read the code first.** Every previous trace began by reading the
app at that commit rather than trusting the last one. That does not change
because the list got long.

**2. All eight personas, every flow they touch** — not only the ones we
fixed. Regression is as findable as progress.

**3. Score:** quality, usability, likelihood to recommend, would-pay,
still-using-at-three-weeks, and **biggest complaint is a wish not a
blocker**.

**4. Add two personas nobody has designed for.** Three traces with the same
eight people risks fitting the product to the test. Candidates: someone with
a visual impairment using a screen reader throughout, and someone who is not
the cook but does the shopping.

**5. Nine gates, green, plus the device smoke test done on a real phone by a
human.**

**6. Record what got worse.** Every fix is a chance to break something, and
five traces of only-good-news would mean the traces had stopped working.

### What "finished" looks like

- **8 of 8 serviceable**, or a written reason a persona is out of scope
- Usability mean **above 8** *(6.9 today)*
- NPS **above +40** *(+12 today)*
- Nobody's biggest complaint is a blocker
- H1 proven on real accounts

### What happens if it is not met

The list restarts, ordered by whoever is furthest behind — **not by what is
cheapest.** That is the rule that produced Block A, and it stays.
