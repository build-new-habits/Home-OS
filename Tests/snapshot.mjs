// Tests/snapshot.mjs — 01 Sep 2026 v1
// Gate 10. Every view's structure, frozen and compared.
//
// ---- What this is NOT ----
// It is not visual regression. That needs a real browser, real layout and
// pixel diffs, and this project has no CI and no browser — jsdom has no
// layout engine at all. Anybody reading this hoping for screenshots should
// stop here: colour, spacing, overflow and actual appearance are still
// found by a human looking at a phone.
//
// ---- What it IS, and why it is worth having ----
// Every visual bug this project has actually had was STRUCTURAL:
//
//   - the recipe library built last on the page, below the add form
//   - the weight trend rendered at 320x140, a thumbnail
//   - the ingredient picker vanishing when a card build threw
//   - "4 item" where a label belonged
//
// Not one of those needed a pixel to detect. Each was a change in what
// elements existed and in what order — and each shipped because no gate
// held a picture of what the screen was supposed to contain.
//
// So: render each view, take a normalised fingerprint of its DOM, and
// commit it. A change is not a failure — it is a change, and it has to be
// looked at and accepted deliberately.
//
// ---- Accepting a change ----
//   UPDATE_SNAPSHOTS=1 bash Tests/run-all.sh
//
// That is the whole workflow. The point is not to prevent change; it is to
// stop change happening WITHOUT ANYBODY SEEING IT.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const REPO = process.env.GATE_REPO || process.cwd();

// ---- Baselines live in the REAL repo, never the shadow ----
// run-all.sh copies the project to a throwaway directory and runs there.
// Writing baselines into that copy meant they were discarded every run, so
// the gate wrote fresh ones and compared nothing — it passed permanently
// and proved nothing at all.
//
// GATE_SOURCE_REPO is set by the runner to the original path.
const SOURCE = process.env.GATE_SOURCE_REPO || REPO;
const SNAP_DIR = path.join(SOURCE, 'Tests', 'snapshots');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

const failures = [];
let checked = 0;
let written = 0;

/**
 * Text that changes on its own is not structure.
 *
 * Dates, counts, times and money all move without anybody editing a view,
 * and a snapshot that fails every morning is a snapshot people delete. Only
 * the SHAPE of the text is kept.
 */
function normaliseText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\d{4}-\d{2}-\d{2}/g, '<date>')
    .replace(/\d{1,2}:\d{2}/g, '<time>')
    .replace(/[£$€]\s?\d[\d.,]*/g, '<money>')
    .replace(/\b\d[\d.,]*\b/g, '<n>')
    .slice(0, 80);
}

/**
 * A fingerprint of one element: what it is, what it is for, and where.
 *
 * Attributes are limited to the ones that carry MEANING — role, type,
 * headings, labels, pressed and expanded state. An id or a data attribute
 * would make the snapshot churn on every unrelated edit.
 */
function fingerprint(node, depth = 0) {
  if (depth > 12) return '';
  const parts = [];

  for (const child of node.children) {
    const tag = child.tagName.toLowerCase();
    const bits = [tag];

    const cls = (child.getAttribute('class') || '')
      .split(/\s+/).filter(Boolean).sort().join('.');
    if (cls) bits.push(`.${cls}`);

    for (const attr of ['role', 'type', 'aria-expanded', 'aria-pressed', 'scope', 'hidden']) {
      const value = child.getAttribute(attr);
      if (value !== null) bits.push(`[${attr}=${value}]`);
    }

    // Headings and controls carry their words: a heading that changes is a
    // change worth seeing, and a button that loses its label is a bug.
    if (/^(h[1-6]|button|summary|label|legend|caption|a)$/.test(tag)) {
      const text = normaliseText(child.textContent);
      if (text) bits.push(`"${text}"`);
    }

    parts.push('  '.repeat(depth) + bits.join(''));
    parts.push(fingerprint(child, depth + 1));
  }

  return parts.filter(Boolean).join('\n');
}

/** A minimal Supabase stub — the same shape the other gates use. */
const CHAIN = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt',
  'gte', 'lt', 'lte', 'order', 'limit', 'range', 'match', 'is', 'in', 'not', 'filter'];

function stubClient() {
  const builder = () => {
    const b = {};
    for (const m of CHAIN) b[m] = () => b;
    b.single = () => b;
    b.maybeSingle = () => b;
    b.then = (res) => Promise.resolve({ data: [], error: null }).then(res);
    return b;
  };
  return {
    from: () => builder(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.test/', pretendToBeVisual: true
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// navigator is a getter-only global in modern node; the a11y gate hit the
// same wall and defineProperty is the way round it.
Object.defineProperty(globalThis, 'navigator',
  { value: dom.window.navigator, configurable: true, writable: true });
globalThis.CSS = dom.window.CSS;
// The views construct an AbortController and pass its signal to jsdom
// elements. Node's own AbortSignal is a DIFFERENT class, and jsdom rejects
// it — so both must come from the window, exactly as the a11y gate does.
globalThis.AbortController = dom.window.AbortController;
globalThis.AbortSignal = dom.window.AbortSignal;
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.__HOME_OS_SUPABASE_STUB__ = stubClient();
globalThis.fetch = () => Promise.reject(new Error('no network in the gate'));

if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });

const routesMod = await import(pathToFileURL(path.join(REPO, 'js/routes.js')).href);

for (const route of routesMod.routes) {
  const mod = await route.load();
  if (typeof mod.render !== 'function') continue;

  const mount = document.createElement('div');
  document.body.appendChild(mount);

  let teardown;
  try {
    teardown = mod.render(mount);
    // Views load asynchronously; without this the snapshot is of a
    // half-painted screen and changes every run.
    await new Promise((r) => setTimeout(r, 60));
  } catch (error) {
    failures.push(`${route.path}: threw while rendering — ${error.message}`);
    mount.remove();
    continue;
  }

  const current = fingerprint(mount);
  const file = path.join(SNAP_DIR, `${route.path}.txt`);
  checked += 1;

  if (!existsSync(file) || UPDATE) {
    writeFileSync(file, current + '\n');
    written += 1;
  } else {
    const baseline = readFileSync(file, 'utf8').trimEnd();
    if (baseline !== current) {
      // Show the first difference rather than the whole tree: a wall of
      // diff is a wall people skim.
      const a = baseline.split('\n');
      const b = current.split('\n');
      let at = 0;
      while (at < a.length && at < b.length && a[at] === b[at]) at += 1;
      failures.push(
        `${route.path}: structure changed at line ${at + 1}\n`
        + `      was: ${a[at] === undefined ? '(nothing)' : a[at].trim()}\n`
        + `      now: ${b[at] === undefined ? '(nothing)' : b[at].trim()}\n`
        + `      ${b.length - a.length >= 0 ? '+' : ''}${b.length - a.length} lines overall`
      );
    }
  }

  if (typeof teardown === 'function') teardown();
  mount.remove();
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(`\nSNAPSHOT GATE FAILED — ${failures.length} of ${checked} views changed`);
  console.log('If the change was intended:  UPDATE_SNAPSHOTS=1 bash Tests/run-all.sh');
  process.exit(1);
}

const note = written > 0 ? ` (${written} baseline${written === 1 ? '' : 's'} written)` : '';
console.log(`SNAPSHOT GATE PASSED — ${checked} views match their structure${note}`);
