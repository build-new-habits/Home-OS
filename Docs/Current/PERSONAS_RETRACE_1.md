# Home-OS: Persona Re-Trace, Round 1
01 Sep 2026 v1

Re-run against `76782b7`, after Phases 30, 31, 32 and the library growth.
First trace was `42aec3b`.

Rule from the schedule, honoured: **the personas do not get more forgiving
because the work was hard**, and **a fix that creates a friction is not a
fix** — so new problems are recorded, not just old ones ticked.

---

## What changed since the first trace

| Fix | Phase |
|---|---|
| 10 → **100 recipes**, 73 budget-tier | Library |
| **Household invite codes** | 30 |
| **Rough pantry levels** + two-minute sweep | 31 |
| **Notifications that actually send** | 32 |

---

## 1. Dev — busy dad, ADHD ✅ **SERVICEABLE**

Creates a code in Settings, reads it down the phone to Priya, and she is in
within a minute. *"That's it? That's all it needed?"* — said with some
feeling, because it was the thing that had made him the bottleneck.

The rough levels change his cupboard behaviour completely. He stops
scanning loose veg and taps three buttons instead. Recipe count means he
stops seeing the same six things.

**Remaining complaint:** *"I'd like the shopping list to say two tins, not
800 grams."* **A wish, not a blocker.**

**Would pay?** *"Yes. Now yes, for the whole thing."*

---

## 2. Priya — organised mum ✅ **SERVICEABLE (provisionally)**

Joins with the code. Everything Dev had, she now has.

She immediately does the thing organised people do: checks whether it is
actually shared. Adds a jar of pesto on her phone, watches it appear on
his. *"Right. It's real."*

**One new observation, and it is fair:** she went looking for the invite in
an obvious place and did not find it. It lives inside the Household
fieldset, inside Settings, which now has **nine sections**. She found it on
the second attempt.

**Would pay?** *"Between us, yes. It's replaced the shared note."*

**Provisional** because she has used it for a day, not three weeks. The next
re-trace tests that properly.

---

## 3. Marcus — single parent, ADHD ✅ **SERVICEABLE**

He said *"ask me at a hundred."* He is being asked.

**73 budget-tier recipes.** He filters to Budget and stops running out. Cook
Mode remains his most-used feature.

**Remaining complaint, unchanged and now his only one:** the list still says
800 g of chopped tomatoes and he still has to work out that it means two
tins. Phase 35.

**A wish, not a blocker** — but it is the wish that most affects him daily,
and it should not slip past Round 2.

**Would pay?** *"Yeah. A fiver."*

---

## 4. Tom — autistic, lives alone ❌ **NOT SERVICEABLE**

The hardest verdict in this re-trace, and it goes against us.

Notifications now exist and the settings no longer lie — which he notices
and appreciates. Permission is asked when he switches one on, and the denied
message tells him where to change it.

**But they only fire when the app is open.** He wanted a 5pm prompt. What he
has is a message that appears when he already looked, which is the moment he
needed it least.

> *"So it tells me things I'd have seen anyway. That's not a reminder,
> that's a label."*

He is right. Phase 32's handoff called this out honestly, but honest and
sufficient are different things.

**Still no rotation mode.** The app keeps suggesting.

**Still using?** Yes, daily. **Would pay?** Still £5. **But his biggest
complaint is a blocker**, and by the schedule's own rule that is not
serviceable.

---

## 5. Jodie — ADHD, low income ⚠️ **PARTIAL — the bet half-landed**

She is the reason Phase 31 exists. Re-running her is the point of this
document.

**Week 1–2: it works.** The quick stock check is the thing. Two minutes on a
Sunday, three taps a shelf, no scanning. Her shopping list is right for the
first time.

> *"I can do that. That's a thing I can actually do."*

**Week 3: the flaw shows.** Everything she marked "plenty" in week one still
says plenty. She has eaten most of it. The list starts under-buying, and
under-buying is worse than over-buying because you find out at the hob.

