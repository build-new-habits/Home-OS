// js/lib/notify.js — 01 Sep 2026 v2
// v2: delivery goes through the service worker. See notify() — the v1
// constructor does not work on Android at all.
// Phase 32. Notifications that actually arrive.
//
// ---- The defect ----
// Settings has had a Notifications section since Phase 2, with four
// switches. Nothing was behind any of them. A user reads a control that
// does nothing as BROKEN, not as unbuilt — and they are right to.
//
// ---- What this is not ----
// This is not a re-engagement engine. The fastest way to lose this audience
// is to become another app that buzzes. Every notification here is a fact
// that was going to be true anyway: your bread goes off tomorrow, your list
// is ready. None of them are "we miss you".
//
// ---- The rules ----
// 1. Everything off by default. schema.md already says so; this honours it.
// 2. Permission is asked at the moment someone turns a switch ON, never on
//    load. A permission prompt before you have asked for anything is how
//    people press Block forever.
// 3. Nothing fires twice for the same thing on the same day.
// 4. If the browser cannot deliver, the UI says so instead of showing
//    controls that lie.
// 5. Wording is a statement of fact, never a nag and never a streak.

const SENT_KEY = 'home-os:notified';

/** Can this browser deliver at all? Feature-detected, no polyfill. */
export function notificationsSupported() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && typeof window.Notification === 'function';
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function permissionState() {
  if (!notificationsSupported()) return 'unsupported';
  return window.Notification.permission;
}

/**
 * Asks for permission, and ONLY when someone has just switched something on.
 *
 * Called on load it would be a prompt before any benefit had been shown,
 * which is how an app gets blocked permanently on the first visit.
 */
export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (window.Notification.permission !== 'default') return window.Notification.permission;
  try {
    return await window.Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Plain-language state, for a hint under the switches.
 *
 * Says what is true and what to do about it. "Notifications blocked" alone
 * leaves someone stuck, because the setting is not in this app.
 */
/**
 * When reminders actually arrive — stated, not left to be discovered.
 *
 * ---- Why this text exists ----
 * From the Round 1 re-trace, Tom (autistic, lives alone, daily user):
 *
 *   "So it tells me things I'd have seen anyway. That's not a reminder,
 *    that's a label."
 *
 * He wanted a 5pm prompt. **A web app cannot schedule one without a push
 * server**, and a push server is a per-user running cost — the same
 * argument that parked Phase 17.
 *
 * So the honest move is to say so plainly, in the place where somebody is
 * deciding whether to switch it on. An expectation that is set is not a
 * disappointment. An expectation that is discovered is.
 */
export function describeDelivery() {
  return 'Reminders appear when you open the app, not at a set time. '
    + 'Scheduling them for a particular hour needs a server, which this app '
    + 'deliberately does not have.';
}

export function describePermission(state) {
  switch (state) {
    case 'granted': return 'Reminders will appear on this device.';
    case 'denied':
      return 'Your browser is blocking notifications for this site. '
        + 'You can change that in your browser settings — these switches '
        + 'will stay off until you do.';
    case 'unsupported':
      return 'This browser cannot show reminders. Everything else still works.';
    default:
      return 'Turning one on will ask your browser for permission first.';
  }
}

// ---- Once per day, per thing ------------------------------------------
// A use-by warning that fires on every page load is not a reminder, it is a
// pest. Held in localStorage: it is device state, and it must survive with
// no network.

function readSent() {
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSent(map) {
  try { window.localStorage.setItem(SENT_KEY, JSON.stringify(map)); } catch { /* full store */ }
}

/** True if this exact thing has already been sent today. */
export function alreadySent(key, todayISO) {
  return readSent()[key] === todayISO;
}

export function markSent(key, todayISO) {
  const map = readSent();
  map[key] = todayISO;
  // Drop anything not from today, so the store cannot grow forever.
  for (const [k, v] of Object.entries(map)) {
    if (v !== todayISO && k !== key) delete map[k];
  }
  writeSent(map);
}

/**
 * Sends one notification, if permitted and not already sent today.
 *
 * @returns {'sent'|'duplicate'|'denied'|'unsupported'|'off'}
 */
export async function notify({ key, title, body, prefs = {}, prefKey, todayISO }) {
  if (prefKey && !prefs[prefKey]) return 'off';
  if (!notificationsSupported()) return 'unsupported';
  if (window.Notification.permission !== 'granted') return 'denied';
  if (alreadySent(key, todayISO)) return 'duplicate';

  const options = { body, tag: key, silent: false, badge: './icons/icon-192.png' };

  // ---- Service worker first, and this is not a preference ----
  // Chrome on Android REFUSES `new Notification()` outright — it throws
  // "Illegal constructor" — and every notification must go through
  // ServiceWorkerRegistration.showNotification().
  //
  // v1 of this file used the constructor, so Phase 32 delivered nothing at
  // all on Android. It failed into a catch and returned 'denied', which
  // means the switches looked fine and nothing ever arrived — the exact
  // defect Phase 32 existed to fix, reintroduced by the delivery mechanism.
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        markSent(key, todayISO);
        return 'sent';
      }
    }
  } catch (error) {
    console.error('Service worker notification failed:', error);
  }

  // Desktop browsers with no registration. Kept as a fallback, never as
  // the first choice.
  try {
    // eslint-disable-next-line no-new
    new window.Notification(title, options);
    markSent(key, todayISO);
    return 'sent';
  } catch {
    return 'denied';
  }
}

// ---- What we actually have to say --------------------------------------
// Two to begin with. More only after these have been lived with.

/**
 * Anything past its best or going soon.
 *
 * States the fact and stops. No "don't waste food", no guilt — throwing
 * something away is not a moral failure and the app does not get a view.
 */
export function useSoonMessage(items = []) {
  if (items.length === 0) return null;
  const names = items.slice(0, 3).map((i) => (i.name || 'something').toLowerCase());
  const more = items.length - names.length;
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return {
    title: 'Use soon',
    body: more > 0
      ? `${list}, and ${more} more.`
      : `${list}.`
  };
}

/** The list is ready. A fact, and one you asked to be told. */
export function shoppingReadyMessage(count) {
  if (!count || count < 1) return null;
  return {
    title: 'Shopping list ready',
    body: `${count} thing${count === 1 ? '' : 's'} to buy from this week's plan.`
  };
}
