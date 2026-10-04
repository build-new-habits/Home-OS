// js/lib/updates.js — 04 Oct 2026 v1
// v1: new versions reach the phone without "close it and reopen it twice".
//
// Graeme, 4 Oct 2026, four minutes after Clear the list went live: "it is
// not there". The live site had it; his phone was still running the copy
// the service worker had saved. The service worker serves the saved copy
// first and fetches the new one behind it, so a new version only showed on
// the open AFTER next — and an installed app on Android is rarely closed.
//
// Now: whenever the app comes back to the front, it asks for an update;
// when a new version takes over, the page reloads itself if you have not
// started doing anything yet (the first 20 seconds), and otherwise offers a
// Reload button rather than pulling the screen from under you.

import { showToast } from '../components/toast.js';

const QUIET_MS = 20000;
const startedAt = Date.now();
let interacted = false;

export function watchForUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  ['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, () => { interacted = true; }, { once: true, capture: true }));

  const check = () => {
    navigator.serviceWorker.getRegistration().then((reg) => { if (reg) reg.update().catch(() => {}); }).catch(() => {});
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  setTimeout(check, 3000);

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first install is not an update: nothing to reload into.
    if (!hadController || reloading) return;
    if (!interacted && Date.now() - startedAt < QUIET_MS) {
      reloading = true;
      window.location.reload();
      return;
    }
    showToast('A new version of the app is ready.', {
      duration: 60000,
      undo: () => { reloading = true; window.location.reload(); },
      undoLabel: 'Reload'
    });
  });
}
