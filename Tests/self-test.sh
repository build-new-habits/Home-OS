#!/bin/bash
# Proves the render gate still catches the bug it was written for.
#
# On 18 Aug 2026 a ReferenceError shipped to main because `node --check`
# passes an undefined identifier. This injects that exact failure mode into
# a throwaway copy and asserts that `node --check` PASSES while the gate
# FAILS. Run it after any change to render-gate.mjs — a gate nobody has
# proven is a gate nobody should trust.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BROKEN="${TMPDIR:-/tmp}/home-os-selftest"

MODULES=""
for c in "${JSDOM_MODULES:-}" "$REPO/node_modules" "$HOME/gate/node_modules" \
         "/home/claude/gate/node_modules" "/tmp/h/node_modules"; do
  [ -n "$c" ] && [ -d "$c/jsdom" ] && MODULES="$c" && break
done
[ -z "$MODULES" ] && { echo "jsdom not found — see Tests/README.md"; exit 1; }

rm -rf "$BROKEN"; cp -r "$REPO" "$BROKEN"
printf 'export const supabase = globalThis.__HOME_OS_SUPABASE_STUB__;\n' > "$BROKEN/js/supabaseClient.js"
ln -s "$MODULES" "$BROKEN/node_modules"

# Valid syntax, undefined identifier, on a path that only runs at render.
python3 - "$BROKEN" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'js/views/meals.js'
s = p.read_text()
needle = "mountEl.appendChild(el('h1', { text: 'Meals' }));"
assert needle in s, "self-test anchor not found — update it to match views/meals.js"
p.write_text(s.replace(needle, "mountEl.appendChild(helperThatDoesNotExist('h1', { text: 'Meals' }));", 1))
PY

echo "--- node --check (should PASS, which is the whole point) ---"
if node --check "$BROKEN/js/views/meals.js"; then
  echo "node --check: PASSED on code containing an undefined identifier."
else
  echo "UNEXPECTED: node --check rejected it. Self-test assumption is stale."; exit 1
fi

echo ""
echo "--- render gate (should FAIL) ---"
if ( cd "$BROKEN" && GATE_REPO="$BROKEN" node "$BROKEN/Tests/render-gate.mjs" ) >/dev/null 2>&1; then
  echo "SELF-TEST FAILED: the gate passed broken code. It is not protecting anything."
  exit 1
fi
( cd "$BROKEN" && GATE_REPO="$BROKEN" node "$BROKEN/Tests/render-gate.mjs" 2>&1 ) | grep -E "FAIL|ReferenceError" | head -3
echo ""
echo "SELF-TEST PASSED — node --check let it through, the gate did not."
rm -rf "$BROKEN"
