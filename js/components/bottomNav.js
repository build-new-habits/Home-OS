// js/components/bottomNav.js — 14 Jul 2026 v1
import { routes } from '../routes.js';

const NAV_ICONS = {
  dashboard: '⌂',
  exercises: '✚',
  chores: '✓',
  water: '◔'
};

/**
 * Builds the persistent bottom nav from routes.js entries with nav:true,
 * ordered by navOrder. Returns { el, setActive(path) }.
 */
export function mountBottomNav(containerEl) {
  const navRoutes = routes
    .filter(r => r.nav)
    .sort((a, b) => a.navOrder - b.navOrder);

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Primary');

  const links = new Map();

  for (const route of navRoutes) {
    const a = document.createElement('a');
    a.href = `#/${route.path}`;

    const icon = document.createElement('span');
    icon.className = 'bottom-nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = NAV_ICONS[route.path] || '•';

    const label = document.createElement('span');
    label.textContent = route.title;

    a.append(icon, label);
    nav.appendChild(a);
    links.set(route.path, a);
  }

  containerEl.appendChild(nav);

  function setActive(path) {
    for (const [p, a] of links) {
      if (p === path) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    }
  }

  return { el: nav, setActive };
}
