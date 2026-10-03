// js/views/library.js — 03 Oct 2026 v5
// v5: On this phone — recipes saved here, a backup file and restore.
// v4: #/library?course=… opens on that course.
// v3: Write your own recipe and Your recipes, beside What can I make.
// v2: a link to What can I make?
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
import { listLocal, exportLocal, importLocal } from '../data/localRecipes.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  mountEl.appendChild(el('h1', { text: 'Recipe library' }));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Recipes that come with the app. Add any of them to your '
      + 'meals in one tap — the ingredients and steps come with it.'
  }));

  // 3 Oct 2026: straight to what the cupboard can make.
  const tonight = el('p', { class: 'library-links' });
  tonight.appendChild(el('a', { class: 'btn', href: '#/tonight', text: 'What can I make with what I have?' }));
  // 3 Oct 2026: your own recipes start here too.
  tonight.appendChild(el('a', { class: 'btn', href: '#/recipe-edit', text: 'Write your own recipe' }));
  tonight.appendChild(el('a', { class: 'btn btn-quiet', href: '#/meals', text: 'Your recipes' }));
  mountEl.appendChild(tonight);

  // 3 Oct 2026: recipes kept on this phone (data/localRecipes.js).
  mountEl.appendChild(phoneSection(signal));

  // #/library?course=pudding opens on puddings (from the plan's "Find a pudding").
  const courseMatch = String(window.location.hash || '').match(/[?&]course=([a-z]+)/);
  const panel = createLibraryPanel({
    course: courseMatch ? courseMatch[1] : '',
    signal,
    // This view already supplies the heading and the blurb.
    ownPage: true,
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

/**
 * "On this phone": the recipes you have saved here, and a backup file.
 * Browsers can clear what a site stores, so the backup is offered plainly
 * rather than hidden in settings.
 */
function phoneSection(signal) {
  const section = el('section', { class: 'library-phone', 'aria-labelledby': 'library-phone-h' });
  section.appendChild(el('h2', { id: 'library-phone-h', text: 'On this phone' }));
  const list = el('ul', { class: 'library-phone-list' });
  const empty = el('p', { class: 'field-hint' });
  const status = el('p', { class: 'field-hint', role: 'status' });
  section.append(list, empty);

  const paint = () => {
    const kept = listLocal();
    list.replaceChildren();
    for (const r of kept) {
      const li = el('li');
      li.appendChild(el('a', { href: `#/recipe?l=${encodeURIComponent(r.id)}`, text: r.name }));
      if (r.draft && r.draft.syncedMealId) li.appendChild(el('span', { class: 'field-hint', text: ' Also in your meals' }));
      list.appendChild(li);
    }
    list.hidden = kept.length === 0;
    empty.textContent = kept.length === 0
      ? 'Recipes you save on this phone appear here. Open any recipe and choose Make your own version, or write one.'
      : `${kept.length} recipe${kept.length === 1 ? '' : 's'} kept here. A backup file keeps them safe if this phone is reset.`;
    backup.disabled = kept.length === 0;
  };

  const buttons = el('div', { class: 'library-links' });
  const backup = el('button', { type: 'button', class: 'btn', text: 'Download a backup' });
  const restoreId = 'library-restore-file';
  const restore = el('input', { type: 'file', id: restoreId, accept: '.json,application/json', class: 'visually-hidden' });
  const restoreLabel = el('label', { for: restoreId, class: 'btn', text: 'Restore from a backup' });
  buttons.append(backup, restore, restoreLabel);
  section.append(buttons, status);

  backup.addEventListener('click', () => {
    const blob = new Blob([exportLocal()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `home-os-recipes-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.textContent = 'Backup file downloaded.';
    announce('Backup file downloaded.');
  }, { signal });

  restore.addEventListener('change', async () => {
    const file = restore.files && restore.files[0];
    if (!file) return;
    const result = importLocal(await file.text());
    restore.value = '';
    const words = result.ok
      ? `Restored: ${result.added} added${result.updated ? `, ${result.updated} updated` : ''}.`
      : result.error.message;
    status.textContent = words;
    showToast(words);
    paint();
  }, { signal });

  paint();
  return section;
}
