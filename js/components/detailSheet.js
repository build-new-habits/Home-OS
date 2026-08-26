// js/components/detailSheet.js — 26 Aug 2026 v1
// A slide-out panel for looking at one thing properly.
//
// Cramming an item's details into a list row forces a choice between a row
// you can scan and detail worth reading. A sheet refuses the choice: the row
// stays one line, and everything else — macros, where it lives, freshness,
// the actions — lives here, one tap away.
//
// Accessibility (WCAG 2.2 / 2.1 AA):
//   * role="dialog" + aria-modal, labelled by its own heading.
//   * Focus moves in on open and returns to the trigger on close (3.2.1 —
//     nothing shifts under the user), with Tab trapped inside while open.
//   * Escape closes, and so does the backdrop, so there is always a way out
//     that is not a hunt for the X.
//   * The close button carries a real text label, never an icon alone.
//   * Body scroll is locked so the page behind does not move under the panel.
//
// Content is built by the caller and handed in, so the sheet knows nothing
// about pantries or foods and can be reused by any view.

/**
 * openDetailSheet({ title, subtitle, build, returnFocusTo }) -> { close }
 *
 * `build(body, api)` fills the panel. `api.close()` dismisses it — pass it
 * to any action that should close the sheet once it has done its work.
 */
export function openDetailSheet({ title = '', subtitle = '', build, returnFocusTo } = {}) {
  // Where focus goes on close is passed in, not inferred from
  // document.activeElement: a tap does not reliably focus a button on every
  // mobile browser, and inferring it means focus silently lands on <body>
  // and the user is dumped at the top of the page (3.2.1).
  const previouslyFocused = returnFocusTo || document.activeElement;
  const uid = Math.random().toString(36).slice(2, 8);

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', `sheet-title-${uid}`);

  const header = document.createElement('div');
  header.className = 'sheet-header';

  const heading = document.createElement('h2');
  heading.id = `sheet-title-${uid}`;
  heading.className = 'sheet-title';
  heading.textContent = title;
  header.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement('p');
    sub.className = 'sheet-subtitle';
    sub.textContent = subtitle;
    header.appendChild(sub);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn sheet-close';
  closeBtn.textContent = 'Close';

  const body = document.createElement('div');
  body.className = 'sheet-body';

  sheet.append(header, body, closeBtn);
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  document.body.classList.add('sheet-open');

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    document.body.classList.remove('sheet-open');
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  }

  function focusables() {
    return [...sheet.querySelectorAll(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter((node) => !node.disabled && node.offsetParent !== null || node === closeBtn);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  closeBtn.addEventListener('click', close);
  // A tap on the backdrop closes; a tap inside must not.
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeydown, true);

  if (typeof build === 'function') build(body, { close });

  // Focus the heading rather than the first control: the point of opening
  // this is to READ it, and a screen reader should hear what it is first.
  heading.setAttribute('tabindex', '-1');
  heading.focus();

  return { close };
}

/**
 * A labelled fact row for use inside a sheet.
 *
 * "Not recorded" is passed through as an ordinary value, never hidden: a
 * missing macro is information, and a blank space is not.
 */
export function sheetFact(label, value) {
  const row = document.createElement('div');
  row.className = 'sheet-fact';
  const dt = document.createElement('span');
  dt.className = 'sheet-fact-label';
  dt.textContent = label;
  const dd = document.createElement('span');
  dd.className = 'sheet-fact-value';
  dd.textContent = value;
  row.append(dt, dd);
  return row;
}
