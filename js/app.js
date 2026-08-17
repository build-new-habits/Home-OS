// js/app.js — 17 Aug 2026 v4
// WRITE-ONCE RULE AMENDED (17 Aug 2026, architect decision). This file was
// declared write-once in Phase 2, but it also owned the entire sign-in UI —
// so every change to authentication forced an edit here anyway. Rather than
// keep breaking the rule, the auth UI is extracted to views/signin.js and
// app.js keeps only the auth *state machine*. The rule now reads: app.js
// owns bootstrap and auth state; auth UI lives in views/signin.js.
//
// v4: sign-in UI extracted; PASSWORD_RECOVERY handled so a reset link lands
// on a set-new-password screen instead of a shell the user cannot use.
// Single entry point. Boots the app: checks the session, loads settings,
// applies theme, starts the router. Write-once — later phases do not
// edit this file; they add view files that routes.js already points at.

import { supabase } from './supabaseClient.js';
import { getSettings } from './data/settings.js';
import { startRouter, navigate } from './router.js';
import { mountBottomNav } from './components/bottomNav.js';
import { mountLiveRegion } from './components/liveRegion.js';
import { setSession, setSettings, subscribe, getState } from './lib/store.js';
import { buildSignInView, buildSetPasswordView } from './views/signin.js';

let bottomNavHandle = null;
let hasBootstrapped = false; // guards against Supabase firing a duplicate
// SIGNED_IN event alongside the initial getSession() check on page load —
// without this, buildAppShell() (and startRouter()) can run twice for one
// real login, racing two renders into the same mount point.

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

async function bootAuthedShell() {
  const result = await getSettings();
  if (!result.ok) {
    console.error('Failed to load settings:', result.error);
  }
  const settings = result.ok ? result.data : null;
  setSettings(settings);
  applyTheme(settings);
  buildAppShell();
  hasBootstrapped = true;
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
    if (event === 'PASSWORD_RECOVERY') {
      // Arrived via a reset link. Supabase has already established a
      // recovery session, so SIGNED_IN may fire alongside this — mark the
      // shell as built so it does not race in underneath the form.
      hasBootstrapped = true;
      buildSetPasswordView();
      return;
    }
    if (event === 'USER_UPDATED' && session) {
      // Password just set via recovery: now boot the real shell.
      hasBootstrapped = false;
      await bootAuthedShell();
      navigate('dashboard');
      return;
    }
    if (event === 'SIGNED_IN' && session) {
      if (hasBootstrapped) return; // already built for this session — Supabase
      // can fire SIGNED_IN a second time on page load alongside the initial
      // getSession() check; treat that as a no-op rather than rebuilding.
      await bootAuthedShell();
      navigate('dashboard');
    } else if (event === 'SIGNED_OUT') {
      hasBootstrapped = false;
      buildSignInView();
    }
  });
}

init();
