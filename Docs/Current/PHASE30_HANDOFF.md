# Home-OS: Phase 30 Handoff — Household Invites
01 Sep 2026 v1

**Schema revision 19.** Run `019_household_invites.sql` before pulling.
**22 tables, 22 policies.**

## What shipped

| Path | Version | What |
|---|---|---|
| `js/data/household.js` | v2 | Codes, redemption, leaving |
| `js/views/settings.js` | v11 | Invite and join |
| `css/components.css` | v43 | Code display |
| `service-worker.js` | v68 | Bumped, no new paths |

Plus `pantry_stock.level_set_at`, riding along — see below.

## The gap this closes

The largest between what the app claimed and what it did. From the persona
trace, Priya:

> *"It looks good. I couldn't get in. So it's Dev's app, and that means the
> shopping is still Dev's job, which was rather the problem."*

It also un-bottlenecks Dev, who was the only person who could use it — the
exact position he downloaded it to get out of.

## The RLS problem, and its answer

To redeem a code you must read a row belonging to a household you are **not
yet a member of**. No household-scoped policy allows that, and one loose
enough to allow it would let anyone enumerate invites.

So the table is household-scoped for **management** — an owner sees and
cancels their own codes — and redemption goes through
`redeem_household_invite(text)`: **SECURITY DEFINER**, pinned
`search_path`, takes a code and returns a **reason string, never the row**.
A wrong guess reveals nothing.

The code is marked used **after** the membership lands, so a failed insert
does not burn it.

## Decisions worth knowing

**The alphabet excludes 0, O, 1, I and L.** This code gets read aloud down a
phone, written on paper and typed in a hurry. A character that looks like
another character is a support ticket. Tested against 200 generated codes.

**`crypto.getRandomValues`, not `Math.random`.** A guessable invite is a
stranger in your shopping list.

**Inviting is separate from adding a member.** They are different acts:
adding records a person who eats here; inviting gives another phone access
to the same cupboard, list and plan. Conflating them would hide that
difference at exactly the moment it matters.

**The invite panel says what will be shared** — and what will not. Weight,
water and exercises stay private, and that is stated before the button, not
after.

**Codes are announced character by character.** "8CKM" read aloud as a word
is a code typed wrong.

**Expired and used are different messages.** Someone typing a code needs to
know which, and neither leaks anything — they already had the code. Tested,
along with no message blaming the person holding it.

**Leaving deletes nothing shared.** The cupboard, list and plan belong to
the household. The last owner cannot leave.

## `pantry_stock.level_set_at` rides along

Revision 18 gave the pantry rough levels and nothing recorded **when** one
was set, so a level could never go stale — drift wearing a different hat.

`updated_at` cannot answer it: schema.md §1 warns it moves on every change,
so editing an item's location would report its level as fresh.

**The column is added; nothing writes or reads it yet.** Adding it here
avoids a second migration over the same table, but staleness is still
unbuilt and is the remaining half of Phase 31.

## Tests

All eight gates. Behaviour 420 → **432**. New: 200 generated codes checked
for length, forbidden characters, case, uniqueness and alphabet spread;
every redemption reason producing a distinct, non-blaming sentence.

## Not yet done

- **Nothing writes `level_set_at`.** The column exists; decay does not.
- **No email delivery.** A code is shown on screen to be shared however you
  like. Email would need a sender and a cost, and this works without one.
- **Codes cannot be regenerated in place.** Cancel and make another.
- **An invited adult always joins as `adult`**, never `owner`. Promotion is
  through the member editor.

## Next

Round 1 of the remediation schedule is now complete — Phases 30, 31 and 32.
**The trace should be re-run before Round 2 starts.**
