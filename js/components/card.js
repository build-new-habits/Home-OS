// js/components/card.js — 19 Jul 2026 v1
// Reusable, presentational, accessible card container. No business logic,
// no colour-only meaning. Reused by chores (Phase 4) and dashboard (Phase 9).

/**
 * @param {{ title: string, headingLevel?: number, className?: string }} opts
 * @returns {{ article: HTMLElement, heading: HTMLElement, body: HTMLElement, actions: HTMLElement }}
 */
export function createCard({ title, headingLevel = 2, className = '' } = {}) {
  const article = document.createElement('article');
  article.className = ['card', className].filter(Boolean).join(' ');

  const level = Math.min(Math.max(headingLevel, 1), 6);
  const heading = document.createElement(`h${level}`);
  heading.className = 'card-title';
  heading.textContent = title;
  const headingId = `card-title-${Math.random().toString(36).slice(2, 8)}`;
  heading.id = headingId;
  article.setAttribute('aria-labelledby', headingId);

  const body = document.createElement('div');
  body.className = 'card-body';

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  article.append(heading, body, actions);

  return { article, heading, body, actions };
}
