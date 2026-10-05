// js/data/plate.js — 05 Oct 2026 v1
// v1: Make a plate. Pick what goes on it; the nutrition adds up as you go.
//
// Graeme, 5 Oct 2026: "Do we have boiled eggs and crudités of raw carrots,
// mangetout, baby corn, spinach leaves? Basically a collection of different
// ingredients ... the option of being able to compile a concoction of
// crudités."
//
// A plate is not cooked, so writing it as a recipe (names, amounts, steps)
// is a form about lunch. Here it is ticks: each thing has an everyday
// portion ("1 carrot", "2 tablespoons of hummus"), you choose how many, and
// Save turns it into one of your meals through the same path as Write your
// own recipe (ownRecipe.saveDraft). From there it plans, shops and counts
// like any other meal.

/**
 * Everyday portions. `qty` and `unit` are one portion as stored; `each` is
 * the word for one item, `say` overrides the amount wording for a gram
 * portion ("2 tablespoons").
 */
export const PLATE_GROUPS = [
  {
    title: 'Vegetables',
    items: [
      { ref: 'carrot-medium', label: 'Carrot sticks', qty: 1, unit: 'item', each: 'carrot' },
      { ref: 'cucumber', label: 'Cucumber sticks', qty: 80, unit: 'g' },
      { ref: 'celery-stick', label: 'Celery', qty: 1, unit: 'item', each: 'stick' },
      { ref: 'pepper-bell', label: 'Pepper strips', qty: 80, unit: 'g', say: 'half a pepper' },
      { ref: 'cherry-tomato', label: 'Cherry tomatoes', qty: 5, unit: 'item', each: 'tomato' },
      { ref: 'mangetout', label: 'Mangetout', qty: 50, unit: 'g' },
      { ref: 'sugar-snap-peas', label: 'Sugar snap peas', qty: 50, unit: 'g' },
      { ref: 'baby-corn', label: 'Baby corn', qty: 5, unit: 'item', each: 'cob' },
      { ref: 'radish', label: 'Radishes', qty: 4, unit: 'item', each: 'radish' },
      { ref: 'spinach', label: 'Baby spinach leaves', qty: 30, unit: 'g', say: 'a handful' }
    ]
  },
  {
    title: 'Eggs, meat, fish and cheese',
    items: [
      { ref: 'eggs-boiled', label: 'Boiled egg', qty: 1, unit: 'item', each: 'egg' },
      { ref: 'chicken-breast-roast', label: 'Cooked chicken', qty: 60, unit: 'g' },
      { ref: 'ham-sliced', label: 'Ham', qty: 2, unit: 'item', each: 'slice' },
      { ref: 'salami', label: 'Salami', qty: 4, unit: 'item', each: 'slice' },
      { ref: 'smoked-salmon', label: 'Smoked salmon', qty: 50, unit: 'g' },
      { ref: 'cheddar-cheese', label: 'Cheddar cubes', qty: 30, unit: 'g', say: 'a small handful' },
      { ref: 'mini-cheese', label: 'Mini cheese', qty: 1, unit: 'item', each: 'cheese' },
      { ref: 'feta', label: 'Feta', qty: 30, unit: 'g' },
      { ref: 'falafel', label: 'Falafel', qty: 3, unit: 'item', each: 'falafel' },
      { ref: 'edamame-frozen', label: 'Edamame beans', qty: 50, unit: 'g' }
    ]
  },
  {
    title: 'Dips',
    items: [
      { ref: 'hummus', label: 'Hummus', qty: 30, unit: 'g', say: '2 tablespoons' },
      { ref: 'tzatziki', label: 'Tzatziki', qty: 30, unit: 'g', say: '2 tablespoons' },
      { ref: 'guacamole', label: 'Guacamole', qty: 30, unit: 'g', say: '2 tablespoons' },
      { ref: 'salsa-dip', label: 'Tomato salsa', qty: 30, unit: 'g', say: '2 tablespoons' },
      { ref: 'cream-cheese', label: 'Cream cheese', qty: 30, unit: 'g', say: '2 tablespoons' },
      { ref: 'peanut-butter', label: 'Peanut butter', qty: 15, unit: 'g', say: '1 tablespoon' }
    ]
  },
  {
    title: 'Nibbles and extras',
    items: [
      { ref: 'olives-pitted', label: 'Olives', qty: 30, unit: 'g', say: 'about 8' },
      { ref: 'gherkins', label: 'Gherkins', qty: 2, unit: 'item', each: 'gherkin' },
      { ref: 'pickled-onions', label: 'Pickled onions', qty: 3, unit: 'item', each: 'onion' },
      { ref: 'breadsticks', label: 'Breadsticks', qty: 4, unit: 'item', each: 'breadstick' },
      { ref: 'cream-crackers', label: 'Crackers', qty: 3, unit: 'item', each: 'cracker' },
      { ref: 'oatcakes', label: 'Oatcakes', qty: 2, unit: 'item', each: 'oatcake' },
      { ref: 'pitta-bread', label: 'Pitta, in strips', qty: 1, unit: 'item', each: 'pitta' },
      { ref: 'nuts-mixed', label: 'Mixed nuts', qty: 25, unit: 'g', say: 'a small handful' },
      { ref: 'grapes', label: 'Grapes', qty: 80, unit: 'g', say: 'a small bunch' },
      { ref: 'apple-medium', label: 'Apple slices', qty: 1, unit: 'item', each: 'apple' }
    ]
  }
];

