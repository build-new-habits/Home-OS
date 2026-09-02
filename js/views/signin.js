// js/views/signin.js — 01 Sep 2026 v2
// The unauthenticated entry screen. Extracted whole from app.js's
// buildSignInView() so that auth UI can change without repeatedly editing
// a write-once gating file — app.js now imports and calls this instead.
//
// Three ways in, all of which keep RLS fully intact:
//   1. Password        — the original path, unchanged in behaviour.
//   2. Magic link      — a one-time link by email. No password to remember
//                        or lose. Still a real authenticated session.
//   3. Password reset  — recovery when the password is forgotten. The app
//                        previously had NO reset path at all, which is how
//                        a forgotten password became an unrecoverable
//                        lockout with no route back in.
//
// Note on "Failed to fetch": that error means the request never reached
// Supabase — the project is paused, unreachable, or the URL is wrong. None
// of the three methods here can succeed in that state, because all of them
// are network calls to the same host. Connectivity is a prerequisite, not
// something a different sign-in method routes around.

import { supabase } from '../supabaseClient.js';
import { announce } from '../lib/a11y.js';

const REDIRECT_TO = new URL('./', window.location.href).href;

// NOT the shared el() from lib/dom.js. This one assigns PROPERTIES when
// `k in node`, which is how it sets tabIndex. The shared one always uses
// setAttribute. Left alone in Phase 29 rather than unified.
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

function labelledInput({ id, label, type, autocomplete, required = true }) {
  const wrap = el('div', { class: 'field' });
  const labelEl = el('label', { htmlFor: id, text: label });
  const input = el('input', { type, id, name: id, autocomplete, required });
  wrap.append(labelEl, input);
  return { wrap, input };
}

/**
 * Turns a Supabase auth error into something a person can act on.
 * "Failed to fetch" is the browser's own wording for a network failure and
 * tells the user nothing about what to do, so it is replaced.
 */
function friendlyError(error) {
  const raw = (error && error.message) || '';
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return 'Could not reach the server. This is a connection problem, not a wrong password — '
      + 'check your internet, and check whether the Supabase project is paused.';
  }
  if (/invalid login credentials/i.test(raw)) {
    return 'That email and password combination was not recognised.';
  }
  if (/email not confirmed/i.test(raw)) {
    return 'This account exists but its email address has not been confirmed yet.';
  }
  return raw || 'Sign-in failed. Check your details and try again.';
}

