# Home-OS: Phase 33 Build Brief — Share a Recipe In
24 Nov 2026 v2

**v2 — as built.** Four deviations from v1, all recorded in
`PHASE33_HANDOFF.md`:
1. No `source_name` column. The site's name goes in the existing
   `meals.source` ("book and page", 13 Sep), so revision 27 adds only
   `source_url`.
2. The editor handoff is `#/recipe-edit?imported=1`, not `?from=import`:
   `?from=` already means "your version of library recipe <slug>".
3. Prep and cook minutes ARE imported (`prepTime`/`cookTime`), because
   `meals.prep_minutes`/`cook_minutes` already exist.
4. No "Add it to this week's plan?" toast action. Save lands on the recipe
   page, whose Add to plan is already the one primary action there.

Built directly in the architect chat (the builder-chat loop is suspended).
Read `SESSION_START.md` first, as every session does.

## Why this phase exists
ReciMe (and RecipeBee, aMEALi, MealTime) sell one moment above everything
else: you see a recipe somewhere, tap Share, and it's in your app. From there
it goes onto the plan and into the shopping list. Home-OS already does the
second half better than any of them. It merges quantities across recipes,
checks the cupboard first, and scales portions per household member. ReciMe
reviewers complain about exactly those gaps. What Home-OS lacks is the
first moment. This phase adds it.

**The pipeline after the import already exists and is not touched:** a saved
recipe is an ordinary `meals` row, so the meal picker, the plan, the
shopping diff, cook mode and nutrition all pick it up with no changes.

## Precondition
- Phase 32 handoff complete. `main` is the kitchen build and the seven gates
  are green on a fresh clone.
- Supabase project confirmed as **"Home OS"** (not Alongside-Learn) before
  any SQL or function deploy.

## What Phase 33 is
1. **Android share target.** Home-OS appears in the phone's Share menu. A
   shared link or text opens the import screen.
2. **Import from a recipe website.** A small Supabase Edge Function fetches
   the page and returns its structured Recipe data (schema.org JSON-LD,
   which almost every recipe site publishes). The app turns that into a
   draft.
3. **Import from pasted text.** For Instagram/TikTok captions, a note, or a
   message, paste the text. The app's existing line parsers split it into
   ingredients and steps.
4. **One review screen, then save.** The draft opens in the existing recipe
   editor (`recipe-edit`), already filled in, with its source shown. You
   check it and press Save. Nothing reaches the database before Save.
5. **Paste a link** on the import screen, for iPhone and desktop (no share
   target there) and for anyone who prefers it.

## What NOT to do
- **No AI calls.** No Claude or other model API, no transcription, no photo
  reading. That is Phase 17 territory (parked for per-use cost). Text a
  parser can't split goes to the user as editable lines, not to a model.
- **No video import.** A TikTok or Reel with the recipe only in the audio
  cannot be read without transcription. Say so plainly on screen.
- **No scraping of Instagram, TikTok or Facebook pages.** They sit behind
  login walls and their terms forbid it. For those hosts the function is
  not called at all; the screen asks for the caption instead.
- **Imported recipes never enter `data/recipe_library/`.** They are
  household-private. The publishing standard in `ROADMAP.md` (original
  writing only, no single-source derivation) is untouched by this phase.
- No new nav tab. Import is weekly-or-less (principle 2): it lives behind
  the share sheet and one link on the Meals and Library screens.
- No edits to `router.js`, `tokens.css`, `rrule.js`, `app.js`. `routes.js`
  is append-only.

## Schema — revision 27 (`migrations/027_recipe_source.sql`)
`meals` gains two nullable columns:

| Column | Type | Notes |
|---|---|---|
| source_url | text | nullable. The page the recipe came from. Shown as credit, used to stop a double import |
| source_name | text | nullable. Display name of the site, e.g. "BBC Good Food", from the page's `publisher`/`og:site_name`, else the host |

- Partial unique index on `(household_id, source_url) where source_url is
  not null`, so importing the same page twice in one household is
  impossible (same reasoning as `library_ref`, revision 14).
- No `BEGIN`/`COMMIT`. Ship `027_recipe_source_VERIFY.sql` and run it.
  Record the result in `MIGRATIONS_APPLIED.md`.
