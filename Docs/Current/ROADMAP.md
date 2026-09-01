# Home-OS: Roadmap
01 Sep 2026 v2 (supersedes ROADMAP_11_17.md)

**Decision, 01 Sep 2026: Home-OS is being built as a product, not a
single-user app, and the recipe library will be published.** That is settled
and this roadmap is written on that basis. The consequences are structural
and they are cheapest now.

## Phase numbers are identifiers, not sequence

Precedent: Phase 8 shipped before Phase 7, deliberately, and it was recorded.
Renumbering seven existing briefs would churn every cross-reference for no
gain, so new work takes new numbers and **execution order is stated here**.

## Execution order

| Order | Phase | Name | Schema |
|---|---|---|---|
| 1 | **11** | Reconcile on scan | none |
| 2 | **18** | Household foundation | rev 8 — **large** |
| 3 | **12** | Pack sizes and household measures | rev 9 |
| 4 | **13** | Reference food data | rev 10 |
| 5 | **15** | Recipe method steps | rev 11 |
| 6 | **19** | Ingredient options and swaps | rev 12 |
| 7 | **20** | Per-member portions and targets | rev 13 |
| 8 | **14** | Cook from what you have | none |
| 9 | **16** | Recipe library, batches 1–8 | rev 14 |
| 10 | **10** | Notifications | none (unbriefed) |
| 11 | **21** | Productisation | rev 15 |
| — | **17** | Recipe photo import | **PARKED** — per-use API cost |

**21 phases total. 9 built. 12 remaining, one of them parked.**

### Why 18 comes second

Adding `household_id` to 18 tables and rewriting 18 RLS policies is a day's
careful work now. After Phase 16 it means migrating 300 seeded recipes and
per-member data as well, and after launch it means doing it to live user
data. The cost of this decision roughly triples at every step. It goes
early or it goes badly.

Phase 11 still runs first because it has no schema change, fixes an active
defect, and makes everything downstream testable.

### Why the library runs late

It seeds 300 recipes. Every structural decision should be settled before
they land, or they get migrated instead of written.

## Already done, no phase needed

**Snacks in the meal plan.** `weekly_meal_plan.slot` has had `'snack'` in
its CHECK since Phase 1, `SLOTS` in `js/data/mealPlan.js` includes it, and
`views/mealPlan.js` iterates `SLOTS` rather than a hardcoded three. The
slot works today. What is missing is snack *recipes*, which is Phase 16
batch 7.

## Schema revisions ahead

| Rev | Phase | Change |
|---|---|---|
| 8 | 18 | `household_id` on all 18 tables; `households`, `household_members`; all 18 RLS policies rewritten |
| 9 | 12 | `foods.item_label` |
| 10 | 13 | `foods.source` CHECK widened for `'reference'` |
| 11 | 15 | `meal_steps` table; `meals.method_note` |
| 12 | 19 | `meal_ingredients.option_group`, `.is_selected`, `.option_label` |
| 13 | 20 | `weekly_meal_plan.member_id`; `household_members` macro targets |
| 14 | 16 | `meals` metadata + `library_ref` |
| 15 | 21 | onboarding and account state |

## Library licensing — now load-bearing

`RECIPE_STEP_STYLE.md` already forces original writing rather than
transcription, because the eleven rules mean no cookbook sentence survives
rule 1 intact. That was written as a personal-use safeguard. **It is now the
publishing standard**, which is a materially higher bar:

- Every recipe written from generic formulations. No single-source
  derivation, ever, including from a photographed page.
- No recipe titles that are somebody's trademark or signature dish name.
- Each seed file carries an explicit licence declaration.
- The JSON validity gate (Phase 16) gains an originality checklist per
  recipe, recorded at batch review.

Holding this from batch one is free. Auditing 300 recipes afterwards is not.

## Cost discipline

The library stays **static JSON served from GitHub Pages**, not database
rows. It is free to serve at any user count, cacheable, works offline, and
needs no RLS reasoning. Move to tables only if user-contributed recipes
become real.

Phase 17 is parked for the same reason: per-use API cost becomes per-user
cost at scale. The chat-based import route costs nothing and is available
today. Revisit only with a pricing model that covers it.
