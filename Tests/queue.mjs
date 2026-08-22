// offlineQueue tests.
//
// Two jobs:
//  1. Prove the v3 fix — a failed indexedDB.open() must not be memoised.
//     The old code kept the rejected promise forever, so ONE transient
//     failure silently disabled offline writes for the whole session.
//  2. Re-verify the Phase 5 table-scoping guarantee, because v3 touched
//     this file and that fix is the one protecting every other module's
//     queued writes.

const REPO = process.env.GATE_REPO || '/tmp/gate-repo';

let pass = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

// ---- Minimal in-memory IndexedDB, with a controllable first failure ----
let failNextOpen = false;
let openAttempts = 0;
const rows = [];
let nextId = 1;

function makeDb() {
  return {
    objectStoreNames: { contains: () => true },
    transaction() {
      return {
        objectStore() {
          return {
            add(record) {
              const req = {};
              queueMicrotask(() => {
                const stored = { ...record, id: nextId++ };
                rows.push(stored);
                req.result = stored.id;
                req.onsuccess && req.onsuccess();
              });
              return req;
            },
            getAll() {
              const req = {};
              queueMicrotask(() => { req.result = rows.slice(); req.onsuccess && req.onsuccess(); });
              return req;
            },
            delete(id) {
              const req = {};
              queueMicrotask(() => {
                const i = rows.findIndex((r) => r.id === id);
                if (i >= 0) rows.splice(i, 1);
                req.onsuccess && req.onsuccess();
              });
              return req;
            }
          };
        }
      };
    }
  };
}

globalThis.indexedDB = {
  open() {
    openAttempts += 1;
    const req = {};
    const shouldFail = failNextOpen;
    failNextOpen = false;
    queueMicrotask(() => {
      if (shouldFail) {
        req.error = new Error('simulated transient IndexedDB failure');
        req.onerror && req.onerror();
      } else {
        req.result = makeDb();
        req.onsuccess && req.onsuccess();
      }
    });
    return req;
  }
};

const queue = await import(`${REPO}/js/lib/offlineQueue.js`);

console.log('\nA failed open must not be memoised (v3)');

failNextOpen = true;
let firstFailed = false;
try { await queue.list(); } catch { firstFailed = true; }
check('the first call fails when IndexedDB refuses to open', firstFailed);

// THE regression: on the old code this second call reused the rejected
// promise and failed identically, forever, without ever retrying.
let secondOk = false;
try { await queue.list(); secondOk = true; } catch { secondOk = false; }
check('the NEXT call retries instead of reusing the rejection', secondOk);
check('a retry really did reopen the database', openAttempts === 2, `attempts=${openAttempts}`);

console.log('\nQueue basics');

await queue.enqueue({ table: 'foods', type: 'insert', payload: { name: 'Oats', barcode: '5000159407236' } });
await queue.enqueue({ table: 'water_logs', type: 'insert', payload: { ml_logged: 250 } });
await queue.enqueue({ table: 'foods', type: 'insert', payload: { name: 'Beans', barcode: '5000157024671' } });
check('three ops are queued', (await queue.list()).length === 3);

let rejected = false;
try { await queue.enqueue({ type: 'insert', payload: {} }); } catch { rejected = true; }
check('an op without a table is refused', rejected);

console.log('\nTable scoping (the Phase 5 guarantee)');

const seen = [];
const result = await queue.flush(async (op) => {
  if (op.table !== 'foods') throw new Error(`handler received a foreign op: ${op.table}`);
  seen.push(op.payload.name);
}, { tables: ['foods'] });

check('only this table\'s ops reach the handler', seen.length === 2, JSON.stringify(seen));
check('foreign ops are skipped, not consumed', result.skipped === 1, `skipped=${result.skipped}`);
check('nothing failed', result.failed.length === 0);
check('the other module\'s queued write SURVIVES', (await queue.list()).some((op) => op.table === 'water_logs'));
check('the flushed ops are gone', (await queue.list()).filter((op) => op.table === 'foods').length === 0);

console.log('\nFailures are retained, never dropped');

await queue.enqueue({ table: 'foods', type: 'insert', payload: { name: 'Will fail' } });
const failing = await queue.flush(async () => { throw new Error('server said no'); }, { tables: ['foods'] });
check('a failed op is reported', failing.failed.length === 1);
check('a failed op stays queued for another try',
  (await queue.list()).some((op) => op.payload && op.payload.name === 'Will fail'));

// ============ Phase 8: update ops carry a rowId ============
// Holiday ticks queue as UPDATEs, not inserts — the first non-insert op in
// the queue. enqueue() spreads the whole op, so rowId survives; asserted
// here rather than assumed, because losing it would replay the update
// against nothing and silently drop the tick.
console.log('\nUpdate ops (holiday ticks)');

await queue.enqueue({ table: 'holiday_checklist_items', type: 'update', rowId: 'chk-1', payload: { status: 'complete' } });
await queue.enqueue({ table: 'holiday_purchase_items', type: 'update', rowId: 'buy-1', payload: { status: 'complete' } });
await queue.enqueue({ table: 'water_logs', type: 'insert', payload: { ml_logged: 250 } });

const stored = await queue.list();
const tick = stored.find((op) => op.rowId === 'chk-1');
check('an update op survives the round trip with its rowId', !!tick);
check('and with its payload', tick && tick.payload.status === 'complete');

const seenIds = [];
const holidayFlush = await queue.flush(async (op) => {
  if (op.table !== 'holiday_checklist_items' && op.table !== 'holiday_purchase_items') {
    throw new Error(`handler received a foreign op: ${op.table}`);
  }
  seenIds.push(op.rowId);
}, { tables: ['holiday_checklist_items', 'holiday_purchase_items'] });

check('both holiday tables flush together', seenIds.length === 2, JSON.stringify(seenIds));
check('the water op is skipped, not consumed', holidayFlush.skipped >= 1);
check('the water op survives', (await queue.list()).some((op) => op.table === 'water_logs'));

console.log('');
if (failures.length) {
  console.log(`QUEUE TESTS FAILED — ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`QUEUE TESTS PASSED — ${pass}/${pass} assertions`);
