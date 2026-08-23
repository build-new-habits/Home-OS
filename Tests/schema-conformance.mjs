// Cross-checks every column name the data layer uses against schema.md.
// A typo is invisible to jsdom (the stub accepts anything) and to
// `node --check`; it only fails against the real database, i.e. during a
// physical smoke test. This is the check that protects that time.
import fs from 'node:fs';

const REPO = process.env.GATE_REPO || process.cwd();
const schema = fs.readFileSync(`${REPO}/Docs/Current/schema.md`, 'utf8');
const UNIVERSAL = ['id', 'user_id', 'created_at', 'updated_at']; // schema.md §1

const tables = new Map();
{
  let current = null;
  for (const line of schema.split('\n')) {
    const heading = line.match(/^###\s+(\w+)\s*$/);
    if (heading) { current = heading[1]; tables.set(current, new Set(UNIVERSAL)); continue; }
    if (line.startsWith('## ')) current = null;
    if (!current) continue;
    const cell = line.match(/^\|\s*([a-z_][a-z0-9_]*)\s*\|/i);
    if (cell) tables.get(current).add(cell[1]);
  }
}
const ALL_COLUMNS = new Set([...tables.values()].flatMap((s) => [...s]));

const files = fs.readdirSync(`${REPO}/js/data`).filter((f) => f.endsWith('.js')).map((f) => `${REPO}/js/data/${f}`);
let problems = 0, checked = 0, dynamic = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // Resolve module-level table-name constants (const INGREDIENTS = '...').
  // Without this, .from(INGREDIENTS) is invisible and the previous segment
  // BLEEDS forward — which invents false positives AND hides real ones.
  const consts = new Map();
  for (const m of src.matchAll(/^const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"`]([a-z_]+)['"`]/gm)) {
    consts.set(m[1], m[2]);
  }
  // Tables reachable via a dynamic .from(x): the values of any object/map
  // of table names in the file, plus resolved constants.
  const candidateTables = new Set([...consts.values()]);
  for (const m of src.matchAll(/['"`]([a-z_]+)['"`]/g)) {
    if (tables.has(m[1])) candidateTables.add(m[1]);
  }

  const parts = [...src.matchAll(/\.from\(\s*(?:['"`]([a-z_]+)['"`]|([A-Za-z_$][\w$]*(?:\([^)]*\))?))\s*\)/g)]
    .map((m) => ({
      table: m[1] || consts.get(m[2]) || null,
      raw: m[1] || m[2],
      index: m.index
    }));

  for (let i = 0; i < parts.length; i++) {
    const { table, raw } = parts[i];
    const seg = src.slice(parts[i].index, i + 1 < parts.length ? parts[i + 1].index : src.length);

    // A dynamic .from(expr) is legitimate (foods.js loops over the three
    // restrict tables; holidays.js switches on item kind). It is not
    // skipped: columns are validated against the union of tables the file
    // could plausibly be addressing, which still catches a typo.
    let cols, scope;
    if (table && tables.has(table)) {
      cols = tables.get(table); scope = table;
    } else {
      dynamic++;
      cols = new Set([...candidateTables].flatMap((t) => [...(tables.get(t) || [])]));
      scope = `<dynamic ${raw}>`;
      if (cols.size === 0) cols = ALL_COLUMNS;
    }

    const report = (col, kind) => {
      checked++;
      if (!cols.has(col)) {
        console.log(`  UNKNOWN COLUMN  ${file}  ${scope}.${col}  (${kind})`);
        problems++;
      }
    };

    for (const m of seg.matchAll(/\.(eq|neq|gt|gte|lt|lte|is|in|like|ilike|order)\(\s*['"`]([a-z_]+)['"`]/g)) {
      report(m[2], m[1]);
    }

    for (const m of seg.matchAll(/\.select\(\s*['"`]([^'"`]+)['"`]/g)) {
      const spec = m[1];
      if (spec.trim() === '*') continue;
      // Split top-level fields, keeping track of PostgREST embeds:
      // `foods(id, name)` is a RELATED TABLE, not a column of this one.
      let depth = 0, buf = '', fields = [];
      for (let k = 0; k < spec.length; k++) {
        const ch = spec[k];
        if (ch === '(') { if (depth === 0) buf += '\u0000'; depth++; continue; }
        if (ch === ')') { depth--; continue; }
        if (ch === ',' && depth === 0) { fields.push(buf); buf = ''; continue; }
        if (depth === 0) buf += ch;
      }
      fields.push(buf);
      for (const rawField of fields.map((x) => x.trim()).filter(Boolean)) {
        if (rawField.includes('\u0000')) {
          const embed = rawField.split('\u0000')[0].trim();
          checked++;
          if (!tables.has(embed)) {
            console.log(`  UNKNOWN EMBED   ${file}  ${scope} -> ${embed}(...)`);
            problems++;
          }
          continue;
        }
        if (/^[a-z_]+$/.test(rawField)) report(rawField, 'select');
      }
    }

    for (const m of seg.matchAll(/\.(insert|update|upsert)\(\s*\{([^}]*)\}/g)) {
      for (const k of m[2].matchAll(/(?:^|,)\s*([a-z_][a-z0-9_]*)\s*:/g)) report(k[1], m[1]);
    }
    // Payload objects built up before the call (buildFoodPayload, patch, etc)
    // are checked separately below.
  }
}

// Payload objects assigned to a variable and THEN passed to insert/update
// do not appear inside the call. Extracted by BALANCED BRACE COUNTING, not
// a regex: the earlier non-greedy `[\s\S]*?\n\s*\};` ran past the object
// it started in and flagged unrelated locals (computeMacros' `serves`, the
// export result's `exported_at`) as database columns.
/**
 * Blanks out // and /* *\/ comments, preserving length and newlines so every
 * index stays valid. Without this the key regex matches prose: a comment
 * reading "A CHECK-constrained column: ..." inside an object literal was
 * reported as a database column called `column`.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (two === '/*') {
      while (i < src.length && src.slice(i, i + 2) !== '*/') {
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    // Skip string bodies too: a table name inside a string is handled
    // elsewhere, and prose in a string should not be read as keys.
    if (src[i] === "'" || src[i] === '"' || src[i] === '`') {
      const quote = src[i];
      out += quote; i += 1;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < src.length) { out += quote; i += 1; }
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

function objectAt(src, braceIndex) {
  let depth = 0;
  for (let i = braceIndex; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(braceIndex + 1, i); }
  }
  return '';
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  // Comments and string bodies blanked, so prose cannot be read as keys.
  const src = stripComments(raw);
  for (const m of src.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g)) {
    const name = m[1];
    // Only objects that actually reach the database.
    const reaches = new RegExp(`\\.(insert|update|upsert)\\(\\s*${name}\\s*[,)]`).test(src);
    if (!reaches) continue;
    const body = objectAt(src, m.index + m[0].length - 1);
    // Top-level keys only (depth 0 within the object body).
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
      else if (depth === 0) {
        const rest = body.slice(i);
        const key = rest.match(/^([a-z_][a-z0-9_]*)\s*:/);
        if (key && (i === 0 || /[\s,{]/.test(body[i - 1]))) {
          checked++;
          if (!ALL_COLUMNS.has(key[1])) {
            console.log(`  UNKNOWN COLUMN  ${file}  ${name}.${key[1]}  (payload)`);
            problems++;
          }
          i += key[0].length - 1;
        }
      }
    }
  }
  // Keys assigned after construction: payload.foo = ...
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\.([a-z_][a-z0-9_]*)\s*=[^=]/g)) {
    const [, obj, key] = m;
    if (!new RegExp(`\\.(insert|update|upsert)\\(\\s*${obj}\\s*[,)]`).test(src)) continue;
    checked++;
    if (!ALL_COLUMNS.has(key)) {
      console.log(`  UNKNOWN COLUMN  ${file}  ${obj}.${key}  (payload assignment)`);
      problems++;
    }
  }
}

console.log(`\n${tables.size} tables in schema.md`);
console.log(`${checked} column/embed references checked across ${files.length} data modules`);
console.log(`${dynamic} dynamic .from() segments validated against candidate tables`);
console.log(problems === 0 ? 'SCHEMA CONFORMANCE PASSED' : `${problems} PROBLEM(S)`);
process.exit(problems === 0 ? 0 : 1);
