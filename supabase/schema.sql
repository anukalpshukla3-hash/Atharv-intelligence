-- ============================================================
-- Atharv Intelligence — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- (Or: supabase db push with the Supabase CLI)
-- ============================================================

-- ------------------------------------------------------------
-- Conversations
-- One row per visitor (keyed by a browser-generated visitor id).
-- Visitors do NOT need accounts — they are tracked anonymously.
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  visitor_id      text not null unique,
  visitor_label   text not null default 'Visitor',
  status          text not null default 'open' check (status in ('open', 'closed')), -- 'closed' = archived (kept in admin history)
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists conversations_visitor_idx on public.conversations (visitor_id);
create index if not exists conversations_last_message_idx on public.conversations (last_message_at desc);

-- ------------------------------------------------------------
-- Messages
-- Text / image / voice notes flowing between a visitor and the
-- operator. The backend (service role) writes everything.
-- ------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender          text not null check (sender in ('visitor', 'admin')),
  kind            text not null check (kind in ('text', 'image', 'voice')),
  content         text,
  media_url       text,
  mime_type       text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_unread_idx on public.messages (conversation_id) where sender = 'visitor' and read_at is null;

-- ------------------------------------------------------------
-- Admin users
-- A row must exist here for an authenticated account to be
-- allowed into the Command Center.
-- ------------------------------------------------------------
create table if not exists public.admin_users (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- Visitors never touch the database directly (they go through
-- the backend, which uses the service role). Only authenticated
-- users listed in admin_users may read/update data.
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.admin_users enable row level security;

create policy "admins can select conversations" on public.conversations
  for select to authenticated
  using (exists (select 1 from public.admin_users au where au.id = auth.uid()));

create policy "admins can update conversations" on public.conversations
  for update to authenticated
  using (exists (select 1 from public.admin_users au where au.id = auth.uid()));

create policy "admins can select messages" on public.messages
  for select to authenticated
  using (exists (select 1 from public.admin_users au where au.id = auth.uid()));

create policy "admins can update messages" on public.messages
  for update to authenticated
  using (exists (select 1 from public.admin_users au where au.id = auth.uid()));

-- ------------------------------------------------------------
-- Storage bucket for attachments
-- Public read so image/audio <src> tags work without signed URLs.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true,
  26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'
  ]
)
on conflict (id) do nothing;

-- ============================================================
-- Creating your admin account
-- ============================================================
-- 1. Supabase Dashboard > Authentication > Users > Add user.
--    Create the account for atharv@atharvintelligence.com.
-- 2. Grab the new user's UUID and run:
--
--    insert into public.admin_users (id, display_name)
--    values ('<user-uuid>', 'Atharv');
--
-- Anyone not in admin_users will be rejected by the backend
-- even with a valid password.
-- ============================================================
