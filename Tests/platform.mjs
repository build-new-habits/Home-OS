// Tests/platform.mjs — 05 Sep 2026 v2
// v2: check 9, stylesheet URL agreement between index.html and precache.
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

// ---- 9. Stylesheet URLs must match between index.html and the precache --
// Device test 5 Sep 2026: the phone ran new JavaScript against an old
// stylesheet. Collapsible food rows shipped with their CSS missing, so each
// row rendered as a fat centred default button with the title and summary
// text run together.
//
// The service worker already fetches with { cache: 'reload' }, so its own
// copy was fresh. The stale copy came from the browser's HTTP cache serving
// the <link> itself. The fix is a version query on the href, which makes a
// changed stylesheet a different URL that no cache can satisfy.
//
// That only works while the two lists agree. A stamped <link> and an
// unstamped precache entry means the page requests a URL the service worker
// never cached, and the app breaks offline instead — trading a visible bug
// for an invisible one. So: assert they match, exactly.
{
  const indexHtml = readFileSync(path.join(REPO, 'index.html'), 'utf8');
  const swSrc = readFileSync(path.join(REPO, 'service-worker.js'), 'utf8');

  const linked = [...indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
    .map((m) => m[1]);
  check('index.html links at least one stylesheet', linked.length > 0);

  for (const href of linked) {
    check(`precache contains ${href} exactly as linked`,
      swSrc.includes(`'${href}'`),
      'linked but not precached under that exact URL');
    check(`${href} carries a version query`,
      /\?v=\d+/.test(href),
      'an unversioned stylesheet can be served stale by the HTTP cache');

    // ---- and the version must TRACK THE CONTENT ----------------------
    // This is the check that was missing, and it cost a fortnight of
    // work being invisible on the device.
    //
    // The stamp went on at ?v=88 to defeat the HTTP cache, and was then
    // never bumped again. CACHE_NAME reached v109 while every stylesheet
    // still asked for v88, so the phone kept serving components.css as it
    // stood before the card system, the action bar and the day cards
    // existed. The app shipped new markup against three-week-old CSS and
    // rendered as bare bullet lists.
    //
    // The original check only asserted that index.html and the precache
    // agreed with EACH OTHER. They did — both were stale. Agreement is
    // not freshness.
    //
    // Tying the stamp to CACHE_NAME makes it impossible to ship a
    // stylesheet change without shipping a new URL for it, because the
    // cache name has to move for any release at all.
    const swVersion = (swSrc.match(/home-os-shell-v(\d+)/) || [])[1];
    const hrefVersion = (href.match(/\?v=(\d+)/) || [])[1];
    check(`${href} is stamped with the current cache version`,
      swVersion && hrefVersion === swVersion,
      `stylesheet says v${hrefVersion}, CACHE_NAME says v${swVersion}`);
  }
}

// ---- 10. An unsubscribe that is thrown away ----------------------------
// Device test 5 Sep 2026. app.js called store.subscribe() and discarded the
// unsubscribe function it returns, so every shell rebuild left a listener
// behind holding a detached offline banner. Those listeners kept firing at
// nodes no longer in the document.
//
// This is the shape of leak that survives every functional gate: nothing is
// wrong with one instance, and the tests only ever build one.
for (const f of files) {
  if (f.path === 'js/lib/store.js') continue; // where subscribe is defined
  const lines = f.src.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Prose about subscribe() is not a call to it.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (!/(^|[^\w.])subscribe\(/.test(line)) return;
    const before = line.slice(0, line.indexOf('subscribe(')).trimEnd();
    const retained = /[=:]$/.test(before) || /\breturn$/.test(before);
    check(`${f.path}:${i + 1} keeps the unsubscribe subscribe() returns`,
      retained,
      trimmed.slice(0, 70));
  });
}

// ---- 11. Every migration is accounted for ------------------------------
// Device test 5 Sep 2026: "42703 — column pantry_stock.reorder_at does not
// exist". Migrations 017 and 018 were written, committed, and never run.
// 019 WAS run, so this was not a sequence that stopped — two files were
// skipped and nothing could notice.
//
// These gates have no network and no credentials, deliberately, so none of
// them can ask the database what columns it has. What CAN be checked is
// that somebody looked: every migration in the repo must appear in
// MIGRATIONS_APPLIED.md with a status. That does not prove a migration ran.
// It proves the question was asked, which is the most a repo can honestly
// assert about a database it cannot see.
{
  const ledgerPath = path.join(REPO, 'Docs/Current/MIGRATIONS_APPLIED.md');
  let ledger = '';
  try {
    ledger = readFileSync(ledgerPath, 'utf8');
  } catch {
    // handled by the check below
  }
  check('the migrations ledger exists', ledger.length > 0,
    'Docs/Current/MIGRATIONS_APPLIED.md is missing');

  if (ledger) {
    const migrationsDir = path.join(REPO, 'Docs/Current/migrations');
    let sqlFiles = [];
    try {
      sqlFiles = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql') && !f.includes('_VERIFY'));
    } catch {
      // no migrations directory: nothing to account for
    }
    for (const file of sqlFiles) {
      const name = file.replace(/\.sql$/, '');
      check(`${name} is recorded in the migrations ledger`,
        ledger.includes(name),
        'add a row with its status before committing');
    }
  }
}