- `schema.md`: add revision 27 above revision 26 and update the `meals`
  table section. Schema first, code second.
- Saving must still work **before** 027 is applied. Use the
  `isMissingColumnError` pattern `ownRecipe.js` already uses for `course`.

## The Edge Function — `supabase/functions/import-recipe/index.ts`
Deliberately simple. **It fetches and extracts; it does not interpret.**
All the logic that turns data into a draft stays in client JS, where the
gates can test it.

- `POST { url }`. **JWT required** (default `verify_jwt`), so only signed-in
  Home-OS users can call it.
- Rejects: non-`http(s)` schemes; hosts that resolve to private, loopback or
  link-local addresses (SSRF); the social hosts listed below.
- Fetch with a 10 s timeout, follow at most 3 redirects (re-checking each
  hop), read at most 2 MB, `text/html` only.
- Returns
  `{ ok, recipes: [<raw JSON-LD Recipe objects>], siteName, finalUrl }`.
  It walks every `<script type="application/ld+json">`, including `@graph`
  arrays and `@type` given as an array.
- No Recipe found → `{ ok: true, recipes: [], siteName, finalUrl }`. This is
  not an error; the client offers the paste route.
- Logs nothing about the page body. Logs the host only.
- Social hosts refused before fetch: `instagram.com`, `tiktok.com`,
  `facebook.com`, `fb.watch`, `youtube.com`, `youtu.be`, `pinterest.*`,
  `x.com`, `twitter.com`. Return `{ ok: false, reason: 'social' }`.
- Deploy through the dashboard's Edge Functions editor or the CLI. Record
  it in `MIGRATIONS_APPLIED.md` under a new "Functions deployed" heading.
- **Cost:** none per import beyond Supabase's function allowance. That is
  what keeps this out of the Phase 17 parking rule. Check the current
  allowance on the Supabase pricing page at deploy time and note it in the
  handoff.

## Files

| Path | Change |
|---|---|
| `manifest.webmanifest` | v2 — adds `share_target` (below) |
| `share.html` | **new** — static landing page for shares |
| `js/share.js` | **new** — reads the share query and redirects into the hash router |
| `js/data/recipeImport.js` | **new** — pure functions plus the function call |
| `js/views/recipeImport.js` | **new** — the import screen, route `recipe-import` |
| `js/routes.js` | v9 — appends `recipe-import` |
| `js/views/recipeEditor.js` | next version — accepts an import handoff, shows the source, saves it |
| `js/data/ownRecipe.js` | v5 — draft carries `source_url`/`source_name`; `saveDraft` writes them (guarded) |
| `js/views/recipe.js` | next version — "From BBC Good Food" credit link under the title |
| `js/navConfig.js` | next version — "Import a recipe" entry in the kitchen lists |
| `supabase/functions/import-recipe/index.ts` | **new** |
| `service-worker.js` | precache `share.html`, `js/share.js`, both new modules; **bump `CACHE_NAME`** |
| `Tests/import.mjs` | **new** gate — see Verification |
| `Docs/Current/schema.md`, `migrations/027_*` | revision 27 |

### Share target (manifest)
```json
"share_target": {
  "action": "/Home-OS/share.html",
  "method": "GET",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```
- **GET, not POST.** There is no file to receive, and GET needs no service
  worker fetch handler.
- `share.html` is a separate page because the router is hash-based and
  write-once. A shared query string can't reach a hash route without
  editing `app.js`. `share.js` builds `#/recipe-import?u=…&t=…` and calls
  `location.replace`, so Back doesn't land on the bounce page.
- External script only (`js/share.js`), no inline script. That keeps a
  future CSP possible.
- **Android puts the link in `text` more often than in `url`** (Chrome,
  Instagram and most apps do). `extractUrl()` checks `url`, then the first
  `https?://` in `text`, then `title`.

### `js/data/recipeImport.js`
Pure, exported, and unit-tested:
- `extractUrl(params)` → first usable URL, or `''`.
- `isSocialHost(url)` → boolean (same list as the function).
- `pickRecipe(recipes)` → the most complete Recipe object (most
  ingredients plus steps), or null.
