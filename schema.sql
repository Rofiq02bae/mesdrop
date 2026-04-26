-- ============================================================
--  Mesdrop — Supabase SQL Schema (lengkap)
--  Paste ini ke Supabase → SQL Editor → Run
-- ============================================================

create extension if not exists "pgcrypto";


-- ── users ─────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists idx_users_username on public.users (username);

alter table public.users enable row level security;

create policy "Public can read usernames"
  on public.users for select using (true);

create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);


-- ── feedbacks ─────────────────────────────────────────────────────────────────
create table if not exists public.feedbacks (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  message     text not null check (char_length(message) >= 3 and char_length(message) <= 2000),
  sender_name text,                    -- ← nama pengirim anonim (nullable)
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_feedbacks_username on public.feedbacks (username, created_at desc);

alter table public.feedbacks enable row level security;

-- Public insert via service role key di backend — tidak butuh RLS insert policy
-- Tapi agar bisa dibaca publik (untuk /api/f/messages), tambahkan:
create policy "Public can read feedbacks"
  on public.feedbacks for select using (true);

create policy "Anyone can submit feedback"
  on public.feedbacks for insert with check (true);

-- Jika tabel lama masih memakai kolom user_id, jalankan migrasi berikut:
-- alter table public.feedbacks add column if not exists username text;
-- update public.feedbacks set username = coalesce(username, 'aas') where username is null;
-- alter table public.feedbacks alter column username set not null;


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

alter table public.bookmarks enable row level security;

create policy "Owner can manage bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── Auto-create user profile on signup ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
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


-- ============================================================
--  SETUP USER ADMIN (jalankan setelah schema di atas)
-- ============================================================
--
--  OPSI 1: Lewat Supabase Dashboard (DIREKOMENDASIKAN)
--  -------------------------------------------------------
--  1. Buka: Authentication → Users → Add user
--  2. Email    : aasadmin@mesdrop.local
--  3. Password : shiroko
--  4. Centang  : "Auto confirm email"
--  5. Klik Add User
--
--  Setelah itu, trigger di atas akan otomatis membuat row
--  di public.users dengan username = "aasadmin"
--
--  OPSI 2: Lewat SQL (butuh service_role, jalankan di SQL Editor)
--  ---------------------------------------------------------------
--  Supabase tidak mengizinkan INSERT langsung ke auth.users lewat SQL biasa.
--  Gunakan Supabase Admin API atau dashboard.
--
-- ============================================================


-- ============================================================
--  ENVIRONMENT VARIABLES yang dibutuhkan
-- ============================================================
--
--  Di .env (server-side):
--    SUPABASE_URL=https://xxxx.supabase.co
--    SUPABASE_ANON_KEY=eyJ...
--    SUPABASE_SERVICE_ROLE_KEY=eyJ...
--
--  Di .env.local (client-side / Next.js public):
--    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
--
-- ============================================================