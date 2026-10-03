// js/components/bottomNav.js — 03 Oct 2026 v5
// v5: draws an item's svg icon when it has one.
// v4: navItemsFor() (KITCHEN_ONLY, kitchen rebuild K2).
// v3 (worklist A1): the bar shows what somebody asked for. See visibleNav.
// v2: the nav set comes from navConfig.js rather than from `nav: true` flags
// inside routes.js. Changing which four things sit in the bar is a product
// decision and should not mean editing route entries.
import { navItemsFor } from '../navConfig.js';
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
  // Kitchen rebuild K2: navItemsFor() decides, so KITCHEN_ONLY lives in one place.
  const navRoutes = navItemsFor(settings);

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
    if (route.svg) {
      // Drawn icons (kitchen bar, 3 Oct 2026). Decorative: the label says it.
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [k, v] of Object.entries({ width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
      svg.innerHTML = route.svg;
      icon.appendChild(svg);
    } else {
      icon.textContent = route.icon || '•';
    }

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
