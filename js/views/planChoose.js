// js/views/planChoose.js — 10 Sep 2026 v2
// v2: the answer goes back to the page that asked the question.
//
// Choosing a meal, on its own screen.
//
// ---- Why ----
// Device test, 6 Sep 2026: "It's there but not very tidy. We seem to still
// have a collapsible and expandable experience rather than pages/screens
// and cards."
//
// The picker was built inline in the add-to-plan form, with its filters
// behind a fold. That put a search box, three chips, a fold, five more
// chips and a scrolling list inside a form that already had two selects
// above it and two fields below — a screen inside a screen.
//
// Choosing what to eat deserves the whole screen. You arrive knowing the
// day and the meal time, you leave having decided, and the form you came
// from is waiting with the answer filled in.

import { el } from '../lib/dom.js';
import { pageHeading } from '../lib/icons.js';
import { listMeals } from '../data/meals.js';
import { createMealPicker } from '../components/mealPicker.js';
import { readDraft, writeDraft, returnPathFor } from '../lib/planDraft.js';
import { navigate } from '../router.js';
import { announce } from '../lib/a11y.js';

const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
};

const SLOT_LABELS = {
  breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'a snack'
};

// Which week, said out loud. Thursday is Thursday on both pages, and a
// person who came here from Next week deserves to be told that is still
// where they are.
const WEEK_LABELS = { next: ' next week', today: '', week: '' };

export function render(mountEl) {
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;
  let meals = [];

  const draft = readDraft();

  // Where the answer has to be delivered. Read once, up front, so the Back
  // link and the choice itself cannot disagree about where you came from.
  const returnPath = returnPathFor(draft);

  mountEl.appendChild(pageHeading('Choose a meal', 'meals'));

  // What you are actually deciding. Without this the screen is a list of
  // recipes with no idea what it is for, and "Lunch" in a filter is not the
  // same as being told you are picking Tuesday's lunch.
  const context = el('p', { class: 'choose-context' });
  const dayLabel = DAY_LABELS[draft.day];
  const slotLabel = SLOT_LABELS[draft.slot];
  const weekLabel = WEEK_LABELS[draft.origin] || '';
  context.textContent = dayLabel && slotLabel
    ? `For ${dayLabel} ${slotLabel}${weekLabel}.`
    : 'Pick something to add to the week.';
  mountEl.appendChild(context);

  // Back to the page that sent you, not to the hub. Leaving without
  // choosing should put you where you were, with the plan you were reading
  // still on screen.
  const back = el('a', {
    class: 'btn btn-quiet', href: `#/${returnPath}`, text: 'Back to the plan'
  });
  mountEl.appendChild(back);

  const picker = createMealPicker({
    signal,
    getMeals: () => meals,
    onChoose: ({ id, name }) => {
      if (destroyed) return;
      writeDraft({ mealId: id, mealName: name });
      announce(`${name} chosen.`);
      // Straight back to the page that asked. `meal-plan` was correct until
      // 7 Sep 2026, when the plan became a hub and the form moved onto the
      // week pages — after which this line delivered every choice to a
      // screen that had no form to put it in.
      navigate(returnPath);
    }
  });

  picker.setSlot(draft.slot || '');
  mountEl.appendChild(picker.element);
  picker.load();

  (async () => {
    const result = await listMeals();
    if (destroyed) return;
    if (result.ok) {
      meals = result.data;
      picker.refresh();
    }
  })();

  return () => {
    destroyed = true;
    controller.abort();
  };
}
