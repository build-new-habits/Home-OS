// js/views/settings.js — 17 Aug 2026 v3
// v3: adds a Change password form under Account. Requested out-of-band
// during the Phase 5 session; logged in PHASE5_HANDOFF.md.
import { upsertSettings, exportAllData, downloadJson, signOutUser, changePassword } from '../data/settings.js';
import { announce } from '../lib/a11y.js';
import { showToast } from '../components/toast.js';
import { getState, setSettings } from '../lib/store.js';

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
const WEIGHT_UNIT_OPTIONS = [
  { value: 'stone_lb', label: 'Stone & lb' },
  { value: 'kg', label: 'Kilograms' }
];
const NOTIFICATION_TYPES = [
  { key: 'water_reminder', label: 'Water check-in' },
  { key: 'chore_due', label: 'Chore due' },
  { key: 'exercise_day', label: 'Exercise day' },
  { key: 'shopping_list_ready', label: 'Shopping list ready' }
];

function applyThemeAttrs(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme || 'default');
  root.setAttribute('data-contrast', settings.contrast_mode || 'standard');
  root.setAttribute('data-brightness', settings.brightness_pref || 'standard');
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

export function render(mountEl) {
  const controller = new AbortController();
  let settings = getState().settings || {
    theme: 'default',
    contrast_mode: 'standard',
    brightness_pref: 'standard',
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

    const prefs = settings.notification_prefs || {};
    for (const type of NOTIFICATION_TYPES) {
      notifFieldset.appendChild(buildSwitch({
        label: type.label,
        checked: !!prefs[type.key],
        onChange: (checked) => {
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
    pwDetails.append(currentF.wrap, newF.wrap, confirmF.wrap);

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
          setFieldError(currentF, 'That is not your current password.');
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
    accountFieldset.appendChild(pwDetails);

    bodyContainer.appendChild(accountFieldset);
  }

  renderBody();

  return () => controller.abort();
}
