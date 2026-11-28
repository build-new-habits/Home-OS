// js/data/aiImport.js — 28 Nov 2026 v1
// Phase 45 (the Phase 17 brief, unparked for Hearth). A recipe read by AI
// from a photo of a cookbook page or card, or from messy pasted text.
//
// ---- Where the work happens ----
// The Edge Function (supabase/functions/ai-import-recipe) checks sign-in,
// Hearth and fair use, asks Claude, and hands back its structured answer
// untouched. Everything that decides what the recipe SAYS is here, in plain
// functions Tests/aiImport.mjs checks: a wrong guess is a commit, not a
// redeploy.
//
// ---- What is never trusted ----
// The model's answer is treated like any page's data: every field checked,
// cut to length, and every step held to RECIPE_STEP_STYLE.md (no banned
// words, at most 20 words, one action) before it reaches Check and save.
// Anything the model was unsure of is listed at the top of that screen.
// Nothing is saved until you press Save.
//
// ---- Photos ----
// Shrunk on the phone to at most 1568 pixels on the long side before
// sending (the size the model reads best, and a tenth of the upload). Sent
// for this one request and not kept by Home-OS.

import { supabase } from '../supabaseClient.js';
import { emptyDraft, newIngredient, newStep, newSwap, MAX_STEP, MAX_NOTE } from './ownRecipe.js';
import { isOffline } from '../lib/net.js';

export const MAX_PHOTOS = 2;
export const LONG_EDGE = 1568;
export const MAX_TEXT = 12000;
export const MAX_WORDS = 20;
const UNITS = ['g', 'ml', 'tsp', 'tbsp', 'item'];
const KINDS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
const COURSES = ['starter', 'main', 'pudding'];
const BANNED = ['simply', 'just', 'obviously', 'quickly', 'easy', 'easily', 'merely', 'meanwhile'];

function text(value, max = 200) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function amount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 100) / 100 : '';
}

function minutes(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 24 * 60 ? Math.round(n) : '';
}

