// Tests/weekShaper.mjs — 27 Nov 2026 v1
// Gate 16. Phase 37: Week Shaper. Rules, not AI. Graeme's own week: fish 2,
// meat 1, a match on Sunday, the gym on Thursday, four at home, one
// vegetarian. Same inputs give the same list, every time.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};
const store = new Map();
globalThis.localStorage = globalThis.localStorage || { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const w = await import(pathToFileURL(path.join(REPO, 'js/data/weekShaper.js')).href);

// ---- Candidates, as prepare() makes them ----------------------------------------
let n = 0;
function make(name, { kind = 'veggie', lead = null, minutes = 25, veg = false, own = false, favourite = false, have = 0, total = 6, soon = [], nuts = false, budget = 'everyday', serves = 4 } = {}) {
  n += 1;
  return {
    key: `meal:${n}`, name, meal: { id: String(n) }, recipe: null, own, favourite,
    slot: 'dinner', course: 'main', budget, serves,
    dietary_tags: veg ? ['vegetarian'] : [], ingredients: nuts ? [{ ref: 'cashew-nuts' }] : [],
    nuts, kind, minutes, lead, have, total, missing: [], usesSoon: soon
  };
}

const pool = [
  make('Salmon pasta bake', { kind: 'fish', lead: ['carb'] }),
  make('Fish pie', { kind: 'fish', lead: ['protein'] }),
  make('Cod and chips', { kind: 'fish', lead: ['carb'] }),
  make('Chicken traybake', { kind: 'meat', lead: ['protein'] }),
  make('Beef chilli', { kind: 'meat', lead: ['protein'] }),
  make('Spaghetti bolognese', { kind: 'meat', lead: ['carb'] }),
  make('Tomato risotto', { veg: true, lead: ['carb'] }),
  make('Veggie lasagne', { veg: true, lead: ['carb'] }),
  make('Jacket potatoes', { veg: true, lead: ['carb'] }),
  make('Mushroom pasta', { veg: true, lead: ['carb'] }),
  make('Bean burritos', { veg: true, lead: ['carb'] }),
  make('Vegetable couscous', { veg: true, lead: ['carb'] }),
  make('Halloumi skewers', { veg: true, lead: ['protein'] }),
  make('Tofu stir fry', { veg: true, lead: ['protein'] }),
  make('Lentil dahl', { veg: true, lead: ['protein'] }),
  make('Paneer curry', { veg: true, lead: ['protein'] }),
  make('Egg shakshuka', { veg: true, lead: ['protein'] }),
  make('Chickpea stew', { veg: true, lead: ['protein'] }),
  make('Leek soup', { veg: true, lead: null }),
  make('Cashew stir fry', { veg: true, lead: ['protein'], nuts: true }),
  make('Slow roast', { veg: true, lead: null, minutes: 180 }),
  make('Mystery bake', { veg: true, lead: null, minutes: null })
];
const byName = (name) => pool.find((c) => c.name === name);

const members = [
  { display_name: 'Graeme', dietary_tags: [] },
  { display_name: 'Partner', dietary_tags: [] },
  { display_name: 'Child one', dietary_tags: ['vegetarian'] },
  { display_name: 'Child two', dietary_tags: [] }
];
const rules = { fish: 2, meat: 1, everyone: true };
// Week of Monday 23 Nov 2026. Gym Thursday 26th, match Sunday 29th.
const events = { '2026-11-26': ['gym'], '2026-11-29': ['match'] };

// 1. Saturday before the match: carb-led, vegetarian, five of them.
const sat = w.options(w.rank({ candidates: pool, date: '2026-11-28', slot: 'dinner', rules, events, members }));
check('Saturday gives five', sat.length === 5, String(sat.length));
check('Saturday top five are all carb-led', sat.every((s) => s.c.lead && s.c.lead.includes('carb')), sat.map((s) => s.c.name).join(', '));
check('Saturday says why', sat[0].reasons[0] === 'Carb-led for energy before the match', sat[0].reasons.join(' | '));

// 2. Thursday, the gym: protein-led.
const thu = w.options(w.rank({ candidates: pool, date: '2026-11-26', slot: 'dinner', rules, events, members }));
check('Thursday top five are all protein-led', thu.every((s) => s.c.lead && s.c.lead.includes('protein')), thu.map((s) => s.c.name).join(', '));
check('Friday breakfast after the gym is shaped too', w.shapesFor('2026-11-27', 'breakfast', events).some((s) => s.want === 'protein'));
check('Sunday lunch on match day is familiar', w.shapesFor('2026-11-29', 'lunch', events).some((s) => s.want === 'familiar'));

// 3. Everyone eats, with a vegetarian at home: no meat, no fish, ever.
for (const date of ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']) {
  const all = w.rank({ candidates: pool, date, slot: 'dinner', rules, events, members });
  check(`${date}: nothing with meat or fish for the vegetarian`, all.every((s) => s.c.kind === 'veggie'), all.filter((s) => s.c.kind !== 'veggie').map((s) => s.c.name).join(', '));
}
// Everyone eats off: meat and fish come back, scored lower for not suiting all.
const loose = w.rank({ candidates: pool, date: '2026-11-24', slot: 'dinner', rules: { ...rules, everyone: false }, events, members });
check('everyone off: fish and meat can be offered', loose.some((s) => s.c.kind !== 'veggie'));

// 4. Fish twice before a third.
const adults = members.filter((m) => !m.dietary_tags.length);
const twoFish = [
  { id: 'e1', slot: 'dinner', day_of_week: 'mon', week_start: '2026-11-23', meal_id: byName('Fish pie').meal.id },
  { id: 'e2', slot: 'dinner', day_of_week: 'tue', week_start: '2026-11-23', meal_id: byName('Cod and chips').meal.id }
];
const oneFish = twoFish.slice(0, 1);
const before = w.options(w.rank({ candidates: pool, date: '2026-11-25', rules, events: {}, members: adults, entries: oneFish }));
check('with 1 of 2 fish, fish is in the top five', before.some((s) => s.c.kind === 'fish'), before.map((s) => s.c.name).join(', '));
check('fish says which night', before.find((s) => s.c.kind === 'fish').reasons.includes('Fish night 2 of 2'));
const after = w.options(w.rank({ candidates: pool, date: '2026-11-25', rules, events: {}, members: adults, entries: twoFish }));
check('with 2 of 2 fish, no third fish in the top five', after.every((s) => s.c.kind !== 'fish'), after.map((s) => s.c.name).join(', '));
check('nothing planned twice', !after.some((s) => s.c.name === 'Fish pie'));
const counts = w.tally(twoFish, pool);
check('tally counts fish', counts.fish === 2 && counts.planned === 2);
check('tally words are facts', JSON.stringify(w.describeTally(counts, rules)) === JSON.stringify(['Fish: 2 of 2', 'Meat: 0 of 1', 'Veggie: 0']));

// 5. Same inputs, same list, whatever order they arrive in.
const once = JSON.stringify(w.rank({ candidates: pool, date: '2026-11-28', rules, events, members }).map((s) => s.c.key));
const twice = JSON.stringify(w.rank({ candidates: [...pool].reverse(), date: '2026-11-28', rules, events, members }).map((s) => s.c.key));
check('deterministic, order-free', once === twice);

// 6. Hard filters.
const nutFree = [...adults, { display_name: 'Guest', dietary_tags: ['nut_free'] }];
const noNuts = w.rank({ candidates: pool, date: '2026-11-24', rules: { ...rules, everyone: false }, events: {}, members: nutFree });
check('a nut allergy always excludes, even with everyone off', !noNuts.some((s) => s.c.nuts));
const quick = w.rank({ candidates: pool, date: '2026-11-25', rules: { ...rules, weeknights: '30' }, events: {}, members });
check('weeknights under 30: a 3-hour roast is out', !quick.some((s) => s.c.name === 'Slow roast'));
check('unknown time is not ruled out', quick.some((s) => s.c.name === 'Mystery bake'));
const weekend = w.rank({ candidates: pool, date: '2026-11-28', rules: { ...rules, weeknights: '30' }, events: {}, members });
check('the weekend keeps its own time rule', weekend.some((s) => s.c.name === 'Slow roast'));

// 7. You choose for me: the pantry leads.
const pantryPool = [
  make('Plain pasta', { veg: true, have: 1, total: 6 }),
  make('Spinach omelette', { veg: true, have: 5, total: 6, soon: ['Spinach, baby'] })
];
pantryPool[1].missing = [{ name: 'Cheddar cheese', ref: 'cheddar-cheese' }];
const chosen = w.chooseOne(w.rank({ candidates: pantryPool, date: '2026-11-24', rules, members, mode: 'chooseForMe' }));
check('choose for me picks what uses the pantry', chosen && chosen.c.name === 'Spinach omelette');
check('and says what it uses', chosen.reasons.includes('Uses spinach'), chosen.reasons.join(' | '));
check('and what you would need', w.describeMissing(chosen.missing) === 'You would need cheddar cheese.');
const next = w.chooseOne(w.rank({ candidates: pantryPool, date: '2026-11-24', rules, members, mode: 'chooseForMe', skip: new Set([chosen.c.key]) }));
check('Something else gives the next best', next && next.c.name === 'Plain pasta');

// 8. Reading a recipe.
check('carb-led', JSON.stringify(w.leadOf({ calories: 600, carbs_g: 90, protein_g: 20 }, {})) === '["carb"]');
check('protein-led by share', JSON.stringify(w.leadOf({ calories: 400, carbs_g: 10, protein_g: 35 }, {})) === '["protein"]');
check('incomplete is labelled neither', w.leadOf({ calories: 400, carbs_g: 90, protein_g: 5 }, { carbs_g: false }) === null);
check('fish beats meat', w.kindOf({ ingredients: [{ ref: 'bacon' }, { ref: 'salmon-fillet' }] }) === 'fish');
check('fish sauce is not fish', w.kindOf({ ingredients: [{ ref: 'fish-sauce' }, { ref: 'tofu' }] }) === 'veggie');
check('meat', w.kindOf({ ingredients: [{ ref: 'chicken-breast' }] }) === 'meat');

const refMap = new Map([
  ['salmon-fillet', { name: 'Salmon fillet', calories_per_100g: 200, protein_g: 20, fat_g: 13, carbs_g: 0, source: 'reference' }],
  ['spinach', { name: 'Spinach', calories_per_100g: 25, protein_g: 3, fat_g: 0.4, carbs_g: 1.6, source: 'reference' }]
]);
const prepared = w.prepare({
  recipes: [{ slug: 'salmon-spinach', name: 'Salmon and spinach', default_slot: 'dinner', default_serves: 2, dietary_tags: [], ingredients: [{ ref: 'salmon-fillet', quantity: 300, unit: 'g' }, { ref: 'spinach', quantity: 200, unit: 'g' }], steps: [] }],
  referenceMap: refMap,
  haveSet: new Set(['spinach']),
  soonSet: new Set(['spinach'])
});
check('prepare reads a library recipe', prepared.length === 1 && prepared[0].kind === 'fish', JSON.stringify(prepared[0] && prepared[0].kind));
check('prepare finds what you have and what to use', prepared[0].have === 1 && prepared[0].usesSoon.length === 1);
check('prepare works out the lead', Array.isArray(prepared[0].lead) && prepared[0].lead.includes('protein'), JSON.stringify(prepared[0].lead));

// 9. Rules and events kept safe.
const r = w.normaliseRules({ fish: 9, meat: 5, weeknights: 'soon', everyone: 'yes' });
check('counts capped at a week', r.fish === 7 && r.meat === 0);
check('odd values fall back', r.weeknights === 'any' && r.everyone === true);
let ev = w.toggleEvent({}, '2026-11-29', 'match');
check('an event goes on', JSON.stringify(ev) === '{"2026-11-29":["match"]}');
ev = w.toggleEvent(ev, '2026-11-29', 'match');
check('and comes off', JSON.stringify(ev) === '{}');
check('unknown events dropped', JSON.stringify(w.normaliseEvents({ '2026-11-29': ['match', 'party'], nonsense: ['gym'] })) === '{"2026-11-29":["match"]}');
check('old events pruned', JSON.stringify(w.pruneEvents({ '2026-10-01': ['gym'], '2026-11-29': ['match'] }, '2026-11-27')) === '{"2026-11-29":["match"]}');
const recent = w.recentKeysFrom([{ week_start: '2026-11-16', day_of_week: 'fri', meal_id: '7' }, { week_start: '2026-11-23', day_of_week: 'sat', meal_id: '8' }], '2026-11-27');
check('variety reads the last fortnight, not the days ahead', recent.has('meal:7') && !recent.has('meal:8'));

// 11. Seasons (Phase 41): no barbecue in December unless the day asks for it.
{
  const seasons = await import(pathToFileURL(path.join(REPO, 'js/data/seasons.js')).href);
  const ideasMod = await import(pathToFileURL(path.join(REPO, 'js/data/weekIdeas.js')).href);
  const mk = (name, cuisine, extra = {}) => ({ ...make(name, { veg: true, lead: ['carb'] }), cuisine, ...extra });
  const bbqRibs = mk('Barbecue veg skewers', 'BBQ');
  const winterStew = mk('Winter root stew', 'Winter');
  const summerSalad = mk('Summer salad', 'Summer');
  const cake = mk('Birthday cake bake', 'Birthday');
  const myBbq = mk('My own barbecue tofu', 'BBQ', { own: true });
  const plain = mk('Plain pasta', 'Italian');
  const pool2 = [bbqRibs, winterStew, summerSalad, cake, myBbq, plain];
  const dec = '2026-12-08';
  const decRank = w.rank({ candidates: pool2, date: dec, slot: 'dinner', rules: { rhythm: false }, events: {}, entries: [], members: [] });
  const decNames = decRank.map((x) => x.c.name);
  check('December: no barbecue or summer food from the library', !decNames.includes('Barbecue veg skewers') && !decNames.includes('Summer salad'), decNames.join(','));
  check('December: birthday food waits for a birthday', !decNames.includes('Birthday cake bake'));
  check('December: your own barbecue meal is still offered', decNames.includes('My own barbecue tofu'));
  check('December: winter food is offered and says so', decRank.some((x) => x.c.name === 'Winter root stew' && x.reasons.includes('In season: Winter')));
  check('in season comes ahead of everyday food', decNames.indexOf('Winter root stew') < decNames.indexOf('Plain pasta'));
  const bbqDay = w.rank({ candidates: pool2, date: dec, slot: 'dinner', rules: { rhythm: false }, events: { [dec]: ['bbq'] }, entries: [], members: [] });
  check('a Barbecue day brings barbecue food back, first', bbqDay[0] && ['Barbecue veg skewers', 'My own barbecue tofu'].includes(bbqDay[0].c.name) && bbqDay.some((x) => x.c.name === 'Barbecue veg skewers'), bbqDay.map((x) => x.c.name).join(','));
  check('and says why', bbqDay.find((x) => x.c.name === 'Barbecue veg skewers').reasons.includes('Off the barbecue'));
  const bday = w.rank({ candidates: pool2, date: dec, slot: 'dinner', rules: { rhythm: false }, events: { [dec]: ['birthday'] }, entries: [], members: [] });
  check('a Birthday day brings birthday food', bday.some((x) => x.c.name === 'Birthday cake bake'));
  const jul = w.rank({ candidates: pool2, date: '2026-07-08', slot: 'dinner', rules: { rhythm: false }, events: {}, entries: [], members: [] }).map((x) => x.c.name);
  check('July: barbecue and summer food, no winter stew', jul.includes('Barbecue veg skewers') && jul.includes('Summer salad') && !jul.includes('Winter root stew'), jul.join(','));
  check('Barbecue and Birthday are events', w.EVENTS.some((e) => e.value === 'bbq') && w.EVENTS.some((e) => e.value === 'birthday'));
  check('new events survive saving', JSON.stringify(w.normaliseEvents({ [dec]: ['bbq', 'birthday'] })) === JSON.stringify({ [dec]: ['bbq', 'birthday'] }));
  check('seasonState: everyday food has no season', seasons.seasonState('Italian', dec) === 'none' && seasons.seasonState('Christmas', dec) === 'in' && seasons.seasonState('Christmas', '2026-06-01') === 'out');
  // Fill the week
  const fillDec = ideasMod.bestFor({ d: { value: 'tue', iso: dec }, slot: 'dinner', candidates: [bbqRibs, summerSalad], diet: new Set(), rand: () => 0 });
  check('Fill the week: nothing out of season in December', fillDec === null);
  const fillJul = ideasMod.bestFor({ d: { value: 'sat', iso: '2026-07-11' }, slot: 'dinner', candidates: [plain, summerSalad], diet: new Set(), rand: () => 0 });
  check('Fill the week: summer food first in July', fillJul && fillJul.name === 'Summer salad');
}

// 10. No shame: reasons and tallies are facts, never verdicts.
const BANNED = /\b(missed|failed|fail|behind|should|must|only|bad|naughty|cheat|guilty)\b|!/i;
const words = [
  ...w.describeTally(counts, rules), ...w.describeTally({ fish: 0, meat: 3, veggie: 0, planned: 3 }, rules),
  ...[...sat, ...thu, ...before, ...after].flatMap((s) => s.reasons),
  w.describeMissing([]), w.describeMissing(chosen.missing)
];
for (const line of words) check(`no-shame copy: "${line}"`, !BANNED.test(line));

console.log(`  ${checks} checks`);
if (failures.length) { for (const x of failures) console.log(`  ✗ ${x}`); process.exit(1); }
console.log('  ✓ week shaper: events shape the day, rules hold, same inputs, same list');
