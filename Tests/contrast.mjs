// Contrast for every colour pair the Phase 6 CSS introduces, across all
// four theme combinations. Standing rule 11: the 1.4.11 failure found in
// the Phase 5 audit sat undetected since Phase 2 because only the default
// theme was ever checked by eye.

const THEMES = {
  'default / standard': {
    bg: '#F1F3EE', surface: '#FFFFFF', surfaceRaised: '#F8FAF6', border: '#D5DAD3',
    text: '#1C2620', textMuted: '#4E5A52', accent: '#2B6649', accentStrong: '#1E4A35',
    accentContrast: '#FFFFFF', neutralChip: '#E1EDE4',
    stateFresh: '#2F5C54', stateSoon: '#7A4E12', statePast: '#8C3A2A', stateUnknown: '#4E5A52',
    mealBreakfast: '#F7E3A3', mealBreakfastInk: '#5E4300', mealLunch: '#CDE5D2', mealLunchInk: '#1C4D33',
    mealDinner: '#3A2F52', mealDinnerInk: '#FFFFFF', mealSnack: '#F6CFB6', mealSnackInk: '#6E3412',
    mealDrink: '#CFE0F1', mealDrinkInk: '#1A4670'
  },
  'dusk / standard': {
    bg: '#1B1E19', surface: '#23261F', surfaceRaised: '#2A2E24', border: '#3A3F33',
    text: '#EDEAE1', textMuted: '#B3B3A6', accent: '#7FB6AA', accentStrong: '#A6D2C6',
    accentContrast: '#12201C', neutralChip: '#2E3227',
    stateFresh: '#8CC4B7', stateSoon: '#E0B173', statePast: '#E8A091', stateUnknown: '#B3B3A6',
    mealBreakfast: '#4A3B12', mealBreakfastInk: '#F7E3A3', mealLunch: '#1F3B2B', mealLunchInk: '#CDE5D2',
    mealDinner: '#4B3D6B', mealDinnerInk: '#FFFFFF', mealSnack: '#4D2A17', mealSnackInk: '#F6CFB6',
    mealDrink: '#1D3550', mealDrinkInk: '#CFE0F1'
  },
  'default / high': {
    bg: '#FFFFFF', surface: '#FFFFFF', surfaceRaised: '#FFFFFF', border: '#000000',
    text: '#000000', textMuted: '#2B2B2B', accent: '#0B3D37', accentStrong: '#04211D',
    accentContrast: '#FFFFFF', neutralChip: '#E7E7E7',
    stateFresh: '#0B3D37', stateSoon: '#5C3B00', statePast: '#7A1E10', stateUnknown: '#2B2B2B',
    mealBreakfast: '#FFF1B8', mealBreakfastInk: '#000000', mealLunch: '#D6F0DC', mealLunchInk: '#000000',
    mealDinner: '#2B1F45', mealDinnerInk: '#FFFFFF', mealSnack: '#FFD9C2', mealSnackInk: '#000000',
    mealDrink: '#D4E6F7', mealDrinkInk: '#000000'
  },
  'dusk / high': {
    bg: '#000000', surface: '#000000', surfaceRaised: '#000000', border: '#FFFFFF',
    text: '#FFFFFF', textMuted: '#E6E6E6', accent: '#9FE0D2', accentStrong: '#C9EFE5',
    accentContrast: '#000000', neutralChip: '#1A1A1A',
    stateFresh: '#9FE0D2', stateSoon: '#F0C285', statePast: '#FFB3A3', stateUnknown: '#E6E6E6',
    mealBreakfast: '#3D3000', mealBreakfastInk: '#FFFFFF', mealLunch: '#0F3320', mealLunchInk: '#FFFFFF',
    mealDinner: '#2B1F45', mealDinnerInk: '#FFFFFF', mealSnack: '#46200A', mealSnackInk: '#FFFFFF',
    mealDrink: '#0B2A47', mealDrinkInk: '#FFFFFF'
  }
};

