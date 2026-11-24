// supabase/functions/import-recipe/index.ts — 24 Nov 2026 v1
// Phase 33. Fetch a recipe web page and return its schema.org Recipe data.
//
// ---- Deliberately simple ----
// This function FETCHES and EXTRACTS. It does not interpret. Turning a
// Recipe object into an ingredient list and steps happens in the app
// (js/data/recipeImport.js), where the gates can test it. A bug here needs
// a redeploy; a bug there needs a commit.
//
// ---- What it will not do ----
// - Call any AI model. Per-use cost is Phase 17's question, and it is parked.
// - Read Instagram, TikTok, Facebook, YouTube, Pinterest or X. They sit
//   behind login walls and their terms forbid it. The app asks for the
//   caption instead.
// - Fetch private, loopback or link-local addresses (server-side request
//   forgery): a page must not be able to point this at Supabase's own
//   internal network.
// - Log page content. The host only.
//
// ---- Deploy ----
// Supabase dashboard → Edge Functions → Deploy a new function, name
// "import-recipe", paste this file. Leave "Verify JWT" ON: only a
// signed-in Home-OS user can call it. Or: supabase functions deploy
// import-recipe. Record the deploy in Docs/Current/MIGRATIONS_APPLIED.md.
//
// Written as JavaScript-compatible TypeScript (erasable annotations only)
// so Tests/import.mjs can import the pure functions under Node.

const ALLOWED_ORIGINS = [
  'https://build-new-habits.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export const SOCIAL_HOSTS = [
  'instagram.com', 'tiktok.com', 'facebook.com', 'fb.watch', 'fb.com',
  'youtube.com', 'youtu.be', 'pinterest.com', 'pin.it', 'x.com',
  'twitter.com', 'threads.net'
];

