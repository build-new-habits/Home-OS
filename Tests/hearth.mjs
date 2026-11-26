// Tests/hearth.mjs — 26 Nov 2026 v1
// Gate 14. Phase 36a: Free and Hearth.
//
// The tier rules, the Free limits, the monthly library rotation, the import
// counter, the database answers (Hearth, Free, no row, no table yet), and
// the words: the Hearth card and page never push, never shame.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

let answer = { data: [{ plan: 'hearth', hearth_until: null }], error: null };
let counts = { meals: 0, pantry_stock: 0 };
const query = (table) => {
  const q = {
    select: () => q, limit: () => Promise.resolve(answer), is: () => Promise.resolve({ count: counts[table], error: null })
  };
  if (table === 'pantry_stock') q.select = () => Promise.resolve({ count: counts.pantry_stock, error: null });
  return q;
};
globalThis.__HOME_OS_SUPABASE_STUB__ = { from: query };
globalThis.__HOME_OS_TIER__ = 'data'; // use the real answer from the stubbed table

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const h = await import(pathToFileURL(path.join(REPO, 'js/data/hearth.js')).href);

// 1. Rows.
const now = new Date('2026-11-26T12:00:00Z');
check('hearth with no end date', h.rowIsHearth({ plan: 'hearth', hearth_until: null }, now));
check('hearth until next month', h.rowIsHearth({ plan: 'hearth', hearth_until: '2026-12-26T00:00:00Z' }, now));
check('hearth that ended is Free', !h.rowIsHearth({ plan: 'hearth', hearth_until: '2026-11-01T00:00:00Z' }, now));
check('free is Free', !h.rowIsHearth({ plan: 'free' }, now));
check('no row is Free', !h.rowIsHearth(null, now));

// 2. What the database says.
await h.loadHearth({ force: true });
check('a Hearth household is Hearth', h.isHearth());
answer = { data: [], error: null };
await h.loadHearth({ force: true });
check('no row is Free', !h.isHearth());
answer = { data: null, error: { code: '42P01', message: 'relation "household_entitlements" does not exist' } };
await h.loadHearth({ force: true });
check('before migration 028, nothing shrinks (Hearth)', h.isHearth());

// 3. Free limits.
answer = { data: [{ plan: 'free' }], error: null };
await h.loadHearth({ force: true });
counts = { meals: 9, pantry_stock: 29 };
check('9 recipes: room for one more', (await h.canAdd('recipes')).ok);
counts.meals = 10;
const full = await h.canAdd('recipes');
check('10 recipes: full', !full.ok && full.limit === 10 && full.used === 10, JSON.stringify(full));
check('29 in the pantry: room', (await h.canAdd('pantry')).ok);
counts.pantry_stock = 30;
check('30 in the pantry: full', !(await h.canAdd('pantry')).ok);
store.clear();
for (let i = 0; i < 3; i += 1) {
  check(`import ${i + 1} allowed`, (await h.canAdd('imports')).ok);
  h.countImport();
}
check('a fourth import this month is not', !(await h.canAdd('imports')).ok);
check('imports reset next month', h.importsThisMonth(new Date('2027-01-02T00:00:00Z')) === 0);
answer = { data: [{ plan: 'hearth' }], error: null };
await h.loadHearth({ force: true });
check('Hearth has no limits', (await h.canAdd('recipes')).ok && (await h.canAdd('pantry')).ok && (await h.canAdd('imports')).ok);

// 4. This month's library.
const slugs = Array.from({ length: 60 }, (_, i) => `recipe-${i}`);
const nov = h.libraryThisMonth(slugs, new Date('2026-11-05'));
const nov2 = h.libraryThisMonth(slugs, new Date('2026-11-28'));
const dec = h.libraryThisMonth(slugs, new Date('2026-12-05'));
check('ten a month', nov.length === 10);
check('the same ten all month', nov.join() === nov2.join());
check('a different ten next month', nov.join() !== dec.join());
check('a small library shows all of it', h.libraryThisMonth(slugs.slice(0, 4), now).length === 4);

// 5. The words.
const files = ['js/data/hearth.js', 'js/components/hearthCard.js', 'js/views/hearth.js'];
for (const file of files) {
  const text = readFileSync(path.join(REPO, file), 'utf8');
  const strings = [...text.matchAll(/(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s));
  for (const word of ['upgrade now', 'limited time', 'hurry', 'don\'t miss', 'unlock now', 'only today', 'you\'re missing', 'just', 'simply']) {
    const hit = strings.find((s) => s.toLowerCase().includes(word));
    check(`${file} copy avoids "${word}"`, !hit, hit);
  }
}
const page = await import(pathToFileURL(path.join(REPO, 'js/views/hearth.js')).href);
check('accessibility is never paid for', page.ROWS.find((r) => /contrast/i.test(r[0]))[1] === 'Always');
check('export is never paid for', page.ROWS.find((r) => /export/i.test(r[0]))[1] === 'Always');
check('the table states the Free limits from one place', page.ROWS.some((r) => r[1].includes(String(h.FREE_LIMITS.recipes))));

console.log(`  ${checks} checks`);
if (failures.length) { for (const f of failures) console.log(`  ✗ ${f}`); process.exit(1); }
console.log('  ✓ hearth: tiers, limits, rotation, counter, and kind words');
