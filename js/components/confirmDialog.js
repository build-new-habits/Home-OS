// js/components/confirmDialog.js — 14 Jul 2026 v1
// Accessible modal confirm dialog. Deletions (a project, a meal, a
// holiday) must go through this — behavioural principle 9.

/**
 * confirmDialog({ title, message, confirmLabel, cancelLabel }) -> Promise<boolean>
 */
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel'
} = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    const titleId = 'dialog-title-' + Math.random().toString(36).slice(2, 8);
    const descId = 'dialog-desc-' + Math.random().toString(36).slice(2, 8);
    dialog.setAttribute('aria-labelledby', titleId);
    if (message) dialog.setAttribute('aria-describedby', descId);

    const titleEl = document.createElement('h2');
    titleEl.id = titleId;
    titleEl.textContent = title;

    const msgEl = document.createElement('p');
    msgEl.id = descId;
    msgEl.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.type = 'button';
    confirmBtn.textContent = confirmLabel;

    actions.append(cancelBtn, confirmBtn);
    dialog.append(titleEl, msgEl, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function cleanup(result) {
      document.removeEventListener('keydown', onKeydown, true);
      backdrop.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = dialog.querySelectorAll('button');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));
    document.addEventListener('keydown', onKeydown, true);

    confirmBtn.focus();
  });
}
