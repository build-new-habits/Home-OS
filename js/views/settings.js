// js/views/settings.js — 01 Sep 2026 v10
// v7 (Phase 18): a Household section. The cupboard, shopping list, meal
// plan, chores, calendar and holidays are shared by everyone here; weight,
// water and exercises are not, and the section says so out loud rather
// than leaving people to guess what a housemate can see.
// v6: states the installed build, so "is this the new version?" stops being
// guesswork — twice now a bug report has been an older build still serving.
// v5: fixes a ReferenceError introduced in v4 — an el() helper was used
// here that only exists in other views. This file builds nodes with
// document.createElement directly; that idiom is kept rather than importing
// a helper, so the file stays internally consistent.
// v4: the change-password form now offers a reset-link route when the
// current password is rejected. A magic-link user may have no password at
// all, and Supabase returns the same 400 for 'wrong' and 'never set' — so
// the only honest response is to offer the path that resolves both.
// v3: adds a Change password form under Account. Requested out-of-band
// during the Phase 5 session; logged in PHASE5_HANDOFF.md.
import { upsertSettings, exportAllData, downloadJson, signOutUser, changePassword, sendPasswordReset } from '../data/settings.js';
import { announce } from '../lib/a11y.js';
import { permissionState, requestPermission, describePermission } from '../lib/notify.js';
import { showToast } from '../components/toast.js';
import { getState, setSettings } from '../lib/store.js';
import {
  getHousehold, renameHousehold, addMember, updateMember, removeMember,
  describeMember, ROLES, DIETARY_TAGS
} from '../data/household.js';
import { confirmDialog } from '../components/confirmDialog.js';

const THEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'dusk', label: 'Dusk' }
];
const CONTRAST_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High contrast' }
];
const BRIGHTNESS_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'dim', label: 'Dim' },
  { value: 'bright', label: 'Bright' }
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' }
];
const WEIGHT_UNIT_OPTIONS = [
  { value: 'stone_lb', label: 'Stone & lb' },
  { value: 'kg', label: 'Kilograms' }
];
// Phase 32. Only what actually gets sent is offered.
//
// Four switches existed and nothing was behind any of them, which a user
// reads as broken rather than unbuilt. Two of them now deliver. The other
// two (water check-in, exercise day) are held back until something sends
// them — a switch that does nothing is the defect, not the absence of a
// switch.
const NOTIFICATION_TYPES = [
  { key: 'use_soon', label: 'Food to use soon' },
  { key: 'shopping_list_ready', label: 'Shopping list ready' }
];

function applyThemeAttrs(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme || 'default');
  root.setAttribute('data-contrast', settings.contrast_mode || 'standard');
  root.setAttribute('data-brightness', settings.brightness_pref || 'standard');
  root.setAttribute('data-density', settings.density || 'comfortable');
}

function buildToggleGroup({ legend, name, options, current, onChange }) {
  const fieldset = document.createElement('fieldset');
  const legendEl = document.createElement('legend');
  legendEl.textContent = legend;
  fieldset.appendChild(legendEl);

  const group = document.createElement('div');
  group.className = 'toggle-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', legend);

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-option';
    btn.textContent = opt.label;
    btn.setAttribute('aria-pressed', String(opt.value === current));
    btn.addEventListener('click', () => onChange(opt.value));
    group.appendChild(btn);
  }

  fieldset.appendChild(group);
  return fieldset;
}

/**
 * Labelled password field. autocomplete values matter here: they tell a
 * password manager which box is which, so the browser can offer to store
 * the new password instead of the user memorising it (WCAG 1.3.5).
 */
function buildPasswordField({ id, label, autocomplete, hint }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'password';
  input.id = id;
  input.setAttribute('autocomplete', autocomplete);

  const describedBy = [];
  wrap.append(labelEl, input);

  if (hint) {
    const hintEl = document.createElement('p');
    hintEl.className = 'field-hint';
    hintEl.id = `${id}-hint`;
    hintEl.textContent = hint;
    wrap.appendChild(hintEl);
    describedBy.push(`${id}-hint`);
  }

  const err = document.createElement('p');
  err.className = 'field-error';
  err.id = `${id}-error`;
  err.setAttribute('role', 'alert');
  err.hidden = true;
  wrap.appendChild(err);
  describedBy.push(`${id}-error`);

  input.setAttribute('aria-describedby', describedBy.join(' '));
  return { wrap, input, err };
}

