// js/views/planFuture.js — 10 Sep 2026 v1
//
// Future plans — the third door on the weekly plan hub.
//
// ---- What this is for ----
// The hub used to end with "Planning further ahead is not built yet." The
// table has existed since migration 025 and nothing read it, so a real
// capability sat behind an apology.
//
// This is NOT a third week. Weeks are for eating; this is for thinking.
// Christmas, when Sam visits, the curry you keep meaning to try — plans with
// no Monday attached, which the weekly plan cannot hold without inventing a
// date for them.
//
// ---- Why a sheet to edit, and cards to read ----
// The firm rule in this codebase is that a tappable thing opens a page, not
// a fold. A note is the exception the rule already makes for a recipe: there
// is nothing behind it but its own text, and `detailSheet` is what the
// library uses for exactly that. A route per note would need an id in the
// path, which the router does not carry.

import { el, field } from '../lib/dom.js';
import { pageHeading } from '../lib/icons.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { emptyState } from '../components/emptyState.js';
import { openDetailSheet } from '../components/detailSheet.js';
import { confirmDialog } from '../components/confirmDialog.js';
import {
  listPlanningNotes, addPlanningNote, updatePlanningNote, removePlanningNote, occasionLabel
} from '../data/planningNotes.js';

export function render(mountEl) {
  let destroyed = false;
  const controller = new AbortController();
  const signal = controller.signal;
  let notes = [];

  mountEl.appendChild(pageHeading('Future plans', 'plan'));
  mountEl.appendChild(el('p', {
    class: 'field-hint',
    text: 'Plans that are not a week yet. Christmas, when someone visits, '
      + 'the thing you keep meaning to cook.'
  }));
  mountEl.appendChild(el('a', {
    class: 'btn btn-quiet', href: '#/meal-plan', text: 'Back to the plan'
  }));

  // ---- The list ---------------------------------------------------------
  const list = el('ul', { class: 'hub-list' });
  const listStatus = el('p', { class: 'field-hint', role: 'status', text: 'Loading…' });
  mountEl.appendChild(listStatus);
  mountEl.appendChild(list);

  // ---- Adding one -------------------------------------------------------
  const form = el('form');
  const titleInput = el('input', { type: 'text', id: 'plan-note-title', maxlength: '120' });
  const dateInput = el('input', { type: 'date', id: 'plan-note-date' });
  const bodyInput = el('textarea', { id: 'plan-note-body', rows: '3' });
  const formError = el('p', { class: 'field-error', role: 'alert' });
  formError.hidden = true;
  const submit = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save this plan' });

  form.append(
    el('h2', { text: 'Add a plan' }),
    field('What is it', titleInput),
    // Optional, and said so on the label rather than left to be discovered
    // by pressing Save and being told off.
    field('When (optional)', dateInput),
    field('Notes (optional)', bodyInput),
    formError,
    submit
  );
  mountEl.appendChild(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;
    if (!titleInput.value.trim()) {
      formError.textContent = 'Give the plan a name first.';
      formError.hidden = false;
      titleInput.focus();
      return;
    }
    submit.disabled = true;
    const result = await addPlanningNote({
      title: titleInput.value,
      body: bodyInput.value,
      occasion_date: dateInput.value || null
    });
    submit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to add a planning note:', result.error);
      formError.textContent = "Couldn't save that — try again.";
      formError.hidden = false;
      return;
    }
    announce(`${result.data.title} saved.`);
    titleInput.value = '';
    dateInput.value = '';
    bodyInput.value = '';
    await load();
  }, { signal });

  async function load() {
    const result = await listPlanningNotes();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load planning notes:', result.error);
      // Said, not swallowed. An empty list and a list that would not load
      // look identical, and this app has already been caught once treating
      // a failed read as an answer.
      listStatus.textContent = "Your future plans didn't load. Check your connection and try again.";
      list.replaceChildren();
      return;
    }
    notes = result.data;
    paint();
  }

  function paint() {
    list.replaceChildren();
    if (notes.length === 0) {
      listStatus.textContent = '';
      list.appendChild(el('li', {}, [emptyState({
        title: 'Nothing planned further ahead',
        body: 'Add anything you want to remember to cook — it does not need a date.'
      })]));
      return;
    }
    listStatus.textContent = notes.length === 1 ? '1 plan.' : `${notes.length} plans.`;

    for (const note of notes) {
      const item = el('li', { class: 'hub-item' });
      const open = el('button', { type: 'button', class: 'hub-link' });
      const text = el('span', { class: 'hub-text' });
      text.appendChild(el('span', { class: 'hub-title', text: note.title }));
      text.appendChild(el('span', { class: 'hub-blurb', text: occasionLabel(note) }));
      if (note.body) text.appendChild(el('span', { class: 'hub-status', text: note.body }));
      open.append(text, el('span', { class: 'hub-chevron', 'aria-hidden': 'true', text: '›' }));
      open.setAttribute('aria-label', `Open ${note.title}`);
      open.addEventListener('click', () => openNote(note, open), { signal });
      item.appendChild(open);
      list.appendChild(item);
    }
  }

  function openNote(note, returnFocusTo) {
    let changed = false;
    openDetailSheet({
      title: note.title,
      subtitle: occasionLabel(note),
      returnFocusTo,
      // After the sheet, never underneath it: rebuilding this list while the
      // sheet is open destroys the row focus is due to return to.
      onClose() { if (changed) load(); },
      build(body, api) {
        const t = el('input', { type: 'text', maxlength: '120', id: 'plan-note-edit-title' });
        t.value = note.title;
        const d = el('input', { type: 'date', id: 'plan-note-edit-date' });
        d.value = note.occasion_date || '';
        const b = el('textarea', { rows: '4', id: 'plan-note-edit-body' });
        b.value = note.body || '';
        const err = el('p', { class: 'field-error', role: 'alert' });
        err.hidden = true;

        const save = el('button', { type: 'button', class: 'btn btn-primary', text: 'Save changes' });
        save.addEventListener('click', async () => {
          if (!t.value.trim()) {
            err.textContent = 'A plan needs a name.';
            err.hidden = false;
            t.focus();
            return;
          }
          save.disabled = true;
          const result = await updatePlanningNote(note.id, {
            title: t.value, body: b.value, occasion_date: d.value || null
          });
          save.disabled = false;
          if (!result.ok) {
            console.error('Failed to update a planning note:', result.error);
            err.textContent = "Couldn't save that — try again.";
            err.hidden = false;
            return;
          }
          changed = true;
          announce(`${result.data.title} saved.`);
          api.close();
        });

        const remove = el('button', { type: 'button', class: 'btn btn-danger', text: 'Delete this plan' });
        remove.addEventListener('click', async () => {
          // Asked, because there is no undo for a note: the text is the
          // whole thing, and putting it back means retyping it.
          const yes = await confirmDialog({
            title: `Delete ${note.title}?`,
            message: 'This cannot be undone.',
            confirmLabel: 'Delete'
          });
          if (!yes) return;
          const result = await removePlanningNote(note.id);
          if (!result.ok) {
            console.error('Failed to remove a planning note:', result.error);
            showToast("Couldn't delete that — try again.");
            return;
          }
          changed = true;
          announce(`${note.title} deleted.`);
          api.close();
        });

        body.append(
          field('What is it', t),
          field('When (optional)', d),
          field('Notes (optional)', b),
          err, save, remove
        );
      }
    });
  }

  load();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
