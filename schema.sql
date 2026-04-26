-- ============================================================
--  Personal Inbox API — Supabase SQL Schema
--  Paste this into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID generation (already on by default in Supabase)
create extension if not exists "pgcrypto";


-- ── users ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users but stores the public-facing username.
-- The id MUST match the auth.users UUID so RLS policies work cleanly.

create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now()
);

-- Index for fast username lookups (feedback submission)
create index if not exists idx_users_username on public.users (username);

-- RLS: public can read usernames (needed for feedback lookup)
alter table public.users enable row level security;

create policy "Public can read usernames"
  on public.users for select
  using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);


-- ── feedbacks ─────────────────────────────────────────────────────────────────

create table if not exists public.feedbacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  message     text not null check (char_length(message) >= 3 and char_length(message) <= 2000),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_feedbacks_user_id on public.feedbacks (user_id, created_at desc);

-- RLS: only the owner can read/update their own feedback
alter table public.feedbacks enable row level security;

create policy "Owner can view own feedback"
  on public.feedbacks for select
  using (auth.uid() = user_id);

create policy "Owner can update own feedback"
  on public.feedbacks for update
  using (auth.uid() = user_id);

-- Public (anonymous) insert is handled via service role key in the API — no RLS policy needed here.
-- Alternatively, you can allow anon inserts:
create policy "Anyone can submit feedback"
  on public.feedbacks for insert
  with check (true);


-- ── bookmarks ─────────────────────────────────────────────────────────────────

create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  url         text not null,
  title       text,
  description text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_bookmarks_user_id on public.bookmarks (user_id, created_at desc);

-- RLS: strict owner-only access
alter table public.bookmarks enable row level security;

create policy "Owner can manage bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── Helper: auto-create user profile on signup ────────────────────────────────
-- Supabase calls this trigger after a new auth.users row is created.
-- The username is taken from the email prefix as a default.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    -- Default username = email prefix before @; caller can update it later
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Admin user setup ──────────────────────────────────────────────────────────
-- Buat user admin lewat Supabase Dashboard atau CLI (JANGAN lewat SQL biasa,
-- karena auth.users dikelola oleh Supabase Auth, bukan plain SQL).
--
-- OPSI A — Via Supabase Dashboard:
--   1. Buka project → Authentication → Users → "Invite user" atau "Add user"
--   2. Email   : aasadmin@mesdrop.local
--   3. Password: shiroko
--
-- OPSI B — Via Supabase CLI (supabase users create):
--   supabase users create \
--     --email aasadmin@mesdrop.local \
--     --password shiroko \
--     --project-ref <YOUR_PROJECT_REF>
--
-- OPSI C — Via supabase-js (jalankan sekali di script bootstrap):
--   const { data, error } = await supabase.auth.admin.createUser({
--     email: 'aasadmin@mesdrop.local',
--     password: 'shiroko',
--     email_confirm: true,
--   });
--
-- Setelah user terbuat, trigger `on_auth_user_created` akan otomatis membuat
-- row di public.users dengan username = 'aasadmin' (prefix email sebelum @).
-- Jika ingin username berbeda, jalankan:
--
--   update public.users set username = 'aasadmin' where id = '<uuid-dari-auth>';

