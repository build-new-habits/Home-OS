// Tests/platform.mjs — 01 Sep 2026 v1
// Gate 9. The bugs that only appear on a real phone.
//
// ---- Why this exists ----
// Phase 32 shipped notifications that delivered NOTHING on Android.
// `new Notification()` throws "Illegal constructor" on Chrome for Android;
// the call sat inside a try/catch, so it failed silently and the switches
// looked fine.
//
// All eight gates passed before and after. Every one of them runs in node
// or jsdom, and neither is a phone. The user would have found it.
//
// This gate cannot run on a device. What it CAN do is codify the specific
// ways browsers on devices differ from jsdom, so a known trap is caught by
// pattern rather than by somebody's memory.
//
// ---- The rule for adding to this file ----
// Every hazard must be something that ACTUALLY BROKE, or is documented as
// broken on a real platform. Not style, not preference. A gate full of
// opinions is a gate people learn to route around, and the moment anyone
// adds an `eslint-disable`-shaped exception to shut it up, it is dead.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const REPO = process.env.GATE_REPO || process.cwd();
const failures = [];
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

/** Every .js under js/, minus vendored code we do not control. */
function jsFiles(dir = path.join(REPO, 'js'), out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'vendor') continue;
      jsFiles(full, out);
      continue;
    }
    if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = jsFiles().map((f) => ({ path: path.relative(REPO, f), src: readFileSync(f, 'utf8') }));
const css = readdirSync(path.join(REPO, 'css'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ path: `css/${f}`, src: readFileSync(path.join(REPO, 'css', f), 'utf8') }));

/** Strips line and block comments, so a hazard NAMED in a comment is not a hit. */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function scan(label, pattern, { allow = [], detail = '' } = {}) {
  const hits = [];
  for (const file of files) {
    if (allow.includes(file.path)) continue;
    if (pattern.test(code(file.src))) hits.push(file.path);
  }
  check(label, hits.length === 0, hits.length ? `${hits.join(', ')}${detail ? ` — ${detail}` : ''}` : '');
}

