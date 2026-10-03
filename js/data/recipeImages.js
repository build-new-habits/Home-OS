// js/data/recipeImages.js — 03 Oct 2026 v1
// Kitchen rebuild. Which library recipes have a photo, and what it shows.
//
// A small manifest (data/recipe_images.json) rather than a field in each
// recipe file: photos arrive in batches, and adding one should not mean
// touching the recipe it belongs to. A recipe with no entry simply has no
// photo yet, and the page draws a tile in its meal colour instead.
//
// Every photo carries alt text. A photo with none is not shown as a photo:
// it would be an image a screen reader announces as nothing.

const MANIFEST_URL = new URL('../../data/recipe_images.json', import.meta.url).href;
const ASSET_BASE = new URL('../../', import.meta.url).href;

let cache = null;
let loading = null;

export async function loadImages() {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    try {
      const response = await fetch(MANIFEST_URL);
      if (!response.ok) throw new Error(`manifest returned ${response.status}`);
      const doc = await response.json();
      cache = imageMap(doc);
    } catch (error) {
      console.error('Recipe photos unavailable:', error);
      cache = new Map();
    } finally {
      loading = null;
    }
    return cache;
  })();
  return loading;
}

/** The manifest as a Map of slug -> { src, alt, width, height }. Pure. */
export function imageMap(doc) {
  const map = new Map();
  const images = (doc && doc.images) || {};
  for (const [slug, entry] of Object.entries(images)) {
    if (!entry || !entry.src || !String(entry.alt || '').trim()) continue;
    map.set(slug, {
      src: new URL(entry.src, ASSET_BASE).href,
      alt: String(entry.alt).trim(),
      width: Number(entry.width) || 800,
      height: Number(entry.height) || 600
    });
  }
  return map;
}
