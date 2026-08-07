-- ================================================================
-- MedExplore — Complete Supabase Schema
-- Run this entire file in your Supabase SQL Editor (fresh setup)
-- For existing setups, see MIGRATION section at the bottom
-- ================================================================

-- ── 1. Colleges ──────────────────────────────────────────────────
create table if not exists colleges (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  city                text,
  state               text,
  year_established    int,
  type                text check (type in ('government','private','deemed')),
  govt_subcategory    text check (govt_subcategory in ('central','state')),
  -- govt_subcategory only applies when type = 'government'; admin-only field
  -- Central govt → AIQ only; State govt → AIQ + State Quota
  total_seats         int,
  annual_fees         numeric,
  image_url           text,
  about               text,      -- long-form college description (admin-written)
  worthness           text,      -- admin's honest "is it worth it" assessment
  -- Rating parameters (each 0–10, weighted average = final_rating)
  rating_location     numeric default 5,   -- weight 8%
  rating_roi          numeric default 5,   -- weight 15%
  rating_fees         numeric default 5,   -- weight 10%
  rating_facilities   numeric default 5,   -- weight 12%
  rating_faculty      numeric default 5,   -- weight 13%
  rating_campus       numeric default 5,   -- weight 6%
  rating_hostel       numeric default 5,   -- weight 5%
  rating_patient_load numeric default 5,   -- weight 13%
  rating_research     numeric default 5,   -- weight 9%
  rating_placement    numeric default 5,   -- weight 9%
  final_rating        numeric default 5,   -- auto-computed weighted average
  created_at          timestamptz default now()
);

-- ── 2. Quotas ─────────────────────────────────────────────────────
-- Each quota belongs to a college.
-- quota_type: 'all_india' (AIQ) or 'state'
-- Default quotas are auto-created when a college is saved:
--   Govt Central  → AIQ: UR, EWS, OBC, SC, ST
--   Govt State    → AIQ: UR, EWS, OBC, SC, ST  +  State: GEN, EWS, OBC, SC, ST
--   Private/Deemed→ AIQ: GEN, MGT, NRI          +  State: UR, EWS, OBC, SC, ST, MGT
create table if not exists quotas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  quota_type  text check (quota_type in ('all_india','state')),
  college_id  uuid references colleges(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ── 3. Cutoff Rounds ──────────────────────────────────────────────
-- One row per quota × year × round.
-- closing_rank is the key metric; opening_rank removed as unnecessary.
create table if not exists cutoff_rounds (
  id            uuid primary key default gen_random_uuid(),
  quota_id      uuid references quotas(id) on delete cascade,
  year          int not null,
  round_number  int not null,
  closing_rank  int,
  created_at    timestamptz default now()
);

-- ── 4. User Profiles ──────────────────────────────────────────────
-- Mirrors auth.users. Stores role and free-view quota.
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  role             text default 'user',   -- 'admin' | 'user'
  free_views_used  int default 0,
  created_at       timestamptz default now()
);

-- ── 5. Auto-create profile on signup ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, free_views_used)
  values (new.id, new.email, 'user', 0)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================================
-- Row Level Security (RLS)
-- ================================================================

alter table colleges      enable row level security;
alter table quotas        enable row level security;
alter table cutoff_rounds enable row level security;
alter table profiles      enable row level security;

-- Colleges: anyone can read, only admin can write
drop policy if exists "public_read_colleges"  on colleges;
drop policy if exists "admin_write_colleges"  on colleges;
create policy "public_read_colleges" on colleges for select using (true);
create policy "admin_write_colleges" on colleges for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Quotas: anyone can read, only admin can write
drop policy if exists "public_read_quotas"  on quotas;
drop policy if exists "admin_write_quotas"  on quotas;
create policy "public_read_quotas" on quotas for select using (true);
create policy "admin_write_quotas" on quotas for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Cutoff Rounds: anyone can read, only admin can write
drop policy if exists "public_read_cutoffs"  on cutoff_rounds;
drop policy if exists "admin_write_cutoffs"  on cutoff_rounds;
create policy "public_read_cutoffs" on cutoff_rounds for select using (true);
create policy "admin_write_cutoffs" on cutoff_rounds for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Profiles: each user can read/update only their own row
drop policy if exists "own_profile_read"    on profiles;
drop policy if exists "own_profile_update"  on profiles;
create policy "own_profile_read"   on profiles for select using (auth.uid() = id);
create policy "own_profile_update" on profiles for update using (auth.uid() = id);

-- ================================================================
-- Make yourself admin
-- After signing up through the app, run:
--
--   insert into profiles (id, email, role, free_views_used)
--   select id, email, 'admin', 0 from auth.users
--   where email = 'your@email.com'
--   on conflict (id) do update set role = 'admin';
--
-- ================================================================

-- ================================================================
-- MIGRATION — run these if your DB already has tables:
-- (safe to run repeatedly — uses IF EXISTS / IF NOT EXISTS)
--
--   alter table colleges add column if not exists govt_subcategory text
--     check (govt_subcategory in ('central','state'));
--
--   alter table colleges add column if not exists about text;
--
--   alter table cutoff_rounds drop column if exists opening_rank;
--
--   drop policy if exists "admin_read_all_profiles" on profiles;
--   -- (removes the old recursive policy that caused RLS infinite loop)
--
-- ================================================================