- `jsonLdToDraft(recipe, { sourceUrl, siteName })` → an `ownRecipe` draft:
  - `name` ← `name`, trimmed and with HTML entities decoded.
  - `servings` ← first integer in `recipeYield` (string, number or array);
    default 4.
  - `ingredients` ← each `recipeIngredient` through the existing
    `parseIngredientLine`. **Reuse it, don't fork it.**
  - `steps` ← `recipeInstructions` flattened. It can be a string, an array
    of strings, `HowToStep`, or `HowToSection` with `itemListElement`. Each
    step is capped at `MAX_STEP`. Section names become a step note, not a
    step.
  - `kind` ← mapped from `recipeCategory` only when it plainly says
    breakfast/lunch/dinner/snack/drink, else left empty. **Never invent
    one** (schema rev 5 reasoning).
  - Times, nutrition, ratings, image: **ignored.** Nutrition comes from the
    ingredient database, as for every other recipe ("honest data" —
    another site's numbers are someone else's guess). The image is skipped
    to avoid hot-linking someone else's photo.
- `textToDraft(text)` → for pasted captions. Lines under an
  "ingredients"-like heading go to `parseIngredientLine`; lines under a
  "method/directions/steps"-like heading go to `parseMethod`. With no
  headings, a line that starts with a quantity is an ingredient and the
  rest are steps. The first non-empty line is the name.
- `importFromUrl(url)` → `supabase.functions.invoke('import-recipe')`. It
  returns `{ ok, draft | reason }`. Reasons: `offline`, `social`,
  `no-recipe`, `fetch-failed`. Check `error` before trusting `data`
  (standing rule 5).
- `findExisting(sourceUrl)` → the existing meal id with that `source_url`,
  or null.

### `js/views/recipeImport.js` (route `recipe-import`)
One primary action per screen (`createActionBar`). Thumb reach.

States, each with its own `<h1>` and focus moved to it:
1. **Working** — "Reading the recipe from bbcgoodfood.com". Polite live
   region, no spinner-only feedback.
2. **Already yours** — "You already have Chicken Traybake." Primary:
   *Open it*.
3. **Found** — the draft goes into `sessionStorage['home-os-import-draft']`,
   then `location.replace('#/recipe-edit?from=import')`. The review *is*
   the editor; no second review screen is built.
4. **Social link** — "Instagram doesn't let apps read posts. Copy the
   caption and paste it here." A labelled textarea. Primary: *Read this
   text*. A link back to the post opens in a new tab.
5. **No recipe on that page** — same paste box, worded as a fact: "That
   page doesn't include a recipe Home-OS can read."
6. **Offline** — "You're offline. Home-OS has kept this link and will offer
   it when you're back online." The link is stored in
   `localStorage['home-os-import-later']` (max 20, de-duplicated).
   **Nothing is lost.**
7. **Arrived with nothing** (opened from nav) — a URL field plus the paste
   box, and any kept links listed as cards (tap → import).

### `js/views/recipeEditor.js`
- On `?from=import`, read and **remove** `home-os-import-draft`. If the
  user already has an unsaved own-recipe draft in `DRAFT_KEY`, **don't
  overwrite it**. Ask with `confirmDialog`: *Keep the imported recipe* /
  *Go back to my draft*. Nothing is deleted silently (principle 9).
- Show a neutral notice above the form: "Imported from BBC Good Food.
  Check the amounts and steps, then save." Plus a count of any ingredients
  not yet matched to a food: "3 ingredients aren't matched to a food yet —
  nutrition will show as unknown for those." That's a fact, not a warning
  colour.
- The existing advisory `stepHint` applies to imported steps as normal.

## Principles in scope
- **1 No shame.** No "you've imported 40 and cooked 3". Unmatched
  ingredients and missing data are stated as facts. The no-shame word gate
  covers all new copy.
- **2 Friction.** Share → one review → Save. Fewest required fields. The
  name is the only one the user must touch, and only if empty.
- **5 Adaptive by context.** An imported recipe is a normal meal, so the
  shopping diff and portions apply with no extra step.
- **9 Data belongs to you.** Import never overwrites a draft without
  asking. Imported recipes appear in the JSON export like any other meal.
