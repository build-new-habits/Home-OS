// js/components/recipePhoto.js — 03 Oct 2026 v1
// Kitchen rebuild. A recipe's photo, or a tile in its meal colour.
//
//   hero   top of the recipe page; the photo has alt text, the tile is
//          decoration (the heading says what the recipe is)
//   thumb  beside a name in a list; always decorative, because the name
//          is right next to it and saying it twice helps nobody
//
// If a photo fails to load (offline, not cached yet) the tile takes its
// place rather than a broken-image icon.

import { el } from '../lib/dom.js';
import { mealIcon } from './mealGlyph.js';

const SLOTS = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'drink']);

function tile(recipe, size) {
  const slot = SLOTS.has(recipe && recipe.default_slot) ? recipe.default_slot : 'dinner';
  const span = el('span', { class: `recipe-photo recipe-photo-${size} recipe-photo-tile meal-${slot}`, 'aria-hidden': 'true' });
  span.appendChild(mealIcon(slot, size === 'hero' ? 48 : 22));
  return span;
}

/**
 * @param {object} recipe  needs default_slot
 * @param {{ src, alt, width, height } | null} image  from recipeImages
 * @param {'hero'|'thumb'} size
 */
export function recipePhoto(recipe, image, size = 'hero') {
  if (!image) return tile(recipe, size);
  const img = el('img', {
    class: `recipe-photo recipe-photo-${size}`,
    src: image.src,
    alt: size === 'thumb' ? '' : image.alt,
    width: String(image.width),
    height: String(image.height),
    loading: size === 'hero' ? 'eager' : 'lazy',
    decoding: 'async'
  });
  img.addEventListener('error', () => img.replaceWith(tile(recipe, size)), { once: true });
  return img;
}
