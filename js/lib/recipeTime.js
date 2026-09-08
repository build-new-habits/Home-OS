// js/lib/recipeTime.js — 07 Sep 2026 v1
//
// How long a recipe takes, read out of its own method.
//
// ---- Why this is not a guess ----
// I said on 7 Sep that no time was recorded and I would not invent one.
// That was half right. No recipe has a `minutes` field — but 296 of the
// library's steps state a duration in words: "Simmer 12 minutes", "Cook the
// onion and pepper 10 minutes", "Bake 25 minutes".
//
// So the number is not made up. It is read from the instructions, added up,
// and rounded. Where a step states nothing it gets a small fixed allowance,
// because chopping an onion is not free but it is not fifteen minutes
// either.
//
// ---- Prep and cook are separated because they behave differently ----
// Cooking time is mostly waiting; preparation is mostly you. Someone
// deciding whether to start a recipe at half six needs those apart.
//
// ---- Waiting overnight is not time spent ----
// "Cover and chill overnight" is eight hours during which you are asleep.
// Adding it to a total would make overnight oats a nine-hour recipe. It is
// reported separately, as a fact about when to start rather than an amount
// of effort.
//
// ---- Rounded, and said to be an estimate ----
// To the nearest 5 minutes. A recipe that claims 23 minutes is claiming a
// precision this method does not have.

const COOK_VERBS = /\b(cook|simmer|boil|bake|roast|fry|grill|steam|poach|saute|sauté|braise|heat|reduce|toast|griddle)\b/i;
const WAIT_WORDS = /\b(overnight|chill|refrigerate|marinate|rest|prove|rise|soak|set aside for|leave for)\b/i;

/** Minutes stated in one instruction, or 0. Takes the top of a range. */
function statedMinutes(text) {
  let total = 0;
  // "10 minutes", "1 minute", "20-25 minutes" — the upper bound, because a
  // recipe that runs long is the case that matters when you are hungry.
  for (const m of text.matchAll(/(\d+)\s*(?:[-–—]\s*(\d+)\s*)?(minute|minutes|min|mins)\b/gi)) {
    total += Number(m[2] || m[1]);
  }
  for (const m of text.matchAll(/(\d+)\s*(?:[-–—]\s*(\d+)\s*)?(hour|hours|hr|hrs)\b/gi)) {
    total += Number(m[2] || m[1]) * 60;
  }
  return total;
}

const round5 = (n) => Math.max(0, Math.round(n / 5) * 5);

/**
 * @returns {{ prep: number, cook: number, total: number, needsWaiting: boolean }}
 *   Minutes, rounded to 5. `needsWaiting` means a step chills, proves or
 *   rests — time you are not present for, and deliberately not in the total.
 */
export function estimateRecipeTime(recipe) {
  let prep = 0;
  let cook = 0;
  let needsWaiting = false;

  for (const step of (recipe && recipe.steps) || []) {
    const text = String(step.instruction || '');
    const waiting = WAIT_WORDS.test(text);
    if (waiting) needsWaiting = true;

    const stated = statedMinutes(text);

    if (waiting) {
      // Whatever it says, it is not effort. "Chill 30 minutes" is half an
      // hour of the fridge doing it.
      continue;
    }
    if (stated > 0) {
      if (COOK_VERBS.test(text)) cook += stated;
      else prep += stated;
      continue;
    }
    // Nothing stated. A step is still a thing you do: chop, stir, season,
    // plate. Two minutes is the smallest honest allowance — enough that a
    // twelve-step recipe does not read as instant.
    prep += 2;
  }

  prep = round5(prep);
  cook = round5(cook);
  return { prep, cook, total: prep + cook, needsWaiting };
}

/** One line, or '' when there is nothing worth saying. */
export function describeRecipeTime(recipe) {
  const { prep, cook, total, needsWaiting } = estimateRecipeTime(recipe);
  if (total === 0) return needsWaiting ? 'Needs time to chill or rest.' : '';

  const parts = [];
  if (prep > 0) parts.push(`${prep} min prep`);
  if (cook > 0) parts.push(`${cook} min cooking`);
  // "About" every time. The word is doing real work: these are read off the
  // instructions, not measured in a kitchen.
  let line = `About ${parts.join(', ')}`;
  if (needsWaiting) line += ', plus chilling or resting time';
  return `${line}.`;
}
