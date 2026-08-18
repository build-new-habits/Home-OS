// js/lib/net.js — 18 Aug 2026 v1
// Network guards for data modules.
//
// Why this exists: the Phase 5 smoke test found that logging offline did
// nothing visible, then completed when connectivity returned. The offline
// queue was fine — it was never reached. A fetch made with no connection
// frequently does NOT fail fast; on mobile it can hang until the network
// comes back, at which point the parked request succeeds for real. Code
// that only queues in a .catch() therefore never queues at all: it just
// waits, with the UI stuck mid-write.
//
// Two guards, in order:
//   1. isOffline()  — if the browser already knows there is no connection,
//                     do not attempt the request at all. Fastest path.
//   2. withTimeout() — navigator.onLine lies (captive portals, dead Wi-Fi,
//                     a paused backend that accepts TCP and never answers).
//                     A request that has not responded within the budget is
//                     treated as failed so the caller can queue it.
//
// The timeout does not cancel anything server-side. It only stops the UI
// waiting. A write that quietly lands after we gave up is fine here: every
// queued op is an insert the user already believes happened, and the flush
// checks its own error field.

export const DEFAULT_TIMEOUT_MS = 6000;

/** True when the browser is confident there is no connection. */
export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Rejects if `promise` has not settled within `ms`.
 * Supabase's builder is a thenable rather than a real Promise, so it is
 * wrapped with Promise.resolve() before racing.
 */
export function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Request timed out after ${ms}ms`);
      err.name = 'TimeoutError';
      err.isTimeout = true;
      reject(err);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Runs a Supabase write with both guards, normalising every failure mode
 * into a thrown error so callers can use a single catch to queue.
 *
 * Throws when offline, on timeout, on a transport error, and on a Supabase
 * `error` field — supabase-js resolves rather than rejects on those, which
 * is the trap that has bitten this project before.
 */
export async function attemptWrite(runQuery, ms = DEFAULT_TIMEOUT_MS) {
  if (isOffline()) {
    const err = new Error('Device is offline');
    err.isOffline = true;
    throw err;
  }
  const { data, error } = await withTimeout(runQuery(), ms);
  if (error) throw error;
  return data;
}
