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

### ~~B1. Tins, not grams~~ ✅ *(Marcus)*
Phase 35. Three traces, unfixed, costs him every shop. At scan time: *how
does this come?* — tin, bottle, pack — and how much is in one. Back-fill
from the reference file where the name matches.
**Done when:** the shopping list says "2 tins".

### ~~B2. Backfill existing foods from the reference file~~ ✅
Logged at Phase 13. Chopped tomatoes will not acquire `grams_per_item` on
their own, which is half of why B1 bites.
**Done when:** a one-tap "fill in what we know" pass exists.

**Both shipped.** No schema.

**B1** — `packsFor()` in `lib/units.js`. A weight that divides to a whole
number of packs now says so: the shopping list reads **"800 g (2 tins)"**,
and a recipe step reads **"Add the 2 tins of chopped tomatoes"** rather than
carrying both answers at once.

**It stays quiet when it cannot help.** 730 g of a 400 g tin is 1.8 tins,
and "1.8 tins" is a worse answer than silence — you would still be doing the
sum, now with a decimal in your head. Tolerance is 5%, so 790 g still reads
as 2 tins.

**B2** — the Foods screen offers *"12 of your foods can be filled in from
what the app already knows"*, listing what each would gain before you tap.
**Only fills blanks**, and says so, because "update my food data" sounds
like it might overwrite what you typed. Offered only when there is something
to fill.

B2 is what makes B1 work. The machinery for packs shipped in Phase 12 and
did nothing for three traces because no food had the data.

**A gate caught a consequence:** recipe steps started reading *"Add the
400 g (1 tin) chopped tomatoes"*. Correct, and clumsy — steps now say the
pack alone, which is what somebody standing at a cupboard would say, and
keeps rule 6's twenty words.

---

## ✅ BLOCK B COMPLETE

---

## BLOCK C — written, tested, unwired

Each of these is a function that already exists with tests, missing only its
control. Cheap, and visible.

- ~~**C1.** Dietary filter in the library~~ ✅ — a "Suitable for" select.
  One choice becomes a one-element list, so `filterRecipes` needs no special
  case and "every tag must match" still holds. A single select rather than
  four tick boxes: asking for one thing is far commoner than a combination,
  and four boxes in a filter row is a wall.
- ~~**C2.** `addAlternative()`~~ ✅ — one action from the ingredient row. No mode, no separate screen.
- ~~**C3.** `option_label`~~ ✅ — "Rename this option" on the group row.
- ~~**C4.** Dietary conflict notes~~ ✅ — shown on the plan entry, worded
  *"Not marked vegetarian — Sam asked for that."* **Not** "contains meat":
  tags say what a meal IS, and absence is not a claim about what it is not.
  A fact, never a block.
- ~~**C5.** `portion_factor` on the meal plan~~ ✅ — **already done** in
  Phase 20; the worklist was wrong. `servingsForEntry` has been wired since
  `mealPlan.js` v3.
- **C6.** "You usually buy this every 3 weeks" — **blocked, needs schema.**
  `describeUsualInterval` is written and tested; `pantry_stock` keeps only
  the latest `last_restocked`, so there is no history to average. Needs a
  restock log table. Left here rather than faked.

**C2, C3 and C9 shared a defect worth naming.** All three shipped an editor
for a column whose update function took a **destructured object that never
mentioned the field**. Unnamed keys are silently discarded, so every one
would have looked like it saved and changed nothing — no error, no clue. A
behaviour test now asserts the signatures name them, because a silent
discard is invisible to every other gate.
- ~~**C7.** Ingredient picker offering reference foods~~ ✅ — typing a known name now creates it complete, and says so first.
- ~~**C8.** Inline step editing~~ ✅ — an Edit button per step, with the
  same live style checker as adding one, so a step edited by hand cannot
  break rules a step added by hand cannot. Changing a word used to mean
  delete and re-add, which lost the note, the timer and the position: a typo
  cost you the whole step.
- ~~**C9.** `method_note` editable~~ ✅
- ~~**C10.** Recipe scaling above 1~~ ✅ — a "Cooking for" number beside
  the Cook button. Quantities in the steps scale with it. `resolveTokens`
  has honoured a scale since Phase 15 and nothing ever set one, so every
  recipe cooked at its default however many were eating.

---

## BLOCK D — the new question

### ~~D1. What did the week cost?~~ ✅ *(Jodie)*
> *"Ask me if it saved me money, not if I liked it."*

She is right, and the app cannot answer. **There is no price anywhere in the
schema.** This needs its own design, not a column: where a price comes from
(typed, scanned, remembered), how it ages, what a week's figure means when
half the pantry was bought last month, and how to show it without turning
into a budgeting app that shames people.

**Shipped.** Schema revision 21. Four decisions, made once:

**1. A price lives on the FOOD, not the purchase.** Barcodes carry no
prices, Open Food Facts has none, receipt scanning is parked on cost, and
typing a price every shop is the upkeep that made Jodie uninstall. You type
it once and every future list uses it — the reference file pattern: answer
once, benefit forever.

