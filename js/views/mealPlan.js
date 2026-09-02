// js/views/mealPlan.js — 01 Sep 2026 v3
// The weekly plan as its own page.
//
// It was the top third of a 1,733-line Meals screen that also held every
// recipe and every food. Three jobs on one screen, and the plan — the thing
// you actually look at on a Sunday — was buried above a hundred rows of
// other things.
//
// ---- A week is tabular data ----
// Days are row headers, meal times are column headers, both with scope, and
// the table has a caption. A screen reader can then say "Tuesday, dinner,
// Porridge" instead of reading twenty-eight cells of loose text.
//
// ---- serves_override is per ENTRY ----
// Changing the servings for Tuesday's dinner must never touch the recipe's
// own default_serves. One is "how many I am cooking this time", the other
// is "how many this recipe makes". Conflating them silently rewrites every
// other week the meal appears in.
//
// ---- Rebuilding the table steals focus ----
// Any save rebuilds all twenty-eight cells, which destroys the input the
// user is standing in and drops focus to <body>. Ids are stable, so focus
// is put back where it was (WCAG 3.2.2 — changing a setting must not
// disorientate).

import {
  listPlan, groupByCell, addPlanEntry, updatePlanEntry, removePlanEntry,
  servingsForEntry, describeDiners, remainingMembers,
  servesFor, DAYS, SLOTS
} from '../data/mealPlan.js';
import { listMeals, mealTypeLabel } from '../data/meals.js';
import { isOffline } from '../lib/net.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { announce } from '../lib/a11y.js';
import { getHousehold } from '../data/household.js';
import {
  requestListSync, flushListSync, onListSync, describeListSync
} from '../data/listSync.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  children.forEach((child) => node.appendChild(child));
  return node;
}

function field(labelText, inputEl, hintEl) {
  const wrap = el('div', { class: 'field' });
  wrap.append(el('label', { for: inputEl.id, text: labelText }), inputEl);
  if (hintEl) wrap.appendChild(hintEl);
  return wrap;
}

function selectFrom(id, options, { includeBlank = null } = {}) {
  const select = el('select', { id });
  if (includeBlank !== null) select.appendChild(el('option', { value: '', text: includeBlank }));
  for (const option of options) {
    select.appendChild(el('option', { value: option.value, text: option.label }));
  }
  return select;
}

function labelForDay(value) {
  const found = DAYS.find((d) => d.value === value);
  return found ? found.label : value;
}

function labelForSlot(value) {
  const found = SLOTS.find((s) => s.value === value);
  return found ? found.label : value;
}

