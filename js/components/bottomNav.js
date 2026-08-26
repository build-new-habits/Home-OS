// js/components/bottomNav.js — 26 Aug 2026 v2
// v2: the nav set comes from navConfig.js rather than from `nav: true` flags
// inside routes.js. Changing which four things sit in the bar is a product
// decision and should not mean editing route entries.
import { NAV_ITEMS } from '../navConfig.js';

/**
 * Builds the persistent bottom nav from navConfig.js, in listed order.
 * Returns { el, setActive(path) }.
 */
export function mountBottomNav(containerEl) {
  const navRoutes = NAV_ITEMS;

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
    icon.textContent = route.icon || '•';

    const label = document.createElement('span');
    label.textContent = route.label;

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
