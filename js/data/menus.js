// js/data/menus.js — 27 Nov 2026 v3
// v3: comingUp(): what starts next month, for Seasons and occasions (Phase 42).
// v2: seasons and occasions (Phase 40): spring, summer, autumn, winter,
// Easter, birthdays, Halloween, barbecue and outdoor cooking beside
// Christmas, each with the months it is in season.
// Phase 38. Complete menus, each course with drinks to match.
//
// Graeme, 27 Nov 2026: "I want a huge variety of Christmas meals. Starters,
// mains, puddings, vegetarian, fish, meat, vegan, shellfish, complimentary
// menus with soft and alcoholic drink pairings."
//
// ---- What a menu is ----
// A menu names library recipes by slug (data/recipe_library/christmas.json):
// a starter, a main with its sides, and a pudding. Each course carries two
// pairings, one soft and one with alcohol. A pairing is words ("A light,
// juicy red such as Pinot Noir"), and, where the app has the recipe, a link
// to it ("Mulled red grape juice"). Wines are named by style or region,
// never by brand.
//
// ---- Why static JSON ----
// The same reasons as the library (data/recipeLibrary.js): identical for
// everyone, free to serve, works offline once seen. Fetched on demand, not
// precached, so a bad file cannot break the shell install.
//
// Everything below the loader is pure, so the gates can check every menu
// against the real library without a database.

// `months` are the months (1 to 12) an occasion is in season, for "In
// season now". Birthdays are every month. The order is the order of a year.
export const OCCASIONS = Object.freeze({
  spring: { path: 'data/menus/spring.json', title: 'Spring menus', name: 'Spring', months: [3, 4, 5],
    blurb: 'Asparagus, new potatoes, peas, lamb and rhubarb.' },
  easter: { path: 'data/menus/easter.json', title: 'Easter menus', name: 'Easter', months: [3, 4],
    blurb: 'Lamb and glazed ham, simnel cake, hot cross buns and chocolate.' },
  summer: { path: 'data/menus/summer.json', title: 'Summer menus', name: 'Summer', months: [6, 7, 8],
    blurb: 'Tomatoes, peaches, salads, cold soups and berries.' },
  bbq: { path: 'data/menus/bbq.json', title: 'Barbecue menus', name: 'Barbecue', months: [5, 6, 7, 8, 9],
    blurb: 'Ribs, pulled pork, skewers and grilled puddings. All work indoors too.' },
  outdoor: { path: 'data/menus/outdoor.json', title: 'Outdoor cooking menus', name: 'Outdoor cooking', months: [4, 5, 6, 7, 8, 9],
    blurb: 'The campfire, the camping stove and the picnic: foil parcels and one pot.' },
  autumn: { path: 'data/menus/autumn.json', title: 'Autumn menus', name: 'Autumn', months: [9, 10, 11],
    blurb: 'Squash, mushrooms, apples, pies and crumbles.' },
  halloween: { path: 'data/menus/halloween.json', title: 'Halloween menus', name: 'Halloween', months: [10, 11],
    blurb: 'Pumpkin, toffee apples and spooky food for Halloween and Bonfire Night.' },
  christmas: { path: 'data/menus/christmas.json', title: 'Christmas menus', name: 'Christmas', months: [11, 12],
    blurb: 'Starter to pudding, every kind of Christmas table.' },
  winter: { path: 'data/menus/winter.json', title: 'Winter menus', name: 'Winter', months: [1, 2, 12],
    blurb: 'Soups, stews and dumplings, roots, citrus and steamed puddings.' },
  birthday: { path: 'data/menus/birthday.json', title: 'Birthday menus', name: 'Birthdays', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    blurb: 'Party food, cakes worth candles, and something for every diet.' }
});

/** Occasion keys in season this month, in year order; birthdays last. Pure. */
export function inSeason(now = new Date()) {
  const month = now.getMonth() + 1;
  const keys = Object.keys(OCCASIONS).filter((k) => k !== 'birthday' && OCCASIONS[k].months.includes(month));
  return [...keys, 'birthday'];
}

/** Occasions not in season now that start next month. Pure. */
export function comingUp(now = new Date()) {
  const next = ((now.getMonth() + 1) % 12) + 1;
  const current = inSeason(now);
  return Object.keys(OCCASIONS).filter((k) => !current.includes(k) && OCCASIONS[k].months.includes(next));
}

/** Every occasion, in season first, then the rest of the year in order. Pure. */
export function occasionOrder(now = new Date()) {
  const first = inSeason(now);
  return [...first, ...Object.keys(OCCASIONS).filter((k) => !first.includes(k))];
}

