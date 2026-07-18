// js/lib/dates.js — 14 Jul 2026 v1
// Minimal date helpers. Storage is always ISO (date/timestamptz); these
// only handle display formatting, never parsing user locale strings back
// into storage format from outside a real form control.

/** Today as YYYY-MM-DD, matching Postgres `date` columns. */
export function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

/** Human-readable date for display, e.g. "Sat 18 Jul". */
export function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Human-readable date + time for logs/timestamps. */
export function formatDateTimeDisplay(isoTimestamp) {
  if (!isoTimestamp) return '';
  const d = new Date(isoTimestamp);
  return d.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });
}

export function isSameDay(isoA, isoB) {
  return isoA === isoB;
}
