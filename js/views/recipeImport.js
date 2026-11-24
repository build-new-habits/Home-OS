// js/views/recipeImport.js — 24 Nov 2026 v2
// v2: an import lands on Check and save (#/recipe-check), not the full editor.
// Phase 33. "Import a recipe" (#/recipe-import).
//
// Arrived at three ways:
//   - the phone's Share menu: share.html turns the share into
//     #/recipe-import?u=<link>&t=<shared text>
//   - a link on Recipes, or the Kitchen lists
//   - a kept link: something shared while offline, offered again here
//
// ---- What it does ----
// A recipe web page: the Edge Function reads the page's recipe data, and the
// recipe opens in the editor already filled in (#/recipe-edit?imported=1),
// to be checked and saved. This screen never saves a recipe itself.
//
// A post on Instagram, TikTok and the like: those sites do not let apps
// read posts, so this screen says so and asks for the caption, which is
// read line by line instead. A recipe that is only spoken in a video cannot
// be read at all, and the screen says that too rather than pretending.
//
// ---- Principles ----
// 1  Every outcome is stated as a fact. Nothing here is a telling-off.
// 2  Share → check → Save. The only thing to type is a link or a caption.
// 9  A link shared offline is kept, not dropped, and offered again here.
// 10 Reading a page needs a connection; the screen says so plainly.
//
// ---- Accessibility ----
// Each state has its own <h1>, and focus moves to it when the state changes,
// with the change announced. Fields have visible labels, and problems are
// given in text tied to the field (aria-describedby, aria-invalid).

import { el } from '../lib/dom.js';
import { announce } from '../lib/a11y.js';
import { createActionBar } from '../components/actionBar.js';
import { showToast } from '../components/toast.js';
import {
  extractUrl, hostOf, isSocialHost, socialName, importFromUrl, findExisting,
  textToDraft, draftCounts, keptLinks, keepForLater, forgetKept, stashImportDraft
} from '../data/recipeImport.js';