function setFieldError(field, message) {
  field.err.textContent = message;
  field.err.hidden = false;
  field.input.setAttribute('aria-invalid', 'true');
}

function clearFieldError(field) {
  field.err.textContent = '';
  field.err.hidden = true;
  field.input.removeAttribute('aria-invalid');
}

function buildSwitch({ label, checked, onChange }) {
  const row = document.createElement('div');
  row.className = 'switch';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  const id = 'switch-' + Math.random().toString(36).slice(2, 8);
  labelEl.id = id;

  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'switch-control';
  control.setAttribute('role', 'switch');
  control.setAttribute('aria-checked', String(checked));
  control.setAttribute('aria-labelledby', id);

  control.addEventListener('click', () => {
    const next = control.getAttribute('aria-checked') !== 'true';
    control.setAttribute('aria-checked', String(next));
    onChange(next);
  });

  row.append(labelEl, control);
  return row;
}


/**
 * Phase 18. The household section.
 *
 * ---- Why it states what is shared ----
 * Adding someone to a household changes what another human being can see
 * about you. Leaving that implicit would be a privacy decision made by
 * omission. The list is short and it is spelled out before the Add button,
 * not after it.
 */
function buildHouseholdSection({ household, onChanged, signal }) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Household';
  fieldset.appendChild(legend);

  const shared = document.createElement('p');
  shared.className = 'field-hint';
  shared.textContent = 'Everyone here shares the cupboard, shopping list, meal plan, '
    + 'chores, calendar and holidays. Weight, water and exercises stay private to each person.';
  fieldset.appendChild(shared);

  // ---- Name ----
  const nameWrap = document.createElement('div');
  nameWrap.className = 'field';
  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', 'household-name');
  nameLabel.textContent = 'Household name';
  const nameInput = document.createElement('input');
  nameInput.id = 'household-name';
  nameInput.type = 'text';
  nameInput.value = household.name || '';
  nameInput.addEventListener('change', async () => {
    const result = await renameHousehold(nameInput.value);
    if (!result.ok) {
      showToast(result.error.message);
      nameInput.value = household.name || '';
      return;
    }
    announce('Household renamed.');
    onChanged();
  }, { signal });
  nameWrap.append(nameLabel, nameInput);
  fieldset.appendChild(nameWrap);

  // ---- Members ----
  const list = document.createElement('ul');
  list.className = 'plain-list member-list';

  for (const member of household.members) {
    const item = document.createElement('li');
    item.className = 'member-row';

    const text = document.createElement('div');
    text.className = 'member-text';
    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = member.display_name;
    const detail = document.createElement('span');
    detail.className = 'member-detail';
    detail.textContent = describeMember(member);
    text.append(name, detail);
    item.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'member-actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn btn-small';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${member.display_name}`);
    edit.setAttribute('aria-expanded', 'false');
    actions.appendChild(edit);
    item.appendChild(actions);

    const form = buildMemberForm({
      member,
      signal,
      onDone: onChanged,
      onCancel: () => {
        form.hidden = true;
        edit.setAttribute('aria-expanded', 'false');
        edit.focus();
      }
    });
    form.hidden = true;
    item.appendChild(form);

    edit.addEventListener('click', () => {
      const open = edit.getAttribute('aria-expanded') === 'true';
      edit.setAttribute('aria-expanded', String(!open));
      form.hidden = open;
      if (!open) form.querySelector('input, select').focus();
    }, { signal });

    list.appendChild(item);
  }
  fieldset.appendChild(list);

  // ---- Add someone ----
  // Behind a details, so the everyday view is a list rather than a form.
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Add someone';
  details.appendChild(summary);

  const addHint = document.createElement('p');
  addHint.className = 'field-hint';
  addHint.textContent = 'Someone added here does not need a sign-in. '
    + 'That is how children get their own portions and meals without an account.';
  details.appendChild(addHint);

  details.appendChild(buildMemberForm({
    member: null,
    signal,
    onDone: onChanged,
    onCancel: () => { details.open = false; }
  }));
  fieldset.appendChild(details);

  return fieldset;
}

/** One form, used for both adding and editing. */
function buildMemberForm({ member, onDone, onCancel, signal }) {
  const form = document.createElement('form');
  form.className = 'member-form';
  form.setAttribute('aria-label', member ? `Edit ${member.display_name}` : 'Add a household member');
  const uid = member ? member.id : 'new';

  const nameWrap = document.createElement('div');
  nameWrap.className = 'field';
  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', `member-name-${uid}`);
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.id = `member-name-${uid}`;
  nameInput.type = 'text';
  nameInput.value = member ? member.display_name : '';
  nameWrap.append(nameLabel, nameInput);
  form.appendChild(nameWrap);

  // A CHECK-constrained column, so a select and never free text.
  const roleWrap = document.createElement('div');
  roleWrap.className = 'field';
  const roleLabel = document.createElement('label');
  roleLabel.setAttribute('for', `member-role-${uid}`);
  roleLabel.textContent = 'Role';
  const roleSelect = document.createElement('select');
  roleSelect.id = `member-role-${uid}`;
  for (const role of ROLES) {
    const opt = document.createElement('option');
    opt.value = role.value;
    opt.textContent = role.label;
    if (member && member.role === role.value) opt.selected = true;
    roleSelect.appendChild(opt);
  }
  roleWrap.append(roleLabel, roleSelect);
  form.appendChild(roleWrap);

  const portionWrap = document.createElement('div');
  portionWrap.className = 'field';
  const portionLabel = document.createElement('label');
  portionLabel.setAttribute('for', `member-portion-${uid}`);
  portionLabel.textContent = 'Portion size';
  const portionInput = document.createElement('input');
  portionInput.id = `member-portion-${uid}`;
  portionInput.type = 'number';
  portionInput.min = '0.1';
  portionInput.max = '3';
  portionInput.step = '0.1';
  portionInput.inputMode = 'decimal';
  portionInput.value = member ? String(member.portion_factor) : '1';
  const portionHint = document.createElement('p');
  portionHint.className = 'field-hint';
  portionHint.id = `member-portion-hint-${uid}`;
  // Says what the number DOES. "0.6" means nothing without this line.
  portionHint.textContent = '1 is an adult portion. Around 0.6 suits a younger child. '
    + 'This scales the shopping list, not anyone\'s target.';
  portionInput.setAttribute('aria-describedby', portionHint.id);
  portionWrap.append(portionLabel, portionInput, portionHint);
  form.appendChild(portionWrap);

  const dietFieldset = document.createElement('fieldset');
  dietFieldset.className = 'diet-tags';
  const dietLegend = document.createElement('legend');
  dietLegend.textContent = 'Does not eat';
  dietFieldset.appendChild(dietLegend);
  const boxes = [];
  for (const tag of DIETARY_TAGS) {
    const row = document.createElement('div');
    row.className = 'checkbox-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `member-tag-${uid}-${tag.value}`;
    box.value = tag.value;
    if (member && (member.dietary_tags || []).includes(tag.value)) box.checked = true;
    const label = document.createElement('label');
    label.setAttribute('for', box.id);
    label.textContent = tag.label;
    row.append(box, label);
    dietFieldset.appendChild(row);
    boxes.push(box);
  }
  form.appendChild(dietFieldset);

  const error = document.createElement('p');
  error.className = 'field-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn btn-primary';
  save.textContent = member ? 'Save' : 'Add to household';
  actions.appendChild(save);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', onCancel, { signal });
  actions.appendChild(cancel);

  if (member) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger';
    remove.textContent = 'Remove';
    remove.addEventListener('click', async () => {
      // Principle 9: a removal goes through a confirm, and the confirm
      // says what is NOT lost as well as what is.
      const yes = await confirmDialog({
        title: `Remove ${member.display_name}?`,
        message: 'They come off the meal plan and shopping list from now on. '
          + 'Nothing in the cupboard, the shopping list or past plans is deleted.',
        confirmLabel: 'Remove'
      });
      if (!yes) return;
      const result = await removeMember(member.id);
      if (!result.ok) {
        error.textContent = result.error.message;
        error.hidden = false;
        return;
      }
      announce(`${member.display_name} removed from the household.`);
      onDone();
    }, { signal });
    actions.appendChild(remove);
  }

  form.appendChild(actions);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    save.disabled = true;

    const payload = {
      display_name: nameInput.value,
      role: roleSelect.value,
      portion_factor: portionInput.value,
      dietary_tags: boxes.filter((b) => b.checked).map((b) => b.value)
    };

    const result = member
      ? await updateMember(member.id, payload)
      : await addMember(payload);
    save.disabled = false;

    if (!result.ok) {
      error.textContent = result.error.message;
      error.hidden = false;
      nameInput.focus();
      return;
    }
    announce(member ? `${result.data.display_name} updated.` : `${result.data.display_name} added to the household.`);
    if (!member) nameInput.value = '';
    onDone();
  }, { signal });

  return form;
}

export function render(mountEl) {
  const controller = new AbortController();
  let settings = getState().settings || {
    theme: 'default',
    contrast_mode: 'standard',
    brightness_pref: 'standard',
    density: 'comfortable',
    weight_unit_display: 'stone_lb',
    notification_prefs: {}
  };

  const h1 = document.createElement('h1');
  h1.textContent = 'Settings';
  mountEl.appendChild(h1);

  async function saveAndRerender(patch, savedMessage) {
    const result = await upsertSettings(patch);
    if (!result.ok) {
      console.error('Failed to save settings:', result.error);
      showToast('Could not save that change — check your connection and try again.');
      return;
    }
    settings = result.data;
    setSettings(result.data);
    applyThemeAttrs(result.data);
    announce(savedMessage);
    renderBody();
  }

  const bodyContainer = document.createElement('div');
  mountEl.appendChild(bodyContainer);

  /**
   * Fills the household slot. Never throws and never blocks the rest of
   * Settings: a household read that fails must not cost you the ability to
   * change the contrast or sign out.
   */
  async function loadHousehold(slot) {
    const result = await getHousehold({ force: true });
    if (controller.signal.aborted) return;
    slot.replaceChildren();

    if (!result.ok) {
      const fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = 'Household';
      const message = document.createElement('p');
      message.className = 'field-hint';
      message.textContent = result.error.message;
      fieldset.append(legend, message);
      slot.appendChild(fieldset);
      return;
    }

    slot.appendChild(buildHouseholdSection({
      household: result.data,
      signal: controller.signal,
      onChanged: () => loadHousehold(slot)
    }));
  }

  function renderBody() {
    bodyContainer.replaceChildren();

    bodyContainer.appendChild(buildToggleGroup({
      legend: 'Theme',
      options: THEME_OPTIONS,
      current: settings.theme || 'default',
      onChange: (value) => saveAndRerender({ theme: value }, 'Theme updated')
    }));

    bodyContainer.appendChild(buildToggleGroup({
      legend: 'Contrast',
      options: CONTRAST_OPTIONS,
      current: settings.contrast_mode || 'standard',
      onChange: (value) => saveAndRerender({ contrast_mode: value }, 'Contrast updated')
    }));

    bodyContainer.appendChild(buildToggleGroup({
      legend: 'Brightness',
      options: BRIGHTNESS_OPTIONS,
      current: settings.brightness_pref || 'standard',
      onChange: (value) => saveAndRerender({ brightness_pref: value }, 'Brightness updated')
    }));

    // Phase 26. Sensory needs vary and a fixed density serves half the
    // audience. The hint says what compact does NOT change, because the
    // fear with any "compact" control is that it will shrink the text.
    const densityGroup = buildToggleGroup({
      legend: 'Spacing',
      options: DENSITY_OPTIONS,
      current: settings.density || 'comfortable',
      onChange: (value) => saveAndRerender({ density: value }, 'Spacing updated')
    });
    const densityHint = document.createElement('p');
    densityHint.className = 'field-hint';
    densityHint.textContent = 'Compact tightens the space between things. '
      + 'Text size and button sizes stay exactly the same.';
    densityGroup.appendChild(densityHint);
    bodyContainer.appendChild(densityGroup);

    bodyContainer.appendChild(buildToggleGroup({
      legend: 'Weight display',
      options: WEIGHT_UNIT_OPTIONS,
      current: settings.weight_unit_display || 'stone_lb',
      onChange: (value) => saveAndRerender({ weight_unit_display: value }, 'Weight display updated')
    }));

    const notifFieldset = document.createElement('fieldset');
    const notifLegend = document.createElement('legend');
    notifLegend.textContent = 'Notifications';
    notifFieldset.appendChild(notifLegend);
    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = 'All off by default. Each reminder is factual, never a nag.';
    notifFieldset.appendChild(hint);

    // Says what is actually true on this device. "Blocked" alone would
    // leave someone stuck, because the setting is not in this app.
    const permHint = document.createElement('p');
    permHint.className = 'field-hint';
    permHint.setAttribute('role', 'status');
    permHint.textContent = describePermission(permissionState());
    notifFieldset.appendChild(permHint);

    const prefs = settings.notification_prefs || {};
    for (const type of NOTIFICATION_TYPES) {
      notifFieldset.appendChild(buildSwitch({
        label: type.label,
        checked: !!prefs[type.key],
        onChange: async (checked) => {
          // Permission is asked HERE — the moment someone opts in — and
          // never on load. A prompt before any benefit has been shown is
          // how an app gets blocked permanently on the first visit.
          if (checked) {
            const state = await requestPermission();
            permHint.textContent = describePermission(state);
            if (state !== 'granted') {
              // Do not save a preference the device cannot honour. A switch
              // that stays on while nothing arrives is the original defect.
              showToast('Your browser did not allow reminders, so this stayed off.');
              renderBody();
              return;
            }
          }
          const nextPrefs = { ...prefs, [type.key]: checked };
          saveAndRerender({ notification_prefs: nextPrefs }, `${type.label} ${checked ? 'enabled' : 'disabled'}`);
        }
      }));
    }
    bodyContainer.appendChild(notifFieldset);

    const dataFieldset = document.createElement('fieldset');
    const dataLegend = document.createElement('legend');
    dataLegend.textContent = 'Your data';
    dataFieldset.appendChild(dataLegend);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn btn-block';
    exportBtn.textContent = 'Export all data (JSON)';
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting…';
      const result = await exportAllData();
      if (result.ok) {
        downloadJson(result.data, `home-os-export-${new Date().toISOString().slice(0, 10)}.json`);
        announce('Data exported');
        showToast('Export downloaded');
      } else {
        console.error('Export failed:', result.error);
        showToast('Export failed — check your connection and try again.');
      }
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export all data (JSON)';
    });
    dataFieldset.appendChild(exportBtn);
    bodyContainer.appendChild(dataFieldset);

    // ---- Household ----
    // A placeholder appended synchronously, filled when the read returns.
    // Appending after the await would put Household BELOW Account on a slow
    // connection and above it on a fast one, which is the kind of layout
    // that makes people think they tapped the wrong thing.
    const householdSlot = document.createElement('div');
    bodyContainer.appendChild(householdSlot);
    loadHousehold(householdSlot);

    // Phase 27. People forget, and re-finding it should not require
    // reinstalling. Offered plainly, never as a prompt to finish something.
    const helpFieldset = document.createElement('fieldset');
    const helpLegend = document.createElement('legend');
    helpLegend.textContent = 'Getting started';
    helpFieldset.appendChild(helpLegend);
    const helpLink = document.createElement('a');
    helpLink.className = 'btn';
    helpLink.href = '#/first-run';
    helpLink.textContent = 'Walk me through it again';
    helpFieldset.appendChild(helpLink);
    const helpHint = document.createElement('p');
    helpHint.className = 'field-hint';
    helpHint.textContent = 'Plans one meal with you, start to finish. Nothing is reset.';
    helpFieldset.appendChild(helpHint);
    bodyContainer.appendChild(helpFieldset);

    const accountFieldset = document.createElement('fieldset');
    const accountLegend = document.createElement('legend');
    accountLegend.textContent = 'Account';
    accountFieldset.appendChild(accountLegend);

    const signOutBtn = document.createElement('button');
    signOutBtn.type = 'button';
    signOutBtn.className = 'btn btn-block';
    signOutBtn.textContent = 'Sign out';
    signOutBtn.addEventListener('click', async () => {
      signOutBtn.disabled = true;
      const result = await signOutUser();
      if (!result.ok) {
        console.error('Sign out failed:', result.error);
        showToast('Could not sign out — check your connection and try again.');
        signOutBtn.disabled = false;
      }
      // On success, app.js's onAuthStateChange listener rebuilds the shell.
    });
    accountFieldset.appendChild(signOutBtn);

    // ---- Change password ----
    // Behind a <details> so the everyday Account view stays a single
    // Sign out button; opening it is a deliberate act, not a stumble.
    const pwDetails = document.createElement('details');
    pwDetails.className = 'custom-amount';
    const pwSummary = document.createElement('summary');
    pwSummary.textContent = 'Change password';
    pwDetails.appendChild(pwSummary);

    const currentF = buildPasswordField({
      id: 'pw-current', label: 'Current password', autocomplete: 'current-password'
    });
    const newF = buildPasswordField({
      id: 'pw-new', label: 'New password', autocomplete: 'new-password',
      hint: 'At least 8 characters. A long phrase you can remember beats a short complicated one.'
    });
    const confirmF = buildPasswordField({
      id: 'pw-confirm', label: 'Confirm new password', autocomplete: 'new-password'
    });
    const pwIntro = document.createElement('p');
    pwIntro.className = 'field-hint';
    pwIntro.textContent = 'If you signed in with a link and have never set a password, leave this and use the reset option below.';
    pwDetails.appendChild(pwIntro);
    pwDetails.append(currentF.wrap, newF.wrap, confirmF.wrap);

    // Always present, but only surfaced once it is actually relevant, so the
    // common path stays a single button.
    const resetRow = document.createElement('div');
    resetRow.hidden = true;
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-block';
    resetBtn.textContent = 'Email me a reset link';
    resetBtn.addEventListener('click', async () => {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Sending…';
      const res = await sendPasswordReset();
      resetBtn.disabled = false;
      resetBtn.textContent = 'Email me a reset link';
      if (!res.ok) {
        console.error('Password reset request failed:', res.error);
        setFieldError(currentF, 'Could not send a reset link. Check your connection and try again.');
        return;
      }
      announce('A reset link is on its way to your email address.');
      showToast('Reset link sent');
    });
    resetRow.appendChild(resetBtn);

    const pwBtn = document.createElement('button');
    pwBtn.type = 'button';
    pwBtn.className = 'btn btn-block';
    pwBtn.textContent = 'Update password';
    pwBtn.addEventListener('click', async () => {
      [currentF, newF, confirmF].forEach(clearFieldError);

      if (!currentF.input.value) {
        setFieldError(currentF, 'Enter your current password.');
        currentF.input.focus();
        return;
      }
      if (newF.input.value.length < 8) {
        setFieldError(newF, 'New password must be at least 8 characters.');
        newF.input.focus();
        return;
      }
      if (newF.input.value !== confirmF.input.value) {
        setFieldError(confirmF, 'The two new passwords do not match.');
        confirmF.input.focus();
        return;
      }

      pwBtn.disabled = true;
      pwBtn.textContent = 'Updating…';
      const result = await changePassword(currentF.input.value, newF.input.value);
      pwBtn.disabled = false;
      pwBtn.textContent = 'Update password';

      if (!result.ok) {
        if (result.code === 'wrong-current') {
          setFieldError(currentF,
            'That current password was not accepted. If you have never set one — for example if you always sign in with a link — use "Email me a reset link" below instead.');
          resetRow.hidden = false;
          currentF.input.focus();
        } else if (result.code === 'too-short') {
          setFieldError(newF, 'New password must be at least 8 characters.');
          newF.input.focus();
        } else if (result.code === 'unchanged') {
          setFieldError(newF, 'New password must be different from the current one.');
          newF.input.focus();
        } else {
          console.error('Password change failed:', result.error);
          setFieldError(newF, 'Could not update the password. Check your connection and try again.');
        }
        announce('Password not changed.');
        return;
      }

      [currentF, newF, confirmF].forEach((f) => { f.input.value = ''; });
      pwDetails.open = false;
      announce('Password updated. Your session stays signed in on this device.');
      showToast('Password updated');
    });

    pwDetails.appendChild(pwBtn);
    pwDetails.appendChild(resetRow);

    accountFieldset.appendChild(pwDetails);

    bodyContainer.appendChild(accountFieldset);

    bodyContainer.appendChild(buildBuildSection());
  }

  // ---- Which build is actually on this device -------------------------
  // Twice now, a bug report has turned out to be an older build still being
  // served: the app updates in the background and there is no way to tell by
  // looking. The active cache name IS the build, so it is stated plainly
  // rather than left to be inferred from whether a feature is present.
  function buildBuildSection() {
    const fieldset = document.createElement('fieldset');

    const legend = document.createElement('legend');
    legend.textContent = 'This device';
    fieldset.appendChild(legend);

    const status = document.createElement('p');
    status.className = 'field-hint';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Checking which version is installed…';
    fieldset.appendChild(status);

    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = 'If an update is not showing, close the app fully and reopen it twice — '
      + 'the first reopen installs the new version, the second uses it.';
    fieldset.appendChild(hint);

    activeBuildName().then((name) => {
      status.textContent = name
        ? `Installed version: ${name}`
        : 'No offline version installed yet. This page is coming straight from the network.';
    });

    return fieldset;
  }

  /** The active shell cache, which is the build identifier. */
  async function activeBuildName() {
    try {
      if (!('caches' in window)) return null;
      const names = await caches.keys();
      const shells = names.filter((n) => n.startsWith('home-os-shell-'));
      // More than one only happens mid-update; the newest is the one that
      // will serve, so report that rather than an arbitrary first entry.
      return shells.sort().pop() || null;
    } catch (err) {
      console.error('Could not read the installed version:', err);
      return null;
    }
  }

  renderBody();

  return () => controller.abort();
}
