// js/components/bottomNav.js — 01 Sep 2026 v3
// v3 (worklist A1): the bar shows what somebody asked for. See visibleNav.
// v2: the nav set comes from navConfig.js rather than from `nav: true` flags
// inside routes.js. Changing which four things sit in the bar is a product
// decision and should not mean editing route entries.
import { NAV_ITEMS, visibleNav } from '../navConfig.js';
import { getState } from '../lib/store.js';

/**
 * Builds the persistent bottom nav from navConfig.js, in listed order.
 * Returns { el, setActive(path) }.
 */
export function mountBottomNav(containerEl) {
  // Worklist A1. Empty focus_areas means everything, which is the default
  // and what every existing account has. Dashboard is `always` and cannot
  // be filtered out — you must be able to get home.
  const settings = getState().settings || {};
  const navRoutes = visibleNav(NAV_ITEMS, settings.focus_areas || []);

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
