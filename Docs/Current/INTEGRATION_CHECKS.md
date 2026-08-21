# Home PWA: Integration Checks
03 Jul 2026 v2

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
- [ ] Scan a real barcode → food created with `source: 'openfoodfacts'`,
      macros populated where the product has them.
- [ ] Unknown barcode → manual form opens pre-filled with the barcode.
- [ ] Camera permission denied → manual entry still fully usable, no repeat
      prompt, no scolding.
- [ ] Meal macros match a hand calculation; a meal containing a food with
      null macros reports **incomplete**, not a wrong total.
- [ ] `serves_override` changes per-serving figures without altering
      `meals.default_serves`.
- [ ] Deleting a food used in a meal reports the dependent count and is
      refused cleanly (no raw FK error).
- [ ] Weekly plan navigable by keyboard; announces day and slot.
- *Ignore:* Open Food Facts data quality; scanner framing aesthetics.

## Phase 6 — original notes
- [ ] Scan on a supported browser creates a food (`source=openfoodfacts`);
      manual fallback works when not found or camera denied.
- [ ] Meal macros compute from ingredients.
- [ ] `serves_override` scales quantities for that planned instance **without
      re-entering ingredients** (principle 5); base `default_serves` unchanged.
- [ ] Deleting a food used in a meal → confirm with meal count (restrict).
- *Ignore:* Open Food Facts data gaps for obscure products (that's their data,
  not your bug) — as long as the manual path catches it.

## Phase 7 — Pantry + shopping
- [ ] Generate the list → it lists **only the shortfall** (plan needs minus
      pantry stock), not everything.
- [ ] A near-expiry item flags in **both** the shopping list ("don't rebuy")
      and the meal planner ("use up") — one signal, two surfaces.
- [ ] Items move needed → have → bought and persist.
- *Ignore:* exact quantity rounding conventions as long as the shortfall
  direction is right.

## Phase 8 — Holidays + work location
- [ ] A purchase item with `send_to_shopping=true` creates a
      `shopping_list_items` row with `source=holiday`.
- [ ] Deleting a holiday cascades its own checklist/purchase items and the
      confirm **names** what else is removed.
- [ ] Recurring work-location events render across the 3-month window (reuses
      the Phase 4 recurrence engine — if Phase 4 passed, this should too).
- *Ignore:* map/location styling; this is a label, not a mapping feature.

## Phase 9 — Dashboard (the everything-connects moment)
- [ ] Each section reflects **today's real data** from its source phase
      (cross-check two or three against the underlying views).
- [ ] Water, exercise tick, and chore tick each work **in one tap from the
      dashboard**, offline-capable.
- [ ] Framing is neutral throughout — counts, no streaks, no red-for-missed.
- [ ] Sticky bottom nav never obscures focused content.
- *If a section is wrong here, the bug is almost always in that section's own
  data module, not the dashboard* — check the source view first.

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
