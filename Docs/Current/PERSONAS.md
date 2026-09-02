# Home-OS: Personas and Lived Experience
01 Sep 2026 v1

Eight people, walked through the app **as it actually is at commit
`42aec3b`** — not as briefed, not as intended. Every friction below is
traceable to real code or a real gap.

Written to find problems. A persona document where everybody loves the
product is a marketing exercise, and two of these people churn.

---

## The finding that outranks everything else

**A second adult cannot join a household.** `js/data/household.js` says it
plainly: *"There is no invite flow yet (Phase 21)."* Members can be added
without a sign-in — which is right for children — but a partner with their
own phone cannot get in without someone running SQL.

Three of the eight personas below are half of a couple. For all three, the
app's central promise — a shared cupboard, a shared list, a plan you both
see — **does not work**. They do not experience it as "not built yet". They
experience it as the app not doing the thing it said it did.

This is not the biggest engineering job left. It is the biggest gap between
what the app claims and what it delivers.

---

## 1. Dev — busy dad, 41, ADHD, family of four

Two children (9 and 6), works shifts, partner works full time. Diagnosed at
36. Cooks four nights a week. Has tried and abandoned Todoist, Notion,
Cozi, and two meal planners.

**Week 1.** The first run lands well. He picks Cottage Pie, puts it on
Thursday, and the shopping list fills in front of him. *"That's the first
app that's ever shown me the point of itself in a minute."*

Adds both kids as members at 0.6 portions. Genuinely delighted — no other
app he has tried does portions per child.

**The wall.** He tries to add his partner. There is no way to. He adds her
as a member without a sign-in, then realises that means she cannot see the
list on her own phone. **He is now the only person who can use the app,
which makes him the bottleneck for the household — the exact position he
downloaded it to get out of.**

**Week 2.** Scans the cupboard on a Sunday. Barcode scanning works well and
the claim step delights him once — *"it knew that was the chorizo I put in
the lasagne recipe"*. But loose veg, the bread from the bakery counter and
anything decanted into a jar have no barcode, so the pantry is accurate for
tins and wrong for everything else.

**Week 3.** Still open. Uses the shopping list every week and the meal plan
most weeks. Has stopped opening Pantry because it drifted. Has not used
chores, holidays, calendar, water or weight once.

> *"The shopping list is genuinely the best I've used. It just knows. But I
> can't get my wife on it, and half my cupboard isn't in there because it
> didn't come with a barcode. I'm using about a third of it."*

**Recommend?** Yes, with a caveat, to other ADHD parents.
**Still using at 3 weeks?** Yes — the list.
**Helped?** Yes, meaningfully: fewer shop trips, less 5pm panic.
**Worth paying?** *"For the list, yes. Not for the rest yet."*

---

## 2. Priya — busy mum, 38, not neurodivergent, Dev's partner

Project manager, highly organised, runs a colour-coded shared calendar
already. Sceptical of "another app".

**Week 1.** Cannot join. Dev shows her his phone. She likes the aisle
grouping and the portion scaling immediately — *"that's actually clever"* —
and asks how she gets it.

She cannot. She goes back to the shared note she and Dev already use.

**Week 3.** Never onboarded. Not a user.

> *"It looks good. I couldn't get in. So it's Dev's app, and that means the
> shopping is still Dev's job, which was rather the problem."*

**Recommend?** No — she cannot evaluate it.
**Worth paying?** *"I'd pay for something that replaced our shared note. This
didn't, because only one of us could hold it."*

**What this persona proves:** the household model is architecturally right
and commercially unusable. Revision 8 did the hard part. Phase 21 is the
part that makes it real.

---

## 3. Marcus — single parent, 34, ADHD + dyscalculia, two kids, tight budget

Works part-time. £60/week food budget. Numbers are genuinely hard; he has
been shamed by budgeting apps before.

**Week 1.** The single biggest thing for him: **nothing scores him.** No
streak, no "you missed a day", no red. He notices this explicitly and it is
why he keeps going.

The budget tier filter in the library matters. He filters to Budget and
finds four things he can afford.

**The friction.** Only ten recipes exist, and only about five are Budget.
He runs out on day four. *"Is that it?"*

Quantities are the other problem. The list says "800 g chopped tomatoes"
and he needs to know that is two tins. Phase 12 solves this — but only if
someone has set `item_label` and `grams_per_item` on the food, and nobody
has for most of his items. **The feature exists and is invisible without
setup he does not know to do.**

**Week 3.** Still using it. Uses Cook Mode heavily — one step at a time is
the first recipe format that has ever worked for him.

