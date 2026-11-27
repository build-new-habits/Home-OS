-- Docs/Current/migrations/029_shop_favourites.sql
-- Home-OS schema revision 29 — 27 Nov 2026 (Phase 36b, the weekly shop)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT.
--
-- One new table: the things a household buys again and again.
--   every is null   → a favourite: one tap puts it on the list
--   every is set    → a regular too: it goes on the list by itself when the
--                     week's list is built, once per week, fortnight or month,
--                     unless the pantry already has enough
-- One row per food per household.

create table if not exists shop_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  household_id uuid not null default my_household_id() references households(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  food_id uuid not null references foods(id) on delete cascade,
  every text check (every is null or every in ('week', 'fortnight', 'month')),
  qty numeric check (qty is null or (qty > 0 and qty <= 9999)),
  unit text not null default 'item',
  last_added_on date,
  unique (household_id, food_id)
);

create index if not exists idx_shop_favourites_household on shop_favourites (household_id);

alter table shop_favourites enable row level security;

drop policy if exists "household access only" on shop_favourites;
create policy "household access only"
on shop_favourites for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));

drop trigger if exists trg_set_updated_at on shop_favourites;
create trigger trg_set_updated_at
  before update on shop_favourites
  for each row execute function set_updated_at();
