// js/components/actionBar.js — 06 Sep 2026 v1
//
// The one thing this screen is for, where a thumb already is.
//
// ---- Why ----
// Design work list D1. This app is used by somebody managing a right-side
// injury running from wrist to collarbone, and nearly every primary control
// sat at the TOP of the screen: "Back to the plan", "Filter", the calendar's
// Previous and Next, "Scan a barcode".
//
// The top third of a phone is the hardest place to reach one-handed and the
// worst place to send a sore shoulder. Read at the top, press at the bottom.
//
// ---- What it is not ----
// Not a toolbar. It holds ONE primary action, because a screen with two
// equally important things to do has not finished being designed. Anything
// secondary stays in the page where it can be read in context.
//
// It also does not float over content: it reserves its own height, so the
// last row of a list is never hidden underneath it. A bar that covers the
// thing you were reading has traded one reaching problem for a worse one.

import { el } from '../lib/dom.js';

/**
 * @param {object} options
 * @param {string} options.label      what the button says
 * @param {() => void} [options.onClick]  for an action
 * @param {string} [options.href]     for navigation — a link, not a button
 * @param {AbortSignal} [options.signal]
 * @returns {{ element: HTMLElement, setLabel: (t: string) => void,
 *             setDisabled: (v: boolean) => void }}
 */
export function createActionBar({ label, onClick, href, signal } = {}) {
  const bar = el('div', { class: 'action-bar' });

  // A link when it goes somewhere, a button when it does something. The
  // difference is not pedantry: a link can be long-pressed, opened in a new
  // tab and reached by the back button, and a button that navigates throws
  // all of that away.
  const control = href
    ? el('a', { class: 'btn btn-primary action-bar__control', href, text: label })
    : el('button', { type: 'button', class: 'btn btn-primary action-bar__control', text: label });

  if (onClick) control.addEventListener('click', onClick, signal ? { signal } : undefined);
  bar.appendChild(control);

  return {
    element: bar,
    setLabel(text) { control.textContent = text; },
    setDisabled(value) {
      if (control.tagName === 'BUTTON') control.disabled = !!value;
      else control.setAttribute('aria-disabled', value ? 'true' : 'false');
    }
  };
}
