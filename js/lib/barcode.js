// js/lib/barcode.js — 21 Aug 2026 v1
// Barcode scanning behind ONE interface. Nothing else in the app knows or
// cares which engine ran.
//
// Two engines:
//   1. BarcodeDetector — native, in Chrome/Android, the primary target.
//   2. js/vendor/zxing-upcean.js — vendored fallback, dynamically imported
//      so its 58 KB is never parsed on a device that has the native API.
//      Precached like any other shell file; no CDN at runtime.
//
// Neither available, or the camera refused → the caller falls back to the
// manual form. Scanning is an accelerator, never the only route in, and
// scan() reports refusal as an ordinary outcome rather than an error.
//
// CAMERA PERMISSION IS A HARD BOUNDARY. getUserMedia() is called only from
// inside scan(), which a view calls only from a tap handler. Nothing here
// runs on view load, and a refusal is returned once and never re-prompted
// by this module.
//
// ---- Why normalisation lives here ----
// The two engines disagree about UPC-A. Verified against the vendored
// bundle in Node: a UPC-A symbol decodes to TWELVE digits ('123456789050'),
// not the thirteen-digit EAN-13 form ('0123456789050') that Open Food Facts
// and our own foods table key on. BarcodeDetector does the same. Left
// unnormalised, the same tin of beans scanned twice on two devices would
// produce two different strings and therefore two rows.
//
// So every barcode leaving this module is normalised to its EAN-13 form
// where one exists, and callers get candidates() for the lookup fallback.

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

// zxing's BarcodeFormat enum values for the formats this bundle can read.
const ZXING_FORMAT_NAMES = {
  7: 'ean_13',
  6: 'ean_8',
  14: 'upc_a',
  15: 'upc_e'
};

/** Frame interval. 8fps is plenty for a held-still phone and spares the battery. */
const FRAME_INTERVAL_MS = 125;

/** Longest edge the fallback engine rasterises to. Above this it is slow for no gain. */
const MAX_DECODE_EDGE = 1024;

/**
 * Digits only, then EAN-13 form where one exists.
 *  - 12 digits (UPC-A)      -> leading zero, giving the EAN-13 form
 *  - 13 digits (EAN-13)     -> unchanged
 *  - 14 digits starting '0' (GTIN-14 case-level) -> trimmed to 13
 *  - 8 digits (EAN-8/UPC-E) -> unchanged; there is no lossless expansion
 * Anything else returns null — better no barcode than a wrong one.
 */
export function normaliseBarcode(raw) {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 13) return digits;
  if (digits.length === 14 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 8) return digits;
  return null;
}

/**
 * Forms worth trying against a remote database, most-canonical first.
 * Open Food Facts stores most products under the EAN-13 form but not all,
 * so the raw digits are kept as a second attempt rather than discarded.
 */
export function barcodeCandidates(raw) {
  const digits = raw == null ? '' : String(raw).replace(/\D/g, '');
  const normalised = normaliseBarcode(digits);
  const out = [];
  for (const candidate of [normalised, digits]) {
    if (candidate && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/** True when this device could plausibly scan. Does NOT touch the camera. */
export function isScanSupported() {
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function';
}

async function createNativeEngine() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    let formats = NATIVE_FORMATS;
    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.length === 0) return null;
    }
    const detector = new window.BarcodeDetector({ formats });
    return {
      name: 'BarcodeDetector',
      async detect(videoEl) {
        const results = await detector.detect(videoEl);
        if (!results || results.length === 0) return null;
        return { raw: results[0].rawValue, format: results[0].format };
      },
      dispose() {}
    };
  } catch (err) {
    // A browser that has the constructor but throws on construction is not
    // a failure worth surfacing — fall through to the vendored engine.
    console.warn('BarcodeDetector unavailable, using the fallback engine:', err);
    return null;
  }
}

