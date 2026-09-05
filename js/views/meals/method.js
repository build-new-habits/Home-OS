// js/views/meals/method.js — 01 Sep 2026 v1
// Worklist G1, third extraction. Method steps and Cook Mode.
//
// The biggest of the remaining features, and the first that genuinely reads
// another one: a step's {{ing:}} token resolves against the meal's
// INGREDIENTS. That is why it takes them as an argument rather than
// fetching them — the ingredient rows have one owner, and it is not this
// module.
//
// A factory PER MEAL rather than a panel, because a method belongs to one
// recipe and there is no state to carry between them.

import { el, field } from '../../lib/dom.js';
import { announce } from '../../lib/a11y.js';
import { showToast } from '../../components/toast.js';
import { confirmDialog } from '../../components/confirmDialog.js';
import { openCookMode, readProgress } from '../../components/cookMode.js';
import {
  addStep, updateStep, removeStep, moveStep,
  checkStyle, resolveTokens, unresolvedTokens
} from '../../data/mealSteps.js';
import { planDepletion, applyDepletion, describeDepletion } from '../../data/restock.js';

function numberInput(id, { min = '0', step = 'any' } = {}) {
  const input = el('input', { id, type: 'number', min, step, inputmode: 'decimal' });
  return input;
}

/**
 * @param {{
 *   meal: object,
 *   steps: object[],
 *   ingredientRows: object[],
 *   pantryStock: object[] | null,
 *   signal: AbortSignal,
 *   isDestroyed: () => boolean,
 *   onChanged: () => Promise<void>
 * }} options
 * @returns {HTMLElement} the method section for this meal
 */