// --control-border is an alias for --color-text-muted (moved to tokens.css
// in Phase 26; it is a token, and 21 rules depend on it).
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
  // ---- Kitchen rebuild K3: meal colours. Words and icons sit on these
  // tints, so they are held to text contrast. ----
  ['breakfast ink on its tint', 'mealBreakfastInk', 'mealBreakfast', 4.5],
  ['lunch ink on its tint',     'mealLunchInk',     'mealLunch',     4.5],
  ['dinner ink on its tint',    'mealDinnerInk',    'mealDinner',    4.5],
  ['snack ink on its tint',     'mealSnackInk',     'mealSnack',     4.5],
  ['drink ink on its tint',     'mealDrinkInk',     'mealDrink',     4.5],
  // Phase 28. A hub icon carries meaning at a glance, so it is held to the
  // 3:1 required of a meaningful graphic (WCAG 1.4.11), not left untested
  // because it is "just an icon".
  ['hub icon vs page background',              'accent',        'bg',          3.0],
  ['hub icon vs card',                         'accent',        'surface',     3.0],
  // ---- Phase 26 semantic state ----
  // These carry meaning, so they are held to text contrast (4.5:1), not the
  // 3:1 that would be allowed for a decorative graphic. Each is checked on
  // BOTH the page and a card, because state badges appear on both.
  ['.state-fresh on page',                     'stateFresh',    'bg',          4.5],
  ['.state-fresh on card',                     'stateFresh',    'surface',     4.5],
  ['.state-soon on page',                      'stateSoon',     'bg',          4.5],
  ['.state-soon on card',                      'stateSoon',     'surface',     4.5],
  ['.state-past on page',                      'statePast',     'bg',          4.5],
  ['.state-past on card',                      'statePast',     'surface',     4.5],
  ['.state-unknown on page',                   'stateUnknown',  'bg',          4.5],
  ['.state-unknown on card',                   'stateUnknown',  'surface',     4.5],
  ['.count-chip number on its chip',           'text',          'neutralChip', 4.5],
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
  // --- Phase 7 pantry ---
  ['.use-soon-item text on chip',              'text',          'neutralChip', 4.5],
  ['.use-soon-item hint on chip',              'textMuted',     'neutralChip', 4.5],
  ['.stock-qty-row input BORDER vs card',      'controlBorder', 'surface',     3.0],
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
// ---- The table above must be the colours that ship (3 Oct 2026) ----
// This gate checks hex values written here, not the stylesheet. Without
// this, a palette change in tokens.css passes a gate that is still testing
// the old one. The light theme's base and meal colours are read from
// tokens.css and compared.
{
  const { readFileSync } = await import('node:fs');
  const REPO = process.env.GATE_REPO || process.cwd();
  const css = readFileSync(`${REPO}/css/tokens.css`, 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('[data-theme="dusk"]'));
  const read = (name) => { const m = root.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`)); return m ? m[1].toUpperCase() : null; };
  const light = THEMES['default / standard'];
  const MAP = { 'color-bg': 'bg', 'color-surface': 'surface', 'color-text': 'text', 'color-text-muted': 'textMuted',
    'color-accent': 'accent', 'color-accent-strong': 'accentStrong', 'color-neutral-chip': 'neutralChip',
    'meal-breakfast': 'mealBreakfast', 'meal-breakfast-ink': 'mealBreakfastInk', 'meal-lunch': 'mealLunch',
    'meal-lunch-ink': 'mealLunchInk', 'meal-dinner': 'mealDinner', 'meal-dinner-ink': 'mealDinnerInk',
    'meal-snack': 'mealSnack', 'meal-snack-ink': 'mealSnackInk', 'meal-drink': 'mealDrink', 'meal-drink-ink': 'mealDrinkInk' };
  console.log('\ntokens.css agrees with this table');
  for (const [token, key] of Object.entries(MAP)) {
    const shipped = read(token);
    const ok = shipped === String(light[key]).toUpperCase();
    if (!ok) fails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  --${token}  shipped ${shipped}, tested ${light[key]}`);
  }
}

console.log('');
console.log(fails === 0
  ? `CONTRAST PASSED — ${PAIRS.length} pairs x 4 theme combinations = ${PAIRS.length * 4} checks`
  : `CONTRAST FAILED — ${fails} pair(s) below requirement`);
process.exit(fails === 0 ? 0 : 1);
