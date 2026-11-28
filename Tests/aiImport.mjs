// Tests/aiImport.mjs — 28 Nov 2026 v1
// Gate 20. Phase 45: AI recipe import for Hearth (photo of a page, messy text).
//
// No network and no model. The function's pure parts (input checks, the
// request it would send, reading the answer, the Hearth rule, the count)
// and the app's interpretation (aiToDraft) are checked against invented
// answers, including bad ones. The handler is called with a stub fetch to
// prove the three checks come BEFORE any AI call, and that a check that
// cannot be made is a no.

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

let fn;
try {
  fn = await import(pathToFileURL(path.join(REPO, 'supabase/functions/ai-import-recipe/index.ts')).href);
} catch (err) {
  console.log(`  ✗ the AI Edge Function did not load under Node: ${err.message}`);
  process.exit(1);
}
const ai = await import(pathToFileURL(path.join(REPO, 'js/data/aiImport.js')).href);

// ---- 1. Input checks -------------------------------------------------------
const jpeg = { media_type: 'image/jpeg', data: 'QUJDRA==' };
check('a photo is fine', fn.checkInput({ kind: 'photo', images: [jpeg] }) === '');
check('two pages are fine', fn.checkInput({ kind: 'photo', images: [jpeg, jpeg] }) === '');
check('three photos are too many', fn.checkInput({ kind: 'photo', images: [jpeg, jpeg, jpeg] }) === 'too-many');
check('no photo', fn.checkInput({ kind: 'photo', images: [] }) === 'no-photo');
check('a GIF is not a photo', fn.checkInput({ kind: 'photo', images: [{ media_type: 'image/gif', data: 'QQ==' }] }) === 'not-a-photo');
check('not base64', fn.checkInput({ kind: 'photo', images: [{ media_type: 'image/png', data: '<script>' }] }) === 'not-a-photo');
check('too big', fn.checkInput({ kind: 'photo', images: [{ media_type: 'image/png', data: 'A'.repeat(fn.MAX_IMAGE_BYTES + 1) }] }) === 'too-big');
check('text is fine', fn.checkInput({ kind: 'text', text: 'Pancakes' }) === '');
check('empty text', fn.checkInput({ kind: 'text', text: '   ' }) === 'no-text');
check('too long', fn.checkInput({ kind: 'text', text: 'a'.repeat(fn.MAX_TEXT + 1) }) === 'too-long');
check('unknown kind', fn.checkInput({ kind: 'video' }) === 'bad-request');
check('app and function agree on photos', ai.MAX_PHOTOS === fn.MAX_IMAGES);
check('app and function agree on text', ai.MAX_TEXT === fn.MAX_TEXT);

// ---- 2. The request it would send -----------------------------------------
const req = fn.buildRequest({ kind: 'photo', images: [jpeg, jpeg] }, 'model-x');
check('model passed through', req.model === 'model-x');
check('tool is forced', req.tool_choice && req.tool_choice.name === 'save_recipe');
check('both pages sent', req.messages[0].content.filter((c) => c.type === 'image').length === 2);
check('instruction forbids copying the method', /do not copy the method/i.test(req.system));
check('instruction bans the banned words', ['simply', 'just', 'meanwhile'].every((w) => req.system.includes(w)));
check('instruction caps steps at 20 words', /20 words/.test(req.system));
check('instruction drops headnotes', /headnotes/i.test(req.system));
const treq = fn.buildRequest({ kind: 'text', text: 'Soup\n200g leeks' });
check('text goes in as text', treq.messages[0].content[0].type === 'text' && treq.messages[0].content[0].text.includes('200g leeks'));
check('schema units match the app', JSON.stringify(fn.UNITS) === JSON.stringify(['g', 'ml', 'tsp', 'tbsp', 'item']));

