# Home PWA: Vision
01 Jul 2026 v1

## Why this exists

You are managing rehab from a right-side muscle injury (hamstring, glute,
sciatic involvement, with knock-on effects at the wrist, shoulder, neck, and
collarbone), a weight-loss goal, a household of recurring chores, a variable
household size for meals, a pantry that needs tracking so nothing's wasted
or forgotten, and a work schedule you can't see from home. Right now this
lives across notebooks, memory, and habit. None of it talks to each other.

This app exists to hold all of it in one place, reliably, without becoming
another thing you have to fight to use. If it's harder to open the app than
to not bother, it has failed — regardless of how complete the feature list
is.

## What "good" looks like

- You open the app and the thing you need to log or check is one or two
  taps away, not buried in a menu.
- Water logging in particular has to be closer to "tap a glass icon" than
  "open a form" — friction here directly predicts whether you do it at all.
- The dashboard tells you what's true *today* — what's due, what's low,
  what's next — without you having to go and look for it across five
  sections.
- Nothing nags. A missed water log or an incomplete chore is a fact, not a
  failure. There's no streak to break, no red banner shaming you back in.
- The app adapts to you (household size, screen brightness, colour scheme)
  rather than you adapting to it.

## Who this is for

You, specifically. Not a multi-user product, not something designed to be
handed to someone else later. Design decisions can be as personal and
specific as needed — this is not a product that has to generalise.

## What this is not

- Not a fitness app in the mainstream sense — no leaderboards, no calorie
  shame, no "you missed a day" messaging.
- Not a diagnostic tool. It stores what a physio or GP has told you and
  tracks how you're doing against it. It does not decide what's safe for
  you to do.
- Not built to impress anyone else — no onboarding funnel, no marketing
  polish. Function and reliability over presentation, though accessibility
  (WCAG 2.1/2.2 AA) is non-negotiable throughout.
- Not a second Alongside product. It borrows Alongside's *build discipline*
  (schema-first, session rituals, version headers) because that discipline
  works — but the tone, the data model, and the audience are entirely
  separate. Nothing from Alongside's coaching voice or business logic
  belongs here.

## Core commitments

- **Reliability over features.** A chore that's marked repeatable must show
  up on the calendar every time, with no exceptions, for months ahead. A
  broken recurrence engine is worse than no recurrence engine.
- **Low friction over completeness.** Better to log water in one tap than
  to have a beautifully detailed hydration screen nobody opens.
- **Privacy by default.** This is personal health, financial (shopping),
  and schedule data. Supabase RLS is scoped to your account specifically —
  not open anon access. See the blueprint's security section.
- **Personalisation as infrastructure, not polish.** Theme, contrast, and
  brightness preferences are wired in from Phase 2, not bolted on at the
  end — because if it's not there early, it never quite gets prioritised
  later.