> *"It doesn't make me feel thick. That's the whole review really. But I ran
> out of recipes in four days and I keep having to work out how many tins
> 800 grams is."*

**Recommend?** Strongly, to other single parents.
**Still using at 3 weeks?** Yes.
**Helped?** Yes — his most-used feature is Cook Mode, which he did not
expect.
**Worth paying?** *"Not yet. Ten recipes isn't a product. Ask me at a
hundred."*

---

## 4. Sarah — stressed working parent, 44, no diagnosis, executive overload

Two teenagers, full-time job, caring for her mother. Not neurodivergent;
comprehensively overloaded. Represents the universal-design argument: built
for ND, works for everyone.

**Week 1.** Opens the app. Sees a dashboard with a primary action and then
tiles for exercises, weight, water, chores, calendar, meals, pantry,
shopping, holidays, work location.

**She bounces off the scope.** *"I wanted to sort out dinner. Why is it
asking about my weight?"*

Comes back three days later, does the first run, and it lands. But the
initial impression cost her three days and would have cost most people the
install.

**Week 2.** Uses meal plan and shopping. Tries chores, finds the recurrence
engine good but has to set up projects first, and abandons it.

**Week 3.** Uses two of nine domains. Would describe it as "a meal planner".

> *"It's a really good meal planner that opens like an operating system.
> I'd have got there faster if it had just asked me what I wanted to sort
> out."*

**Recommend?** Yes, described as a meal planner.
**Still using at 3 weeks?** Yes, narrowly.
**Helped?** *"Thursday nights, yes."*
**Worth paying?** *"About £3 a month. Not £10."*

**What this persona proves:** the breadth is a liability at first contact
and an asset later. Nothing in the product currently manages that
transition. The dashboard shows everything on day one.

---

## 5. Tom — lives alone, 29, autistic, routine-dependent

Software tester. Eats a rotation of six meals, deliberately. Strong texture
sensitivities. Hates surprises in interfaces.

**Week 1.** The best-served person in this document.

Cook Mode is *"the first recipe format that hasn't made me anxious"* — one
instruction, no "meanwhile", a clock time **and** a finish signal. He notes
the finish signal specifically: he cannot reliably judge "until golden"
without a time, and cannot judge a time without a signal.

Reduced motion is honoured. Dark mode and high contrast both work. The
compact density setting matters to him and the hint saying text size will
not change is *"the first time an app has answered the question I was
actually asking"*.

**The friction.** He wants his six meals and nothing else. The app keeps
offering him the library and "you could cook these right now". He wants a
setting that says *this is my rotation, stop suggesting*. There isn't one.

Second: no notifications. He wants a 5pm prompt. Settings has a
Notifications section, and **nothing behind it sends anything** — the
preferences exist, the delivery does not. He reads this as broken rather
than unbuilt.

**Week 3.** Daily user. Highest engagement of the eight.

> *"Whoever wrote the cooking steps understood something. It never tells me
> to hurry up or says 'simply'. But the notification settings don't do
> anything, and I'd like it to stop suggesting things."*

**Recommend?** Yes, emphatically, in autistic community spaces.
**Worth paying?** *"Yes. £5 a month. It's the only one that gets it."*

---

## 6. Eileen — lives alone, 67, not neurodivergent, post-surgery rehab

Retired teacher. Hip replacement, physio exercises daily, tracking weight
on doctor's advice. Modest phone confidence.

**Week 1.** Comes for Health, which is the least-developed area.

Exercises works: she adds her physio set and logs them. The no-shame framing
lands — a missed day is a fact, not a failure.

**The friction.** Weight and Water are plain compared with the kitchen. No
icons, no state colour, no trend beyond a basic line. Her Health hub reads
as a list of links rather than a place.

She never scans a barcode — she does not know what the scan button does and
does not try it.

**Week 3.** Uses Exercises daily, Weight weekly, nothing else.

> *"The exercises part is lovely and it doesn't nag. The rest looks like it
> was built for somebody younger and busier than me."*

**Recommend?** To her physio group, for exercises only.
**Worth paying?** *"For this bit? No. It's a small part of a big app."*

**What this persona proves:** Phase 28's visual pass reached the hubs and
not the health screens. She is the person that gap is made of.

---

## 7. Jodie — 24, ADHD, house share, very low income

Three housemates, separate food, one shared fridge shelf. £30/week.

**Week 1.** The household model does not fit her at all. It assumes one
household sharing a cupboard. She shares a *building* and no food.

She uses it single-user, which works, but the portion and member features
are noise.

