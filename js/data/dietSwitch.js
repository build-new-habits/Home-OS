// js/data/dietSwitch.js — 04 Oct 2026 v2
// v2: vegan is offered only when something would change. A bought egg and
// cress sandwich or a frozen cheese pizza is one food no rule covers, and
// offering "Vegan" for it would change nothing while saying it had.
// Kitchen rebuild. "Make it vegetarian" / "Make it vegan" in one tap.
//
// ---- Why ----
// Persona trace, 3 Oct 2026: swaps were a nice note under the ingredients,
// but a couple with one vegetarian still had to rewrite the recipe in their
// heads and fix the shopping list by hand. This turns the swap into the
// recipe: ingredients, amounts, nutrition, what you have, the method's
// words and the shopping list all follow.
//
// ---- Rules, not rewrites ----
// Each rule maps one reference food to another, converting items to grams
// where needed (6 chicken thighs = 540 g, so 540 g of tofu). A switch is
// offered only when EVERY ingredient that stops the recipe being vegetarian
// (or vegan) has a rule. A half-switched recipe that still has fish sauce in
// it would be worse than no switch: it would be a lie with a button on it.
//
// Words in the method follow too ("Brown the chicken" -> "Brown the tofu"),
// longest phrases first, so "chicken stock" becomes "vegetable stock" and
// not "tofu stock".

