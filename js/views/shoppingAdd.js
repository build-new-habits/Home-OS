// js/views/shoppingAdd.js — 07 Sep 2026 v1
//
// "Add to the list", on its own page.
//
// Three lines by design, exactly like the pantry's pages: the behaviour
// lives in one place — js/views/shopping.js — and this chooses which half
// of it this route shows. Two copies of a shopping list that drift apart
// would be a worse answer to "put it on a different page" than one that
// does not.
import { render as renderShopping } from './shopping.js';

export function render(mountEl) {
  return renderShopping(mountEl, { section: 'add' });
}
