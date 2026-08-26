// js/lib/rrule.js — 26 Aug 2026 v2
//
// ---- v2 breaks the write-once rule, deliberately ----
// v1 was marked write-once to stop later phases churning a load-bearing
// engine. It also SILENTLY IGNORED `UNTIL` and `COUNT`: a rule carrying
// either was accepted and then expanded forever. That is not a missing
// feature, it is a correctness hole — an end date the app promises to
// honour and then does not. Adding an end date to the chores form made it
// load-bearing, so the engine is extended rather than the rule worked
// around at each call site, which would put the rule's meaning outside the
// only place that parses it.
//
// Purely additive: a rule without UNTIL or COUNT behaves exactly as in v1.
// v2 also adds cadence(), which classifies a rule as daily / weekly /
// monthly / seasonal. Derived, never stored — a cadence column would be a
// second source for a fact the rule already fully determines.
//
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

  // UNTIL: an inclusive last date. Accepts YYYY-MM-DD and the RFC 5545
  // basic form YYYYMMDD (with an optional time part, which is discarded —
  // every date in this app is a whole day).
  let until = null;
  if (parts.UNTIL !== undefined && parts.UNTIL !== '') {
    until = normaliseUntil(parts.UNTIL);
    if (!until) throw new Error(`Invalid UNTIL: ${parts.UNTIL}`);
  }

  // COUNT: a maximum number of occurrences, counted from the rule's own
  // start date — NOT from the start of whatever window is being rendered.
  let count = null;
  if (parts.COUNT !== undefined && parts.COUNT !== '') {
    count = parseInt(parts.COUNT, 10);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`Invalid COUNT: ${parts.COUNT}`);
    }
  }

  if (until && count) {
    // Both is legal in RFC 5545 but ambiguous to a reader, and this app has
    // one UI for "ends". Refusing is safer than silently honouring one.
    throw new Error('A rule cannot carry both UNTIL and COUNT.');
  }

  if (freq === 'WEEKLY') {
    const byday = (parts.BYDAY || '').split(',').map((d) => d.trim()).filter(Boolean);
    if (byday.length === 0 || !byday.every((d) => VALID_DAYS.includes(d))) {
      throw new Error(`Invalid BYDAY for WEEKLY: ${parts.BYDAY}`);
    }
    return { freq, interval, byday, until, count };
  }

  if (freq === 'MONTHLY') {
    const bymonthday = parts.BYMONTHDAY !== undefined ? parseInt(parts.BYMONTHDAY, 10) : NaN;
    if (!Number.isInteger(bymonthday) || bymonthday < 1 || bymonthday > 28) {
      throw new Error(`Invalid BYMONTHDAY (must be 1-28 this phase): ${parts.BYMONTHDAY}`);
    }
    return { freq, interval, bymonthday, until, count };
  }

  return { freq, interval, until, count };
}

/** YYYYMMDD or YYYY-MM-DD (optionally with a time part) -> YYYY-MM-DD. */
function normaliseUntil(raw) {
  const text = String(raw).trim();
  const basic = text.match(/^(\d{4})(\d{2})(\d{2})(T.*)?$/);
  if (basic) return `${basic[1]}-${basic[2]}-${basic[3]}`;
  const extended = text.match(/^(\d{4}-\d{2}-\d{2})(T.*)?$/);
  if (extended) return extended[1];
  return null;
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

  // UNTIL clamps the window. Scanning past it would only produce dates that
  // are then discarded.
  const hardEnd = params.until
    ? (parseISODate(params.until) < windowEnd ? parseISODate(params.until) : windowEnd)
    : windowEnd;
  if (hardEnd < windowStart) return [];

  // COUNT is counted from the RULE's start, not the window's. So when a
  // window opens partway through a series, the occurrences before it still
  // have to be counted — otherwise a rule that ended in March reappears
  // when April is rendered.
  let consumed = 0;
  if (params.count && start < windowStart) {
    let back = new Date(start);
    let guard = 0;
    while (back < windowStart && consumed < params.count && guard < 366 * 5) {
      if (matchesRule(params, start, back)) consumed += 1;
      back = addDays(back, 1);
      guard += 1;
    }
    if (consumed >= params.count) return [];
  }

  const rangeStart = start > windowStart ? start : windowStart;
  if (rangeStart > hardEnd) return [];

  const results = [];
  let cursor = new Date(rangeStart);

  // Safety cap: this engine is only used for bounded windows (a few months
  // at a time), so a day-by-day scan is simple, correct, and fast enough.
  // The cap guards against a pathological window being passed by mistake.
  const maxIterations = 366 * 5;
  let iterations = 0;

  while (cursor <= hardEnd && iterations < maxIterations) {
    if (matchesRule(params, start, cursor)) {
      if (params.count && consumed >= params.count) break;
      results.push(toISODate(cursor));
      consumed += 1;
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
    return withEnding(params.interval === 1 ? 'Every day' : `Every ${params.interval} days`, params);
  }

  if (params.freq === 'WEEKLY') {
    const days = params.byday.map((d) => DAY_NAMES[d]).join(', ');
    const freqPart = params.interval === 1 ? 'Every week' : `Every ${params.interval} weeks`;
    return withEnding(`${freqPart} on ${days}`, params);
  }

  if (params.freq === 'MONTHLY') {
    const freqPart = params.interval === 1 ? 'Every month' : `Every ${params.interval} months`;
    return withEnding(`${freqPart} on day ${params.bymonthday}`, params);
  }

  return rule;
}

/** An end that is honoured must also be stated, or the preview lies. */
function withEnding(text, params) {
  if (params.until) return `${text}, until ${params.until}`;
  if (params.count) return `${text}, ${params.count} time${params.count === 1 ? '' : 's'}`;
  return text;
}

/**
 * How often a rule comes round, as a word: 'daily' | 'weekly' | 'monthly'
 * | 'seasonal'. Used to group a long chore list without asking the user to
 * classify anything twice.
 *
 * DERIVED, NEVER STORED. A cadence column would be a second source for a
 * fact the rule already fully determines, and the two would drift the first
 * time a rule was edited.
 *
 * SEASONAL is monthly with an interval of three or more — quarterly, or
 * twice a year, or annually. Those belong together: they are the jobs you
 * would otherwise forget entirely.
 *
 * A one-off task has no rule at all; callers pass null and get 'once'.
 */
export function cadence(rule) {
  if (!rule) return 'once';
  let params;
  try {
    params = parseRule(rule);
  } catch {
    return 'once';
  }
  if (params.freq === 'DAILY') return params.interval >= 7 ? 'weekly' : 'daily';
  if (params.freq === 'WEEKLY') return params.interval >= 4 ? 'monthly' : 'weekly';
  if (params.freq === 'MONTHLY') return params.interval >= 3 ? 'seasonal' : 'monthly';
  return 'once';
}

/** The cadences in the order a person thinks about them. */
export const CADENCES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'seasonal', label: 'Seasonally' },
  { value: 'once', label: 'One-off' }
];
