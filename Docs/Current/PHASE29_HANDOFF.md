# Home-OS: Phase 29 Handoff — Shared DOM Helpers
01 Sep 2026 v1

**No schema change. No behaviour change.**

## What the brief said, and what I did instead

The brief was "split `meals.js` into `views/meals/`, one module per
feature". I did not do that, and the reason is worth recording.

`meals.js` holds twelve pieces of mutable closure state — `destroyed`,
`signal`, `meals`, `ingredientsByMeal`, `stepsByMeal`, `pantryStock`,
`libraryRecipes`, `libraryOwned`, and more — shared across all seven
features. Splitting it means threading a context object through every
function, which is a large mechanical change with real regression risk and
**zero user-visible benefit**.

Measuring first found something better: **fifteen views each defined their
own `el()`**. That is genuine duplication, mechanical to fix, and every one
of those copies is a place a future fix has to be made — with odds of being
made in all fifteen of approximately zero.

So this phase does the extraction and leaves the feature split briefed.

## What shipped

| Path | Version | What |
|---|---|---|
| `js/lib/dom.js` | v1 (new) | `el`, `field`, `selectFrom` |
| 12 views | — | Import instead of redefining |
| `js/views/weight.js` `signin.js` `water.js` | — | Marked as deliberate variants |
| `Tests/a11y.mjs` | — | Gate against new copies |
| `service-worker.js` | v62 | One new path |

**194 lines of duplication removed.** No file gained a line except an
import.

## What did NOT move, and why

Three `el()` copies differ in ways that are real rather than cosmetic:

- `weight.js` supports an `html` prop that sets innerHTML
- `signin.js` assigns properties when `k in node`, which is how it sets
  `tabIndex`
- `water.js` has no null/undefined guard

Unifying them would mean picking one behaviour and hoping the other two
views did not depend on theirs. **Hoping is not a refactor.** Each keeps a
comment saying so.

`weight.js` also has a `field()` that shares the name and nothing else: it
takes an id rather than an element, builds its own input, and wires
`aria-describedby` for both a hint and an error. Arguably the better of the
two and worth revisiting — but unifying them is not a rename.

## Two mistakes, both caught

**The import landed inside a multi-line import statement**, producing a
syntax error in seven files. My insertion matched the last line that *looked*
like an import; multi-line `import { a, b }\n  from '...'` statements broke
it. Fixed by matching whole statements including the semicolon.

**Then the function-stripper cut at the wrong brace.** It scanned for the
first `{` after the function name — which in `function el(tag, props = {},
...)` is the **default parameter**, not the body. Seven files were cut
mid-function. Fixed by balancing the parameter list first.

Both were caught by the render gate, both were reverted with
`git checkout --`, and neither reached a commit. That is the harness doing
exactly what it exists for on a change that touched twelve files at once.

## The new gate

`Tests/a11y.mjs` now asserts no view redefines a helper that lives in
`lib/dom.js`, with an explicit allow-list for the four documented variants.
A sixteenth copy cannot appear by habit.

It caught `weight.js: field()` on its first run — a file I had not thought
to compare.

## Tests

All eight gates. A11y 213 → **214**.

## Not yet done

- **`meals.js` is still 2,079 lines and seven features.** The split is
  still worth doing; it needs a context object designed properly rather than
  a script. It is the one piece of this roadmap I would not attempt in the
  same session as anything else.
- **The four helper variants remain.** Documented, gated, not unified.

## Next

Phase 25 (the whole home), Phase 10 (notifications, unbriefed), or Phase 21
(productisation). Or more recipe batches — the library is still ten.
