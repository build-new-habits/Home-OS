// js/data/recipeImport.js — 24 Nov 2026 v2
// v2: a converted measure keeps what the recipe said (`said`: "1 cup").
// Phase 33. A recipe shared in from somewhere else, turned into a draft for
// the recipe editor (data/ownRecipe.js). Nothing here writes a recipe: the
// editor's Save does, after you have checked it.
//
// ---- Where the work happens ----
// The Edge Function (supabase/functions/import-recipe) only fetches a page
// and hands back its schema.org Recipe objects. Everything that decides
// what the recipe SAYS is here, in plain functions the import gate tests
// against fixtures. A wrong guess here is a commit to fix, not a redeploy.
//
// ---- What is ignored, on purpose ----
// - The page's nutrition. Nutrition comes from the ingredient database, as
//   for every other recipe. Another site's figures are another site's guess,
//   and Home-OS does not show a guess as a fact.
// - Ratings and reviews.
// - The photo. Copying it would be taking someone's picture; linking it
//   would load their server every time you open the recipe.
//
// ---- Private by design ----
// An imported recipe belongs to your household. It never feeds
// data/recipe_library/ (ROADMAP.md, library licensing).

import { supabase } from '../supabaseClient.js';
import { emptyDraft, newIngredient, newStep, parseIngredientLine, parseMethod, MAX_STEP } from './ownRecipe.js';
import { isMissingColumnError } from './courses.js';
import { isOffline } from '../lib/net.js';

export const IMPORT_DRAFT_KEY = 'home-os-import-draft';
export const KEPT_KEY = 'home-os-import-later';
export const MAX_KEPT = 20;

// Same list as the Edge Function. Kept in step by Tests/import.mjs.
export const SOCIAL_HOSTS = [
  'instagram.com', 'tiktok.com', 'facebook.com', 'fb.watch', 'fb.com',
  'youtube.com', 'youtu.be', 'pinterest.com', 'pin.it', 'x.com',
  'twitter.com', 'threads.net'
];

// ---- Reading what was shared ---------------------------------------------

function firstUrlIn(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"'()]+/i);
  if (!m) return '';
  // A sentence often ends straight after a link: "Try this: https://…/pie."
  return m[0].replace(/[.,;:!?]+$/, '');
}

function usable(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.toString() : '';
  } catch { return ''; }
}

/**
 * The link in a share. Android apps disagree about where they put it:
 * Chrome and most apps send it in `text`, some in `url`, a few in `title`.
 */
export function extractUrl({ url = '', text = '', title = '' } = {}) {
  return usable(url) || usable(firstUrlIn(text)) || usable(firstUrlIn(title)) || '';
}

/** Text in a share that is more than just the link: a caption worth reading. */
export function sharedText({ url = '', text = '', title = '' } = {}) {
  const link = extractUrl({ url, text, title });
  const body = String(text || '').replace(link, '').trim();
  return body.length > 20 ? body : '';
}

export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}

