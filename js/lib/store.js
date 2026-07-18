// js/lib/store.js — 14 Jul 2026 v1
// Tiny in-memory store for session + user_settings state, with a
// subscribe/notify pattern. No framework — plain JS.

const state = {
  session: null,       // Supabase session object, or null when signed out
  settings: null,       // the single user_settings row, or null until loaded
  online: navigator.onLine
};

const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(state);
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSession(session) {
  state.session = session;
  notify();
}

export function setSettings(settings) {
  state.settings = settings;
  notify();
}

export function setOnline(online) {
  state.online = online;
  notify();
}

window.addEventListener('online', () => setOnline(true));
window.addEventListener('offline', () => setOnline(false));
