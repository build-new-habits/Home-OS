// js/components/completionStamp.js — 19 Jul 2026 v2
// The visible "Complete" done-state treatment (behavioural principle 3).
// v2: uses the existing .stamp class from components.css instead of
// inventing new ones — v1's classes had no CSS behind them and rendered
// unstyled. .stamp has no transition/animation defined, so it already
// appears instantly; no reduced-motion branching needed.

export function showCompletionStamp(cardEl, { label = 'Complete' } = {}) {
  let stamp = cardEl.querySelector('.stamp');
  if (!stamp) {
    stamp = document.createElement('span');
    stamp.className = 'stamp';
    stamp.setAttribute('role', 'status');
    cardEl.prepend(stamp);
  }
  stamp.replaceChildren();

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✓';

  const text = document.createElement('span');
  text.textContent = label;

  stamp.append(icon, text);
  cardEl.classList.add('is-complete');
}

export function hideCompletionStamp(cardEl) {
  const stamp = cardEl.querySelector('.stamp');
  if (stamp) stamp.remove();
  cardEl.classList.remove('is-complete');
}