export function buildSignInView() {
  document.body.replaceChildren();

  const wrap = el('div', { class: 'signin-wrap' });
  const h1 = el('h1', { text: 'Home-OS', tabIndex: -1 });

  // Phase 28. This is the first thing anyone ever sees and it said nothing
  // about what the app is for. One plain line, no marketing.
  const strap = el('p', {
    class: 'signin-strap',
    text: 'Meals, shopping, the cupboard and the week — in one place, '
      + 'without having to hold it all in your head.'
  });

  // Single shared status line. role="status" rather than role="alert" so
  // success messages ("check your email") announce as calmly as failures.
  const status = el('p', { class: 'field-error', id: 'signin-status' });
  status.setAttribute('role', 'status');
  status.hidden = true;

  function setStatus(message, isError = true) {
    status.textContent = message;
    status.className = isError ? 'field-error' : 'field-hint';
    status.hidden = false;
    announce(message);
  }
  function clearStatus() {
    status.hidden = true;
    status.textContent = '';
  }

  // ---- Password sign-in (default) ----
  const form = el('form', { noValidate: true });
  const email = labelledInput({
    id: 'signin-email', label: 'Email', type: 'email', autocomplete: 'username'
  });
  const pass = labelledInput({
    id: 'signin-password', label: 'Password', type: 'password', autocomplete: 'current-password'
  });
  const submitBtn = el('button', {
    type: 'submit', class: 'btn btn-primary btn-block', text: 'Sign in'
  });
  form.append(email.wrap, pass.wrap, status, submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatus();
    if (!email.input.value.trim()) {
      setStatus('Enter your email address.');
      email.input.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';
    const { error } = await supabase.auth.signInWithPassword({
      email: email.input.value.trim(),
      password: pass.input.value
    });
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
    if (error) setStatus(friendlyError(error));
    // On success, app.js's onAuthStateChange rebuilds the shell.
  });

  // ---- Magic link ----
  const magicDetails = el('details', { class: 'custom-amount' });
  magicDetails.appendChild(el('summary', { text: 'Email me a sign-in link instead' }));
  magicDetails.appendChild(el('p', {
    class: 'field-hint',
    text: 'We send a one-time link to your email address. Opening it signs you in on this device — no password needed.'
  }));
  const magicBtn = el('button', {
    type: 'button', class: 'btn btn-block', text: 'Send me a sign-in link'
  });
  magicBtn.addEventListener('click', async () => {
    clearStatus();
    const address = email.input.value.trim();
    if (!address) {
      setStatus('Enter your email address above first, then request the link.');
      email.input.focus();
      return;
    }
    magicBtn.disabled = true;
    magicBtn.textContent = 'Sending…';
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: REDIRECT_TO }
    });
    magicBtn.disabled = false;
    magicBtn.textContent = 'Send me a sign-in link';
    if (error) {
      setStatus(friendlyError(error));
      return;
    }
    setStatus(`If an account exists for ${address}, a sign-in link is on its way. The link expires after a short time.`, false);
  });
  magicDetails.appendChild(magicBtn);

  // ---- Password reset ----
  const resetDetails = el('details', { class: 'custom-amount' });
  resetDetails.appendChild(el('summary', { text: 'I have forgotten my password' }));
  resetDetails.appendChild(el('p', {
    class: 'field-hint',
    text: 'We send a reset link to your email address. Opening it lets you set a new password.'
  }));
  const resetBtn = el('button', {
    type: 'button', class: 'btn btn-block', text: 'Send a password reset link'
  });
  resetBtn.addEventListener('click', async () => {
    clearStatus();
    const address = email.input.value.trim();
    if (!address) {
      setStatus('Enter your email address above first, then request the reset.');
      email.input.focus();
      return;
    }
    resetBtn.disabled = true;
    resetBtn.textContent = 'Sending…';
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: REDIRECT_TO
    });
    resetBtn.disabled = false;
    resetBtn.textContent = 'Send a password reset link';
    if (error) {
      setStatus(friendlyError(error));
      return;
    }
    setStatus(`If an account exists for ${address}, a reset link is on its way.`, false);
  });
  resetDetails.appendChild(resetBtn);

  wrap.append(h1, strap, form, magicDetails, resetDetails);
  document.body.appendChild(wrap);
  h1.focus();
}

/**
 * After a recovery link is opened, Supabase puts the browser into a
 * PASSWORD_RECOVERY state. This renders the set-a-new-password screen.
 * app.js calls it from onAuthStateChange.
 */
export function buildSetPasswordView() {
  document.body.replaceChildren();

  const wrap = el('div', { class: 'signin-wrap' });
  const h1 = el('h1', { text: 'Set a new password', tabIndex: -1 });

  const status = el('p', { class: 'field-error', id: 'setpw-status' });
  status.setAttribute('role', 'status');
  status.hidden = true;

  const newPw = labelledInput({
    id: 'setpw-new', label: 'New password', type: 'password', autocomplete: 'new-password'
  });
  newPw.wrap.appendChild(el('p', {
    class: 'field-hint',
    text: 'At least 8 characters. A long phrase you can remember beats a short complicated one.'
  }));
  const confirmPw = labelledInput({
    id: 'setpw-confirm', label: 'Confirm new password', type: 'password', autocomplete: 'new-password'
  });

  const btn = el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: 'Save new password' });
  const form = el('form', { noValidate: true });
  form.append(newPw.wrap, confirmPw.wrap, status, btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;
    if (newPw.input.value.length < 8) {
      status.className = 'field-error';
      status.textContent = 'New password must be at least 8 characters.';
      status.hidden = false;
      announce(status.textContent);
      newPw.input.focus();
      return;
    }
    if (newPw.input.value !== confirmPw.input.value) {
      status.className = 'field-error';
      status.textContent = 'The two passwords do not match.';
      status.hidden = false;
      announce(status.textContent);
      confirmPw.input.focus();
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const { error } = await supabase.auth.updateUser({ password: newPw.input.value });
    btn.disabled = false;
    btn.textContent = 'Save new password';
    if (error) {
      status.className = 'field-error';
      status.textContent = friendlyError(error);
      status.hidden = false;
      announce(status.textContent);
      return;
    }
    announce('Password updated. Signing you in.');
    // The recovery session is already valid, so app.js's auth listener
    // takes it from here.
  });

  wrap.append(h1, form);
  document.body.appendChild(wrap);
  h1.focus();
}
