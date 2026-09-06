// js/views/pantry/add.js — 06 Sep 2026 v1
//
// "Add to the pantry" as its own page.
//
// A three-line module by design. The pantry's behaviour lives in one place
// — js/views/pantry.js — and this selects which part of it this route
// shows. Seven copies of the pantry that drift apart would be a worse
// answer to "these should be pages" than one that does not.
import { render as renderPantry } from '../pantry.js';

export function render(mountEl) {
  return renderPantry(mountEl, { section: 'add' });
}
