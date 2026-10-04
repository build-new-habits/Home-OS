# Home-OS — new chat: experience review to 5 stars

Paste everything below the line into a new chat in the **Home OS** project.

---

You are taking over Home-OS, a kitchen app (a PWA) that Graeme is building for himself first and later for the market (planned £2.99 a month or £24.99 a year, later wrapped for Google Play). Your job in this chat is to **review the whole experience as real people would use it, then build what it takes to get as many of them as possible to 5 stars.** Graeme has handed the build rhythm to you: when he says "Next", carry on with the next most valuable thing. Commit and push after each finished batch.

## Start here
1. Clone `build-new-habits/Home-OS` and work on branch `kitchen`. The GitHub token is in the project doc **Token**. Never print it, echo it, or commit it.
2. Read these before changing anything: `Docs/Current/00_vision.md`, `01_behavioural_principles.md`, `KITCHEN_REDESIGN.md`, `PERSONAS.md`, `PERSONAS_RETRACE_2.md`, `schema.md`, `MIGRATIONS_APPLIED.md`, `RECIPE_TRACKER.md`, and `git log --oneline -40`.
3. Look at the live app (GitHub Pages from `main`) and at the code. Do not trust old notes over the code.

## What the app is now (4 Oct 2026)
- **Kitchen only.** Today, Plan, Recipes, Shopping, Pantry. Other areas are parked: never delete them.
- **Today:** next meal (photo when there is one, portions, Eaten tick, We cooked it, Plan leftovers), the rest of today, Drinks today (one-tap chips including beer, wine, spirit and cocktail with standard servings), Tomorrow plus a freezer reminder, nutrition (Eaten so far, and the day as planned, one portion each), Use soon, things to buy.
- **Plan:** board or list view, a drinks row, a panel per meal (portions: Just me / 2 / 3 / Everyone / Double, freeze half / As the recipe; Eaten; leftovers; Find a starter or pudding; ideas), Fill the open meals, Update shopping list.
- **Recipes:** 214 original library recipes (never copy a named cook's text), courses, swaps, a vegetarian or vegan version of any recipe, Make your own version, a full editor (save to the household or on this phone), cook mode with persistent named timers, photo support (none yet; Graeme will send Gemini images named `<slug>.png`; run `scripts/recipe_photos.py add <folder>`).
- **Shopping:** grouped by kind, share as text, Bought everything, put-away asks only for a use-by.
- **Pantry:** by kind (Dairy, Meat, Fish, Fruit, Veg, Tins, Dried, Baking, Snacks, Drinks…), assigned automatically with a Kind picker to change it, quick start ticks, levels (plenty or low), and a home-made freezer item for spare portions.
- **Pantry and cooking:** Eaten or We cooked it takes ingredients out once between them, scaled to the portions; unticking puts them back.

## Known limits
- **Migration 026 is NOT applied.** Graeme cannot get into Supabase at the moment. Everything that needs it detects the missing columns and falls back: leftovers, courses, foods.shelf and weekly_meal_plan.eaten_at, with shelf choices and Eaten ticks kept on the phone meanwhile. Drinks and the "pantry taken" record are phone-only by design. Before any SQL is run, confirm the project is **Home OS**, not Alongside-Learn.
- Waiting on Supabase or a server: trying the app without an account, reminders and notifications, import from a URL or photo, a review prompt, and syncing the pantry-taken record across phones.
- Supabase returns at most 1,000 rows per request: use `js/lib/readAll.js` for any table that can grow.

## The review (do this first, then build)
1. Trace 8–10 distinct people through real weeks. Include: Graeme (family of 4, sometimes cooks for 1–3, tracks nutrition, drinks the odd IPA); a busy parent who is new to cooking; a single person cooking for one on a budget; a vegetarian couple; a keen cook with a big recipe collection; someone with low vision using 150% text and a screen reader; someone with ADHD who abandons apps that nag; an older user who is not confident with phones; someone who batch-cooks and freezes; and someone trying it before paying.
2. For each person: first ten minutes, first week, week four. What delights them, where they stall, what they never find, what feels like work. Rate the app out of 10 and in stars, and say whether they would pay and how much.
3. Rank the fixes by how many people move to 5 stars per hour of work. Write the review to `Docs/Current/PERSONAS_RETRACE_3.md`, send Graeme a short summary, then start building from the top of the list without waiting.
4. Be honest. A world-class bar means comparing against the best meal planners and pantry apps (Paprika, Mealime, Plan to Eat, Samsung Food, Kitchen Stories) and saying where Home-OS is behind.

## How to build here
- Vanilla JS ES modules, no framework. File headers: `// path — DD Mon YYYY vN` plus a version note line. `routes.js` is append-only.
- **Gates:** `JSDOM_MODULES=/tmp/j/node_modules bash Tests/run-all.sh` (install jsdom to /tmp/j if it is missing). Commit only when `... | tail -1 | grep -q "ALL GATES PASSED"`. Update snapshots with `UPDATE_SNAPSHOTS=1` only after reading the diff and judging it intended.
- **Platform gate:** every class needs a CSS rule; no rem and no px above 2 in CSS (use em and the tokens); feature-detect `'share' in navigator` and similar; new JS files go in the service worker's SHELL_FILES.
- **Every batch:** bump the service-worker header version and note, CACHE_NAME `home-os-shell-vNNN`, and `.css?v=NNN` in index.html and service-worker.js (both v162 at handover).
- **Schema-conformance gate:** literal payload objects, and every column documented in `schema.md`.
- **Push:** `git push origin kitchen` and `git push origin kitchen:main`.
- **Commit trailer:** the Co-Authored-By and Claude-Session lines from the system reminder.
- Check visually with Playwright (Chromium is pre-installed) and axe-core, in light, dark and high contrast and at 150% text, before saying something is done.

## Non-negotiables
- WCAG 2.2 and 2.1 AA everywhere: 44px targets, colour never the only signal, real labels, focus returned after dialogs, announcements for changes.
- Behavioural principles: no shame and no verdicts ("Nothing planned", never "missed"); no nagging; banned words in steps (just, simply, quickly, easy…).
- Original recipe text only; no scanned recipe text in the public repo.
- Never delete parked areas. Keep themes, text size and density settings working.
- Plain British English in the app and in replies. Graeme is not watching the terminal: give him outcomes, not steps.
