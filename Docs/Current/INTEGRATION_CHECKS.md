# Home PWA: Integration Checks
27 Aug 2026 v3

Run the relevant block at the **end of each phase**, before marking it
complete in `master_schedule.md`. The point is to catch broken *connections*
between phases early, when they're cheap to fix — not at Phase 9 when
everything depends on everything.

A phase is only "done" when its own instruction-file done-criteria **and**
the checks below pass. If a check is red, fix it before starting the next
phase.

---

## How to run these (tools, once)

You don't need anything installed. In the browser (Chrome or Edge preferred
for devtools depth):

- **Keyboard-only pass:** put the mouse away. Tab / Shift+Tab / Enter /
  Space / arrow keys only. If you can't reach or operate something, it fails.
- **Contrast:** DevTools → Elements → pick a text node → the colour swatch in
  Styles shows the contrast ratio and a pass/fail tick. Or use any online
  WCAG contrast checker with the two hex values.
- **Offline:** DevTools → Network tab → set throttling to **Offline**. Reload
  and use the app. Set back to **No throttling** to test sync.
- **Service worker / cache:** DevTools → Application → Service Workers and
  Cache Storage.
- **Data truth:** the Supabase table editor — check a row actually landed,
  with the right `user_id`, and that `updated_at` moved on edits.
- **Reduced motion:** DevTools → Rendering → "Emulate prefers-reduced-motion".
- **Screen-reader spot check (optional but ideal):** VoiceOver (Mac: Cmd+F5)
  or NVDA (Windows, free). You're listening for: does each control announce a
  name and state?

Keep a scratch note per phase: check → pass/fail → what you did.

---

## Always-on accessibility gate (every phase, WCAG 2.2 / 2.1 AA)

Run this on every screen the phase added or changed:

- [ ] **Keyboard:** every action reachable and operable by keyboard; focus is
      always visible; tab order is logical.
- [ ] **Focus not obscured (2.2 · 2.4.11):** open toasts/dialogs/sticky bars —
      they never cover the element you're focused on.
- [ ] **Target size (2.2 · 2.5.8):** interactive targets ≥ 24×24 px; daily
      one-tap actions (water, exercise tick, chore tick) ≥ 44×44 px.
- [ ] **Contrast (1.4.3 / 1.4.11):** text ≥ 4.5:1 (large ≥ 3:1); UI
      components/states ≥ 3:1 — and re-check with the high-contrast setting on.
- [ ] **Not colour alone (1.4.1):** every status/state also carried by text or
      icon (this is also the no-shame rule — a missed log reads as neutral
      text, never a red-only cue).
- [ ] **Names & labels (1.3.1 / 4.1.2):** every input has a real label; every
      icon-only button has an accessible name.
- [ ] **Announcements (4.1.3):** async results (saved / synced / offline /
      error) announce via the live region.
- [ ] **Reduced motion:** with it emulated, animations degrade to instant
      state changes (the completion stamp still shows, just without motion).

If any box is unchecked, the phase is not done.

---

## Phase 1 — Supabase
**Note:** the SQL editor runs as an admin role — `auth.uid()` is null there
and RLS is bypassed. The editor confirms *structure and mechanics* only;
the `auth.uid()` default and RLS are confirmed from the app in Phase 2.
- [ ] Structural counts return **17 / 17 / 17** (tables / policies / triggers)
      and the `set_updated_at` function exists.
- [ ] With an **explicit** `user_id` (from `auth.users`), insert into
      `user_settings` → row appears; `created_at` = `updated_at`.
- [ ] Update that row → `updated_at` becomes newer than `created_at` (trigger).
- [ ] Delete the test row to clean up.
- *Ignore:* table order in the editor; auto-added Supabase internal schemas;
  the fact that a `default values` insert fails in the editor (that's the
  null `auth.uid()`, not a schema fault — it works from the app).
- *Deferred to Phase 2 (by design):* the `auth.uid()` default populating
  `user_id` on its own, and RLS scoping — neither can be tested from the
  editor because both need a logged-in session.

## Phase 2 — Shell (the foundation smoke test — do this thoroughly)
This is the one that everything inherits from. Five minutes here saves days.
- [ ] Log in → shell loads; log out → gated again; session survives reload.
- [ ] Change theme / contrast / brightness → **whole app** restyles instantly,
      persists across reload (proves the token contract, not per-view hacks).
- [ ] Bottom nav switches views; current item marked; **focus moves to the new
      view's `<h1>`** on route change.
