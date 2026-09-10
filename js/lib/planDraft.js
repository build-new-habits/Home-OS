// js/lib/planDraft.js — 10 Sep 2026 v2
// v3: future plans borrow the chooser too.
// v2: the draft carries which page it has to come back to.
//
// The half-finished thought between two screens.
//
// Choosing a meal moved onto its own page on 6 Sep 2026, which means the
// day and slot you were filling have to survive the trip there, and the
// meal you picked has to survive the trip back.
//
// sessionStorage rather than a module variable: the router loads views by
// dynamic import and a reload mid-flow is a normal thing to do on a phone.
// A variable would drop the draft on refresh and land you back on the plan
// with no idea why nothing happened.
//
// sessionStorage rather than localStorage: this is one errand, not a
// preference. It should not still be sitting there next week.

const KEY = 'home-os-plan-draft';

// ---- Where the answer has to be delivered back to ----------------------
// Device test, 10 Sep 2026: "I selected overnight oats for breakfast and it
// kicked me back to [the plan hub] and hadn't saved my meal choices."
//
// The chooser sent everybody to `meal-plan`. That was right until 7 Sep,
// when the plan became a hub and the add form moved onto the three week
// pages. After that the round trip ended on a page with no form to fill in,
// which then read the draft, found a meal in it, had nowhere to put it, and
// cleared it. The choice was made, carried, and thrown away in silence.
//
// So the draft carries where it came from. A WHITELIST rather than the
// stored string used directly: a draft is data, and navigating to whatever
// a data field says is how a field becomes an open redirect.
export const PLAN_RETURN_PAGES = {
  today: 'plan-today',
  week: 'plan-this-week',
  next: 'plan-next-week',
  // 10 Sep 2026. A future plan borrows the same chooser: it is the same
  // question ("which meal?") asked by a different screen, and a second
  // picker would have been a second place for the filters to drift.
  future: 'plan-future'
};

/**
 * The page a chosen meal has to be delivered back to.
 *
 * Falls back to this week rather than to the hub. If the origin is missing
 * or unrecognised, the worst outcome should be landing on the wrong week
 * with the choice intact — not landing somewhere that cannot accept it.
 */
export function returnPathFor(draft) {
  return PLAN_RETURN_PAGES[draft && draft.origin] || PLAN_RETURN_PAGES.week;
}

// ---- Where the draft actually lives -----------------------------------
// A bare `sessionStorage` reference throws outright where the global does
// not exist, and the try/catch around each call turned that into a silent
// no-op: the draft was written nowhere, read back empty, and the round trip
// lost the meal you had just chosen without a word.
//
// So the store is resolved once, with an in-memory fallback. That also
// covers a real case — private browsing with storage disabled — where the
// errand should still work for as long as the tab is open, just not across
// a reload.
const memory = new Map();

const store = (() => {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
      // Prove it actually works rather than merely existing: some webviews
      // expose it and throw on write.
      globalThis.sessionStorage.setItem(`${KEY}-probe`, '1');
      globalThis.sessionStorage.removeItem(`${KEY}-probe`);
      return globalThis.sessionStorage;
    }
  } catch {
    // Falls through to memory.
  }
  return {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, v),
    removeItem: (k) => memory.delete(k)
  };
})();

/** @returns {{day?: string, slot?: string, origin?: string, intent?: string,
  *   noteId?: string, noteTitle?: string, mealId?: string, mealName?: string}} */
export function readDraft() {
  try {
    return JSON.parse(store.getItem(KEY) || '{}') || {};
  } catch {
    // Corrupt or unavailable storage must not take the page down; an empty
    // draft just means the form opens as it always did.
    return {};
  }
}

export function writeDraft(patch) {
  try {
    store.setItem(KEY, JSON.stringify({ ...readDraft(), ...patch }));
  } catch {
    // Private browsing, quota, an odd webview. The flow still works, it just
    // will not remember across a reload.
  }
}

export function clearDraft() {
  try {
    store.removeItem(KEY);
  } catch {
    // Nothing to do: an unremovable draft is harmless, it is only ever read
    // once and overwritten on the next errand.
  }
}
