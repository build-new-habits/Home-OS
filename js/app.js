// js/app.js — 18 Jul 2026 v2
// Single entry point. Boots the app: checks the session, loads settings,
// applies theme, starts the router. Write-once — later phases do not
// edit this file; they add view files that routes.js already points at.

import { supabase } from './supabaseClient.js';
import { getSettings } from './data/settings.js';
import { startRouter, navigate } from './router.js';
import { mountBottomNav } from './components/bottomNav.js';
import { mountLiveRegion } from './components/liveRegion.js';
import { announce } from './lib/a11y.js';
import { setSession, setSettings, subscribe, getState } from './lib/store.js';

let bottomNavHandle = null;

function applyTheme(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings?.theme || 'default');
  root.setAttribute('data-contrast', settings?.contrast_mode || 'standard');
  root.setAttribute('data-brightness', settings?.brightness_pref || 'standard');
}

function buildAppShell() {
  document.body.replaceChildren();

  mountLiveRegion(document.body);

  const offlineBanner = document.createElement('div');
  offlineBanner.className = 'offline-banner';
  offlineBanner.hidden = true;
  offlineBanner.textContent = "You're offline — daily screens still work and will sync later.";
  document.body.appendChild(offlineBanner);

  const skipLink = document.createElement('a');
  skipLink.href = '#app-main';
  skipLink.className = 'visually-hidden skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.appendChild(skipLink);

  const shell = document.createElement('div');
  shell.id = 'app-shell';
  shell.setAttribute('data-has-bottom-nav', 'true');

  const main = document.createElement('main');
  main.id = 'app-main';
  main.setAttribute('tabindex', '-1');

  shell.appendChild(main);
  document.body.appendChild(shell);

  bottomNavHandle = mountBottomNav(shell);

  subscribe((state) => {
    offlineBanner.hidden = state.online;
  });

  startRouter(main, (path) => {
    if (bottomNavHandle) bottomNavHandle.setActive(path);
  });
}

function buildSignInView() {
  document.body.replaceChildren();
  mountLiveRegion(document.body);

  const wrap = document.createElement('div');
  wrap.className = 'signin-wrap';

  const h1 = document.createElement('h1');
  h1.textContent = 'Sign in to Home-OS';
  h1.tabIndex = -1;

  const form = document.createElement('form');
  form.noValidate = true;

  const emailField = document.createElement('div');
  emailField.className = 'field';
  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'signin-email';
  emailLabel.textContent = 'Email';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'signin-email';
  emailInput.name = 'email';
  emailInput.autocomplete = 'username';
  emailInput.required = true;
  emailField.append(emailLabel, emailInput);

  const passField = document.createElement('div');
  passField.className = 'field';
  const passLabel = document.createElement('label');
  passLabel.htmlFor = 'signin-password';
  passLabel.textContent = 'Password';
  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.id = 'signin-password';
  passInput.name = 'password';
  passInput.autocomplete = 'current-password';
  passInput.required = true;
  passField.append(passLabel, passInput);

  const errorEl = document.createElement('p');
  errorEl.className = 'field-error';
  errorEl.id = 'signin-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.hidden = true;

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Sign in';

  form.append(emailField, passField, errorEl, submitBtn);
  wrap.append(h1, form);
  document.body.appendChild(wrap);
  h1.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passInput.value
    });

    if (error) {
      errorEl.textContent = error.message || 'Sign-in failed. Check your details and try again.';
      errorEl.hidden = false;
      announce(errorEl.textContent);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
    // On success, onAuthStateChange below rebuilds the shell.
  });
}

async function bootAuthedShell() {
  const result = await getSettings();
  if (!result.ok) {
    console.error('Failed to load settings:', result.error);
  }
  const settings = result.ok ? result.data : null;
  setSettings(settings);
  applyTheme(settings);
  buildAppShell();
}

async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }

  const { data: { session } } = await supabase.auth.getSession();
  setSession(session);

  if (session) {
    await bootAuthedShell();
  } else {
    buildSignInView();
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    setSession(session);
    if (event === 'SIGNED_IN' && session) {
      await bootAuthedShell();
      navigate('dashboard');
    } else if (event === 'SIGNED_OUT') {
      buildSignInView();
    }
  });
}

init();
