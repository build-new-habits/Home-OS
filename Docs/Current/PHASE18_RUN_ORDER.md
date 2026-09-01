# Phase 18 — Run Order
01 Sep 2026 v1

**Stop here and run the migration before I write any app code.**

The app currently reads no household table, so it keeps working exactly as
it does now while the database changes underneath it. That is deliberate:
the migration is reversible-ish on its own, but a half-migrated database
plus code that expects `household_members` to exist is a broken app on your
phone with no obvious way back.

## Order

**1. Confirm the project is "Home OS".** Not Alongside-Learn. This has gone
wrong before, and this migration touches every table.

**2. Take a backup.** Supabase dashboard → Database → Backups. This is the
one migration where that sentence is not boilerplate.

**3. Run** `migrations/008_household_foundation.sql` as **one execution**.
No outer BEGIN/COMMIT — the editor supplies its own transaction, and an
explicit COMMIT silently rolls everything back on disconnect while
reporting success.

**4. Run** `migrations/008_household_foundation_VERIFY.sql` **separately**.
One row, one column, one verdict. Send me the verdict.

Expected: `PASS — 20 tables, 20 policies, 13 shared, 5 personal, no orphans`

**5. Open the app and use it normally.** Add a food, tick a chore, log a
weight. Nothing should look different. If something 404s or comes back
empty, the policies are wrong and I need to know before writing code on top
of them.

**6. Tell me, and I write the app code**: `js/data/household.js`, the
household section in Settings, and the member editor.

## If the verdict is FAIL

It names the tables. Send it verbatim. The migration is idempotent — every
statement is `if not exists` or `drop ... if exists` first — so re-running
after a fix is safe.

## What the verify query cannot tell you

`auth.uid()` is **null** in the Supabase SQL editor and RLS is bypassed
there. The query proves structure: columns, policies, indexes, no orphans.
It cannot prove isolation.

That needs two real signed-in accounts, and it is the test that actually
matters:

1. Account A creates a food. Account B, in a different household, cannot
   see it.
2. B joins A's household (one `household_members` row by hand for now).
   B now sees the food.
3. B logs a weight. **A cannot see it.**
4. B leaves. B loses the food, A keeps it, B's weight log survives.

Worth doing before Phase 12 builds anything on top.

## The one-way door

Step 3 rewrites 13 policies. Until it runs, the old `owner access only`
policies are what stand between your data and anyone else. Do not run this
against a database you have not backed up, and do not leave it half-run
overnight.
