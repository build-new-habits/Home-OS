// supabase/functions/ai-import-recipe/index.ts — 28 Nov 2026 v1
// Phase 45 (the Phase 17 brief, unparked for Hearth). Read a recipe from a
// photo of a cookbook page or card, or from messy pasted text, with Claude.
//
// ---- Why it is its own function ----
// import-recipe (Phase 33) is free to run and stays AI-free. Everything that
// costs money per use is here, behind three checks made BEFORE any AI call:
//   1. signed in             (Supabase Auth)
//   2. the household is Hearth (household_entitlements, read with the
//                              user's own token, so RLS decides)
//   3. fair use              (ai_imports this calendar month < AI_MONTHLY_LIMIT)
// A check that cannot be made is a no. Before migration 031 the counter
// table is missing, so the answer is "unavailable", never a free AI call.
//
// ---- What it returns ----
// { ok: true, recipe, left } or { ok: false, reason }.
// `recipe` is the model's structured answer, untouched. js/data/recipeImport.js
// (aiToDraft) turns it into a draft, checks every step against the house
// style and marks what the model was unsure of. Nothing is written to meals
// here: the draft goes to Check and save, like every other import.
//
// ---- Copyright ----
// Ingredients and the sequence of actions are facts and procedures. The
// author's prose is theirs. The instruction below makes the model rewrite
// every step in RECIPE_STEP_STYLE.md from scratch and drop headnotes and
// stories outright. Nothing is transcribed.
//
// ---- Privacy ----
// Photos and text are sent to Anthropic's API for this one request and are
// not stored by Home-OS. The log line is the kind and the outcome only.
//
// ---- Secrets (Supabase → Edge Functions → Secrets) ----
//   ANTHROPIC_API_KEY   required
//   AI_MODEL            optional, default claude-sonnet-5-5
//   AI_MONTHLY_LIMIT    optional, default 60 imports per household a month
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// to every function automatically.
//
// ---- Deploy ----
// Dashboard → Edge Functions → Deploy a new function, name "ai-import-recipe",
// paste this file. Settings → "Verify JWT with legacy secret" OFF, as for
// import-recipe: signedIn() below is the check. Record it in
// Docs/Current/MIGRATIONS_APPLIED.md.
//
// JavaScript-compatible TypeScript (erasable annotations only), so
// Tests/aiImport.mjs can import the pure parts under Node.

const ALLOWED_ORIGINS = [
  'https://build-new-habits.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

export const MAX_IMAGES = 2;
export const MAX_IMAGE_BYTES = 3_000_000;   // base64 length, per image
export const MAX_TEXT = 12_000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const UNITS = ['g', 'ml', 'tsp', 'tbsp', 'item'];
export const KINDS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
export const COURSES = ['starter', 'main', 'pudding'];
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const DEFAULT_LIMIT = 60;
const AI_TIMEOUT_MS = 55_000;

export const INSTRUCTION = [
  'You turn a recipe into structured data for a home cooking app. You will see a photo of a cookbook page or recipe card, or some pasted text such as a social media caption.',
  'Call save_recipe exactly once.',
  'If there is no recipe, set is_recipe to false and say why in not_a_recipe, in a few plain words (for example "a page of text with no ingredients" or "too blurred to read").',
  'Ingredients: the facts only. Give a plain food name a shopper would recognise, with no preparation words (write "onion", not "onion, finely chopped").',
  'Convert every amount to g, ml, tsp, tbsp or item. Cups, ounces, pounds, sticks and pints become grams or millilitres. Keep what the recipe said in "said", for example "1 cup" or "8 oz".',
  'If an amount is missing or you cannot read it, set quantity to null and unsure to true. Never guess silently: anything you were not sure of has unsure true.',
  'Steps: do NOT copy the method. Rewrite it from scratch in this house style:',
  '- one action per step, starting with a verb; at most 20 words each;',
  '- name the ingredient in each step it is used;',
  '- never use the words simply, just, obviously, quickly, easy, easily, merely or meanwhile;',
  '- times and temperatures in figures ("Bake for 25 minutes at 200C (180C fan)");',
  '- a tip or a warning goes in the step note, not the step.',
  'Leave out headnotes, stories, serving suggestions that are not steps, and anything about the author.',
  'swaps: where it helps, offer a vegetarian or vegan swap for meat, fish, dairy or eggs, or a common substitute for a hard-to-find ingredient. Leave swaps empty when there is nothing sensible.',
  'kind is the meal the recipe best fits. course is starter, main or pudding.',
  'serves is the number of people the recipe says, or your best reading of the amounts, from 1 to 12.',
  'check_first: up to five short notes about anything a cook should check against the page, such as a smudged amount.',
  'All text in British English.'
].join('\n');

const AMOUNT = { type: ['number', 'null'] };
export const TOOL = {
  name: 'save_recipe',
  description: 'Save the recipe as structured data.',
  input_schema: {
    type: 'object',
    properties: {
      is_recipe: { type: 'boolean' },
      not_a_recipe: { type: 'string' },
      name: { type: 'string' },
      serves: { type: 'integer' },
      kind: { type: 'string', enum: KINDS },
      course: { type: 'string', enum: COURSES },
      prep_minutes: AMOUNT,
      cook_minutes: AMOUNT,
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: AMOUNT,
            unit: { type: 'string', enum: UNITS },
            said: { type: 'string' },
            unsure: { type: 'boolean' },
            swaps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: AMOUNT,
                  unit: { type: 'string', enum: UNITS },
                  label: { type: 'string', description: 'For example "Vegetarian" or "Vegan"' }
                },
                required: ['name', 'unit', 'label']
              }
            }
          },
          required: ['name', 'unit']
        }
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            minutes: AMOUNT,
            note: { type: 'string' }
          },
          required: ['text']
        }
      },
      check_first: { type: 'array', items: { type: 'string' } }
    },
    required: ['is_recipe']
  }
};