export const DIETS = [
  { value: '', label: 'As written' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' }
];

// from refs -> to ref; words: [find, replace] for the method, longest first.
const VEG_RULES = [
  { from: ['chicken-thigh-boneless', 'chicken-breast-skinless', 'chicken-drumstick'], to: 'tofu-firm', ratio: 0.75, words: [['chicken stock', 'vegetable stock'], ['chicken thighs', 'tofu'], ['chicken breasts', 'tofu'], ['chicken', 'tofu']] },
  { from: ['beef-mince-5-fat', 'beef-mince-20-fat', 'lamb-mince', 'pork-mince', 'turkey-mince'], to: 'lentils-tinned', words: [['beef mince', 'lentils'], ['lamb mince', 'lentils'], ['pork mince', 'lentils'], ['turkey mince', 'lentils'], ['mince', 'lentils'], ['beef', 'lentils'], ['lamb', 'lentils'], ['pork', 'lentils'], ['meatballs', 'lentil balls']] },
  { from: ['bacon-rasher-back'], to: 'mushroom-chestnut', words: [['bacon', 'mushrooms']] },
  { from: ['chorizo'], to: 'butter-beans-tinned', words: [['chorizo', 'butter beans']] },
  { from: ['prawns-cooked'], to: 'tofu-firm', ratio: 0.75, words: [['prawns', 'tofu']] },
  { from: ['cod-fillet', 'sea-bass-fillet', 'salmon-fillet'], to: 'tofu-firm', ratio: 0.75, words: [['fillets', 'tofu slices'], ['salmon', 'tofu'], ['sea bass', 'tofu'], ['cod', 'tofu'], ['the fish', 'the tofu'], ['fish', 'tofu']] },
  { from: ['tuna-tinned-in-spring-water'], to: 'chickpeas-tinned', words: [['tuna', 'chickpeas']] },
  { from: ['anchovy-fillet'], to: 'capers', words: [['anchovies', 'capers']] },
  { from: ['fish-sauce'], to: 'soy-sauce', words: [['fish sauce', 'soy sauce']] },
  { from: ['worcestershire-sauce'], to: 'soy-sauce', words: [['worcestershire sauce', 'soy sauce']] },
  { from: ['stock-chicken'], to: 'stock-vegetable', words: [['chicken stock', 'vegetable stock']] }
];

const VEGAN_RULES = [
  { from: ['honey'], to: 'maple-syrup', words: [['honey', 'maple syrup']] },
  { from: ['milk-whole', 'milk-semi-skimmed', 'milk-skimmed'], to: 'oat-milk', words: [['milk', 'oat milk']] },
  { from: ['double-cream', 'single-cream'], to: 'coconut-cream', words: [['double cream', 'coconut cream'], ['single cream', 'coconut cream'], ['cream', 'coconut cream']] },
  { from: ['butter-block'], to: 'olive-oil', words: [['butter', 'oil']], ratio: 0.8 }
];

// Foods no rule can stand in for. A recipe containing any of them is not
// offered that diet.
const NOT_VEGETARIAN = /chicken|beef|lamb|pork|turkey|bacon|sausage|ham-slice|chorizo|prawn|cod|salmon|sea-bass|tuna|sardine|anchov|mackerel|fish-sauce|worcestershire|stock-chicken/;
const NOT_VEGAN = /^(egg-|milk-|double-cream|single-cream|butter-block|cheddar|mozzarella|parmesan|feta|halloumi|cream-cheese|cottage-cheese|greek-yoghurt|natural-yoghurt|honey|mayonnaise|hot-chocolate-powder|raisin-and-oat-granola)/;

function ruleFor(ref, rules) {
  return rules.find((r) => r.from.includes(ref)) || null;
}

/** Grams for an ingredient, so items can become a weight of something else. */
function gramsOf(ing, refMap) {
  const entry = refMap.get(ing.ref) || {};
  if (ing.unit === 'g') return Number(ing.quantity);
  if (ing.unit === 'item' && Number(entry.grams_per_item) > 0) return Number(ing.quantity) * Number(entry.grams_per_item);
  return null;
}

function convert(ing, rule, refMap) {
  const ratio = rule.ratio || 1;
  // Liquids stay liquids (fish sauce -> soy sauce, ml for ml).
  if (ing.unit === 'ml') return { ...ing, ref: rule.to, quantity: Math.round(Number(ing.quantity) * ratio) };
  const grams = gramsOf(ing, refMap);
  if (grams === null) return { ...ing, ref: rule.to };
  return { ...ing, ref: rule.to, quantity: Math.round(grams * ratio), unit: 'g' };
}

// "coconut milk", "oat milk", "peanut butter" are not the milk or butter
// being swapped, so a word after one of these is left alone.
const NOT_AFTER = '(?<!(?:coconut|oat|almond|peanut|soy|soya|nut|maple|vegetable|tofu) )';

function rewriteWords(text, words) {
  let out = String(text || '');
  for (const [find, replace] of words) {
    out = out.replace(new RegExp(`${NOT_AFTER}\\b${find}\\b`, 'gi'), (match) => (match[0] === match[0].toUpperCase()
      ? replace[0].toUpperCase() + replace.slice(1) : replace));
  }
  return out;
}

function tokensSwapped(text, mapping) {
  return String(text || '').replace(/\{\{ing:([a-z0-9-]+)\}\}/gi, (whole, slug) => (mapping.has(slug) ? `{{ing:${mapping.get(slug)}}}` : whole));
}

/** Which diets this recipe can be switched to. As-written is always first. */
export function dietsFor(recipe) {
  const tags = new Set((recipe && recipe.dietary_tags) || []);
  const refs = ((recipe && recipe.ingredients) || []).map((i) => i.ref);
  const out = [''];
  const vegOk = tags.has('vegetarian') || refs.every((r) => !NOT_VEGETARIAN.test(r) || ruleFor(r, VEG_RULES));
  if (!tags.has('vegetarian') && vegOk && refs.some((r) => NOT_VEGETARIAN.test(r))) out.push('vegetarian');
  const veganOk = vegOk && refs.every((r) => (!NOT_VEGAN.test(r) || ruleFor(r, VEGAN_RULES)) && (!NOT_VEGETARIAN.test(r) || ruleFor(r, VEG_RULES)));
  const somethingChanges = refs.some((r) => NOT_VEGAN.test(r) || NOT_VEGETARIAN.test(r));
  if (!tags.has('vegan') && veganOk && somethingChanges) out.push('vegan');
  return out;
}

/**
 * The recipe, switched. Returns null when that diet is not on offer.
 * @returns {{ recipe: object, changes: Array<{ from: string, to: string }> } | null}
 */
export function switchRecipe(recipe, diet, refMap = new Map()) {
  if (!diet) return { recipe, changes: [] };
  if (!dietsFor(recipe).includes(diet)) return null;
  const rules = diet === 'vegan' ? [...VEG_RULES, ...VEGAN_RULES] : VEG_RULES;
  const mapping = new Map();
  const words = [];
  const changes = [];
  const merged = new Map();
  for (const ing of recipe.ingredients || []) {
    const rule = ruleFor(ing.ref, rules);
    const next = rule ? convert(ing, rule, refMap) : { ...ing };
    if (rule) {
      mapping.set(ing.ref, rule.to);
      words.push(...rule.words);
      changes.push({ from: ing.ref, to: rule.to });
    }
    // Two things becoming tofu (chicken and prawns) are one line of tofu.
    const key = `${next.ref}|${next.unit}`;
    if (merged.has(key)) merged.get(key).quantity += Number(next.quantity) || 0;
    else merged.set(key, { ...next, quantity: Number(next.quantity) || 0 });
  }
  words.sort((a, b) => b[0].length - a[0].length);
  const label = diet === 'vegan' ? 'vegan' : 'vegetarian';
  const tags = new Set(recipe.dietary_tags || []);
  tags.add('vegetarian');
  if (diet === 'vegan') { tags.add('vegan'); tags.add('dairy_free'); }
  // Soy sauce standing in for fish sauce has wheat in it. Tamari would not,
  // but the recipe now says soy sauce, so it no longer claims gluten free.
  if (changes.some((c) => c.to === 'soy-sauce')) tags.delete('gluten_free');
  const switched = {
    ...recipe,
    slug: recipe.slug ? `${recipe.slug}--${label}` : null,
    source_slug: recipe.slug || null,
    diet,
    name: `${rewriteWords(recipe.name, words)} (${label})`,
    dietary_tags: [...tags],
    ingredients: [...merged.values()],
    steps: (recipe.steps || []).map((s) => ({
      ...s,
      instruction: rewriteWords(tokensSwapped(s.instruction, mapping), words),
      note: s.note ? rewriteWords(s.note, words) : s.note
    })),
    method_note: [recipe.method_note ? rewriteWords(recipe.method_note, words) : null,
      'Switched for you: tofu, beans and lentils need less cooking than meat or fish, so they are done once hot through.']
      .filter(Boolean).join(' '),
    swaps: []
  };
  return { recipe: switched, changes };
}

export function dietFromHash(hash) {
  const match = String(hash || '').match(/[?&]diet=(vegetarian|vegan)\b/);
  return match ? match[1] : '';
}
