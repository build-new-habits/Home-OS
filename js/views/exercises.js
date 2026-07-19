// js/views/exercises.js — 19 Jul 2026 v1
// Replaces the Phase 2 stub. Exercise cards + one-tap logging (principles
// 1, 2, 3, 6, 10).
import { listCleared, listPending, getLogsForDate, setDone, addExercise, clearExercise } from '../data/exercises.js';
import { createCard } from '../components/card.js';
import { showCompletionStamp, hideCompletionStamp } from '../components/completionStamp.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildYoutubeUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let logsByExerciseId = new Map();

  const h1 = document.createElement('h1');
  h1.textContent = 'Exercises';
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

    if (exercise.side) {
      const side = document.createElement('p');
      side.textContent = `Side: ${exercise.side}`;
      body.appendChild(side);
    }
    if (exercise.target_sets || exercise.target_reps) {
      const target = document.createElement('p');
      target.textContent = `${exercise.target_sets || '—'} sets × ${exercise.target_reps || '—'} reps`;
      body.appendChild(target);
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
      link.textContent = `Watch ${exercise.name} on YouTube`;
      body.appendChild(link);
    }

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
    notesDetails.append(notesSummary, notesLabel, notesInput);
    body.appendChild(notesDetails);

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-done';
    const isDone = !!existingLog?.completed;
    doneBtn.setAttribute('aria-pressed', String(isDone));
    doneBtn.textContent = isDone ? `Marked done: ${exercise.name}` : `Mark ${exercise.name} done`;

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
      doneBtn.textContent = nextCompleted ? `Marked done: ${exercise.name}` : `Mark ${exercise.name} done`;
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
      const empty = document.createElement('p');
      empty.textContent = 'No cleared exercises yet.';
      clearedList.appendChild(empty);
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
      const empty = document.createElement('p');
      empty.textContent = 'Nothing pending.';
      pendingList.appendChild(empty);
      return;
    }
    for (const exercise of result.data) {
      const { article, body, actions } = createCard({ title: exercise.name, headingLevel: 3 });
      const status = document.createElement('p');
      status.textContent = 'Status: pending confirmation';
      body.appendChild(status);

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

  const physioId = 'new-exercise-physio';
  const physioRow = document.createElement('div');
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
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    wrap.append(label, input);
    moreDetails.appendChild(wrap);
    return input;
  }

  const sideId = 'new-exercise-side';
  const sideWrap = document.createElement('div');
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
  sideWrap.append(sideLabel, sideInput);
  moreDetails.appendChild(sideWrap);

  const setsInput = labeledField('new-exercise-sets', 'Target sets', 'number');
  const repsInput = labeledField('new-exercise-reps', 'Target reps', 'number');
  const regionInput = labeledField('new-exercise-region', 'Body region');
  const youtubeInput = labeledField('new-exercise-youtube', 'YouTube search terms');

  const instructionsId = 'new-exercise-instructions';
  const instructionsWrap = document.createElement('div');
  const instructionsLabel = document.createElement('label');
  instructionsLabel.htmlFor = instructionsId;
  instructionsLabel.textContent = 'Instructions';
  const instructionsInput = document.createElement('textarea');
  instructionsInput.id = instructionsId;
  instructionsWrap.append(instructionsLabel, instructionsInput);
  moreDetails.appendChild(instructionsWrap);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-block';
  submitBtn.textContent = 'Add exercise';

  form.append(nameLabel, nameInput, errorMsg, physioRow, moreDetails, submitBtn);

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
      side: sideInput.value.trim() || null,
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
