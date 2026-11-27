// Tests/mealCoach.mjs — 27 Nov 2026 v1
// Gate 19. Phase 39: Help me choose. Run against the REAL library (every
// shipped recipe, real calories from food_reference.json), because a coach
// is only as good as what it reads off 600 recipes.
//
// Proves: every answer narrows or keeps, never widens; every choice's count
// is exactly what choosing it leaves; Any is the whole set; the coach names a
// question that actually splits what is left; loosening always brings some
// back; the table's diet and nut free hold; same answers, same order; the
// answers survive the URL; the copy is plain, with no shame words.

import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};
const store = new Map();
globalThis.localStorage = globalThis.localStorage || { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const coach = await import(pathToFileURL(path.join(REPO, 'js/data/mealCoach.js')).href);
const shaper = await import(pathToFileURL(path.join(REPO, 'js/data/weekShaper.js')).href);

// ---- The real library ----------------------------------------------------------
const refDoc = JSON.parse(readFileSync(path.join(REPO, 'data/food_reference.json'), 'utf8'));
const referenceMap = new Map(refDoc.foods.map((f) => [f.slug, f]));
const dir = path.join(REPO, 'data/recipe_library');
const recipes = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'sources.json')) {
  const doc = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  recipes.push(...(Array.isArray(doc) ? doc : doc.recipes));
}
// Two meals of yours: one copied from the library and a favourite, one typed.
const puttanesca = recipes.find((r) => r.slug === 'spaghetti-puttanesca');
const meals = [
  { id: 'm1', name: 'Spaghetti puttanesca', library_ref: 'spaghetti-puttanesca', is_favourite: true, default_slot: 'dinner' },
  { id: 'm2', name: 'Nan\'s cheese and potato pie', default_slot: 'dinner', dietary_tags: ['vegetarian'] }
];
const candidates = shaper.prepare({ meals, recipes, referenceMap, haveSet: new Set(['spaghetti dry', 'capers']), soonSet: new Set(['capers']) });
const recentKeys = new Set(['recipe:thai-green-curry']);
const facts = coach.markRecent(candidates.map(coach.factsOf), recentKeys);
check('every recipe and meal is read', facts.length === recipes.length - 1 + meals.length, `${facts.length}`);
check('the library is large enough to need a coach', facts.length >= 500, `${facts.length}`);
check('prepare now carries kcal for most library recipes', facts.filter((f) => f.kcal !== null).length > facts.length * 0.8);
check('prepare carries cuisine', facts.filter((f) => f.c.cuisine).length > facts.length * 0.9);

const members = [
  { display_name: 'Graeme', dietary_tags: ['vegetarian'] },
  { display_name: 'Partner', dietary_tags: [] },
  { display_name: 'Child', dietary_tags: [] },
  { display_name: 'Child', dietary_tags: [] }
];
const table = coach.tableTest(members);
const open = () => true;

// 1. Any is everything; the table's diet narrows when Suits everyone is on.
const blank = coach.blankAnswers();
check('no answers, no table: everything', coach.filterFacts(facts, blank, open).length === facts.length);
const veggieTable = coach.filterFacts(facts, blank, table);
check('Suits everyone keeps a vegetarian at the table', veggieTable.length > 100 && veggieTable.every((f) => f.diet.has('vegetarian')));
check('turning it off lets everything back', coach.filterFacts(facts, { ...blank, everyone: false }, table).length === facts.length);

// 2. Counts on every choice are exactly what choosing it leaves; never widen.
const answerSets = [
  blank,
  { ...blank, for: 'dinner' },
  { ...blank, for: 'dinner', time: '30' },
  { ...blank, for: 'dinner', feel: 'spicy', everyone: false },
  { ...blank, kind: 'christmas', for: 'pudding' },
  { ...blank, with: 'chicken', from: 'southasia', everyone: false },
  { ...blank, for: 'breakfast', feel: 'protein' }
];
for (const a of answerSets) {
  const now = coach.filterFacts(facts, a, table).length;
  for (const q of coach.QUESTIONS) {
    const counts = coach.countsFor(facts, a, q.id, table);
    if (a[q.id] !== 'any') check(`count on the chosen ${q.id} is the total (${coach.toQuery(a)})`, counts[a[q.id]] === now, `${counts[a[q.id]]} vs ${now}`);
    else check(`Any on ${q.id} is the total (${coach.toQuery(a)})`, counts.any === now);
    for (const c of q.choices) {
      const exact = coach.filterFacts(facts, { ...a, [q.id]: c.value }, table).length;
      check(`count for ${q.id}=${c.value} (${coach.toQuery(a) || 'none'})`, counts[c.value] === exact, `${counts[c.value]} vs ${exact}`);
      if (a[q.id] === 'any') check(`choosing ${q.id}=${c.value} never widens`, exact <= now);
    }
  }
}

