// js/lib/localClient.js — 04 Oct 2026 v1
// v1: Try it on this phone. A stand-in for the Supabase client that keeps
// everything in this browser's storage, so someone can use the whole
// kitchen before making an account.
//
// Persona re-trace 3: the first screen anyone saw was a sign-in form. Tom,
// trying it before paying: "I didn't get far enough to know if it's good."
// Mealime, Samsung Food and Kitchen Stories all let you in first.
//
// ---- What it is ----
// The same calls the app already makes — from(), select with embedded
// tables, eq/in/is/not/gte/lte, order, range, limit, single, insert,
// update, upsert, delete, head counts — answered from one JSON document in
// localStorage. supabaseClient.js hands this out instead of the network
// client while the phone is in trial mode, so no view knows the
// difference and none of them changed.
//
// ---- What it is not ----
// Not shared: a household on this phone only. Invites, sign-in links and
// anything else that needs a server say so plainly (rpc returns an error
// in words). Not synced: making an account starts that account empty, and
// Settings says so before anyone chooses it. Nothing here leaves the phone.
//
// ---- Columns ----
// A real database rejects an unknown column; this one stores whatever it
// is given. That means migration 026's columns (leftovers, courses, Eaten)
// simply work on a trial phone. The schema-conformance gate still checks
// every payload the app writes against schema.md, so nothing can drift
// through here unnoticed.

export const LOCAL_MODE_KEY = 'home-os-mode';
const DB_KEY = 'home-os-local-db';
const USER_ID = 'local-user';
const HOUSEHOLD_ID = 'local-household';

/** True while this phone is trying the app without an account. */
export function isLocalMode() {
  try { return localStorage.getItem(LOCAL_MODE_KEY) === 'local'; } catch { return false; }
}

/** Start trying it on this phone, and land on the guided first run. */
export function enterLocalMode() {
  try { localStorage.setItem(LOCAL_MODE_KEY, 'local'); } catch { return false; }
  window.location.hash = '#/first-run';
  window.location.reload();
  return true;
}

/** Leave trial mode for the sign-in screen. The trial's data stays on the phone. */
export function leaveLocalMode() {
  try { localStorage.removeItem(LOCAL_MODE_KEY); } catch { /* nothing to undo */ }
  window.location.hash = '';
  window.location.reload();
}

