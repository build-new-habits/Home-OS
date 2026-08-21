# Home-OS — Phase 6 session start

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
> with `master_schedule.md`, then `phase6_build_brief.md`, then
> `PHASE5_HANDOFF.md`, then `schema.md` and `GEMINI_BUILD_CONVENTIONS.md`.
>
> Phase 5 is cleared. **Phase 6 (meal planner + barcode) is active and its
> brief is written.** Resolve the open question at the end of that brief,
> then build.
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

## Current state, 18 Aug 2026

- `main` @ `b6c114b`. Service worker cache **`home-os-shell-v14`**.
- Phases 1–5 complete and cleared. Phase 6 active, brief written.
- 43 precache paths. Precache is all-or-nothing — every new path must 200.
- Supabase project `vkjwwnjhizrlqcovpdco` (EU). **Free tier: it pauses after
  about a week idle.** A paused project presents as `Failed to fetch`, or
  as Supabase's own `error 111` page. Check this before debugging code.

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

## The honest bit

Phase 5 needed three smoke-test rounds. Every defect was found by Graeme
testing on a real device, not by any pre-commit check. The gates are better
now, but they are not sufficient. Plan for the smoke test to find things,
build in small verifiable pieces, and never mark a phase cleared on the
strength of your own testing alone.

Graeme's call on scope is final; do not expand a phase's scope without
asking. Present decisions as made, not as menus — but flag genuine
uncertainty rather than guessing.

## Two decisions outstanding

1. Whether Phase 6 runs in this chat or a separate builder chat. Direct repo
   access has weakened the original case for separation.
2. Whether to upgrade the Supabase project off the free tier. Barcode work
   means heavy iteration, and a mid-session pause will waste time.