export function createMethodSection({
  meal, steps = [], ingredientRows = [], pantryStock = null,
  signal, isDestroyed, onChanged
}) {
  const destroyed = () => isDestroyed();

function buildMethodSection() {
  // `steps` is a parameter now, not something to look up. The naive
  // substitution during extraction produced `const steps = steps;`, which
  // is a temporal-dead-zone throw the render gate could not see because it
  // only fires when a meal SHEET is opened.
  const wrap = el('section', { class: 'method-section' });

  const heading = el('h4', { text: 'Method' });
  wrap.appendChild(heading);

  if (steps.length === 0) {
    wrap.appendChild(el('p', {
      class: 'field-hint',
      text: 'No steps yet. Add them one action at a time — short steps are easier to follow with a pan on the go.'
    }));
  } else {
    const cook = el('button', {
      type: 'button', class: 'btn btn-primary btn-large', text: `Cook this (${steps.length} steps)`
    });
    const resumed = readProgress(meal.id);
    if (resumed) cook.textContent = `Carry on from step ${resumed.stepIndex + 1}`;
    // Worklist C10. resolveTokens has honoured a scale since Phase 15 and
    // nothing ever set one, so every recipe cooked at its default serving
    // however many people were eating.
    const servesInput = el('input', {
      id: `cook-serves-${meal.id}`, type: 'number', min: '1', max: '24',
      inputmode: 'numeric', value: String(meal.default_serves || 4)
    });
    const servesHint = el('p', {
      class: 'field-hint', id: `cook-serves-hint-${meal.id}`,
      text: 'Quantities in the steps change with this.'
    });
    servesInput.setAttribute('aria-describedby', servesHint.id);
    wrap.appendChild(field('Cooking for', servesInput, servesHint));

    cook.addEventListener('click', async () => {
      const base = Number(meal.default_serves) || 4;
      const wanted = Number(servesInput.value) || base;
      const scale = wanted > 0 && base > 0 ? wanted / base : 1;
      const finished = await openCookMode({ meal, steps, ingredients: ingredientRows, scale });
      if (destroyed()) return;
      renderMeals();
      // Phase 22. Offered, never automatic: you may have used the bag from
      // the shop rather than the one in the cupboard, and a pantry that
      // silently empties itself is worse than one that lags. Only offered
      // when the recipe was actually finished.
      if (finished) await offerDepletion(meal, ingredientRows);
    }, { signal });
    wrap.appendChild(cook);

    const list = el('ol', { class: 'step-list' });
    for (const step of steps) list.appendChild(buildStepRow(meal, step, ingredientRows));
    wrap.appendChild(list);
  }

  // ---- Worklist C9: the one-line caveat ----
  // method_note has been displayed since Phase 15 and could never be
  // written. It is for the thing that belongs to no single step —
  // "this makes a wet sauce, do not panic" — which is exactly the sort of
  // reassurance somebody adds AFTER cooking it once.
  const noteDetails = el('details', { class: 'method-note-editor' });
  noteDetails.appendChild(el('summary', {
    text: meal.method_note ? 'Change the note' : 'Add a note about this recipe'
  }));
  const noteInput = el('input', { id: `method-note-${meal.id}`, type: 'text', maxlength: '200' });
  noteInput.value = meal.method_note || '';
  const noteHint = el('p', {
    class: 'field-hint', id: `method-note-hint-${meal.id}`,
    text: 'One line, for anything that belongs to the whole recipe rather than one step.'
  });
  noteInput.setAttribute('aria-describedby', noteHint.id);
  noteInput.addEventListener('change', async () => {
    const result = await updateMeal(meal.id, { method_note: noteInput.value.trim() || null });
    if (destroyed()) return;
    if (!result.ok) { showToast('That note could not be saved.'); return; }
    announce('Note saved.');
    await onChanged();
  }, { signal });
  noteDetails.appendChild(field('Note', noteInput, noteHint));

  if (meal.method_note) {
    wrap.appendChild(el('p', { class: 'field-hint', text: meal.method_note }));
  }
  wrap.appendChild(noteDetails);

  const details = el('details', { class: 'step-editor' });
  details.appendChild(el('summary', { text: steps.length ? 'Add a step' : 'Add the first step' }));
  details.appendChild(buildAddStepForm(meal, ingredientRows));
  wrap.appendChild(details);

  return wrap;
}


async function offerDepletion(meal, ingredientRows) {
  const changes = planDepletion(ingredientRows, pantryStock || [], 1);
  if (changes.length === 0 || destroyed) return;

  const yes = await confirmDialog({
    title: `Cooked ${meal.name}?`,
    message: describeDepletion(changes)
      + ' This keeps the cupboard roughly right without you having to think about it.',
    confirmLabel: 'Take them out'
  });
  if (!yes || destroyed) return;

  const done = await applyDepletion(changes);
  if (destroyed()) return;
  if (!done.ok) { showToast('The pantry could not be updated.'); return; }
  showToast(`Pantry updated — ${done.applied} item${done.applied === 1 ? '' : 's'}.`);
  await onChanged();
}


function buildStepRow(meal, step, ingredientRows) {
  const item = el('li', { class: 'step-row' });

  const text = el('div', { class: 'step-text' });
  text.appendChild(el('span', {
    class: 'step-instruction',
    text: resolveTokens(step.instruction, ingredientRows, 1)
  }));
  if (step.note) text.appendChild(el('span', { class: 'step-note', text: step.note }));
  const meta = [];
  if (step.duration_min) meta.push(`${step.duration_min} min`);
  if (step.while_waiting) meta.push('while waiting');
  if (step.step_group) meta.push(step.step_group);
  if (meta.length) text.appendChild(el('span', { class: 'step-meta', text: meta.join(' · ') }));
  item.appendChild(text);

  const actions = el('div', { class: 'step-actions' });

  // Up/down buttons, NOT drag and drop. Dragging is poor with a screen
  // reader and awkward with wet hands, and this is a kitchen.
  const up = el('button', { type: 'button', class: 'btn btn-small', text: '\u2191' });
  up.setAttribute('aria-label', `Move step ${step.step_number} up`);
  up.disabled = step.step_number === 1;
  up.addEventListener('click', () => reorder(meal, step, 'up'), { signal });

  const down = el('button', { type: 'button', class: 'btn btn-small', text: '\u2193' });
  down.setAttribute('aria-label', `Move step ${step.step_number} down`);
  down.disabled = step.step_number === (steps).length;
  down.addEventListener('click', () => reorder(meal, step, 'down'), { signal });

  // Worklist C8. Changing a word meant delete and re-add, which loses the
  // note, the timer and the position — a typo cost you the whole step.
  const edit = el('button', { type: 'button', class: 'btn btn-small', text: 'Edit' });
  edit.setAttribute('aria-label', `Edit step ${step.step_number}`);
  edit.setAttribute('aria-expanded', 'false');
  const editForm = buildEditStepForm(meal, step, ingredientRows, () => {
    editForm.hidden = true;
    edit.setAttribute('aria-expanded', 'false');
    edit.focus();
  });
  editForm.hidden = true;
  edit.addEventListener('click', () => {
    const open = edit.getAttribute('aria-expanded') === 'true';
    edit.setAttribute('aria-expanded', String(!open));
    editForm.hidden = open;
    if (!open) editForm.querySelector('textarea').focus();
  }, { signal });

  const del = el('button', { type: 'button', class: 'btn btn-small', text: 'Delete' });
  del.setAttribute('aria-label', `Delete step ${step.step_number}`);
  del.addEventListener('click', async () => {
    // Worklist F1. Undo rather than a confirm — a confirm asks you to
    // predict the mistake before making it. The whole step is snapshotted,
    // including the note and the timer, which delete-and-re-add lost.
    const snapshot = {
      meal_id: meal.id,
      instruction: step.instruction,
      note: step.note,
      duration_min: step.duration_min,
      step_group: step.step_group,
      while_waiting: step.while_waiting
    };
    const result = await removeStep(step.id, meal.id);
    if (destroyed()) return;
    if (!result.ok) { showToast('That step could not be deleted.'); return; }
    await onChanged();
    if (destroyed()) return;
    showToast(`Step deleted.`, {
      undo: async () => {
        // It goes back on the END — addStep numbers sequentially. Said
        // out loud rather than letting somebody discover it, because a
        // silent reorder of a method is worse than the deletion was.
        const back = await addStep(snapshot);
        if (destroyed()) return;
        if (!back.ok) { showToast("That step couldn't be put back."); return; }
        announce('Step put back at the end. Move it if it belonged elsewhere.');
        await onChanged();
      }
    });
  }, { signal });

  actions.append(up, down, edit, del);
  item.appendChild(actions);
  item.appendChild(editForm);
  return item;
}


function buildEditStepForm(meal, step, ingredientRows, onDone) {
  const form = el('form', { class: 'add-step-form' });
  form.setAttribute('aria-label', `Edit step ${step.step_number}`);

  const instruction = el('textarea', { id: `edit-instruction-${step.id}`, rows: '2' });
  instruction.value = step.instruction || '';
  const styleNote = el('p', { class: 'field-hint style-check', role: 'status' });
  styleNote.hidden = true;

  instruction.addEventListener('input', () => {
    const issues = checkStyle(instruction.value);
    const unresolved = unresolvedTokens(instruction.value, ingredientRows);
    const lines = issues.map((i) => `Rule ${i.rule}: ${i.text}`);
    if (unresolved.length) {
      lines.push(`No ingredient called "${unresolved.join('", "')}" in this recipe.`);
    }
    styleNote.textContent = lines.join(' ');
    styleNote.hidden = lines.length === 0;
  }, { signal });

  const note = el('input', { id: `edit-note-${step.id}`, type: 'text' });
  note.value = step.note || '';
  const duration = el('input', {
    id: `edit-duration-${step.id}`, type: 'number', min: '1', max: '1440', inputmode: 'numeric'
  });
  duration.value = step.duration_min != null ? String(step.duration_min) : '';

  const error = el('p', { class: 'field-error', role: 'alert' });
  error.hidden = true;

  const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save' });
  const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });
  cancel.addEventListener('click', onDone, { signal });
  const actions = el('div', { class: 'form-actions' });
  actions.append(save, cancel);

  form.append(
    field('Instruction', instruction), styleNote,
    field('Note', note), field('Timer, in minutes', duration),
    error, actions
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    save.disabled = true;
    const result = await updateStep(step.id, {
      instruction: instruction.value,
      note: note.value,
      duration_min: duration.value
    });
    save.disabled = false;
    if (destroyed()) return;
    if (!result.ok) {
      error.textContent = result.error.message;
      error.hidden = false;
      instruction.focus();
      return;
    }
    announce(`Step ${step.step_number} updated.`);
    await onChanged();
  }, { signal });

  return form;
}