/** u, t and title from #/recipe-import?u=…&t=… */
export function importParams(hash) {
  const query = String(hash || '').split('?')[1] || '';
  const params = new URLSearchParams(query);
  return { url: params.get('u') || '', text: params.get('t') || '', title: params.get('title') || '' };
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;
  let barEl = null;

  const back = el('a', { class: 'back-link', href: '#/library', text: 'Recipes' });
  const heading = el('h1', { text: 'Import a recipe' });
  const page = el('div', { class: 'recipe-import' });
  mountEl.append(back, heading, page);

  const shared = importParams(window.location.hash);
  const sharedUrl = extractUrl(shared);
  const sharedCaption = String(shared.text || '').replace(sharedUrl, '').trim();

  /** Replaces the screen: new heading, focus on it, change announced. */
  function show(title, said = title) {
    heading.textContent = title;
    page.replaceChildren();
    if (barEl) { barEl.remove(); barEl = null; }
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    // After the first paint the router has already focused the heading;
    // later states move focus there themselves so the change is not missed.
    if (document.activeElement !== heading && mountEl.isConnected) heading.focus();
    announce(said);
  }

  /** The one primary action, in thumb reach. A link when it goes somewhere. */
  function actionBar(label, onClickOrHref) {
    const bar = typeof onClickOrHref === 'string'
      ? createActionBar({ label, href: onClickOrHref, signal })
      : createActionBar({ label, onClick: onClickOrHref, signal });
    barEl = bar.element;
    mountEl.appendChild(barEl);
    return bar;
  }

  // ---- The link field --------------------------------------------------------
  function linkField(value = '') {
    const wrap = el('div', { class: 'field' });
    const input = el('input', {
      type: 'url', id: 'import-url', inputmode: 'url', autocomplete: 'off',
      spellcheck: 'false', 'aria-describedby': 'import-url-hint'
    });
    input.value = value;
    const hint = el('p', { id: 'import-url-hint', class: 'field-hint', text: 'The web address of a recipe page, starting https://' });
    const problem = el('p', { id: 'import-url-problem', class: 'field-error', hidden: '' });
    wrap.append(el('label', { for: 'import-url', text: 'Link to the recipe' }), input, hint, problem);
    return {
      element: wrap,
      input,
      setProblem(text) {
        problem.textContent = text;
        problem.hidden = !text;
        input.setAttribute('aria-describedby', text ? 'import-url-problem import-url-hint' : 'import-url-hint');
        if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      }
    };
  }

  // ---- The paste box ------------------------------------------------------------
  function pasteBox(value = '', { sourceUrl = '', withButton = true } = {}) {
    const section = el('section', { class: 'import-paste', 'aria-labelledby': 'import-paste-h' });
    section.appendChild(el('h2', { id: 'import-paste-h', text: 'Paste the recipe text' }));
    const area = el('textarea', {
      id: 'import-text', rows: '10', 'aria-describedby': 'import-text-hint', spellcheck: 'true'
    });
    area.value = value;
    const hint = el('p', {
      id: 'import-text-hint', class: 'field-hint',
      text: 'Put the name on the first line. Ingredients one per line, with the amount first ("200g rice"). Then the steps, one per line. Headings like Ingredients and Method help.'
    });
    const problem = el('p', { id: 'import-text-problem', class: 'field-error', hidden: '' });
    section.append(el('label', { for: 'import-text', text: 'Recipe text' }), area, hint, problem);

    function read() {
      const draft = textToDraft(area.value, { sourceUrl });
      const counts = draft ? draftCounts(draft) : { ingredients: 0, steps: 0 };
      if (!draft || (!draft.name && !counts.ingredients && !counts.steps)) {
        problem.textContent = 'There is no recipe text in the box yet. Paste the caption or the recipe, then try again.';
        problem.hidden = false;
        area.setAttribute('aria-invalid', 'true');
        area.setAttribute('aria-describedby', 'import-text-problem import-text-hint');
        area.focus();
        return;
      }
      handOver(draft, `Read ${counts.ingredients} ingredient${counts.ingredients === 1 ? '' : 's'} and ${counts.steps} step${counts.steps === 1 ? '' : 's'}. Opening it to check.`);
    }

    if (withButton) {
      const button = el('button', { type: 'button', class: 'btn', text: 'Read this text' });
      button.addEventListener('click', read, { signal });
      section.appendChild(button);
    }
    return { element: section, read, area };
  }

  /** Onto Check and save, filled in. Replaces history so Back does not re-import. */
  function handOver(draft, said) {
    if (!stashImportDraft(draft)) {
      showToast('This phone would not hold the recipe for the next page. Try again, or close other tabs.');
      return;
    }
    if (draft.sourceUrl) forgetKept(draft.sourceUrl);
    announce(said);
    window.location.replace('#/recipe-check');
  }

  // ---- States ---------------------------------------------------------------------

  function showStart({ problem = '', url = '', text = '' } = {}) {
    show('Import a recipe');
    page.appendChild(el('p', {
      text: 'Share a recipe page to Home-OS from your browser, or paste its link here. It opens filled in, ready to check and save.'
    }));
    const link = linkField(url);
    if (problem) link.setProblem(problem);
    const getRecipe = () => {
      const target = extractUrl({ url: link.input.value, text: link.input.value });
      if (!target) {
        link.setProblem('That is not a web address. It needs to start https://');
        link.input.focus();
        return;
      }
      importLink(target);
    };
    if (text) {
      // Text was shared with no link in it: reading it is the thing to do,
      // so it comes first and takes the action bar. The link stays offered.
      const box = pasteBox(text, { withButton: false });
      page.appendChild(box.element);
      actionBar('Read this text', box.read);
      const get = el('button', { type: 'button', class: 'btn', text: 'Get the recipe from the link' });
      get.addEventListener('click', getRecipe, { signal });
      page.append(link.element, get);
    } else {
      page.appendChild(link.element);
      actionBar('Get the recipe', getRecipe);
      page.appendChild(pasteBox('').element);
    }
    paintKept();
  }

  function paintKept() {
    const kept = keptLinks();
    if (!kept.length) return;
    const section = el('section', { class: 'import-kept', 'aria-labelledby': 'import-kept-h' });
    section.appendChild(el('h2', { id: 'import-kept-h', text: 'Links kept for later' }));
    section.appendChild(el('p', { class: 'field-hint', text: 'Shared while you were offline. Each one is still here until you import it or remove it.' }));
    const list = el('ul', { class: 'import-kept__list' });
    for (const item of kept) {
      const host = hostOf(item.url);
      const li = el('li', { class: 'import-kept__item' });
      const open = el('button', {
        type: 'button', class: 'btn import-kept__open',
        text: item.title ? `${item.title} (${host})` : host,
        'aria-label': `Import ${item.title ? `${item.title}, from ` : 'the recipe from '}${host}`
      });
      open.addEventListener('click', () => importLink(item.url), { signal });
      const remove = el('button', {
        type: 'button', class: 'btn btn-quiet', text: 'Remove',
        'aria-label': `Remove the kept link to ${host}`
      });
      remove.addEventListener('click', () => {
        forgetKept(item.url);
        li.remove();
        if (!list.children.length) section.remove();
        else list.querySelector('button')?.focus();
        showToast(`Link to ${host} removed.`, {
          undo: () => { keepForLater(item.url, item.title); if (!destroyed) showStart(); }
        });
      }, { signal });
      li.append(open, remove);
      list.appendChild(li);
    }
    section.appendChild(list);
    page.appendChild(section);
  }

  function showSocial(url, caption = '') {
    const site = socialName(url);
    show(`Paste the caption from ${site}`, `${site} does not let apps read its posts. Paste the caption instead.`);
    page.appendChild(el('p', {
      text: `${site} does not let apps read its posts, so Home-OS cannot fetch this one. Copy the caption from the post and paste it below.`
    }));
    page.appendChild(el('p', {
      class: 'field-hint',
      text: 'If the recipe is only spoken in the video and not written in the caption, it cannot be read here. You can still type it in yourself.'
    }));
    const original = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: `Open the post on ${site} (opens in a new tab)` });
    page.appendChild(el('p', {}, [original]));
    const box = pasteBox(caption, { sourceUrl: url, withButton: false });
    page.appendChild(box.element);
    actionBar('Read this text', box.read);
    page.appendChild(el('a', { class: 'btn btn-quiet', href: '#/recipe-edit', text: 'Type it in myself' }));
  }

  function showNoRecipe(url, siteName) {
    const where = siteName || hostOf(url);
    show('No recipe on that page', `That page on ${where} does not include a recipe Home-OS can read.`);
    page.appendChild(el('p', {
      text: `That page on ${where} does not include a recipe Home-OS can read. Most recipe sites do; some blogs and news pages do not. Copy the recipe from the page and paste it below instead.`
    }));
    page.appendChild(el('p', {}, [el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: `Open the page on ${where} (opens in a new tab)` })]));
    const box = pasteBox('', { sourceUrl: url, withButton: false });
    page.appendChild(box.element);
    actionBar('Read this text', box.read);
  }

  function showUnreachable(url) {
    const host = hostOf(url);
    show('That page did not open', `Home-OS could not open the page on ${host}.`);
    page.appendChild(el('p', {
      text: `Home-OS could not open the page on ${host}. The site may be slow, may need a sign-in, or may not let apps read it. You can try once more, or paste the recipe text below.`
    }));
    const again = el('button', { type: 'button', class: 'btn', text: 'Try once more' });
    again.addEventListener('click', () => importLink(url), { signal });
    page.appendChild(again);
    const box = pasteBox('', { sourceUrl: url, withButton: false });
    page.appendChild(box.element);
    actionBar('Read this text', box.read);
  }

  function showOffline(url, title = '') {
    keepForLater(url, title);
    show('Kept for when you are online', 'You are offline. The link is kept and will be offered here when you are back online.');
    page.appendChild(el('p', {
      text: `You are offline, and reading a recipe page needs a connection. The link to ${hostOf(url)} is kept on this phone and will be waiting on this page when you are back online.`
    }));
    actionBar('Back to recipes', '#/library');
  }

  function showAlready(meal) {
    show('Already in your meals', `${meal.name} is already in your meals.`);
    page.appendChild(el('p', { text: `${meal.name} was imported from this page before, so it is already in your meals.` }));
    actionBar(`Open ${meal.name}`, `#/recipe?m=${encodeURIComponent(meal.id)}`);
  }

  async function importLink(url) {
    if (isSocialHost(url)) { showSocial(url, sharedCaption); return; }
    show('Reading the recipe', `Reading the recipe from ${hostOf(url)}.`);
    page.appendChild(el('p', { class: 'import-working', role: 'status', text: `Reading the recipe from ${hostOf(url)}…` }));

    const before = await findExisting(url);
    if (destroyed) return;
    if (before) { forgetKept(url); showAlready(before); return; }

    const result = await importFromUrl(url);
    if (destroyed) return;
    if (result.ok) {
      // The page may have redirected to an address already imported.
      const after = result.draft.sourceUrl && result.draft.sourceUrl !== url ? await findExisting(result.draft.sourceUrl) : null;
      if (destroyed) return;
      if (after) { forgetKept(url); showAlready(after); return; }
      forgetKept(url);
      const counts = draftCounts(result.draft);
      handOver(result.draft, `Found ${result.draft.name || 'the recipe'}: ${counts.ingredients} ingredients and ${counts.steps} steps. Opening it to check.`);
      return;
    }
    switch (result.reason) {
      case 'offline': showOffline(url, shared.title); break;
      case 'social': showSocial(url, sharedCaption); break;
      case 'no-recipe': showNoRecipe(url, result.siteName); break;
      case 'bad-url':
      case 'blocked': showStart({ url, problem: 'Home-OS cannot open that address. It needs to be a public web page starting https://' }); break;
      default: showUnreachable(url);
    }
  }

  // ---- First paint ------------------------------------------------------------------
  if (sharedUrl) {
    importLink(sharedUrl).catch((err) => {
      console.error('Import screen:', err);
      if (!destroyed) showUnreachable(sharedUrl);
    });
  } else if (sharedCaption) {
    // Shared text with no link in it: a caption or a note.
    showStart({ text: sharedCaption });
  } else {
    showStart();
  }

  return () => {
    destroyed = true;
    controller.abort();
  };
}
