// js/components/hearthCard.js — 26 Nov 2026 v1
// Phase 36a. What a Free household sees when it reaches a limit.
//
// Shown only when a person tapped something; never on its own, never as a
// pop-up on arrival (Phase 36 brief §2). One sentence about what Hearth adds
// here, then See Hearth or Not now. No urgency and no pressure (the copy
// gate in Tests/hearth.mjs checks the words).

import { confirmDialog } from './confirmDialog.js';
import { WHAT_HEARTH_ADDS } from '../data/hearth.js';

/**
 * @param {keyof WHAT_HEARTH_ADDS} what
 * @param {{ used?: number, limit?: number, fact?: string }} [detail]
 * @returns {Promise<void>} resolves when the card is closed
 */
export async function showHearthCard(what, detail = {}) {
  const fact = detail.fact || (detail.limit ? `Free keeps ${detail.limit}.` : '');
  const go = await confirmDialog({
    title: 'This is part of Hearth',
    message: [fact, WHAT_HEARTH_ADDS[what] || 'Hearth has everything in Home-OS.', 'Everything you already have stays where it is.'].filter(Boolean).join(' '),
    confirmLabel: 'See Hearth',
    cancelLabel: 'Not now',
    tone: 'primary'
  });
  if (go) window.location.hash = '#/hearth';
}