- **10 Offline.** Sharing offline keeps the link and says so. Import is
  allowed to need a connection, and the screen states that clearly.

### Coach-principle additions (in scope, small)
- **Saved isn't the goal, cooked is.** In the meal picker, an opt-in filter
  chip "Recently imported" (last 14 days, planned or not). Never a count
  of uncooked imports, never a badge.
- **The editor notice tells you the next useful step:** after Save, the
  toast says "Saved. Add it to this week's plan?" with an action. Dismissing
  it leaves no trace.

## Accessibility (WCAG 2.2 / 2.1 AA) — gate
- Every state has a unique `<h1>`, focus moves to it, and state changes are
  announced through the shared live region.
- The URL field is `type="url"` with `inputmode="url"`, labelled, and errors
  are given in text via `aria-describedby`. The paste box is labelled, and
  its hint explains what format works.
- Kept-link cards are real links/buttons with accessible names that include
  the host. Targets are ≥ 24×24 CSS px (2.5.8) and ≥ 44 where the design
  system already uses it.
- The source credit link says where it goes ("Open the original on BBC
  Good Food, opens in a new tab").
- No colour-only meaning. Contrast checked in all four theme combinations.
  `prefers-reduced-motion` respected.
- The `confirmDialog` draft conflict is keyboard-operable and returns focus
  to where it came from.

## Verification
**New gate `Tests/import.mjs`** (added to `run-all.sh`), fixture-driven,
runs offline:
- `jsonLdToDraft` against at least 8 saved, anonymised JSON-LD fixtures
  covering: plain array instructions, `HowToStep`, `HowToSection`, `@graph`
  wrapper, `@type` as array, `recipeYield` as "Serves 4" / `["4","4
  servings"]` / `4`, entity-encoded names, a recipe with no instructions.
  Fixtures are **structural**: invented recipe text, never copied from a
  real site.
- `textToDraft` against 5 caption shapes (headed, unheaded, emoji bullets,
  numbered steps, one long paragraph).
- `extractUrl` with link in `url`, in `text` mid-sentence, in `title`, and
  absent.
- `isSocialHost` including subdomains (`m.facebook.com`, `vm.tiktok.com`).

**Existing gates:** render gate covers `recipe-import` in all seven states
against a stubbed client; a11y and contrast gates pass; schema-conformance
knows `source_url`/`source_name`; platform gate confirms new precache paths
return 200 and stylesheet URLs agree.

**Edge function:** run locally or in the dashboard tester against three
live recipe sites and one page with no recipe. Record the hosts and results
in the handoff, not page content.

## Live smoke test (Android, installed app)
1. Update the installed app. **Android only picks up a new `share_target`
   when the WebAPK refreshes.** If Home-OS isn't in the Share menu after a
   day, remove it from the home screen and install it again. Note which was
   needed.
2. From Chrome on a recipe site: Share → Home-OS → editor opens filled in
   → Save → recipe appears in Meals with a working credit link.
3. Share the same page again → "You already have …".
4. Share an Instagram post → caption paste route → Save.
5. Airplane mode → share a link → "kept for later" → back online → the
   link is offered on the import screen → import works.
6. Start an own recipe, leave it unsaved, then import → the conflict dialog
   appears and both choices behave.
7. Plan the imported recipe and generate the list: quantities merge with
   other recipes, and pantry stock is subtracted.
8. Keyboard-only pass on desktop with the paste-a-link route; TalkBack pass
   on the import states.

## Handoff
`PHASE33_HANDOFF.md` should cover what shipped with versions; that 027 was
applied and verified; the function deploy plus the allowance noted; which
hosts were tested; whether a reinstall was needed for the share target; and
any JSON-LD shape seen live that the fixtures missed.

## Next, not now
- **Phase 17 (parked) is the natural follow-on.** It covers photo-of-a-page
  import plus the plain-language step rewrite and swaps, using AI, behind
  the paid tier. This phase's draft shape is the one Phase 17 would fill,
  so nothing here is throwaway.
- Aisle-sorted shopping list (`COMPETITIVE_POSITION.md` gap) is the other
  cheap thing ReciMe does that Home-OS doesn't.
