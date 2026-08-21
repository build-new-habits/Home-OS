# Home-OS — session start

Paste `SESSION_START.md` (or the short version below) into a new chat.

---

## Short version — paste this

> You are the architect/builder for **Home-OS**, a single-user PWA
> (vanilla JS ES modules, no framework, GitHub Pages + Supabase). I am
> Graeme, the project coordinator.
>
> A GitHub fine-grained PAT is in this project's knowledge (file: `Token`).
> Use it to read and commit to `build-new-habits/Home-OS` on `main` via the
> GitHub API. Verify it works first.
>
> **Read `Docs/Current/` in the repo before doing anything else.** It is the
> canonical, versioned project documentation and it is NEWER than the copies
> in this project's knowledge. Where they disagree, the repo wins. Start
> with `master_schedule.md`, then the newest `PHASEn_HANDOFF.md`, then
> `schema.md` and `GEMINI_BUILD_CONVENTIONS.md`.
>
> Phases 1–5 are cleared. **Phase 6 is built and awaiting my smoke test.**
> Do not start Phase 7 until I have cleared Phase 6 — if the smoke test
> found problems, fixing those is the job.
>
> Read existing code before extending it — every significant defect this
> project has hit was found that way. Do not trust my summary of the code,
> and do not trust your memory of it. Read the file.

---

## Why the short version is short

The repo holds better documentation than any prompt could. Pointing at it
beats duplicating it, and duplication is how the two drift apart.

The one thing that genuinely cannot be inferred is that **project knowledge
is stale relative to the repo** — several documents there are earlier
versions of files now in `Docs/Current/`. A chat that trusts project
knowledge will confidently work from superseded decisions. That warning is
worth more than any amount of copied context.

---

## Current state, 21 Aug 2026

- `main` @ `cfea01a`+. Service worker cache **`home-os-shell-v16`**.
- Phases 1–5 complete and cleared. **Phase 6 built, awaiting smoke test.**
- **49 precache paths.** Precache is all-or-nothing — every new path must
  200. Before any Phase 6 testing, hard-refresh and confirm Cache Storage
  shows `v16` with 49 entries and that `v15` is gone.
- **Start here for testing: `PHASE6_SMOKE_ROUTE.md`** — the ordered route
  through the Phase 6 checks, sequenced so anything that would invalidate
  later steps fails first.
- Supabase project `vkjwwnjhizrlqcovpdco` (EU). **Free tier: it pauses after
  about a week idle.** A paused project presents as `Failed to fetch`, or
  as Supabase's own `error 111` page. Check this before debugging code.
- **The verification harness is not in the repo.** The render gate, the
  behavioural tests, the queue tests and the contrast maths were built in
  the session sandbox and do not survive it. A new session rebuilding them
  should read the "Verification performed" section of `PHASE6_HANDOFF.md`
  first — it says what each one asserts and, more usefully, which real bugs
  each was proven to catch.

## Gotchas that have already cost time

1. **`node --check` is not verification.** It passed a `ReferenceError`
   straight to production. Render every changed view in jsdom against a
   stubbed Supabase client before committing (standing rule 12).
2. **`CACHE_NAME` must bump on any precached *content* change**, not just
   when the SW script changes. Missed once already; the old file keeps being
   served regardless of what is deployed.
3. **supabase-js resolves rather than rejects on errors** — always check the
   `error` field. `lib/net.js` `attemptWrite()` normalises this.
4. **A fetch with no connection can hang rather than fail.** Never await a
   bare Supabase call; use `attemptWrite()`.
5. **One-tap controls must be optimistic** — count the action immediately,
   sync behind it. See `views/water.js` v3. Awaiting the network defeats the
   offline queue and fails hardest where the app matters most.
6. **`flush()` must be table-scoped** — pass `{ tables }` and assert
   `op.table`, throwing on a foreign op. Returning deletes another module's
   queued write.
7. **Write-once files:** `router.js`, `routes.js`, `tokens.css`,
   `lib/rrule.js`. `app.js` and `supabaseClient.js` are *restricted*, not
   frozen — both were amended for good reason and both amendments are
   recorded in the schedule.
8. **`--control-border`, not `--color-border`**, for interactive boundaries.
9. **Cross-project contamination:** the PAT grants admin on 13 repos.
   Only ever touch `Home-OS`.
10. **A memoised promise must not cache a rejection.** `openDb()` did, and
    one transient IndexedDB failure disabled offline writes for the whole
    session. Fixed in `offlineQueue.js` v3 — but check for the pattern
    anywhere else a promise is cached.
11. **A UPC-A barcode decodes to TWELVE digits, not thirteen.** Both
    scanner engines do this. `normaliseBarcode()` in `lib/barcode.js` is the
    only supported route from a raw scan to a stored barcode; bypass it and
    the same product produces two rows.
12. **The vendored scanner reads UPC/EAN only** — deliberately, to keep it
    at 58 KB rather than 406 KB. It will not read QR, Code 128 or
    DataMatrix. Rebuild from the real package if that is ever needed.

## The honest bit

Phase 5 needed three smoke-test rounds. Every defect was found by Graeme
testing on a real device, not by any pre-commit check. The gates are better
now, but they are not sufficient. Plan for the smoke test to find things,
build in small verifiable pieces, and never mark a phase cleared on the
strength of your own testing alone.

Graeme's call on scope is final; do not expand a phase's scope without
asking. Present decisions as made, not as menus — but flag genuine
uncertainty rather than guessing.

## Decisions

**Settled 21 Aug:** phases run in the architect chat, not a separate builder
chat. The case for separation was that a builder needed files pasted to it;
that is no longer how the work happens, and reading the repo directly is what
finds defects. Recorded in `master_schedule.md` v8.

**Still outstanding — the coordinator's call:** whether to upgrade the
Supabase project off the free tier. It costs money, which is why it has not
been decided here. It matters most during heavy iteration, where a mid-
session pause presents as `Failed to fetch` and wastes time looking for a
bug that is not there.

## What Phase 6 added that later phases should reuse

- `computeMacros()` in `data/meals.js` is **pure** — Phase 9's dashboard
  should call it, not re-implement the maths.
- `DAYS` and `SLOTS` in `data/mealPlan.js` are the canonical enum values and
  match the CHECK constraints. Import them; do not re-declare.
- `findByBarcode()` and `normaliseBarcode()` are reusable by Phase 7's
  pantry unchanged. `countFoodDependents()` already counts `pantry_stock`
  and `shopping_list_items`, so Phase 7 inherits a correct delete confirm.
- `listIngredients()` with no argument fetches every meal's ingredients in
  ONE query — use `groupByMeal()` rather than N+1.