/** Takes out the words the house style bans, and tidies what is left. Pure. */
export function withoutBanned(sentence) {
  let s = String(sentence || '');
  for (const word of BANNED) s = s.replace(new RegExp(`\\b${word}\\b[,]?\\s*`, 'gi'), '');
  s = s.replace(/\s+([,.])/g, '$1').replace(/\s+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function words(s) {
  return String(s || '').split(/\s+/).filter(Boolean).length;
}

/**
 * One step in the house style: banned words out, and a long step split at a
 * sentence end, a semicolon or ", then". Returns one or more step texts. Pure.
 */
export function styleStep(raw) {
  const clean = withoutBanned(text(raw, MAX_STEP));
  if (!clean) return [];
  if (words(clean) <= MAX_WORDS) return [clean];
  const parts = clean
    .split(/(?<=[.!?])\s+|;\s+|,\s+then\s+|\s+and then\s+/i)
    .map((p) => withoutBanned(p.replace(/[;,]$/, '')))
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`));
  return parts.length > 1 ? parts : [clean];
}

/**
 * The model's save_recipe answer as a draft for Check and save.
 * @returns {{ ok: true, draft } | { ok: false, reason: 'not-a-recipe' | 'empty', why?: string }}
 */
export function aiToDraft(recipe, { sourceUrl = '', sourceName = '' } = {}) {
  if (!recipe || typeof recipe !== 'object') return { ok: false, reason: 'empty' };
  if (recipe.is_recipe === false) return { ok: false, reason: 'not-a-recipe', why: text(recipe.not_a_recipe, 120) };

  const checkFirst = [];
  const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .slice(0, 60)
    .map((row) => {
      const name = text(row && row.name, 80);
      if (!name) return null;
      const unit = UNITS.includes(row.unit) ? row.unit : 'g';
      const quantity = amount(row.quantity);
      if (row.unsure || quantity === '') checkFirst.push(quantity === '' ? `How much ${name}` : name);
      const swaps = (Array.isArray(row.swaps) ? row.swaps : []).slice(0, 3)
        .map((s) => {
          const swapName = text(s && s.name, 80);
          if (!swapName || swapName.toLowerCase() === name.toLowerCase()) return null;
          return newSwap({
            name: swapName,
            quantity: amount(s.quantity) === '' ? quantity : amount(s.quantity),
            unit: UNITS.includes(s.unit) ? s.unit : unit,
            label: text(s.label, 30) || 'Swap'
          });
        })
        .filter(Boolean);
      return newIngredient({ name, quantity, unit, said: text(row.said, 40), swaps });
    })
    .filter(Boolean);

  const steps = [];
  for (const step of (Array.isArray(recipe.steps) ? recipe.steps : []).slice(0, 40)) {
    const parts = styleStep(step && (step.text || step.instruction));
    parts.forEach((instruction, i) => {
      const last = i === parts.length - 1;
      const note = last ? withoutBanned(text(step.note, MAX_NOTE)) : '';
      steps.push(newStep({ instruction, minutes: last ? minutes(step.minutes) : '', ...(note ? { note } : {}) }));
    });
  }

  const name = text(recipe.name, 80);
  if (!name && !ingredients.length && !steps.length) return { ok: false, reason: 'empty' };

  for (const note of (Array.isArray(recipe.check_first) ? recipe.check_first : []).slice(0, 5)) {
    const t = text(note, 120);
    if (t && !checkFirst.includes(t)) checkFirst.push(t);
  }

  const draft = emptyDraft();
  const serves = Math.round(Number(recipe.serves));
  return {
    ok: true,
    draft: {
      ...draft,
      name,
      kind: KINDS.includes(recipe.kind) ? recipe.kind : draft.kind,
      course: COURSES.includes(recipe.course) ? recipe.course : draft.course,
      serves: Number.isFinite(serves) && serves >= 1 ? Math.min(12, serves) : draft.serves,
      ingredients: ingredients.length ? ingredients : draft.ingredients,
      steps: steps.length ? steps : draft.steps,
      sourceUrl: /^https?:\/\//i.test(sourceUrl) ? String(sourceUrl).slice(0, 2000) : '',
      sourceName: text(sourceName, 80),
      prepMinutes: minutes(recipe.prep_minutes),
      cookMinutes: minutes(recipe.cook_minutes),
      imported: true,
      readByAi: true,
      checkFirst: checkFirst.slice(0, 8)
    }
  };
}

/** Width and height to send a photo at: long edge at most LONG_EDGE. Pure. */
export function fitSize(width, height, longEdge = LONG_EDGE) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const scale = Math.min(1, longEdge / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * A chosen photo as { media_type, data } (base64 JPEG), shrunk to fit.
 * @returns {Promise<{ media_type: string, data: string } | null>} null when it is not a picture this phone can open
 */
export async function preparePhoto(file) {
  if (!file || !/^image\//.test(file.type || '')) return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = fitSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === 'function') bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return { media_type: 'image/jpeg', data: btoa(binary) };
  } catch {
    return null;
  }
}

/**
 * Asks the Edge Function to read a recipe.
 * @param {{ photos?: Array<{media_type,data}>, text?: string, sourceUrl?: string, sourceName?: string }} input
 * @returns {Promise<{ ok: true, draft, left?: number } | { ok: false, reason: string, why?: string, limit?: number }>}
 *   reasons: offline, unavailable, not-hearth, limit, not-a-recipe, empty,
 *            too-big, too-long, busy, timeout, failed, signed-out
 */
export async function readWithAi({ photos = [], text: pasted = '', sourceUrl = '', sourceName = '' } = {}) {
  const body = photos.length
    ? { kind: 'photo', images: photos.slice(0, MAX_PHOTOS) }
    : { kind: 'text', text: String(pasted || '').slice(0, MAX_TEXT) };
  if (body.kind === 'text' && !body.text.trim()) return { ok: false, reason: 'empty' };
  if (isOffline()) return { ok: false, reason: 'offline' };
  if (!supabase || !supabase.functions || typeof supabase.functions.invoke !== 'function') {
    return { ok: false, reason: 'unavailable' };
  }
  let result;
  try {
    result = await supabase.functions.invoke('ai-import-recipe', { body });
  } catch {
    return { ok: false, reason: isOffline() ? 'offline' : 'failed' };
  }
  if (!result || result.error) {
    const status = result && result.error && result.error.context && result.error.context.status;
    if (status === 401) return { ok: false, reason: 'signed-out' };
    return { ok: false, reason: isOffline() ? 'offline' : 'failed' };
  }
  const data = result.data || {};
  if (!data.ok) return { ok: false, reason: data.reason || 'failed', limit: data.limit };
  const made = aiToDraft(data.recipe, {
    sourceUrl,
    sourceName
  });
  if (made.ok) made.draft.readFrom = photos.length ? 'photo' : 'text';
  return made.ok ? { ok: true, draft: made.draft, left: data.left } : made;
}

/** One plain sentence for each way a read can end without a recipe. Pure. */
export function aiProblem(reason, { why = '', limit = 0 } = {}) {
  switch (reason) {
    case 'offline': return 'You are offline. Reading a photo or text with AI needs a connection.';
    case 'not-hearth': return 'Reading photos and captions with AI is part of Hearth.';
    case 'limit': return `This household has used its ${limit || 'monthly'} AI reads for this month. They start again on the 1st. Paste or type the recipe in the meantime.`;
    case 'not-a-recipe': return `No recipe was found${why ? `: ${why.replace(/\.$/, '')}` : ''}. Try a photo of the ingredients and method, or paste the text.`;
    case 'empty': return 'Nothing could be read. Try a clearer photo in good light, one page at a time.';
    case 'unreadable': return 'The answer came back in a form Home-OS could not read. Try once more.';
    case 'too-big': return 'That photo is too large to send. Try a smaller one.';
    case 'too-many': return `Choose up to ${MAX_PHOTOS} photos: one recipe, one or two pages.`;
    case 'not-a-photo':
    case 'no-photo': return 'That file is not a photo this phone can open. Choose a JPEG or PNG.';
    case 'too-long': return `That is more text than one recipe. Paste up to ${MAX_TEXT.toLocaleString('en-GB')} characters.`;
    case 'busy': return 'The AI service is busy. Try again in a minute.';
    case 'timeout': return 'Reading took too long and stopped. Try once more, or one page at a time.';
    case 'signed-out': return 'You need to be signed in to read recipes with AI.';
    case 'unavailable': return 'Reading with AI is not switched on yet. Paste or type the recipe for now.';
    default: return 'Reading the recipe did not work this time. Try once more, or paste the text.';
  }
}
