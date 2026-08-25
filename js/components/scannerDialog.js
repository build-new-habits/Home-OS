// js/components/scannerDialog.js — 21 Aug 2026 v1
// The barcode scanner modal, extracted from views/meals.js so the pantry can
// use it too. Scanning a shelf is the fastest way to capture a cupboard, and
// duplicating a focus-trapped camera dialog to get it would have been the
// wrong kind of quick.
//
// ---- The video is aria-hidden, deliberately ----
// A viewfinder conveys nothing without sight. The role="status" line beneath
// it carries the entire state — starting, scanning, found, failed — so the
// dialog is fully usable by ear. Every caller must offer a manual route as
// well; scanning is an accelerator, never the only way in.
//
// ---- Camera lifetime ----
// openScanner() owns the camera from the moment it opens until its promise
// settles, and releases it on EVERY path: found, cancelled, Escape, error,
// or the caller navigating away and calling the returned abort().

import { scan } from '../lib/barcode.js';

let openCount = 0;

/**
 * Opens the scanner and resolves once with the outcome.
 *
 * Never rejects — every failure is an ordinary result the caller can handle
 * in one place, the same contract as lib/barcode.js scan().
 *
 * @param {{ title?: string }} [options]
 * @returns {{ result: Promise<object>, abort: () => void }}
 *   `abort()` is for a view being torn down mid-scan; it releases the camera
 *   and resolves the promise as cancelled.
 */
export function openScanner({ title = 'Scan a barcode' } = {}) {
  const previouslyFocused = document.activeElement;
  const controller = new AbortController();

  // Ids must be unique if a second dialog ever opens over a first.
  openCount += 1;
  const idBase = `scanner-${openCount}`;

  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'dialog scanner-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', `${idBase}-title`);
  dialog.setAttribute('aria-describedby', `${idBase}-status`);

  const heading = document.createElement('h2');
  heading.id = `${idBase}-title`;
  heading.textContent = title;

  const video = document.createElement('video');
  video.className = 'scanner-video';
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('playsinline', '');
  video.muted = true;

  const status = document.createElement('p');
  status.className = 'scanner-status';
  status.id = `${idBase}-status`;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Starting the camera.';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-block';
  cancelBtn.textContent = 'Cancel';

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  actions.appendChild(cancelBtn);

  dialog.append(heading, video, status, actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      controller.abort();
      return;
    }
    if (event.key === 'Tab') {
      // Cancel is the only control here, so focus simply stays on it.
      event.preventDefault();
      cancelBtn.focus();
    }
  }

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  cancelBtn.addEventListener('click', () => controller.abort());
  document.addEventListener('keydown', onKeydown, true);
  cancelBtn.focus();

  const result = scan({
    videoEl: video,
    signal: controller.signal,
    onStatus: (text) => { status.textContent = text; }
  }).then((outcome) => {
    close();
    return outcome;
  }).catch((err) => {
    // scan() is written never to reject; this is belt and braces so a future
    // change cannot leave the dialog stuck on screen with the camera live.
    console.error('Scanner failed unexpectedly:', err);
    close();
    return { ok: false, reason: 'error', error: err };
  });

  return { result, abort: () => controller.abort() };
}

/**
 * Plain-English copy for a failed scan, so every caller says the same thing.
 *
 * A refusal is a NORMAL ANSWER, not an error: no scolding, and nothing here
 * re-prompts. The caller falls back to its manual form.
 */
export function describeScanFailure(reason) {
  switch (reason) {
    case 'cancelled':
      return 'Scanning cancelled.';
    case 'permission-denied':
      return 'The camera is switched off for this site. You can turn it back on in your '
        + 'browser settings, or add it by hand — the form does everything the scanner does.';
    case 'no-camera':
      return 'No camera was available, so here is the form instead.';
    case 'unsupported':
      return 'This browser cannot use the camera, so add it by hand below.';
    default:
      return 'The scanner could not run, so here is the form instead.';
  }
}