/** True for a social host or any of its subdomains (m.facebook.com, vm.tiktok.com). Pinterest has country domains. */
export function isSocialHost(hostname: string): boolean {
  const h = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (/(^|\.)pinterest\.[a-z.]+$/.test(h)) return true;
  return SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`));
}

/** An IPv4 or IPv6 literal that must never be fetched. */
export function isPrivateAddress(address: string): boolean {
  const a = String(address || '').toLowerCase().replace(/^\[|\]$/g, '');
  const v4 = a.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [p, q] = [Number(v4[1]), Number(v4[2])];
    return p === 0 || p === 10 || p === 127 || p >= 224
      || (p === 100 && q >= 64 && q <= 127)
      || (p === 169 && q === 254)
      || (p === 172 && q >= 16 && q <= 31)
      || (p === 192 && q === 168)
      || (p === 198 && (q === 18 || q === 19));
  }
  if (a.includes(':')) {
    if (a === '::' || a === '::1') return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(a);
  }
  return false;
}

/** Checks a URL before fetching. Returns a reason string, or '' when fine. */
export function checkUrl(raw: string): string {
  let url: URL;
  try { url = new URL(String(raw || '').trim()); } catch { return 'bad-url'; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'bad-url';
  if (url.username || url.password) return 'bad-url';
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost')
    || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return 'blocked';
  if (isPrivateAddress(host)) return 'blocked';
  if (isSocialHost(host)) return 'social';
  return '';
}

function typesOf(node: any): string[] {
  const t = node && node['@type'];
  return (Array.isArray(t) ? t : [t]).filter(Boolean).map((x: any) => String(x).replace(/^.*[/#]/, ''));
}

/** Every Recipe object in a parsed JSON-LD value: arrays, @graph, mainEntity, nested. */
export function recipesIn(value: any, found: any[] = [], depth = 0): any[] {
  if (!value || typeof value !== 'object' || depth > 6) return found;
  if (Array.isArray(value)) {
    for (const item of value) recipesIn(item, found, depth + 1);
    return found;
  }
  if (typesOf(value).includes('Recipe')) { found.push(value); return found; }
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    if (value[key]) recipesIn(value[key], found, depth + 1);
  }
  return found;
}

function decodeEntities(text: string): string {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Recipe objects from a page's <script type="application/ld+json"> blocks. Never throws. */
export function extractRecipes(html: string): any[] {
  const found: any[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of String(html || '').matchAll(re)) {
    const body = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/^<!--|-->$/g, '').trim();
    if (!body) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      // Some sites put raw newlines inside strings. One cheap repair, then give up.
      try { parsed = JSON.parse(body.replace(/[\r\n\t]+/g, ' ')); } catch { continue; }
    }
    recipesIn(parsed, found);
  }
  return found;
}

/** The site's own name: og:site_name, then the Recipe's publisher, then the host without www. */
export function siteNameFrom(html: string, recipe: any, hostname: string): string {
  const og = String(html || '').match(/<meta\b[^>]*property\s*=\s*["']og:site_name["'][^>]*>/i);
  if (og) {
    const content = og[0].match(/content\s*=\s*["']([^"']+)["']/i);
    if (content && content[1].trim()) return decodeEntities(content[1].trim()).slice(0, 80);
  }
  const pub = recipe && recipe.publisher;
  const pubName = Array.isArray(pub) ? pub[0] && pub[0].name : pub && pub.name;
  if (pubName && String(pubName).trim()) return decodeEntities(String(pubName).trim()).slice(0, 80);
  return String(hostname || '').replace(/^www\./, '');
}

async function hostResolvesPrivate(hostname: string): Promise<boolean> {
  // Not every runtime allows DNS lookups. Where it does, refuse a public
  // name that points at a private address; where it does not, the literal
  // checks in checkUrl still stand.
  const resolve = (globalThis as any).Deno && (globalThis as any).Deno.resolveDns;
  if (!resolve) return false;
  for (const kind of ['A', 'AAAA']) {
    try {
      const addrs: string[] = await resolve(hostname, kind);
      if (addrs.some(isPrivateAddress)) return true;
    } catch { /* no records of this kind, or lookups not allowed */ }
  }
  return false;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body && res.body.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    if (total + value.length > MAX_BYTES) { await reader.cancel(); break; }
    total += value.length;
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  return new TextDecoder('utf-8', { fatal: false }).decode(all);
}

async function fetchPage(start: string): Promise<{ ok: boolean; reason?: string; html?: string; finalUrl?: string }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const reason = checkUrl(current);
    if (reason) return { ok: false, reason };
    const host = new URL(current).hostname;
    if (await hostResolvesPrivate(host)) return { ok: false, reason: 'blocked' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.8',
          'User-Agent': 'Home-OS recipe import (+https://build-new-habits.github.io/Home-OS/)'
        }
      });
    } catch {
      clearTimeout(timer);
      return { ok: false, reason: 'fetch-failed' };
    }
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) return { ok: false, reason: 'fetch-failed' };
      current = new URL(next, current).toString();
      continue;
    }
    if (!res.ok) return { ok: false, reason: 'fetch-failed' };
    const type = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(type)) return { ok: false, reason: 'not-a-page' };
    const html = await readCapped(res);
    return { ok: true, html, finalUrl: current };
  }
  return { ok: false, reason: 'fetch-failed' };
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

export async function handle(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get('origin'));
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, reason: 'method' }, 405);

  let url = '';
  try { url = String((await req.json()).url || ''); } catch { return reply({ ok: false, reason: 'bad-url' }, 400); }

  const early = checkUrl(url);
  if (early) return reply({ ok: false, reason: early });

  const page = await fetchPage(url);
  const host = (() => { try { return new URL(page.finalUrl || url).hostname; } catch { return '?'; } })();
  console.log(`import-recipe ${host} ${page.ok ? 'fetched' : page.reason}`);
  if (!page.ok) return reply({ ok: false, reason: page.reason });

  const recipes = extractRecipes(page.html || '');
  return reply({
    ok: true,
    recipes: recipes.slice(0, 5),
    siteName: siteNameFrom(page.html || '', recipes[0], host),
    finalUrl: page.finalUrl
  });
}

const D = (globalThis as any).Deno;
if (D && typeof D.serve === 'function') D.serve(handle);
