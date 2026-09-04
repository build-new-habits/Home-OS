// js/data/cost.js — 01 Sep 2026 v1
// Worklist D1. What this shopping list comes to.
//
// ---- The question, and who asked it ----
// Jodie, 24, ADHD, £30 a week:
//
//   "It's good. I've got £30 a week. Ask me if it saved me money, not if I
//    liked it."
//
// ---- What this is NOT ----
// It is not a budget. There is no limit, no overspend, no red, no history
// of how you did. This audience has been failed before by apps that scored
// them, and a number that can be failed is a number people stop looking at.
//
// It is also not "what the week cost". That would be a lie whenever half
// the pantry was bought last month, and unpicking it needs a purchase
// ledger nobody will keep.
//
// It is one honest number: roughly what you are about to spend.

function round2(n) { return Math.round(n * 100) / 100; }

/** Prices older than this are still used, but said to be old. */
const STALE_PRICE_DAYS = 90;

/**
 * What one line comes to.
 *
 * Returns null when there is no price — never zero. A missing price
 * counted as £0 would quietly understate the total, which is the single
 * worst thing this feature could do to somebody deciding whether they can
 * afford a shop.
 */
export function lineCost(item) {
  const food = item.foods || item.food || {};
  const price = Number(food.typical_price);
  if (!Number.isFinite(price) || price < 0) return null;

  // qty_needed is null for staples added by reorder point — you said to
  // remind you, not how many. One is the honest assumption there, and it
  // is stated in the summary rather than hidden.
  const qty = item.qty_needed === null || item.qty_needed === undefined
    ? 1
    : Number(item.qty_needed);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  // The price is per ITEM — per tin, per bottle, per bag. A list line in
  // grams has to become packs before it can be costed, and if it cannot,
  // this says nothing rather than inventing a conversion.
  if (item.unit === 'item') return round2(price * qty);

  const perItem = Number(food.grams_per_item);
  if (item.unit === 'g' && Number.isFinite(perItem) && perItem > 0) {
    return round2(price * Math.ceil(qty / perItem));
  }

  // Anything else: we know a price for the thing but not how many things
  // this line is. Assume one, and say so — the alternative is dropping a
  // real cost out of the total silently.
  return round2(price);
}

/**
 * Totals a list.
 *
 * Reports what it could NOT price as prominently as what it could. A total
 * over twelve of seventeen items, shown as a bare number, is wrong. Shown
 * with "5 have no price yet", it is useful.
 */
export function estimateList(items = [], todayISO) {
  let total = 0;
  const priced = [];
  const unpriced = [];
  const stale = [];

  for (const item of items) {
    if (item.status === 'bought') continue;
    const cost = lineCost(item);
    const food = item.foods || item.food || {};
    if (cost === null) {
      unpriced.push(food.name || 'something');
      continue;
    }
    total += cost;
    priced.push({ item, cost });
    if (isStalePrice(food, todayISO)) stale.push(food.name || 'something');
  }

  return {
    total: round2(total),
    pricedCount: priced.length,
    unpricedCount: unpriced.length,
    unpricedNames: unpriced,
    staleCount: stale.length,
    // Complete only when every line could be priced. Anything less and the
    // number is a floor, not a total.
    complete: unpriced.length === 0 && priced.length > 0
  };
}

export function isStalePrice(food, todayISO) {
  if (!food || !food.price_updated_at) return false;
  const set = Date.parse(food.price_updated_at);
  const now = Date.parse(todayISO || new Date().toISOString());
  if (!Number.isFinite(set) || !Number.isFinite(now)) return false;
  return (now - set) / 86400000 > STALE_PRICE_DAYS;
}

/** "£24.30" — plain, and never rounded up to look tidier. */
export function formatMoney(amount, symbol = '£') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return `${symbol}${n.toFixed(2)}`;
}

/**
 * The sentence.
 *
 * ---- Wording rules ----
 * "About" always, because it is an estimate and pretending otherwise is
 * how somebody gets caught short at the till.
 *
 * Nothing here may read as a verdict. No "that's a lot", no comparison to
 * last week, no colour. It is arithmetic, offered.
 */
export function describeEstimate(estimate, symbol = '£') {
  if (!estimate || estimate.pricedCount === 0) {
    return 'No prices yet. Add what you usually pay for a few things and this '
      + 'will start adding up your list.';
  }

  const money = formatMoney(estimate.total, symbol);
  if (estimate.complete) {
    let line = `About ${money} for this list.`;
    if (estimate.staleCount > 0) {
      line += ` ${estimate.staleCount} price${estimate.staleCount === 1 ? ' is' : 's are'} `
        + 'more than three months old.';
    }
    return line;
  }

  // A floor, and it says so. "At least" rather than "about", because the
  // real figure can only be higher.
  return `At least ${money}, for the ${estimate.pricedCount} `
    + `item${estimate.pricedCount === 1 ? '' : 's'} with a price. `
    + `${estimate.unpricedCount} still to price.`;
}
