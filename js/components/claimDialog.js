// js/components/claimDialog.js — 01 Sep 2026 v1
// Phase 11. Shown when a scanned barcode matches nothing, but you have
// unbarcoded foods on your list or in this week's meals that it might
// belong to.
//
// ---- Why a radio group and not a row of buttons ----
// The user is answering ONE question — "which of these is it?" — not
// choosing between five actions. A radio group announces itself as a single
// choice with a known number of options, and moving between them costs
// nothing. Five buttons announce five separate things to do, and a
// mis-tap commits immediately with no way back.
//
// ---- The last option is not a rejection ----
// "None of these" is the honest default for a genuinely new item, so it is
// preselected. Claiming is the accelerator; creating is the normal path
// and must never feel like the failure branch.

/**
 * @param {{
 *   productName?: string,
 *   barcode: string,
 *   candidates: Array<{ food: object, score: number }>
 * }} options
 * @returns {Promise<{ action: 'claim', food: object } | { action: 'new' }>}
 *   Never rejects. Escape and the backdrop both mean "new", because
 *   cancelling out of a question you did not ask for should leave you where
 *   you would have been without it.
 */
export function claimDialog({ productName = '', barcode = '', candidates = [] } = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const idBase = 'claim-' + Math.random().toString(36).slice(2, 8);

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'dialog claim-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', `${idBase}-title`);
    dialog.setAttribute('aria-describedby', `${idBase}-desc`);

    const titleEl = document.createElement('h2');
    titleEl.id = `${idBase}-title`;
    titleEl.textContent = productName ? `Is this your ${productName}?` : 'What did you just scan?';

    const descEl = document.createElement('p');
    descEl.id = `${idBase}-desc`;
    descEl.className = 'dialog-desc';
    // State what is actually going on. A barcode arriving unattached is not
    // an error and must not read like one.
    descEl.textContent = productName
      ? `Barcode ${barcode} is not saved yet. You are already expecting these — `
        + 'if one of them is it, tapping it keeps your recipes and shopping list pointed at the same thing.'
      : `Barcode ${barcode} is not saved yet, and it could not be looked up. `
        + 'If it is one of these, tapping it will attach the barcode to it.';

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'claim-options';

    const legend = document.createElement('legend');
    legend.textContent = 'Which one is it?';
    fieldset.appendChild(legend);

    const radios = [];

    candidates.forEach((entry, index) => {
      const food = entry.food;
      const id = `${idBase}-opt-${index}`;

      const wrap = document.createElement('div');
      wrap.className = 'claim-option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${idBase}-choice`;
      input.id = id;
      input.value = String(index);

      const label = document.createElement('label');
      label.setAttribute('for', id);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'claim-option-name';
      nameSpan.textContent = food.name;
      label.appendChild(nameSpan);

      // Say WHY it is on the list. Without this the user is guessing at the
      // app's reasoning, and a suggestion you cannot account for is one you
      // stop trusting.
      const whySpan = document.createElement('span');
      whySpan.className = 'claim-option-why';
      whySpan.textContent = food.reason || 'On your list or in this week\'s meals';
      label.appendChild(whySpan);

      wrap.append(input, label);
      fieldset.appendChild(wrap);
      radios.push({ input, food });
    });

    // ---- The new-item option, preselected ----
    const newWrap = document.createElement('div');
    newWrap.className = 'claim-option claim-option-new';
    const newInput = document.createElement('input');
    newInput.type = 'radio';
    newInput.name = `${idBase}-choice`;
    newInput.id = `${idBase}-opt-new`;
    newInput.value = 'new';
    newInput.checked = true;
    const newLabel = document.createElement('label');
    newLabel.setAttribute('for', `${idBase}-opt-new`);
    const newName = document.createElement('span');
    newName.className = 'claim-option-name';
    newName.textContent = 'None of these — add it as a new item';
    newLabel.appendChild(newName);
    newWrap.append(newInput, newLabel);
    fieldset.appendChild(newWrap);
    radios.push({ input: newInput, food: null });

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Continue';

    actions.append(cancelBtn, confirmBtn);
    dialog.append(titleEl, descEl, fieldset, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function cleanup(result) {
      document.removeEventListener('keydown', onKeydown, true);
      backdrop.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    }

    function chosen() {
      const picked = radios.find((r) => r.input.checked);
      if (picked && picked.food) return { action: 'claim', food: picked.food };
      return { action: 'new' };
    }

    function focusables() {
      return dialog.querySelectorAll('input, button');
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup({ action: 'new' });
        return;
      }
      if (e.key !== 'Tab') return;
      // Radios in one group are a single tab stop, so the trap has to work
      // off the checked member rather than every input in the list.
      const nodes = [...focusables()].filter(
        (n) => n.type !== 'radio' || n.checked
      );
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    cancelBtn.addEventListener('click', () => cleanup({ action: 'new' }));
    confirmBtn.addEventListener('click', () => cleanup(chosen()));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup({ action: 'new' });
    });
    document.addEventListener('keydown', onKeydown, true);

    // Focus the first real choice, not the preselected fallback: the
    // question is "is it one of these", and the answer we are asking about
    // should be the thing under your thumb.
    if (radios.length > 1) radios[0].input.focus();
    else confirmBtn.focus();
  });
}
