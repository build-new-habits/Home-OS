// js/views/dashboard.js — 14 Jul 2026 v1
import { routes } from '../routes.js';
import { formatDateDisplay, todayIso } from '../lib/dates.js';

export function render(mountEl) {
  const h1 = document.createElement('h1');
  h1.textContent = 'Dashboard';
  mountEl.appendChild(h1);

  const todayEl = document.createElement('p');
  todayEl.className = 'field-hint';
  todayEl.textContent = formatDateDisplay(todayIso());
  mountEl.appendChild(todayEl);

  const placeholder = document.createElement('div');
  placeholder.className = 'card';
  placeholder.textContent = "Today's summary lands here in Phase 9, once every section has data to pull from.";
  mountEl.appendChild(placeholder);

  const h2 = document.createElement('h2');
  h2.textContent = 'Everything';
  mountEl.appendChild(h2);

  const list = document.createElement('ul');
  list.className = 'dashboard-links';

  for (const route of routes) {
    if (route.path === 'dashboard') continue;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#/${route.path}`;
    a.textContent = route.title;
    li.appendChild(a);
    list.appendChild(li);
  }

  mountEl.appendChild(list);

  return () => {};
}
