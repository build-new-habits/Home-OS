// js/lib/shortfall.js — 01 Sep 2026 v5
// What you need, minus what you already have.
//
// This is principle 5 made real: the shopping list diffs the meal plan
// against the pantry automatically. If it makes you open a cupboard and
// then edit the list, it has failed however complete it looks.
//
// ---- Pure, and deliberately so ----
// Rows in, rows out. No database, no fetching. The maths spans plan,
// ingredients and pantry — three domains — so it cannot live in any one
// data module without one importing another. The VIEW orchestrates; this
// file does arithmetic that can be checked against a hand calculation.
//
// ---- The rules, and why ----
// 1. A food with enough stock does NOT appear. That is the whole difference
//    between a shopping list and an inventory printout.
// 2. No pantry row means ZERO, not unknown. You do not have it, so you need
//    all of it. This is the one place in the app where absent data is read
//    as zero — the opposite of the macro rule — and it is safe because
//    "buy something you already had" is a smaller failure than "run out".
// 3. An amount of NULL means "not recorded", which is NOT zero. Guessing
//    zero would rebuy a cupboard you have already filled; guessing "enough"
//    would leave you short. It is listed AND flagged, and the flag says so.
// 4. Never convert without a recorded factor. Water is 1 g/ml, oil about
//    0.92, flour is neither. Where a unit cannot be reached, the full
//    required amount is listed and the line says why. Over-buying is the
//    right direction to fail, but only if the user is told.
// 5. Anything past its use-by is not stock. It cannot be cooked with, so
//    counting it would leave you short at the point of cooking.

import { toGrams } from '../data/meals.js';
import { freshness, effectiveLevel } from '../data/pantry.js';

/**
 * computeShortfall({ plan, ingredients, pantry, foods, todayISO })
 *
 * plan        weekly_meal_plan rows, each with `meals` embedded
 * ingredients meal_ingredients rows, each with `foods` embedded
 * pantry      pantry_stock rows, each with `foods` embedded
 * foods       every foods row, for names and conversion factors
 *
 * Returns { items, skipped } where each item is:
 *   { food, needed, unit, have, shortfall, comparable, reason, expired }
 */
