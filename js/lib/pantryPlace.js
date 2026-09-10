// js/lib/pantryPlace.js — 10 Sep 2026 v1
//
// Which cupboard you just tapped.
//
// ---- Why this exists ----
// "What's in" was a list of accordions: tap a heading, sixty rows unfold
// underneath it, tap another and the first collapses. The firm rule in this
// codebase is that a tappable thing opens a PAGE, and folds have been
// offered instead and rejected more than once. The spec has drawn tiles
// since the Kitchen redesign — Fridge 30, Freezer 7, Veg 12 — and tiles need
// somewhere to go.
//
// The router carries no parameters, so the place travels the same way the
// weekly plan's chosen meal does: written down before navigating, read on
// arrival. Same idea as planDraft.js, deliberately — one pattern for "this
// screen needs to know what you tapped" is better than two.
//
// ---- Not a whitelist, and why that is fine here ----
// planDraft resolves its origin through a fixed list because that value ends
// up in navigate(). This one never does: it is matched against locations
// found in your own pantry rows, and anything that does not match shows an
// empty place rather than going anywhere.

const KEY = 'home-os-pantry-place';

/** Remember which place is being opened. */
export function setPlace(name) {
  try {
    // window.-qualified: a bare `sessionStorage` inside a try/catch becomes a
    // silent no-op wherever the global is missing, which has cost this
    // project time twice.
    window.sessionStorage.setItem(KEY, String(name || ''));
  } catch (error) {
    console.error('Could not remember which place was opened:', error);
  }
}

/** Which place to show. Empty string means none was chosen. */
export function readPlace() {
  try {
    return window.sessionStorage.getItem(KEY) || '';
  } catch (error) {
    console.error('Could not read which place was opened:', error);
    return '';
  }
}

/** Forget it. */
export function clearPlace() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch (error) {
    console.error('Could not clear the opened place:', error);
  }
}
