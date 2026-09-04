# Home-OS: Persona Re-Trace, Round 2 (partial)
01 Sep 2026 v1

Run against `8cac3bd`. Previous: `76782b7` (re-trace 1), `42aec3b` (first).

**Round 2 is not finished.** Two of its seven items are done — level decay
and notification delivery. Five are not, and three personas were waiting on
those five. This re-trace is honest about that rather than reading as
progress across the board.

Scores are 1–10. **The personas do not get more generous because the work
was hard.**

---

## Changed since re-trace 1

| Fix | For |
|---|---|
| Levels go stale, degrading to unknown | Jodie |
| Service worker delivery — **Android got nothing before** | Tom, everyone on a phone |
| Delivery timing stated up front | Tom |
| Gate 9 + device smoke test | nobody directly |

**Not done, and still owed:** dietary filter, tins-not-grams, first-contact
scope, Settings grouping, `special` tier recipes.

---

## 1. Dev — busy dad, ADHD

**Quality 8 · Usability 8 · Recommend 9/10 · ✅ SERVICEABLE**

Notifications now actually arrive on his phone, which he did not know had
been broken. Everything else holds from re-trace 1.

> *"It does the two things I need without me thinking about either. I still
> want it to say tins."*

**Would pay:** £5/month. **Biggest complaint:** tins. A wish.

---

## 2. Priya — organised mum

**Quality 8 · Usability 7 · Recommend 8/10 · ✅ SERVICEABLE**

Three weeks in now rather than one day, so the provisional verdict from
re-trace 1 firms up.

The shared list holds. She checks it does, repeatedly, and it does.

**Usability marked down** for the same reason as last time: Settings is
**nine sections and 974 lines**, and the invite lives two levels inside it.
She has since needed it twice — for a sitter and for her mother — and hunted
both times.

> *"It works. Finding anything in Settings is a scavenger hunt."*

**Would pay:** £5 between them.

---

## 3. Marcus — single parent, ADHD

**Quality 8 · Usability 7 · Recommend 9/10 · ✅ SERVICEABLE**

Unchanged. 73 budget recipes, Cook Mode daily, and the same single
complaint for the third trace running.

> *"Eight hundred grams. I still don't know how many tins that is."*

**This is now the longest-standing unfixed friction in the document.** It is
a wish rather than a blocker, but it is the wish that costs him something
every single shop, and it has survived two re-traces.

**Would pay:** £5.

---

## 4. Sarah — overloaded parent

**Quality 7 · Usability 5 · Recommend 6/10 · ❌ NOT SERVICEABLE**

**Nothing has been built for her across three traces.**

Still a nine-domain dashboard on first open. Still describes it as "a meal
planner" and uses two of nine areas.

> *"I've got used to ignoring most of it. That's not the same as it being
> better."*

That line is the fair verdict on where she stands: she has adapted, and
adaptation has been counted as her staying. Phase 33 is owed.

**Would pay:** £3.

---

## 5. Tom — autistic, lives alone

**Quality 9 · Usability 8 · Recommend 9/10 · ✅ SERVICEABLE**

The verdict that moved.

Notifications now arrive — and he is the person for whom they were most
broken, since he is on a phone. More importantly, Settings **tells him when
they arrive and why** before he switches one on.

> *"It says it can't do a five o'clock reminder and tells me why. I'd rather
> that than an app pretending. I've stopped expecting it."*

His complaint has moved from *this is broken* to *this does less than I
hoped*, which by the schedule's own rule is a wish rather than a blocker.

**Still no rotation mode** — the app keeps suggesting. Minor annoyance,
named as such.

**Would pay:** £5, highest engagement of the eight, daily user.

---

## 6. Eileen — 67, rehab

**Quality 6 · Usability 5 · Recommend 5/10 · ❌ NOT SERVICEABLE**

**Nothing has been built for her across three traces either.**

Exercises still works and still does not nag. Weight and Water still have no
icons, no state colour and no trend worth looking at.

> *"The exercise part is lovely. The rest still isn't for me."*

**Would pay:** no.

**She is the persona the roadmap keeps deferring**, and this is the third
time that has been written down.

---

## 7. Jodie — ADHD, low income

**Quality 7 · Usability 8 · Recommend 7/10 · ⚠️ ALMOST**

The bet, re-tested.

Week three no longer under-buys. Stale levels drop out of the reckoning
instead of lying, and the sweep says *"You said plenty a while back. Still
right?"* — which she reads as a question rather than a telling-off.

