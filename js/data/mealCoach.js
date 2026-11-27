// js/data/mealCoach.js — 27 Nov 2026 v1
// Phase 39. Help me choose: a coach for a library too big to scroll.
//
// Graeme, 27 Nov 2026: "We need to build a coach that supports recipe
// selection and help to filter the vast list of recipes, meals etc."
//
// 561 library recipes and your own meals, 279 of them Christmas. Nobody
// scrolls that. A person choosing food asks themselves a few things: what is
// it for, how long have I got, what do I feel like, what is in. This file
// asks the same things as taps, says how many recipes each answer leaves,
// and says which question would narrow it most. When the answers leave too
// few, it says which one to loosen and how many that brings back.
//
// ---- No AI ----
// Rules on what a recipe is (its slot, course, time, cuisine, ingredients,
// calories a serving), the same way as Shape my week. AI in this app is for
// recipe import only (Graeme, Nov 2026). Same answers, same list, always:
// ties break by name and nothing here is random.
//
// ---- Every answer is optional ----
// "Any" is always the first choice and the default. A question you skip
// never narrows anything.
//
// ---- Honest about what it knows ----
// "Light" and "Hearty" need complete calories; a recipe without them is
// neither. A recipe with no time is never called quick: it stays in when a
// time is asked, last, and says "No time given".
//
// ---- Pure ----
// factsOf() reads candidates from weekShaper.prepare() once. Everything
// else takes plain data, so the gate runs it as it is.

import { suitsDiet, householdDiet } from './weekIdeas.js';

// ---- The questions ----------------------------------------------------------

/** Each question: an id (also its query key), a label and its choices. */
export const QUESTIONS = Object.freeze([
  { id: 'for', label: 'What is it for?', choices: [
    ['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack'],
    ['starter', 'Starter'], ['side', 'A side'], ['pudding', 'Pudding'], ['drink', 'Drink']] },
  { id: 'time', label: 'How long have you got?', choices: [
    ['15', '15 minutes'], ['30', '30 minutes'], ['45', '45 minutes'], ['60', 'An hour']] },
  { id: 'feel', label: 'What do you feel like?', choices: [
    ['light', 'Light'], ['hearty', 'Hearty'], ['spicy', 'Spicy'], ['mild', 'Mild, no chilli'], ['protein', 'High protein']] },
  { id: 'with', label: 'Made with', choices: [
    ['chicken', 'Chicken'], ['beef', 'Beef'], ['pork', 'Pork, ham or bacon'], ['lamb', 'Lamb'],
    ['poultry', 'Turkey, duck or game'], ['fish', 'Fish'], ['shellfish', 'Shellfish'], ['eggs', 'Eggs'],
    ['cheese', 'Cheese'], ['beans', 'Beans, lentils or chickpeas'], ['tofu', 'Tofu'],
    ['pasta', 'Pasta or noodles'], ['rice', 'Rice'], ['potato', 'Potatoes']] },
  { id: 'from', label: 'Where from?', choices: [
    ['british', 'British'], ['europe', 'Italian, French, Spanish or Greek'], ['middle', 'Middle Eastern or Turkish'],
    ['southasia', 'Indian or Sri Lankan'], ['eastasia', 'Chinese, Japanese or Korean'],
    ['seasia', 'Thai, Vietnamese or Malaysian'], ['americas', 'Mexican or Caribbean'], ['africa', 'African']] },
  { id: 'diet', label: 'Diet', choices: [
    ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['gluten_free', 'Gluten free'], ['dairy_free', 'Dairy free']] },
  { id: 'kind', label: 'What kind?', choices: [
    ['everyday', 'Everyday cooking'], ['christmas', 'Christmas'], ['grab', 'Ready-made, grab and go']] },
  { id: 'cost', label: 'Cost', choices: [
    ['budget', 'Budget'], ['everyday', 'Everyday'], ['special', 'A treat']] },
  { id: 'pantry', label: 'From the pantry?', choices: [
    ['mostly', 'Mostly what I have'], ['soon', 'Uses food to use soon']] },
  { id: 'new', label: 'New or known?', choices: [
    ['new', 'Something new to me'], ['mine', 'One of mine or a favourite']] }
].map((q) => Object.freeze({ ...q, choices: Object.freeze(q.choices.map(([value, label]) => Object.freeze({ value, label }))) })));

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/** No answers: every question at Any, and the table's diet kept to. */
export function blankAnswers() {
  const out = { everyone: true };
  for (const q of QUESTIONS) out[q.id] = 'any';
  return out;
}