export function computeShortfall({
  plan = [], ingredients = [], pantry = [], foods = [], todayISO,
  // Phase 20. Passed in so the list scales to who is actually eating: two
  // adults on the sea bass, two children at 0.6 on the sausages. Default
  // empty keeps the pre-Phase-20 behaviour exactly.
  householdMembers = []
} = {}) {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const ingredientsByMeal = new Map();
  for (const row of ingredients) {
    // Phase 19: only the SELECTED option reaches the shop. Otherwise
    // planning one build-your-own lunch adds five things to your list,
    // four of which you decided against.
    if (row.option_group != null && row.is_selected === false) continue;
    if (!ingredientsByMeal.has(row.meal_id)) ingredientsByMeal.set(row.meal_id, []);
    ingredientsByMeal.get(row.meal_id).push(row);
  }

  // ---- What the week needs, in grams where possible ----
  const needed = new Map(); // food_id -> { grams, raw: Map(unit -> amount), unreachable: [] }
  const skipped = [];

  for (const entry of plan) {
    const meal = entry.meals || entry.meal || {};
    const rows = ingredientsByMeal.get(entry.meal_id) || [];
    if (rows.length === 0) continue;

    const defaultServes = Number(meal.default_serves);
    // GUARD BEFORE DIVIDING. default_serves is NOT NULL DEFAULT 4, but a
    // zero would yield Infinity and silently poison the entire list.
    if (!Number.isFinite(defaultServes) || defaultServes <= 0) {
      skipped.push({ meal: meal.name || 'A meal', reason: 'its usual servings are not a usable number' });
      continue;
    }
    const serves = servesForEntry(entry, defaultServes, householdMembers);
    const scale = serves / defaultServes;

    for (const row of rows) {
      const food = row.foods || foodById.get(row.food_id) || {};
      if (!food.id) continue;
      if (!needed.has(food.id)) {
        needed.set(food.id, { grams: 0, raw: new Map(), unreachable: [], units: new Set() });
      }
      const bucket = needed.get(food.id);
      const quantity = Number(row.quantity_g) * scale;
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      // toGrams returns { grams, reason } — grams is NULL when it cannot
      // convert. There is no `ok` field; assuming one would have made every
      // conversion look like a failure and listed the whole plan.
      const grams = toGrams(quantity, row.unit || 'g', food);
      if (grams && grams.grams != null) {
        bucket.units.add(row.unit || 'g');
        bucket.grams += grams.grams;
      } else {
        // Cannot reach grams. Kept in its own unit so the amount is still
        // usable, and the reason travels with it rather than being invented
        // again at render time.
        const unit = row.unit || 'g';
        bucket.raw.set(unit, (bucket.raw.get(unit) || 0) + quantity);
        const reason = (grams && grams.reason) || 'that unit cannot be converted';
        if (!bucket.unreachable.includes(reason)) bucket.unreachable.push(reason);
      }
    }
  }

  // ---- What the cupboards hold ----
  const stockByFood = new Map();
  for (const row of pantry) {
    // Rule 5: past its use-by is not stock. Counting it would leave you
    // short at the point of actually cooking.
    const fresh = freshness(row, todayISO);
    stockByFood.set(row.food_id, { row, expired: fresh.state === 'past' });
  }

  const items = [];
  for (const [foodId, bucket] of needed.entries()) {
    const food = foodById.get(foodId) || { id: foodId, name: 'Unknown' };
    const stock = stockByFood.get(foodId);

    // Everything the plan needs for this food, expressed once.
    const rawEntries = [...bucket.raw.entries()];
    const wantsGrams = bucket.grams > 0;

    // The simple, common case: everything reduces to grams.
    if (wantsGrams && rawEntries.length === 0) {
      const have = stockInGrams(stock, food);
      // ---- Shop in the unit you BUY in ----
      // The comparison is done in grams because that is the only common
      // ground. But "206 g of milk" is not a thing you can pick off a
      // shelf. Where every ingredient for this food used one unit, the
      // answer is converted back into it. Arithmetic in grams, shopping in
      // millilitres.
      const display = displayUnitFor(bucket, food);
      if (have.comparable) {
        const short = round2(bucket.grams - have.grams);
        // Rule 1: enough stock, no line at all.
        if (short <= 0) continue;
        items.push(makeItem(food, bucket.grams / display.factor, display.unit,
          { comparable: true, amount: have.grams / display.factor },
          short / display.factor, true, '', stock));
      } else {
        // Rule 3/4: cannot compare, so list the full requirement and say why.
        items.push(makeItem(food, bucket.grams / display.factor, display.unit, have,
          bucket.grams / display.factor, false, have.reason, stock));
      }
      continue;
    }

    // Mixed or unconvertible units. Each unit is listed on its own terms;
    // nothing is added across units that cannot be compared.
    for (const [unit, amount] of rawEntries) {
      const have = stockInUnit(stock, unit);
      const short = have.comparable ? round2(amount - have.amount) : round2(amount);
      if (have.comparable && short <= 0) continue;
      const reason = have.comparable ? '' : (have.reason || bucket.unreachable[0] || '');
      items.push(makeItem(food, amount, unit, have, short, have.comparable, reason, stock));
    }
    if (wantsGrams) {
      const have = stockInGrams(stock, food);
      const short = have.comparable ? round2(bucket.grams - have.grams) : round2(bucket.grams);
      if (!(have.comparable && short <= 0)) {
        items.push(makeItem(food, bucket.grams, 'g', have, short, have.comparable, have.reason, stock));
      }
    }
  }

  items.sort((a, b) => (a.food.name || '').localeCompare(b.food.name || ''));
  return { items, skipped };
}

/**
 * The unit to SHOW a food's requirement in, and the grams-per-that-unit.
 *
 * Only when every ingredient row for this food agreed on one unit. Mixed
 * units have no single honest display, so those fall back to grams.
 */
function displayUnitFor(bucket, food) {
  if (bucket.units.size !== 1) return { unit: 'g', factor: 1 };
  const [unit] = [...bucket.units];
  if (unit === 'g') return { unit: 'g', factor: 1 };
  const factor = unit === 'ml' ? Number(food.grams_per_ml) : Number(food.grams_per_item);
  // No factor means it never reached grams in the first place, so this
  // branch is unreachable — but guarded rather than trusted.
  if (!Number.isFinite(factor) || factor <= 0) return { unit: 'g', factor: 1 };
  return { unit, factor };
}