**2. What gets costed is the LIST, not "the week".** *"This week cost £34"*
is a lie whenever half the pantry was bought last month, and unpicking it
needs a ledger nobody will keep. *"About £24 for this list"* is checkable,
useful before you leave the house, and answerable from data that exists.

**3. It says what it does not know.** An unpriced line is **never counted
as zero** — the worst thing this could do to somebody deciding whether they
can afford a shop is quietly understate it. An incomplete total says *"at
least £24, for the 12 items with a price. 5 still to price."*

**4. It is not a budget.** No limit, no overspend, no colour, no history of
how you did. Tested: no message may contain "too much", "over", "budget",
"afford", "overspend", "expensive" or "cheap". A number that can be failed
is a number people stop looking at.

Even a complete total says *"about"* — it is an estimate, and pretending
otherwise gets you caught short at the till.

---

## ✅ BLOCK D COMPLETE

---

## BLOCK E — friction found by the traces, not yet placed

- ~~**E1.** Settings grouping~~ ✅ — twelve flat sections became seven. Appearance is five toggle groups set once and rarely revisited, so it collapses to one line. Household goes first: it is the thing with another person waiting on it.
- ~~**E2.** `special` tier recipes~~ ✅ — **10 written**, library 100 → 110.
  Beef in pastry, slow lamb shoulder, beef in red wine, paella-style rice,
  a flourless chocolate torte, sea bass, mushroom wellington, prawn risotto,
  orange chicken, baked cheese for sharing.

  Ten rather than twenty: the brief guessed at a number, and ten covers
  Sunday, a birthday and having people round without padding the file. More
  when somebody asks for a kind that is missing.

  **The gate caught an invented ref** — `mushroom-portobello` where the
  reference file says `portobello-mushroom`. Would have created a bare
  macro-less food.
- ~~**E3.** Rotation mode~~ ✅ — schema revision 22. Off by default. The library stays **reachable**, it just stops being offered: hiding it would be the app deciding somebody may not change their mind.
- ~~**E4.** Search above "needs fixing"~~ ✅ — that section is usually empty, but on the day it is not it pushed search below the fold on the one screen somebody opened to search.
- ~~**E5.** At-a-glance freshness per location~~ ✅ — a count says how much is in there; it does not say whether anything needs you. The closed heading now answers that.
- ~~**E6.** Cooking lowers a level~~ ✅ — one step down, never two: a cupboard marked "plenty" becomes "low", not empty. "Low" is left alone, because a recipe cannot tell you whether that was the last of it.
- **E7.** Quiet hours — **moot, and left undone deliberately.** Nothing fires unless the app is open, so nothing can wake you at 3am. This becomes real only if background push ever exists.
- ~~**E8.** Bulk reminder levels~~ ✅ — "Set up shopping reminders" on the
  pantry: one list, three buttons a row. Never / when it runs out / at one
  left. A number box would put arithmetic between somebody and a decision
  they have already made.

  Setting one used to mean opening a row, then a sheet, then finding a
  field. Fine for a dozen staples, tedious for fifty — and "tedious for
  fifty" means it never gets done, which makes the feature theoretical.

---

## ✅ BLOCK E COMPLETE (E7 dropped, with reasons)

---

## BLOCK F — consistency debt

Real, invisible to users until it bites.

- ~~**F1.** Undo on step delete and member removal~~ ✅ — both snapshot the whole row. A deleted step goes back at the END, and the toast **says so**, because a silent reorder of a method is worse than the deletion was. The member confirm was doing real work — it said what was *not* deleted — so that line moved into the toast rather than being lost with it. *(Project delete still confirms.)*
- ~~**F2.** Empty states~~ ✅ — the weekly plan and Things You Buy. The plan's grid told you it was empty, which you could see; it now says what the screen is for and offers Plan The Week.
- ~~**F3.** Icons beyond the pantry and hubs~~ ✅ — page headings on Calendar, Shopping, Meals, Weekly plan, Pantry and Things You Buy, through the shared `pageHeading()`.
- ~~**F4.** Calendar event kinds~~ ✅ — **shape, not colour.** A chore, a
  holiday and a work day sat in one undifferentiated list, told apart only
  by reading to the end of the line. Three distinct silhouettes, leading the
  row so the shape does the sorting, and distinguishable in greyscale
  (WCAG 1.4.1).

**The selector gate fired again**, on `#scan-food` — an id I invented for
the third time. It caught it before commit. The fix was not a better
selector: `scanBtn` was already in scope, and a closure beats a
`querySelector` every time.

---

