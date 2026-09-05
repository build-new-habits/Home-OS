// js/views/library.js — 05 Sep 2026 v1
//
// The recipe library, on its own page.
//
// ---- Why ----
// Device test, 5 Sep 2026: "I think the library of recipes should have its
// own space in the kitchen."
//
// He is right, and the history in js/views/meals/library.js already says so
// without following it through. That file records the library being built
// last on the Meals page, behind a collapsed fold, where "a hundred recipes
// were in there and the person who commissioned them could not find them".
// The fix at the time was to move it up the page. It was still a section of
// somebody else's screen, under a heading you only meet by scrolling past
// six of your own recipes and a search box.
//
// A hundred recipes is not a section. It is a place you go.
//
// ---- What this file is NOT ----
// It is not a second copy of the library. createLibraryPanel() owns the DOM,
// the filters, the lazy load and the add-to-my-meals behaviour, exactly as
// it does on the Meals page. This view supplies the page around it. Both
// entry points stay, because arriving from Meals is a real path and removing
// it would break a habit to make a point.

import { el } from '../lib/dom.js';
import { createLibraryPanel } from './meals/library.js';

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('h1', { text: 'Recipe library' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'A hundred recipes that come with the app. Add any of them to your '
      + 'meals in one tap — the ingredients and steps come with it.'
  }));

  const panel = createLibraryPanel({
    signal,
    isDestroyed: () => destroyed,
    // On the Meals page this reloads that page's list of meals. Here there
    // is no such list to refresh: the panel marks the recipe as owned by
    // itself, and the Meals page will read it fresh next time it is opened.
    onAdded: () => {}
  });

  mountEl.appendChild(panel.section);

  // The panel loads lazily on open, because it was built as a fold. On a
  // page that IS the library, there is nothing to wait for.
  panel.open();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
