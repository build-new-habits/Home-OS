// Tests/import.mjs — 24 Nov 2026 v2
// v2 (Phase 34): kitchen measures to grams, matching ingredient lines to
// foods without asking, the Meals tab's Recently added, and the copy of the
// two new screens.
// Gate 12. Phase 33: a recipe shared in from somewhere else.
//
// The Edge Function extracts; js/data/recipeImport.js interprets. Both are
// checked here end to end against invented pages in Tests/fixtures/import:
// page HTML → extractRecipes → pickRecipe → jsonLdToDraft. Then pasted
// captions, the share-link reading, the social-host list (which must agree
// between the function and the app), and the function's address guard.
//
// No network. The function's handler is never called here; its pure parts
// are imported directly (Node strips the TypeScript annotations).

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};

const failures = [];
let checks = 0;
function check(label, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

const imp = await import(pathToFileURL(path.join(REPO, 'js/data/recipeImport.js')).href);
let fn;
try {
  fn = await import(pathToFileURL(path.join(REPO, 'supabase/functions/import-recipe/index.ts')).href);
} catch (err) {
  console.log(`  ✗ the Edge Function did not load under Node: ${err.message}`);
  console.log('    It must stay JavaScript-compatible TypeScript (erasable annotations only).');
  process.exit(1);
}

// ---- 1. Fixtures, page to draft ------------------------------------------
const FIX = path.join(REPO, 'Tests/fixtures/import');
const pages = readdirSync(FIX).filter((f) => f.endsWith('.html')).sort();
check('at least 8 page fixtures', pages.length >= 8, `${pages.length}`);

for (const page of pages) {
  const html = readFileSync(path.join(FIX, page), 'utf8');
  const want = JSON.parse(readFileSync(path.join(FIX, page.replace(/\.html$/, '.json')), 'utf8'));
  const recipes = fn.extractRecipes(html);
  const recipe = imp.pickRecipe(recipes);
  const siteName = fn.siteNameFrom(html, recipe, 'www.example.test');
  const draft = recipe && imp.jsonLdToDraft(recipe, { sourceUrl: 'https://www.example.test/r/1', siteName });

  if (want.none) {
    check(`${page}: no recipe found`, !draft, draft ? draft.name : '');
    continue;
  }
  if (!draft) { check(`${page}: produces a draft`, false); continue; }
  const counts = imp.draftCounts(draft);
  check(`${page}: name`, draft.name === want.name, `got "${draft.name}"`);
  check(`${page}: serves`, draft.serves === want.serves, `got ${draft.serves}`);
  if ('kind' in want) check(`${page}: kind`, (want.kind || 'dinner') === draft.kind, `got ${draft.kind}`);
  check(`${page}: ingredient count`, counts.ingredients === want.ingredients, `got ${counts.ingredients}`);
  check(`${page}: step count`, counts.steps === want.steps, `got ${counts.steps}`);
  if (want.siteName) check(`${page}: site name`, siteName === want.siteName, `got "${siteName}"`);
  if (want.prep) check(`${page}: prep minutes`, draft.prepMinutes === want.prep, `got ${draft.prepMinutes}`);
  if (want.cook) check(`${page}: cook minutes`, draft.cookMinutes === want.cook, `got ${draft.cookMinutes}`);
  for (const [name, qty, unit] of want.lines || []) {
    const row = draft.ingredients.find((r) => r.name === name);
    check(`${page}: ingredient "${name}"`, row && Number(row.quantity) === qty && row.unit === unit,
      row ? `got ${row.quantity} ${row.unit}` : `names: ${draft.ingredients.map((r) => r.name).join(' | ')}`);
  }
  for (const [i, text] of want.stepContains || []) {
    const step = draft.steps[i];
    check(`${page}: step ${i + 1} reads "${text}"`, step && step.instruction.includes(text), step ? step.instruction : 'missing');
  }
  check(`${page}: source kept`, draft.sourceUrl === 'https://www.example.test/r/1');
  check(`${page}: no HTML left in steps`, draft.steps.every((s) => !/[<>]/.test(s.instruction)));
  check(`${page}: marked imported`, draft.imported === true);
}

// ---- 2. Pasted captions -----------------------------------------------------
const captions = [
  {
    label: 'headed caption',
    text: 'Easy Garlic Noodles 🍜\nSo good on a weeknight!\n\nIngredients:\n• 200g noodles\n• 3 garlic cloves, crushed\n• 2 tbsp soy sauce\n\nMethod:\n1. Cook the noodles.\n2. Fry the garlic for 1 minute.\n3. Toss everything together.\n#noodles #dinner',
    name: 'Easy Garlic Noodles', ingredients: 3, steps: 3
  },
  {
    label: 'unheaded caption',
    text: 'Quick Beans on Toast\n1 tin baked beans\n2 slices bread\nToast the bread.\nWarm the beans.',
    name: 'Quick Beans on Toast', ingredients: 2, steps: 2
  },
  {
    label: 'emoji bullets',
    text: 'Berry Smoothie\n🫐 150g blueberries\n🍌 1 banana\n🥛 200ml milk\n➡️ Blend until smooth.',
    name: 'Berry Smoothie', ingredients: 3, steps: 1
  },
  {
    label: 'numbered steps under "Directions"',
    text: 'Simple Omelette\nIngredients\n2 eggs\n10g butter\nDirections\nStep 1: Beat the eggs.\nStep 2: Melt the butter.\nStep 3: Cook for 2 minutes.',
    name: 'Simple Omelette', ingredients: 2, steps: 3
  },
  {
    label: 'one long paragraph',
    text: 'Grandma soup is the best thing ever, you take whatever is in the fridge and cook it slowly for an hour.',
    name: 'Grandma soup is the best thing ever, you take whatever is in the fridge and cook it slowly for an hour.', ingredients: 0, steps: 0
  }
];
for (const c of captions) {
  const draft = imp.textToDraft(c.text);
  if (!draft) { check(`${c.label}: produces a draft`, false); continue; }
  const counts = imp.draftCounts(draft);
  check(`${c.label}: name`, draft.name === c.name.slice(0, 80), `got "${draft.name}"`);
  check(`${c.label}: ingredients`, counts.ingredients === c.ingredients, `got ${counts.ingredients}: ${draft.ingredients.map((r) => r.name).join(' | ')}`);
  check(`${c.label}: steps`, counts.steps === c.steps, `got ${counts.steps}: ${draft.steps.map((s) => s.instruction).join(' | ')}`);
}
check('empty paste gives no draft', imp.textToDraft('   \n  ') === null);

// ---- 3. Reading a share ----------------------------------------------------
const shares = [
  [{ url: 'https://a.test/x' }, 'https://a.test/x'],
  [{ text: 'Look at this https://b.test/recipe/pie. Yum' }, 'https://b.test/recipe/pie'],
  [{ title: 'https://c.test/y', text: 'no link here' }, 'https://c.test/y'],
  [{ text: 'nothing to see', title: 'still nothing' }, ''],
  [{ url: 'javascript:alert(1)', text: '' }, '']
];
for (const [params, want] of shares) {
  check(`extractUrl ${JSON.stringify(params)}`, imp.extractUrl(params) === want, `got "${imp.extractUrl(params)}"`);
}

// ---- 4. Social hosts: the function and the app must agree ------------------
check('social host lists are identical in the function and the app',
  JSON.stringify(fn.SOCIAL_HOSTS) === JSON.stringify(imp.SOCIAL_HOSTS));
for (const h of ['www.instagram.com', 'm.facebook.com', 'vm.tiktok.com', 'youtu.be', 'uk.pinterest.com', 'pinterest.co.uk', 'x.com']) {
  check(`social: ${h}`, imp.isSocialHost(h) && fn.isSocialHost(h));
}
for (const h of ['www.bbcgoodfood.com', 'example.com', 'notinstagram.com', 'box.com']) {
  check(`not social: ${h}`, !imp.isSocialHost(h) && !fn.isSocialHost(h));
}

// ---- 5. The function's address guard ---------------------------------------
const guard = [
  ['https://www.example.com/recipe', ''],
  ['http://example.com/', ''],
  ['https://localhost/x', 'blocked'],
  ['http://127.0.0.1:54321/', 'blocked'],
  ['http://10.1.2.3/', 'blocked'],
  ['http://169.254.169.254/latest/meta-data', 'blocked'],
  ['http://192.168.0.1/', 'blocked'],
  ['http://[::1]/', 'blocked'],
  ['http://[::ffff:10.0.0.1]/', 'blocked'],
  ['http://db.internal/', 'blocked'],
  ['ftp://example.com/', 'bad-url'],
  ['https://user:pw@example.com/', 'bad-url'],
  ['https://www.instagram.com/p/abc', 'social']
];
for (const [url, want] of guard) {
  check(`checkUrl ${url}`, fn.checkUrl(url) === want, `got "${fn.checkUrl(url)}"`);
}

// ---- 6. Small readers --------------------------------------------------------
check('isoMinutes PT1H30M', imp.isoMinutes('PT1H30M') === 90);
check('isoMinutes PT45M', imp.isoMinutes('PT45M') === 45);
check('isoMinutes nonsense', imp.isoMinutes('45 mins') === '');
check('servesFrom "Makes 24"', imp.servesFrom('Makes 24') === 24);
check('servesFrom nothing → 4', imp.servesFrom(undefined) === 4);
check('kindFrom never invents', imp.kindFrom('Italian') === '');

// ---- 7. No-shame copy in the new screens ------------------------------------
for (const file of ['recipeImport.js', 'recipeCheck.js', 'mealsHome.js']) {
  const view = readFileSync(path.join(REPO, 'js/views', file), 'utf8');
  const strings = [...view.matchAll(/(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s));
  for (const word of ['simply', 'just', 'obviously', 'quickly', 'easy', 'easily', 'merely', 'failed', 'error']) {
    const hit = strings.find((s) => new RegExp(`\\b${word}\\b`, 'i').test(s));
    check(`${file} copy avoids "${word}"`, !hit, hit);
  }
}

// ---- 8. Kitchen measures (Phase 34) -----------------------------------------
const own = await import(pathToFileURL(path.join(REPO, 'js/data/ownRecipe.js')).href);
const measures = [
  ['1 cup plain flour', 125, 'g', 'plain flour'],
  ['1/2 cup sugar', 100, 'g', 'sugar'],
  ['2 cups whole milk', 480, 'ml', 'whole milk'],
  ['a handful of fresh basil', 15, 'g', 'fresh basil'],
  ['a handful of almonds', 30, 'g', 'almonds'],
  ['1 tin coconut milk', 400, 'g', 'coconut milk'],
  ['1 small bunch coriander', 30, 'g', 'coriander'],
  ['a small knob of butter', 10, 'g', 'butter'],
  ['1 knob of ginger', 15, 'g', 'ginger'],
  ['8oz mushrooms', 225, 'g', 'mushrooms'],
  ['1 lb ground beef', 455, 'g', 'ground beef'],
  ['1 pint stock', 570, 'ml', 'stock'],
  ['8 fl oz double cream', 225, 'ml', 'double cream'],
  ['1 cup peanut butter', 250, 'g', 'peanut butter'],
  ['1 cup mystery powder', 240, 'ml', 'mystery powder'],
  ['2 garlic cloves', 2, 'item', 'garlic cloves'],
  ['2 tbsp olive oil', 2, 'tbsp', 'olive oil'],
  ['200g rice', 200, 'g', 'rice']
];
for (const [line, qty, unit, name] of measures) {
  const p = own.parseIngredientLine(line);
  check(`measure "${line}"`, p && Number(p.quantity) === qty && p.unit === unit && p.name === name,
    p ? `got ${p.quantity} ${p.unit} "${p.name}"` : 'null');
}

// ---- 9. Matching without asking (Phase 34) -----------------------------------
const reference = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8')).foods;
const index = own.buildNameIndex(reference, []);
const matches = [
  ['large onion', 'Onion, large'],
  ['garlic cloves, crushed', 'Garlic clove'],
  ['carrots, peeled and diced', 'Carrot, medium'],
  ['extra virgin olive oil', 'Olive oil'],
  ['medium potatoes', 'Potato, medium'],
  ['eggs', 'Egg, medium'],
  ['ground beef', null],
  ['cilantro', null],
  ['spring onions, sliced', 'Spring onion']
];
for (const [name, want] of matches) {
  const hit = own.resolveName(name, index);
  check(`matches "${name}"`, hit && (want === null || hit.entry.name === want), hit ? hit.entry.name : 'nothing');
}
const im = await import(pathToFileURL(path.join(REPO, 'js/data/ingredientMatch.js')).href);
const table = [{ code: 'T1', name: 'Lentils, red, split, dried, raw', source: 'uk', words: ['lentil', 'red', 'split', 'dried', 'raw'], calories_per_100g: 318, protein_g: 23.8, fat_g: 1.3, carbs_g: 56.3 }];
const tidx = own.buildNameIndex([], []);
const auto = await im.autoMatch(['red split lentils', 'salt and pepper', 'unicorn dust'], tidx, own.resolveName, { foods: table });
check('table match found', auto.matched.includes('red split lentils'), JSON.stringify(auto));
check('"salt and pepper" is not guessed', auto.unmatched.includes('salt and pepper'));
check('no match is not invented', auto.unmatched.includes('unicorn dust'));
check('table match resolves afterwards', own.resolveName('red split lentils', tidx)?.entry.calories_per_100g === 318);

// ---- 10. Meals tab (Phase 34) ------------------------------------------------
const home = await import(pathToFileURL(path.join(REPO, 'js/views/mealsHome.js')).href);
const rows = home.recentlyAdded([
  { id: 'a', name: 'Old stew', created_at: '2026-01-01T00:00:00Z' },
  { id: 'b', name: 'Pie', created_at: '2026-11-24T10:00:00Z', source_url: 'https://x.test', source: 'Pie Site' },
  { id: 'c', name: 'Library curry', created_at: '2026-06-01T00:00:00Z', library_ref: 'curry' }
], [{ id: 'l1', name: 'Phone soup', savedAt: '2026-11-20T00:00:00Z', draft: {} }]);
check('recently added is newest first', rows.map((r) => r.name).join(',') === 'Pie,Phone soup,Library curry,Old stew', rows.map((r) => r.name).join(','));
check('imported says where from', rows[0].origin === 'Imported from Pie Site', rows[0].origin);

console.log(`  ${checks} checks`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('  ✓ import: pages, captions, shares, hosts and the address guard all behave');
