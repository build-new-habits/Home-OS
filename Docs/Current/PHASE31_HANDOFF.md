# Home-OS: Phase 31 Handoff — A Pantry That Can Be Vague
01 Sep 2026 v1

**Schema revision 18.** Run `018_pantry_level.sql` before pulling.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/pantry.js` | v6 | `LEVELS`, validation |
| `js/data/pantryMatch.js` | v2 | Precedence rule |
| `js/lib/shortfall.js` | v4 | Levels read as verdicts |
| `js/views/pantry.js` | v13 | Three buttons per row |
| `css/components.css` | v41 | Level buttons |
| `service-worker.js` | v66 | Bumped, no new paths |

## The problem this is for

Jodie, from the persona trace, uninstalled on day 12:

> *"When it was right it was brilliant. But keeping the cupboard right is a
> job, and if I could reliably do that job I wouldn't have needed the app."*

Barcode scanning, the claim step, bought-to-pantry and
depletion-after-cooking all **reduced** the upkeep. None removed it, because
the model still asked for a **number**, and a number requires counting.

## The change

`plenty` / `low` / `none`. Three buttons on every stock row that has no
number. One tap.

**This is not a lesser mode for people who cannot manage the real one.** For
most cupboard items "have I got enough" is the only question anyone actually
asks, and a number is a more precise answer to a question nobody had.

## Decisions worth knowing

**Precedence, decided once.** A number wins when there is one. A level is
used when there is not. Both absent stays unknown, which never demotes a
recipe. Tested in both directions, including the case where the number is
the *worse* answer — precision still wins, because it is what somebody
actually recorded.

**NULL is "nothing said", not "none".** The single most dangerous confusion
available here: collapsing them would put the entire cupboard on the
shopping list at once. There is a test named for it.

**`plenty` reports as comparable-and-enough, not as a quantity.** It stops
the list asking for things you have, without inventing a number nobody gave.

**The buttons are on the row, not in a sheet.** A control behind a sheet
behind a row is three taps, and three taps is why the cupboard drifts. This
whole phase is worth nothing if it is not one tap.

**Tapping the current answer clears it.** The only way to undo a mis-tap
without a dialog.

**They only appear when there is no number.** Showing both would ask the
same question twice.

**`aria-pressed` carries the state**, not just the border colour — the
current answer must be readable without seeing it.

## Tests

All eight gates. Behaviour 408 → **420**. New: each level mapping to the
right state; **nothing-said staying unknown**; a number overriding a level
in both directions; rough answers marked as rough; a meal whose ingredients
are all "plenty" landing in Ready now; no label blaming anyone.

## Part two — the stock sweep (same day)

The first commit made a level **possible**. This makes it **happen**.

"Quick stock check" on the pantry screen opens one list: every item, three
buttons each. Walking a cupboard tapping down a single list is a different
task from opening sixty rows, and it is the one people will actually do.

**Decisions worth knowing:**

- **Unsaid items sort first.** They are what the screen exists for, and
  burying them under everything already answered defeats the point.
- **Counted items are left alone.** A number is a better answer, and
  offering to overwrite it with a guess would be a downgrade.
- **Rows update in place, no re-sort mid-sweep.** Re-sorting would move the
  row somebody was about to tap.
- **The count never chides.** "12 without an amount" is a count and an
  offer. "12 you have not checked" would be an accusation, and there is a
  test asserting the wording.
- **Nothing to submit.** Skipping is not an incomplete form; it is a choice,
  and the hint says so.

A11y gate 214 -> **219**, with checks that the sweep starts collapsed, each
row is a labelled group, every level button carries `aria-pressed`, and the
toggle never chides.

## Part three — levels go stale (after the Round 1 re-trace)

The re-trace found exactly what this handoff had feared. Jodie did not
uninstall this time — a real change from day 12 — but by week three:

> *"Everything I marked plenty in week one still says plenty. I've eaten
> most of it."*

The list started **under-buying**, which is worse than over-buying because
you find out at the hob.

**`level_set_at` is now written**, in the data module and nowhere else, so
it always matches the value it describes.

**Lifespan follows shelf life.** "Plenty" of tins is still roughly true in a
month; "plenty" of milk is not true on Friday. Shelf life when known, capped
at 28 days, 21 days when unknown.

### What stale degrades TO, which is the whole design

A stale level becomes **nothing-said**, never **none**.

If stale became "none", every forgotten item would land on the shopping list
at once, and the fix for under-buying would become a worse over-buying
problem. Unknown never demotes a recipe and never reaches the list — that
rule has held since Phase 14 and it holds here. **Not knowing is not
evidence of absence.**

There is a test named for it.

### The sweep offers them

"Quick stock check (12 worth a look)" now counts stale rows as well as
never-said ones, and they sort first. Each shows *"You said plenty a while
back. Still right?"* — a fact and a question, not a correction.

A stale level is not shown as the current answer, or tapping it again would
look like a no-op when it is the entire point.

**Rows stamped before this shipped get the benefit of the doubt** rather
than all expiring at once.

Behaviour 432 → **446**.

## Not yet done

- **~~Levels never decay.~~ Done above.** Something marked `plenty` in March still says
  plenty in June. A number at least has `last_restocked` beside it. This may
  turn out to be the flaw that keeps drift alive in a new form.
- **Cooking does not lower a level.** Depletion-after-cooking only touches
  numbers.

## The honest position

This is the phase most likely to be wrong. Nobody in this category has
solved pantry drift, and "let it be vague" is a bet rather than a known
answer. **It needs real use before Round 1's re-trace can be trusted on it**
— a passing gate says the logic is right, not that the idea is.

## Next

Phase 30 — household invites. Needs voice direction.

**Level decay** is now the one real gap left here, and it needs schema:
a `level_set_at` timestamp. `updated_at` cannot be used — schema.md warns
it moves on every change, so it would report a level as fresh because
somebody edited the location. It should ride along with Phase 30.
