// Tests/library.mjs — 01 Sep 2026 v1
// Gate 8. Every seeded recipe, checked against RECIPE_STEP_STYLE.md and
// against the reference food file.
//
// This gate exists because the library will eventually hold 300 recipes
// written across many sessions. A malformed one must fail the build, not
// reach a phone. And once these recipes are published, the originality and
// style rules stop being a personal-use safeguard and become the standard
// the whole thing is judged on.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const REPO = process.env.GATE_REPO || process.cwd();
const LIB = path.join(REPO, 'data', 'recipe_library');

const failures = [];
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

const BANNED = ['simply', 'just', 'obviously', 'quickly', 'easy', 'easily', 'merely'];
const TIERS = ['budget', 'everyday', 'special'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const TAGS = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free'];
const UNITS = ['g', 'ml', 'item', 'tsp', 'tbsp'];

const reference = JSON.parse(
  await readFile(path.join(REPO, 'data', 'food_reference.json'), 'utf8')
);
const knownRefs = new Set(reference.foods.map((f) => f.slug));

const index = JSON.parse(await readFile(path.join(LIB, 'index.json'), 'utf8'));
const files = (await readdir(LIB)).filter((f) => f.endsWith('.json') && f !== 'index.json');

check('index lists every cuisine file', index.files.length === files.length,
  `index has ${index.files.length}, directory has ${files.length}`);

const allSlugs = new Set();
let recipeCount = 0;

for (const file of files) {
  const doc = JSON.parse(await readFile(path.join(LIB, file), 'utf8'));
  check(`${file} declares a licence`, typeof doc.licence === 'string' && doc.licence.length > 20);
  check(`${file} has recipes`, Array.isArray(doc.recipes) && doc.recipes.length > 0);

  const listed = index.files.find((f) => f.path.endsWith(file));
  check(`${file} is in the index`, Boolean(listed));
  if (listed) {
    check(`${file} index count is right`, listed.count === doc.recipes.length,
      `index says ${listed.count}, file has ${doc.recipes.length}`);
  }

  for (const recipe of doc.recipes || []) {
    recipeCount += 1;
    const id = `${file}:${recipe.slug || '(no slug)'}`;

    check(`${id} has a slug`, Boolean(recipe.slug));
    check(`${id} slug is unique`, !allSlugs.has(recipe.slug), 'duplicate across the library');
    allSlugs.add(recipe.slug);

    check(`${id} has a name`, Boolean(recipe.name));
    check(`${id} has a cuisine`, Boolean(recipe.cuisine));
    check(`${id} budget_tier is valid`, TIERS.includes(recipe.budget_tier), recipe.budget_tier);
    check(`${id} default_slot is valid`, SLOTS.includes(recipe.default_slot), recipe.default_slot);
    check(`${id} serves a sensible number`,
      Number.isInteger(recipe.default_serves) && recipe.default_serves >= 1 && recipe.default_serves <= 12);
    check(`${id} dietary tags are all known`,
      (recipe.dietary_tags || []).every((t) => TAGS.includes(t)),
      (recipe.dietary_tags || []).join(','));

    // ---- Ingredients ----
    check(`${id} has ingredients`, Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0);
    const refSlugs = new Set();
    for (const ing of recipe.ingredients || []) {
      check(`${id} ingredient has a ref or a name`, Boolean(ing.ref || ing.name));
      check(`${id} unit "${ing.unit}" is valid`, UNITS.includes(ing.unit));
      check(`${id} quantity is a positive number`,
        Number.isFinite(Number(ing.quantity)) && Number(ing.quantity) > 0);
      if (ing.ref) {
        // A ref that is not in the reference file would create a bare,
        // macro-less food — quietly undoing Phase 13 one recipe at a time.
        check(`${id} ref "${ing.ref}" exists in the reference file`, knownRefs.has(ing.ref));
        refSlugs.add(ing.ref);
      }
    }

    // ---- Steps, against RECIPE_STEP_STYLE.md ----
    check(`${id} has steps`, Array.isArray(recipe.steps) && recipe.steps.length > 0,
      'a library row without a method is a shopping list with a name on it');

    for (const [i, step] of (recipe.steps || []).entries()) {
      const n = i + 1;
      const text = String(step.instruction || '');
      check(`${id} step ${n} has an instruction`, text.trim().length > 0);

      // Rule 6
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      check(`${id} step ${n} is within 20 words`, words <= 20, `${words} words`);

      // Rule 2
      check(`${id} step ${n} has no "meanwhile"`, !/\bmeanwhile\b/i.test(text));

      // Rule 11
      const banned = BANNED.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
      check(`${id} step ${n} has no shaming words`, banned.length === 0, banned.join(','));

      // Rule 3: a token must resolve, or it renders as a bare word mid-cook.
      for (const m of text.matchAll(/\{\{ing:([a-z0-9-]+)\}\}/gi)) {
        check(`${id} step ${n} token "${m[1]}" is an ingredient of this recipe`,
          refSlugs.has(m[1].toLowerCase()));
      }

      if (step.duration_min !== undefined) {
        check(`${id} step ${n} timer is sensible`,
          Number.isInteger(step.duration_min) && step.duration_min >= 1 && step.duration_min <= 1440);
      }
    }

    // A recipe with several ingredients and no tokens at all has almost
    // certainly not restated its quantities — rule 3 exists so nobody has
    // to scroll back mid-cook.
    const tokenCount = (recipe.steps || [])
      .reduce((n, s) => n + [...String(s.instruction || '').matchAll(/\{\{ing:/g)].length, 0);
    check(`${id} restates quantities in its steps`,
      recipe.ingredients.length < 3 || tokenCount >= 2,
      `${tokenCount} ingredient tokens across ${recipe.steps.length} steps`);
  }
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(`\nLIBRARY GATE FAILED — ${failures.length} of ${checks} checks`);
  process.exit(1);
}
console.log(`LIBRARY GATE PASSED — ${recipeCount} recipes, ${checks} checks`);
