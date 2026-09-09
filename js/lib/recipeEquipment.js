// js/lib/recipeEquipment.js — 08 Sep 2026 v1
//
// What you will need out, read from the method.
//
// ---- Why derived and not authored ----
// None of the 110 library recipes records equipment. Authoring it is a real
// job and one nobody has done, so the choice was between nothing and a
// derivation.
//
// A first attempt looked for equipment NOUNS and was not worth shipping:
// the steps say "pan" 70 times, "oven" 33, "bowl" 20, and then almost
// nothing. It would have printed "a pan, an oven" for most recipes and
// missed the grater on the risotto, whose method says "grate parmesan in"
// and never names a grater.
//
// So the rules read what the method DOES. Grating needs a grater whether or
// not the word appears; draining needs a colander; mashing needs a masher.
// That gets two or more items for 80 of the 110, and the ones it gets are
// the ones you would actually go and find.
//
// ---- It is labelled, and it stays labelled ----
// The caller must present this as read from the method, never as "the
// equipment". It will miss things — the jar for overnight oats, the sieve
// nobody mentioned — and a list that looks authoritative while being
// incomplete is worse on a recipe card than no list, because you stop
// reading it and then get caught out the once it mattered.
//
// ---- Silence over padding ----
// Seven recipes yield nothing. They say nothing. An "Equipment: —" heading
// is a worse answer than leaving the section out.

const RULES = [
  // Specific pans first: naming the one the method names beats a generic.
  ['a large pan', /\blarge pan\b/],
  ['a wide pan', /\bwide pan\b/],
  ['a frying pan', /\bfrying pan\b/],
  ['a saucepan', /\bsaucepan\b|\bheat (?:the )?stock\b|\bbring .{0,20}to the boil\b/],

  ['the oven', /\boven\b|\bbake\b|\broast\b/],
  ['a baking tray', /\bbaking (?:tray|sheet)\b/],
  ['a roasting tin', /\broasting tin\b/],
  ['an ovenproof dish', /\b(?:ovenproof|baking) dish\b/],
  ['a loaf tin', /\bloaf tin\b/],

  ['a mixing bowl', /\bbowl\b|\bmix .{0,25}together\b/],
  ['a whisk', /\bwhisk\b|\bbeat .{0,20}(?:egg|cream)/],
  ['a grater', /\bgrate/],
  ['a colander', /\bdrain\b|\bcolander\b/],
  ['a masher', /\bmash\b/],
  ['a blender', /\bblend\b|\bblitz\b|\bfood processor\b/],
  ['a rolling pin', /\brolling pin\b/],
  ['skewers', /\bskewer/],
  ['a griddle', /\bgriddle\b/],
  ['a wok', /\bwok\b/],
  ['a slow cooker', /\bslow cooker\b/],
  ['foil', /\bfoil\b/],
  ['baking paper', /\bbaking paper\b|\bparchment\b/],

  // Last, and only when nothing more specific matched: "a pan" on a card
  // that already says "a wide pan" is noise.
  ['a pan', /\bpan\b/]
];

const SPECIFIC_PANS = ['a large pan', 'a wide pan', 'a frying pan', 'a saucepan'];

/** @returns {string[]} possibly empty — and empty means say nothing. */
export function equipmentFor(recipe) {
  const text = ((recipe && recipe.steps) || [])
    .map((s) => String(s.instruction || '').toLowerCase())
    .join(' ');
  if (!text) return [];

  const found = [];
  for (const [name, pattern] of RULES) {
    if (!pattern.test(text)) continue;
    if (name === 'a pan' && found.some((f) => SPECIFIC_PANS.includes(f))) continue;
    found.push(name);
  }
  return found;
}

/** One line, or '' when nothing was found. */
export function describeEquipment(recipe) {
  const items = equipmentFor(recipe);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