// 3. Every choice of every question finds at least one recipe in the library.
for (const q of coach.QUESTIONS) {
  for (const c of q.choices) {
    if (q.id === 'pantry' || q.id === 'new') continue; // these depend on the household
    const n = coach.filterFacts(facts, { ...blank, everyone: false, [q.id]: c.value }, table).length;
    check(`the library has something for ${q.id}: ${c.label}`, n > 0, String(n));
  }
}

// 4. What a recipe is: spot checks against real recipes.
const fact = (slug) => facts.find((f) => f.c.recipe && f.c.recipe.slug === slug && !f.c.meal);
const byName = (re) => facts.filter((f) => re.test(f.c.name));
const thai = byName(/thai green/i)[0];
check('a Thai green curry is spicy and South East Asian', thai && thai.feel.has('spicy') && (thai.from === 'seasia' || thai.kind === 'christmas'), thai && `${[...thai.feel]} ${thai.from}`);
const put = facts.find((f) => f.c.meal && f.c.meal.id === 'm1');
check('your copy of puttanesca stands in for the library one', put && !fact('spaghetti-puttanesca'));
check('puttanesca is made with pasta and fish (anchovies), Italian', put && put.with.has('pasta') && put.with.has('fish') && put.from === 'europe', put && [...put.with].join(','));
check('puttanesca is a favourite, so it is yours', put && put.mine);
check('a favourite never counts as something new', !coach.fits(put, 'new', 'new') && coach.fits(put, 'new', 'mine'));
check('stock is flavouring, not a main ingredient', !facts.filter((f) => (f.c.ingredients || []).some((i) => i.ref === 'stock-chicken')).some((f) => f.with.has('chicken') && !(f.c.ingredients || []).some((i) => /chicken/.test(i.ref) && i.ref !== 'stock-chicken') && !/chicken/i.test(f.c.name)));
check('green beans are not "beans"', !facts.some((f) => f.with.has('beans') && (f.c.ingredients || []).every((i) => !/(beans-tinned|baked-beans|black-beans|butter-beans|kidney|cannellini|lentils|chickpeas|edamame|hummus)/.test(i.ref)) && !/(dahl|dal|hummus|bean|lentil|chickpea)/i.test(f.c.name)));
const sides = facts.filter((f) => f.c.recipe && f.c.recipe.side === true);
check('a side is For: A side, never Dinner', sides.length > 10 && sides.every((f) => f.for === 'side'));
check('Christmas recipes read as Christmas', facts.filter((f) => f.kind === 'christmas').length >= 200);
for (const k of ['spring', 'summer', 'autumn', 'winter', 'easter', 'birthday', 'halloween', 'bbq', 'outdoor']) {
  check(`${k} recipes read as ${k}`, facts.filter((f) => f.kind === k).length >= 30);
}
check('light and hearty never both', !facts.some((f) => f.feel.has('light') && f.feel.has('hearty')));
check('spicy and mild never both, always one', facts.every((f) => f.feel.has('spicy') !== f.feel.has('mild')));
check('light needs complete calories', facts.filter((f) => f.feel.has('light')).every((f) => f.kcal !== null && f.kcal <= 450));
check('a recipe with no time is never called quick', (() => {
  const own = facts.find((f) => f.c.meal && f.c.meal.id === 'm2');
  return own && own.minutes === null && coach.reasonsFor(own, { ...blank, time: '15' }).includes('No time given');
})());

// 5. Nut free always holds, even with Suits everyone off.
const nutTable = coach.tableTest([{ dietary_tags: ['nut_free'] }, { dietary_tags: [] }]);
const nutsLeft = coach.filterFacts(facts, { ...blank, everyone: false }, nutTable);
check('nut free excludes nuts with everyone off', nutsLeft.length < facts.length && nutsLeft.every((f) => !(f.c.ingredients || []).some((i) => /(almond|cashew|walnut|pistachio|hazelnut|pecan|peanut)/.test(i.ref))));

// 6. The coach line and the next question.
const dinners = coach.filterFacts(facts, { ...blank, for: 'dinner' }, table);
const next = coach.nextQuestion(dinners, { ...blank, for: 'dinner' });
check('with many dinners left, the coach names a question', next && next.id !== 'for', next && next.id);
if (next) {
  const spread = next.choices.map((c) => dinners.filter((f) => coach.fits(f, next.id, c.value)).length).filter((n) => n > 0);
  check('the question it names splits what is left', spread.length >= 2 && Math.max(...spread) < dinners.length, spread.join(','));
}
check('same answers, same question', coach.nextQuestion([...dinners].reverse(), { ...blank, for: 'dinner' }) === next);
check('a short list needs no next question', coach.nextQuestion(dinners.slice(0, 8), { ...blank, for: 'dinner' }) === null);
check('no answers: the line says every question is optional', /optional/.test(coach.coachLine(facts, blank, { total: facts.length })));
check('the line counts', coach.coachLine(dinners, { ...blank, for: 'dinner' }).startsWith(`${dinners.length} recipes fit`));

