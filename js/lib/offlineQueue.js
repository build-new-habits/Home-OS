// js/lib/offlineQueue.js — 21 Aug 2026 v3
// v3: openDb() no longer memoises a REJECTED promise. Found by the Phase 6
// render gate, which runs in jsdom where indexedDB is absent: the first
// failure stuck, and every later queue call for the rest of the session
// reported that same original error. In a browser the equivalent is one
// transient open failure permanently disabling offline writes. See openDb().
// Offline write queue (behavioural principle 10).
//
// v2: flush() gained an optional table filter. Previously flush(applyFn)
// replayed EVERY pending op through whichever applyFn it was handed, so a
// module's 'online' listener would try to apply another module's queued
// rows to its own table. With one feature module that was harmless; with
// exercises + chores + weight + water all registering listeners it is a
// race. Ops are now claimed by the module that owns their table.
//
// Public API:
//   enqueue(op)                  -> Promise<number>   store one pending write
//   flush(applyFn, opts)         -> Promise<{ ok, failed, skipped }>
//   list()                       -> Promise<Array>    inspect pending writes
//   remove(id)                   -> Promise<void>     drop a single queued op
//
// opts.tables: string[] — replay ONLY ops whose op.table is in this list.
// Omitted = replay everything (v1 behaviour, kept for backward compat).
//
// IMPORTANT: an applyFn must never resolve for an op it does not own.
// flush() removes an op as soon as applyFn resolves, so a silent "not
// mine, ignore it" return would delete another module's pending write.
// Filter with opts.tables instead — filtered ops are left untouched.

const DB_NAME = 'home-os-offline';
const DB_VERSION = 1;
const STORE = 'pending-writes';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // v3: a FAILED open must not be memoised. Without this, one transient
  // failure (private browsing, storage pressure, a blocked upgrade) leaves
  // dbPromise as a permanently rejected promise, so every later enqueue,
  // list and flush fails for the rest of the session with the SAME stale
  // error — the queue is silently dead and an offline tap gets rolled back
  // instead of being stored. Clearing it lets the next call try again.
  //
  // Attaching .catch() here also means the rejection is always handled, so
  // a caller that never awaits cannot raise an unhandled rejection. Callers
  // in the same tick still share (and fail on) this attempt; the retry
  // happens on the next one, which is the intended behaviour.
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

/**
 * op shape: { table: string, type: 'insert'|'update'|'delete', payload: object, queuedAt: string }
 * `table` is mandatory from v2 onward — flush() uses it to decide ownership.
 */
export async function enqueue(op) {
  if (!op || !op.table) {
    throw new Error('offlineQueue.enqueue: op.table is required (v2)');
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const record = { ...op, queuedAt: op.queuedAt || new Date().toISOString() };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function list() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Replays queued ops in order via `applyFn`, a caller-supplied function
 * (typically a Supabase call). This module stays storage-only and never
 * imports supabaseClient, keeping the dependency direction one-way.
 *
 * An op is removed ONLY after applyFn resolves. If applyFn throws, the op
 * stays queued and is reported in `failed` — never silently dropped.
 */
export async function flush(applyFn, opts = {}) {
  const tables = Array.isArray(opts.tables) ? opts.tables : null;
  const pending = await list();
  let ok = 0;
  let skipped = 0;
  const failed = [];
  for (const op of pending) {
    if (tables && !tables.includes(op.table)) {
      skipped += 1;
      continue;
    }
    try {
      await applyFn(op);
      await remove(op.id);
      ok += 1;
    } catch (err) {
      failed.push({ op, error: err });
    }
  }
  return { ok, failed, skipped };
}
