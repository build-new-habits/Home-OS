// js/data/cookingMethods.js — 27 Nov 2026 v1
// Phase 43. How a recipe is cooked, read from its name and method.
//
// Graeme, 27 Nov 2026: "I think there is other filters like roasts, pan
// fried, oven baked, one pot, tray bake, grilled, microwave etc. That's for
// the filtering of community recipes."
//
// ---- Read from what the method DOES, like recipeEquipment.js ----
// No library recipe records its cooking method, and 1,170 is too many to
// tag by hand without mistakes. The method already says it: "Roast 40
// minutes", "Fry 3 minutes a side", "Cover. Cook in the oven 2 hours". A
// recipe can be more than one: a roast is oven-cooked, a traybake roasts.
//
// ---- Strict where a word is everywhere ----
// "Fry the onion" opens half the stews in the library. Pan-fried means the
// frying IS the cooking: a frying pan or a sear, and no long simmer, bake or
// roast after it. One pot means one pan or pot does all the cooking, with
// no oven tin, second pan or separately boiled pasta or rice.
//
// Pure. The gate runs it over every recipe.

export const METHODS = Object.freeze([
  { value: 'roast', label: 'Roast' },
  { value: 'oven', label: 'Oven-baked' },
  { value: 'traybake', label: 'Traybake' },
  { value: 'one-pot', label: 'One pot' },
  { value: 'hob', label: 'On the hob' },
  { value: 'pan-fried', label: 'Pan-fried' },
  { value: 'stir-fry', label: 'Stir-fry' },
  { value: 'grilled', label: 'Grilled or barbecued' },
  { value: 'slow', label: 'Slow-cooked' },
  { value: 'steamed', label: 'Steamed' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'no-cook', label: 'No cooking' }
]);

const HEAT = /\b(heat|oven|fry|fried|frying|boil|boiling|simmer|bake|baked|baking|roast|roasted|roasting|grill|griddle|toast|cook|cooked|warm|melt|melted|steam|sear|poach|bubble|brown|char|microwave|embers|coals|barbecue)\b/;
const VESSELS = [
  ['saucepan', /\bsaucepan\b/],
  ['frying pan', /\bfrying pan\b/],
  ['pan', /\b(large|wide|big|small)? ?pan\b/],
  ['pot', /\bpot\b/],
  ['casserole', /\bcasserole\b/],
  ['wok', /\bwok\b/],
  ['tin', /\b(roasting )?tin\b|\btray\b/],
  ['dish', /\b(baking|ovenproof|pie) dish\b|\bin a dish\b/]
];

function textOf(recipe) {
  const steps = (recipe.steps || []).map((s) => String(s.instruction || '')).join(' \n ');
  return steps.replace(/\{\{ing:[^}]+\}\}/g, ' x ').toLowerCase();
}

function longestMinutes(recipe, re) {
  let best = 0;
  for (const s of recipe.steps || []) {
    const t = String(s.instruction || '').toLowerCase();
    if (re.test(t) && Number.isFinite(s.duration_min)) best = Math.max(best, s.duration_min);
  }
  return best;
}

/** @returns {string[]} method values, in METHODS order */
export function methodsOf(recipe) {
  if (!recipe) return [];
  const name = String(recipe.name || '').toLowerCase();
  const t = textOf(recipe);
  const all = `${name} \n ${t}`;
  const out = new Set();

  const microwave = /\bmicrowave\b/.test(all);
  // The name only counts when it names the cooking ("Grilled mackerel"), not
  // a flavour ("Smoky barbecue beans").
  const grilled = /\b(grill|griddle|barbecue|coals|embers|campfire|over the fire|chargrill)\w*/.test(t.replace(/finish(ed)? under (a|the) (hot )?grill/g, ''))
    || /\b(grilled|griddled|chargrilled|campfire|fire-roasted|skewers)\b/.test(name);
  const roast = /\broast(ed|ing)?\b/.test(t) || /\broast\b/.test(name);
  const baked = /\bbake(d|s)?\b/.test(all) || /\bin the oven\b|\bheat the oven\b/.test(t);
  const oven = roast || baked;
  const simmerLong = longestMinutes(recipe, /\b(simmer|cook|bubble|stew)\b/);
  const stirFry = /\bstir-?fr(y|ied|ies)\b|\bwok\b/.test(all);
  const deepFry = /\bdeep-?fr/.test(all);
  const steamed = /\bsteam\b(?! dry)|\bsteamed\b/.test(all.replace(/until steaming|to steam(ing)?\b(?= hot)/g, '')) && !/\bput in a bag to steam\b/.test(t);

  if (roast) out.add('roast');
  if (baked) out.add('oven');
  const savoury = recipe.course !== 'pudding' && recipe.default_slot !== 'drink';
  // A traybake cake (lemon drizzle, jam and coconut) is a cake, not a one-tin dinner.
  if ((savoury && /\btray ?bake\b/.test(all)) || (savoury && roast && /\b(roasting tin|in a tin|in one tin|one tin|into the tin|to the tin|in the tin)\b/.test(t)
      && !/\b(saucepan|frying pan|wok|blend|pan)\b/.test(t) && !/\bboil\b/.test(t) && !/\b(loaf|cake|square|\d+ cm) tin\b/.test(t))) out.add('traybake');

  // One pot: one pan, pot or casserole, and nothing else cooks.
  const vessels = new Set(VESSELS.filter(([, re]) => re.test(t)).map(([v]) => (v === 'saucepan' || v === 'pan' ? 'pan' : v)));
  const separately = /\bcook \{?x\}? for the time on the packet\b|\bfor the time on the packet\b|\bboil x\b/.test(t);
  const isMain = (recipe.course || 'main') === 'main' && !recipe.side && recipe.default_slot !== 'drink';
  if (/\bone[- ]pot\b/.test(all)
      || isMain && (!oven || vessels.has('casserole')) && (vessels.size === 1 && (vessels.has('pan') || vessels.has('pot') || vessels.has('casserole'))
          && !separately && !grilled && !/\bfrying pan\b/.test(t) && (simmerLong >= 10 || /\b(simmer|stew|casserole)\b/.test(t)))
      || isMain && (vessels.size === 1 && vessels.has('casserole'))) out.add('one-pot');
  // On the hob: simmered or boiled on top, no oven.
  if (!oven && /\b(simmer|boil|bubble|poach|stir .{0,30}until thick|ladle)\b/.test(t)) out.add('hob');

  // Pan-fried: the frying is the cooking.
  if (!deepFry && !stirFry && (/\bfrying pan\b|\bsear(ed)?\b|\bpan-fried\b|\bfritters?\b/.test(all) || /\bfry .{0,40}\b(each side|a side|turning)\b/.test(t))
      && !oven && simmerLong < 15 && !grilled && !separately && !/\bboil\b/.test(t)) out.add('pan-fried');
  if (stirFry) out.add('stir-fry');
  if (grilled) out.add('grilled');
  const longest = Math.max(longestMinutes(recipe, /\b(cook|bake|roast|simmer|stew|braise|oven)\b/), 0);
  if (/\bslow[- ]cook|\bslow-roast|\bslow roast|\bslow cooker\b/.test(all) || longest >= 120) out.add('slow');
  if (steamed) out.add('steamed');
  if (microwave) out.add('microwave');
  if (!HEAT.test(t) && !/\b(roast|baked|fried|grilled|toasted)\b/.test(name)) out.add('no-cook');
  return METHODS.map((m) => m.value).filter((v) => out.has(v));
}

export function methodLabel(value) {
  const m = METHODS.find((x) => x.value === value);
  return m ? m.label : '';
}
