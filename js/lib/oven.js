// js/lib/oven.js — 04 Oct 2026 v1
// v1: an oven temperature in every form a British kitchen uses.
//
// Persona re-trace 3: the steps said "200C". A fan oven runs about 20
// degrees hotter, and plenty of homes still cook on gas, so a beginner (or
// anyone on gas) was left guessing. Display only: the recipe text keeps its
// plain conventional temperature, and this adds the fan and gas figures as
// it is shown.

const GAS = [[140, '1'], [150, '2'], [160, '3'], [170, '3'], [180, '4'], [190, '5'], [200, '6'], [210, '6–7'], [220, '7'], [230, '8'], [240, '9']];

/** Gas mark for a conventional temperature, or null when it is outside the dial. */
export function gasMark(celsius) {
  let best = null;
  let gap = Infinity;
  for (const [c, mark] of GAS) {
    const d = Math.abs(c - celsius);
    if (d < gap) { gap = d; best = mark; }
  }
  return gap <= 10 ? best : null;
}

/** "Heat the oven to 200C." -> "Heat the oven to 200°C (180°C fan, gas 6)." */
export function ovenWords(text) {
  // Already says fan or gas: written for every oven by hand, so leave it.
  if (/\b(fan|gas)\b/i.test(String(text || ''))) return String(text || '');
  return String(text || '').replace(/\b(1[2-9]\d|2[0-5]\d)\s?°?C\b(?!\s*\()/g, (_m, digits) => {
    const c = Number(digits);
    const mark = gasMark(c);
    return `${c}°C (${c - 20}°C fan${mark ? `, gas ${mark}` : ''})`;
  });
}
