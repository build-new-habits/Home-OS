#!/bin/bash
# Home-OS verification harness. Run from anywhere: bash Tests/run-all.sh
#
# Builds a SHADOW COPY of the repo in $TMPDIR with js/supabaseClient.js
# swapped for a stub, then runs every gate against it. The real tree is never
# modified and no network is touched.
#
# Why a shadow copy rather than monkey-patching the module loader: every view
# then imports the client through its REAL path, so nothing about the module
# graph is faked. It also means the stub can never leak into a commit.
#
# This is for an AI build session. The coordinator deploys by copy-paste
# through the GitHub web UI and has no CLI — see Tests/README.md.
set -u

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SHADOW="${TMPDIR:-/tmp}/home-os-gate"

# --- jsdom -------------------------------------------------------------
# render-gate and a11y need it. node_modules is deliberately not committed.
# NOTE: NODE_PATH does NOT work for ES modules — resolution is by directory
# walk-up only. So the modules are linked into the shadow root, where the
# gates run from, rather than exported as an environment variable.
MODULES=""
for candidate in "${JSDOM_MODULES:-}" "$REPO/node_modules" "$PWD/node_modules" \
                 "$HOME/node_modules" "$HOME/gate/node_modules" \
                 "/home/claude/gate/node_modules" "/tmp/h/node_modules"; do
  [ -n "$candidate" ] && [ -d "$candidate/jsdom" ] && MODULES="$candidate" && break
done
if [ -z "$MODULES" ]; then
  echo "jsdom is not installed. Install it, then re-run:"
  echo "  mkdir -p /tmp/h && cd /tmp/h && npm init -y && npm install jsdom"
  echo "  JSDOM_MODULES=/tmp/h/node_modules bash Tests/run-all.sh"
  echo ""
  echo "Without it, render-gate.mjs and a11y.mjs cannot run — and those two"
  echo "are the ones that catch the ReferenceError class of bug that shipped"
  echo "to production on 18 Aug 2026. Do not treat a partial run as a pass."
  exit 1
fi

rm -rf "$SHADOW"
cp -r "$REPO" "$SHADOW"
cat > "$SHADOW/js/supabaseClient.js" <<'STUB'
// HARNESS STUB — not the real client. Exists only inside the shadow copy.
export const supabase = globalThis.__HOME_OS_SUPABASE_STUB__;
STUB
ln -s "$MODULES" "$SHADOW/node_modules"

echo "repo:    $REPO"
echo "shadow:  $SHADOW"
echo "jsdom:   $MODULES"

fail=0
run() {
  echo ""
  echo "=============================================================="
  echo "  $1"
  echo "=============================================================="
  ( cd "$SHADOW" && GATE_REPO="$SHADOW" node "$SHADOW/Tests/$2" ) || fail=1
}

run "Render gate — every view executed in jsdom"     render-gate.mjs
run "Behaviour — macros, barcodes, Open Food Facts"  behaviour.mjs
run "Offline queue — retry and table scoping"        queue.mjs
run "Accessibility — structure of the rendered DOM"  a11y.mjs
run "Contrast — every pair, all four themes"         contrast.mjs

echo ""
if [ "$fail" -eq 0 ]; then
  echo "ALL GATES PASSED"
else
  echo "ONE OR MORE GATES FAILED — do not commit"
fi
exit "$fail"