/** Answers made safe: an unknown value is Any. */
export function normaliseAnswers(raw = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = blankAnswers();
  for (const q of QUESTIONS) {
    const v = String(r[q.id] == null ? 'any' : r[q.id]);
    if (q.choices.some((c) => c.value === v)) out[q.id] = v;
  }
  out.everyone = !(r.everyone === false || r.everyone === '0' || r.everyone === 0);
  return out;
}

/** "for=dinner&time=30". Any is left out; everyone only when it is off. */
export function toQuery(answers) {
  const a = normaliseAnswers(answers);
  const parts = [];
  for (const q of QUESTIONS) if (a[q.id] !== 'any') parts.push(`${q.id}=${encodeURIComponent(a[q.id])}`);
  if (!a.everyone) parts.push('everyone=0');
  return parts.join('&');
}

/** From a hash or query string: "#/meal-coach?for=dinner" or "for=dinner". */
export function fromQuery(text = '') {
  const q = String(text).includes('?') ? String(text).split('?').slice(1).join('?') : String(text);
  const raw = {};
  for (const pair of q.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    try { raw[decodeURIComponent(k)] = decodeURIComponent(v); } catch { /* a broken pair is ignored */ }
  }
  return normaliseAnswers(raw);
}

/** How many questions have an answer other than Any. */
export function answeredCount(answers) {
  const a = normaliseAnswers(answers);
  return QUESTIONS.filter((q) => a[q.id] !== 'any').length;
}

export function choiceLabel(id, value) {
  const q = BY_ID.get(id);
  const c = q && q.choices.find((x) => x.value === value);
  return c ? c.label : 'Any';
}

/** The answers as short words, for a summary line. */
export function describeAnswers(answers) {
  const a = normaliseAnswers(answers);
  const out = [];
  for (const q of QUESTIONS) {
    if (a[q.id] === 'any') continue;
    if (q.id === 'time') out.push(`Under ${a.time === '60' ? 'an hour' : `${a.time} minutes`}`);
    else out.push(choiceLabel(q.id, a[q.id]));
  }
  return out;
}

// ---- What a recipe is ---------------------------------------------------------

const FLAVOURING = /^(stock|fish sauce|oyster sauce|fish-sauce|stock-)/;
const WITH = {
  chicken: /\bchicken\b/,
  beef: /\b(beef|steak)\b/,
  pork: /\b(pork|bacon|ham|gammon|sausages?|sausagemeat|chorizo|pancetta|prosciutto|chipolatas?)\b/,
  lamb: /\blamb\b/,
  poultry: /\b(turkey|duck|goose|pheasant|quail|venison)\b/,
  fish: /\b(salmon|tuna|cod|haddock|hake|mackerel|sardines?|anchov(y|ies)|bass|bream|monkfish|turbot|halibut|trout|plaice|sole|kippers?|caviar)\b/,
  shellfish: /\b(prawns?|shrimps?|crab|lobster|mussels?|scallops?|squid|oysters?|langoustines?|clams?)\b/,
  eggs: /\beggs?\b/,
  cheese: /\b(cheese|cheddar|feta|halloumi|mozzarella|parmesan|stilton|camembert|gruyere|ricotta|burrata|mascarpone|paneer|brie)\b/,
  beans: /\b(beans|lentils|chickpeas|edamame|hummus|dahl|dal)\b/,
  tofu: /\btofu\b/,
  pasta: /\b(spaghetti|penne|pasta|noodles|linguine|lasagne|macaroni|tagliatelle|fusilli|gnocchi|couscous)\b/,
  rice: /\b(rice (arborio|basmati|jasmine|long|brown|dry)|wild rice|risotto|sushi|paella|biryani|pilau)\b/,
  potato: /\b(potato|potatoes|mash)\b/
};
// Green beans are a vegetable, not "beans"; rice vinegar and rice noodles are not rice.
const NOT_BEANS = /\b(green beans|runner beans|broad beans frozen|vanilla bean)\b/;

const SPICY_REF = /\b(chilli|chili|chillies|cayenne|curry paste|curry powder|harissa|gochujang|kimchi|jalapenos?|massaman|thai green|thai red|scotch bonnet|chipotle|sriracha|hot sauce|sambal|piri)\b/;
const SPICY_NAME = /\b(spicy|chilli|chili|curry|jerk|piri|peri|vindaloo|madras|tikka|jalfrezi|arrabbiata|diavola|harissa|kimchi|sambal|rendang|laksa|szechuan|sichuan)\b/i;
const HEARTY_NAME = /\b(pie|stew|casserole|roast|bake|lasagne|hotpot|hot pot|cottage|shepherd|mash|dumplings?|gratin|bourguignon|wellington|crumble|chilli con|moussaka|risotto|curry|tagine|cassoulet)\b/i;
const LIGHT_KCAL = 450;
const HEARTY_KCAL = 650;