**The friction that ends it.** Her pantry is a shelf. Keeping it accurate
means scanning every item, and half of what she buys is loose or
reduced-sticker. Within nine days the pantry is wrong, and once the pantry
is wrong the shopping list is wrong, **and the shopping list was the reason
she was there.**

**Week 3.** Uninstalled at day 12.

> *"When it was right it was brilliant. But keeping the cupboard right is a
> job, and if I could reliably do that job I wouldn't have needed the app."*

**Recommend?** *"To someone more organised than me."*
**Worth paying?** No.

**What this persona proves — and it is the most important line in this
document:** the competitive research found the whole category fails on
*"keeping quantities accurate takes discipline"*. **This app has not solved
that.** It has reduced the upkeep — barcode, claim step, bought-to-pantry,
depletion after cooking — but reduced is not eliminated, and for the person
with the least executive function the residue is still fatal.

---

## 8. Ren — 36, AuDHD, lives with partner, works from home

Freelance designer. Diagnosed late. Cares about how things look and is
unusually articulate about why.

**Week 1.** Notices the craft. Typography is consistent, spacing has a
rhythm, nothing shouts. *"It's the only ND app that isn't covered in
rounded rainbow gradients treating me like a toddler."*

The four freshness states as shape **and** colour **and** words is spotted
and appreciated without being explained.

**The friction.** The Meals screen. It holds the recipe list, ingredient
picker, macros, method steps, cook-from-pantry and the recipe library —
seven features on one screen — and it reads as dense compared with
everything else. *(This is `meals.js`, 2,081 lines, and the split is Phase
29's unfinished half.)*

Also: no way to see what they ate this week. They want planned macros, and
the app has per-recipe macros only.

**Week 3.** Regular user, four of nine domains.

> *"It's the most respectful app I've used. It doesn't gamify me and it
> doesn't shame me. The Meals page is a bit of a wall though."*

**Recommend?** Yes, widely.
**Worth paying?** *"£6. I'd pay for the design alone, and I know how that
sounds."*

---

## Summary

| Persona | Using at 3 weeks | Would recommend | Would pay |
|---|---|---|---|
| Dev — ADHD dad | Yes, partially | Yes, caveated | For the list only |
| Priya — organised mum | **No — locked out** | Cannot say | Would have |
| Marcus — single parent | Yes | Strongly | Not at 10 recipes |
| Sarah — overloaded parent | Narrowly | As a meal planner | ~£3 |
| Tom — autistic, alone | **Daily** | Emphatically | £5 |
| Eileen — 67, rehab | Partially | Exercises only | No |
| Jodie — ADHD, low income | **Churned day 12** | No | No |
| Ren — AuDHD designer | Yes | Yes | £6 |

**Six of eight still using. Two churned, for different and fixable reasons.**

### Strengths, confirmed by more than one persona
1. **Cook Mode.** Named by three as the best thing in the app, including two
   who came for something else.
2. **No-shame framing.** Noticed explicitly by four. Nobody had to be told.
3. **The automatic shopping list.** The single most-praised function.
4. **Portion scaling per member.** Nothing else does it.
5. **The design.** Read as respect, not decoration.

### The five frictions worth fixing, in order

**1. No invite flow.** Costs a whole persona and cripples two more. The
architecture is done; only the flow is missing. Phase 21.

**2. Ten recipes.** Blocks payment for Marcus and limits everyone. The
biggest visible gap against competitors.

**3. Pantry accuracy still takes discipline.** Killed Jodie. Needs an answer
that does not depend on scanning everything: receipt capture, or a "roughly
how much is left" quick pass, or accepting vagueness gracefully.

**4. First contact shows nine domains.** Cost Sarah three days and would
cost most people the install.

**5. Notification settings that do nothing.** Reads as broken, not unbuilt.

### The opportunities nobody has taken

- **A "this is my rotation" mode** (Tom). Stop suggesting. Trivial to build,
  and no competitor offers it.
- **Tins, not grams, on the shopping list** (Marcus). The machinery exists;
  the data is not filled in. A one-tap "how does this come?" prompt at scan
  time would close it.
- **Ask what they came for** (Sarah). One question at first run, and hide
  the rest until asked.
- **Health deserves the kitchen's care** (Eileen). It is a third of the app
  and had one visual pass in six weeks.

### On price

Five of eight would pay. The range is £3–£6/month and clusters at £5. The
two who would pay most are both neurodivergent and both cite *respect*
rather than features.

Nobody would pay at ten recipes except Tom, who does not use the library.
