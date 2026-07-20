// js/lib/rrule.js — 20 Jul 2026 v1
// Recurrence engine for Phase 4 (behavioural principle 4: recurrence must
// be trustworthy). Supports exactly three constrained rule shapes — see
// phase4_build_brief.md. Pure: no DOM, no network, so it is unit-checkable
// and safe to run offline. Reused by Phase 8 (holidays / work location).
//
// Public API:
//   expand(rule, startDateISO, windowStartISO, windowEndISO) -> string[]
//   describe(rule) -> string

const VALID_FREQ = ['DAILY', 'WEEKLY', 'MONTHLY'];
const VALID_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']; // index = Date#getUTCDay()
const DAY_NAMES = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };

// ---- rule string parsing ----

function parseRule(rule) {
  if (typeof rule !== 'string' || !rule.trim()) {
    throw new Error('Recurrence rule is required');
  }
  const parts = rule.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key) acc[key.trim()] = value !== undefined ? value.trim() : undefined;
    return acc;
  }, {});

  const freq = parts.FREQ;
  if (!VALID_FREQ.includes(freq)) {
    throw new Error(`Unsupported FREQ: ${parts.FREQ}. Only DAILY, WEEKLY, MONTHLY are supported this phase.`);
  }

  const interval = parts.INTERVAL !== undefined ? parseInt(parts.INTERVAL, 10) : 1;
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`Invalid INTERVAL: ${parts.INTERVAL}`);
  }

  if (freq === 'WEEKLY') {
    const byday = (parts.BYDAY || '').split(',').map((d) => d.trim()).filter(Boolean);
    if (byday.length === 0 || !byday.every((d) => VALID_DAYS.includes(d))) {
      throw new Error(`Invalid BYDAY for WEEKLY: ${parts.BYDAY}`);
    }
    return { freq, interval, byday };
  }

  if (freq === 'MONTHLY') {
    const bymonthday = parts.BYMONTHDAY !== undefined ? parseInt(parts.BYMONTHDAY, 10) : NaN;
    if (!Number.isInteger(bymonthday) || bymonthday < 1 || bymonthday > 28) {
      throw new Error(`Invalid BYMONTHDAY (must be 1-28 this phase): ${parts.BYMONTHDAY}`);
    }
    return { freq, interval, bymonthday };
  }

  return { freq, interval };
}

// ---- UTC date helpers (dates are DB `date` columns — treat as UTC midnight
// throughout so day-of-week and month-boundary math never drifts with the
// browser's local timezone) ----

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function weekdayCode(date) {
  return WEEKDAY_CODES[date.getUTCDay()];
}

function mondayOnOrBefore(date) {
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  return addDays(date, -diff);
}

// ---- matching ----

function matchesRule(params, start, date) {
  if (date < start) return false;

  if (params.freq === 'DAILY') {
    return daysBetween(start, date) % params.interval === 0;
  }

  if (params.freq === 'WEEKLY') {
    if (!params.byday.includes(weekdayCode(date))) return false;
    const startMonday = mondayOnOrBefore(start);
    const dateMonday = mondayOnOrBefore(date);
    const weekDiff = daysBetween(startMonday, dateMonday) / 7;
    return weekDiff % params.interval === 0;
  }

  if (params.freq === 'MONTHLY') {
    if (date.getUTCDate() !== params.bymonthday) return false;
    const monthDiff =
      (date.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (date.getUTCMonth() - start.getUTCMonth());
    if (monthDiff < 0) return false;
    return monthDiff % params.interval === 0;
  }

  return false;
}

/**
 * Expand a rule into every occurrence (inclusive) that falls within
 * [windowStartISO, windowEndISO], never earlier than the rule's own
 * startDateISO. Returns ISO date strings in ascending order.
 */
export function expand(rule, startDateISO, windowStartISO, windowEndISO) {
  const params = parseRule(rule);
  const start = parseISODate(startDateISO);
  const windowStart = parseISODate(windowStartISO);
  const windowEnd = parseISODate(windowEndISO);

  if (windowEnd < windowStart) {
    throw new Error('windowEndISO is before windowStartISO');
  }

  const rangeStart = start > windowStart ? start : windowStart;
  if (rangeStart > windowEnd) return [];

  const results = [];
  let cursor = new Date(rangeStart);

  // Safety cap: this engine is only used for bounded windows (a few months
  // at a time), so a day-by-day scan is simple, correct, and fast enough.
  // The cap guards against a pathological window being passed by mistake.
  const maxIterations = 366 * 5;
  let iterations = 0;

  while (cursor <= windowEnd && iterations < maxIterations) {
    if (matchesRule(params, start, cursor)) {
      results.push(toISODate(cursor));
    }
    cursor = addDays(cursor, 1);
    iterations += 1;
  }

  return results;
}

/**
 * Plain-English summary of a rule, for the recurrence confirmation preview
 * and for display on a task/event card.
 */
export function describe(rule) {
  const params = parseRule(rule);

  if (params.freq === 'DAILY') {
    return params.interval === 1 ? 'Every day' : `Every ${params.interval} days`;
  }

  if (params.freq === 'WEEKLY') {
    const days = params.byday.map((d) => DAY_NAMES[d]).join(', ');
    const freqPart = params.interval === 1 ? 'Every week' : `Every ${params.interval} weeks`;
    return `${freqPart} on ${days}`;
  }

  if (params.freq === 'MONTHLY') {
    const freqPart = params.interval === 1 ? 'Every month' : `Every ${params.interval} months`;
    return `${freqPart} on day ${params.bymonthday}`;
  }

  return rule;
}
