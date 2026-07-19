// js/components/completionStamp.js — 19 Jul 2026 v1
// The visible "Complete" done-state treatment (behavioural principle 3:
// completion is a physical event; completed cards stay visible, not
// removed). Status is carried by text, never colour alone.
// Reduced-motion aware: the animate class is only added when the user has
// not requested reduced motion; CSS (components.css) should make the
// non-animate state visually identical minus the transition itself.

export function showCompletionStamp(cardEl, { label = 'Complete' } = {}) {
  let stamp = cardEl.querySelector('.completion-stamp');
  if (!stamp) {
    stamp = document.createElement('span');
    stamp.className = 'completion-stamp';
    stamp.setAttribute('role', 'status');
    cardEl.prepend(stamp);
  }
  stamp.replaceChildren();

  const icon = document.createElement('span');
  icon.className = 'completion-stamp-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✓';

  const text = document.createElement('span');
  text.className = 'completion-stamp-text';
  text.textContent = label;

  stamp.append(icon, text);
  cardEl.classList.add('is-complete');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  stamp.classList.toggle('completion-stamp-animate', !prefersReducedMotion);
}

export function hideCompletionStamp(cardEl) {
  const stamp = cardEl.querySelector('.completion-stamp');
  if (stamp) stamp.remove();
  cardEl.classList.remove('is-complete');
}