/**
 * Servings for one plan entry.
 *
 * Order matters. serves_override wins outright — it is the manual escape
 * hatch and nothing here may quietly overrule it. Then the people it is
 * planned for. Only then the meal's own default.
 *
 * Empty member_ids means everyone, so an unnamed entry scales to the whole
 * household without anyone having had to say so.
 */
function servesForEntry(entry, fallback, householdMembers = []) {
  const override = Number(entry.serves_override);
  if (Number.isFinite(override) && override > 0) return override;
  if (householdMembers.length === 0) return fallback;

  const ids = entry.member_ids || [];
  const eating = ids.length === 0
    ? householdMembers
    : householdMembers.filter((m) => ids.includes(m.id));
  if (eating.length === 0) return fallback;

  const total = eating.reduce((sum, m) => {
    const factor = Number(m.portion_factor);
    // A null portion must never silently shrink the shop.
    return sum + (Number.isFinite(factor) && factor > 0 ? factor : 1);
  }, 0);
  return Math.max(1, Math.ceil(total * 2) / 2);
}

function makeItem(food, needed, unit, have, shortfall, comparable, reason, stock) {
  // `have` may describe grams, a raw unit, or a converted display unit.
  // One accessor, so a converted unit cannot silently read as zero — which
  // is what "150 ml — none in the pantry" was, with 50 ml on the shelf.
  const held = have.comparable
    ? (have.amount !== undefined ? have.amount : have.grams)
    : null;
  return {
    food,
    needed: round2(needed),
    unit,
    have: held == null ? null : round2(held),
    shortfall: round2(shortfall),
    comparable,
    reason: reason || '',
    // Surfaced so the line can say "you have some, but it is out of date"
    // rather than silently listing it as if the cupboard were empty.
    expired: Boolean(stock && stock.expired),
    amountUnrecorded: Boolean(stock && stock.row && stock.row.current_qty == null)
  };
}

/** Pantry stock reduced to grams, or an honest refusal. */

/**
 * Phase 31. A rough level, read as an answer to "have I got enough".
 *
 * Only consulted when there is no number — precision beats approximation
 * when both exist. Returns null when nothing was said, which keeps the
 * existing "recorded as present, amount unknown" behaviour intact.
 *
 *   plenty -> treat as enough. Not a quantity, a verdict.
 *   low    -> treat as present but not enough, so it reaches the list.
 *   none   -> treat as absent.
 */
function levelVerdict(row) {
  if (!row || row.current_qty != null) return null;
  // Phase 31 part three. A stale level returns null here, which drops
  // through to the existing "amount was never recorded" path — present but
  // not countable. It does NOT become zero.
  const level = effectiveLevel(row);
  if (level === 'plenty') return { comparable: true, enough: true, reason: '' };
  if (level === 'low') {
    return { comparable: true, enough: false, reason: 'you said you were running low' };
  }
  if (level === 'none') {
    return { comparable: true, enough: false, reason: 'you said you had none left' };
  }
  return null;
}

function stockInGrams(stock, food) {
  if (!stock) return { comparable: true, grams: 0, reason: '' };   // rule 2
  if (stock.expired) return { comparable: true, grams: 0, reason: '' }; // rule 5
  const row = stock.row;
  const rough = levelVerdict(row);
  if (rough) {
    // A rough level is a real answer. "Plenty" is reported as comparable
    // and enough, which is what stops the list asking for things you have.
    return { comparable: true, grams: rough.enough ? Number.MAX_SAFE_INTEGER : 0, reason: rough.reason, rough: true };
  }
  if (row.current_qty == null) {
    // rule 3 — recorded as present, amount unknown. NOT zero, NOT enough.
    return { comparable: false, grams: 0, reason: 'you have some, but the amount was never recorded' };
  }
  const converted = toGrams(Number(row.current_qty), row.unit || 'g', food);
  if (converted && converted.grams != null) {
    return { comparable: true, grams: converted.grams, reason: '' };
  }
  return {
    comparable: false,
    grams: 0,
    reason: (converted && converted.reason) || `your ${row.unit} cannot be compared with the recipe's grams`
  };
}