function now() { return new Date().toISOString(); }
function newId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch { /* fall through */ }
  return `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function freshDb() {
  return {
    households: [{ id: HOUSEHOLD_ID, name: 'Home', user_id: USER_ID, created_at: now() }],
    household_members: [{ id: newId(), household_id: HOUSEHOLD_ID, user_id: USER_ID, display_name: 'Me', role: 'adult', portion_factor: 1, dietary_tags: [], created_at: now() }],
    user_settings: []
  };
}

let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch { cache = null; }
  if (!cache || typeof cache !== 'object') { cache = freshDb(); save(); }
  return cache;
}
function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(cache)); return null; } catch (e) { return e; }
}

// Embedded tables: "foods(...)" on a row with food_id is the one food; on a
// row without, it is the children pointing back at this row.
const FK = { foods: 'food_id', meals: 'meal_id', households: 'household_id', chore_projects: 'project_id', holidays: 'holiday_id', exercises: 'exercise_id', chore_tasks: 'task_id' };
const BACK = { meals: 'meal_id', foods: 'food_id', households: 'household_id', holidays: 'holiday_id', chore_projects: 'project_id' };

function splitTop(text) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function parseSelect(text) {
  return splitTop(String(text || '*').replace(/\s+/g, ' ')).map((part) => {
    const m = part.match(/^(?:\w+:)?([a-z_]+)(?:!\w+)?\s*\((.*)\)$/s);
    if (m) return { embed: m[1], cols: parseSelect(m[2]) };
    return { col: part.replace(/^.*:/, '').trim() };
  });
}
function project(db, table, row, cols) {
  const out = {};
  for (const c of cols) {
    if (c.col === '*') Object.assign(out, row);
    else if (c.col) out[c.col] = row[c.col] === undefined ? null : row[c.col];
    else if (c.embed) {
      const rows = db[c.embed] || [];
      const fk = FK[c.embed];
      if (fk && Object.prototype.hasOwnProperty.call(row, fk)) {
        const hit = rows.find((r) => r.id === row[fk]);
        out[c.embed] = hit ? project(db, c.embed, hit, c.cols) : null;
      } else {
        const back = BACK[table] || `${table.replace(/s$/, '')}_id`;
        out[c.embed] = rows.filter((r) => r[back] === row.id).map((r) => project(db, c.embed, r, c.cols));
      }
    }
  }
  return out;
}
function compare(a, b, nullsFirst) {
  const an = a === null || a === undefined; const bn = b === null || b === undefined;
  if (an && bn) return 0;
  if (an) return nullsFirst ? -1 : 1;
  if (bn) return nullsFirst ? 1 : -1;
  return a < b ? -1 : a > b ? 1 : 0;
}
const same = (a, b) => a === b || (a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b));
const problem = (message, code = 'LOCAL') => ({ message, code, details: null, hint: null });

class Query {
  constructor(table) {
    this.table = table; this.filters = []; this.orders = []; this.op = 'select'; this.columns = '*';
    this.max = null; this.span = null; this.one = false; this.maybe = false; this.head = false; this.returning = false;
  }
  select(columns = '*', opts = {}) {
    if (this.op === 'select') this.columns = columns; else { this.returning = true; this.columns = columns; }
    if (opts && opts.head) this.head = true;
    return this;
  }
  insert(payload) { this.op = 'insert'; this.payload = payload; return this; }
  upsert(payload, opts = {}) { this.op = 'upsert'; this.payload = payload; this.conflict = opts.onConflict; return this; }
  update(payload) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push((r) => same(r[c], v)); return this; }
  neq(c, v) { this.filters.push((r) => !same(r[c], v)); return this; }
  gt(c, v) { this.filters.push((r) => r[c] > v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
  lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this; }
  in(c, list) { this.filters.push((r) => (list || []).some((v) => same(r[c], v))); return this; }
  is(c, v) { this.filters.push((r) => (r[c] === undefined ? null : r[c]) === v); return this; }
  not(c, op, v) {
    if (op === 'is') this.filters.push((r) => (r[c] === undefined ? null : r[c]) !== v);
    else if (op === 'in') { const list = String(v).replace(/[()]/g, '').split(','); this.filters.push((r) => !list.includes(String(r[c]))); }
    else this.filters.push((r) => !same(r[c], v));
    return this;
  }
  match(obj) { for (const k of Object.keys(obj || {})) this.eq(k, obj[k]); return this; }
  contains(c, v) { this.filters.push((r) => Array.isArray(r[c]) && (v || []).every((x) => r[c].includes(x))); return this; }
  ilike(c, pattern) {
    const re = new RegExp(`^${String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i');
    this.filters.push((r) => re.test(String(r[c] || '')));
    return this;
  }
  like(c, pattern) { return this.ilike(c, pattern); }
  filter(c, op, v) { return typeof this[op] === 'function' ? this[op](c, v) : this; }
  or() { return this; }
  order(c, opts = {}) { this.orders.push([c, opts.ascending !== false, Boolean(opts.nullsFirst)]); return this; }
  limit(n) { this.max = n; return this; }
  range(from, to) { this.span = [from, to]; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.maybe = true; return this; }
  abortSignal() { return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }
  catch(fn) { return this.then(undefined, fn); }
  finally(fn) { return this.then((v) => { if (fn) fn(); return v; }, (e) => { if (fn) fn(); throw e; }); }

  run() {
    const db = load();
    if (!db[this.table]) db[this.table] = [];
    const rows = db[this.table];
    const cols = parseSelect(this.columns);

    if (this.op === 'insert' || this.op === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      const made = list.map((p) => {
        if (this.op === 'upsert') {
          const keys = String(this.conflict || 'id').split(',').map((k) => k.trim());
          const hit = rows.find((r) => keys.every((k) => p[k] !== undefined ? same(r[k], p[k]) : (k === 'user_id' && r.user_id === USER_ID)));
          if (hit) { Object.assign(hit, p, { updated_at: now() }); return hit; }
        }
        const row = { id: newId(), user_id: USER_ID, household_id: HOUSEHOLD_ID, created_at: now(), updated_at: now(), ...p };
        rows.push(row);
        return row;
      });
      const failed = save();
      if (failed) return { data: null, error: problem('This phone has run out of room for the trial. Make an account to keep going.') };
      const data = made.map((r) => project(db, this.table, r, cols));
      return { data: this.one ? data[0] : (this.returning ? data : null), error: null, status: 201 };
    }

    let hit = rows.filter((r) => this.filters.every((fn) => fn(r)));
    if (this.op === 'update') {
      for (const r of hit) Object.assign(r, this.payload, { updated_at: now() });
      const failed = save();
      if (failed) return { data: null, error: problem('This phone has run out of room for the trial.') };
    }
    if (this.op === 'delete') {
      db[this.table] = rows.filter((r) => !hit.includes(r));
      save();
    }
    for (const [c, asc, nullsFirst] of [...this.orders].reverse()) {
      hit = [...hit].sort((a, b) => (asc ? 1 : -1) * compare(a[c], b[c], asc ? nullsFirst : !nullsFirst));
    }
    const count = hit.length;
    if (this.span) hit = hit.slice(this.span[0], this.span[1] + 1);
    if (this.max !== null) hit = hit.slice(0, this.max);
    if (this.head) return { data: null, count, error: null };
    if ((this.op === 'update' || this.op === 'delete') && !this.returning && !this.one) return { data: null, count, error: null };
    const data = hit.map((r) => project(db, this.table, r, cols));
    if (this.one) {
      if (data.length === 0) return this.maybe ? { data: null, error: null } : { data: null, error: problem('No row found.', 'PGRST116') };
      return { data: data[0], error: null };
    }
    return { data, count, error: null };
  }
}

/** The client handed out by supabaseClient.js in trial mode. */
export function localClient() {
  const session = { user: { id: USER_ID, email: '' }, access_token: 'local', local: true };
  return {
    local: true,
    from: (table) => new Query(table),
    rpc: async () => ({ data: null, error: problem('That needs an account. Make one in Settings to share with your household.') }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} }; return ch; },
    removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => { leaveLocalMode(); return { error: null }; },
      signInWithPassword: async () => ({ data: null, error: problem('Make an account from Settings first.') }),
      signInWithOtp: async () => ({ data: null, error: problem('Make an account from Settings first.') }),
      resetPasswordForEmail: async () => ({ data: null, error: problem('There is no password on a trial.') }),
      updateUser: async () => ({ data: null, error: problem('There is no password on a trial.') })
    }
  };
}
