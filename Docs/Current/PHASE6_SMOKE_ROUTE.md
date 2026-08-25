# Phase 6 smoke test — the route

> **STILL CURRENT, with two changes.** Cache is now **v25** (52 entries),
> and steps 2 and 5 have been rebuilt since this was written: the scan now
> refuses to save until you choose a category, and the ingredient form has a
> "Measured in" unit chooser. Everything else stands.
>
> Much of this has now passed on a device. The parts **still unverified**
> are the scan category-confirm path and barcode duplicate detection —
> steps 2 and 5.

21 Aug 2026. Read this on the phone you are testing with.

`INTEGRATION_CHECKS.md` is the complete list. **This is the order to do it
in**, sequenced so that anything which would invalidate later steps fails
first. About 20 minutes if nothing is wrong.

You do not have to finish. Stopping after step 3 is still a useful result —
those are the two checks that matter most.

---

## 0. First five minutes — rule out the environment

Do not debug the app until these three are true. Every one of them presents
as a bug and is not one.

1. **Is Supabase awake?** The free tier pauses after about a week idle. Open
   the dashboard for project `vkjwwnjhizrlqcovpdco` and confirm it is
   running. A paused project shows up in the app as `Failed to fetch`, or as
   Supabase's own `error 111` page. **This has already cost one session's
   debugging time.**

2. **Is the new shell actually installed?** Hard-refresh, then
   DevTools → Application → Cache Storage. You want
   **`home-os-shell-v25`** and **49 entries**. If you see an older version,
   or a different count, the service worker has not updated and you are
   testing old code. Fix that before anything else.

   *(Cache Storage's size column shows gzipped transfer size. A 3–5×
   difference from the file size is normal, not a truncated file.)*

3. **Can you sign in?** If not, stop — nothing below works without auth, and
   the problem is almost certainly 1 or 2.

---

## 1. Does anything render at all — 2 min

Open **Meals**. You should get three sections: *This week*, *Meals*,
*Foods*.

If the screen is blank or half-drawn, stop and send me the console. That is
a class of bug the gates are supposed to catch and it would mean the gate
has a hole worth fixing before you spend more time.

---

## 2. PRIORITY — the duplicate path — 5 min

**This is one of the two places this phase can quietly corrupt data.**
Everything else is recoverable by editing a row.

1. Scan a real product barcode from something in the kitchen.
   → Expect: the form fills with a name and some macros, and says it came
   from Open Food Facts. Some products are missing macros — that is their
   data, not our bug, as long as it *says* which ones are missing.
2. Save it.
3. **Check the row in Supabase**, not just the screen. `source` should be
   `openfoodfacts`, `barcode` should be stored.
4. **Scan the same product again.**
   → Expect: *"You already have this one"*, offering the saved food.
   → **If it silently creates a second row, stop and tell me.** That is the
   failure this phase was built to prevent.
5. Choose *"Add a separate entry"* → it should let you, deliberately.

**Then the case I am least sure of:** find something with a **12-digit**
barcode (common on US goods; UK products are usually 13). Scan it and check
what got stored — it should be **13 digits with a leading zero**. Both
scanner engines return 12 for that format, and if the normalisation is
wrong, the same product scanned twice becomes two rows straight past step 4.
I verified this against synthetic barcodes in Node, never against a real
label.

---

## 3. PRIORITY — the restrict delete — 3 min

**The other place data can go wrong.**

1. Add the food you just created to a meal as an ingredient.
2. Try to delete that food.
   → Expect: *"X is still in use. It is used in 1 meal."* and a clean
   refusal.
   → **A raw database error here is a real failure.** So is *"used in 0
   meals"* followed by anything going wrong.
3. Put that meal in the weekly plan, then try to delete the meal.
   → Expect: it tells you how many times it is planned and refuses.
4. Take it off the plan, delete the meal.
   → Expect: it warns the ingredients go too, and the **foods survive**.

---

## 4. The maths — 3 min

1. Build a meal with two ingredients whose macros you know.
2. Check one figure on paper: `grams ÷ 100 × per-100g`, summed.
3. Add an ingredient with **no** nutrition data.
   → Expect: *"1 of 3 ingredients has no nutrition data (name)"* and the
   total **unchanged** — not dragged toward zero.
4. Change `serves` on the planned instance.
   → Expect: per-serving figures move; **the meal's own default does not**.
   Check the meal row in Supabase to be sure.

---

## 5. The camera, properly — 3 min

1. Cancel mid-scan → **camera light off**.
2. Start a scan, then navigate away mid-scan → **camera light off**.
   (Both paths release it separately. The second is the one I would expect
   to have got wrong.)
3. Deny camera permission → the form still works, the button relabels, and
   nothing nags you or re-prompts on its own.

---

## 6. Offline — 4 min

Aeroplane mode.

1. Add a food → saves, appears under *"waiting to upload"*.
2. Check an ingredient picker → **that food is not offered.** It has no real
   id yet, so using it would fail. If it *is* offered, that is a bug.
3. Try to add a meal → should say plainly it needs a connection. Silence is
   a failure.
4. Scan the same barcode again while still offline → should still recognise
   the one waiting to upload.
5. Reconnect → it uploads, leaves *"waiting to upload"*, and becomes
   available as an ingredient. IndexedDB empty afterwards.

---

## 7. Keyboard and screen reader — 3 min

The gates check structure. They cannot tell you whether it *reads* well.

1. Keyboard-only through the weekly plan. Every Add button should announce
   its day and meal time — *"Add a meal to Monday breakfast"*, not "Add".
2. Screen reader on the plan grid: does moving across a row tell you which
   day and which meal time you are in?
3. Start a scan with the screen reader on. The video is deliberately hidden
   from it; the status line should carry everything.

---

## What "cleared" means

Steps 0–3 clean is enough for me to start Phase 7 — those cover both
data-corruption paths. 4–7 can follow.

**Anything that fails: send me the step number and the console.** Do not
work around it. I would rather fix it than have you learn to avoid it.

---

## 8. Chores calendar — 1 min (new, added after the Phase 6 build)

A defect was found in cleared Phase 4 code while preparing Phase 8:
`listEvents()` returned **every** calendar event type, and the chores
calendar rendered all of them as chores. Latent — chores are currently the
only writer — but it would have started corrupting the calendar the moment
Phase 8 wrote its first work-location row.

- [ ] Open **Chores**. The 3-month calendar still shows your recurring
      chores, exactly as before. Nothing missing, nothing new.

That is the whole check. It is a "prove I did not break Phase 4" step, not a
new feature.

---

## Three fixes went in tonight, before you test

Found by re-reading the code, not by the gates:

- **A typed barcode that could not be used was silently dropped to null on
  save.** You would have typed one, hit save, and watched it vanish with no
  message. Now it tells you.
- **Editing a quantity or servings inline re-rendered the list and dropped
  focus to the page body.** Disorientating on a keyboard, worse with a
  screen reader. Focus is now restored to the field you were in.

- **The chores calendar would have shown holiday and work-location events
  as chores.** Found by reading Phase 4 code before building Phase 8, not by
  any gate — the filter was simply absent, and invisible while chores were
  the only writer.

`views/meals.js` v2, `data/calendar.js` v2, `views/chores.js` v3, cache
**v17**. Which is why step 0.2 says v17.
