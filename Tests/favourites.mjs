// Tests/favourites.mjs — 27 Nov 2026 v1
// Gate 15. Phase 36b: regulars come due on time, kinds go to the right
// list, and the weekly list is built once per chosen slot, never twice.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GATE_REPO || process.cwd();
globalThis.__HOME_OS_SUPABASE_STUB__ = globalThis.__HOME_OS_SUPABASE_STUB__ || {};
const store = new Map();
const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
globalThis.localStorage = globalThis.localStorage || storage;

const failures = [];
let checks = 0;
function check(label, ok, detail = '') { checks += 1; if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`); }

const f = await import(pathToFileURL(path.join(REPO, 'js/data/favourites.js')).href);

// 1. Regulars come due.
const today = new Date('2026-11-26T19:30:00'); // a Thursday
check('a favourite only is never due', !f.isDue({ every: null }, today));
check('a new regular is due', f.isDue({ every: 'week', last_added_on: null }, today));
check('weekly, added last Thursday: due', f.isDue({ every: 'week', last_added_on: '2026-11-19' }, today));
check('weekly, added on Monday: not yet', !f.isDue({ every: 'week', last_added_on: '2026-11-23' }, today));
check('fortnightly, a week ago: not yet', !f.isDue({ every: 'fortnight', last_added_on: '2026-11-19' }, today));
check('fortnightly, two weeks ago: due', f.isDue({ every: 'fortnight', last_added_on: '2026-11-12' }, today));
check('monthly, three weeks ago: not yet', !f.isDue({ every: 'month', last_added_on: '2026-11-05' }, today));
check('monthly, four weeks ago: due', f.isDue({ every: 'month', last_added_on: '2026-10-29' }, today));

// 2. Three lists.
check('toiletries', f.listOf('personal') === 'toiletries');
check('household', f.listOf('household') === 'household');
check('pet food with household', f.listOf('pet') === 'household');
for (const kind of ['fruit', 'veg', 'meat', 'fish', 'dairy', 'bread', 'frozen', 'tinned', 'drinks', 'other']) {
  check(`${kind} is groceries`, f.listOf(kind) === 'groceries');
}

// 3. The weekly build: once per slot.
const thu = { on: true, day: 4, time: '19:00', lastBuilt: '' };
check('off: never due', !f.buildDue({ ...thu, on: false }, today));
check('Thursday 19:30, never built: due', f.buildDue(thu, today));
check('Thursday 18:00, never built: last week\'s slot, due', f.buildDue(thu, new Date('2026-11-26T18:00:00')));
check('built tonight: not due again tonight', !f.buildDue({ ...thu, lastBuilt: '2026-11-26' }, new Date('2026-11-26T22:00:00')));
check('built tonight: not due on Saturday', !f.buildDue({ ...thu, lastBuilt: '2026-11-26' }, new Date('2026-11-28T10:00:00')));
check('built last Thursday: due this Thursday evening', f.buildDue({ ...thu, lastBuilt: '2026-11-19' }, today));
check('built last Thursday: not due this Thursday morning', !f.buildDue({ ...thu, lastBuilt: '2026-11-19' }, new Date('2026-11-26T09:00:00')));
const slot = f.lastSlot(thu, new Date('2026-11-24T12:00:00'));
check('the slot before a Tuesday is the Thursday before', slot.getDay() === 4 && slot.getDate() === 19, slot.toString());

// 4. The setting is kept and defaults sensibly.
check('default: off, Thursday, 19:00', JSON.stringify(f.readBuild(storage)) === JSON.stringify({ on: false, day: 4, time: '19:00', lastBuilt: '' }));
f.saveBuild({ on: true, day: 5, time: '08:00', lastBuilt: '' }, storage);
check('saved and read back', f.readBuild(storage).day === 5 && f.readBuild(storage).on);

console.log(`  ${checks} checks`);
if (failures.length) { for (const x of failures) console.log(`  ✗ ${x}`); process.exit(1); }
console.log('  ✓ favourites: regulars due on time, three lists, one build per slot');
