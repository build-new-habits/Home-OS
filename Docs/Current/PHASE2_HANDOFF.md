# Home-OS Handoff — Phase 2: Application Shell (reconciled)
18 Jul 2026 v2

Superseded my earlier handoff. The four docs I was missing —
`schema.md`, `GEMINI_BUILD_CONVENTIONS.md`, `REPO_STRUCTURE.md`,
`INTEGRATION_CHECKS.md` — are now in project knowledge. I reconciled the
Phase 2 build against the real versions and found four real (not
cosmetic) discrepancies, all now fixed.

## What the reconciliation found and fixed

1. **Views calling Supabase directly (GEMINI_BUILD_CONVENTIONS.md §2 violation).**
   `js/views/settings.js` called `supabase.auth.signOut()` directly. Convention
   is explicit: "views never call Supabase directly." Fixed by adding
   `signOutUser()` to `js/data/settings.js` and calling that from the view
   instead. The view no longer imports `supabaseClient.js` at all.

2. **Data functions threw instead of returning the shared result shape (§2).**
   The convention's own code example returns `{ ok: true, data }` /
   `{ ok: false, error }` from every data-access call. My `getSettings()`,
   `upsertSettings()`, and `exportAllData()` used `throw` instead. Rewrote all
   three (plus the new `signOutUser()`) to the `{ ok, data|error }` contract,
   and updated every caller (`app.js`, `views/settings.js`) to match.

3. **Icon path and format didn't match REPO_STRUCTURE.md.** The canonical
   structure puts icons at `assets/icons/` with "SVG preferred" — I'd
   pointed the manifest at nonexistent `./icons/icon-192.png` /
   `icon-512.png`. Fixed: added `assets/icons/icon.svg` (a real, simple
   SVG mark, not a placeholder), updated `manifest.webmanifest` to
   reference it as a single `"sizes": "any", "type": "image/svg+xml"`
   entry, updated `index.html`'s favicon link, and added it to the
   service worker's precache list. `service-worker.js`'s `CACHE_NAME`
   bumped to `v2` since the precache list changed.

4. **`innerHTML = ''` clearing pattern, tightened.** Conventions §4 bans
   `innerHTML` for anything but static developer-authored markup. None of
   my uses interpolated data, but to remove all ambiguity I replaced every
   `el.innerHTML = ''` with `el.replaceChildren()` in `router.js`, `app.js`,
   and `views/settings.js`.

Everything else reconciled clean on the first pass:
- **schema.md**: identical to what I'd reconstructed — same 17 tables,
  same column names/types/constraints, same FK delete rules. No drift.
- **REPO_STRUCTURE.md**: file layout matches; the extra `data/` domain
  modules, `components/card.js` + `completionStamp.js`, and `lib/rrule.js`
  it lists are explicitly later-phase files (Phase 3/4/6+), not gaps in
  this phase's delivery.
- **INTEGRATION_CHECKS.md**: the Phase 2 block is word-for-word what was
  already inline in `phase2_build_brief.md`, so nothing changed there.
- **Import direction rule** (REPO_STRUCTURE.md): `data/` imports only
  `supabaseClient`; `components/` and `lib/` import nothing from `views/`
  or `data/`. One note: `components/bottomNav.js` imports `routes.js` —
  that's outside the letter of the rule (routes.js is neither `views/` nor
  `data/`) but is a real coupling worth naming rather than burying;
  flagging it here rather than silently calling it clean.

## Files delivered (updated set)
Same file list as before, plus:
- `assets/icons/icon.svg` — new, real icon (not a placeholder)
Changed in this pass: `js/app.js` (v2), `js/data/settings.js` (v2),
`js/views/settings.js` (v2), `js/router.js`, `manifest.webmanifest`,
`index.html`, `service-worker.js` (v2, CACHE_NAME bumped).

## Self-review results (re-run after reconciliation)
- Syntax parse: **pass** — `node --check` on every file under forced ESM, zero errors.
- Imports resolve (relative, /Home-OS/): **pass** — every relative import programmatically verified against the filesystem; no root-absolute imports.
- Schema fidelity: **pass** — verified directly against the real `schema.md` this time, not a reconstruction. 17 tables, exact names, no `user_id` passed on any insert/upsert.
- Wiring / seam points: **pass**, with the one noted coupling (bottomNav → routes.js) above.
- Accessibility checklist: unchanged from before — see original handoff for the item-by-item list; nothing in this reconciliation pass touched a11y-relevant markup.
- No cross-project contamination: **pass**.

## Deviations still standing (unchanged, not resolved by the new docs)
- Supabase client loaded via pinned `esm.sh` CDN URL — still a locked
  decision, `REPO_STRUCTURE.md`/`GEMINI_BUILD_CONVENTIONS.md` don't
  address a client library source since neither anticipated a bundler-free
  build needing one; no conflict found, just no explicit sanction either.
- Bottom nav set (Dashboard, Water, Exercises, Chores) — your call to
  confirm or adjust, per the brief's "you decide the nav set" instruction.

## What needs live testing by the coordinator
Unchanged — run the 7-step Phase 2 smoke test from `INTEGRATION_CHECKS.md`
against the real Supabase project + a browser, after pasting the real
publishable key into `js/config.js`.

## Open questions for the PM
- Confirm the `bottomNav.js → routes.js` import is acceptable as a named
  exception to the import-direction rule, or if you'd rather it took an
  explicit `navRoutes` array passed in from `app.js` instead (fully
  decoupling it from `routes.js`).
- Confirm the SVG-only icon is sufficient for now, or whether you want
  PNG fallbacks added in a later phase for broader install-prompt support.
