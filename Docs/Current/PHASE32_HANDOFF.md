# Home-OS: Phase 32 Handoff — Notifications That Arrive
01 Sep 2026 v1

**No schema change.** Round 1 of the remediation schedule.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/lib/notify.js` | v1 (new) | Permission, once-a-day guard, wording |
| `js/views/settings.js` | v10 | Real switches, permission explained |
| `js/views/pantry.js` | v12 | Use-soon fires |
| `js/data/listSync.js` | v3 | Shopping-ready fires |
| `service-worker.js` | v65 | One new path |

## The defect

Settings has had four notification switches since Phase 2 and **nothing was
behind any of them**. Tom found it in the persona trace and read it as
broken rather than unbuilt. He was right to.

## Decisions worth knowing

**Two switches, not four.** The switches for water check-in and exercise day
are **removed** until something sends them. A switch that does nothing is
the defect; the absence of a switch is not. Adding delivery for two and
leaving two dead would have fixed half a bug and kept the other half.

**Permission is asked when a switch goes ON**, never on load. A prompt
before any benefit has been shown is how an app gets blocked permanently on
the first visit.

**A refused permission does not save the preference.** The switch snaps back
off and says why. A switch that stays on while nothing arrives is exactly
the original defect wearing a different hat.

**Every permission state says what to do next.** "Blocked" alone leaves
someone stuck, because the setting is not in this app — so denied names the
browser settings, and unsupported reassures that everything else still
works.

**Once per day, per thing.** A use-by warning on every page load is not a
reminder, it is a pest. Held in localStorage with same-day keys pruned, so
the store cannot grow.

**It fires when the app is open.** This is a PWA with no server-side
scheduler. A reminder that arrives when you look is honest; a switch that
promises background delivery it cannot do is not.

**Nothing is re-engagement.** Every message is a fact that was going to be
true anyway. There are tests asserting no "miss you", "come back", "streak"
or "keep it up" — and that the use-soon message never moralises about waste.
Throwing food away is not a moral failure and the app has no view on it.

## A layering bug the gates caught

Importing `lib/store.js` into `data/listSync.js` broke the behaviour gate:
store attaches `window` listeners at module scope, and that gate runs in
plain node.

The fix is a lazy `await import()` inside the function, with a failure to
read preferences never failing the sync. The underlying rule is worth
keeping: **data modules must not import browser-scoped modules at the top
level.**

## Tests

All eight gates. Behaviour 392 → **408**. New: message wording for one, two
and many items; empty cases sending nothing; no moralising; no
re-engagement language in either message; every permission state explaining
its next step; feature detection not throwing without a window.

## Part two — it did not work on a phone (after the Round 1 re-trace)

**Phase 32 v1 delivered nothing at all on Android.**

`new Notification()` throws "Illegal constructor" on Chrome for Android;
every notification must go through
`ServiceWorkerRegistration.showNotification()`. The constructor call sat
inside a `try` that returned `'denied'`, so the switches looked fine, no
error surfaced, and nothing ever arrived.

**That is the exact defect Phase 32 existed to fix, reintroduced by the
delivery mechanism.** All eight gates passed both before and after, because
no gate runs on a real phone.

Fixed: service worker first, constructor only as a desktop fallback.
Callers now log a rejection rather than dropping it — a notification that
fails quietly is how v1 went unnoticed.

**A `notificationclick` handler** was added too. Without it, tapping a
notification on Android opens a *new* window on the start URL, so somebody
mid-recipe loses their place.

## Part two — and the honest limit

From the Round 1 re-trace, Tom:

> *"So it tells me things I'd have seen anyway. That's not a reminder,
> that's a label."*

He wanted a 5pm prompt. **A web app cannot schedule one without a push
server**, and a push server is a per-user running cost — the same argument
that parked Phase 17.

What was available was to stop letting people discover it. Settings now
says, above the switches: *"Reminders appear when you open the app, not at
a set time. Scheduling them for a particular hour needs a server, which this
app deliberately does not have."*

**An expectation that is set is not a disappointment. One that is discovered
is.** Tom's complaint does not go away — but it moves from "this is broken"
to "this does less than I hoped", which is the difference between a blocker
and a wish.

Behaviour 446 → **449**.

## Not yet done

- **No scheduled delivery**, and none is possible without a server. Reminders arrive when the app is open. Real
  background push needs a push service and a server, which is the same
  per-user cost argument that parked Phase 17.
- **Water and exercise reminders are gone, not built.** They return when
  something sends them.
- **No quiet hours.** Nothing fires at 3am today because nothing fires
  unless you open the app, but that stops being true the moment background
  push exists.

## Next

Phase 31 — the pantry stops needing discipline. Written and waiting on its
migration.
