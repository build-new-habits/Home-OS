-- Docs/Current/migrations/019_household_invites.sql
-- Home-OS schema revision 19 — Phase 30, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHY
-- ============================================================
-- The single largest gap between what the app claims and what it does.
-- js/data/household.js has said it in a comment since Phase 18:
-- "There is no invite flow yet."
--
-- From the persona trace, Priya (organised mum, partner of an ADHD dad):
--
--   "It looks good. I couldn't get in. So it's Dev's app, and that means
--    the shopping is still Dev's job, which was rather the problem."
--
-- Members without a sign-in have always worked, which is right for
-- children. A second ADULT with their own phone could not join without
-- somebody running SQL.
--
-- ============================================================
-- THE RLS PROBLEM, AND ITS ANSWER
-- ============================================================
-- To redeem a code you must read a row belonging to a household you are
-- NOT yet a member of. No household-scoped policy can allow that, and a
-- policy loose enough to allow it would let anyone enumerate invites.
--
-- So: the table is household-scoped for MANAGEMENT (an owner sees and
-- revokes their own codes) and redemption goes through a SECURITY DEFINER
-- function that takes a code and nothing else. It never returns invite
-- rows, only success or a reason. A caller learns nothing by guessing.

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  household_id uuid not null default my_household_id() references households(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),

  -- Short enough to read aloud down a phone, long enough not to be guessed.
  -- The alphabet excludes 0/O and 1/I/L on purpose: this gets read out,
  -- written on paper, and typed by someone in a hurry.
  code text not null unique check (length(code) between 6 and 12),

  expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id)
);

create index if not exists idx_household_invites_code on household_invites (code);
create index if not exists idx_household_invites_household on household_invites (household_id);

alter table household_invites enable row level security;

drop policy if exists "household access only" on household_invites;
create policy "household access only"
on household_invites for all
using (household_id in (select my_household_ids()))
with check (household_id in (select my_household_ids()));

drop trigger if exists trg_set_updated_at on household_invites;
create trigger trg_set_updated_at
  before update on household_invites
  for each row execute function set_updated_at();


-- ============================================================
-- Redemption
-- ============================================================
-- SECURITY DEFINER so it can read an invite for a household the caller is
-- not in. search_path pinned — a definer function with a mutable search
-- path is a privilege-escalation hole.
--
-- Returns a plain reason string, never the invite row. The reasons are
-- deliberately distinguishable ('expired' vs 'used') because a person
-- typing a code needs to know which, and neither leaks anything: you
-- already had to know the code.

create or replace function redeem_household_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv household_invites%rowtype;
  already uuid;
begin
  if auth.uid() is null then
    return 'not-signed-in';
  end if;

  select * into inv from household_invites
  where upper(code) = upper(trim(invite_code));

  if not found then return 'not-found'; end if;
  if inv.redeemed_at is not null then return 'used'; end if;
  if inv.expires_at < now() then return 'expired'; end if;

  select id into already from household_members
  where household_id = inv.household_id and user_id = auth.uid();
  if already is not null then return 'already-a-member'; end if;

  insert into household_members (household_id, user_id, display_name, role)
  values (
    inv.household_id,
    auth.uid(),
    coalesce(nullif(split_part((select email from auth.users where id = auth.uid()), '@', 1), ''), 'Me'),
    'adult'
  );

  -- Single use. Marked AFTER the membership lands, so a failed insert does
  -- not burn the code.
  update household_invites
  set redeemed_at = now(), redeemed_by = auth.uid()
  where id = inv.id;

  return 'ok';
end $$;

revoke all on function redeem_household_invite(text) from public;
grant execute on function redeem_household_invite(text) to authenticated;


-- ============================================================
-- Phase 31 rides along: when was a rough level last set?
-- ============================================================
-- updated_at cannot answer this. schema.md warns it moves on every change,
-- so editing an item's location would report its level as fresh. A level
-- that never goes stale is drift wearing a different hat.

alter table pantry_stock add column if not exists level_set_at timestamptz;

comment on column pantry_stock.level_set_at is
  'When level was last set. Separate from updated_at, which moves on any edit.';