const REGION = {
  british: ['british', 'irish', 'english', 'scottish', 'welsh'],
  europe: ['italian', 'french', 'spanish', 'greek', 'portuguese'],
  middle: ['middle eastern', 'turkish', 'persian', 'lebanese', 'moroccan'],
  southasia: ['indian', 'sri lankan', 'pakistani', 'bangladeshi', 'nepali'],
  eastasia: ['chinese', 'japanese', 'korean'],
  seasia: ['thai', 'vietnamese', 'malaysian', 'filipino', 'indonesian'],
  americas: ['mexican', 'caribbean', 'american', 'jamaican'],
  africa: ['west african', 'ethiopian', 'african', 'nigerian', 'ghanaian']
};

function words(text) {
  return String(text || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}

/** The ingredient words that say what a recipe is made with. */
function ingredientWords(c) {
  return (c.ingredients || [])
    .map((i) => words(i.ref || i.name || ''))
    .filter((w) => w && !FLAVOURING.test(w));
}

export function regionOf(cuisine) {
  const c = words(cuisine);
  if (!c) return null;
  for (const [region, names] of Object.entries(REGION)) if (names.includes(c)) return region;
  return null;
}

/**
 * What one candidate is, read once, so filtering 600 recipes on every tap
 * is a lookup and not a reading.
 * @param {object} c a candidate from weekShaper.prepare()
 */
export function factsOf(c) {
  const ings = ingredientWords(c);
  const joined = ings.join(' | ');
  const name = String(c.name || '');
  const madeWith = new Set();
  for (const [key, re] of Object.entries(WITH)) {
    if (key === 'beans') { if (ings.some((w) => re.test(w) && !NOT_BEANS.test(w))) madeWith.add(key); continue; }
    if (re.test(joined) || (key !== 'eggs' && key !== 'potato' && re.test(words(name)))) madeWith.add(key);
  }
  const course = c.course || 'main';
  const slot = c.slot || 'dinner';
  const forValue = course === 'starter' || course === 'pudding' || course === 'side' ? course : slot;
  const spicy = SPICY_REF.test(joined) || SPICY_NAME.test(name);
  const kcal = Number.isFinite(c.kcal) ? c.kcal : null;
  const feel = new Set();
  if (spicy) feel.add('spicy'); else feel.add('mild');
  if (kcal !== null && kcal <= LIGHT_KCAL) feel.add('light');
  if ((kcal !== null && kcal >= HEARTY_KCAL) || (HEARTY_NAME.test(name) && !(kcal !== null && kcal <= LIGHT_KCAL))) feel.add('hearty');
  if (Array.isArray(c.lead) && c.lead.includes('protein')) feel.add('protein');
  const cuisine = String(c.cuisine || '');
  const kind = cuisine === 'Christmas' ? 'christmas' : cuisine === 'Grab and go' ? 'grab' : 'everyday';
  const tags = new Set(c.dietary_tags || []);
  if (tags.has('vegan')) tags.add('vegetarian');
  return {
    c,
    for: forValue,
    minutes: Number.isFinite(c.minutes) && c.minutes > 0 ? c.minutes : null,
    feel,
    with: madeWith,
    from: regionOf(cuisine),
    diet: tags,
    kind,
    cost: ['budget', 'everyday', 'special'].includes(c.budget) ? c.budget : 'everyday',
    pantryShare: c.total ? c.have / c.total : 0,
    usesSoon: (c.usesSoon || []).length > 0,
    mine: Boolean(c.own || c.favourite),
    kcal
  };
}

// ---- Fitting the answers ------------------------------------------------------

/** Does one recipe fit one answer? Any always fits. */
export function fits(f, id, value) {
  if (value === 'any' || value == null) return true;
  switch (id) {
    case 'for': return f.for === value;
    case 'time': return f.minutes === null || f.minutes <= Number(value);
    case 'feel': return f.feel.has(value);
    case 'with': return f.with.has(value);
    case 'from': return f.from === value;
    case 'diet': return f.diet.has(value);
    case 'kind': return f.kind === value;
    case 'cost': return f.cost === value;
    case 'pantry': return value === 'mostly' ? f.pantryShare >= 0.75 : f.usesSoon;
    case 'new': return value === 'new' ? !f.mine && !f.recent : f.mine;
    default: return true;
  }
}

/**
 * The table, as a test a recipe passes or fails. A nut allergy is always
 * kept to; every other diet at home only while Suits everyone is on.
 */
export function tableTest(members = []) {
  const table = householdDiet(members);
  const nutsOnly = new Set(table.has('nut_free') ? ['nut_free'] : []);
  return (f, everyone) => {
    const need = everyone ? table : nutsOnly;
    if (!need.size) return true;
    return suitsDiet({ dietary_tags: [...f.diet] }, need, (f.c.ingredients || []).map((i) => i.ref || i.name || ''));
  };
}

/** Every recipe that fits every answer. */
export function filterFacts(facts = [], answers, table = () => true) {
  const a = normaliseAnswers(answers);
  return facts.filter((f) => table(f, a.everyone) && QUESTIONS.every((q) => fits(f, q.id, a[q.id])));
}

/** For each choice of one question, how many recipes the answers would leave. */
export function countsFor(facts = [], answers, id, table = () => true) {
  const a = normaliseAnswers(answers);
  const others = QUESTIONS.filter((q) => q.id !== id);
  const base = facts.filter((f) => table(f, a.everyone) && others.every((q) => fits(f, q.id, a[q.id])));
  const out = { any: base.length };
  for (const c of BY_ID.get(id).choices) out[c.value] = base.filter((f) => fits(f, id, c.value)).length;
  return out;
}

// ---- Coaching -------------------------------------------------------------------

export const ENOUGH = 12; // a list a person can read and choose from
export const TOO_FEW = 5;

/**
 * Of the questions not yet answered, the one whose choices split what is
 * left most evenly. A question where nearly everything sits in one choice
 * narrows nothing, however good it sounds.
 */
export function nextQuestion(fitting = [], answers) {
  const a = normaliseAnswers(answers);
  const n = fitting.length;
  if (n <= ENOUGH) return null;
  let best = null;
  for (const q of QUESTIONS) {
    if (a[q.id] !== 'any') continue;
    let entropy = 0;
    let covered = 0;
    for (const c of q.choices) {
      const k = fitting.filter((f) => fits(f, q.id, c.value)).length;
      if (!k || k === n) continue;
      covered += 1;
      const p = k / n;
      entropy -= p * Math.log2(p);
    }
    if (covered < 2) continue;
    const score = Math.round(entropy * 1000);
    if (!best || score > best.score) best = { q, score };
  }
  return best ? best.q : null;
}

/** When the answers leave too few: which one to set back to Any, and the gain. */
export function loosen(facts = [], answers, table = () => true) {
  const a = normaliseAnswers(answers);
  const now = filterFacts(facts, a, table).length;
  const out = [];
  for (const q of QUESTIONS) {
    if (a[q.id] === 'any') continue;
    const n = filterFacts(facts, { ...a, [q.id]: 'any' }, table).length;
    if (n > now) out.push({ id: q.id, ids: [q.id], from: a[q.id], gain: n - now, total: n, label: `${q.id === 'time' ? 'Any time' : `Any, not just ${choiceLabel(q.id, a[q.id]).toLowerCase()}`}` });
  }
  if (a.everyone) {
    const n = filterFacts(facts, { ...a, everyone: false }, table).length;
    if (n > now) out.push({ id: 'everyone', from: 'on', gain: n - now, total: n, label: 'Not everyone at home is eating' });
  }
  if (!out.length) {
    // No single answer brings anything back: try two at once.
    const set = QUESTIONS.filter((q) => a[q.id] !== 'any');
    for (let i = 0; i < set.length; i += 1) {
      for (let j = i + 1; j < set.length; j += 1) {
        const x = set[i];
        const y = set[j];
        const n = filterFacts(facts, { ...a, [x.id]: 'any', [y.id]: 'any' }, table).length;
        if (n > now) out.push({ id: `${x.id}+${y.id}`, ids: [x.id, y.id], gain: n - now, total: n, label: `Let go of ${x.label.replace(/\?$/, '').toLowerCase()} and ${y.label.replace(/\?$/, '').toLowerCase()}` });
      }
    }
  }
  return out.sort((x, y) => y.gain - x.gain || x.id.localeCompare(y.id)).slice(0, 3);
}

/** The answers after taking one loosen idea. */
export function applyLoosen(answers, idea) {
  const a = normaliseAnswers(answers);
  if (idea.id === 'everyone') return { ...a, everyone: false };
  const next = { ...a };
  for (const id of idea.ids || [idea.id]) next[id] = 'any';
  return next;
}

/** The coach's one line. Plain facts, never a verdict. */
export function coachLine(fitting = [], answers, { total = 0 } = {}) {
  const n = fitting.length;
  const noun = n === 1 ? 'recipe fits' : 'recipes fit';
  if (!answeredCount(answers)) return `${total} recipes to choose from. Tap an answer to narrow them down. Every question is optional.`;
  if (n === 0) return 'Nothing fits all of these. Loosen one answer to bring some back.';
  if (n <= ENOUGH) return `${n} ${noun}. A good number to choose from.`;
  const next = nextQuestion(fitting, answers);
  return next ? `${n} ${noun}. "${next.label}" would narrow it most.` : `${n} ${noun}.`;
}

// ---- Ranking ----------------------------------------------------------------------

export const WEIGHTS = Object.freeze({ favourite: 3, own: 2, pantry: 2, soon: 2, fresh: 1, noTime: -2 });

/**
 * What fits, best first. Favourites and your own meals lead unless you asked
 * for something new; then what the pantry can make; then what you have not
 * had lately. Ties by name, so the list never shuffles.
 */
export function rankFacts(fitting = [], answers) {
  const a = normaliseAnswers(answers);
  const out = fitting.map((f) => {
    let score = 0;
    if (a.new !== 'new') {
      if (f.c.favourite) score += WEIGHTS.favourite;
      else if (f.c.own) score += WEIGHTS.own;
    }
    score += f.pantryShare * WEIGHTS.pantry;
    if (f.usesSoon) score += WEIGHTS.soon;
    if (!f.recent) score += WEIGHTS.fresh;
    if (a.time !== 'any' && f.minutes === null) score += WEIGHTS.noTime;
    return { f, score: Math.round(score * 1000) / 1000, reasons: reasonsFor(f, a) };
  });
  out.sort((x, y) => y.score - x.score || x.f.c.name.localeCompare(y.f.c.name) || x.f.c.key.localeCompare(y.f.c.key));
  return out;
}

function shortName(name) {
  return String(name || '').split(',')[0].trim().toLowerCase();
}

/** The chips on a result: what it is, in plain words, answered things first. */
export function reasonsFor(f, answers) {
  const a = normaliseAnswers(answers);
  const out = [];
  if (f.minutes !== null) out.push(`${f.minutes} min`);
  else if (a.time !== 'any') out.push('No time given');
  if (a.feel !== 'any') {
    if (a.feel === 'light' && f.kcal) out.push(`Light, about ${f.kcal} kcal`);
    else if (a.feel === 'hearty' && f.kcal) out.push(`Hearty, about ${f.kcal} kcal`);
    else out.push(choiceLabel('feel', a.feel));
  } else if (f.feel.has('spicy')) out.push('Spicy');
  if (a.with !== 'any') out.push(choiceLabel('with', a.with));
  if (f.c.cuisine && !['Christmas', 'Grab and go', 'Special', 'Snacks', 'Breakfast', 'Vegetarian', 'Drinks', 'Puddings', 'Lunch', 'Starters', 'Budget'].includes(f.c.cuisine)) out.push(f.c.cuisine);
  if (f.diet.has('vegan')) out.push('Vegan');
  else if (f.diet.has('vegetarian')) out.push('Vegetarian');
  if (a.diet === 'gluten_free') out.push('Gluten free');
  if (a.diet === 'dairy_free') out.push('Dairy free');
  if (f.cost === 'special') out.push('A treat');
  else if (f.cost === 'budget') out.push('Budget');
  if (f.c.usesSoon && f.c.usesSoon.length) out.push(`Uses ${f.c.usesSoon.slice(0, 2).map(shortName).join(' and ')}`);
  if (f.c.total && (a.pantry !== 'any' || f.pantryShare >= 0.75)) out.push(f.c.have === f.c.total ? 'You have everything' : `You have ${f.c.have} of ${f.c.total}`);
  if (f.c.favourite) out.push('A favourite');
  else if (f.c.own) out.push('One of yours');
  return out;
}

/** One page of results. */
export function page(ranked = [], n = 0, size = 5) {
  return ranked.slice(n * size, n * size + size);
}

/** Marks what was cooked in the last fortnight, for "something new" and the rank. */
export function markRecent(facts = [], recentKeys = new Set()) {
  for (const f of facts) {
    f.recent = recentKeys.has(f.c.key) || Boolean(f.c.recipe && recentKeys.has(`recipe:${f.c.recipe.slug}`));
  }
  return facts;
}
