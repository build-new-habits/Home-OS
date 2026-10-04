# Home-OS: Persona Re-Trace, Round 3 — the kitchen app

<!-- Docs/Current/PERSONAS_RETRACE_3.md — 04 Oct 2026 v1 -->

Run against `f3d88f4` on branch `kitchen` (kitchen-only build, 214 library
recipes, migration 026 not applied). Previous: `PERSONAS_RETRACE_2.md`
(the whole-household app, 1 Sep 2026).

## How this was done

Every flow below was driven for real in Chromium at phone size (390 × 844)
against an in-memory copy of the database, starting from a brand-new empty
account: the guided first run, Today, the week board and list, the meal
picker, Fill the open meals, the recipe page, cook mode, the shopping list,
Bought everything and put-away, and Pantry quick start. Then again at 150%
text, in Dusk (dark) and in high contrast, with axe-core on every screen.
Quotes are written for the personas; the frictions are all things that
happened on screen.

**The personas are not more generous because a lot was built.** Ten people,
three moments each: first ten minutes, first week, week four.

---

## What is genuinely good now

Stated first, because it is real and it should not be lost in the fixes.

- **Accessibility holds up.** No axe failures on any kitchen screen in any
  theme. Nothing overflows at 150% text. The week board is a proper grid
  with arrow keys and names every square ("Sunday dinner: Chicken and
  peanut stew"). No competitor below is close.
- **Cook mode is the best in the comparison set.** One instruction at a
  time, big type, named timers that survive a sleeping screen, ingredients
  one tap away. Steps say what to look for ("until a knife slides in with
  no resistance"), not only a time.
- **The recipe page answers the questions people actually have**: what you
  have and what is missing (one tap to the list), nutrition against UK
  reference intakes, swaps, vegetarian or vegan in one tap, servings set to
  your household, the kit you will need.
- **The plan drives the list and the pantry without anyone asking.** Plan
  a meal and twelve things appear on the list; Bought everything files them
  into the pantry; We cooked it takes them out again.
- **Nothing nags and nothing shames.** "Nothing planned", never "missed".

## What is holding it back (seen on screen, in order of how many it hurts)

1. **The shopping list reads like a recipe, not a shop.** For one portion
   of chicken and peanut stew it said: *0.75 cloves (3.8 g)* of garlic,
   *0.25 sweet potatos (50 g)*, *1.5 thighs (135 g)*, *0.25 tins (100 g)*
   of chopped tomatoes, *0.6 ml* chilli powder, *3.8 ml* vegetable oil. You
   cannot buy a quarter of an onion, and nobody buys 0.6 ml of chilli
   powder: that is a *have you got it?* question, not a quantity. "potatos"
   is misspelt. This is the screen people use every week in a shop.
2. **"Fill the open meals" does nothing for a new user.** It only draws on
   your own meals. With one meal saved and 214 recipes in the library it
   said *Nothing to fill*. The thing Mealime and Samsung Food sell on —
   "here is a week, swap what you don't fancy" — is one button away and the
   button is empty.
3. **On a Sunday, Plan opens on a week that is over.** Today is the last
   day of "This week", so the board shows six days in the past. Sunday is
   when most households plan. Next week is a small text link.
4. **The first ten minutes are not about the person.** The guided start
   never asks who you cook for or whether anyone is vegetarian; it offers
   the first six recipes in the file (two West African stews and three
   breakfasts), counts *steps* not minutes, lists Monday first on a Sunday,
   and says "scan things as you put them away" and "everything is on the
   dashboard" — neither true of this app any more. Picking a recipe and
   pressing Next (the obvious thing) skips the day and plans nothing.
5. **Today is long and busy.** The next-meal card carries a portion stepper
   and three portion chips; then thirteen drink chips; then nutrition. For
   someone who wants *what's for dinner and how do I start it*, the answer
   is buried in controls. "Show me how this works" stays at the top forever.
6. **No photos yet.** Every recipe is a colour tile. Kitchen Stories,
   Mealime and Samsung Food lead with the picture; it is the single biggest
   visual gap. Blocked on Graeme's images, which the app is ready for.
7. **Small things that cost trust:** oven temperatures say "200C" with no
   fan or gas mark; put-away suggests a use-by of "about Mon, 4 Oct" for a
   tin (it means 2027 and leaves the year off) and asks for a use-by on
   chilli powder at all.
8. **You cannot try it without an account**, and the sign-in screen has no
   visible way to make one. Waiting on a server decision.

---

## The ten people

### 1. Graeme — family of four, sometimes cooks for 1–3, tracks nutrition, the odd IPA

**First ten minutes.** Knows the app; adds himself and three others. Loves
that portions start at the household and that "Just me / 2 / 3 / Everyone
/ Double, freeze half" exist. Nutrition per day against reference intakes
is exactly what he asked for. Beer one tap on Today.

**First week.** Plans on Sunday and lands on a dead week; taps Next week
each time. The list for a family week is long and full of "0.5 tins",
"2.25 onions", "11 ml soy sauce": he rounds it in his head in the shop.
Fibre shows "not recorded yet" for own meals until migration 026.

**Week four.** Uses it daily. Wants to see the week's names on the board
without tapping each square, and photos.

> *"It does what I designed it to do. The list is the bit I'd be
> embarrassed to show someone."*

**8/10 · ★★★★☆ · Would pay: yes, £24.99 a year.**

### 2. Becky — busy parent, two under eight, new to cooking

**First ten minutes.** The guided start shows her jollof rice and a
peanut stew. She wanted fish fingers-adjacent. Picks overnight oats,
presses Next, plans nothing, and is told it is "in your meals".

**First week.** Finds the library and Shepherd's pie. The recipe page and
cook mode are the first time a recipe app has not made her feel stupid.
"200C" — her oven is fan, so she guesses. The list says "0.25 onions".

**Week four.** Still using cook mode. Has never pressed Fill the open
meals because it said nothing to fill the one time she tried.

> *"When it's cooking it's brilliant. Planning a week of it is still on
> me."*

**6/10 · ★★★☆☆ · Would pay: maybe £1.99 a month, after a free month.**

### 3. Sam — cooks for one on a budget

**First ten minutes.** Household of one: recipes start at one serving,
which he notices and likes. Budget filter, "What can I make with what I
have?" works from his cupboard after Pantry quick start.

**First week.** The list is the problem: "1.5 thighs", "0.25 tins". He
needs to know he buys a pack of thighs and a tin, and what to do with the
other three-quarters. Double, freeze half helps; he wants that suggested.

**Week four.** No idea what a week costs. Would like "uses up the other
half of the tin" when picking the next meal.

> *"It's honest about one portion. The shop doesn't sell one portion."*

**6/10 · ★★★☆☆ · Would pay: no at £2.99; £12.99 a year, maybe.**

### 4. Priya and Jo — vegetarian couple

**First ten minutes.** Nothing asks if they are vegetarian. The library's
Vegetarian chip is there and 135 recipes qualify — a strong library for
them. "Make it vegetarian" on meat recipes delights.

**First week.** Fill the open meals: nothing. The picker shows meat
dinners first. They set dietary tags on members in Settings and nothing
visibly changes.

**Week four.** Happy cooks, unhappy planners.

> *"Great vegetarian recipes, and it keeps offering us bangers and mash."*

**7/10 · ★★★★☆ · Would pay: £24.99 a year between them if planning
respected them.**

### 5. Ade — keen cook, 300 recipes in Paprika

**First ten minutes.** Looks for import from a web page. There isn't one.
The editor is good — paste a list, paste a method, live nutrition — but
300 recipes by hand is not a thing he will do.

**First week.** Admires the step style and cook-mode timers. Library is
competent but he cooks his own.

**Week four.** Gone back to Paprika.

> *"Lovely engine. I can't get my recipes in."*

**4/10 · ★★☆☆☆ · Would pay: £4.99 a month if import worked. Blocked on a
server.**

### 6. Margaret — low vision, 150% text, TalkBack

**First ten minutes.** Everything reads; nothing clips; every control has
a name; focus lands on the heading after each move. Better than anything
she has tried. The board grid with arrow keys is usable.

**First week.** Today is a long swipe: next meal, nine portion controls,
thirteen drink chips, nutrition. She swipes past forty things to reach
"Things to buy". Cook mode at large text is excellent.

**Week four.** Uses Recipes and cook mode; avoids Today.

> *"It never fights my screen reader. It does talk a lot before it gets to
> the point."*

**8/10 · ★★★★☆ · Would pay: yes, £2.99 a month.**

### 7. Dev — ADHD, abandons apps that nag

**First ten minutes.** No notifications, no streaks: relief. The first
run's two exits ("Skip this", "I will find my own way around") confuse
him; he picks the wrong one.

**First week.** Today has too many things to look at. He wants one card:
what's next, one button to start. "Fill the open meals" empty — the one
button that would have done the planning for him.

**Week four.** Still opens it for cook mode, which is the bit with no
decisions.

> *"Nothing nags me, which is why I'm still here. Make it decide for me."*

**7/10 · ★★★★☆ · Would pay: £24.99 a year.**

### 8. Eileen — 74, not confident with phones

**First ten minutes.** Large clear buttons. The guided start is the right
idea, but she presses Next after choosing and is told the meal is "in your
meals", which means nothing to her. "Board / List" — she does not know
what a board is.

**First week.** Her daughter plans for her. Cook mode is "like having
someone read it out". Oven: "200C" — she has a gas cooker.

**Week four.** Uses the recipe page and cook mode only.

> *"The cooking bit is lovely. Gas mark, please."*

**6/10 · ★★★☆☆ · Would pay: no; would use free.**

### 9. Lou — batch-cooks and freezes on Sundays

**First ten minutes.** Double, freeze half is exactly her habit, and the
spare goes to the freezer in the pantry. Tomorrow's "take out of the
freezer" reminder is something no competitor does.

**First week.** Wants to plan "freezer chilli" on Wednesday from the
portion she froze on Sunday, without it going on the list. Leftovers wait
on migration 026; the freezer item sits in Pantry, not in the picker.

**Week four.** Uses it; works around the freezer gap.

> *"It knows I froze it. It doesn't offer it back to me."*

**7/10 · ★★★★☆ · Would pay: £24.99 a year.**

### 10. Tom — trying it before paying

**First ten minutes.** The first screen is a sign-in form with no visible
sign-up. If he gets past it: an empty Today, a guided start that offers
six random recipes, and a plan for one meal. He has seen Mealime build a
whole week in two minutes.

**First week.** Would not reach a first week.

> *"I didn't get far enough to know if it's good."*

**3/10 · ★★☆☆☆ · Would pay: not yet.**

---

## Scores

| Person | /10 | Stars | Pay |
|---|---|---|---|
| Graeme | 8 | 4 | £24.99/yr |
| Becky, new cook | 6 | 3 | £1.99/mo after a trial |
| Sam, one on a budget | 6 | 3 | £12.99/yr at most |
| Priya and Jo, vegetarian | 7 | 4 | £24.99/yr if planning respects them |
| Ade, keen cook | 4 | 2 | £4.99/mo with import |
| Margaret, low vision | 8 | 4 | £2.99/mo |
| Dev, ADHD | 7 | 4 | £24.99/yr |
| Eileen, older | 6 | 3 | free only |
| Lou, batch cook | 7 | 4 | £24.99/yr |
| Tom, trial | 3 | 2 | not yet |
| **Mean** | **6.2** | **3.3** | 6 of 10 would pay something |

**Nobody is at five stars yet.** Six people are one or two fixes away; two
are blocked on a server (Ade: import; Tom: trying without an account).

---

## Against the best

| | Home-OS | Paprika | Mealime | Plan to Eat | Samsung Food | Kitchen Stories |
|---|---|---|---|---|---|---|
| Plan a week for you | **No** (own meals only) | No | **Yes** | No | **Yes** | No |
| List in things you buy | **No** (fractions) | Partly | **Yes** | Yes | Yes | Partly |
| Import from a web page | No | **Yes** | No | **Yes** | **Yes** | No |
| Photos | Not yet | Yours | **Yes** | Yours | **Yes** | **Yes, video** |
| Cook mode | **Best of the set** | Good | Good | Basic | Good | Good |
| Pantry that updates itself | **Yes** | Manual | No | No | Partly | No |
| Nutrition per day | **Yes** | Per recipe | Paid | No | Yes | Per recipe |
| Accessibility | **Best of the set** | Fair | Fair | Poor | Fair | Fair |
| No nagging | **Yes** | Yes | Pushes | Yes | Pushes | Pushes |
| Try free without signing up | No | Paid app | Yes | Trial | Yes | Yes |

Where Home-OS is behind is not cooking: it is **the first week** (plan
for me, a list I can shop from) and **getting started** (photos, trial,
import). Those are what reviewers rate on.

---

## Fixes, ranked by people moved to five stars per hour

| # | Fix | Who it moves | Hours | Status |
|---|---|---|---|---|
| 1 | **A list in things you buy.** Round up to whole items, tins and packs; cupboard staples (spices, oil, stock, sauces) as "check you have"; spoon amounts never shown as ml; spelling | everyone; Graeme, Becky, Sam to 5 with #2 | 2–3 | build now |
| 2 | **Plan my week.** Fill the open meals from the library as well as your meals: respects household diet, quicker on weekdays, varied cuisines, uses up what is near its date, reviewed before adding | Becky, Sam, Priya and Jo, Dev, Eileen, Tom | 3 | build now |
| 3 | **Plan opens on the week that matters.** Saturday evening and Sunday open next week; Today's Tomorrow on a Sunday goes there | everyone who plans at weekends | 1 | build now |
| 4 | **First run about the person.** Who you cook for and any diet first; recipes that suit (quick, family, vegetarian); today or tomorrow first; one exit; honest copy; "Show me how this works" goes once done | Becky, Eileen, Tom, Dev, Priya and Jo | 3 | next |
| 5 | **Today, calmer.** Next meal: name, photo, Start cooking; portions as one line that opens the plan. Drinks: the four you use most, the rest behind one button | Margaret, Dev, Eileen | 2 | next |
| 6 | **Oven in every form.** 200°C (180°C fan, gas 6) on the page and in cook mode | Becky, Eileen | 1 | next |
| 7 | **Freezer portions in the picker.** "In the freezer: 2 portions of chilli" offered first for that meal, never added to the list | Lou, Sam | 2 | after 026 |
| 8 | **Put-away for long-life food.** Do not ask for a use-by on spices, oils, tins and dried; dates a year out say the year | everyone, small | 0.5 | with #1 |
| 9 | **Photos** | everyone; the visual gap | — | waiting on images |
| 10 | **Try it on this phone, no account** | Tom | 6+ | needs a decision on local-only data |
| 11 | **Import from a web page** | Ade | — | needs a server |
| 12 | **What did the week cost?** | Sam | 4 | needs prices |

Building starts at 1 and works down. Each batch is committed and pushed.

---

## Built from this review

Recorded as each batch lands.

### Batch 1 — a list in things you buy (`91fdd01`)
Whole items, tins and bulbs with the recipe amount underneath; loose food
rounded up; spoonfuls and staples under Check the cupboard; the pantry gets
what you bought. No use-by asked for long-life food. "sweet potatoes".

### Batch 2 — Fill the week for me, and a list for meals still to come
- **Fill the week for me** draws on your meals and the whole library:
  household diet as a hard rule (vegan counts as vegetarian; nut free reads
  the ingredients), Monday to Thursday dinners 45 minutes or less, no
  cuisine or main protein two days running, at most two specials, things
  that need using up scored first, favourites first. Dinners by default,
  lunches and breakfasts if ticked. Another idea per meal; Different ideas
  for the lot. A new account now gets a whole week in two taps.
- **The list is for meals still to come.** Past days and Eaten meals no
  longer count (before, cooking Monday's dinner put its chicken back on
  Tuesday's list), and at the weekend next week is included.
- **Plan looks ahead at the weekend.** Sunday, or Saturday from 6 pm, opens
  next week and says so; Today's links still go to this week.
- Fresh herbs and ginger are a pack or a piece, never a cupboard check.

### Batch 3 — a first run about the person
Asks who you cook for (adds people up to the number, never removes) and
whether anyone eats differently; offers six quick dinners that suit, from
different cuisines, familiar first; days count from today and land in the
right week (it used to put "Monday" into the week just gone on a Sunday);
no Next on the day step, so choosing a recipe can no longer skip it; ends
with Fill the rest of the week for me. One exit ("Not now"). Finishing
updates settings at once, so Today stops offering the walk-through.

### Batch 4 — a calmer Today, and ovens for every kitchen
- The next meal says "Making 4 portions" with one Change button; the choices
  open in a sheet and focus comes back. Nine controls became two.
- Drinks show the four you add most (water, tea, coffee and juice to start;
  the beer rises if it is the one you tap), with More drinks for the rest.
- "Nothing planned today" when nothing is; "Nothing else" only after a meal.
- Oven steps read "200°C (180°C fan, gas 6)" on the recipe page and in cook
  mode; text that already mentions fan or gas is left alone.

### Batch 5 — fibre counted, plainer words
- Today and the plan counted fibre as "not recorded yet" for every meal,
  though the recipe page showed it. Fibre now comes from the food reference
  (exact name or alias) until foods.fibre_g arrives with migration 026.
- The plan's view switch says Grid and Day by day.

### Batch 6 — Try it on this phone
The sign-in screen now opens with "New here? Try it on this phone". The
whole kitchen works with no account: everything is kept in the phone's
storage by a stand-in for the database (js/lib/localClient.js) that answers
the same calls, so no screen changed. Tapping it goes straight into the
guided first run. Settings explains the trial and offers Make an account;
it says plainly that a new account starts empty for now (moving a trial's
meals into an account is still to build). Invites and sign-in links say
they need an account. On a trial phone migration 026's features (leftovers,
courses, Eaten) work, because the local store takes any column.

## Re-scored after batches 1–6 (same ten people, same honesty)

| Person | Before | Now | What moved them | What still holds them back |
|---|---|---|---|---|
| Graeme | 8 | 9 | a list he can shop from, fibre counted, Plan on Sunday | photos; names on the grid |
| Becky, new cook | 6 | 8 | a week planned for her, gas and fan ovens, a shop she can read | photos |
| Sam, one on a budget | 6 | 7 | whole items, staples as a check | no idea what a week costs |
| Priya and Jo, vegetarian | 7 | 9 | asked once, every idea vegetarian | photos |
| Ade, keen cook | 4 | 4 | nothing yet | import from a web page |
| Margaret, low vision | 8 | 9 | Today is two controls, not forty | — |
| Dev, ADHD | 7 | 8 | "Fill the week for me" decides; one exit | photos |
| Eileen, older | 6 | 7 | gas marks, plainer words, a first run that works | still a lot of app |
| Lou, batch cook | 7 | 7 | — | freezer portions offered back (after 026) |
| Tom, trial | 3 | 7 | can get in; a week planned in two taps | his trial does not move into an account |
| **Mean** | **6.2** | **7.5** | | |

Four people are at 9 (four and a half stars). The next fixes, in order:
**photos** (waiting on Graeme's images; every rating above moves with them),
**moving a trial into a new account**, **freezer portions in the picker**
(possible now on trial phones, and for everyone once 026 is in), then
**week cost** and **import**, which need prices and a server.

### Fix — Today's nutrition, second report (Graeme, 4 Oct, 14:00)
449 kcal for overnight oats and a falafel bowl, and ticking the lentil ragu
changed nothing. Worked out from the screenshot: 449 = oats (411) + two
coffees (38). The falafel bowl and the ragu were read as having no
ingredients, and the typed-in "IPA" counted as nothing.

The earlier fix (read every page past 1,000 rows) stopped at the first short
page, so it could still cut off; and a library recipe whose add failed part-
way stayed empty forever, because every later add reused the empty meal.

- Screens and the list now read only the planned meals' ingredients
  (data/plannedIngredients.js), a few dozen rows, so no row limit applies.
- A library meal with no ingredients is counted from its library recipe
  at once and its ingredients written back; the shopping list waits for that.
- Adding a library recipe is all or nothing; duplicates no longer block it.
- readAll keeps reading after a short page until an empty one.
- Typed drinks count as the nearest kind: an IPA as a pint at about 5.5%
  (245 kcal), a latte as a coffee; the toast says what it was counted as.

Reproduced in the browser with both faults and a 20-row server cap: Today
went from "no ingredients" to 1,482 kcal planned, ticking the ragu added
572, and an IPA added 245.

### Fix — recipes would not add; fish and chips at 18 kcal (4 Oct, 18:00)
- **display_text.** The household-library migration of 13 Sep made
  meal_ingredients.display_text NOT NULL outside the repo. No app code sent
  it, so every ingredient insert failed and library adds left empty meals
  (the real cause of the morning's missing nutrition). Every insert now
  sends display_text and sort_order; a behaviour check guards it; schema.md
  revision 26 records the columns.
- **The UK food tables.** data/cofid.json is CoFID 2019 (McCance and
  Widdowson, Public Health England, Open Government Licence): 2,877 foods
  with energy, protein, fat, carbohydrate, fibre and sugars per 100 g,
  shipped with the app and searchable offline (data/cofid.js). A recipe page
  with anything uncounted shows **Make these count**, one Find nutrition
  button per food; the recipe editor does the same under its live preview.
  A match is only ever saved by a tap (source 'reference'), asks how much
  one weighs when the recipe counts in items, and applies everywhere the
  food is used. Fibre picked this way is kept on the phone until
  foods.fibre_g exists (026).

### Nutrition done for you (4 Oct, 20:00)
"Can't you look at this and do it yourself?"
- **Everyday foods in the reference** (scripts/everyday_foods.py, 131
  generic entries, no brands): pizza, kebabs, burgers, bacon, ready-meal
  lasagne, crumpets, crisps, chocolate and cereal bars, peanut butter,
  shop sandwiches, breaded and battered fish, oven and chip-shop chips,
  takeaway curries and Chinese, pies, pasties, cakes, biscuits, cereals,
  sauces. Figures from CoFID 2019 wherever it has the food; eleven typical
  label averages where it does not, labelled as such. Each carries an item
  weight where it is bought by the item and a typical adult portion.
- **The automatic pass** (data/nutritionRepair.js) runs once a day from
  Today: every food with no calories is matched with brands and pack sizes
  taken off ("Tesco Capers (190g)" is capers), first to the reference
  (whole name, then the food word at the end: "cheese and onion crisps"
  are crisps), then to the UK tables only where every word matches.
  Unclear names wait. Today says how many were filled in; **Nutrition
  filled in** (also in Settings) lists each with Change, and what is left
  with Find nutrition.
- **Check the amounts** on own recipes: a main ingredient under half a
  usual portion for the people it serves is flagged with "Use about 125 g
  a serving", one tap. Fish and chips went from 18 kcal to 593 kcal.

### Your food week (4 Oct, 20:15)
"When does the week start? I shop Thursday night for click and collect
Friday afternoon. Others will have their start of the week differently."
Settings has **Your food week starts on** (Monday unless changed; kept on
the phone until user_settings has a column for it). Plan shows seven days
from that day ("Friday 2 October to Thursday 8 October"), says which day it
starts with a link to change it, and on the last day of the week (Thursday,
the night you shop) opens on the next one. The shopping list is for the
meals still to come in your week, plus all of the next one on that last
day. Nothing in the database changed: a food week is a view over the
existing Monday weeks, so each meal keeps its real date (lib/foodWeek.js).

### Ten thousand foods, and shop products (4 Oct, 20:30)
Find nutrition now searches one ranked list of 10,500 foods on the phone,
offline: the app's everyday foods (now 149, adding plant-based chicken,
mince, burgers, sausages, nuggets, breaded fillets and bacon, vegan
cheese, protein bagels and yoghurt, halloumi fries, peri-peri and garlic
mayonnaise), CoFID 2019 (2,877) and USDA SR Legacy (7,283, public domain,
American names reached through British words). An alias is scored as its
own phrase, so "fake chicken" finds plant-based chicken pieces.
**Search shop products** asks Open Food Facts (Open Database Licence) for
UK products by name, brands included, with label nutrition. It runs on a
button, not as you type, at most every 6.5 seconds, because its search is
limited to ten a minute. **Not yet tried against the live service from
here** (the build environment cannot reach it); the barcode lookup already
uses the same service and data shape.
