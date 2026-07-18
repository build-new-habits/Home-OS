// js/lib/offlineQueue.js — 14 Jul 2026 v1
// Offline write queue scaffolding (behavioural principle 10).
// Feature phases enqueue writes through this when the network is down;
// this phase stands up the mechanism only — no feature writes yet.
//
// Public API:
//   enqueue(op) -> Promise<number>   store one pending write, returns its id
//   flush()     -> Promise<{ ok, failed }>  replay all pending writes in order
//   list()      -> Promise<Array>    inspect pending writes (for UI/debug)
//   remove(id)  -> Promise<void>     drop a single queued op

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
  return dbPromise;
}

/**
 * op shape: { table: string, type: 'insert'|'update'|'delete', payload: object, queuedAt: string }
 * Feature phases define `table`/`type`/`payload`; this module only stores
 * and replays them — it has no knowledge of table schemas.
 */
export async function enqueue(op) {
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
 * (typically a Supabase call) — this module stays storage-only and does
 * not import supabaseClient itself, keeping the dependency direction
 * one-way (lib -> nothing app-specific).
 */
export async function flush(applyFn) {
  const pending = await list();
  let ok = 0;
  const failed = [];
  for (const op of pending) {
    try {
      await applyFn(op);
      await remove(op.id);
      ok += 1;
    } catch (err) {
      failed.push({ op, error: err });
    }
  }
  return { ok, failed };
}
