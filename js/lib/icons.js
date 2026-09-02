// js/lib/icons.js — 01 Sep 2026 v2
// v2 (Phase 28): health and hub icons.
// Phase 26. A small, consistent icon set.
//
// ---- Why icons are accessibility, not decoration ----
// The gap against the leading neurodivergent apps is not features: it is
// that their state is VISIBLE and ours is written down. For someone who
// finds dense text hard — and for anyone scanning a screen at speed — a
// shape carries meaning faster than a sentence.
//
// ---- Rules ----
// 1. Inline SVG, no dependency, no icon font. An icon font is a download,
//    a flash of missing glyphs, and a screen reader announcing ligatures.
// 2. `currentColor` throughout, so an icon inherits its context and
//    therefore inherits the contrast we already test.
// 3. `aria-hidden` by default. An icon beside a label is decorative; the
//    label is the accessible name. An icon that is the ONLY content must be
//    given a label by the caller.
// 4. Never colour alone (WCAG 1.4.1). Every state icon has a distinct
//    SHAPE as well: a circle is not a triangle is not a diamond.

const PATHS = {
  // ---- Freshness, four distinct shapes ----
  // Distinguishable in greyscale, which is the real test of 1.4.1.
  fresh: '<circle cx="12" cy="12" r="7"/>',
  soon: '<path d="M12 4 L20 19 L4 19 Z"/>',
  past: '<path d="M12 3 L21 12 L12 21 L3 12 Z"/>',
  unknown: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/>',

  // ---- Actions ----
  scan: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 9v6M10 9v6M13 9v6M17 9v6" stroke="currentColor" stroke-width="2" fill="none"/>',
  search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 L20 20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  add: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  tick: '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  undo: '<path d="M9 7L4 12l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12h9a6 6 0 1 1 0 12h-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  timer: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',

  // ---- Domains ----
  meal: '<path d="M6 3v8a3 3 0 0 0 6 0V3M9 11v10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17 3c-1.5 2-2 4-2 6a2 2 0 0 0 4 0c0-2-.5-4-2-6zM17 11v10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  pantry: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 12h16M10 7v2M10 16v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  shopping: '<path d="M4 6h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 6a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',

  // ---- Health (Phase 28) ----
  // Each is a distinct silhouette, not a variation on a circle: these sit
  // in a list read at a glance, which is the whole reason for having them.
  exercises: '<path d="M4 9v6M20 9v6M7 6v12M17 6v12M7 12h10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  weight: '<path d="M5 20h14l-2-9H7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  water: '<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  chores: '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M2 7l1 1 2-2M2 12l1 1 2-2M2 17l1 1 2-2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="8" cy="14" r="1.2" fill="currentColor"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/>'
};

/** Icons drawn as solid shapes rather than strokes. */
const FILLED = new Set(['fresh', 'soon', 'past']);

/**
 * Builds an icon element.
 *
 * @param {string} name
 * @param {{ label?: string, size?: number }} [options]
 *   `label` makes the icon meaningful to assistive tech. Omit it when a
 *   visible text label sits beside the icon — announcing both is noise.
 * @returns {SVGElement|null} Null for an unknown name, so a typo degrades
 *   to no icon rather than to a broken box.
 */
export function icon(name, { label = '', size = 20 } = {}) {
  const markup = PATHS[name];
  if (!markup) return null;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', `icon icon-${name}`);
  svg.setAttribute('fill', FILLED.has(name) ? 'currentColor' : 'none');
  svg.setAttribute('focusable', 'false');

  if (label) {
    svg.setAttribute('role', 'img');
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = label;
    svg.appendChild(title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.innerHTML = markup;
  svg.appendChild(group);
  return svg;
}

/** Names available, for the render gate to assert none are missing. */
export function iconNames() {
  return Object.keys(PATHS);
}

/**
 * A freshness state as shape + colour + words.
 *
 * All three, always. Colour alone fails WCAG 1.4.1; shape alone is a puzzle;
 * words alone is what we had, and it is what makes the app read as a wall
 * of sentences.
 */
export function stateBadge(state, text) {
  const known = ['fresh', 'soon', 'past', 'unknown'].includes(state);
  const key = known ? state : 'unknown';

  const wrap = document.createElement('span');
  wrap.className = `state-badge state-${key}`;

  const mark = icon(key, { size: 14 });
  if (mark) wrap.appendChild(mark);

  const label = document.createElement('span');
  label.className = 'state-badge-text';
  label.textContent = text;
  wrap.appendChild(label);
  return wrap;
}

/**
 * A count, for things like "12 not put away".
 *
 * Exists so hidden state is never silent — the same reason the meal filter
 * button carries its count.
 */
export function countChip(n, label) {
  const chip = document.createElement('span');
  chip.className = 'count-chip';
  chip.textContent = String(n);
  if (label) chip.setAttribute('aria-label', `${n} ${label}`);
  return chip;
}
