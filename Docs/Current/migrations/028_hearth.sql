-- Docs/Current/migrations/028_hearth.sql
-- Home-OS schema revision 28 — 26 Nov 2026 (Phase 36a, Free and Hearth)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT.
--
-- One new table: which tier each household is on.
--
-- WHY A TABLE OF ITS OWN
-- Members may update their households row ("household access only ... for
-- all", migration 008). A plan column there could be set to 'hearth' by
-- anyone in the house. This table has a SELECT policy only: a household can
-- read its tier and nobody but the database owner (this SQL editor, later
-- the billing function) can change it.
--
-- EXISTING HOUSEHOLDS BECOME HEARTH
-- Everyone who has used the app so far keeps everything they have. New
-- households, made by the signup trigger, get no row, and no row is Free.

create table if not exists household_entitlements (
  household_id uuid primary key references households(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'hearth')),
  hearth_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table household_entitlements enable row level security;

drop policy if exists "members read their tier" on household_entitlements;
create policy "members read their tier"
on household_entitlements for select
using (household_id in (select my_household_ids()));

-- No insert, update or delete policy, deliberately.

insert into household_entitlements (household_id, plan)
select id, 'hearth' from households
on conflict (household_id) do nothing;