/** Pantry stock in one specific unit, without converting anything. */
function stockInUnit(stock, unit) {
  if (!stock) return { comparable: true, amount: 0, reason: '' };
  if (stock.expired) return { comparable: true, amount: 0, reason: '' };
  const row = stock.row;
  const rough = levelVerdict(row);
  if (rough) {
    return { comparable: true, amount: rough.enough ? Number.MAX_SAFE_INTEGER : 0, reason: rough.reason, rough: true };
  }
  if (row.current_qty == null) {
    return { comparable: false, amount: 0, reason: 'you have some, but the amount was never recorded' };
  }
  if ((row.unit || 'g') !== unit) {
    return {
      comparable: false,
      amount: 0,
      reason: `you have it in ${row.unit}, the recipe asks for ${unit}, and no conversion is recorded`
    };
  }
  return { comparable: true, amount: Number(row.current_qty), reason: '' };
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Whether one recipe's ingredients are in the cupboard right now.
 *
 * The same rules as the shortfall — an unrecorded amount is not zero, and
 * anything past its use-by does not count — but answered per RECIPE, so a
 * meal can say "4 of 6 in stock" before you commit to cooking it.
 *
 * Returns { total, inStock, missing, expiring, unknown } where the three
 * arrays hold food names, so the caller can NAME what is short rather than
 * making the user go and look.
 */
export function stockForMeal({ ingredients = [], pantry = [], foods = [], serves, defaultServes, todayISO } = {}) {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const stockByFood = new Map(pantry.map((row) => [row.food_id, row]));

  const base = Number(defaultServes);
  const wanted = Number(serves);
  const scale = Number.isFinite(base) && base > 0 && Number.isFinite(wanted) && wanted > 0
    ? wanted / base
    : 1;

  const missing = [];
  const expiring = [];
  const unknown = [];
  let inStock = 0;

  for (const row of ingredients) {
    const food = row.foods || foodById.get(row.food_id) || {};
    const name = food.name || 'Something';
    const stock = stockByFood.get(row.food_id);

    if (!stock) { missing.push(name); continue; }

    const fresh = freshness(stock, todayISO);
    if (fresh.state === 'past') { expiring.push(name); continue; }

    if (stock.current_qty == null) { unknown.push(name); continue; }

    const needGrams = toGrams(Number(row.quantity_g) * scale, row.unit || 'g', food);
    const haveGrams = toGrams(Number(stock.current_qty), stock.unit || 'g', food);
    if (needGrams.grams == null || haveGrams.grams == null) {
      // No common ground. Counted as unknown rather than guessed either way.
      unknown.push(name);
      continue;
    }
    if (haveGrams.grams >= needGrams.grams) inStock += 1;
    else missing.push(name);
  }

  return { total: ingredients.length, inStock, missing, expiring, unknown };
}

/** The recipe's stock position as one line. */
export function describeStockForMeal(result) {
  if (!result || result.total === 0) return 'No ingredients yet.';
  const bits = [`${result.inStock} of ${result.total} in the pantry`];
  if (result.expiring.length > 0) {
    bits.push(`${result.expiring.length} past its use-by (${result.expiring.join(', ')})`);
  }
  if (result.unknown.length > 0) {
    bits.push(`${result.unknown.length} you have but cannot be counted (${result.unknown.join(', ')})`);
  }
  if (result.missing.length > 0) {
    bits.push(`short of ${result.missing.join(', ')}`);
  }
  return `${bits.join(' · ')}.`;
}

/**
 * A shortfall item as a sentence, for the line under the food's name.
 * Never a bare number, never colour alone.
 */
export function describeShortfall(item) {
  const amount = `${item.shortfall} ${item.unit === 'item' ? (item.shortfall === 1 ? 'item' : 'items') : item.unit}`;
  if (!item.comparable) {
    return `Need ${item.needed} ${item.unit} — ${item.reason}, so the full amount is listed.`;
  }
  if (item.expired) {
    return `${amount} — you have some, but it is past its use-by, so it is not counted.`;
  }
  if (item.have > 0) {
    return `${amount} — you have ${item.have} ${item.unit} of the ${item.needed} needed.`;
  }
  return `${amount} — none in the pantry.`;
}