// 7. Loosening: an over-narrow set always says what to change, and the gain is real.
const narrow = { ...blank, for: 'breakfast', time: '15', with: 'lamb', from: 'africa' };
const none = coach.filterFacts(facts, narrow, table);
check('these answers leave nothing', none.length === 0);
const ideas = coach.loosen(facts, narrow, table);
check('loosen offers something', ideas.length > 0);
for (const idea of ideas) {
  const next2 = coach.applyLoosen(narrow, idea);
  check(`loosening ${idea.id} brings back exactly ${idea.total}`, coach.filterFacts(facts, next2, table).length === idea.total && idea.gain > 0);
}
check('loosen is sorted by what it brings back', ideas.every((x, i) => i === 0 || ideas[i - 1].gain >= x.gain));

// 8. Ranking: deterministic, favourites first, something new means new.
const r1 = coach.rankFacts(dinners, { ...blank, for: 'dinner' }).map((r) => r.f.c.key);
const r2 = coach.rankFacts([...dinners].reverse(), { ...blank, for: 'dinner' }).map((r) => r.f.c.key);
check('same answers, same order', JSON.stringify(r1) === JSON.stringify(r2));
const pastaDinners = coach.filterFacts(facts, { ...blank, for: 'dinner', with: 'pasta', everyone: false }, table);
const ranked = coach.rankFacts(pastaDinners, { ...blank, for: 'dinner', with: 'pasta', everyone: false });
check('a favourite leads', ranked[0] && ranked[0].f.c.key === 'meal:m1', ranked[0] && ranked[0].f.c.key);
check('its chips say why', ranked[0] && ranked[0].reasons.includes('A favourite') && ranked[0].reasons.includes('Pasta or noodles'), ranked[0] && ranked[0].reasons.join(' | '));
const fresh = coach.filterFacts(facts, { ...blank, new: 'new', everyone: false }, table);
check('something new leaves out your meals and the last fortnight', fresh.every((f) => !f.mine && !f.recent) && !fresh.some((f) => f.c.key === 'recipe:thai-green-curry'));
check('pages of five', coach.page(ranked, 0).length === Math.min(5, ranked.length) && coach.page(ranked, 1)[0] === ranked[5]);

// 9. Answers survive the URL; odd values are Any.
const a = { ...blank, for: 'dinner', time: '30', feel: 'spicy', everyone: false };
const q = coach.toQuery(a);
check('to the query and back', JSON.stringify(coach.fromQuery(`#/meal-coach-results?${q}`)) === JSON.stringify(coach.normaliseAnswers(a)), q);
check('Any is left out of the URL', !/any/.test(q) && q.includes('everyone=0'));
const odd = coach.fromQuery('for=elevenses&time=5&feel=%E0%A4%A&new=new');
check('odd values fall back to Any', odd.for === 'any' && odd.time === 'any' && odd.feel === 'any' && odd.new === 'new' && odd.everyone === true);
check('blank query is blank answers', coach.answeredCount(coach.fromQuery('')) === 0);

// 10. Plain words, no shame.
const BANNED = /\b(missed|failed|fail|behind|should|must|bad|naughty|cheat|guilty|wrong)\b|!/i;
const copy = [
  ...coach.QUESTIONS.flatMap((x) => [x.label, ...x.choices.map((c) => c.label)]),
  coach.coachLine([], narrow), coach.coachLine(dinners, { ...blank, for: 'dinner' }), coach.coachLine(dinners.slice(0, 3), { ...blank, for: 'dinner' }),
  coach.coachLine(facts, blank, { total: facts.length }),
  ...ideas.map((i) => i.label), ...ranked.slice(0, 20).flatMap((r) => r.reasons),
  ...coach.describeAnswers(a)
];
for (const line of copy) check(`plain copy: "${line}"`, !BANNED.test(line));

console.log(`  ${checks} checks · ${facts.length} recipes and meals`);
if (failures.length) { for (const x of failures.slice(0, 40)) console.log(`  ✗ ${x}`); console.log(`  ${failures.length} failed`); process.exit(1); }
console.log('  ✓ help me choose: counts are exact, the coach narrows and loosens, same answers, same list');