// ---- 1. Notifications ---------------------------------------------------
// The one that shipped. Chrome for Android throws on the constructor.
scan('no `new Notification()` outside the documented desktop fallback',
  /new\s+(window\.)?Notification\s*\(/,
  { allow: ['js/lib/notify.js'],
    detail: 'Android requires registration.showNotification()' });

check('notify.js reaches for the service worker first',
  (() => {
    const src = code(files.find((f) => f.path === 'js/lib/notify.js').src);
    const sw = src.indexOf('showNotification');
    const ctor = src.indexOf('new window.Notification');
    return sw !== -1 && (ctor === -1 || sw < ctor);
  })(),
  'the constructor must only ever be a fallback');

check('tapping a notification focuses the app',
  /notificationclick/.test(readFileSync(path.join(REPO, 'service-worker.js'), 'utf8')),
  'without it Android opens a new window and loses your place');

// ---- 2. Blocking dialogs ------------------------------------------------
// alert/confirm/prompt are ignored inside installed PWAs on some platforms
// and block the main thread everywhere. The app has confirmDialog and
// showToast for exactly this.
scan('no alert(), confirm() or prompt()',
  /(?<![.\w])(alert|confirm|prompt)\s*\(/,
  { detail: 'use confirmDialog() or showToast()' });

// ---- 3. Hover as the only way in ---------------------------------------
// There is no hover on a touchscreen. A handler with no click beside it is
// a control a phone cannot reach.
for (const file of files) {
  const src = code(file.src);
  const hoverOnly = /addEventListener\(\s*['"](mouseover|mouseenter|dblclick)['"]/.test(src)
    && !/addEventListener\(\s*['"]click['"]/.test(src);
  check(`${file.path}: no hover-only or double-tap-only controls`, !hoverOnly,
    'a touchscreen has neither');
}

// ---- 4. Viewport units ---------------------------------------------------
// `height: 100vh` is taller than the visible area on mobile browsers with
// dynamic toolbars, so a "full screen" panel hides its own buttons under
// the URL bar. Cook Mode is exactly that shape.
//
// `min-height: 100vh` is NOT the same hazard and is deliberately allowed:
// content can still grow and scroll, so nothing is hidden. Flagging it
// would be the gate having an opinion rather than catching a break.
for (const sheet of css) {
  const bare = /(?<!min-)(?<!max-)height:\s*100vh/.test(
    sheet.src.replace(/\/\*[\s\S]*?\*\//g, ' '));
  check(`${sheet.path}: no fixed 100vh height`, !bare,
    'use 100dvh or inset:0 — 100vh hides content under the mobile toolbar');
}

// ---- 5. Feature detection ------------------------------------------------
// Anything not on every browser must be checked before it is called, or an
// older phone gets a blank screen instead of a missing feature.
const MUST_DETECT = [
  ['navigator.wakeLock', /navigator\.wakeLock/],
  ['navigator.vibrate', /navigator\.vibrate/],
  ['navigator.share', /navigator\.share/],
  ['BarcodeDetector', /\bBarcodeDetector\b/]
];
for (const [name, pattern] of MUST_DETECT) {
  for (const file of files) {
    const src = code(file.src);
    if (!pattern.test(src)) continue;
    const guarded = new RegExp(
      `(typeof\\s+)?${name.replace('.', '\\.')}\\s*(&&|\\?|!==|===|in\\s)|['"]${name.split('.').pop()}['"]\\s*in\\s`
    ).test(src);
    check(`${file.path}: ${name} is feature-detected`, guarded,
      'calling it unguarded is a blank screen on an older phone');
  }
}

// ---- 6. Permission prompts on load --------------------------------------
// A prompt before any benefit has been shown is how an app gets blocked
// forever on the first visit. It must follow a deliberate action.
for (const file of files) {
  const src = code(file.src);
  if (!/requestPermission\s*\(/.test(src)) continue;
  const insideHandler = /addEventListener\([\s\S]*requestPermission|onChange[\s\S]*requestPermission|async\s*\([^)]*\)\s*=>\s*\{[\s\S]*requestPermission/.test(src);
  check(`${file.path}: permission is requested from a handler, not on load`,
    insideHandler || file.path === 'js/lib/notify.js',
    'asking before showing any benefit gets you blocked permanently');
}

// ---- 7. Randomness that matters -----------------------------------------
// An invite code from Math.random is a guessable invite, which is a
// stranger in your shopping list.
// Scoped to files that actually mint something secret. Math.random for a
// DOM id is fine and flagging it would train people to ignore this gate —
// which is how a gate dies.
for (const file of files) {
  const src = code(file.src);
  const mintsSecrets = /(invite|redeem|token|secret)/i.test(src)
    && /(generateCode|generateToken|generateSecret)/.test(src);
  const weak = /Math\.random\s*\(/.test(src);
  check(`${file.path}: no Math.random where a value must be unguessable`,
    !(mintsSecrets && weak),
    'use crypto.getRandomValues');
}

// ---- 8. Fixed pixel tap targets -----------------------------------------
// The threshold is 24px, not 44px, because 24x24 is what WCAG 2.5.8
// requires at AA — which is the level this app claims. 44x44 is 2.5.5 at
// AAA and remains the aspiration, expressed through --tap-min.
//
// Gating at 44 would fail `.btn-small` at 36px, which carries a written
// justification above it. A gate that overrules a documented decision is a
// gate that gets argued with rather than fixed.
const MIN_TARGET_PX = 24;
for (const sheet of css) {
  const bad = [...sheet.src.matchAll(/(min-height|height):\s*(\d+)px/g)]
    .filter((m) => Number(m[2]) > 0 && Number(m[2]) < MIN_TARGET_PX)
    .map((m) => m[0]);
  // Icons and rules legitimately have small fixed sizes; only flag rules
  // that also look interactive.
  //
  // Native checkboxes and radios are exempt, and this is the pattern rather
  // than an excuse: the box is drawn at 20px but the TARGET is the whole
  // row, which carries min-height 44px and a clickable label. Sizing the
  // box itself to 44px would make it enormous and would not change what is
  // tappable.
  const interactive = bad.filter((decl) => {
    const at = sheet.src.indexOf(decl);
    const block = sheet.src.slice(Math.max(0, at - 400), at);
    const looksInteractive = /(button|\.btn|input|select|\[role="button"\])[^{}]*\{[^{}]*$/.test(block);
    const isNativeToggle = /input\[type="(checkbox|radio)"\][^{}]*\{[^{}]*$/.test(block);
    return looksInteractive && !isNativeToggle;
  });
  check(`${sheet.path}: no interactive control under ${MIN_TARGET_PX}px`,
    interactive.length === 0, interactive.join(', '));
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(`\nPLATFORM GATE FAILED — ${failures.length} of ${checks} checks`);
  process.exit(1);
}
console.log(`PLATFORM GATE PASSED — ${checks} checks across ${files.length} modules and ${css.length} stylesheets`);
