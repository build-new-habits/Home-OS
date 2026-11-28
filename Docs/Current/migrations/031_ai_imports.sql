-- Docs/Current/migrations/031_ai_imports.sql
-- Home-OS schema revision 31 — 28 Nov 2026 (Phase 45, AI recipe import)
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING. Not Alongside-Learn.
-- No outer BEGIN/COMMIT.
--
-- One new table: one row per AI import, so the ai-import-recipe function
-- can hold each Hearth household to its fair-use limit a month.
--
-- WHO WRITES IT
-- Only the function, with the service role key. Members can read their own
-- household's rows (to show "12 left this month" one day) and cannot add,
-- change or delete any. A household cannot reset its own count.
--
-- Until this runs, the function answers "unavailable" and makes no AI call.

create table if not exists ai_imports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('photo', 'text')),
  outcome text not null default 'read'
);

create index if not exists ai_imports_household_month on ai_imports (household_id, created_at);

alter table ai_imports enable row level security;

drop policy if exists "members read their imports" on ai_imports;
create policy "members read their imports"
on ai_imports for select
using (household_id in (select my_household_ids()));

-- No insert, update or delete policy, deliberately.
