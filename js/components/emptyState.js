// js/components/emptyState.js — 01 Sep 2026 v1
// Phase 28. What a screen says when it has nothing to show.
//
// ---- Why this is worth a component ----
// "No weights logged yet." is technically true and completely useless. It
// tells you the screen is empty, which you can already see, and leaves you
// to work out what the screen is for and what to do about it.
//
// An empty state is the only onboarding that keeps working after week one:
// it appears exactly when someone has arrived somewhere new, and it goes
// away the moment they do not need it.
//
// ---- The shape, every time ----
// 1. What this screen is FOR, in one plain sentence.
// 2. ONE next action. Not three, not a menu.
// 3. Optionally, why it is worth doing — but only if it is not obvious.
//
// ---- What it never does ----
// Apologise, congratulate, or imply that empty is a failure. "You haven't
// logged anything yet" is a small accusation. "Weights appear here once you
// log one" is the same fact without one.

/**
 * @param {{
 *   title?: string,
 *   body: string,
 *   actionLabel?: string,
 *   actionHref?: string,
 *   onAction?: () => void,
 *   why?: string
 * }} options
 */
export function emptyState({ title = '', body, actionLabel = '', actionHref = '', onAction = null, why = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state-block';

  if (title) {
    const h = document.createElement('p');
    h.className = 'empty-state-title';
    h.textContent = title;
    wrap.appendChild(h);
  }

  const text = document.createElement('p');
  text.className = 'empty-state';
  text.textContent = body;
  wrap.appendChild(text);

  // The action is a link when it goes somewhere and a button when it does
  // something. Using a button for navigation breaks opening in a new tab and
  // lies to a screen reader about what will happen.
  if (actionLabel && actionHref) {
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = actionHref;
    link.textContent = actionLabel;
    wrap.appendChild(link);
  } else if (actionLabel && onAction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    wrap.appendChild(button);
  }

  if (why) {
    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = why;
    wrap.appendChild(hint);
  }

  return wrap;
}

/**
 * Words an empty state must never contain.
 *
 * Exported so the a11y gate can assert it rather than trusting whoever
 * writes the next one.
 */
export const FORBIDDEN_EMPTY_WORDS = [
  "haven't", 'have not', 'you should', 'you need to', "don't forget",
  'sorry', 'oops', 'unfortunately', 'failed', 'missing'
];
