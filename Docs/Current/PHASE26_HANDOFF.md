# Home-OS: Phase 26 Handoff — Design Foundations
01 Sep 2026 v1

**Schema revision 15.** One column. Run before pulling.

## What shipped

| Path | Version | What |
|---|---|---|
| `css/tokens.css` | **v2** | First revision since 14 July |
| `js/lib/icons.js` | v1 (new) | Icon set, state badges, count chips |
| `css/components.css` | v33 | State components, compact density |
| `js/app.js` | v5 | Applies `data-density` |
| `js/views/settings.js` | v8 | Spacing control |
| `js/views/pantry.js` | v8 | Freshness as shape + colour + words |
| `js/data/settings.js` | v6 | Density default |
| `service-worker.js` | v55 | One new path |

## The write-once rule, lifted once

`tokens.css` was on the write-once list. It was written in July for three
screens and never revised while the app grew to sixteen — so everything
since has been styled *against* it rather than *by* it, which is exactly why
the app reads as text-heavy.

Lifted deliberately, documented in the file header, **back on the list at
v2**.

`app.js` gained one line. Its rule reads "app.js owns bootstrap"; applying a
fourth display attribute alongside theme, contrast and brightness is that
function doing its job.

## What was actually missing

Less than the audit implied, and I should say so: the type scale, spacing
rhythm, motion tokens, elevation and four themes were all already there and
sound. `--control-border` and reduced-motion handling both existed.

The genuine gap was **semantic state**. `data/pantry.js` has had four
freshness states — fresh, soon, past, unknown — since Phase 7, and not one
of them had any visual representation. Every one was a sentence you had to
read. That is the whole gap against the leading neurodivergent apps: their
state is visible, ours was written down.

## Decisions worth knowing

**Colour was verified before a line of CSS was written.** All sixteen
combinations (four states × four themes) computed at ≥4.5:1 against both
`--color-bg` and `--color-surface` before committing to them. Lowest is
6.0:1. The contrast gate now asserts all of it — **40 pairs × 4 themes =
160 checks**, up from 124.

**State is held to text contrast, not graphic contrast.** These carry
meaning, so 4.5:1, not the 3:1 a decorative graphic could claim.

**Never colour alone.** Every state has a *different shape* — circle,
triangle, diamond, dashed circle — distinguishable in greyscale, plus its
words. There is a test asserting all four shapes differ.

**"Past best" is amber-red.** That is a fact about food, not a judgement
about you. Principle 1 still forbids alarm colour for anything a person did
or did not do.

**Compact scales spacing only.** Type size, tap targets and line height are
untouched, and the Settings hint says so out loud — the fear with any
"compact" control is that it will shrink the text.

**Icons are inline SVG on `currentColor`.** No icon font: a download, a
flash of missing glyphs, and a screen reader announcing ligatures. Inheriting
`currentColor` means icons inherit contrast we already test. Unlabelled by
default, because an icon beside a text label is decorative and announcing
both is noise.

**An unknown icon name returns null.** A typo degrades to no icon, never to
a broken box.

## A mistake worth recording

I put the icon tests in the behaviour gate, which runs in **plain node with
no `document`**. They crashed the entire gate — 355 assertions lost to one
bad import site.

Moved to the a11y gate, which has jsdom. Behaviour keeps only the pure
surface (the catalogue). A11y went 176 → **188 checks**.

The lesson for later phases: **behaviour.mjs is pure logic, a11y.mjs is
anything that touches DOM.** Nothing else was wrong with the tests.

## Tests

All eight gates. Behaviour 355 → 358, a11y 176 → 188, contrast 124 → 160.

## Not yet done

- **Icons are only used in the pantry so far.** The set exists and is
  tested; wiring it through the other screens belongs with Phase 28.
- **`--density-scale` is defined and unused.** It exists for components that
  need to scale something other than spacing; nothing needs it yet.
- **No visual regression testing.** The gates prove structure and contrast,
  not that a screen looks right. Screenshot review stays a human job.

## Next

Phase 24 — Plan the week.
