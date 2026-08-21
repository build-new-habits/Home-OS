# Home-OS: verification harness

```
bash Tests/run-all.sh
```

Needs node 18+ and `jsdom`. Nothing else, no network, no Supabase.

**This is for an AI build session, not for the coordinator.** Graeme deploys
by copy-pasting files through the GitHub web UI and has no CLI; these gates
exist so a session cannot ship a class of bug that has already shipped once.
They are committed because until 21 Aug 2026 they lived in a session sandbox
and died with it, which meant every session rebuilt them from scratch and
re-derived the same lessons.

**These gates do not replace the smoke test.** Every significant defect this
project has hit was found by Graeme on a real device. The gates catch what
can be caught without a browser, a camera, or a real database — which is a
useful amount, and not the whole of it.

---

## What each gate is for

### `render-gate.mjs` — the important one

Executes all 10 route views plus both `signin.js` builders in jsdom against
a stubbed Supabase client.

**Why it exists.** On 18 Aug 2026 a `ReferenceError` (`el is not defined`)
shipped to `main` and broke the settings screen. The pre-commit check was
`node --check`, which parses syntax and therefore passes an undefined
identifier happily — it only fails when the line executes. The call sat in a
branch nothing exercised before deploy.

**It is proven to catch that bug.** Inject a call to a function the file does
not define, and `node --check` passes while this gate fails with the
`ReferenceError`. Re-prove it after any change to the gate itself.

`signin.js` is covered despite not being a route, because that 18 Aug bug was
in exactly this kind of non-route code path. Its builders paint into
`document.body` and return nothing, so the assertion is "did it produce a
screen with an `<h1>`", not "did it return a node".

### `behaviour.mjs` — 51 assertions

Macro totals against a **hand calculation**, not against themselves. Zero
treated as a real measurement rather than missing data. `serves_override`
changing per-serving figures only. Barcode normalisation, including the
UPC-A case that produces duplicate rows if it is wrong. The kJ→kcal
conversion, which silently overstates every product by 4.184× if skipped.
Open Food Facts mapping, including refusing a nameless product.

### `queue.mjs` — 12 assertions

Two jobs. Proves the `offlineQueue.js` v3 fix: a failed `indexedDB.open()`
must not be memoised, or one transient failure leaves the queue silently
dead for the whole session. And re-proves the Phase 5 table-scoping
guarantee, because that fix is what protects every other module's queued
writes — `flush()` must skip a foreign op, never consume it.

### `a11y.mjs` — 22 checks on the **rendered DOM**

Not on the source. Labels that resolve to a real control, buttons with
accessible names, no duplicate ids, `aria-describedby` targets that exist,
`scope` on every table header, action buttons that name day *and* slot,
units present as text on every figure, heading levels that never skip.

Structure only. It cannot tell you whether a screen reader reads well or
whether the keyboard order makes sense — that is the smoke test.

### `contrast.mjs` — 68 checks

Every colour pair × all four theme combinations (default/dusk ×
standard/high). Standing rule 11 exists because a 1.4.11 failure sat
undetected from Phase 2 to Phase 5: only the default theme was ever checked
by eye.

Token values are **duplicated** from `css/tokens.css` here. That file is
write-once and not parseable from Node without a CSS parser, so the copy is
deliberate — but it means a token change must be mirrored here or the gate
silently checks the wrong colours.

---

## How the stub works

`run-all.sh` copies the repo to `$TMPDIR/home-os-gate` and replaces
`js/supabaseClient.js` with a one-line stub. Every module then imports the
client through its **real path**, so nothing about the module graph is faked,
and the stub can never leak into a commit.

The stub's query builder is a thenable where every chained method returns
itself, and awaiting yields `{ data, error }` — matching supabase-js, which
**resolves rather than rejects** on database errors. That is the trap this
project has hit before, so the stub reproduces it rather than smoothing it
over.

`node_modules` is linked into the shadow root rather than exported as
`NODE_PATH`, because **`NODE_PATH` does not work for ES modules** —
resolution is by directory walk-up only.

---

## Adding to these

When a phase adds a view, add it to `VIEWS` in `render-gate.mjs`. When it
adds a colour pair, add it to `PAIRS` in `contrast.mjs`. When a gate finds a
real bug, add the assertion that would have caught it earlier and say in the
comment which bug it was — the comments in these files are the reason they
are worth keeping, not the assertions.