// ---- 3. Reading the answer ---------------------------------------------------
const answer = { name: 'Leek soup', is_recipe: true };
check('tool_use read', fn.readToolResult({ content: [{ type: 'tool_use', name: 'save_recipe', input: answer }] })?.name === 'Leek soup');
check('fenced JSON read', fn.readToolResult({ content: [{ type: 'text', text: '```json\n{"is_recipe":true,"name":"X"}\n```' }] })?.name === 'X');
check('prose is null', fn.readToolResult({ content: [{ type: 'text', text: 'Sorry, no.' }] }) === null);
check('nothing is null', fn.readToolResult(null) === null);
check('month start', fn.monthStart(new Date('2026-11-28T07:00:00Z')) === '2026-11-01T00:00:00.000Z');
check('hearth row', fn.rowIsHearth({ plan: 'hearth', hearth_until: null }));
check('lapsed hearth', !fn.rowIsHearth({ plan: 'hearth', hearth_until: '2020-01-01T00:00:00Z' }));
check('free row', !fn.rowIsHearth({ plan: 'free' }));
check('count from range', fn.countFromRange('0-0/12') === 12 && fn.countFromRange('*/0') === 0 && fn.countFromRange(null) === null);

// ---- 4. The handler: checks before any AI call --------------------------------
globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc', ANTHROPIC_API_KEY: 'key', AI_MONTHLY_LIMIT: '5' })[k] || '' } };
function stubFetch({ user = true, hearth = true, count = '0-0/2', countOk = true } = {}) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push(String(url));
    const u = String(url);
    const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
    if (u.endsWith('/auth/v1/user')) return user ? json({ id: 'u1' }) : json({}, 401);
    if (u.includes('/household_entitlements')) return json(hearth ? [{ household_id: 'h1', plan: 'hearth', hearth_until: null }] : [{ household_id: 'h1', plan: 'free' }]);
    if (u.includes('/ai_imports') && (!opts.method || opts.method === 'GET')) {
      return countOk ? json([], 206, { 'content-range': count }) : json({ code: '42P01' }, 404);
    }
    if (u.includes('/ai_imports')) return new Response(null, { status: 201 });
    if (u.includes('api.anthropic.com')) {
      return json({ content: [{ type: 'tool_use', name: 'save_recipe', input: { is_recipe: true, name: 'Leek soup', ingredients: [], steps: [] } }] });
    }
    return json({}, 404);
  };
  return calls;
}
const post = (body, auth = 'Bearer t') => new Request('https://fn.test', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json', origin: 'https://build-new-habits.github.io' }, body: JSON.stringify(body) });
const textBody = { kind: 'text', text: 'Leek soup, 2 leeks, 1 potato' };
const toAI = (calls) => calls.some((c) => c.includes('anthropic'));

let calls = stubFetch({ user: false });
let res = await (await fn.handle(post(textBody))).json();
check('signed out: refused', res.reason === 'signed-out');
check('signed out: no AI call', !toAI(calls));

calls = stubFetch({ hearth: false });
res = await (await fn.handle(post(textBody))).json();
check('Free: refused', res.reason === 'not-hearth');
check('Free: no AI call', !toAI(calls));

calls = stubFetch({ countOk: false });
res = await (await fn.handle(post(textBody))).json();
check('cannot count (before 031): unavailable', res.reason === 'unavailable');
check('cannot count: no AI call', !toAI(calls));

calls = stubFetch({ count: '0-0/5' });
res = await (await fn.handle(post(textBody))).json();
check('at the limit: refused', res.reason === 'limit' && res.limit === 5);
check('at the limit: no AI call', !toAI(calls));

calls = stubFetch({ count: '0-0/2' });
res = await (await fn.handle(post({ kind: 'text', text: '' }))).json();
check('bad input: refused', res.reason === 'no-text');
check('bad input: no AI call', !toAI(calls));

calls = stubFetch({ count: '0-0/2' });
res = await (await fn.handle(post(textBody))).json();
check('Hearth with room: read', res.ok && res.recipe.name === 'Leek soup', JSON.stringify(res));
check('left counts this one', res.left === 2, String(res.left));
check('the use is recorded', calls.filter((c) => c.endsWith('/rest/v1/ai_imports')).length === 1);

// ---- 5. The answer as a draft -------------------------------------------------
const good = ai.aiToDraft({
  is_recipe: true,
  name: 'Leek and potato soup',
  serves: 20,
  kind: 'lunch',
  course: 'starter',
  prep_minutes: 10,
  cook_minutes: '25',
  ingredients: [
    { name: 'leeks', quantity: 400, unit: 'g', said: '2 large' },
    { name: 'butter', quantity: 30, unit: 'g', swaps: [{ name: 'olive oil', quantity: 2, unit: 'tbsp', label: 'Vegan' }] },
    { name: 'stock', quantity: null, unit: 'ml', unsure: true },
    { name: '', quantity: 1, unit: 'g' },
    { name: 'salt', quantity: 1, unit: 'pinch' }
  ],
  steps: [
    { text: 'Simply melt the butter in a large pan.', minutes: 2 },
    { text: 'Add the leeks and cook gently for ten minutes until soft and sweet, stirring often; then add the potatoes and the stock and bring to the boil.', note: 'Just keep the heat low.' },
    { text: '' }
  ],
  check_first: ['The oven temperature is smudged']
}, { sourceUrl: '' });
check('good answer makes a draft', good.ok);
const d = good.draft;
check('serves capped at 12', d.serves === 12, String(d.serves));
check('kind and course kept', d.kind === 'lunch' && d.course === 'starter');
check('minutes read', d.prepMinutes === 10 && d.cookMinutes === 25);
check('nameless ingredient dropped', d.ingredients.length === 4, String(d.ingredients.length));
check('unknown unit falls back to g', d.ingredients[3].unit === 'g');
check('said kept', d.ingredients[0].said === '2 large');
check('swap kept with label', d.ingredients[1].swaps.length === 1 && d.ingredients[1].swaps[0].label === 'Vegan');
check('missing amount left empty', d.ingredients[2].quantity === '');
check('unsure listed to check', d.checkFirst.includes('How much stock'), JSON.stringify(d.checkFirst));
check('model notes listed', d.checkFirst.includes('The oven temperature is smudged'));
check('banned word out', !/\bsimply\b/i.test(d.steps[0].instruction) && d.steps[0].instruction.startsWith('Melt'), d.steps[0].instruction);
check('long step split', d.steps.length >= 3, d.steps.map((s) => s.instruction).join(' | '));
check('every step at most 20 words', d.steps.every((s) => s.instruction.split(/\s+/).length <= 20), d.steps.map((s) => s.instruction).join(' | '));
check('no step has a banned word', d.steps.every((s) => !/\b(simply|just|obviously|quickly|easy|easily|merely|meanwhile)\b/i.test(`${s.instruction} ${s.note || ''}`)));
check('note goes on the last part', d.steps[d.steps.length - 1].note === 'Keep the heat low.', JSON.stringify(d.steps.map((s) => s.note)));
check('read by AI marked', d.readByAi === true && d.imported === true);
check('empty source stays empty', d.sourceUrl === '');

const notRecipe = ai.aiToDraft({ is_recipe: false, not_a_recipe: 'a page of text with no ingredients.' });
check('not a recipe', !notRecipe.ok && notRecipe.reason === 'not-a-recipe');
check('says why', /no ingredients/.test(ai.aiProblem('not-a-recipe', notRecipe)));
check('empty answer', ai.aiToDraft({ is_recipe: true }).reason === 'empty');
check('garbage answer', ai.aiToDraft('nope').reason === 'empty');
check('html stripped', ai.aiToDraft({ is_recipe: true, name: '<b>Soup</b>' }).draft.name === 'Soup');
check('bad kind falls back', ai.aiToDraft({ is_recipe: true, name: 'X', kind: 'brunch' }).draft.kind === 'dinner');
check('photo sizes fit', JSON.stringify(ai.fitSize(4032, 3024)) === JSON.stringify({ width: 1568, height: 1176 }));
check('small photo kept', JSON.stringify(ai.fitSize(800, 600)) === JSON.stringify({ width: 800, height: 600 }));

// ---- 6. Every reason has a plain sentence -------------------------------------
for (const r of ['offline', 'not-hearth', 'limit', 'not-a-recipe', 'empty', 'unreadable', 'too-big', 'too-many', 'not-a-photo', 'too-long', 'busy', 'timeout', 'signed-out', 'unavailable', 'failed']) {
  const s = ai.aiProblem(r, { limit: 60 });
  check(`a sentence for ${r}`, typeof s === 'string' && s.length > 20 && !/\b(simply|just|easy|easily|error)\b/i.test(s), s);
}

// ---- 7. Offline: no call ----------------------------------------------------------
const offline = await ai.readWithAi({ text: '' });
check('empty text is not sent', !offline.ok && offline.reason === 'empty');

console.log(`  ${checks} checks`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('  ✓ AI import: Hearth, fair use and sign-in come before any AI call; answers held to the house style');
