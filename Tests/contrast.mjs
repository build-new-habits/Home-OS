// Contrast for every colour pair the Phase 6 CSS introduces, across all
// four theme combinations. Standing rule 11: the 1.4.11 failure found in
// the Phase 5 audit sat undetected since Phase 2 because only the default
// theme was ever checked by eye.

const THEMES = {
  'default / standard': {
    bg: '#F7F5F1', surface: '#FFFFFF', surfaceRaised: '#FCFBF9', border: '#DEDAD2',
    text: '#23261F', textMuted: '#5B5F55', accent: '#35635C', accentStrong: '#234641',
    accentContrast: '#FFFFFF', neutralChip: '#EDEAE3'
  },
  'dusk / standard': {
    bg: '#1B1E19', surface: '#23261F', surfaceRaised: '#2A2E24', border: '#3A3F33',
    text: '#EDEAE1', textMuted: '#B3B3A6', accent: '#7FB6AA', accentStrong: '#A6D2C6',
    accentContrast: '#12201C', neutralChip: '#2E3227'
  },
  'default / high': {
    bg: '#FFFFFF', surface: '#FFFFFF', surfaceRaised: '#FFFFFF', border: '#000000',
    text: '#000000', textMuted: '#2B2B2B', accent: '#0B3D37', accentStrong: '#04211D',
    accentContrast: '#FFFFFF', neutralChip: '#E7E7E7'
  },
  'dusk / high': {
    bg: '#000000', surface: '#000000', surfaceRaised: '#000000', border: '#FFFFFF',
    text: '#FFFFFF', textMuted: '#E6E6E6', accent: '#9FE0D2', accentStrong: '#C9EFE5',
    accentContrast: '#000000', neutralChip: '#1A1A1A'
  }
};

// --control-border is an alias for --color-text-muted (components.css v6).
for (const t of Object.values(THEMES)) t.controlBorder = t.textMuted;

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [description, foreground key, background key, required ratio]
const PAIRS = [
  ['.plan-table thead th text on chip',        'text',          'neutralChip', 4.5],
  ['.plan-table tbody th (day) text on chip',  'text',          'neutralChip', 4.5],
  ['.plan-empty "Nothing planned" on page',    'textMuted',     'bg',          4.5],
  ['.plan-entry-name on page',                 'text',          'bg',          4.5],
  ['.plan-entry-serves on page',               'textMuted',     'bg',          4.5],
  ['.plan-serves-input BORDER vs cell',        'controlBorder', 'bg',          3.0],
  ['.plan-serves-input text on its fill',      'text',          'surface',     4.5],
  ['.ingredient-name on card',                 'text',          'surface',     4.5],
  ['.ingredient-unit "g" on card',             'textMuted',     'surface',     4.5],
  ['ingredient qty input BORDER vs card',      'controlBorder', 'surface',     3.0],
  ['.macro-list on card',                      'text',          'surface',     4.5],
  ['.btn-small BORDER vs card',                'controlBorder', 'surface',     3.0],
  ['.btn-small label on card',                 'text',          'surface',     4.5],
  ['.scanner-status on dialog',                'text',          'surface',     4.5],
  ['.food-form summary on page',               'text',          'bg',          4.5],
  ['plan section .field-hint on page',         'textMuted',     'bg',          4.5],
  ['data-table caption on card',               'textMuted',     'surface',     4.5],
  // --- Phase 8 ---
  ['.check-toggle complete label on chip',     'text',          'neutralChip', 4.5],
  ['.check-toggle BORDER vs card',             'controlBorder', 'surface',     3.0],
  ['.check-title on card',                     'text',          'surface',     4.5],
  ['.send-shopping label on card',             'text',          'surface',     4.5],
  // accent-color paints the checkbox itself; it must read against the card.
  ['send-to-shopping checkbox vs card',        'accent',        'surface',     3.0],
  ['.weekday-set legend on card',              'text',          'surface',     4.5],
  ['.preview text on chip',                    'text',          'neutralChip', 4.5],
  ['.factor-prompt text on chip',              'text',          'neutralChip', 4.5],
  ['.factor-prompt input BORDER vs chip',      'controlBorder', 'neutralChip', 3.0],
  ['.food-picker search BORDER vs card',       'controlBorder', 'surface',     3.0],
  ['.item-group h4 on card',                   'text',          'surface',     4.5]
];

let fails = 0;
for (const [name, theme] of Object.entries(THEMES)) {
  console.log(`\n${name}`);
  for (const [desc, fg, bg, need] of PAIRS) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= need;
    if (!ok) fails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (needs ${need}:1)  ${desc}`);
  }
}
console.log('');
console.log(fails === 0
  ? `CONTRAST PASSED — ${PAIRS.length} pairs x 4 theme combinations = ${PAIRS.length * 4} checks`
  : `CONTRAST FAILED — ${fails} pair(s) below requirement`);
process.exit(fails === 0 ? 0 : 1);