/** Checks the request body. Returns a reason, or '' when fine. Pure. */
export function checkInput(body: any): string {
  if (!body || typeof body !== 'object') return 'bad-request';
  if (body.kind === 'photo') {
    const images = Array.isArray(body.images) ? body.images : [];
    if (!images.length) return 'no-photo';
    if (images.length > MAX_IMAGES) return 'too-many';
    for (const img of images) {
      if (!img || !IMAGE_TYPES.includes(img.media_type)) return 'not-a-photo';
      const data = String(img.data || '');
      if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) return 'not-a-photo';
      if (data.length > MAX_IMAGE_BYTES) return 'too-big';
    }
    return '';
  }
  if (body.kind === 'text') {
    const text = String(body.text || '').trim();
    if (!text) return 'no-text';
    if (text.length > MAX_TEXT) return 'too-long';
    return '';
  }
  return 'bad-request';
}

/** The Messages API request body. Pure. */
export function buildRequest(body: any, model: string = DEFAULT_MODEL): any {
  const content: any[] = [];
  if (body.kind === 'photo') {
    for (const img of body.images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
    }
    content.push({
      type: 'text',
      text: body.images.length > 1
        ? 'These photos are one recipe across two pages. Read them together.'
        : 'Here is the photo.'
    });
  } else {
    content.push({ type: 'text', text: `Here is the pasted text, between the lines.\n---\n${String(body.text).trim()}\n---` });
  }
  return {
    model,
    max_tokens: 4096,
    system: INSTRUCTION,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content }]
  };
}

