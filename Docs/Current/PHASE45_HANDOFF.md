# Phase 45 handoff: AI recipe import (Hearth)
28 Nov 2026 v1

This is the Phase 17 brief, unparked as a Hearth feature (ROADMAP.md, 25 Nov 2026).

## What shipped
These features are in the app on shell v194, and all 20 gates pass.

- **A photo of a cookbook page or card.** Import a recipe offers "From a photo of a cookbook page". Choose one photo, or two for a two-page recipe.
  - The phone shrinks each photo to 1568 px on the long side before sending it.
  - The AI reads the photo and returns the recipe, which lands on Check and save.
- **Read it with AI.** Every paste box has a second button for captions that are all one paragraph. The free line-by-line reader is still the first choice.
- **What the AI must do.** It extracts the ingredients as facts and converts them to g, ml, tsp, tbsp or items, keeping what the recipe said (for example "1 cup"). It rewrites every step from scratch in the house style. It drops headnotes and stories, and suggests vegetarian or vegan swaps.
- **Nothing it returns is trusted.** `js/data/aiImport.js` checks every field and limits its length. It removes banned words and splits any step longer than 20 words. Every amount the AI was unsure of goes on a list.
- **Check and save** shows a "Read by AI" panel with "Worth checking first:" items. Nothing is saved until you press Save.
- **Free households** see the Hearth card (`aiImport`) when they tap either AI button. The free routes (link and plain paste) are unchanged.

## The server side
`supabase/functions/ai-import-recipe/index.ts` is a new function. The free `import-recipe` function stays free of AI.

The function makes three checks before any AI call, and a check that can't be made counts as a no:
1. The user is signed in.
2. The household is on Hearth (`household_entitlements`, read with the user's own token).
3. Fair use: fewer than `AI_MONTHLY_LIMIT` AI imports this calendar month (default 60). This counts rows in `ai_imports`. Before migration 031 the table is missing, so the function answers "unavailable".

Every call that reaches the model is counted, readable or not. Photos and text are not stored, and the log records only the kind and the outcome.

The default model is `claude-sonnet-5-5`. You can override it with the `AI_MODEL` secret.

## To switch it on (Graeme)
1. **Migration 031.** In the Supabase SQL editor, confirm the project is "Home OS" (not Alongside-Learn).
   - Run `migrations/031_ai_imports.sql`, then `031_ai_imports_VERIFY.sql`. You should see four PASS rows.
   - Record the result in `MIGRATIONS_APPLIED.md`.
2. **API key.** Get one from console.anthropic.com (API keys).
   - Add it in Supabase → Edge Functions → Secrets as `ANTHROPIC_API_KEY`.
   - Optional secrets: `AI_MONTHLY_LIMIT`, `AI_MODEL`.
   - Set a monthly spend limit in the Anthropic console too, as a second safety net.
3. **Deploy.** Go to Edge Functions → Deploy a new function, name it `ai-import-recipe`, and paste in the file.
   - In Settings, turn "Verify JWT with legacy secret" OFF, the same as for import-recipe.
   - Record the deploy in the ledger.
4. **Device test.**
   - Photograph a page from a book on your shelf → Read the photo → Check and save → fix the one thing it got wrong → Save → cook from it.
   - Then try a two-page spread, a badly lit photo, a page that isn't a recipe, and an Instagram caption with Read it with AI.
   - Turn on airplane mode and check you get the "needs a connection" message.

## Cost, roughly
A photo import with Sonnet is a few pence. The 60-a-month cap keeps a heavy household under about £2 a month, which is well inside £3.99.

## Not in this phase
- Video captions and transcription.
- Showing "N left this month" on screen. The function already returns `left`, and members can read `ai_imports`.
