// js/data/shelves.js — 04 Oct 2026 v1
// Kitchen rebuild. What KIND of thing a food is: Dairy, Meat, Fish, Fruit,
// Veg, Tinned, Dried, Baking, Snacks, Drinks…
//
// ---- Why ----
// Graeme, 4 Oct 2026: "Is location important? I think not. But categories
// are." Where a jar sits is something you already know; what you have of
// each kind is what you look up. The old foods.category (fresh, frozen,
// cupboard, drink…) was too coarse for that: "Fresh food" holds the milk,
// the chicken and the apples.
//
// ---- How a food gets its shelf, in order ----
//   1. You chose one (foods.shelf once migration 026 is in; kept on this
//      phone until then).
//   2. The reference file says (data/food_reference.json `shelf`).
//   3. Its name says ("smoked haddock" is fish, "oat milk" is a drink).
//   4. Its old category ("Frozen food" is frozen, "Household" is household).
//   5. Other.
// Nothing asks you to file anything: things bought from the list arrive
// already sorted, and every one can be changed.

export const SHELVES = [
  { value: 'fruit', label: 'Fruit' },
  { value: 'veg', label: 'Veg' },
  { value: 'meat', label: 'Meat' },
  { value: 'fish', label: 'Fish' },
  { value: 'dairy', label: 'Dairy and eggs' },
  { value: 'bread', label: 'Bread and bakery' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'tinned', label: 'Tins and jars' },
  { value: 'dried', label: 'Pasta, rice and dried' },
  { value: 'baking', label: 'Baking' },
  { value: 'spices', label: 'Herbs and spices' },
  { value: 'sauces', label: 'Oils and sauces' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'household', label: 'Household' },
  { value: 'personal', label: 'Personal care' },
  { value: 'pet', label: 'Pet' },
  { value: 'other', label: 'Other' }
];

const VALUES = new Set(SHELVES.map((s) => s.value));
const ORDER = new Map(SHELVES.map((s, i) => [s.value, i]));

export function isShelf(value) { return VALUES.has(value); }
export function shelfLabel(value) { return (SHELVES.find((s) => s.value === value) || SHELVES[SHELVES.length - 1]).label; }
export function shelfRank(value) { return ORDER.has(value) ? ORDER.get(value) : ORDER.size; }

// ---- 3. From the name ---------------------------------------------------
// First match wins, so the specific comes before the general: "coconut
// milk" is tinned before "milk" is dairy; "peanut butter" is a spread
// before "butter" is dairy; "toilet roll" is household before "roll" is bread.
const RULES = [
  ['veg', /\b(butternut|cherry tomato|lemongrass)/i],
  ['frozen', /\b(frozen|ice cream|fish fingers|oven chips)\b/i],
  ['household', /\b(toilet roll|kitchen roll|bin bags|washing|detergent|bleach|cleaner|scourer|kitchen sponge|tin foil|foil|cling film|baking paper|dishwasher|light bulb|batter(y|ies)|fabric conditioner)/i],
  ['personal', /\b(shampoo|toothpaste|shower gel|deodorant|razor|soap|moisturiser|sun cream|plasters|paracetamol)/i],
  ['spices', /\b(cumin|coriander, ground|ground coriander|turmeric|paprika|chilli powder|cinnamon|garam masala|curry powder|oregano|thyme|bay lea|nutmeg|mixed herbs|black pepper|salt|stock|spice)/i],
  ['sauces', /\b(lemon juice|lime juice|vinegar)\b/i],
  ['dried', /\b(dry|dried)\b/i],
  ['tinned', /\b(tinned|canned|baked beans|coconut milk|coconut cream|chopped tomatoes|passata|tomato pur[eé]e|sweetcorn|chickpeas|kidney beans|butter beans|cannellini|black beans|olives|capers|jam|marmite|peanut butter|tahini|pesto|honey|hummus)\b/i],
  ['drinks', /\b(juice|squash|cola|lemonade|beer|lager|wine|cider|sparkling water|tea bags?|coffee|hot chocolate|oat milk|almond milk|soya milk|smoothie|water)\b/i],
  ['sauces', /\b(oil|vinegar|soy sauce|fish sauce|worcestershire|ketchup|mayonnaise|mustard|sauce|curry paste|gochujang|miso|harissa|syrup)\b/i],
  ['baking', /\b(flour|sugar|baking powder|bicarbonate|yeast|vanilla|cocoa|icing|cornflour|desiccated coconut|chocolate chips|dark chocolate)\b/i],
  ['dried', /\b(rice|pasta|spaghetti|penne|noodles|couscous|quinoa|oats|barley|lentils|breadcrumbs|granola|cereal|raisins|dates)\b/i],
  ['fish', /\b(fish|salmon|cod|haddock|tuna|sardine|mackerel|prawn|anchov|sea bass|trout|crab|mussels)/i],
  ['meat', /\b(chicken|beef|lamb|pork|turkey|mince|bacon|sausage|ham|chorizo|steak|duck|gammon|salami)/i],
  ['dairy', /\b(milk|cheese|cheddar|mozzarella|parmesan|feta|halloumi|yoghurt|yogurt|butter|cream|egg|eggs)\b/i],
  ['bread', /\b(bread|bagel|pitta|tortilla|wrap|naan|crumpet|roll|croissant|loaf)\b/i],
  ['snacks', /\b(crisps|biscuit|chocolate|nuts|almonds|cashews|walnuts|peanuts|seeds|popcorn|crackers|cereal bar|flapjack)\b/i],
  ['veg', /\b(onion|garlic|carrot|potato|pepper|courgette|aubergine|tomato|leek|celery|mushroom|broccoli|cauliflower|cabbage|cucumber|parsnip|beetroot|squash|beans|peas|spinach|kale|lettuce|chilli|ginger|shallot|pak choi|beansprout|basil|parsley|coriander|mint|kimchi|edamame|tofu)/i],
  ['fruit', /\b(apple|banana|orange|lemon|lime|grape|pear|kiwi|mango|pineapple|berr|strawberr|blueberr|raspberr|melon|peach|plum|avocado|cherr)/i],
  ['pet', /\b(cat|dog|guinea pig|pet|litter|hay)\b/i]
];

