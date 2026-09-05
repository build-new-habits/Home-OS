// js/views/exercises.js — 05 Sep 2026 v6
// v6: one facts line, short button labels. Device test 5 Sep 2026.
// Replaces the Phase 2 stub. Exercise cards + one-tap logging (principles
// 1, 2, 3, 6, 10). v2: form fields wrapped in .field (spacing). v3: pending
// cards now show full details (side/sets/reps/instructions/YouTube) via a
// shared appendExerciseDetails() helper, so an exercise can be reviewed
// before clearing it — not just its name.
import { listCleared, listPending, getLogsForDate, setDone, addExercise, clearExercise } from '../data/exercises.js';
import { createCard } from '../components/card.js';
import { showCompletionStamp, hideCompletionStamp } from '../components/completionStamp.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { emptyState } from '../components/emptyState.js';
import { icon, stateBadge } from '../lib/icons.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildYoutubeUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function fieldWrap(labelEl, inputEl, extraEl) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.append(labelEl, inputEl);
  if (extraEl) wrap.appendChild(extraEl);
  return wrap;
}

function appendExerciseDetails(body, exercise) {
  // Device test 5 Sep 2026. This was two stacked paragraphs — "Side: both"
  // then "3 sets × 10 reps" — above a fold, a link and a button, three
  // times down the screen. Neither is a sentence and neither needs its own
  // line. One line, in the order you would say it out loud.
  //
  // This list is NOT collapsed the way the food list is: marking an
  // exercise done is a daily one-tap action, and putting it behind a fold
  // would trade a tidy screen for a slower one. The bulk comes out instead.
  const facts = [];
  if (exercise.target_sets || exercise.target_reps) {
    facts.push(`${exercise.target_sets || '—'} sets × ${exercise.target_reps || '—'} reps`);
  }
  // "both" is the common case and says nothing; a single side is the fact
  // worth carrying, because doing the wrong leg is a real mistake.
  if (exercise.side && exercise.side !== 'both') facts.push(`${exercise.side} side`);
  if (facts.length > 0) {
    const line = document.createElement('p');
    line.className = 'exercise-facts';
    line.textContent = facts.join(' · ');
    body.appendChild(line);
  }
  if (exercise.instructions) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Instructions';
    const text = document.createElement('p');
    text.textContent = exercise.instructions;
    details.append(summary, text);
    body.appendChild(details);
  }
  if (exercise.youtube_search_query) {
    const link = document.createElement('a');
    link.href = buildYoutubeUrl(exercise.youtube_search_query);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Watch on YouTube';
    link.setAttribute('aria-label', `Watch ${exercise.name} on YouTube`);
    body.appendChild(link);
  }
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let logsByExerciseId = new Map();

  // Worklist A2. Built by hand rather than via pageHeading() because this
  // one needs tabIndex for focus management, which the helper does not set.
  const h1 = document.createElement('h1');
  h1.className = 'page-heading';
  const h1Icon = icon('exercises', { size: 28 });
  if (h1Icon) h1.appendChild(h1Icon);
  const h1Text = document.createElement('span');
  h1Text.textContent = 'Exercises';
  h1.appendChild(h1Text);
  h1.tabIndex = -1;
  mountEl.appendChild(h1);
  h1.focus();

  const clearedSection = document.createElement('section');
  clearedSection.setAttribute('aria-label', "Today's exercises");
  const clearedList = document.createElement('div');
  clearedList.className = 'card-list';
  clearedSection.appendChild(clearedList);

  const pendingSection = document.createElement('section');
  const pendingHeading = document.createElement('h2');
  pendingHeading.textContent = 'Pending confirmation';
  const pendingHint = document.createElement('p');
  pendingHint.className = 'field-hint';
  pendingHint.textContent = 'Not yet cleared for use. Confirm to add to your daily list.';
  const pendingList = document.createElement('div');
  pendingList.className = 'card-list';
  pendingSection.append(pendingHeading, pendingHint, pendingList);

  const addSection = document.createElement('section');
  const addHeading = document.createElement('h2');
  addHeading.textContent = 'Add an exercise';
  addSection.appendChild(addHeading);

  mountEl.append(clearedSection, pendingSection, addSection);

  function buildExerciseCard(exercise, logDate) {
    const { article, body, actions } = createCard({ title: exercise.name, headingLevel: 2, className: 'exercise-card' });
    article.dataset.exerciseId = exercise.id;
    const existingLog = logsByExerciseId.get(exercise.id);
    appendExerciseDetails(body, exercise);

    const notesDetails = document.createElement('details');
    const notesSummary = document.createElement('summary');
    notesSummary.textContent = 'Add a note';
    const notesId = `notes-${exercise.id}`;
    const notesLabel = document.createElement('label');
    notesLabel.htmlFor = notesId;
    notesLabel.textContent = 'Note for today';
    const notesInput = document.createElement('textarea');
    notesInput.id = notesId;
    notesInput.value = existingLog?.notes || '';
    notesDetails.append(notesSummary, fieldWrap(notesLabel, notesInput));
    body.appendChild(notesDetails);

    // Worklist A2. Whether today is done was carried by button text alone,
    // so it took a read rather than a glance. A tick beside it makes the
    // state scannable down a list of six.
    //
    // Deliberately NOT a "you have not done this" state: an undone exercise
    // is a fact about today, not a failing, and principle 1 forbids alarm
    // framing for anything a person did or did not do.
    const isDone = !!existingLog?.completed;
    if (isDone) {
      const badge = stateBadge('fresh', 'Done today');
      badge.classList.add('exercise-done-badge');
      body.appendChild(badge);
    }

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-done';
    doneBtn.setAttribute('aria-pressed', String(isDone));
    // The card's own heading says which exercise this is. The name stays in
  // the accessible name, where a screen reader user meets the button out of
  // context, and leaves the visible label, where it was padding.
  doneBtn.textContent = isDone ? 'Done today' : 'Mark done';
  doneBtn.setAttribute('aria-label', isDone ? `Marked done: ${exercise.name}` : `Mark ${exercise.name} done`);

    doneBtn.addEventListener('click', async () => {
      const current = logsByExerciseId.get(exercise.id);
      const nextCompleted = doneBtn.getAttribute('aria-pressed') !== 'true';
      doneBtn.disabled = true;
      const result = await setDone(exercise.id, logDate, nextCompleted, current?.id, notesInput.value);
      doneBtn.disabled = false;
      if (!result.ok) {
        console.error('Failed to save exercise log:', result.error);
        showToast("Couldn't save — you're offline, this will sync later.");
        return;
      }
      logsByExerciseId.set(exercise.id, result.data);
      doneBtn.setAttribute('aria-pressed', String(nextCompleted));
      doneBtn.textContent = nextCompleted ? 'Done today' : 'Mark done';
      doneBtn.setAttribute('aria-label',
        nextCompleted ? `Marked done: ${exercise.name}` : `Mark ${exercise.name} done`);
      if (nextCompleted) {
        showCompletionStamp(article, { label: 'Complete' });
      } else {
        hideCompletionStamp(article);
      }
      announce(`${exercise.name} marked ${nextCompleted ? 'done' : 'not done'}`);
      if (result.queued) {
        showToast("Saved offline — this will sync when you're back online.");
      }
    }, { signal });

    actions.appendChild(doneBtn);
    if (isDone) showCompletionStamp(article, { label: 'Complete' });

    return article;
  }

  async function loadAndRenderCleared() {
    const today = todayIso();
    const [clearedResult, logsResult] = await Promise.all([listCleared(), getLogsForDate(today)]);
    if (!clearedResult.ok) {
      console.error('Failed to load exercises:', clearedResult.error);
      showToast("Couldn't load exercises — check your connection and try again.");
      return;
    }
    logsByExerciseId = new Map();
    if (logsResult.ok) {
      for (const log of logsResult.data) logsByExerciseId.set(log.exercise_id, log);
    }
    clearedList.replaceChildren();
    if (clearedResult.data.length === 0) {
      // Phase 28. What the screen is for, plus the one next action.
      clearedList.appendChild(emptyState({
        body: 'Exercises your physio has cleared appear here, ready to log in one tap.',
        actionLabel: 'Add an exercise',
        onAction: () => {
          const form = document.querySelector('#new-exercise-name');
          if (form) { form.focus(); form.scrollIntoView({ block: 'center' }); }
        },
        why: 'Logging one takes a tap, and nothing here is a streak.'
      }));
      return;
    }
    for (const exercise of clearedResult.data) {
      clearedList.appendChild(buildExerciseCard(exercise, today));
    }
  }

  async function loadAndRenderPending() {
    const result = await listPending();
    if (!result.ok) {
      console.error('Failed to load pending exercises:', result.error);
      return;
    }
    pendingList.replaceChildren();
    if (result.data.length === 0) {
      // Genuinely fine to be empty, so this one states the fact and stops.
      // An action here would be inventing work.
      const pendingEmpty = document.createElement('p');
      pendingEmpty.className = 'empty-state';
      pendingEmpty.textContent = 'Nothing waiting to be confirmed.';
      pendingList.appendChild(pendingEmpty);
      return;
    }
    for (const exercise of result.data) {
      const { article, body, actions } = createCard({ title: exercise.name, headingLevel: 3 });
      const status = document.createElement('p');
      status.textContent = 'Status: pending confirmation';
      body.appendChild(status);
      appendExerciseDetails(body, exercise);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn';
      clearBtn.textContent = `Clear ${exercise.name} for use`;
      clearBtn.addEventListener('click', async () => {
        clearBtn.disabled = true;
        const clearResult = await clearExercise(exercise.id);
        if (!clearResult.ok) {
          console.error('Failed to clear exercise:', clearResult.error);
          showToast("Couldn't clear that exercise — check your connection and try again.");
          clearBtn.disabled = false;
          return;
        }
        announce(`${exercise.name} cleared for use`);
        await Promise.all([loadAndRenderPending(), loadAndRenderCleared()]);
      }, { signal });

      actions.appendChild(clearBtn);
      pendingList.appendChild(article);
    }
  }

  // Add-exercise form (minimal required fields; rest behind an expander)
  const form = document.createElement('form');

  const nameId = 'new-exercise-name';
  const nameLabel = document.createElement('label');
  nameLabel.htmlFor = nameId;
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.id = nameId;
  nameInput.type = 'text';
  nameInput.required = true;

  const errorMsg = document.createElement('p');
  errorMsg.className = 'field-error';
  errorMsg.id = 'new-exercise-error';
  errorMsg.hidden = true;
  nameInput.setAttribute('aria-describedby', errorMsg.id);

  const nameField = fieldWrap(nameLabel, nameInput, errorMsg);

  const physioId = 'new-exercise-physio';
  const physioRow = document.createElement('div');
  physioRow.className = 'field field-checkbox';
  const physioCheckbox = document.createElement('input');
  physioCheckbox.type = 'checkbox';
  physioCheckbox.id = physioId;
  const physioLabel = document.createElement('label');
  physioLabel.htmlFor = physioId;
  physioLabel.textContent = 'This exercise was given by my physiotherapist';
  physioRow.append(physioCheckbox, physioLabel);

  const moreDetails = document.createElement('details');
  const moreSummary = document.createElement('summary');
  moreSummary.textContent = 'More details (optional)';
  moreDetails.appendChild(moreSummary);

  function labeledField(id, labelText, type = 'text') {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    moreDetails.appendChild(fieldWrap(label, input));
    return input;
  }

  const sideId = 'new-exercise-side';
  const sideLabel = document.createElement('label');
  sideLabel.htmlFor = sideId;
  sideLabel.textContent = 'Side';
  const sideInput = document.createElement('select');
  sideInput.id = sideId;
  const sideOptions = [
    { value: '', label: 'Not applicable' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'both', label: 'Both' }
  ];
  for (const opt of sideOptions) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    sideInput.appendChild(optionEl);
  }
  moreDetails.appendChild(fieldWrap(sideLabel, sideInput));

  const setsInput = labeledField('new-exercise-sets', 'Target sets', 'number');
  const repsInput = labeledField('new-exercise-reps', 'Target reps', 'number');
  const regionInput = labeledField('new-exercise-region', 'Body region');
  const youtubeInput = labeledField('new-exercise-youtube', 'YouTube search terms');

  const instructionsId = 'new-exercise-instructions';
  const instructionsLabel = document.createElement('label');
  instructionsLabel.htmlFor = instructionsId;
  instructionsLabel.textContent = 'Instructions';
  const instructionsInput = document.createElement('textarea');
  instructionsInput.id = instructionsId;
  moreDetails.appendChild(fieldWrap(instructionsLabel, instructionsInput));

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Add exercise';

  form.append(nameField, physioRow, moreDetails, submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) {
      errorMsg.textContent = 'Name is required.';
      errorMsg.hidden = false;
      nameInput.focus();
      return;
    }
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    const result = await addExercise({
      name: nameInput.value.trim(),
      side: sideInput.value || null,
      target_sets: setsInput.value ? Number(setsInput.value) : null,
      target_reps: repsInput.value ? Number(repsInput.value) : null,
      instructions: instructionsInput.value.trim() || null,
      youtube_search_query: youtubeInput.value.trim() || null,
      body_region: regionInput.value.trim() || null,
      fromPhysio: physioCheckbox.checked
    });
    submitBtn.disabled = false;
    if (!result.ok) {
      console.error('Failed to add exercise:', result.error);
      showToast("Couldn't add that exercise — check your connection and try again.");
      return;
    }
    form.reset();
    const cleared = result.data.clearance_status === 'cleared';
    announce(cleared ? `${result.data.name} added and cleared` : `${result.data.name} added, pending confirmation`);
    if (cleared) {
      await loadAndRenderCleared();
    } else {
      await loadAndRenderPending();
    }
  }, { signal });

  addSection.appendChild(form);

  loadAndRenderCleared();
  loadAndRenderPending();

  return () => controller.abort();
}
