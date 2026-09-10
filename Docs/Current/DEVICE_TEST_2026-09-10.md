# Device test — 10 September 2026

Six screenshots from an Android pass, plus one sentence that mattered more
than all of them:

> "I selected overnight oats for breakfast and it kicked me back to [the
> plan hub] and hadn't saved my meal choices."

Cache `v123` → `v126`. No migrations. Three commits.

---

## 1. The round trip lost the meal — FIXED (`34f1013`)

**What happened.** `plan-choose` called `navigate('meal-plan')` when you
picked something. That was correct until 7 Sep, when the plan became a hub
and the add form moved onto `plan-today` / `plan-this-week` /
`plan-next-week`. From then on every choice was delivered to a page with no
form. `mealPlan.js` read the draft anyway, found a meal in it, had nowhere
to put it, and called `clearDraft()`. Made, carried, thrown away, silently.

**The fix.**

* The draft carries an `origin`, resolved through `PLAN_RETURN_PAGES` — a
  whitelist. A stored string used directly as a navigation target is how a
  data field becomes an open redirect.
* `section === 'hub'` no longer touches the draft at all. A page with
  nowhere to put a choice leaves it for the page that has.
* "Back to the plan" on the chooser returns you where you came from, and
  the chooser says "For Thursday breakfast **next week**" when that is
  where you started.

**Why no gate caught it.** The trace re-rendered `section: 'week'` by hand
and then asserted the choice was there. It tested the page the *test*
believed you land on. It now reads the destination off the hash the app
sets, and asserts specifically that the hub is never the destination. Both
new checks were proved to bite by breaking the fix.

*Rule, filed:* **a navigation gate must follow the app, not restate the
route the test assumed.**

---

## 2. Favourites had nowhere to show up — FIXED (`027af4b`, `3b33743`)

Revision 25 shipped a heart and a note box, and no filter and no marker. A
favourite you cannot filter by is a tap that goes nowhere.

**Recipe library** — favourites chip with a live count, disabled at zero;
favourites sort to the top; the row carries the word as well as the heart;
your own note is printed on the row rather than one tap away.

**Choosing a meal** — the same chip in the picker. The hard part: a
favourite lives in one of two tables depending on whether the recipe has
been imported yet (`meals.is_favourite` vs a `recipe_library_notes` row).
Reading only one looks like it works and hides half the answer, so the
picker reads both and treats them as one thing. The chip is never disabled
while it is switched on — pressing it once and finding the way out greyed
out is a trap.

**`detailSheet` gained `onClose`.** `libraryDetail` now reports a change
once, after the sheet has gone. Rebuilding the list while the sheet was
open destroyed the row focus was due to return to, which drops the person
at the top of the page (3.2.1). The caller rebuilds on close and puts focus
back on the row it replaced.

**Trace gate change.** It used to throw for every URL, so the library panel
and the picker both rendered "could not be loaded" and every assertion
about them was really an assertion about an error message. It now serves
`data/recipe_library/` off disk and leaves https throwing.

---

## 3. "Breakfast · Breakfast · serves 2" — FIXED

Not a rendering fault. `data/recipe_library/breakfast.json` records its
cuisine as `"Breakfast"`, and `lunch.json` as `"Lunch"`. The picker now
drops the cuisine when it only repeats the meal time. True twice over is
useless the second time.

The library panel and the recipe sheet still print both. Left alone: on
those screens the cuisine sits among other facts rather than immediately
beside the slot, and the honest fix is in the data files.

---

## Still open

1. **Future Plans pages** using `planning_notes` — table exists, unused.
2. **Pantry "What's inside" by location tiles** — fridge, freezer, veg, tins.
3. **Notifications deliver nothing on Android.** Needs a laptop and remote
   debugging. Blocked, not forgotten.
4. **Chores tab shows projects but no tasks**, with a count disagreement
   against Due Now. Carried from an earlier pass, unverified since.

## To check on the device next

* Pick a meal for Thursday breakfast from **This week** and again from
  **Next week**. Both should land back on the week you started from, with
  the meal filled in, and "Add to plan" should save it.
* Heart a recipe in the library, close the sheet: the chip count should go
  up, the row should say ♥ Favourite, and focus should still be on that
  recipe's name rather than at the top of the page.
* With favourites switched on and nothing matching, the chip must still be
  pressable to get back out.