> *"It asks me instead of getting it wrong. That's the difference."*

**Still using at 3 weeks: yes** — from uninstalled at day 12, through
still-using-but-wrong, to still-using-and-right.

**Why not serviceable yet.** She would not pay. Not because of a fault, but
because the app now does one thing well for her and she is on £30 a week.

> *"It's good. I've got £30 a week. Ask me if it saved me money, not if I
> liked it."*

**That is a fair challenge and the app cannot currently answer it.** There
is no view anywhere of what a week cost or whether the plan is cheaper than
last month.

---

## 8. Ren — AuDHD designer

**Quality 9 · Usability 7 · Recommend 9/10 · ✅ SERVICEABLE**

Unchanged. Still the most articulate advocate; still finds the Meals page a
wall at **2,081 lines and seven features**.

And still: **72 vegetarian recipes and no way to filter to them.** Flagged
in re-trace 1, `filterRecipes` supports it, it is tested, the select box was
never built.

> *"You've written the function and not the dropdown. I can tell, and that's
> a strange thing to be able to tell."*

**Would pay:** £6.

---

## Scores

| Persona | Quality | Usability | Recommend | Pay | Serviceable |
|---|---|---|---|---|---|
| Dev | 8 | 8 | 9 | £5 | ✅ |
| Priya | 8 | 7 | 8 | £5 | ✅ |
| Marcus | 8 | 7 | 9 | £5 | ✅ |
| Sarah | 7 | 5 | 6 | £3 | ❌ |
| Tom | 9 | 8 | 9 | £5 | ✅ |
| Eileen | 6 | 5 | 5 | — | ❌ |
| Jodie | 7 | 8 | 7 | — | ⚠️ |
| Ren | 9 | 7 | 9 | £6 | ✅ |
| **Mean** | **7.75** | **6.9** | **7.75** | | **5 of 8** |

Recommend scores as NPS: **four promoters (9), three passives, one detractor
(5)** = **+12**. Positive, not strong. The detractor and the passive at 6
are the two personas nothing has been built for.

**Usability is the weakest score at 6.9** and it is dragged down by exactly
two things: screens nobody has revisited, and Settings sprawl.

---

## Movement across three traces

| Persona | First | Re-trace 1 | Re-trace 2 |
|---|---|---|---|
| Dev | ⚠️ | ✅ | ✅ |
| Priya | ❌ locked out | ✅ prov. | ✅ |
| Marcus | ⚠️ | ✅ | ✅ |
| Sarah | ❌ | ❌ | ❌ **unmoved** |
| Tom | ❌ | ❌ | ✅ |
| Eileen | ❌ | ❌ | ❌ **unmoved** |
| Jodie | ❌ churned | ❌ | ⚠️ |
| Ren | ✅ | ✅ | ✅ |

**0 → 4 → 5 serviceable.** Nobody has gone backwards.

**Two personas have not moved in three traces.** That is not an accident of
sequencing any more; it is a pattern. Sarah and Eileen are both people for
whom the app's answer has been "later", twice.

---

## What is left to build

### Owed from Round 2, in order

1. **Tins not grams** *(Marcus)* — three traces, unfixed, daily cost.
2. **Ask what they came for** *(Sarah)* — unmoved twice.
3. **Health gets the kitchen's care** *(Eileen)* — unmoved twice; brought
   forward from Round 3 for that reason.
4. **Dietary filter** — a select box over a tested function.
5. **Settings grouping** *(Priya)* — nine sections, 974 lines.
6. **~20 `special` tier recipes** — zero of 100 today.

### Newly raised by this trace

7. **What did the week cost?** *(Jodie)* — she is right that "did you like
   it" is the wrong question at £30 a week. Every ingredient has a price of
   zero today; there is no cost anywhere in the schema. This is the first
   genuinely new feature request in three traces and it needs its own
   thinking, not a quick column.

### Known and not urgent

8. Rotation mode *(Tom)*, splitting `meals.js` *(Ren)*, planned macros, the
   85 small items logged across handoffs.

---

## The honest summary

**It is a good product for five of eight people and a partial one for a
sixth.** Mean quality 7.75, usability 6.9, NPS +12.

The five who are served are served *well* — three would recommend it at 9.

The pattern worth acting on is not any single feature. It is that **the same
two people keep being deferred**, and the roadmap has now said "later" to
them twice while shipping four things for people who were already reasonably
happy.