async function reorder(meal, step, direction) {
  const result = await moveStep(step.id, meal.id, direction);
  if (destroyed()) return;
  if (!result.ok) { showToast('That step could not be moved.'); return; }
  announce(`Step moved ${direction}.`);
  await onChanged();
}


function buildAddStepForm(meal, ingredientRows) {
  const form = el('form', { class: 'add-step-form' });

  const instruction = el('textarea', { id: `step-instruction-${meal.id}`, rows: '2' });
  const styleNote = el('p', { class: 'field-hint style-check', role: 'status' });

  // Live, advisory, and never blocking. A checker that refuses your
  // sentence is a checker you learn to turn off.
  instruction.addEventListener('input', () => {
    const issues = checkStyle(instruction.value);
    const unresolved = unresolvedTokens(instruction.value, ingredientRows);
    const lines = issues.map((i) => `Rule ${i.rule}: ${i.text}`);
    if (unresolved.length) {
      lines.push(`No ingredient called "${unresolved.join('", "')}" in this recipe.`);
    }
    styleNote.textContent = lines.join(' ');
    styleNote.hidden = lines.length === 0;
  }, { signal });

  const note = el('input', { id: `step-note-${meal.id}`, type: 'text' });
  const noteHint = el('p', {
    class: 'field-hint',
    text: 'Optional. Why, what it should look like, or what to do if it goes wrong.'
  });

  const duration = el('input', {
    id: `step-duration-${meal.id}`, type: 'number', min: '1', max: '1440', inputmode: 'numeric'
  });
  const group = el('input', { id: `step-group-${meal.id}`, type: 'text' });

  const waitingWrap = el('div', { class: 'checkbox-row' });
  const waiting = el('input', { id: `step-waiting-${meal.id}`, type: 'checkbox' });
  const waitingLabel = el('label', {
    for: waiting.id, text: 'This is done while something else cooks'
  });
  waitingWrap.append(waiting, waitingLabel);

  const error = el('p', { class: 'field-error', role: 'alert' });
  error.hidden = true;
  const submit = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Add step' });

  form.append(
    field('Instruction', instruction),
    styleNote,
    field('Note', note, noteHint),
    field('Timer, in minutes', duration),
    field('Part of', group),
    waitingWrap,
    error,
    submit
  );
  styleNote.hidden = true;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    const result = await addStep({
      meal_id: meal.id,
      instruction: instruction.value,
      note: note.value,
      duration_min: duration.value,
      step_group: group.value,
      while_waiting: waiting.checked
    });
    submit.disabled = false;
    if (destroyed()) return;
    if (!result.ok) {
      error.textContent = result.error.message;
      error.hidden = false;
      instruction.focus();
      return;
    }
    announce(`Step ${result.data.step_number} added.`);
    instruction.value = '';
    note.value = '';
    duration.value = '';
    styleNote.hidden = true;
    await onChanged();
  }, { signal });

  return form;
}


  return buildMethodSection();
}
