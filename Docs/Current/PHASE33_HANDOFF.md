# Home-OS: Phase 33 Handoff — Share a Recipe In
24 Nov 2026 v1

Brief: `phase33_build_brief.md` (v2, as built). Schema revision 27.

## What shipped

| Path | Version | What |
|---|---|---|
| `manifest.webmanifest` | v2 | `share_target`, GET, landing on `share.html` |
| `share.html` | v1 (new) | Turns a share's `?query` into `#/recipe-import?…`, then steps aside |
| `js/share.js` | v1 (new) | The script for that page (classic script, no inline JS) |
| `js/data/recipeImport.js` | v1 (new) | Reads shares, turns Recipe JSON-LD and pasted captions into editor drafts, calls the function, keeps offline links |
| `js/views/recipeImport.js` | v1 (new) | Route `recipe-import`: start, social, no recipe, did not open, already yours, offline, kept links |
| `js/views/recipeEditor.js` | v5 | `?imported=1`: filled-in draft, source note, asks before replacing a recipe being written |
| `js/data/ownRecipe.js` | v5 | Saves `source`, `source_url`, `prep_minutes`, `cook_minutes` for a new imported recipe; works before 027 |
| `js/views/recipe.js` | v18 | "From BBC Good Food" credit under the title, linking to the original |
| `js/components/mealPicker.js` | v6 | "Recently imported (n)" chip, last 14 days, shown once you have imported something |
| `js/views/library.js` | v8 | Import a recipe button |
| `js/navConfig.js` | v14 | Import a recipe among the Meals pages |
| `js/routes.js` | v9 | Appends `recipe-import` |
| `service-worker.js` | v134 | Precaches the four new files; serves `share.html` from cache whatever its query; shell v180 |
| `css/components.css` | v101 | Import screen, kept links, recipe credit |
| `supabase/functions/import-recipe/index.ts` | v1 (new) | Fetch + extract only. JWT on, address guard, social hosts refused, 10 s / 2 MB / 3 redirects |
| `Tests/import.mjs` | v1 (new) | Gate 12: 11 invented page fixtures, 5 caption shapes, share reading, host lists agree, address guard, copy words |
| `Docs/Current/migrations/027_*` | new | `meals.source_url`, its check, per-household unique index |

All gates pass, including the new import gate (150 checks). Snapshots were
refreshed for two intended changes, the Import button on Recipes and the
hidden chip in the picker, plus a new baseline for `recipe-import`.

Beyond the gates, every import state and the editor handoff were run in
jsdom against a stubbed client: start, social, caption only, no recipe,
did not open, already yours, found, offline, and kept links. The editor
case covered a fresh import, a reload, a recipe-in-progress with *Keep
mine* (the link is kept for later), and with *Replace*. Saving was checked
before 027 (falls back to `source` without the URL) and after.

## Deviations from the brief (v1 → v2)
1. **No `source_name` column.** `meals.source` already means where a recipe
   came from, so the site's name goes there.
2. **`?imported=1`, not `?from=import`.** `?from=` is taken by "your version
   of a library recipe".
3. **Prep and cook minutes are imported.** The columns already exist.
4. **No toast action after Save.** You land on the recipe page, whose
   primary action is already Add to plan.

## For Graeme to do (in this order)

1. **Run `027_recipe_source.sql`** in the Supabase SQL editor. Confirm the
   project is **Home OS** first. Then run `027_recipe_source_VERIFY.sql` and
   expect three PASS rows. Update `MIGRATIONS_APPLIED.md`.
   *026 is still recorded as not applied. 027 does not depend on it, but
   this is a good moment to run both.*
2. **Deploy the Edge Function.** In the dashboard, go to Edge Functions →
   Deploy a new function, name it `import-recipe`, and paste
   `supabase/functions/import-recipe/index.ts`. Then turn **Verify JWT with legacy secret OFF** (the function checks sign-in itself, v2).
   Update the "Edge Functions deployed" table in `MIGRATIONS_APPLIED.md`.
   Note the current free allowance from the Supabase pricing page there.
3. **Refresh the installed app on the phone.** Android picks up a new
   `share_target` when it refreshes the installed app (WebAPK), which can
   take up to a day. If Home-OS isn't in the Share menu by then, remove it
   from the home screen and add it again. Record which was needed.

## Live smoke test (Android)
1. From Chrome on a recipe site: Share → Home-OS → "Check the imported
   recipe" opens filled in → Save. The recipe shows "From <site>" with a
   working link.
2. Share the same page again → "Already in your meals".
3. Share an Instagram post → "Paste the caption from Instagram" → paste →
   Read this text → Save.
4. Airplane mode → share a link → "Kept for when you are online". Back
   online → Recipes → Import a recipe → the link is listed → tap it.
5. Start writing a recipe, leave it unsaved, then share one in. The dialog
   should offer *Keep my recipe* / *Replace with the import*, and both
   should work.
6. Plan the imported recipe for two days, beside a recipe with an
   ingredient in common. The list should merge the quantities and take off
   what the pantry has.
7. TalkBack across the import states. Then desktop keyboard-only with the
   paste-a-link route.

## Known limits (by design, or for later)
- **The function can't be tested from here.** The build session has no
  network to recipe sites. The extraction logic is covered by fixtures; the
  fetch path needs the live test above. Record the hosts tried, but not
  the content.
- **US cups aren't understood.** "1 cup flour" arrives as 1 item "cup flour"
  for you to correct. The line parser (`ownRecipe.parseIngredientLine`)
  knows g/kg/ml/l/tsp/tbsp. Adding cups is a units decision (cups to grams
  depends on the food), so it's left for its own change.
- **Preparation words are dropped from ingredient names** ("1 onion, finely
  chopped" becomes "onion") so the name matches a food. The method still
  says it.
- **Video-only recipes** can't be read without transcription, which is
  Phase 17 (parked for per-use cost). The screen says so.
- **iPhone** doesn't offer web apps in its Share menu. The paste-a-link
  route covers it.

## Integration points
- An imported recipe is an ordinary `meals` row, so plan, shopping diff,
  portions, cook mode and nutrition need no changes.
- `meals.source_url` is null for typed and library recipes, so the unique
  index never touches them.
- Phase 17, if unparked, should produce the same draft shape
  (`jsonLdToDraft` output) and hand over the same way
  (`stashImportDraft` → `#/recipe-edit?imported=1`).