const VEG = new Set(PLATE_GROUPS[0].items.map((i) => i.ref));
const PLURAL = { radish: 'radishes', tomato: 'tomatoes', 'pitta': 'pittas' };

function plural(word, n) {
  if (n === 1) return word;
  return PLURAL[word] || `${word}s`;
}

/** Every plate item by ref. */
export function plateItems() {
  return new Map(PLATE_GROUPS.flatMap((g) => g.items).map((i) => [i.ref, i]));
}

/**
 * The amount of `portions` of an item, in words. Pure.
 *   carrot ×2      -> "2 carrots"
 *   hummus ×1      -> "2 tablespoons (30 g)"
 *   hummus ×2      -> "60 g"
 *   cucumber ×1    -> "80 g"
 */
export function amountWords(item, portions = 1) {
  const n = Number(portions) || 1;
  if (item.unit === 'item') {
    const count = item.qty * n;
    return `${count} ${plural(item.each || 'item', count)}`;
  }
  const grams = Math.round(item.qty * n);
  return n === 1 && item.say ? `${item.say} (${grams} g)` : `${grams} g`;
}

/** A portion for something typed in: the reference's own portion, else 50 g. Pure. */
export function extraItem(entry) {
  if (!entry || !entry.slug) return null;
  const perItem = Number(entry.grams_per_item);
  const portion = Number(entry.portion_g);
  if (entry.item_label && perItem > 0 && perItem <= 150) {
    return { ref: entry.slug, label: entry.name, qty: 1, unit: 'item', each: entry.item_label };
  }
  return { ref: entry.slug, label: entry.name, qty: portion > 0 && portion <= 300 ? portion : 50, unit: 'g' };
}

/**
 * The plate as a library-shaped recipe for one, so recipeNutrition can add
 * it up. `chosen` is [{ item, portions }]. Pure.
 */
export function plateRecipe(chosen = [], name = 'Your plate') {
  return {
    slug: null,
    name,
    default_serves: 1,
    ingredients: chosen.map(({ item, portions }) => ({ ref: item.ref, quantity: item.qty * (Number(portions) || 1), unit: item.unit }))
  };
}

/**
 * The plate as an ownRecipe draft, ready for saveDraft. Ingredient names
 * are the reference names, so they resolve to the reference's figures.
 * Pure.
 */
export function plateDraft(chosen = [], { name = 'My plate', kind = 'lunch', refMap = new Map() } = {}) {
  const ingredients = chosen.map(({ item, portions }, i) => {
    const entry = refMap.get(item.ref);
    return {
      key: `plate-${i}`,
      name: entry ? entry.name : item.label,
      quantity: String(item.qty * (Number(portions) || 1)),
      unit: item.unit,
      swaps: []
    };
  });
  const steps = [];
  if (chosen.some(({ item }) => VEG.has(item.ref))) {
    steps.push({ key: 'plate-s1', instruction: 'Wash the vegetables and cut them into sticks.', minutes: '' });
  }
  steps.push({ key: 'plate-s2', instruction: 'Put everything on a plate or in a box, with any dips in small pots.', minutes: '' });
  return {
    mealId: null,
    name: String(name || '').trim() || 'My plate',
    kind,
    course: 'main',
    serves: 1,
    tags: [],
    note: '',
    ingredients,
    steps
  };
}