export function shelfFromName(name) {
  const text = String(name || '');
  for (const [shelf, pattern] of RULES) if (pattern.test(text)) return shelf;
  return null;
}

// ---- 4. From the old category --------------------------------------------
const FROM_CATEGORY = { food_frozen: 'frozen', drink: 'drinks', household: 'household', home: 'household', personal: 'personal', pet: 'pet' };

// ---- 1. Your own choice, on this phone until migration 026 ----------------
const LOCAL_KEY = 'home-os-shelf-choices';

function readLocal() {
  try { return JSON.parse(globalThis.localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; }
}

export function localShelfChoice(foodId) {
  const map = readLocal();
  return foodId && isShelf(map[foodId]) ? map[foodId] : null;
}

export function rememberShelfChoice(foodId, shelf) {
  try {
    const map = readLocal();
    if (shelf) map[foodId] = shelf; else delete map[foodId];
    globalThis.localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
    return true;
  } catch { return false; }
}

/**
 * The shelf for a food row (with id, name, category, and shelf once 026
 * is in). `referenceIndex` maps a normalised name or alias to a reference
 * entry that may carry `shelf`.
 */
export function shelfOf(food, referenceIndex = null) {
  if (!food) return 'other';
  if (isShelf(food.shelf)) return food.shelf;
  const local = localShelfChoice(food.id);
  if (local) return local;
  if (referenceIndex) {
    const hit = referenceIndex.get(normalise(food.name));
    if (hit && isShelf(hit.shelf)) return hit.shelf;
  }
  // The old category first for frozen and non-food, which the name cannot
  // tell you: frozen peas are frozen, not veg.
  if (food.category === 'food_frozen') return 'frozen';
  if (['household', 'home', 'personal', 'pet'].includes(food.category)) return FROM_CATEGORY[food.category];
  return shelfFromName(food.name) || FROM_CATEGORY[food.category] || 'other';
}

export function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Reference foods as a name/alias index for shelfOf. Pure. */
export function referenceShelfIndex(referenceFoods = []) {
  const index = new Map();
  for (const f of referenceFoods) {
    if (!f || !f.name) continue;
    index.set(normalise(f.name), f);
    const parts = f.name.split(',').map((p) => p.trim());
    if (parts.length === 2) index.set(normalise(`${parts[1]} ${parts[0]}`), f);
    for (const a of f.aliases || []) if (!index.has(normalise(a))) index.set(normalise(a), f);
  }
  return index;
}

/** Rows grouped by shelf, in shelf order. `foodOf(row)` gives the food. */
export function groupByShelf(rows = [], foodOf = (r) => r.foods || r, referenceIndex = null) {
  const map = new Map();
  for (const row of rows) {
    const shelf = shelfOf(foodOf(row), referenceIndex);
    if (!map.has(shelf)) map.set(shelf, []);
    map.get(shelf).push(row);
  }
  return [...map.entries()]
    .sort((a, b) => shelfRank(a[0]) - shelfRank(b[0]))
    .map(([shelf, items]) => ({ shelf, label: shelfLabel(shelf), items }));
}