- [ ] Export JSON → file downloads and contains rows from **all 17 tables**.
- [ ] **Auth + RLS (deferred from Phase 1):** after the app writes your
      settings row on login, check it in the Supabase table editor — the
      `user_id` is populated on its own (proves the `auth.uid()` default
      works via the client) and matches your auth user id. This is the
      real end-to-end proof the editor couldn't give in Phase 1.
- [ ] Network **Offline** → app shell still opens and navigates.
- *Ignore:* empty feature views (they're stubs until later phases); a plain
  export file (readable JSON is the goal, not styling).

## Phase 3 — Exercises (first feature writing through the queue)
- [ ] Mark an exercise Done → `exercise_logs` row appears in Supabase.
- [ ] Completed card shows the stamp **and stays visible** (principle 3).
- [ ] Offline: mark Done offline → back online → row syncs (this proves the
      Phase 2 queue actually works under a real feature).
- [ ] A suggested (non-physio) exercise stays `pending_confirmation` and is
      **excluded** from today's cleared list until cleared.
- *Ignore:* YouTube result quality (you're checking the link is built from the
  query, not that the video is perfect).

## Phase 4 — Chores + recurrence (the trust-critical seam)
- [ ] Create a repeatable task → the preview shows correct dates across a
      **3-month** window (test a daily, a weekly, and a monthly rule).
- [ ] Those occurrences appear on the calendar (`calendar_events` written with
      `source_id` = task id).
- [ ] Complete a task → `status=complete`, `completed_at` set, stamp shows.
- [ ] Delete a project **that has tasks** → confirm dialog reports the task
      count and blocks silent deletion (restrict rule).
- *Ignore:* calendar visual polish; timezone-of-day nuances unless a date is
  actually landing on the wrong **day**.

## Phase 5 — Weight + water
- [ ] One-tap water logs instantly; today's total reads "X of Y" and is
      accurate; works offline.
- [ ] Weight stored as **kg** in Supabase regardless of stone/lb display; unit
      toggle changes display only, never the stored number.
- [ ] Trend graph has a readable text summary alongside it (not SVG-only).
- *Ignore:* graph aesthetics; sub-gram rounding.

## Phase 6 — Meals + barcode

Supersedes the two earlier Phase 6 blocks (the brief's list and the original
notes), which are merged here. Priority checks are **#3 and #6** — the
duplicate path and the restrict delete are the two places this phase can
quietly corrupt data rather than merely misbehave.

**Before testing:** hard-refresh and confirm Cache Storage shows
`home-os-shell-v15` with **49 entries**, and that `v14` is gone. Six paths are
new, and precache is all-or-nothing — if the count is wrong, nothing else
below is meaningful.

### Scanning
- [ ] Scan a real product barcode → a food is created with
      `source: 'openfoodfacts'` and macros populated where the product has
      them. **Check the row in Supabase, not just the screen.**
- [ ] Unknown barcode → the manual form opens **pre-filled with the barcode**
      and says so. No dead end.
- [ ] Camera permission denied → manual entry still fully usable, the button
      relabels, and nothing prompts again on its own. No scolding.
- [ ] Scan a **UPC-A** product (a 12-digit barcode, common on US goods) →
      the stored barcode is the 13-digit form with a leading zero. This is
      the case that produces duplicates if normalisation is wrong.
- [ ] Cancel mid-scan, and separately navigate away mid-scan → the camera
      light goes **off** both times.

### Duplicates (priority)
- [ ] Scan the same product twice → the second scan offers the food you
      already have rather than silently creating a second row. Choosing
      "Add a separate entry" is still possible and still works.
- [ ] Go offline, scan and save a food, then scan the same barcode again
      **while still offline** → it recognises the one waiting to upload.

### Macros
- [ ] Meal macros match a hand calculation. Take a meal with two known
      ingredients and check it on paper: `sum(quantity_g / 100 × per_100g)`.
- [ ] A meal containing a food with null macros reports **"N of M
      ingredients have no nutrition data"** and names them — not a wrong
      total, and not zero.
- [ ] A food with a genuine **zero** (water, protein 0) is treated as known,
      not as missing.
- [ ] `serves_override` changes the per-serving figures for that planned
      instance only, **without** altering `meals.default_serves` — confirm
      the meal row in Supabase is untouched (principle 5).

### Deletes (priority)
- [ ] Deleting a food used in a meal reports the dependent count and is
      refused cleanly — **no raw foreign-key error**.
- [ ] Deleting a meal that is in the weekly plan reports how many times it
      is planned and refuses.
- [ ] Deleting a meal that is **not** planned names its ingredients as
      cascading, and the foods themselves survive.

### The weekly plan
- [ ] Navigable by keyboard end to end; each cell button announces **day and
      meal time**, not just "Add".
- [ ] The plan table is reachable and scrollable by keyboard when it
      overflows a narrow screen.
- [ ] Empty cells read "Nothing planned" as text — neutral, not a warning.

### Offline
- [ ] Offline: adding a **food** works and appears under "waiting to
      upload"; it is **not** offered in ingredient pickers until it syncs.
- [ ] Offline: adding a meal or a plan entry says plainly that it needs a
      connection. It must not fail silently.
- [ ] Reconnect → the queued food uploads, moves out of "waiting to upload",
      and becomes available as an ingredient. IndexedDB is empty afterwards.

- *Ignore:* Open Food Facts data quality and gaps for obscure products
  (their data, not our bug) as long as the manual path catches it; scanner
  framing aesthetics; the fallback engine not reading QR or Code 128 — it is
  deliberately UPC/EAN only.

## Phase 7 — Pantry + shopping
Pantry built 21 Aug, reworked 26 Aug. Shortfall, list and bridge built
27 Aug. None of the 26–27 Aug work has been run on a device.

### Pantry
- [ ] Cache Storage shows the expected `home-os-shell-vNN`.
- [ ] **"Needs an amount"** lists every row saved with a blank or zero
      amount, and setting one removes it from that list. A missing amount
      reads as "you have none" to the shortfall, so this is not cosmetic.
- [ ] Scanning a packaged good prefills the **pack size** (`330 g`), not
      `1 item`. An unparseable size (`4 x 125g`) falls back to `1 item`
      rather than guessing.
- [ ] The **use-by** control opens the native calendar. Leaving it blank
      falls back to the shelf-life estimate, and the two read differently:
      "Use by 3 September 2026 — 7 days left" versus "about 365 days left".
- [ ] Browse groups by **location** first, category second, one open at a
      time. Sixty rows must never render at once.
- [ ] Opening a row shows its **macros** — the reason the sheet exists.

### Shopping list
- [ ] Generate → **only the shortfall**. Verify ONE line by hand against the
      plan and the pantry.
- [ ] A food with enough stock does **not** appear at all.
- [ ] A food with no pantry row appears at its full required amount.
- [ ] A food whose amount was never recorded appears **and says so**.
- [ ] A food **past its use-by** is listed, and the line says it is out of
      date rather than pretending the cupboard is empty.
- [ ] Change a `serves_override`, regenerate → the quantity moves the right
      way.
- [ ] Regenerate **twice** → no duplicates.
- [ ] Mark an item bought, regenerate → **still bought**, not resurrected.
- [ ] A `usual` staple survives regeneration untouched.
- [ ] A food that is both planned and a staple shows **one name, two
      labelled lines**, and reads as intentional rather than as a bug.
- [ ] Grouped by category in **aisle order**, not alphabetically.
- [ ] A non-food item lists with the right category and reads "3 items",
      never "3 g".
- [ ] **In a shop, on real mobile data or offline:** tick three items. Each
      counts immediately, no button disables, all sync on reconnect.
- [ ] Deleting a food that is on the list names the shopping entry in the
      confirm and is refused cleanly.

### The holiday bridge
- [ ] A holiday purchase item ticked for shopping reaches the list with
      `source = 'holiday'`.
- [ ] A **new** item asks for a category before creating the food, and does
      not default to cupboard food.
- [ ] Ticking, unticking and re-ticking produces **one** line, never three.
- [ ] Declining the category keeps the tick and says the list entry is
      deferred.

### Recipes
- [ ] A recipe row reads "N of M in the pantry".
- [ ] Opening it **names** what is short, and the count changes when the
      servings control changes.

## Phase 8 — Holidays + work location

**Before testing:** hard-refresh and confirm Cache Storage shows
`home-os-shell-v18` with **50 entries**. Precache is all-or-nothing.

The page is reached from the **Holidays** nav item. The nav label still says
"Holidays" while the page says "Holidays & work" — `routes.js` is write-once
and there is no work-location route. Not a bug.

### Priority — the shared calendar table
- [ ] **Open Chores. Work-location patterns and holidays do NOT appear in
      the chores calendar.** This is the first time anything but chores has
      written to `calendar_events`, and it is what the 21 Aug `listEvents()`
      fix was for.
- [ ] A holiday appears on the calendar at its **start date, once** — not
      repeating forever. Repeating past the end date would mean the
      `UNTIL`/`COUNT` trap has been walked into.

### Holidays
- [ ] Create a holiday spanning two weeks. It reads as a date range in
      **text** ("5 to 12 September 2026"), not as a coloured bar alone.
- [ ] Try to save one that ends before it starts → refused with a clear
      message. There is no CHECK constraint behind this, so it is refused in
      the app or not at all.
- [ ] Add packing and purchase items; tick them; they persist over a reload.
- [ ] Tick state reads as a **word** ("Packed"/"Bought"/"To do"), not
      colour alone.
- [ ] Delete the holiday. The confirm **names** how many checklist and
      purchase items go with it, and the calendar entry disappears too —
      `source_id` is a soft pointer, so nothing cascades it automatically.

### Work location
- [ ] A weekly pattern ("Office, Tuesdays and Thursdays") previews the next
      3 months before saving, and what saved matches the preview.
- [ ] The pattern is described **in words** on the card — no raw `FREQ=`
      string anywhere on screen.
- [ ] There is no end-date field. Patterns run until removed; the form says
      so. (An end date would be silently ignored by the engine.)

### Offline
- [ ] Aeroplane mode: tick three packing items. Each counts **immediately**,
      no button disables, all three sync on reconnect, IndexedDB empty after.
- [ ] Offline: adding a holiday says plainly it needs a connection rather
      than failing silently.

- *Ignore:* map or location styling — this is a label, not a mapping
  feature. Also ignore the nav/page title mismatch above.
- *Moved to Phase 7:* the `send_to_shopping` → `shopping_list_items` check.
  `shopping_list_items.food_id` is `NOT NULL references foods(id)` and a
  purchase item is a bare title, so the bridge cannot be built until the
  shopping list exists. The **flag itself** is stored and testable now:
  tick "Add to shopping list", reload, confirm it stuck.

## Phase 9 — Dashboard (the everything-connects moment)
Built 27 Aug 2026. Not yet run on a device.

- [ ] Each section reflects **today's real data** from its source phase
      (cross-check two or three against the underlying views).
- [ ] Water works **in one tap**, offline-capable. This is the condition on
      which Water was moved behind the Health hub — if it ever stops being
      one tap, that decision was wrong and should be revisited rather than
      defended.
- [ ] A chore due today can be ticked here, and reopening the dashboard
      shows it done **for that day only**. Check the following day: a
      repeating chore must come back.
- [ ] A section with nothing to say is **absent**, not showing "nothing to
      report". Six cards each announcing their own emptiness is worse than
      no cards.
- [ ] Framing is neutral throughout — counts, no streaks, no red-for-missed.
- [ ] Sticky bottom nav never obscures focused content.
- [ ] **Turn the connection off and reload.** Every section should either
      show cached data or stay quiet; none should blank the page.
- *If a section is wrong here, the bug is almost always in that section's own
  data module, not the dashboard* — check the source view first.

### The one known gap that shows up here
A repeatable chore created **offline** may not get its paired
`calendar_events` row, and "due today" reads through that join — so it will
not appear until it is re-saved online. Tracked debt, not a mystery.

## Phase 10 — Notifications
- [ ] All types **off by default**; toggling one persists in
      `notification_prefs` and requests OS permission only on first enable,
      with a text explanation.
- [ ] Denied permission is handled calmly; the toggle reflects reality.
- [ ] Copy is a reminder, never a nag ("Water check-in", not "You haven't…").
- *Ignore / expect:* background delivery is **limited by the browser/OS** —
  iOS Safari especially. If a scheduled notification doesn't fire in the
  background, that's a platform limit the spec already anticipates, not a
  build failure. Verify the toggle, permission, and copy logic; don't chase
  guaranteed background delivery the platform won't promise.

---

## What to ignore across the board (don't burn sprint time on these)
- Pixel-level visual polish — function and accessibility first (vision).
- Console warnings from the Supabase/3rd-party CDN libs themselves (only your
  own `console.error`s matter).
- Open Food Facts / external-data gaps, as long as the manual fallback works.
- Perfect background-notification delivery (platform-limited by design).
- Empty states in views whose feature phase hasn't run yet.

## What is never "ignore" (hard stops — fix before advancing)
- Any RLS gap, or a row written without the right `user_id`.
- A schema mismatch between live code and `schema.md`.
- A failed keyboard pass, a colour-only status, or a below-threshold contrast.
- A silent write failure (offline or online) — every failure must surface.
- A delete that skips the confirm step, or a restrict delete that orphans data.
- Recurrence producing wrong **dates** over the 3-month window.
