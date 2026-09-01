# Home-OS: Recipe Step Style (Canonical)
01 Sep 2026 v1

**Every recipe method in this app is written to this style** — the seeded
library (Phase 16), anything imported from a photograph (Phase 17), and
anything typed in by hand. There is no "author's voice" tier. A recipe you
cannot follow while tired, distracted or overloaded is not a recipe, it is
a paragraph.

This exists because instructions in cookbooks are written to be *read*, and
these are written to be *executed*, one at a time, standing up, holding
something hot.

---

## The eleven rules

**1. One action per step.** If the sentence contains "and" joining two
physical actions, it is two steps. "Chop the onion and fry it" is two steps.
"Salt and pepper" is one thing and stays.

**2. No "meanwhile".** Parallel work gets its own numbered step, placed
where you actually start it, flagged `while_waiting` so the card can show it
alongside the timer rather than after it.

**3. Restate the quantity inside the step.** "Add the 400g tin of chopped
tomatoes", never "add the tomatoes". You should never have to scroll back
to the ingredient list mid-cook. The step-to-ingredient link makes this
automatic — write `{{ing:tomatoes}}` and the renderer substitutes the real
quantity, scaled for however many you are serving.

**4. Name the equipment the first time it appears.** "Put a large pan on a
medium heat", not "heat the pan". You do not yet have a pan.

**5. Give a clock time AND a finish signal.** "Fry for 8 minutes, until the
onion is see-through and soft." The clock is for planning, the signal is for
knowing. Either alone is a guess.

**6. Twenty words is the ceiling.** If a step needs more, it is two steps or
it contains an explanation that belongs in `note`.

**7. Plain words. Gloss anything technical, once, inline.** "Simmer (small
bubbles, not a rolling boil)". "Deglaze" does not appear at all; write what
you actually do.

**8. Explanations go in `note`, not in the instruction.** The instruction is
what to do. The note is why, or what it should look like, or what to do if
it has gone wrong. The card shows notes smaller and secondary, so a step can
be read without them.

**9. No implied prior knowledge and no forward references.** Never "as
before", "the usual way", or "reserve some for later" without saying how
much and putting it somewhere named.

**10. Steps are tickable and the ticks persist.** Cook mode holds state
through a screen lock, a phone call and a page reload. Losing your place
because you answered the door is exactly the failure this app exists to
prevent.

**11. No-shame framing holds here too.** No "simply", "just", "obviously",
"quickly" or "easy". They are all ways of telling someone that struggling is
their fault. Behavioural principle 1, applied to cooking.

---

## Structure of a step

| Field | Purpose |
|---|---|
| `instruction` | The action. Imperative, ≤20 words, one thing. |
| `note` | Optional. Why, what it looks like, what to do if wrong. |
| `duration_min` | Optional. Drives a timer button on the card. |
| `step_group` | Optional. "Prep", "Sauce", "To serve". Groups the list. |
| `while_waiting` | Boolean. Rule 2. |

---

## Worked example — Puttanesca

Wrong (how a cookbook writes it):

> Gently sauté the garlic and anchovies in olive oil until the anchovies
> have melted, then add the tomatoes, olives and capers and simmer until
> reduced. Meanwhile cook the spaghetti.

Right:

1. Put a large pan of water on a high heat for the pasta. *(note: it takes
   a while to boil, so it goes on first.)*
2. Put a wide frying pan on a low heat. Add 2 tbsp olive oil.
3. Add 3 chopped garlic cloves. Cook 2 minutes, until it smells sweet.
   *(note: low heat. Browned garlic turns bitter.)*
4. Add 4 anchovy fillets. Stir 2 minutes, until they fall apart.
   *(note: they dissolve into the oil. This is meant to happen.)*
5. Add the 400g tin of chopped tomatoes.
6. Add 100g olives and 2 tbsp capers.
7. Turn the heat to medium. Cook 12 minutes, until it looks thick rather
   than watery.
8. `while_waiting` — the water should be boiling now. Add 300g spaghetti.
   Cook for the time on the packet.
9. Drain the spaghetti. Keep a mugful of the water.
10. Tip the spaghetti into the sauce. Stir. *(note: if it looks dry, add
    the pasta water a splash at a time.)*

Ten short steps instead of two long sentences, and every quantity is where
you need it.

---

## Copyright, stated plainly

Ingredient lists and functional cooking method are facts and procedures, and
are not protected. The author's prose, headnotes and descriptions are.

So: **nothing is ever transcribed.** Phase 17 extracts the ingredients and
the sequence of actions from a photograph and rewrites the method into this
style from scratch. The eleven rules above make that rewrite mandatory
anyway — a cookbook paragraph cannot survive rule 1 intact.

One rule serves both the legal position and the accessibility goal. That is
not a coincidence; both want the same thing, which is the procedure separated
from the performance.