// ---- 12. Type and space come from the scale (P1) -----------------------
// One scale, no exceptions. Before this sweep components.css carried seven
// sizes that existed nowhere else: 1.05rem, 1.35rem, 1.4rem — and 0.65rem,
// about ten pixels, which is below anything a person should be asked to
// read and was the label that touched both cell edges at 200% text.
//
// None of them were decisions. They were what looked about right in the
// moment, and enough of them make a screen read as assembled rather than
// designed. Spacing is the same story: the gap between two things is how
// the eye is told whether they are related, and a rhythm with seven
// one-off exceptions is not a rhythm.
//
// Hairlines are allowed. A 1px or 2px border is a physical edge, not a
// step on a spacing scale, and tokenising it would be ceremony.
{
  const SIZED = /(?:^|[\s;{])(font-size|gap|row-gap|column-gap|margin|margin-top|margin-right|margin-bottom|margin-left|padding|padding-top|padding-right|padding-bottom|padding-left)\s*:\s*([^;{}]+)/g;

  for (const f of css) {
    if (f.path === 'css/tokens.css') continue; // where the scale is defined
    const lines = f.src.split('\n');
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      SIZED.lastIndex = 0;
      let m;
      while ((m = SIZED.exec(line)) !== null) {
        const value = m[2];
        for (const raw of value.match(/[0-9.]+(?:px|rem|em)/g) || []) {
          const n = parseFloat(raw);
          // Hairlines, and 0.
          if (raw.endsWith('px') && n <= 2) continue;
          if (n === 0) continue;
          // em is relative to the element's own size — used for the
          // chevron, which must scale with the text it sits beside.
          if (raw.endsWith('em') && !raw.endsWith('rem')) continue;
          check(`${f.path}:${i + 1} sizes from the scale, not ${raw}`,
            false,
            trimmed.slice(0, 72));
        }
      }
    });
  }
}

// ---- 13. Every class the app uses has a rule ---------------------------
// On 7 Sep 2026 a "remove the dead table rules" edit used a regex that
// matched the LAST .plan-table occurrence below it and cut everything in
// between: 2,697 of 3,685 lines of components.css, deleted in one commit.
//
// Twelve gates passed. Every one of them checks structure, behaviour,
// contrast ratios or tokens — none of them looks at whether a class the
// app renders has any styling at all. The app shipped, and the Kitchen hub
// came back as underlined bullet points on a phone.
//
// This is the cheapest possible check for that: if JavaScript puts a class
// on an element, some stylesheet should have a rule for it. It would have
// failed on hundreds of classes the moment that edit landed.
{
  const cssText = css.map((f) => f.src).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const defined = new Set([...cssText.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  // Hooks with no styling of their own: JavaScript and the gates use them
  // to find things. Listed rather than silently tolerated, so that adding
  // to this list is a decision somebody makes on purpose.
  const UNSTYLED = new Set([
    'add-step-form', 'cook-results', 'error-detail', 'exercise-card',
    'food-card', 'ingredient-detail', 'ingredient-text', 'library-body',
    'meal-card', 'meal-picker__more', 'step-editor', 'stock-row',
    'task-card', 'work-card'
  ]);

  const used = new Set();
  for (const f of files) {
    for (const m of f.src.matchAll(/class(?:Name)?[:=]\s*'([^']+)'/g)) {
      for (const c of m[1].split(/\s+/)) if (c) used.add(c);
    }
    for (const m of f.src.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
      for (const c of m[1].matchAll(/'([\w-]+)'/g)) used.add(c[1]);
    }
  }

  const orphans = [...used].filter((c) => !defined.has(c) && !UNSTYLED.has(c)).sort();
  check('every class the app renders has a CSS rule', orphans.length === 0,
    orphans.slice(0, 12).join(', '));
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(`\nPLATFORM GATE FAILED — ${failures.length} of ${checks} checks`);
  process.exit(1);
}
console.log(`PLATFORM GATE PASSED — ${checks} checks across ${files.length} modules and ${css.length} stylesheets`);