async function createFallbackEngine() {
  const zx = await import('../vendor/zxing-upcean.js');
  const hints = new Map();
  hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
    zx.BarcodeFormat.EAN_13,
    zx.BarcodeFormat.EAN_8,
    zx.BarcodeFormat.UPC_A,
    zx.BarcodeFormat.UPC_E
  ]);
  hints.set(zx.DecodeHintType.TRY_HARDER, true);
  const reader = new zx.MultiFormatUPCEANReader(hints);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return {
    name: 'zxing-upcean',
    async detect(videoEl) {
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (!vw || !vh) return null;
      const scale = Math.min(1, MAX_DECODE_EDGE / Math.max(vw, vh));
      const w = Math.max(1, Math.round(vw * scale));
      const h = Math.max(1, Math.round(vh * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(videoEl, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      // Green-favouring average, matching zxing's own RGB->luminance.
      const lum = new Uint8ClampedArray(w * h);
      for (let i = 0, j = 0; j < lum.length; i += 4, j += 1) {
        lum[j] = (data[i] + 2 * data[i + 1] + data[i + 2]) / 4;
      }
      const source = new zx.RGBLuminanceSource(lum, w, h);
      const bitmap = new zx.BinaryBitmap(new zx.HybridBinarizer(source));
      try {
        const result = reader.decode(bitmap, hints);
        return {
          raw: result.getText(),
          format: ZXING_FORMAT_NAMES[result.getBarcodeFormat()] || 'unknown'
        };
      } catch {
        // NotFoundException on a frame with no barcode is the normal case,
        // not an error. Anything else is also just "try the next frame".
        return null;
      } finally {
        reader.reset();
      }
    },
    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    }
  };
}

function stopStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch (err) { console.error('Could not stop a camera track:', err); }
  }
}

function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    }
  });
}

/**
 * Opens the camera, watches for a product barcode, and resolves once.
 *
 * Always resolves — never rejects — so a view can treat every outcome the
 * same way. The camera is released in every path, including abort.
 *
 * @param {object} opts
 * @param {HTMLVideoElement} opts.videoEl  where the viewfinder is shown
 * @param {AbortSignal} [opts.signal]      cancel (the user pressing Cancel)
 * @param {(status: string) => void} [opts.onStatus]  text for the live region
 * @returns {Promise<{ ok: true, barcode: string, raw: string, format: string, engine: string }
 *                 | { ok: false, reason: 'unsupported'|'permission-denied'|'no-camera'|'cancelled'|'error', error?: Error }>}
 */
export async function scan({ videoEl, signal, onStatus = () => {} } = {}) {
  if (!videoEl || !isScanSupported()) {
    return { ok: false, reason: 'unsupported' };
  }
  if (signal && signal.aborted) {
    return { ok: false, reason: 'cancelled' };
  }

  let stream = null;
  let engine = null;
  try {
    onStatus('Asking for permission to use the camera.');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false
      });
    } catch (err) {
      const name = err && err.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return { ok: false, reason: 'permission-denied' };
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') {
        return { ok: false, reason: 'no-camera', error: err };
      }
      console.error('Could not open the camera:', err);
      return { ok: false, reason: 'error', error: err };
    }

    if (signal && signal.aborted) return { ok: false, reason: 'cancelled' };

    videoEl.setAttribute('playsinline', '');
    videoEl.muted = true;
    videoEl.srcObject = stream;
    try {
      await videoEl.play();
    } catch (err) {
      // Autoplay refusal is not fatal on every browser; the frames may
      // still arrive. Log it and carry on rather than dead-ending.
      console.warn('Video playback did not start cleanly:', err);
    }

    engine = (await createNativeEngine()) || (await createFallbackEngine());
    onStatus('Scanning. Hold the barcode inside the frame.');

    let frames = 0;
    while (!(signal && signal.aborted)) {
      let hit = null;
      try {
        hit = await engine.detect(videoEl);
      } catch (err) {
        // A single bad frame must not end the scan.
        console.error('Barcode frame could not be read:', err);
      }
      if (hit && hit.raw) {
        const barcode = normaliseBarcode(hit.raw);
        if (barcode) {
          onStatus(`Barcode found: ${barcode}.`);
          return { ok: true, barcode, raw: String(hit.raw), format: hit.format, engine: engine.name };
        }
        // Read something that is not a product barcode — keep looking
        // rather than reporting a code we know we cannot use.
      }
      frames += 1;
      if (frames === 40) {
        onStatus('Still scanning. Try moving the camera closer, or use the form below instead.');
      }
      await delay(FRAME_INTERVAL_MS, signal);
    }
    return { ok: false, reason: 'cancelled' };
  } catch (err) {
    console.error('Barcode scan failed:', err);
    return { ok: false, reason: 'error', error: err };
  } finally {
    if (engine && typeof engine.dispose === 'function') engine.dispose();
    if (videoEl) {
      try { videoEl.pause(); } catch { /* not fatal */ }
      videoEl.srcObject = null;
    }
    stopStream(stream);
  }
}
