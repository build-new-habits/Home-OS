# Home-OS: Phase 17 Build Brief — Recipe Photo Import
01 Sep 2026 v1

**No schema change.** But this phase introduces the **first server-side code
in the project**, and that is the decision to understand before starting.

## The ask

Photograph a page of a cookbook, get a Home-OS card with ingredients and
method steps.

## Why this needs a server

Extracting a recipe from a photograph needs a vision model. The app is
static files on GitHub Pages in a **public** repo, so there is nowhere to
put an API key. Browser-side OCR (`tesseract.js`) is not a real option here:
it is a large dependency against a hard-won precache discipline, and it
returns unstructured text from a curved, shadowed page rather than a
structured recipe.

**Decision: a Supabase Edge Function.** Same project, same auth, key held in
Supabase secrets. It is the smallest possible server and it introduces no
new vendor.

Consequences to accept openly:

- Import requires connectivity. Everything else in the app degrades
  offline; this cannot. The UI says so.
- Deployment gains a step (`supabase functions deploy`), documented in
  `SESSION_START.md`.
- The seven-gate harness does not cover edge functions. Add an eighth gate,
  or test the function against fixture images in isolation and mark it
  clearly as outside the harness.

## Available today, with no build at all

Photograph the page, send it to the architect chat, and the recipe is
written to your database directly. Zero new architecture, works this
afternoon, and it is a genuinely reasonable answer if the in-app version
turns out not to be worth its cost. Try it before building this phase; it
may change what you want the phase to do.

## The function

`supabase/functions/import-recipe/index.ts`

- Auth: verify the Supabase JWT. It is your project; nobody else's requests
  run on your key.
- Input: one or more base64 images (a recipe often spans two pages).
- Output: `{ ok, data | error }` — same contract as every data module.
- Returns a **draft**, never writes to the database. Extraction is not
  reliable enough to write unattended, and silent writes are against the
  behavioural principles.

Draft shape matches the Phase 16 seed format exactly, so one review-and-save
path serves both.

## The instruction to the model

Two things it must do, and they are the same thing:

1. **Extract** the ingredient list, quantities and units, and the *sequence
   of actions* in the method.
2. **Rewrite** the method into `RECIPE_STEP_STYLE.md`. Not transcribe.

Rule 1 alone (one action per step) means no cookbook sentence survives
intact, so the rewrite is forced by the format rather than bolted on. This
is also the correct copyright position: ingredient lists and functional
method are facts and procedures; the author's prose is theirs. Nothing is
copied. Headnotes, anecdotes and descriptive writing are discarded outright,
not paraphrased.

Ingredients map to `foodReference` slugs where they match, so an imported
recipe arrives with macros already attached.

Response must be JSON only, no prose, no fences, parsed defensively.

## The review screen

Non-negotiable: **nothing saves until you have read it.**

- Ingredients as an editable table: name, quantity, unit, and which existing
  food it resolved to.
- Steps as an editable list, with the Phase 15 style checker live.
- Anything the model was unsure of is marked, with the source photo
  viewable alongside so you can check the page.
- Save runs the identical resolve-or-create path as Phase 16, so an imported
  recipe and a library recipe are indistinguishable afterwards.
- `library_ref` stays null. `source` is not a `meals` column, so record
  provenance in `method_note` if it matters to you.

## Failure behaviour

Unreadable photo, no recipe found, malformed JSON, function timeout, network
loss — each gets its own plain message naming what to try (better light,
one page at a time, type it by hand). Never a spinner that stops. Never a
partial save.

## Tests

Fixture images through the function: a clean single-page recipe, a
two-page spread, a badly lit photo, and a page that is not a recipe at all.
Assert structure and failure handling, not exact wording.

App-side, against a stubbed function: draft renders; edits persist through
save; resolve-or-create reuses existing foods; offline states clearly that
import needs a connection; a rejected import writes nothing.

## Done when

You can photograph a page from a book on your shelf, read it over, correct
the one thing it got wrong, and have a card you can cook from.