**`level_set_at` exists as a column and nothing writes it.** Nothing decays,
nothing prompts a re-sweep. Drift came back in a new form, exactly as the
Phase 31 handoff feared.

**Still using at 3 weeks?** Yes — she did not uninstall this time, which is
a real change from day 12.
**Would pay?** *"Not yet. Ask me when it stops going out of date."*

**Verdict: the idea is right and the implementation is half-finished.** The
sweep is genuinely the best thing in the app for her. Levels that never age
undo it.

---

## 6. Sarah — overloaded parent ⚠️ unchanged

Nothing in Round 1 was for her. Still a nine-domain dashboard on first open,
still describes it as "a meal planner". Round 2, Phase 33.

## 7. Eileen — 67, rehab ⚠️ unchanged

Nothing in Round 1 was for her. Round 3, Phase 36.

## 8. Ren — AuDHD designer ✅ **SERVICEABLE**

100 recipes gives them something to browse. Meals page is still dense.

**But:** 72 recipes are tagged vegetarian and **there is no dietary filter
control in the library UI.** `filterRecipes` supports it and it is tested;
the select was never built. Ren finds this quickly and is unimpressed —
*"the data's clearly there"*.

**A wish, not a blocker.** Still recommends, still £6.

---

## Scoreboard

| Persona | Using | Recommend | Pay | Helped | Wish not blocker | Serviceable |
|---|---|---|---|---|---|---|
| Dev | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Priya | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** prov. |
| Marcus | ✅ | ✅ | ✅ £5 | ✅ | ✅ | **✅** |
| Sarah | ⚠️ | ⚠️ | ✅ £3 | ✅ | ❌ scope | ❌ |
| Tom | ✅ | ✅ | ✅ £5 | ✅ | ❌ delivery | ❌ |
| Eileen | ⚠️ | ⚠️ | ❌ | ✅ | ❌ health | ❌ |
| Jodie | ✅ | ⚠️ | ❌ | ✅ | ❌ decay | ❌ |
| Ren | ✅ | ✅ | ✅ £6 | ✅ | ✅ | **✅** |

**4 of 8 serviceable, from 0.** Six now use it at three weeks, from six —
but Jodie replaced Priya as the marginal one, and Priya moved from absent to
active.

**Five would now pay**, and the two who would not both name a specific fix.

---

## New frictions found this round

A fix that creates a friction is not a fix. Four found:

**1. Levels never decay** *(Jodie — serious)*. The column exists, nothing
writes it. This turns Phase 31 from a solution into a slower version of the
same problem. **Highest priority in Round 2.**

**2. Notifications only fire when the app is open** *(Tom — serious)*. A
reminder you receive because you looked is not a reminder. Needs the service
worker, which the app already has.

**3. No dietary filter in the library** *(Ren, and anyone vegetarian)*. 72
tagged recipes and no way to ask for them. The function exists and is
tested. This is a select box.

**4. Settings has nine sections** *(Priya)*. The invite flow is buried two
levels down in a 966-line screen. Growth without grouping.

**And one gap the numbers found rather than a persona:** of 100 recipes,
**zero are `special` tier.** Everything is budget or everyday. Nobody has a
birthday, guests, or a Saturday they wanted to make an effort for.

---

## Revised Round 2

Reordered by what this re-trace found, not by the original plan:

| | Phase | For |
|---|---|---|
| 1 | **Level decay + re-sweep prompt** | Jodie — closes the Round 1 bet |
| 2 | **Service worker notifications** | Tom |
| 3 | **Dietary filter** (a select box) | Ren, vegetarians |
| 4 | **Phase 35 — tins not grams** | Marcus |
| 5 | **Phase 33 — ask what they came for** | Sarah |
| 6 | **Settings grouping** | Priya |
| 7 | **~20 `special` tier recipes** | everyone, occasionally |

Phase 34 (rotation mode) moves to Round 3: Tom's blocker is delivery, not
suggestions, and fixing the smaller of his two complaints first would be
optimising the wrong one.
