// js/lib/foodNames.js — 03 Oct 2026 v1
// Reference names are written for sorting a list: "Rice, basmati, dry",
// "Flour, plain", "Black pepper, ground". People say "basmati rice",
// "plain flour", "ground black pepper". This turns one into the other for
// places where a name is read, not weighed: a list of what you are missing,
// a checklist of what you have.
//
// A trailing state word (dry, dried, tinned, frozen, cooked) is dropped
// here, because "basmati rice" is what you look for on a shelf. Where the
// state matters to an amount (300 g of DRY rice), keep the full name.

const STATES = /^(dry|dried|tinned|frozen|cooked|fresh|raw)$/i;

export function everydayName(name) {
  let parts = String(name || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && STATES.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  if (parts.length === 1) return parts[0] || '';
  const [head, ...rest] = parts;
  const turned = `${rest.join(' ')} ${head.charAt(0).toLowerCase()}${head.slice(1)}`;
  return turned.charAt(0).toUpperCase() + turned.slice(1);
}
