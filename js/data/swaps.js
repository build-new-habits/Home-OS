// js/data/swaps.js — 03 Oct 2026 v2
// v2: the how-to is about the food you HAVE, and saucy, mixed dishes come
// first: tofu suits a curry or a stir fry better than a roast.
// Kitchen rebuild. "Use it instead of…": what a food near its date could
// stand in for, so a recipe you would not have looked at becomes a way to
// use it up.
//
// ---- How it works ----
// Each group is foods that do the same JOB in a dish. When one of them is
// worth using up, every library recipe that calls for another member of
// its group is a candidate, with a one-line tip on how to make the swap.
// So firm tofu near its date surfaces the chicken curry with "Use the tofu
// instead of the chicken: press it, cube it, brown it first."
//
// ---- What it never does ----
// It never claims a swap is identical, and it never changes a recipe. It
// is an idea on the item's sheet, nothing more. Swaps are deliberately
// conservative: a group exists only where the substitution is ordinary
// home cooking, not a stretch.

export const SWAP_GROUPS = [
  {
    id: 'protein-pieces',
    foods: ['chicken-breast-skinless', 'chicken-thigh-boneless', 'turkey-mince', 'tofu-firm', 'halloumi', 'prawns-cooked', 'chickpeas-tinned'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. Brown it first if it is tofu or halloumi; add prawns and chickpeas near the end.`
  },
  {
    id: 'mince',
    foods: ['beef-mince-5-fat', 'beef-mince-20-fat', 'pork-mince', 'lamb-mince', 'turkey-mince', 'lentils-red-dry', 'lentils-tinned'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. Lentils need a little more liquid and less time.`
  },
  {
    id: 'white-fish',
    foods: ['cod-fillet', 'sea-bass-fillet', 'salmon-fillet'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}, cooked the same way.`
  },
  {
    id: 'beans',
    foods: ['chickpeas-tinned', 'kidney-beans-tinned', 'cannellini-beans-tinned', 'butter-beans-tinned', 'black-beans-tinned', 'lentils-tinned'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}, tin for tin.`
  },
  {
    id: 'leaves',
    foods: ['spinach', 'kale', 'cabbage-white'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. Tougher leaves need a few minutes longer.`
  },
  {
    id: 'soft-veg',
    foods: ['courgette', 'aubergine', 'pepper-bell', 'mushroom-chestnut', 'broccoli-head', 'cauliflower-head', 'green-beans'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}, cut to a similar size.`
  },
  {
    id: 'roots',
    foods: ['potato-medium', 'sweet-potato', 'parsnip', 'carrot-medium', 'butternut-squash', 'beetroot'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. Cut it to the same size so it cooks in the same time.`
  },
  {
    id: 'creamy',
    foods: ['greek-yoghurt', 'natural-yoghurt', 'double-cream', 'single-cream', 'cream-cheese', 'coconut-cream', 'cottage-cheese'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. Stir yoghurt in off the heat so it does not split.`
  },
  {
    id: 'cheese',
    foods: ['cheddar-cheese', 'mozzarella', 'parmesan', 'feta', 'halloumi'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}. It will taste different, and that is fine.`
  },
  {
    id: 'herbs',
    foods: ['fresh-basil', 'fresh-parsley', 'fresh-coriander'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}.`
  },
  {
    id: 'soft-fruit',
    foods: ['strawberries', 'blueberries', 'raspberries', 'banana-medium', 'mango', 'pear', 'apple-medium'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}.`
  },
  {
    id: 'bread',
    foods: ['bread-white-sliced-loaf', 'bread-slice-medium', 'wholemeal-bread-slice', 'pitta-bread', 'tortilla-wrap', 'naan-bread', 'bagel-plain'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}.`
  },
  {
    id: 'milk',
    foods: ['milk-whole', 'milk-semi-skimmed', 'milk-skimmed', 'oat-milk', 'almond-milk'],
    tip: (have, instead) => `Use the ${have} instead of the ${instead}.`
  }
];

// How to cook the thing you have when it stands in. Keyed by what you have,
// because that is the food the person is holding.
const HOW = {
  'tofu-firm': 'Press it, cut it into cubes and brown it before the sauce goes in.',
  'halloumi': 'Slice it and brown it in a dry pan first; it needs no extra salt.',
  'prawns-cooked': 'Stir them in for the last two or three minutes so they stay tender.',
  'chickpeas-tinned': 'Drain them and add them with the sauce.',
  'chicken-breast-skinless': 'Cut it small and cook it through before the sauce goes in.',
  'chicken-thigh-boneless': 'Cut it small and cook it through before the sauce goes in.',
  'turkey-mince': 'Brown it well first; it is leaner, so add a little oil.',
  'lentils-red-dry': 'Rinse them and add them with a little extra water; they cook in about 20 minutes.',
  'lentils-tinned': 'Drain them and stir them in near the end.'
};

// Dishes where one thing can stand in for another without anyone noticing.
const MIXED = /curry|stir|fry|chilli|bowl|wrap|noodle|salad|taco|fajita|pasta|stew|soup|traybake|bake|rice|risotto|hash|pie/i;

function words(name) {
  // "Chicken thigh, boneless" -> "chicken thigh"; "Tofu, firm" -> "firm tofu"
  const parts = String(name || '').split(',').map((p) => p.trim()).filter(Boolean);
  const plain = parts.length === 2 ? `${parts[1]} ${parts[0]}` : (parts[0] || '');
  return plain.toLowerCase();
}

/**
 * Recipes that use this food as written, and recipes it could stand in for.
 *
 * @param {string} slug  the reference slug of the food worth using up
 * @param {object[]} recipes  library recipes
 * @param {Map} referenceMap  slug -> reference entry, for names
 * @returns {{ uses: object[], swaps: Array<{ recipe: object, instead: string, tip: string }> }}
 */
export function ideasFor(slug, recipes = [], referenceMap = new Map()) {
  if (!slug) return { uses: [], swaps: [] };
  const uses = recipes.filter((r) => (r.ingredients || []).some((i) => i.ref === slug));
  const usedSlugs = new Set(uses.map((r) => r.slug));
  const have = words((referenceMap.get(slug) || {}).name || slug.replace(/-/g, ' '));

  const swaps = [];
  for (const group of SWAP_GROUPS) {
    if (!group.foods.includes(slug)) continue;
    for (const recipe of recipes) {
      if (usedSlugs.has(recipe.slug)) continue;
      const partner = (recipe.ingredients || []).find((i) => i.ref !== slug && group.foods.includes(i.ref));
      if (!partner) continue;
      const instead = words((referenceMap.get(partner.ref) || {}).name || partner.ref.replace(/-/g, ' '));
      const how = HOW[slug];
      const tip = how ? `Use the ${have} instead of the ${instead}. ${how}` : group.tip(have, instead);
      swaps.push({ recipe, instead, tip, mixed: MIXED.test(recipe.name) });
      usedSlugs.add(recipe.slug);
    }
  }
  // Mixed dishes first, then by name, so the best ideas lead.
  swaps.sort((a, b) => Number(b.mixed) - Number(a.mixed) || a.recipe.name.localeCompare(b.recipe.name));
  return { uses, swaps };
}