export function isSocialHost(urlOrHost) {
  const raw = String(urlOrHost || '');
  const h = (raw.includes('://') ? hostOf(raw) : raw).toLowerCase().replace(/\.$/, '');
  if (/(^|\.)pinterest\.[a-z.]+$/.test(h)) return true;
  return SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`));
}

/** A friendly name for a social host, for "Instagram doesn't let apps read posts." */
export function socialName(url) {
  const h = hostOf(url);
  if (/instagram/.test(h)) return 'Instagram';
  if (/tiktok/.test(h)) return 'TikTok';
  if (/facebook|fb\./.test(h)) return 'Facebook';
  if (/youtu/.test(h)) return 'YouTube';
  if (/pinterest|pin\.it/.test(h)) return 'Pinterest';
  if (/threads/.test(h)) return 'Threads';
  if (/x\.com|twitter/.test(h)) return 'X';
  return 'That site';
}

// ---- Cleaning text from a web page ----------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

export function cleanText(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** ISO 8601 duration ("PT1H30M") as whole minutes, or '' when unreadable. */
export function isoMinutes(value) {
  const m = String(value || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
  if (!m) return '';
  const total = Math.round((Number(m[1] || 0) * 1440) + (Number(m[2] || 0) * 60) + Number(m[3] || 0));
  return total > 0 && total <= 2880 ? total : '';
}

/** The first whole number in recipeYield ("Serves 4", ["4", "4 servings"], 4). */
export function servesFrom(recipeYield) {
  const values = Array.isArray(recipeYield) ? recipeYield : [recipeYield];
  for (const v of values) {
    const m = String(v ?? '').match(/\d+/);
    if (m) {
      const n = Number(m[0]);
      if (n >= 1 && n <= 50) return n;
    }
  }
  return 4;
}

const KIND_WORDS = [
  [/breakfast|brunch/i, 'breakfast'],
  [/lunch/i, 'lunch'],
  [/dinner|main( course)?|supper/i, 'dinner'],
  [/snack/i, 'snack'],
  [/drink|cocktail|smoothie|beverage/i, 'drink']
];

/** What the recipe IS, only when the page plainly says so. Never invented. */
export function kindFrom(category) {
  const text = (Array.isArray(category) ? category : [category]).map((c) => String(c || '')).join(' ');
  for (const [pattern, kind] of KIND_WORDS) if (pattern.test(text)) return kind;
  return '';
}

/**
 * One ingredient line from a web page, cleaned for matching:
 *   "1 large onion, finely chopped"      → 1 item "large onion"
 *   "400g can chopped tomatoes"          → 400 g "chopped tomatoes"
 *   "200g (7oz) plain flour"             → 200 g "plain flour"
 * What is cut off (", finely chopped") is preparation, which the method
 * says anyway, and it would stop the name matching a food.
 */
export function importIngredient(line) {
  const text = cleanText(line)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const parsed = parseIngredientLine(text);
  if (!parsed) return null;
  let name = parsed.name
    .replace(/^(x\s+)?(cans?|tins?|jars?|packs?|packets?|bags?|tubs?)\s+(of\s+)?/i, '')
    .split(/,| - | – /)[0]
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) name = parsed.name.trim();
  return newIngredient({ name: name.slice(0, 80), quantity: parsed.quantity, unit: parsed.unit, said: parsed.converted || '' });
}

/** recipeInstructions in any of the shapes sites use, as plain step texts. */
export function instructionTexts(value, out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    const cleaned = cleanText(value);
    // A single string is often the whole method; split it the way a cook would.
    const parts = String(value).includes('\n') || /<br|<\/p>|<\/li>/i.test(String(value))
      ? String(value).split(/\n|<br\s*\/?>|<\/p>|<\/li>/i).map(cleanText).filter(Boolean)
      : cleaned.split(/(?<=[.!?])\s+(?=\d+[.)]\s|Step\s+\d)/i).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) out.push(p.replace(/^(step\s*)?\d+[.):]?\s+/i, ''));
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) instructionTexts(item, out);
    return out;
  }
  if (typeof value === 'object') {
    const types = [].concat(value['@type'] || []).map(String);
    if (types.includes('HowToSection') || value.itemListElement) {
      instructionTexts(value.itemListElement, out);
      return out;
    }
    const text = value.text || value.name || value.description || '';
    if (text) instructionTexts(String(text), out);
  }
  return out;
}

/** Of several Recipe objects on a page, the one with the most to it. */
export function pickRecipe(recipes) {
  let best = null;
  let bestScore = -1;
  for (const r of Array.isArray(recipes) ? recipes : []) {
    if (!r || typeof r !== 'object') continue;
    const score = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient.length : 0)
      + instructionTexts(r.recipeInstructions).length;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

/**
 * A schema.org Recipe as an editor draft.
 * @returns the draft, or null when there is nothing to it.
 */
export function jsonLdToDraft(recipe, { sourceUrl = '', siteName = '' } = {}) {
  if (!recipe || typeof recipe !== 'object') return null;
  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient
    : Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map(importIngredient).filter(Boolean);
  const steps = instructionTexts(recipe.recipeInstructions)
    .map((t) => t.slice(0, MAX_STEP))
    .filter(Boolean)
    .map((instruction) => newStep({ instruction }));
  const name = cleanText(recipe.name || recipe.headline || '').slice(0, 80);
  if (!name && !ingredients.length && !steps.length) return null;
  const draft = emptyDraft();
  return {
    ...draft,
    name,
    kind: kindFrom(recipe.recipeCategory) || draft.kind,
    serves: servesFrom(recipe.recipeYield),
    ingredients: ingredients.length ? ingredients : draft.ingredients,
    steps: steps.length ? steps : draft.steps,
    sourceUrl: usable(sourceUrl),
    sourceName: String(siteName || hostOf(sourceUrl)).slice(0, 80),
    prepMinutes: isoMinutes(recipe.prepTime),
    cookMinutes: isoMinutes(recipe.cookTime),
    imported: true
  };
}

// ---- Pasted text ----------------------------------------------------------

const INGREDIENT_HEAD = /^(ingredients?|you('ll| will)? need|what you('ll)? need|shopping list)\b[:\s]*$/i;
const METHOD_HEAD = /^(method|directions?|instructions?|steps?|how to( make( it)?)?|to make|preparation)\b[:\s]*$/i;

function stripDecoration(line) {
  return String(line || '')
    // Emoji, arrows, ticks and bullets people put in front of lines.
    .replace(/^[\s\p{Extended_Pictographic}‍️•·▪️▫️◦‣⁃\-–—*>✔✓☑→➡]+/u, '')
    .replace(/[\p{Extended_Pictographic}‍️]+$/u, '')
    .trim();
}

const STARTS_WITH_AMOUNT = /^((\d+(\.\d+)?)|[½¼¾⅓⅔]|\d+\/\d+)/;

/**
 * Pasted text (a caption, a note, a message) as a draft.
 * With "Ingredients" / "Method" headings, lines go where the headings say.
 * Without them, a line that starts with an amount is an ingredient and the
 * rest are steps. The first plain line is the name.
 */
export function textToDraft(text, { sourceUrl = '', siteName = '' } = {}) {
  const lines = String(text || '').split(/\r?\n/).map(stripDecoration)
    .filter((l) => l && !/^#\w/.test(l) && !/^https?:\/\//i.test(l));
  if (!lines.length) return null;

  let name = '';
  const ingredientLines = [];
  const methodLines = [];
  let section = '';
  const headed = lines.some((l) => INGREDIENT_HEAD.test(l)) || lines.some((l) => METHOD_HEAD.test(l));

  for (const line of lines) {
    if (INGREDIENT_HEAD.test(line)) { section = 'ingredients'; continue; }
    if (METHOD_HEAD.test(line)) { section = 'method'; continue; }
    if (!name && !section) { name = line; continue; }
    if (headed) {
      if (section === 'ingredients') ingredientLines.push(line);
      else if (section === 'method') methodLines.push(line);
      // Lines before any heading, after the name, are a description: left out.
    } else if (STARTS_WITH_AMOUNT.test(line)) {
      ingredientLines.push(line);
    } else {
      methodLines.push(line);
    }
  }

  const ingredients = ingredientLines.map(importIngredient).filter(Boolean);
  const steps = parseMethod(methodLines.join('\n'))
    .map((s) => ({ ...s, instruction: s.instruction.slice(0, MAX_STEP) }));
  const draft = emptyDraft();
  return {
    ...draft,
    name: name.slice(0, 80),
    ingredients: ingredients.length ? ingredients : draft.ingredients,
    steps: steps.length ? steps : draft.steps,
    sourceUrl: usable(sourceUrl),
    sourceName: String(siteName || (sourceUrl ? socialName(sourceUrl) : '')).slice(0, 80),
    prepMinutes: '',
    cookMinutes: '',
    imported: true
  };
}

/** Rows in a draft with something in them, for "12 ingredients and 6 steps". */
export function draftCounts(draft) {
  return {
    ingredients: (draft.ingredients || []).filter((r) => String(r.name || '').trim()).length,
    steps: (draft.steps || []).filter((s) => String(s.instruction || '').trim()).length
  };
}

// ---- Asking the Edge Function ---------------------------------------------

/**
 * @returns {Promise<{ ok: true, draft } | { ok: false, reason: string }>}
 *   reasons: offline, social, bad-url, no-recipe, fetch-failed, unavailable
 */
export async function importFromUrl(url) {
  const target = usable(url);
  if (!target) return { ok: false, reason: 'bad-url' };
  if (isSocialHost(target)) return { ok: false, reason: 'social' };
  if (isOffline()) return { ok: false, reason: 'offline' };
  if (!supabase || !supabase.functions || typeof supabase.functions.invoke !== 'function') {
    return { ok: false, reason: 'unavailable' };
  }
  let result;
  try {
    result = await supabase.functions.invoke('import-recipe', { body: { url: target } });
  } catch {
    return { ok: false, reason: isOffline() ? 'offline' : 'fetch-failed' };
  }
  // supabase-js resolves rather than rejects: check error before data.
  if (!result || result.error) return { ok: false, reason: isOffline() ? 'offline' : 'fetch-failed' };
  const data = result.data || {};
  if (!data.ok) return { ok: false, reason: data.reason || 'fetch-failed' };
  const recipe = pickRecipe(data.recipes);
  const draft = recipe && jsonLdToDraft(recipe, { sourceUrl: data.finalUrl || target, siteName: data.siteName });
  if (!draft) return { ok: false, reason: 'no-recipe', siteName: data.siteName || hostOf(target) };
  return { ok: true, draft };
}

/**
 * One of your meals already imported from this page, or null.
 * Before migration 027 there is no source_url column, so the answer is null.
 */
export async function findExisting(sourceUrl) {
  const target = usable(sourceUrl);
  if (!target) return null;
  const { data, error } = await supabase.from('meals').select('id, name').eq('source_url', target).limit(1);
  if (error) {
    if (isMissingColumnError(error, 'source_url')) return null;
    return null;
  }
  return (data && data[0]) || null;
}

// ---- Links kept for later (shared while offline) ---------------------------

export function keptLinks() {
  try {
    const list = JSON.parse(localStorage.getItem(KEPT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && usable(x.url)) : [];
  } catch { return []; }
}

export function keepForLater(url, title = '') {
  const target = usable(url);
  if (!target) return false;
  const list = keptLinks().filter((x) => x.url !== target);
  list.unshift({ url: target, title: String(title || '').slice(0, 120), keptAt: new Date().toISOString() });
  try { localStorage.setItem(KEPT_KEY, JSON.stringify(list.slice(0, MAX_KEPT))); return true; } catch { return false; }
}

export function forgetKept(url) {
  const list = keptLinks().filter((x) => x.url !== url);
  try { localStorage.setItem(KEPT_KEY, JSON.stringify(list)); } catch { /* fine */ }
}

// ---- Handing the draft to the editor ---------------------------------------

export function stashImportDraft(draft) {
  try { sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}

/** Reads and removes the handed-over draft, so a reload does not import twice. */
export function takeImportDraft() {
  try {
    const raw = sessionStorage.getItem(IMPORT_DRAFT_KEY);
    sessionStorage.removeItem(IMPORT_DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    return draft && Array.isArray(draft.ingredients) ? draft : null;
  } catch { return null; }
}
