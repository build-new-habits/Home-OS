// js/components/disclosureRow.js — 05 Sep 2026 v1
//
// A list row that is closed until you ask for it.
//
// ---- Why this exists ----
// Device test, 5 Sep 2026. Every list in this app rendered every row fully
// expanded: name, metadata, four nutrition lines, and two full-width action
// buttons each repeating the item's entire name. "Delete müller Strawberry
// Shortcake x3 Milk Chocolate Digestive x3 deliciously creamy yogurts
// (6 x 124 g)" is three lines of button, and there are forty-two foods.
//
// The owner's summary of the whole app was "everything is all chucked into
// one space rather than actually being organised". This is the mechanism
// behind most of it. A list you cannot scan is not a list, it is a wall.
//
// ---- Why a button and a region, not <details> ----
// The row needs a heading, and a heading cannot legally wrap a <summary>.
// Putting the heading INSIDE the summary works in browsers but degrades
// how several screen readers announce the control. A heading containing a
// button is the pattern with no such argument attached to it, and it gives
// us aria-expanded and aria-controls explicitly rather than by inference.
//
// It is styled to look identical to a <details> fold, so the app still
// presents one idiom to the person using it even though it uses two to the
// parser.
//
// ---- Contract ----
//   createDisclosureRow({ title, summary, headingLevel, className, open })
//     -> { row, body, toggle, setSummary }
//
// `body` starts hidden. Callers append to it as normal; nothing needs to
// know it is collapsed. `setSummary` lets a caller keep the one visible
// line current after an edit without rebuilding the row.

import { el } from '../lib/dom.js';

let seq = 0;

export function createDisclosureRow({
  title,
  summary = '',
  headingLevel = 3,
  className = '',
  open = false
} = {}) {
  const id = `disclosure-${++seq}`;

  const row = el('article', {
    class: `disclosure-row${className ? ` ${className}` : ''}`
  });

  const heading = el(`h${headingLevel}`, { class: 'disclosure-row__heading' });

  const toggle = el('button', {
    type: 'button',
    class: 'disclosure-row__toggle',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': id
  });

  const titleSpan = el('span', { class: 'disclosure-row__title', text: title });
  toggle.appendChild(titleSpan);

  // The one line that has to earn the row its place in a list of forty.
  // Kept as a separate element so it can be updated without touching the
  // title or the control's accessible name.
  const summarySpan = el('span', { class: 'disclosure-row__summary', text: summary });
  if (!summary) summarySpan.hidden = true;
  toggle.appendChild(summarySpan);

  heading.appendChild(toggle);
  row.appendChild(heading);

  const body = el('div', { class: 'disclosure-row__body', id });
  if (!open) body.hidden = true;
  row.appendChild(body);

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.hidden = isOpen;
  });

  function setSummary(text) {
    summarySpan.textContent = text || '';
    summarySpan.hidden = !text;
  }

  return { row, body, toggle, setSummary };
}
