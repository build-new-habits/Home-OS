-- Docs/Current/migrations/026_kitchen_rebuild.sql
-- Home-OS schema revision 25 — 03 Oct 2026 (kitchen rebuild K1)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT: the Supabase SQL editor runs each execution in its
-- own transaction.
--
-- ============================================================
-- WHAT AND WHY — three additive changes, nothing renamed or dropped
-- ============================================================
-- 1. DRINKS become a meal slot. The plan board has five rows: breakfast,
--    lunch, dinner, snacks, drinks. weekly_meal_plan.slot and
--    meals.default_slot allowed four. meals.meal_type already allows
--    'drink' (revision 5) and is untouched.
-- 2. foods.fibre_g, per 100 g, nullable. Fibre is one of the five figures
--    the app shows. Null means not recorded, never zero.
-- 3. user_settings.show_nutrition (default true) and nutrition_targets
--    (jsonb, null means UK reference intakes). The hide switch, and
--    personal targets.
-- 4. weekly_meal_plan.is_leftover (default false). Leftovers planned for
--    another day must not put the recipe's ingredients on the shopping
--    list a second time. The shortfall skips these rows.
-- 5. meals.course (added 3 Oct 2026, before 026 was ever run): 'starter',
--    'main' or 'pudding', nullable (null reads as main). A course is not a
--    slot: a starter and a pudding sit in the dinner slot beside the main,
--    which the plan already allows (several entries per cell).
-- 6. foods.shelf (added 4 Oct 2026): the kind of thing a food is, as the
--    pantry and the shopping list group it. Null = worked out from the name.
-- 7. weekly_meal_plan.eaten_at (added 4 Oct 2026): the Eaten tick.
--
-- ============================================================
-- SAFE TO RUN AGAINST THE LIVE APP
-- ============================================================
-- Widening a CHECK accepts everything it accepted before. New columns are
-- nullable or defaulted, so the deployed code keeps working unchanged.
--
-- The slot constraints were created inline, so their names were chosen by
-- Postgres. They are found by what they check rather than guessed by name.

-- ---- 1. Drinks ------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'weekly_meal_plan'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%slot%'
  loop
    execute format('alter table weekly_meal_plan drop constraint %I', c.conname);
  end loop;
end $$;

alter table weekly_meal_plan
  add constraint weekly_meal_plan_slot_check
  check (slot in ('breakfast','lunch','dinner','snack','drink'));

do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'meals'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%default_slot%'
  loop
    execute format('alter table meals drop constraint %I', c.conname);
  end loop;
end $$;

alter table meals
  add constraint meals_default_slot_check
  check (default_slot is null or default_slot in ('breakfast','lunch','dinner','snack','drink'));

-- ---- 2. Fibre -------------------------------------------------------------
alter table foods add column if not exists fibre_g numeric;
alter table foods drop constraint if exists foods_fibre_g_check;
alter table foods add constraint foods_fibre_g_check check (fibre_g is null or fibre_g >= 0);

-- ---- 3. Nutrition settings ----------------------------------------------
alter table user_settings add column if not exists show_nutrition boolean not null default true;
alter table user_settings add column if not exists nutrition_targets jsonb;

-- ---- 4. Leftovers -------------------------------------------------------
alter table weekly_meal_plan add column if not exists is_leftover boolean not null default false;

-- ---- 5. Courses ---------------------------------------------------------
alter table meals add column if not exists course text;
alter table meals drop constraint if exists meals_course_check;
alter table meals add constraint meals_course_check
  check (course is null or course in ('starter','main','pudding'));

-- ---- 6. Shelves -----------------------------------------------------------
alter table foods add column if not exists shelf text;
alter table foods drop constraint if exists foods_shelf_check;
alter table foods add constraint foods_shelf_check check (shelf is null or shelf in (
  'fruit','veg','meat','fish','dairy','bread','frozen','tinned','dried','baking',
  'spices','sauces','snacks','drinks','household','personal','pet','other'));

-- ---- 7. Eaten -------------------------------------------------------------
alter table weekly_meal_plan add column if not exists eaten_at timestamptz;
