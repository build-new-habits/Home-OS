// js/lib/dom.js — 01 Sep 2026 v1
// Phase 29. The DOM helpers every view had its own copy of.
//
// ---- What was actually there ----
// Fifteen views defined `el()`. Twelve were byte-identical; three were not,
// and the differences are real rather than cosmetic:
//
//   weight.js  supports an `html` prop that sets innerHTML
//   signin.js  assigns properties when `k in node` (it needs tabIndex)
//   water.js   has no null/undefined guard
//
// So only the twelve identical ones move here. **The three divergent copies
// stay where they are.** Unifying them would mean picking one behaviour and
// hoping the other two views did not depend on theirs, and hoping is not a
// refactor. Each keeps a comment saying why.
//
// `field()` and `selectFrom()` had the same story: five identical copies
// each, plus one variant in meals.js. Same rule.
//
// This is not tidying for its own sake. Fifteen copies of a function is
// fifteen places a fix has to be made, and the odds of it being made in all
// fifteen are zero.

/**
 * Builds an element from a props object.
 *
 * `class` and `text` are special-cased; everything else becomes an
 * attribute. Null and undefined are SKIPPED rather than stringified, which
 * is what stops `{ id: undefined }` producing `id="undefined"`.
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  children.forEach((child) => node.appendChild(child));
  return node;
}

/**
 * A labelled field.
 *
 * The label's `for` comes from the input's id, so an input with no id
 * produces an unlabelled field — which the a11y gate catches rather than
 * letting it ship silently.
 */
export function field(labelText, inputEl, hintEl) {
  const wrap = el('div', { class: 'field' });
  wrap.append(el('label', { for: inputEl.id, text: labelText }), inputEl);
  if (hintEl) wrap.appendChild(hintEl);
  return wrap;
}

/**
 * A select built from `{ value, label }` options.
 *
 * Used for every CHECK-constrained column in the app: a constrained set
 * gets a constrained control, never free text.
 */
export function selectFrom(id, options, { includeBlank = null } = {}) {
  const select = el('select', { id });
  if (includeBlank !== null) select.appendChild(el('option', { value: '', text: includeBlank }));
  for (const option of options) {
    select.appendChild(el('option', { value: option.value, text: option.label }));
  }
  return select;
}