/** The save_recipe input from an API response, or null. Defensive. Pure. */
export function readToolResult(api: any): any {
  const blocks = api && Array.isArray(api.content) ? api.content : [];
  const use = blocks.find((b: any) => b && b.type === 'tool_use' && b.name === TOOL.name);
  if (use && use.input && typeof use.input === 'object') return use.input;
  // Fallback: a text block holding JSON, fences or not.
  const text = blocks.filter((b: any) => b && b.type === 'text').map((b: any) => b.text).join('\n');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** First moment of this calendar month, UTC, as ISO. Pure. */
export function monthStart(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Is this entitlement row Hearth today? Same rule as js/data/hearth.js. Pure. */
export function rowIsHearth(row: any, now: Date = new Date()): boolean {
  if (!row || row.plan !== 'hearth') return false;
  if (!row.hearth_until) return true;
  const until = Date.parse(row.hearth_until);
  return Number.isFinite(until) && until > now.getTime();
}

/** "0-0/12" → 12. Pure. */
export function countFromRange(header: string | null): number | null {
  const m = String(header || '').match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

// ---- Talking to Supabase and Anthropic --------------------------------------

function env(name: string): string {
  const D = (globalThis as any).Deno;
  return (D && D.env.get(name)) || '';
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

async function signedInUser(authorization: string): Promise<string | null> {
  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY');
  if (!base || !key || !/^Bearer\s+\S+/i.test(authorization || '')) return null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: authorization, apikey: key } });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

/** The household's entitlement row, read as the user (RLS: members only). */
async function hearthHousehold(authorization: string): Promise<string | null> {
  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY');
  try {
    const res = await fetch(`${base}/rest/v1/household_entitlements?select=household_id,plan,hearth_until`, {
      headers: { Authorization: authorization, apikey: key }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows.find((r: any) => rowIsHearth(r)) : null;
    return row ? String(row.household_id) : null;
  } catch {
    return null;
  }
}

function serviceHeaders(): Record<string, string> | null {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return key ? { Authorization: `Bearer ${key}`, apikey: key } : null;
}

/** AI imports this household made this month, or null when it cannot be counted. */
async function usedThisMonth(householdId: string): Promise<number | null> {
  const headers = serviceHeaders();
  if (!headers) return null;
  const q = `household_id=eq.${encodeURIComponent(householdId)}&created_at=gte.${encodeURIComponent(monthStart())}`;
  try {
    const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/ai_imports?select=id&${q}`, {
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' }
    });
    if (!res.ok && res.status !== 416) return null;
    return countFromRange(res.headers.get('content-range'));
  } catch {
    return null;
  }
}

async function recordUse(householdId: string, userId: string, kind: string, outcome: string): Promise<void> {
  const headers = serviceHeaders();
  if (!headers) return;
  try {
    await fetch(`${env('SUPABASE_URL')}/rest/v1/ai_imports`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ household_id: householdId, user_id: userId, kind, outcome })
    });
  } catch { /* the import still happened; a lost count favours the household */ }
}

async function askClaude(body: any): Promise<{ ok: boolean; reason?: string; recipe?: any }> {
  const key = env('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, reason: 'unavailable' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(buildRequest(body, env('AI_MODEL') || DEFAULT_MODEL))
    });
    if (!res.ok) return { ok: false, reason: res.status === 529 || res.status === 429 ? 'busy' : 'failed' };
    const recipe = readToolResult(await res.json());
    return recipe ? { ok: true, recipe } : { ok: false, reason: 'unreadable' };
  } catch {
    return { ok: false, reason: 'timeout' };
  } finally {
    clearTimeout(timer);
  }
}

export async function handle(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get('origin'));
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, reason: 'method' }, 405);

  const authorization = req.headers.get('authorization') || '';
  const userId = await signedInUser(authorization);
  if (!userId) return reply({ ok: false, reason: 'signed-out' }, 401);

  let body: any = null;
  try { body = await req.json(); } catch { return reply({ ok: false, reason: 'bad-request' }, 400); }
  const problem = checkInput(body);
  if (problem) return reply({ ok: false, reason: problem });

  const householdId = await hearthHousehold(authorization);
  if (!householdId) return reply({ ok: false, reason: 'not-hearth' });

  const limit = Number(env('AI_MONTHLY_LIMIT')) || DEFAULT_LIMIT;
  const used = await usedThisMonth(householdId);
  if (used === null) return reply({ ok: false, reason: 'unavailable' });
  if (used >= limit) return reply({ ok: false, reason: 'limit', limit });

  const answer = await askClaude(body);
  const outcome = answer.ok ? (answer.recipe && answer.recipe.is_recipe === false ? 'not-a-recipe' : 'read') : String(answer.reason);
  console.log(`ai-import-recipe ${body.kind} ${outcome}`);
  // Count every call that reached the model, readable or not: each one cost.
  if (answer.ok || answer.reason === 'unreadable') await recordUse(householdId, userId, body.kind, outcome);
  if (!answer.ok) return reply({ ok: false, reason: answer.reason });
  return reply({ ok: true, recipe: answer.recipe, left: Math.max(0, limit - used - 1) });
}

const D = (globalThis as any).Deno;
if (D && typeof D.serve === 'function') D.serve(handle);
