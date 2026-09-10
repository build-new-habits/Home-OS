// js/views/pantry/place.js — 10 Sep 2026 v1
//
// One cupboard, on its own page.
//
// A three-line module by design, like its four siblings. The pantry's
// behaviour lives in one place — js/views/pantry.js — and this selects which
// part of it this route shows. Which cupboard is not in the path: the router
// carries no parameters, so it comes from lib/pantryPlace.js, written when
// you tap the tile.
import { render as renderPantry } from '../pantry.js';

export function render(mountEl) {
  return renderPantry(mountEl, { section: 'place' });
}