/** "Winter, Christmas and birthdays": the in-season names as words. Pure. */
export function inSeasonWords(now = new Date()) {
  const names = inSeason(now).map((k) => (k === 'birthday' ? 'birthdays' : OCCASIONS[k].name));
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Filter chips, in this order. `diet` values in the menus file. */
export const DIETS = Object.freeze([
  { value: '', label: 'All' },
  { value: 'meat', label: 'Meat' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' }
]);

export const COURSE_WORDS = Object.freeze({ starter: 'Starter', main: 'Main', pudding: 'Pudding' });

const cache = new Map();

/** One occasion's menus, fetched once per session. */
export async function loadMenus(occasion = 'christmas') {
  const meta = OCCASIONS[occasion];
  if (!meta) return { ok: false, error: new Error(`No menus for ${occasion}.`) };
  if (cache.has(occasion)) return { ok: true, data: cache.get(occasion) };
  try {
    const url = new URL(`../../${meta.path}`, import.meta.url).href;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${meta.path} returned ${response.status}`);
    const doc = await response.json();
    cache.set(occasion, doc);
    return { ok: true, data: doc };
  } catch (error) {
    console.error('Menus unavailable:', error);
    return { ok: false, error };
  }
}

/**
 * Menus for a diet chip; '' is all. Vegan menus are vegetarian menus too,
 * the way weekIdeas.suitsDiet reads tags. Pure.
 */
export function filterMenus(menus = [], diet = '') {
  if (!diet) return menus.slice();
  return menus.filter((m) => m.diet === diet || (diet === 'vegetarian' && m.diet === 'vegan'));
}

/** The label for a menu's diet. Pure. */
export function dietLabel(diet) {
  const hit = DIETS.find((d) => d.value === diet);
  return hit && hit.value ? hit.label : '';
}

/** Every recipe slug a menu uses, food first then drinks, no repeats. Pure. */
export function menuSlugs(menu, { drinks = true } = {}) {
  const food = [];
  const drink = [];
  for (const c of (menu && menu.courses) || []) {
    if (c.recipe) food.push(c.recipe);
    for (const s of c.sides || []) food.push(s);
    for (const side of ['soft', 'alcoholic']) {
      const p = c.pairing && c.pairing[side];
      if (p && p.recipe) drink.push(p.recipe);
    }
  }
  return [...new Set(drinks ? [...food, ...drink] : food)];
}

/**
 * The menu's courses as names, for a card: "Spiced parsnip and apple soup ·
 * Roast turkey crown… · Christmas pudding". Pure.
 */
export function menuLine(menu, bySlug = new Map()) {
  return ((menu && menu.courses) || [])
    .map((c) => (bySlug.get(c.recipe) || {}).name)
    .filter(Boolean)
    .join(' · ');
}

/**
 * One course, resolved against the library: the dish, its sides and the two
 * drinks, each with a name and, where there is one, a link. Pure.
 */
export function resolveCourse(course, bySlug = new Map()) {
  const dish = bySlug.get(course.recipe) || null;
  const sides = (course.sides || []).map((s) => bySlug.get(s)).filter(Boolean);
  const drink = (side) => {
    const p = (course.pairing && course.pairing[side]) || {};
    const r = p.recipe ? bySlug.get(p.recipe) : null;
    return { text: p.text || '', recipe: r || null, href: r ? recipeHref(r.slug) : null };
  };
  return {
    course: course.course,
    label: COURSE_WORDS[course.course] || 'Course',
    dish,
    href: dish ? recipeHref(dish.slug) : null,
    sides: sides.map((r) => ({ recipe: r, href: recipeHref(r.slug) })),
    soft: drink('soft'),
    alcoholic: drink('alcoholic')
  };
}

export function recipeHref(slug) {
  return `#/recipe?r=${encodeURIComponent(slug)}`;
}

export function menuHref(slug, occasion = 'christmas') {
  return `#/menu?o=${encodeURIComponent(occasion)}&m=${encodeURIComponent(slug)}`;
}

/** The diet a whole menu suits, read from its food: what the label promises. Pure. */
export function menuSuits(menu, bySlug = new Map()) {
  const tags = menuSlugs(menu, { drinks: false })
    .map((s) => (bySlug.get(s) || {}).dietary_tags || []);
  if (!tags.length) return [];
  return ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'].filter((t) => tags.every((list) => list.includes(t)));
}
