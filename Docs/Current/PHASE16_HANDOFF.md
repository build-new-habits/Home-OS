# Home-OS: Phase 16 Handoff — Recipe Library (machinery + first tranche)
01 Sep 2026 v1

**Schema revision 14.** Run the migration before pulling.

**This phase ships the machinery and 10 recipes, not a full batch.** See
"Content" below — that is a deliberate stop for a quality check, not a
shortfall.

## What shipped

| Path | Version | What |
|---|---|---|
| `data/recipe_library/*.json` | v1 (new) | Seed format + 10 recipes |
| `js/data/recipeLibrary.js` | v1 (new) | Browse, filter, add-on-demand |
| `Tests/library.mjs` | v1 (new) | **Gate 8** |
| `js/views/meals.js` | v19 | Library browser |
| `css/components.css` | v32 | Library rows |
| `service-worker.js` | v54 | Two new paths |

**The harness is now eight gates.**

## Decisions worth knowing

**The library is static JSON, not database rows.** Free to serve at any
number of users, cacheable, offline-capable, no RLS reasoning. Rows would
cost a read per browse per user for content identical for everyone.

**Cuisine files are NOT precached.** Only `index.json` is. The precache is
all-or-nothing, so putting a growing library inside it would mean one bad
path breaks the entire app. Files are fetched when the panel is opened, and
the panel loads nothing until you open it.

**Nothing is bulk-loaded.** 300 recipes would create roughly 1,200 `foods`
rows for things you will never buy, wrecking the shortfall diff and burying
the pantry. A recipe becomes rows only on tap.

**Ingredient resolution prefers an existing food by name.** This is what
makes your already-scanned tin of tomatoes get reused rather than
duplicated — Phase 11's principle applied to seeding. Skipping it would
have reintroduced the exact defect Phase 11 fixed, 300 times over.

**Already-added recipes are marked, not hidden.** Seeing that you own it is
information; making it vanish just looks like a bug.

**Adding reports what it did.** "Added Puttanesca. 3 ingredients you already
had, 4 created, 11 steps." Nothing happens invisibly.

**A dietary filter requires EVERY tag asked for.** Asking for vegan means
vegan, not "vegan or vegetarian" — otherwise the filter would serve someone
a soup with cream in it.

**`cuisine` carries no CHECK.** The set is open, and a constraint you must
migrate every time you cook something new is working against you.

## Gate 8

`Tests/library.mjs`, 947 checks over 10 recipes. Per recipe it asserts:
valid slug (unique library-wide), tier, slot, serves and dietary tags; every
ingredient has a valid unit and positive quantity; **every `ref` exists in
the reference file** (a bad ref would create a bare macro-less food, quietly
undoing Phase 13 one recipe at a time); at least one step; and per step —
20 words maximum, no "meanwhile", none of the seven shaming words, every
`{{ing:}}` token resolving to an ingredient of that recipe, sane timers.

Plus: a recipe with three or more ingredients must use at least two tokens,
because rule 3 exists so nobody has to scroll back mid-cook.

## Content — the honest position

**10 recipes: 5 Italian, 5 British.** The plan is 300 across eight batches
of 40–60.

I have stopped at 10 on purpose. The format, the gate and the add path are
all now proven end to end, and it is much cheaper to change the house style
against 10 recipes than against 300. Cook one before I write the rest.

Batch order once the style is agreed: British and Italian dinners → Indian
and Thai → breakfast, lunch and packed food → budget tier → vegetarian and
vegan → French, Caribbean, Mexican, Chinese, Middle Eastern → snacks →
assemblies.

**Assemblies stay short.** A cottage cheese bagel is a three-step card and
must stay one. There will be a pull to pad them out so they look like proper
recipes; the gate's word limits do not prevent that, so it is a rule for
whoever writes them.

Every recipe is an original formulation. Each file carries a licence
declaration, checked by the gate.

## Not yet done

- **No dietary filter control in the UI.** `filterRecipes` supports it and
  it is tested; the select is not built. Worth adding with the vegetarian
  and vegan batch, when it has something to filter.
- **Option groups are supported by the seed format and the add path but no
  seeded recipe uses them yet.** They arrive with the lunch batch, which is
  where build-your-own belongs.
- **`addAlternative()` from Phase 19 is still unwired.**

## Next

Phase 10 (notifications, still unbriefed) or Phase 21 (productisation), or
more library batches. My suggestion: cook one of these first.