## ✅ BLOCK F COMPLETE (F9 blocked on schema)
- ~~**F5.** Claim step in the Foods scan path~~ ✅ — Phase 11 fixed the duplicate-food defect in one of the two places somebody scans. The same three functions, not a second implementation: two versions of "which food is this" would drift and only one would get fixed.
- ~~**F6.** Macro-gap Edit link~~ ✅ — the link carried `?food=<id>` and the view never read it, so it landed on a screen that can hold hundreds and left you to find it. The router matches only the path, so the query was ours to read.
- ~~**F7.** Cell split~~ ✅ — adding a second meal to a slot now asks whether the first is still for everyone. **Offered, not done automatically**: narrowing somebody else's meal without asking is a change they did not make to a row they were not looking at. Silent when the slot already held two, or when nobody is named.
- ~~**F8.** First-run resumability~~ ✅ — same six-hour rule as Cook Mode and Plan The Week. The inconsistency showed up exactly when it could least be afforded: halfway through, having been interrupted.
- **F9.** Repeat last week — **blocked, needs schema.** `weekly_meal_plan` holds one rolling week with no history, so there is nothing to repeat *from*. A plan-history table, not an afternoon.
- ~~**F10.** Tick off inside Plan The Week~~ ✅ — marks it bought, which is the same act as on the shopping screen, so it also lands in the pantry and the next rebuild does not ask again.

---

## BLOCK G — structural

### ~~G1. Split `meals.js`~~ ✅ **FOUR extracted, three deliberately left**

**2,421 → 1,164 lines**, more than halved. Four features extracted:

- `js/views/meals/library.js` — the recipe library panel
- `js/views/meals/cookNow.js` — "what could I make?"
- `js/views/meals/method.js` — method steps and Cook Mode
- `js/views/meals/ingredients.js` — rows, the add form, option groups, the
  food picker

**The interface, and why it is not a context object.** The Phase 29 note
assumed a `ctx` bag threaded through everything. That would have moved the
tangle rather than removed it — a context object full of `let` is shared
mutable state with a nicer name.

Instead each module **owns its own DOM and its own state**, and is given
only what it genuinely cannot know:

- `library.js` takes `signal`, `isDestroyed` and `onAdded`, and returns
  `{ section, open }`. `open()` exists because the Meals empty state offers
  "browse the library" — and reaching into another module's DOM to force a
  `<details>` open is exactly the coupling the split removes.
- `cookNow.js` takes `signal` and `isDestroyed`, and returns
  `{ section, update }`. It is **told** its data. Three other features read
  the same meals and ingredients, so one owner beats two copies that can
  disagree.

**Gated.** Eight new a11y checks assert each panel returns a section, asks
for nothing else, does not load until opened, survives being given nothing,
and that rotation mode hides the section entirely rather than emptying it.

`method.js` is a **factory per meal** rather than a panel: a method belongs
to one recipe and there is no state to carry between them. It is also the
first module that genuinely reads another feature — a step's `{{ing:}}`
token resolves against the meal's ingredients — so it is **given** the
ingredient rows rather than fetching them. They have one owner, and it is
not that module.

### The bug this extraction had, and why it matters

Substituting `stepsByMeal.get(meal.id) || []` for the new `steps` parameter
produced **`const steps = steps;`** — a temporal-dead-zone throw.

**The render gate could not see it.** It renders each view, and the method
section only builds when a meal SHEET is opened. The a11y gate caught it,
by four unrelated failures about the ingredient picker: the throw stopped
the card build partway, and the picker vanished.

Four new checks now build a method section directly, including one with no
steps at all, which exercises that path without needing a sheet.

### Ingredients: the most entangled, and why it is only builders

Macros read these rows. So does `method.js`, for `{{ing:}}` tokens. So does
`cookNow.js`. **Three readers and two copies is how data drifts**, so the
rows keep one owner in `meals.js` and everything else is handed them.

The module therefore **does not fetch and does not cache**. It returns three
builders and nothing else. It is also rebuilt whenever `foods` changes — a
builder closed over a stale list would offer foods that have since been
deleted.

### Stopping at four, and why

The plan said seven. After reading the remaining three properly, the honest
answer is that they should stay.

**Macros are not a separable region — they are the card's live state.** The
block shares `body`, `meal`, `rows`, `serves`, `macros` and `scalerInput`,
and `macros` is *recomputed* when the servings scaler changes, with the
table repainted in place. Extracting it means passing six things plus a
repaint callback to move ~130 lines out of 1,164.

**The meal list and its filter are the same object seen twice.** A list and
the control that narrows it are not two features.

So what remains is a meal list, the filter that narrows it, and the card it
opens — which is what this view *is*. Splitting further would be motion, not
progress, and a file of eleven modules that each need the other ten is worse
than one file of 1,164 lines.

**The four that left were the four that could leave cleanly**, each with a
real boundary: its own DOM, its own state, and an interface small enough to
write down. That was the test, not the count.

### G2. Unify the four DOM helper variants
Documented and gated. Only worth doing with G1.

### G3. Visual regression testing
Nine gates prove structure, contrast and platform hazards. None proves a
screen looks right.

---

## BLOCK H — before anyone else uses it

### H1. Prove household isolation on two real accounts — ⏸ **PARKED**
Needs a phone and a laptop together; Graeme expects to do this next week.
**Still the one that must not ship unproven.**
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
