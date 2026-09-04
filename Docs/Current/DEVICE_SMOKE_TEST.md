# Home-OS: Device Smoke Test
01 Sep 2026 v1

**Nine gates run in node and jsdom. Neither is a phone.**

Phase 32 shipped notifications that delivered nothing at all on Android and
every gate passed, before and after. Gate 9 now catches that specific class
by pattern — but a pattern is not a device.

This is the list of things **only you can check**, ordered by what has
actually broken before. It should take about six minutes.

---

## 1. Notifications ⚠️ HIGHEST PRIORITY

The one that shipped broken.

- [ ] Settings → Notifications → turn on **Food to use soon**
- [ ] The browser asks permission at that moment, not before
- [ ] Allow it
- [ ] Open the Pantry with something going off
- [ ] **A notification actually appears**
- [ ] Tap it — the app comes to the front, it does **not** open a second window
- [ ] Deny permission on a fresh profile: the switch stays **off** and explains why

## 2. The stale level loop

Phase 31's whole bet.

- [ ] Pantry → Quick stock check → tap a few levels
- [ ] The count in the button goes down
- [ ] Reopen — your answers are still there
- [ ] Tap the same button again — it clears

## 3. Household invite

- [ ] Settings → Household → Invite someone → Create a code
- [ ] The code is readable at arm's length and has no 0, O, 1, I or L
- [ ] On a second account: "I have a code" → paste → you are in
- [ ] Both phones show the same shopping list
- [ ] Second account's weight log is **not** visible to the first

## 4. Cook Mode

- [ ] Start a recipe, reach step 3
- [ ] Lock the phone, wait a minute, unlock
- [ ] **You are still on step 3**
- [ ] The screen did not dim while a step was open
- [ ] Buttons are reachable one-handed and not under the URL bar

## 5. Scanning

- [ ] Scan a barcode you already have — it finds it
- [ ] Scan something unknown that is on your shopping list — the claim step offers it
- [ ] Deny the camera once: it explains rather than hanging

## 6. Offline

- [ ] Aeroplane mode
- [ ] Log water, tick a shopping item
- [ ] The app says it saved locally
- [ ] Back online: it syncs

## 7. The settings that change how it looks

- [ ] Dark mode, high contrast, compact spacing
- [ ] **Compact did not shrink the text**
- [ ] At 200% system text size, nothing is cut off

---

## What to do with a failure

Tell me what you saw, not what you think caused it. Every device bug so far
has been in a place the gates could not reach, and the description of the
symptom has been more useful than the diagnosis.

**If it is a class of bug a gate could have caught, the fix includes adding
it to `Tests/platform.mjs`.** That file exists because of one Android
notification, and it should grow the same way.
