# Home-OS: Phase 27 Handoff — Onboarding and First Run
01 Sep 2026 v1

**Schema revision 16.** One nullable column. Run before pulling.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/views/firstRun.js` | v1 (new) | The guided first task |
| `js/routes.js` | v4 | `first-run` appended |
| `js/navConfig.js` | v7 | `FIRST_RUN_ACTION` |
| `js/views/dashboard.js` | v5 | Offers it until done |
| `js/views/settings.js` | v9 | Findable again, forever |
| `js/data/settings.js` | v7 | `onboarded_at` default |
| `service-worker.js` | v59 | One new path |

## A guided task, not a tour

Four steps, about a minute:

1. What this is, in one breath
2. **Pick something you fancy** — six library recipes, one tap adds it
3. **When would you like it?** — one tap puts it on a day
4. **That is how it works** — and the shopping list has already filled in

The point is that it **leaves something behind**. At the end you have a real
meal planned and a list you can shop from. A carousel of screenshots teaches
nothing; nobody reads them, and the one person who does cannot map "here is
the pantry" onto anything they wanted to do.

## Decisions worth knowing

**It never redirects.** Forcing someone into a wizard they did not ask for
is hostile. The dashboard *offers* it as the primary action until the
account has been through it, and an offer you can ignore is the same feature
without the hostility.

**Dismissible forever from the first step**, not buried at the end after
someone has already sat through it. "I will find my own way around" is a
button on every screen.

**Nothing implies you are behind.** There is a test asserting the rendered
text contains no "you should", "you need to", "don't forget", "incomplete"
or "finish setting up".

**Position, never a progress bar** — same rule as Phase 24, same test.

**Six recipes, not twenty.** Six is a choice; twenty is a decision.

**`onboarded_at` is on the account, not the device.** Reinstalling should
not put you through it again, and a second household member **should** get
their own first run rather than inheriting yours. Null means "not yet",
which is the honest reading for every existing row — a default would make
every account read as finished.

**Findable again from Settings**, with the hint *"Nothing is reset."*
People forget, and re-finding it should not require reinstalling.

## navConfig caught me again, in advance

Phase 24's lesson held: the route is declared as `FIRST_RUN_ACTION` in
`navConfig.js` rather than hardcoded, so the a11y reachability check sees
it. I wrote it that way from the start this time rather than being told by
the gate.

## Tests

All eight gates. A11y 200 → **207**, with seven checks on the new flow
including the two that matter: dismissible from step one, and no coercive
language anywhere in the rendered text.

Render gate now covers 17 route views.

## Not yet done

- **Empty states on other screens.** The brief scoped "every screen"; only
  the pantry got one (Phase 23). Meals, shopping, chores, calendar and
  holidays still show an empty list under a form. That is onboarding that
  keeps working after week one, and it belongs with Phase 28's screen pass.
- **Not resumable.** Cook Mode and Plan The Week both resume; this does not.
  It is four steps and about a minute, so the cost of starting again is
  small — but it is an inconsistency.
- **Step 2 offers the first six recipes in file order**, not the easiest or
  quickest. With ten recipes that is fine. With three hundred it will need
  a rule.

## Next

Phase 28 — the six neglected screens, and the empty states above.