/** Put focus back on an element that a rebuild destroyed and recreated. */
function restoreFocus(id) {
  const node = document.getElementById(id);
  if (node && node.focus) node.focus();
}

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;

  let planByCell = new Map();
  // Phase 20. Empty is a safe default: every entry then means "everyone"
  // and servings fall back to the meal's own default, exactly as before.
  let members = [];

  // Phase 22. The list follows the plan on its own now, and this line is
  // how that stops being silent. A list that changes under you without
  // saying so is worse than one you rebuild by hand.
  const syncNote = el('p', { class: 'field-hint list-sync-note', role: 'status' });
  syncNote.setAttribute('aria-live', 'polite');
  let meals = [];

  mountEl.appendChild(el('h1', { text: 'Weekly plan' }));

  const offlineNote = el('p', { class: 'field-hint' });
  offlineNote.hidden = true;
  mountEl.appendChild(offlineNote);

  function paintOfflineNote() {
    const off = isOffline();
    offlineNote.hidden = !off;
    if (off) {
      offlineNote.textContent =
        'You are offline. The plan needs a connection to change, so edits are paused until you are back.';
    }
  }

  const summary = el('p', { class: 'field-hint', role: 'status' });
  summary.setAttribute('aria-live', 'polite');
  mountEl.appendChild(summary);
  mountEl.appendChild(syncNote);

  const stopListening = onListSync((result) => {
    if (destroyed) return;
    const message = describeListSync(result);
    if (message) syncNote.textContent = message;
  });

  const tableWrap = el('div', { class: 'plan-wrap' });
  const planTable = el('table', { class: 'plan-table' });
  tableWrap.appendChild(planTable);
  mountEl.appendChild(tableWrap);

  function buildPlanTable() {
    planTable.replaceChildren();
    planTable.appendChild(el('caption', {
      class: 'visually-hidden',
      text: 'Weekly meal plan. Each row is a day of the week, each column a meal time.'
    }));

    const thead = el('thead');
    const headRow = el('tr');
    // The corner cell heads the row-header column, so it is a real header.
    headRow.appendChild(el('th', { scope: 'col', text: 'Day' }));
    for (const slot of SLOTS) {
      headRow.appendChild(el('th', { scope: 'col', text: slot.label }));
    }
    thead.appendChild(headRow);
    planTable.appendChild(thead);

    const tbody = el('tbody');
    let planned = 0;
    for (const day of DAYS) {
      const row = el('tr');
      row.appendChild(el('th', { scope: 'row', text: day.label }));
      for (const slot of SLOTS) {
        const entries = planByCell.get(`${day.value}:${slot.value}`) || [];
        if (entries.length > 0) planned += entries.length;
        row.appendChild(buildPlanCell(day, slot, entries));
      }
      tbody.appendChild(row);
    }
    planTable.appendChild(tbody);

    const days = new Set();
    for (const [key, entries] of planByCell.entries()) {
      if (entries.length > 0) days.add(key.split(':')[0]);
    }
    // Stated as a fact about the week, never as a shortfall to feel bad
    // about (principle 1).
    summary.textContent = planned === 0
      ? 'Nothing planned yet this week.'
      : `${planned} meal${planned === 1 ? '' : 's'} planned across ${days.size} day${days.size === 1 ? '' : 's'}.`;
  }

  function buildPlanCell(day, slot, entries) {
    const cell = el('td');

    if (entries.length === 0) {
      cell.appendChild(el('p', { class: 'plan-empty', text: 'Nothing planned' }));
    } else {
      const list = el('ul', { class: 'plan-entries' });
      for (const entry of entries) list.appendChild(buildPlanEntry(entry, day, slot));
      cell.appendChild(list);
    }

    const addBtn = el('button', { type: 'button', class: 'btn btn-small', text: 'Add' });
    addBtn.setAttribute('aria-label', `Add a meal to ${day.label} ${slot.label.toLowerCase()}`);
    addBtn.addEventListener('click', () => {
      planDaySelect.value = day.value;
      planSlotSelect.value = slot.value;
      planMealSelect.focus();
      announce(`Adding a meal to ${day.label} ${slot.label.toLowerCase()}. Choose a meal below.`);
    }, { signal });
    cell.appendChild(addBtn);

    return cell;
  }


  /**
   * Who this meal is for.
   *
   * Hidden behind a details, because the common case — everyone — needs no
   * interaction at all and must not be taxed with one.
   */
  function buildDinerPicker(entry, mealName) {
    const details = el('details', { class: 'diner-picker' });
    details.appendChild(el('summary', { text: 'Who it is for' }));

    const set = el('fieldset', { class: 'diner-options' });
    set.appendChild(el('legend', { class: 'sr-only', text: `Who is eating ${mealName}` }));

    const hint = el('p', {
      class: 'field-hint',
      text: 'Leave all of them unticked for everyone.'
    });
    set.appendChild(hint);

    const boxes = [];
    const chosen = new Set(entry.member_ids || []);
    for (const member of members) {
      const row = el('div', { class: 'checkbox-row' });
      const box = el('input', { type: 'checkbox', id: `diner-${entry.id}-${member.id}` });
      box.value = member.id;
      box.checked = chosen.has(member.id);
      const label = el('label', { for: box.id, text: member.display_name });
      row.append(box, label);
      set.appendChild(row);
      boxes.push(box);
    }

    const save = el('button', { type: 'button', class: 'btn btn-small', text: 'Save' });
    save.addEventListener('click', async () => {
      const ids = boxes.filter((b) => b.checked).map((b) => b.value);
      save.disabled = true;
      // Everyone ticked is the same as nobody ticked, and storing it as
      // empty means a member added later is automatically included.
      const normalised = ids.length === members.length ? [] : ids;
      const result = await updatePlanEntry(entry.id, { member_ids: normalised });
      save.disabled = false;
      if (destroyed) return;
      if (!result.ok) {
        showToast("Couldn't save who that meal is for.");
        return;
      }
      announce(`${mealName} is now for ${describeDiners(result.data, members)}.`);
      await loadPlan();
      requestListSync();
    }, { signal });
    set.appendChild(save);

    details.appendChild(set);
    return details;
  }

  function buildPlanEntry(entry, day, slot) {
    const item = el('li', { class: 'plan-entry' });
    const meal = entry.meals || entry.meal || {};
    const mealName = meal.name || 'Meal';
    // Phase 20: servings follow whoever is eating, unless overridden.
    const serves = servingsForEntry(entry, members);
    const overridden = entry.serves_override !== null && entry.serves_override !== undefined;

    item.appendChild(el('span', { class: 'plan-entry-name', text: mealName }));
    item.appendChild(el('span', {
      class: 'plan-entry-serves',
      text: `Serves ${serves}${overridden ? ' (this one only)' : ''}`
    }));

    // Only shown when the entry is NOT for everyone. Printing "Everyone" on
    // six meals a day is noise that buries the one line that matters.
    if ((entry.member_ids || []).length > 0) {
      item.appendChild(el('span', {
        class: 'plan-entry-diners',
        text: describeDiners(entry, members)
      }));
    }

    if (members.length > 1) item.appendChild(buildDinerPicker(entry, mealName));

    const servesInput = el('input', {
      id: `plan-serves-${entry.id}`,
      type: 'number',
      min: '1',
      step: '1',
      inputmode: 'numeric',
      class: 'plan-serves-input'
    });
    servesInput.value = overridden ? String(entry.serves_override) : '';
    servesInput.placeholder = String(meal.default_serves || 1);
    const servesLabel = el('label', {
      for: servesInput.id,
      class: 'visually-hidden',
      text: `Servings for ${mealName} on ${day.label} ${slot.label.toLowerCase()}. `
        + `Leave blank to use the meal's usual ${meal.default_serves || 1}.`
    });
    item.append(servesLabel, servesInput);

    servesInput.addEventListener('change', async () => {
      // Per-entry only. This must never touch meals.default_serves.
      const result = await updatePlanEntry(entry.id, { serves_override: servesInput.value });
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to update servings:', result.error);
        showToast("Couldn't change the servings — check your connection and try again.");
        return;
      }
      announce(`Servings updated for ${mealName}.`);
      await loadPlan();
      requestListSync();
      if (!destroyed) restoreFocus(`plan-serves-${entry.id}`);
    }, { signal });

    const removeBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Remove' });
    removeBtn.setAttribute('aria-label',
      `Remove ${mealName} from ${day.label} ${slot.label.toLowerCase()}`);
    removeBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: `Remove ${mealName}?`,
        message: `This takes it off ${day.label} ${slot.label.toLowerCase()}. The recipe itself is kept.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it'
      });
      if (!confirmed || destroyed) return;
      const result = await removePlanEntry(entry.id);
      if (destroyed) return;
      if (!result.ok) {
        console.error('Failed to remove a plan entry:', result.error);
        showToast("Couldn't remove that — check your connection and try again.");
        return;
      }
      announce(`${mealName} removed from ${day.label} ${slot.label.toLowerCase()}.`);
      await loadPlan();
      requestListSync();
    }, { signal });
    item.appendChild(removeBtn);

    return item;
  }

  // ---- Add-to-plan form ----
  // One form under the table rather than twenty-eight inline ones. Day and
  // slot are <select> because both columns carry CHECK constraints.
  const planForm = el('form');
  planForm.setAttribute('aria-label', 'Add a meal to the weekly plan');

  const planDaySelect = selectFrom('plan-day', DAYS.map((d) => ({ value: d.value, label: d.label })));
  const planSlotSelect = selectFrom('plan-slot', SLOTS.map((s) => ({ value: s.value, label: s.label })));
  const planMealSelect = selectFrom('plan-meal', [], { includeBlank: 'Choose a meal' });
  const planServesInput = el('input', {
    id: 'plan-serves-new', type: 'number', min: '1', step: '1', inputmode: 'numeric'
  });
  const planServesHint = el('p', {
    class: 'field-hint', id: 'plan-serves-new-hint',
    text: "Leave blank to use the recipe's usual servings."
  });
  planServesInput.setAttribute('aria-describedby', 'plan-serves-new-hint');

  const planError = el('p', { class: 'field-error', id: 'plan-error', role: 'alert' });
  planError.hidden = true;
  const planSubmit = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Add to plan' });

  planForm.append(
    el('h2', { text: 'Add a meal to the plan' }),
    field('Day', planDaySelect),
    field('Meal time', planSlotSelect),
    field('Meal', planMealSelect),
    field('Servings for this one time (optional)', planServesInput, planServesHint),
    planError,
    planSubmit
  );
  mountEl.appendChild(planForm);

  planForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    planError.hidden = true;
    if (!planMealSelect.value) {
      planError.textContent =
        'Choose a meal to add. If the list is empty, add a recipe on the Meals page first.';
      planError.hidden = false;
      planMealSelect.focus();
      return;
    }
    const mealName = planMealSelect.options[planMealSelect.selectedIndex].textContent;
    planSubmit.disabled = true;
    const result = await addPlanEntry({
      meal_id: planMealSelect.value,
      day_of_week: planDaySelect.value,
      slot: planSlotSelect.value,
      serves_override: planServesInput.value
    });
    planSubmit.disabled = false;
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to add a plan entry:', result.error);
      planError.textContent = isOffline()
        ? 'The weekly plan needs a connection. This will work once you are back online.'
        : "Couldn't add that to the plan — try again.";
      planError.hidden = false;
      return;
    }
    announce(`${mealName} added to ${labelForDay(planDaySelect.value)} `
      + `${labelForSlot(planSlotSelect.value).toLowerCase()}.`);
    planServesInput.value = '';
    await loadPlan();
  }, { signal });

  function repopulateMealSelect() {
    const chosen = planMealSelect.value;
    planMealSelect.replaceChildren(el('option', {
      value: '',
      text: meals.length === 0 ? 'No recipes yet — add one on the Meals page' : 'Choose a meal'
    }));
    // Favourites first: the point of a favourite is being quick to reach,
    // and this is the screen where reaching for one happens.
    const ordered = [...meals].sort((a, b) => {
      if (!!b.is_favourite !== !!a.is_favourite) return b.is_favourite ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    });
    for (const meal of ordered) {
      const bits = [meal.name];
      if (meal.is_favourite) bits.push('(favourite)');
      if (meal.meal_type) bits.push(`— ${mealTypeLabel(meal.meal_type)}`);
      const option = el('option', { value: meal.id, text: bits.join(' ') });
      if (meal.id === chosen) option.selected = true;
      planMealSelect.appendChild(option);
    }
  }

  async function loadPlan() {
    const [result, household] = await Promise.all([listPlan(), getHousehold()]);
    if (destroyed) return;
    // A household read that fails must not cost you the plan. Falling back
    // to an empty member list is the pre-Phase-20 behaviour, not an error.
    members = household.ok ? household.data.members : [];
    if (!result.ok) {
      console.error('Failed to load the meal plan:', result.error);
      planByCell = new Map();
      buildPlanTable();
      showToast("Couldn't load the weekly plan — check your connection and try again.");
      return;
    }
    planByCell = groupByCell(result.data);
    buildPlanTable();
  }

  async function loadMeals() {
    const result = await listMeals();
    if (destroyed) return;
    if (!result.ok) {
      console.error('Failed to load meals:', result.error);
      return;
    }
    meals = result.data;
    repopulateMealSelect();
  }

  buildPlanTable();
  paintOfflineNote();

  function onConnectionChange() {
    if (!destroyed) paintOfflineNote();
  }
  window.addEventListener('online', onConnectionChange);
  window.addEventListener('offline', onConnectionChange);

  loadMeals();
  loadPlan();

  // Leaving the screen flushes immediately: you are on your way to the
  // kitchen or the shop, and waiting out a debounce there is the moment the
  // list would be wrong.
  return () => {
    stopListening();
    flushListSync();
    destroyed = true;
    window.removeEventListener('online', onConnectionChange);
    window.removeEventListener('offline', onConnectionChange);
    controller.abort();
  };
}
