// js/components/mealGlyph.js — 03 Oct 2026 v1
// Kitchen rebuild. The one picture for each meal, used everywhere a meal
// appears: Today, the plan board, recipe cards. A meal's COLOUR is never
// the only signal (WCAG 1.4.1); this icon, or the meal's name, always
// travels with it.

const PATHS = {
  breakfast: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2 20h20M12 4v3M5 8.5l2 2M19 8.5l-2 2"/>',
  lunch: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  dinner: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  snack: '<path d="M12 8c-4-3-8 0-7 5s4 8.5 7 7.5c3 1 6-2.5 7-7.5s-3-8-7-5z"/><path d="M12 8c0-2.5 1.2-4 3-4.5"/>',
  drink: '<path d="M6 4h12l-1.6 16H7.6z"/><path d="M6.6 9.5h10.8"/>'
};

export const MEAL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
  { value: 'drink', label: 'Drinks' }
];

/** A bare icon, decorative: the caller supplies the words. */
export function mealIcon(slot, size = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = PATHS[slot] || PATHS.snack;
  return svg;
}

/** The icon on its meal's tint, in a rounded square. */
export function mealGlyph(slot, size = 20) {
  const span = document.createElement('span');
  span.className = `meal-glyph meal-${PATHS[slot] ? slot : 'snack'}`;
  span.appendChild(mealIcon(slot, size));
  return span;
}
